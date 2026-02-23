---
name: leniu-java-mq
description: |
  leniu-tengyun-core / leniu-yunshitang 项目消息队列规范。当使用消息队列（MQ）时使用此skill，包括消息发送、消费和事务消息规范。

  触发场景：
  - 使用消息队列发送/消费消息
  - 实现延迟消息（延迟队列）
  - 消息消费失败重试处理
  - 事务消息（保证消息和数据库事务一致性）

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-消息队列、leniu-MQ、leniu-MqUtil、leniu-@MqConsumer、leniu-延迟消息、leniu-消息重试、leniu-事务消息、net.xnzn、leniu-yunshitang
---

# leniu-tengyun-core 消息队列规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **消息工具** | `MqUtil` |
| **消费者注解** | `@MQMessageListener(group, topic, tag)` |
| **消费者接口** | `implements MQListener<MqPayload<String>>` |
| **主题常量** | `LeMqConstant.Topic` |
| **延迟枚举** | `LeMqConstant.DelayDuration` |
| **JSON工具** | `JacksonUtil` |
| **异常类** | `LeException` |

## 核心架构：三层分工

```
MsgSend（静态工具类）→ Listener（接收消息）→ Handler（分发处理）
```

| 层 | 职责 | 示例 |
|----|------|------|
| **XxxMessageSend** | 静态工具类，封装消息发送逻辑 | `OrderMessageSend` |
| **XxxMqListenerYyy** | 消费者，接收 MQ 消息并分发到 Handler | `OrderMqListenerAsyncSave` |
| **XxxMqHandler** | 业务处理，统一处理各类消息 | `OrderMqHandler` |

## 消息发送

### 三种发送方式

```java
import net.xnzn.core.common.mq.MqUtil;
import net.xnzn.core.common.constant.LeMqConstant;
import net.xnzn.core.common.utils.JacksonUtil;

// 1. 普通消息（立即发送）
MqUtil.send(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.XXX_TOPIC);

// 2. 事务消息（在 DB 事务提交后发送，保证一致性）
MqUtil.sendByTxEnd(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.XXX_TOPIC);

// 3. 延迟消息（指定延迟时长后触发）
MqUtil.sendDelay(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.XXX_TOPIC, LeMqConstant.DelayDuration.ONE_MINUTE);
```

**关键点**：
- 消息体必须用 `JacksonUtil.writeValueAsString()` 序列化为 **String** 再发送
- 事务消息用 `sendByTxEnd()`（如 DB 事务回滚则不发送）
- 延迟时间用 `LeMqConstant.DelayDuration` 枚举（不用 `Duration.ofMinutes()`）

### DelayDuration 枚举（常用值）

```java
LeMqConstant.DelayDuration.ONE_MINUTE      // 1分钟
LeMqConstant.DelayDuration.THIRTY_MINUTES  // 30分钟
// 其他枚举值参见 LeMqConstant.DelayDuration
```

### 消息发送类（静态工具类模式）

```java
/**
 * 订单消息发送
 * 关键特征：
 * 1. 不是 @Component，是纯静态工具类
 * 2. 私有构造器
 * 3. PO 中包含 traceId 和 tenantId（用于跨线程追踪）
 */
@Slf4j
public class XxxMessageSend {

    private XxxMessageSend() {}  // 禁止实例化

    private static final String MQ_ERROR_LOG = "发送MQ消息失败";

    /**
     * 普通消息（适用于非事务性发送）
     */
    public static void sendXxxEvent(XxxPO po) {
        log.info("[XxxMQ]发送xxx事件");
        po.setTraceId(LogUtil.getCurrentTraceId());
        po.setTenantId(TenantContextHolder.getTenantId());
        MqUtil.send(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.XXX_TOPIC);
    }

    /**
     * 事务消息（在 @Transactional 方法中使用，事务提交后才发送）
     */
    public static void sendXxxEventByTx(XxxPO po) {
        log.info("[XxxMQ]发送xxx事务消息");
        po.setTraceId(LogUtil.getCurrentTraceId());
        po.setTenantId(TenantContextHolder.getTenantId());
        try {
            MqUtil.sendByTxEnd(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.XXX_TOPIC);
        } catch (Exception e) {
            log.error(MQ_ERROR_LOG, e);
        }
    }

    /**
     * 延迟消息（超时取消等场景）
     */
    public static void sendXxxDelay(XxxPO po, LeMqConstant.DelayDuration delayDuration) {
        log.info("[XxxMQ]发送xxx延迟消息");
        po.setTraceId(LogUtil.getCurrentTraceId());
        po.setTenantId(TenantContextHolder.getTenantId());
        MqUtil.sendDelay(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.XXX_TOPIC, delayDuration);
    }
}
```

### PO 消息体规范

```java
import lombok.Data;

/**
 * MQ 消息 PO（Message Payload Object）
 * 必须包含 traceId 和 tenantId 字段
 */
@Data
public class XxxPO {

    /** 链路追踪ID */
    private String traceId;

    /** 租户ID */
    private String tenantId;

    /** 业务字段 */
    private Long orderId;
    private String outTradeNo;
    // 其他字段...
}
```

## 消息消费

### Listener 类（真实代码模式）

```java
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.common.mq.MqPayload;
import net.xnzn.framework.mq.MQListener;
import net.xnzn.framework.mq.MQMessageListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;

/**
 * MQ 消费者 Listener
 * @see LeMqConstant.Topic#XXX_TOPIC
 */
@Slf4j
@MQMessageListener(
    group = "module-xxx-topic-name",   // 消费组，格式：模块名-topic-tag
    topic = "xxx",                     // Topic 名称
    tag = "xxx-topic-name"             // Tag 名称（对应 LeMqConstant.Topic）
)
public class XxxMqListenerYyy implements MQListener<MqPayload<String>> {

    @Autowired
    @Lazy   // ⚠️ 必须 @Lazy，避免循环依赖
    private XxxMqHandler xxxMqHandler;

    @Override
    public void onMessage(MqPayload<String> payload) {
        // 委托给 Handler 处理，使用方法引用
        xxxMqHandler.handleMessage(payload, XxxPO.class, XxxMqHandler::handleXxx);
    }
}
```

### Handler 类（统一处理消息）

```java
import cn.hutool.core.text.CharSequenceUtil;
import com.pig4cloud.pigx.common.core.exception.LeException;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.common.export.util.I18nUtil;
import net.xnzn.core.common.mq.MqPayload;
import net.xnzn.core.common.utils.JacksonUtil;
import net.xnzn.framework.data.tenant.TenantContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.function.BiConsumer;

@Slf4j
@Service
public class XxxMqHandler {

    @Lazy
    @Autowired
    private XxxService xxxService;

    /**
     * 统一处理调用（核心模板方法）
     * 负责：反序列化、设置租户上下文、异常兜底
     */
    public <T> void handleMessage(MqPayload<String> payload, Class<T> clz, BiConsumer<XxxMqHandler, T> handleFunc) {
        I18nUtil.loadDefaultLocale();
        try {
            log.info("[Xxx消息]收到消息 {}", payload);
            T payloadData = JacksonUtil.readValue(payload.getData(), clz);
            if (payloadData != null) {
                TenantContextHolder.setTenantId(payload.getTenantId());  // 设置租户上下文
                handleFunc.accept(this, payloadData);
            } else {
                log.error("[Xxx消息]解析失败");
            }
        } catch (Exception e) {
            log.error("[Xxx消息]处理异常", e);
        }
    }

    /**
     * 处理 xxx 事件
     */
    public void handleXxx(XxxPO payload) {
        try {
            log.info("[Xxx事件]MQ消费：开始");
            xxxService.processXxx(payload);
            log.info("[Xxx事件]MQ消费：消息消费完成");
        } catch (Exception e) {
            log.error("[Xxx事件]MQ消费：处理异常", e);
        }
    }
}
```

## 常见场景

### 场景1：事务消息（下单后通知）

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    // 1. 保存订单
    OrderInfo order = OrderInfo.newDefaultInstance();
    order.setCanteenId(param.getCanteenId());
    orderMapper.insert(order);

    // 2. 事务提交后发送消息（保证一致性）
    OrderPlacedPO po = new OrderPlacedPO();
    po.setOrderInfo(order);
    OrderMessageSend.sendOrderPlacedByTx(po);  // 内部使用 sendByTxEnd

    log.info("订单创建成功，orderId:{}", order.getId());
}
```

### 场景2：延迟消息（订单超时取消）

```java
public static LocalDateTime sendOrderTimeout(String macOrderId, LeMqConstant.DelayDuration delayDuration) {
    log.info("[订单MQv3]发送未支付订单异步支付超时通知");
    OrderCancelPO po = new OrderCancelPO();
    po.setMacOrderId(macOrderId);
    po.setTenantId(TenantContextHolder.getTenantId());
    po.setTraceId(LogUtil.getCurrentTraceId());

    // 延迟发送
    MqUtil.sendDelay(JacksonUtil.writeValueAsString(po), LeMqConstant.Topic.ORDER_V3_ASYNC_TIMEOUT, delayDuration);

    // 返回预计触发时间
    return LocalDateTime.now().plusSeconds(delayDuration.getMilliseconds() / 1000);
}
```

### 场景3：带 Redisson 分布式锁的 MQ 消费

```java
public void orderAsyncSave(OrderSavePO payload) {
    // 消费时加分布式锁（防止并发处理同一订单）
    RLock lock = RedisUtil.getLock(OrderCacheConstants.orderCacheSaveLockKey(payload.getMacOrderId()));
    lock.lock();
    try {
        log.info("[订单异步保存]MQ消费：开始");
        doSaveOrder(payload);
        log.info("[订单异步保存]MQ消费：消息消费完成");
    } catch (Exception e) {
        log.error("[订单异步保存]MQ消费：处理异常", e);
    } finally {
        // 安全释放锁
        try {
            if (lock.isHeldByCurrentThread() && lock.isLocked()) {
                lock.unlock();
            }
        } catch (Exception e) {
            log.error("解锁异常", e);
        }
    }
}
```

## 日志规范

```java
// 发送端日志格式
log.info("[模块MQv3]发送xxx事件");

// 消费端日志格式
log.info("[xxx事件]MQ消费：开始");
log.info("[xxx事件]MQ消费：消息消费完成");
log.error("[xxx事件]MQ消费：处理异常", e);
```

## 常见错误

| 错误写法 | 正确写法 | 说明 |
|---------|---------|------|
| `MqUtil.send(dto, topic)` 直接传对象 | `MqUtil.send(JacksonUtil.writeValueAsString(dto), topic)` | 必须先序列化为 String |
| `@MqConsumer(topic = ...)` | `@MQMessageListener(group, topic, tag)` + `implements MQListener<MqPayload<String>>` | 实际框架注解不同 |
| `Duration.ofMinutes(30)` | `LeMqConstant.DelayDuration.THIRTY_MINUTES` | 延迟枚举不是 Duration |
| 忘记在 PO 中设置 `traceId`/`tenantId` | `po.setTraceId(LogUtil.getCurrentTraceId())` | 多租户追踪必须设置 |
| 消费方法直接 `@Autowired` 服务 | `@Autowired @Lazy` | 避免循环依赖 |
| 在 MQ 发送类上加 `@Component` | 纯静态工具类（私有构造器，不注入 Spring） | 发送类是静态工具 |
