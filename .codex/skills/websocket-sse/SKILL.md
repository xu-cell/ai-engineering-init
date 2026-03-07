---
name: websocket-sse
description: |
  通用实时通信开发指南。涵盖 WebSocket 双向通信和 SSE 服务端推送的原生 Spring 实现。
  触发场景：
  - 实现服务端向客户端推送消息
  - 实现双向实时通信（聊天、协作）
  - 管理用户在线状态
  - 实现系统通知、状态变更实时推送
  - 多实例部署环境下消息同步
  触发词：WebSocket、SSE、实时推送、消息通知、在线状态、双向通信、Server-Sent Events、SseEmitter、消息推送
  注意：如果项目有专属技能，优先使用专属版本。
---

# 实时通信开发指南（WebSocket & SSE）

> 通用模板。如果项目有专属技能，优先使用。

## 设计原则

1. **选择合适的协议**：单向推送用 SSE，双向通信用 WebSocket。
2. **认证不可少**：连接建立时必须验证身份（Token / Session）。
3. **多实例支持**：通过 Redis Pub/Sub 或消息队列同步跨实例消息。
4. **优雅降级**：客户端应处理断线重连、消息丢失等异常场景。

---

## 方案对比

| 维度 | WebSocket | SSE (Server-Sent Events) |
|------|-----------|--------------------------|
| 通信方向 | 双向（全双工） | 单向（服务端 -> 客户端） |
| 协议 | `ws://` / `wss://` | HTTP（长连接） |
| 浏览器支持 | 所有现代浏览器 | 所有现代浏览器（IE 除外） |
| 自动重连 | 需手动实现 | 浏览器原生支持 |
| 数据格式 | 二进制 / 文本 | 文本（通常 JSON） |
| 代理兼容 | 可能需特殊配置 | 天然 HTTP 兼容 |
| 适用场景 | 聊天、协作编辑、游戏 | 通知推送、状态更新、AI 流式响应 |

### 选型决策

```
需要客户端向服务端发送数据？
├── 是 → WebSocket
└── 否 → 需要二进制数据传输？
        ├── 是 → WebSocket
        └── 否 → SSE（更简单、更稳定）
```

---

## 实现模式

### 一、WebSocket（Spring 原生）

#### 1. 配置

```java
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private [你的WebSocket处理器] handler;

    @Autowired
    private [你的认证拦截器] authInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws")
            .addInterceptors(authInterceptor)
            .setAllowedOrigins("https://your-domain.com"); // 生产不用 *
    }
}
```

#### 2. 消息处理器

```java
@Component
public class AppWebSocketHandler extends TextWebSocketHandler {

    // 会话管理：userId -> Session
    private final ConcurrentHashMap<Long, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = getUserId(session);
        sessions.put(userId, session);
        log.info("WebSocket 连接建立, userId: {}", userId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // 处理客户端发来的消息
        String payload = message.getPayload();
        log.info("收到消息: {}", payload);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = getUserId(session);
        sessions.remove(userId);
        log.info("WebSocket 连接关闭, userId: {}", userId);
    }

    // 发送消息给指定用户
    public void sendMessage(Long userId, String message) {
        WebSocketSession session = sessions.get(userId);
        if (session != null && session.isOpen()) {
            try {
                session.sendMessage(new TextMessage(message));
            } catch (IOException e) {
                log.error("发送消息失败, userId: {}", userId, e);
            }
        }
    }

    // 广播给所有在线用户
    public void broadcast(String message) {
        sessions.values().forEach(session -> {
            try {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(message));
                }
            } catch (IOException e) {
                log.error("广播消息失败", e);
            }
        });
    }

    // 检查用户是否在线
    public boolean isOnline(Long userId) {
        WebSocketSession session = sessions.get(userId);
        return session != null && session.isOpen();
    }
}
```

#### 3. 前端连接

```javascript
const token = localStorage.getItem('token');
const ws = new WebSocket(`wss://your-domain.com/ws?token=${token}`);

ws.onopen = () => console.log('连接已建立');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // 根据 data.type 路由处理
};
ws.onclose = () => {
    // 断线重连
    setTimeout(() => reconnect(), 3000);
};
ws.onerror = (error) => console.error('WebSocket 错误', error);
```

---

### 二、SSE（Spring 原生）

#### 1. Controller

```java
@RestController
@RequestMapping("/sse")
public class SseController {

    private final ConcurrentHashMap<Long, SseEmitter> emitters = new ConcurrentHashMap<>();

    // 建立 SSE 连接
    @GetMapping("/connect")
    public SseEmitter connect(@RequestParam Long userId) {
        SseEmitter emitter = new SseEmitter(0L); // 0 = 不超时

        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        emitter.onError(e -> emitters.remove(userId));

        return emitter;
    }

    // 关闭连接
    @GetMapping("/close")
    public void close(@RequestParam Long userId) {
        SseEmitter emitter = emitters.remove(userId);
        if (emitter != null) {
            emitter.complete();
        }
    }
}
```

#### 2. 消息推送服务

```java
@Service
public class SseMessageService {

    @Autowired
    private SseController sseController;

    // 推送给指定用户
    public void sendMessage(Long userId, String message) {
        SseEmitter emitter = sseController.getEmitter(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("message")
                    .data(message));
            } catch (IOException e) {
                sseController.removeEmitter(userId);
                log.error("SSE 推送失败, userId: {}", userId, e);
            }
        }
    }

    // 推送给所有用户
    public void broadcast(String message) {
        sseController.getAllEmitters().forEach((userId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                    .name("message")
                    .data(message));
            } catch (IOException e) {
                sseController.removeEmitter(userId);
            }
        });
    }
}
```

#### 3. 前端连接

```javascript
const token = localStorage.getItem('token');
const eventSource = new EventSource(`/sse/connect?userId=${userId}&token=${token}`);

eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    // 处理消息
});

eventSource.onerror = () => {
    // SSE 原生支持自动重连，通常无需手动处理
    console.warn('SSE 连接异常');
};

// 页面卸载时关闭
window.addEventListener('beforeunload', () => {
    eventSource.close();
    navigator.sendBeacon('/sse/close?userId=' + userId);
});
```

---

### 三、多实例消息同步

单实例时直接操作内存中的 Session/Emitter 即可。多实例部署时需通过 Redis Pub/Sub 同步：

```java
@Service
public class MessageBroadcaster {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String CHANNEL = "realtime:messages";

    // 发布消息到 Redis
    public void publish(MessageDTO dto) {
        redisTemplate.convertAndSend(CHANNEL, JsonUtils.toJson(dto));
    }

    // 订阅 Redis 消息，投递到本地连接
    @Bean
    public RedisMessageListenerContainer listenerContainer(RedisConnectionFactory factory) {
        var container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        container.addMessageListener((message, pattern) -> {
            MessageDTO dto = JsonUtils.parse(message.toString(), MessageDTO.class);
            // 匹配本地在线用户并投递
            localDelivery(dto);
        }, new ChannelTopic(CHANNEL));
        return container;
    }
}
```

**流程**：业务代码调用 publish -> 发布到 Redis Channel -> 所有实例的 Listener 接收 -> 匹配本地在线用户并投递。

---

## 业务集成示例

```java
@Service
public class OrderNotifyService {

    @Autowired
    private SseMessageService sseService;

    public void notifyOrderStatusChange(Order order) {
        String message = JsonUtils.toJson(Map.of(
            "type", "ORDER_STATUS_CHANGE",
            "orderId", order.getId(),
            "status", order.getStatus(),
            "updateTime", LocalDateTime.now()
        ));
        sseService.sendMessage(order.getBuyerId(), message);
    }
}
```

---

## 常见错误

```java
// 1. 多实例环境只发本地（消息丢失）
handler.sendMessage(userId, message);  // 用户可能在其他实例
// 应使用 Redis Pub/Sub 广播

// 2. 发送纯字符串（前端难解析、不可扩展）
handler.broadcast("订单已更新");
// 应使用 JSON + type 字段
handler.broadcast(JsonUtils.toJson(Map.of("type", "ORDER_UPDATE", "data", orderData)));

// 3. 循环逐个发送（性能差）
for (Long uid : userIds) {
    sendMessage(uid, message);
}
// 应批量发送或使用广播

// 4. SSE 超时设置不当
new SseEmitter(30000L);  // 30秒后断开
// 长连接应设置 0L（不超时）或较大值

// 5. 忘记清理已断开的连接
// Session/Emitter 断开后仍在 Map 中 -> 内存泄漏
// 应在 onCompletion/onClose/onError 回调中移除

// 6. WebSocket 未配置认证
// 连接建立时不校验 Token -> 任何人可连接
// 应在 HandshakeInterceptor 中校验身份
```
