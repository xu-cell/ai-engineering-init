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

## 概述

本框架提供两种实时通信方案：

| 方案 | 模块 | 通信方向 | 适用场景 |
|------|------|---------|---------|
| **WebSocket** | `ruoyi-common-websocket` | 双向通信 | 聊天、协作编辑、游戏 |
| **SSE** | `ruoyi-common-sse` | 服务端→客户端 | 通知推送、状态更新、数据流 |

**共同特性**：
- ✅ Sa-Token 认证集成
- ✅ Redis 发布订阅（多实例消息同步）
- ✅ 开箱即用，配置启用即可

---

## 技术选型指南

### 何时使用 WebSocket

```
✅ 需要双向通信（客户端也要发送消息）
✅ 即时聊天、协作编辑
✅ 游戏、实时交互应用
✅ 需要低延迟的场景
```

### 何时使用 SSE

```
✅ 只需服务端向客户端推送
✅ 系统通知、订单状态变更
✅ 数据仪表盘实时更新
✅ AI 流式响应（类似 ChatGPT）
✅ 需要简单实现、不需要双向通信
```

### 对比表

| 特性 | WebSocket | SSE |
|------|-----------|-----|
| 通信方向 | 双向 | 单向（服务端→客户端） |
| 协议 | ws:// / wss:// | HTTP |
| 浏览器支持 | 全部现代浏览器 | 全部现代浏览器 |
| 自动重连 | 需自行实现 | 浏览器原生支持 |
| 连接数限制 | 无 | 浏览器限制（6个/域名） |
| 防火墙穿透 | 可能被阻止 | 走 HTTP，穿透性好 |
| 实现复杂度 | 中等 | 简单 |

---

## 一、WebSocket 开发指南

### 1.1 启用配置

```yaml
# application.yml
websocket:
  enabled: true
  path: /resource/websocket   # 连接路径（默认）
  allowedOrigins: "*"         # 允许跨域（生产环境应限制）
```

### 1.2 核心工具类：WebSocketUtils

**位置**：`org.dromara.common.websocket.utils.WebSocketUtils`

```java
import org.dromara.common.websocket.utils.WebSocketUtils;
import org.dromara.common.websocket.dto.WebSocketMessageDto;

// ========== 发送消息 ==========

// 1. 向指定用户发送消息（当前服务实例）
WebSocketUtils.sendMessage(userId, "您有新的订单");

// 2. 向指定用户发送消息（支持多实例，通过 Redis 发布订阅）
WebSocketMessageDto dto = new WebSocketMessageDto();
dto.setSessionKeys(List.of(userId1, userId2));  // 目标用户ID列表
dto.setMessage("订单状态已更新");
WebSocketUtils.publishMessage(dto);

// 3. 向所有在线用户发送消息（群发）
WebSocketUtils.publishAll("系统将于10分钟后维护");
```

### 1.3 WebSocketMessageDto

```java
@Data
public class WebSocketMessageDto implements Serializable {
    /**
     * 需要推送到的用户ID列表（为空则群发）
     */
    private List<Long> sessionKeys;

    /**
     * 需要发送的消息内容
     */
    private String message;
}
```

### 1.4 会话管理：WebSocketSessionHolder

**位置**：`org.dromara.common.websocket.holder.WebSocketSessionHolder`

```java
import org.dromara.common.websocket.holder.WebSocketSessionHolder;

// 检查用户是否在线（当前实例）
boolean online = WebSocketSessionHolder.existSession(userId);

// 获取所有在线用户ID（当前实例）
Set<Long> onlineUsers = WebSocketSessionHolder.getSessionsAll();

// 获取用户的 WebSocket 会话
WebSocketSession session = WebSocketSessionHolder.getSessions(userId);
```

### 1.5 业务集成示例

#### 示例1：订单状态变更通知

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    @Override
    @Transactional
    public void updateOrderStatus(Long orderId, String status) {
        // 1. 更新订单状态
        Order order = orderMapper.selectById(orderId);
        order.setStatus(status);
        orderMapper.updateById(order);

        // 2. 推送消息给用户
        WebSocketMessageDto dto = new WebSocketMessageDto();
        dto.setSessionKeys(List.of(order.getUserId()));
        dto.setMessage(JsonUtils.toJsonString(Map.of(
            "type", "ORDER_STATUS",
            "orderId", orderId,
            "status", status,
            "message", "您的订单状态已更新为：" + status
        )));
        WebSocketUtils.publishMessage(dto);
    }
}
```

#### 示例2：系统广播通知

```java
@Service
public class NoticeServiceImpl implements INoticeService {

    @Override
    public void broadcastNotice(String title, String content) {
        // 群发给所有在线用户
        String message = JsonUtils.toJsonString(Map.of(
            "type", "SYSTEM_NOTICE",
            "title", title,
            "content", content,
            "time", DateUtils.getTime()
        ));
        WebSocketUtils.publishAll(message);
    }
}
```

### 1.6 前端连接示例

```javascript
// 建立 WebSocket 连接
const token = getToken();  // 获取登录 token
const clientId = getClientId();  // 获取客户端ID

const ws = new WebSocket(`ws://localhost:8080/resource/websocket?clientid=${clientId}&Authorization=${token}`);

ws.onopen = () => {
    console.log('WebSocket 连接成功');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('收到消息:', data);

    // 根据消息类型处理
    switch (data.type) {
        case 'ORDER_STATUS':
            handleOrderStatus(data);
            break;
        case 'SYSTEM_NOTICE':
            showNotification(data.title, data.content);
            break;
    }
};

ws.onclose = () => {
    console.log('WebSocket 连接关闭');
    // 可实现自动重连
};

ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
};
```

---

## 二、SSE 开发指南

### 2.1 启用配置

```yaml
# application.yml
sse:
  enabled: true
  path: /resource/sse    # 连接路径
```

### 2.2 核心工具类：SseMessageUtils

**位置**：`org.dromara.common.sse.utils.SseMessageUtils`

```java
import org.dromara.common.sse.utils.SseMessageUtils;
import org.dromara.common.sse.dto.SseMessageDto;

// ========== 发送消息 ==========

// 1. 向指定用户发送消息（当前服务实例）
SseMessageUtils.sendMessage(userId, "您有新的消息");

// 2. 向当前实例所有用户发送消息
SseMessageUtils.sendMessage("系统通知内容");

// 3. 向指定用户发送消息（支持多实例，通过 Redis 发布订阅）
SseMessageDto dto = new SseMessageDto();
dto.setUserIds(List.of(userId1, userId2));  // 目标用户ID列表
dto.setMessage("您的审批已通过");
SseMessageUtils.publishMessage(dto);

// 4. 向所有用户发送消息（群发，多实例）
SseMessageUtils.publishAll("系统维护通知");

// 5. 检查 SSE 是否启用
if (SseMessageUtils.isEnable()) {
    // SSE 已启用
}
```

### 2.3 SseMessageDto

```java
@Data
public class SseMessageDto implements Serializable {
    /**
     * 需要推送到的用户ID列表（为空则群发）
     */
    private List<Long> userIds;

    /**
     * 需要发送的消息内容
     */
    private String message;
}
```

### 2.4 SseEmitterManager 高级用法

**位置**：`org.dromara.common.sse.core.SseEmitterManager`

```java
import org.dromara.common.sse.core.SseEmitterManager;

@Service
@RequiredArgsConstructor
public class CustomSseService {

    private final SseEmitterManager sseEmitterManager;

    /**
     * 建立 SSE 连接（通常由 SseController 处理，业务代码无需调用）
     */
    public SseEmitter connect(Long userId, String token) {
        return sseEmitterManager.connect(userId, token);
    }

    /**
     * 断开 SSE 连接
     */
    public void disconnect(Long userId, String token) {
        sseEmitterManager.disconnect(userId, token);
    }
}
```

### 2.5 业务集成示例

#### 示例1：审批流程通知

```java
@Service
@RequiredArgsConstructor
public class ApprovalServiceImpl implements IApprovalService {

    @Override
    @Transactional
    public void approve(Long taskId, Boolean approved, String comment) {
        // 1. 处理审批逻辑
        ApprovalTask task = taskMapper.selectById(taskId);
        task.setStatus(approved ? "APPROVED" : "REJECTED");
        task.setComment(comment);
        taskMapper.updateById(task);

        // 2. 通知申请人
        SseMessageDto dto = new SseMessageDto();
        dto.setUserIds(List.of(task.getApplicantId()));
        dto.setMessage(JsonUtils.toJsonString(Map.of(
            "type", "APPROVAL_RESULT",
            "taskId", taskId,
            "approved", approved,
            "comment", comment,
            "time", DateUtils.getTime()
        )));
        SseMessageUtils.publishMessage(dto);
    }
}
```

#### 示例2：数据变更实时推送

```java
@Service
public class DashboardServiceImpl implements IDashboardService {

    /**
     * 推送仪表盘数据更新
     */
    public void pushDashboardUpdate(Long userId, DashboardData data) {
        String message = JsonUtils.toJsonString(Map.of(
            "type", "DASHBOARD_UPDATE",
            "data", data,
            "updateTime", DateUtils.getTime()
        ));
        SseMessageUtils.sendMessage(userId, message);
    }

    /**
     * 广播给所有管理员
     */
    public void broadcastToAdmins(List<Long> adminIds, String content) {
        SseMessageDto dto = new SseMessageDto();
        dto.setUserIds(adminIds);
        dto.setMessage(content);
        SseMessageUtils.publishMessage(dto);
    }
}
```

### 2.6 前端连接示例

```javascript
// 建立 SSE 连接
const token = getToken();
const eventSource = new EventSource(`/resource/sse?Authorization=${token}`);

eventSource.onopen = () => {
    console.log('SSE 连接成功');
};

// 监听 message 事件
eventSource.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('收到消息:', data);

    switch (data.type) {
        case 'APPROVAL_RESULT':
            showApprovalResult(data);
            break;
        case 'DASHBOARD_UPDATE':
            updateDashboard(data.data);
            break;
    }
});

eventSource.onerror = (error) => {
    console.error('SSE 错误:', error);
    // 浏览器会自动尝试重连
};

// 主动关闭连接
function closeConnection() {
    eventSource.close();
    // 调用后端关闭接口
    fetch('/resource/sse/close').then(() => {
        console.log('SSE 连接已关闭');
    });
}
```

---

## 三、多实例部署与消息同步

### 3.1 架构原理

```
┌─────────────────────────────────────────────────────────────┐
│                        Redis Pub/Sub                        │
│                                                             │
│   Topic: global:websocket    Topic: global:sse             │
└─────────────────────────────────────────────────────────────┘
         ▲         │                  ▲         │
         │         ▼                  │         ▼
    ┌────┴────┐  ┌────┴────┐    ┌────┴────┐  ┌────┴────┐
    │ 实例 1  │  │ 实例 2  │    │ 实例 1  │  │ 实例 2  │
    │ WS连接  │  │ WS连接  │    │ SSE连接 │  │ SSE连接 │
    └─────────┘  └─────────┘    └─────────┘  └─────────┘
         │              │              │              │
    ┌────┴────┐    ┌────┴────┐  ┌────┴────┐    ┌────┴────┐
    │ 用户 A  │    │ 用户 B  │  │ 用户 C  │    │ 用户 D  │
    └─────────┘    └─────────┘  └─────────┘    └─────────┘
```

### 3.2 消息同步机制

**WebSocket 消息发送流程**：
1. 调用 `WebSocketUtils.publishMessage(dto)`
2. 先检查目标用户是否在当前实例，在则直接发送
3. 不在当前实例的用户，通过 Redis 发布到 `global:websocket` 主题
4. 其他实例的 `WebSocketTopicListener` 接收并转发给本地用户

**SSE 消息发送流程**：
1. 调用 `SseMessageUtils.publishMessage(dto)`
2. 通过 Redis 发布到 `global:sse` 主题
3. 所有实例的 `SseTopicListener` 接收并检查本地用户
4. 匹配到的用户通过 `SseEmitter` 推送消息

### 3.3 Redis 主题常量

```java
// WebSocket 主题
public static final String WEB_SOCKET_TOPIC = "global:websocket";

// SSE 主题
private final static String SSE_TOPIC = "global:sse";
```

---

## 四、常见场景实战

### 4.1 场景：系统通知推送

```java
@Service
@RequiredArgsConstructor
public class SystemNoticeService {

    /**
     * 发送系统通知（SSE 方式）
     */
    public void sendNotice(Long userId, String title, String content) {
        String message = JsonUtils.toJsonString(Map.of(
            "type", "SYSTEM_NOTICE",
            "title", title,
            "content", content,
            "time", DateUtils.getTime()
        ));

        SseMessageDto dto = new SseMessageDto();
        dto.setUserIds(List.of(userId));
        dto.setMessage(message);
        SseMessageUtils.publishMessage(dto);
    }

    /**
     * 广播系统公告
     */
    public void broadcastAnnouncement(String title, String content) {
        String message = JsonUtils.toJsonString(Map.of(
            "type", "ANNOUNCEMENT",
            "title", title,
            "content", content,
            "time", DateUtils.getTime()
        ));
        SseMessageUtils.publishAll(message);
    }
}
```

### 4.2 场景：在线用户统计

```java
@Service
public class OnlineUserService {

    /**
     * 获取当前实例在线用户数（WebSocket）
     */
    public int getOnlineCount() {
        return WebSocketSessionHolder.getSessionsAll().size();
    }

    /**
     * 检查用户是否在线（当前实例）
     */
    public boolean isOnline(Long userId) {
        return WebSocketSessionHolder.existSession(userId);
    }

    /**
     * 获取在线用户列表（当前实例）
     */
    public Set<Long> getOnlineUsers() {
        return WebSocketSessionHolder.getSessionsAll();
    }
}
```

### 4.3 场景：订单状态实时更新

```java
@Service
@RequiredArgsConstructor
public class OrderNotifyService {

    /**
     * 订单状态变更通知
     */
    public void notifyOrderStatusChange(Order order) {
        // 1. 构建消息
        Map<String, Object> data = new HashMap<>();
        data.put("type", "ORDER_STATUS_CHANGE");
        data.put("orderId", order.getId());
        data.put("orderNo", order.getOrderNo());
        data.put("oldStatus", order.getOldStatus());
        data.put("newStatus", order.getStatus());
        data.put("updateTime", DateUtils.getTime());

        String message = JsonUtils.toJsonString(data);

        // 2. 通知买家（SSE）
        SseMessageDto buyerDto = new SseMessageDto();
        buyerDto.setUserIds(List.of(order.getBuyerId()));
        buyerDto.setMessage(message);
        SseMessageUtils.publishMessage(buyerDto);

        // 3. 通知卖家（WebSocket，如果需要双向通信）
        WebSocketMessageDto sellerDto = new WebSocketMessageDto();
        sellerDto.setSessionKeys(List.of(order.getSellerId()));
        sellerDto.setMessage(message);
        WebSocketUtils.publishMessage(sellerDto);
    }
}
```

---

## 五、常见错误与最佳实践

### ❌ 错误1：未启用模块就使用

```java
// ❌ 错误：未配置 websocket.enabled=true
WebSocketUtils.sendMessage(userId, "消息");  // 用户收不到
```

```yaml
# ✅ 正确：先启用
websocket:
  enabled: true
```

### ❌ 错误2：混淆单实例和多实例方法

```java
// ❌ 错误：使用 sendMessage 在多实例环境
WebSocketUtils.sendMessage(userId, "消息");  // 只能发给当前实例的用户

// ✅ 正确：使用 publishMessage 支持多实例
WebSocketMessageDto dto = new WebSocketMessageDto();
dto.setSessionKeys(List.of(userId));
dto.setMessage("消息");
WebSocketUtils.publishMessage(dto);  // 通过 Redis 广播到所有实例
```

### ❌ 错误3：SSE 连接未关闭导致资源泄漏

```javascript
// ❌ 错误：页面关闭时未主动关闭 SSE
window.onbeforeunload = () => {
    // 没有关闭 eventSource
};

// ✅ 正确：主动关闭连接
window.onbeforeunload = () => {
    eventSource.close();
    navigator.sendBeacon('/resource/sse/close');  // 使用 sendBeacon 确保请求发出
};
```

### ❌ 错误4：消息格式不统一

```java
// ❌ 错误：直接发送字符串，前端难以解析
WebSocketUtils.publishAll("订单已更新");

// ✅ 正确：使用 JSON 格式，包含类型字段
String message = JsonUtils.toJsonString(Map.of(
    "type", "ORDER_UPDATE",  // 消息类型，便于前端路由处理
    "data", orderData,
    "time", DateUtils.getTime()
));
WebSocketUtils.publishAll(message);
```

### ❌ 错误5：在循环中逐个发送消息

```java
// ❌ 错误：效率低
for (Long userId : userIds) {
    WebSocketMessageDto dto = new WebSocketMessageDto();
    dto.setSessionKeys(List.of(userId));
    dto.setMessage(message);
    WebSocketUtils.publishMessage(dto);  // 每次都发布到 Redis
}

// ✅ 正确：批量发送
WebSocketMessageDto dto = new WebSocketMessageDto();
dto.setSessionKeys(userIds);  // 一次性设置所有目标用户
dto.setMessage(message);
WebSocketUtils.publishMessage(dto);  // 只发布一次
```

---

## 六、API 速查表

### WebSocket API

| 方法 | 说明 | 适用场景 |
|------|------|---------|
| `WebSocketUtils.sendMessage(userId, message)` | 发送给指定用户（当前实例） | 单实例部署 |
| `WebSocketUtils.publishMessage(dto)` | 发送给指定用户（多实例） | 多实例部署 |
| `WebSocketUtils.publishAll(message)` | 群发所有用户 | 系统广播 |
| `WebSocketSessionHolder.existSession(userId)` | 检查用户是否在线 | 在线状态 |
| `WebSocketSessionHolder.getSessionsAll()` | 获取所有在线用户 | 统计 |

### SSE API

| 方法 | 说明 | 适用场景 |
|------|------|---------|
| `SseMessageUtils.sendMessage(userId, message)` | 发送给指定用户（当前实例） | 单实例部署 |
| `SseMessageUtils.sendMessage(message)` | 发送给所有用户（当前实例） | 单实例广播 |
| `SseMessageUtils.publishMessage(dto)` | 发送给指定用户（多实例） | 多实例部署 |
| `SseMessageUtils.publishAll(message)` | 群发所有用户（多实例） | 系统广播 |
| `SseMessageUtils.isEnable()` | 检查 SSE 是否启用 | 条件判断 |

---

## 七、配置参考

### WebSocket 完整配置

```yaml
websocket:
  enabled: true                    # 是否启用（必填）
  path: /resource/websocket        # 连接路径（默认 /resource/websocket）
  allowedOrigins: "*"              # 允许跨域来源（生产环境应限制）
```

### SSE 完整配置

```yaml
sse:
  enabled: true                    # 是否启用（必填）
  path: /resource/sse              # 连接路径（必填）
```

---

## 八、参考代码位置

| 类型 | 位置 |
|------|------|
| WebSocket 工具类 | `ruoyi-common/ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/utils/WebSocketUtils.java` |
| WebSocket 会话管理 | `ruoyi-common/ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/holder/WebSocketSessionHolder.java` |
| WebSocket 消息DTO | `ruoyi-common/ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/dto/WebSocketMessageDto.java` |
| WebSocket 配置 | `ruoyi-common/ruoyi-common-websocket/src/main/java/org/dromara/common/websocket/config/WebSocketConfig.java` |
| SSE 工具类 | `ruoyi-common/ruoyi-common-sse/src/main/java/org/dromara/common/sse/utils/SseMessageUtils.java` |
| SSE 连接管理 | `ruoyi-common/ruoyi-common-sse/src/main/java/org/dromara/common/sse/core/SseEmitterManager.java` |
| SSE 控制器 | `ruoyi-common/ruoyi-common-sse/src/main/java/org/dromara/common/sse/controller/SseController.java` |
| SSE 消息DTO | `ruoyi-common/ruoyi-common-sse/src/main/java/org/dromara/common/sse/dto/SseMessageDto.java` |
