---
name: websocket-sse
description: |
  当需要实现实时通信、消息推送、在线状态管理时自动使用此 Skill。

  触发场景：
  - 需要实现服务端向客户端推送消息
  - 需要实现双向实时通信（聊天、协作）
  - 需要管理用户在线状态
  - 需要实现系统通知、订单状态变更等实时推送
  - 需要在多实例部署环境下同步消息

  触发词：WebSocket、SSE、实时推送、消息通知、在线状态、双向通信、Server-Sent Events、实时通信、消息推送、SseEmitter、WebSocketUtils、SseMessageUtils
---

# 实时通信开发指南（WebSocket & SSE）

> **适用模块**：`ruoyi-common-websocket`、`ruoyi-common-sse`

## 方案选型

| 方案 | 模块 | 方向 | 场景 |
|------|------|------|------|
| **WebSocket** | `ruoyi-common-websocket` | 双向 | 聊天、协作、低延迟交互 |
| **SSE** | `ruoyi-common-sse` | 服务端→客户端 | 通知推送、状态更新、AI流式响应 |

**共同特性**：Sa-Token 认证集成、Redis 发布订阅（多实例消息同步）、配置启用即可。

---

## 一、WebSocket

### 1.1 配置

```yaml
websocket:
  enabled: true
  path: /resource/websocket
  allowedOrigins: "*"         # 生产环境应限制
```

### 1.2 WebSocketUtils API

**位置**：`org.dromara.common.websocket.utils.WebSocketUtils`

```java
import org.dromara.common.websocket.utils.WebSocketUtils;
import org.dromara.common.websocket.dto.WebSocketMessageDto;

// 单实例：向指定用户发送
WebSocketUtils.sendMessage(userId, "消息内容");

// 多实例：通过 Redis Pub/Sub 广播（推荐）
WebSocketMessageDto dto = new WebSocketMessageDto();
dto.setSessionKeys(List.of(userId1, userId2));
dto.setMessage("消息内容");
WebSocketUtils.publishMessage(dto);

// 群发所有在线用户
WebSocketUtils.publishAll("系统广播消息");
```

### 1.3 WebSocketMessageDto

```java
@Data
public class WebSocketMessageDto implements Serializable {
    private List<Long> sessionKeys;  // 目标用户ID（空则群发）
    private String message;
}
```

### 1.4 WebSocketSessionHolder（会话管理）

**位置**：`org.dromara.common.websocket.holder.WebSocketSessionHolder`

```java
boolean online = WebSocketSessionHolder.existSession(userId);
Set<Long> onlineUsers = WebSocketSessionHolder.getSessionsAll();
WebSocketSession session = WebSocketSessionHolder.getSessions(userId);
```

### 1.5 前端连接

```javascript
const ws = new WebSocket(
  `ws://localhost:8080/resource/websocket?clientid=${clientId}&Authorization=${token}`
);
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // 根据 data.type 路由处理
};
```

---

## 二、SSE

### 2.1 配置

```yaml
sse:
  enabled: true
  path: /resource/sse
```

### 2.2 SseMessageUtils API

**位置**：`org.dromara.common.sse.utils.SseMessageUtils`

```java
import org.dromara.common.sse.utils.SseMessageUtils;
import org.dromara.common.sse.dto.SseMessageDto;

// 单实例：向指定用户 / 所有用户
SseMessageUtils.sendMessage(userId, "消息");
SseMessageUtils.sendMessage("广播消息");

// 多实例：通过 Redis Pub/Sub
SseMessageDto dto = new SseMessageDto();
dto.setUserIds(List.of(userId1, userId2));
dto.setMessage("消息内容");
SseMessageUtils.publishMessage(dto);

// 群发（多实例）
SseMessageUtils.publishAll("系统通知");

// 检查是否启用
if (SseMessageUtils.isEnable()) { ... }
```

### 2.3 SseMessageDto

```java
@Data
public class SseMessageDto implements Serializable {
    private List<Long> userIds;  // 目标用户ID（空则群发）
    private String message;
}
```

### 2.4 前端连接

```javascript
const eventSource = new EventSource(`/resource/sse?Authorization=${token}`);
eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
});
// 页面关闭时主动关闭
window.onbeforeunload = () => {
    eventSource.close();
    navigator.sendBeacon('/resource/sse/close');
};
```

---

## 三、多实例消息同步

通过 Redis Pub/Sub 实现跨实例消息投递：

| 方案 | Redis Topic | 方法 |
|------|------------|------|
| WebSocket | `global:websocket` | `publishMessage()` / `publishAll()` |
| SSE | `global:sse` | `publishMessage()` / `publishAll()` |

**流程**：调用 publish 方法 -> 发布到 Redis Topic -> 所有实例的 Listener 接收 -> 匹配本地用户并投递。

---

## 四、业务集成示例

```java
@Service
@RequiredArgsConstructor
public class OrderNotifyService {

    public void notifyOrderStatusChange(Order order) {
        String message = JsonUtils.toJsonString(Map.of(
            "type", "ORDER_STATUS_CHANGE",
            "orderId", order.getId(),
            "status", order.getStatus(),
            "updateTime", DateUtils.getTime()
        ));

        // SSE 通知买家
        SseMessageDto buyerDto = new SseMessageDto();
        buyerDto.setUserIds(List.of(order.getBuyerId()));
        buyerDto.setMessage(message);
        SseMessageUtils.publishMessage(buyerDto);

        // WebSocket 通知卖家（需要双向通信时）
        WebSocketMessageDto sellerDto = new WebSocketMessageDto();
        sellerDto.setSessionKeys(List.of(order.getSellerId()));
        sellerDto.setMessage(message);
        WebSocketUtils.publishMessage(sellerDto);
    }
}
```

---

## 五、常见错误

```java
// ❌ 多实例环境使用 sendMessage（只能发给当前实例用户）
WebSocketUtils.sendMessage(userId, "消息");

// ✅ 使用 publishMessage 支持多实例
WebSocketMessageDto dto = new WebSocketMessageDto();
dto.setSessionKeys(List.of(userId));
dto.setMessage("消息");
WebSocketUtils.publishMessage(dto);

// ❌ 循环逐个发送
for (Long uid : userIds) {
    dto.setSessionKeys(List.of(uid));
    WebSocketUtils.publishMessage(dto);
}

// ✅ 批量发送
dto.setSessionKeys(userIds);
WebSocketUtils.publishMessage(dto);

// ❌ 发送纯字符串（前端难解析）
WebSocketUtils.publishAll("订单已更新");

// ✅ JSON 格式 + type 字段
WebSocketUtils.publishAll(JsonUtils.toJsonString(Map.of(
    "type", "ORDER_UPDATE", "data", orderData
)));
```

---

## 六、API 速查

### WebSocket

| 方法 | 说明 |
|------|------|
| `WebSocketUtils.sendMessage(userId, msg)` | 发给指定用户（当前实例） |
| `WebSocketUtils.publishMessage(dto)` | 发给指定用户（多实例） |
| `WebSocketUtils.publishAll(msg)` | 群发（多实例） |
| `WebSocketSessionHolder.existSession(userId)` | 检查在线 |
| `WebSocketSessionHolder.getSessionsAll()` | 所有在线用户 |

### SSE

| 方法 | 说明 |
|------|------|
| `SseMessageUtils.sendMessage(userId, msg)` | 发给指定用户（当前实例） |
| `SseMessageUtils.sendMessage(msg)` | 发给所有用户（当前实例） |
| `SseMessageUtils.publishMessage(dto)` | 发给指定用户（多实例） |
| `SseMessageUtils.publishAll(msg)` | 群发（多实例） |
| `SseMessageUtils.isEnable()` | 检查是否启用 |

---

## 七、参考代码位置

| 类型 | 位置 |
|------|------|
| WebSocket 工具类 | `ruoyi-common/ruoyi-common-websocket/.../utils/WebSocketUtils.java` |
| WebSocket 会话管理 | `ruoyi-common/ruoyi-common-websocket/.../holder/WebSocketSessionHolder.java` |
| WebSocket 消息DTO | `ruoyi-common/ruoyi-common-websocket/.../dto/WebSocketMessageDto.java` |
| WebSocket 配置 | `ruoyi-common/ruoyi-common-websocket/.../config/WebSocketConfig.java` |
| SSE 工具类 | `ruoyi-common/ruoyi-common-sse/.../utils/SseMessageUtils.java` |
| SSE 连接管理 | `ruoyi-common/ruoyi-common-sse/.../core/SseEmitterManager.java` |
| SSE 控制器 | `ruoyi-common/ruoyi-common-sse/.../controller/SseController.java` |
| SSE 消息DTO | `ruoyi-common/ruoyi-common-sse/.../dto/SseMessageDto.java` |
