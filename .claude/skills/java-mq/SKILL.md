---
name: java-mq
description: |
  Java消息队列使用规范。当使用消息队列（MQ）时使用此skill，包括消息发送、消费和事务消息规范。

  触发场景：
  - 使用消息队列发送/消费消息
  - 实现延迟消息（延迟队列）
  - 消息消费失败重试处理
  - 事务消息（保证消息和数据库事务一致性）

  触发词：消息队列、MQ、RocketMQ、消息发送、消息消费、延迟消息、消息重试、事务消息、MessageQueue、@RocketMQMessageListener
---

# Java消息队列使用规范

## 核心组件

- **MqUtil**: 消息发送工具类
- **@MqConsumer**: 消息消费者注解
- **LeMqConstant.Topic**: 消息主题常量

## 消息发送

### 发送普通消息

```java
// 发送消息
MqUtil.send(dto, LeMqConstant.Topic.ORDER_CREATED);

// 发送消息示例
public void createOrder(OrderParam param) {
    // 创建订单
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 发送订单创建消息
    OrderDTO dto = BeanUtil.copyProperties(order, OrderDTO.class);
    MqUtil.send(dto, LeMqConstant.Topic.ORDER_CREATED);

    log.info("【MQ】发送订单创建消息,orderId:{}", order.getId());
}
```

### 发送延迟消息

```java
// 发送延迟消息
Duration delay = Duration.ofMinutes(30);
MqUtil.sendDelay(dto, LeMqConstant.Topic.ORDER_TIMEOUT, delay);

// 延迟消息示例:订单超时取消
public void createOrder(OrderParam param) {
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 发送30分钟后的超时检查消息
    OrderTimeoutDTO dto = new OrderTimeoutDTO();
    dto.setOrderId(order.getId());
    dto.setCreateTime(order.getCreateTime());

    Duration delay = Duration.ofMinutes(30);
    MqUtil.sendDelay(dto, LeMqConstant.Topic.ORDER_TIMEOUT, delay);

    log.info("【MQ】发送订单超时检查消息,orderId:{}, delay:{}分钟",
             order.getId(), delay.toMinutes());
}
```

## 消息消费

### 基础消费者

```java
@Component
@Slf4j
public class OrderMessageConsumer {

    @Autowired
    private OrderService orderService;

    /**
     * 消费订单创建消息
     */
    @MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
    public void handleOrderCreated(OrderDTO order) {
        log.info("【MQ消费】收到订单创建消息,orderId:{}", order.getId());

        try {
            // 处理业务逻辑
            orderService.processOrderCreated(order);

            log.info("【MQ消费】订单创建消息处理完成,orderId:{}", order.getId());
        } catch (Exception e) {
            log.error("【MQ消费】订单创建消息处理失败,orderId:{}", order.getId(), e);
            throw e;  // 重新抛出,触发重试
        }
    }
}
```

### 消费者最佳实践

```java
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
public void handleOrderCreated(OrderDTO order) {
    log.info("【MQ消费】收到订单创建消息,orderId:{}", order.getId());

    try {
        // 1. 参数校验
        Assert.notNull(order, () -> new LeException("消息内容不能为空"));
        Assert.notNull(order.getId(), () -> new LeException("订单ID不能为空"));

        // 2. 幂等性检查(避免重复消费)
        if (isProcessed(order.getId())) {
            log.warn("【MQ消费】消息已处理,跳过,orderId:{}", order.getId());
            return;
        }

        // 3. 业务处理
        orderService.processOrderCreated(order);

        // 4. 标记已处理
        markProcessed(order.getId());

        log.info("【MQ消费】订单创建消息处理完成,orderId:{}", order.getId());
    } catch (Exception e) {
        log.error("【MQ消费】订单创建消息处理失败,orderId:{}", order.getId(), e);
        throw e;  // 重新抛出,触发重试
    }
}
```

## 消息主题定义

### 主题常量

```java
public class LeMqConstant {
    public static class Topic {
        // 订单相关
        public static final String ORDER_CREATED = "order.created";
        public static final String ORDER_PAID = "order.paid";
        public static final String ORDER_TIMEOUT = "order.timeout";
        public static final String ORDER_CANCELLED = "order.cancelled";

        // 支付相关
        public static final String PAYMENT_SUCCESS = "payment.success";
        public static final String PAYMENT_FAILED = "payment.failed";

        // 库存相关
        public static final String INVENTORY_DEDUCTED = "inventory.deducted";
        public static final String INVENTORY_RESTORED = "inventory.restored";

        // 通知相关
        public static final String NOTIFICATION_SMS = "notification.sms";
        public static final String NOTIFICATION_EMAIL = "notification.email";
    }
}
```

## 消息幂等性

### 使用Redis实现幂等

```java
@Autowired
private RedisTemplate<String, String> redisTemplate;

/**
 * 检查消息是否已处理
 */
private boolean isProcessed(Long orderId) {
    String key = "mq:order:processed:" + orderId;
    return Boolean.TRUE.equals(redisTemplate.hasKey(key));
}

/**
 * 标记消息已处理
 */
private void markProcessed(Long orderId) {
    String key = "mq:order:processed:" + orderId;
    // 设置过期时间,避免Redis内存占用过多
    redisTemplate.opsForValue().set(key, "1", 7, TimeUnit.DAYS);
}
```

### 使用数据库实现幂等

```java
/**
 * 检查消息是否已处理
 */
private boolean isProcessed(Long orderId) {
    MqMessageLog log = mqMessageLogMapper.selectOne(
        Wrappers.lambdaQuery(MqMessageLog.class)
            .eq(MqMessageLog::getOrderId, orderId)
            .eq(MqMessageLog::getTopic, LeMqConstant.Topic.ORDER_CREATED)
    );
    return log != null && log.getStatus().equals(ProcessStatus.SUCCESS);
}

/**
 * 标记消息已处理
 */
@Transactional(rollbackFor = Exception.class)
private void markProcessed(Long orderId) {
    MqMessageLog log = new MqMessageLog();
    log.setOrderId(orderId);
    log.setTopic(LeMqConstant.Topic.ORDER_CREATED);
    log.setStatus(ProcessStatus.SUCCESS);
    log.setProcessTime(LocalDateTime.now());
    mqMessageLogMapper.insert(log);
}
```

## 消息重试

### 重试策略

```java
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
public void handleOrderCreated(OrderDTO order) {
    try {
        // 业务处理
        orderService.processOrderCreated(order);
    } catch (Exception e) {
        log.error("【MQ消费】订单创建消息处理失败,orderId:{}", order.getId(), e);

        // 判断是否需要重试
        if (isRetryable(e)) {
            throw e;  // 重新抛出,触发重试
        } else {
            // 不可重试的异常,记录日志并丢弃消息
            log.error("【MQ消费】不可重试的异常,丢弃消息,orderId:{}", order.getId());
            // 可以发送告警通知
            sendAlert(order, e);
        }
    }
}

/**
 * 判断异常是否可重试
 */
private boolean isRetryable(Exception e) {
    // 网络异常、超时异常等可重试
    if (e instanceof TimeoutException || e instanceof IOException) {
        return true;
    }
    // 业务异常不重试
    if (e instanceof LeException) {
        return false;
    }
    return true;
}
```

## 事务消息

### 本地消息表方案

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    // 1. 创建订单
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 2. 保存消息到本地消息表
    MqMessage message = new MqMessage();
    message.setTopic(LeMqConstant.Topic.ORDER_CREATED);
    message.setContent(JacksonUtil.writeValueAsString(order));
    message.setStatus(MessageStatus.PENDING);
    mqMessageMapper.insert(message);

    log.info("【MQ】保存订单创建消息到本地表,orderId:{}", order.getId());
}

// 定时任务扫描本地消息表并发送
@XxlJob("sendPendingMessages")
public void sendPendingMessages() {
    List<MqMessage> messages = mqMessageMapper.selectList(
        Wrappers.lambdaQuery(MqMessage.class)
            .eq(MqMessage::getStatus, MessageStatus.PENDING)
            .lt(MqMessage::getRetryCount, 3)
    );

    for (MqMessage message : messages) {
        try {
            // 发送消息
            MqUtil.send(message.getContent(), message.getTopic());

            // 更新状态
            message.setStatus(MessageStatus.SENT);
            mqMessageMapper.updateById(message);

            log.info("【MQ】发送待发送消息成功,messageId:{}", message.getId());
        } catch (Exception e) {
            log.error("【MQ】发送待发送消息失败,messageId:{}", message.getId(), e);

            // 增加重试次数
            message.setRetryCount(message.getRetryCount() + 1);
            mqMessageMapper.updateById(message);
        }
    }
}
```

## 消息顺序性

### 使用消息分区

```java
// 发送消息时指定分区键,确保同一订单的消息发送到同一分区
public void sendOrderMessage(OrderDTO order) {
    // 使用订单ID作为分区键
    String partitionKey = String.valueOf(order.getId());
    MqUtil.sendWithPartitionKey(order, LeMqConstant.Topic.ORDER_CREATED, partitionKey);

    log.info("【MQ】发送订单消息,orderId:{}, partitionKey:{}",
             order.getId(), partitionKey);
}
```

## 死信队列

### 处理失败消息

```java
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED_DLQ)
public void handleDeadLetter(OrderDTO order) {
    log.error("【MQ死信】收到死信消息,orderId:{}", order.getId());

    // 1. 记录死信消息
    DeadLetterMessage dlm = new DeadLetterMessage();
    dlm.setTopic(LeMqConstant.Topic.ORDER_CREATED);
    dlm.setContent(JacksonUtil.writeValueAsString(order));
    dlm.setCreateTime(LocalDateTime.now());
    deadLetterMapper.insert(dlm);

    // 2. 发送告警
    sendAlert("订单消息处理失败", order);

    log.info("【MQ死信】死信消息已记录,orderId:{}", order.getId());
}
```

## 常见场景

### 场景1: 订单创建后发送通知

```java
@Transactional(rollbackFor = Exception.class)
public Long createOrder(OrderParam param) {
    // 创建订单
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 发送订单创建消息
    OrderDTO dto = BeanUtil.copyProperties(order, OrderDTO.class);
    MqUtil.send(dto, LeMqConstant.Topic.ORDER_CREATED);

    log.info("【订单】订单创建成功,orderId:{}", order.getId());
    return order.getId();
}

// 消费者:发送通知
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
public void sendOrderNotification(OrderDTO order) {
    log.info("【MQ消费】发送订单通知,orderId:{}", order.getId());

    // 发送短信通知
    smsService.sendOrderCreatedSms(order);

    // 发送邮件通知
    emailService.sendOrderCreatedEmail(order);
}
```

### 场景2: 订单超时自动取消

```java
// 创建订单时发送延迟消息
public void createOrder(OrderParam param) {
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 发送30分钟后的超时检查消息
    OrderTimeoutDTO dto = new OrderTimeoutDTO();
    dto.setOrderId(order.getId());

    Duration delay = Duration.ofMinutes(30);
    MqUtil.sendDelay(dto, LeMqConstant.Topic.ORDER_TIMEOUT, delay);
}

// 消费者:检查订单状态并取消
@MqConsumer(topic = LeMqConstant.Topic.ORDER_TIMEOUT)
public void handleOrderTimeout(OrderTimeoutDTO dto) {
    log.info("【MQ消费】检查订单超时,orderId:{}", dto.getOrderId());

    Order order = orderMapper.selectById(dto.getOrderId());
    if (order == null) {
        log.warn("【MQ消费】订单不存在,orderId:{}", dto.getOrderId());
        return;
    }

    // 如果订单未支付,自动取消
    if (order.getStatus().equals(OrderStatus.UNPAID)) {
        orderService.cancelOrder(order.getId());
        log.info("【MQ消费】订单超时已取消,orderId:{}", order.getId());
    }
}
```

### 场景3: 异步解耦

```java
// 订单支付成功后,异步处理多个业务
@Transactional(rollbackFor = Exception.class)
public void payOrder(Long orderId) {
    // 更新订单状态
    Order order = orderMapper.selectById(orderId);
    order.setStatus(OrderStatus.PAID);
    orderMapper.updateById(order);

    // 发送支付成功消息
    OrderDTO dto = BeanUtil.copyProperties(order, OrderDTO.class);
    MqUtil.send(dto, LeMqConstant.Topic.ORDER_PAID);

    log.info("【订单】订单支付成功,orderId:{}", orderId);
}

// 消费者1:扣减库存
@MqConsumer(topic = LeMqConstant.Topic.ORDER_PAID)
public void deductInventory(OrderDTO order) {
    inventoryService.deduct(order.getProductId(), order.getQuantity());
}

// 消费者2:增加积分
@MqConsumer(topic = LeMqConstant.Topic.ORDER_PAID)
public void addPoints(OrderDTO order) {
    pointsService.add(order.getUserId(), order.getAmount());
}

// 消费者3:发送通知
@MqConsumer(topic = LeMqConstant.Topic.ORDER_PAID)
public void sendNotification(OrderDTO order) {
    notificationService.sendPaymentSuccess(order);
}
```

## 最佳实践

### 1. 消息体设计

```java
// ✅ 推荐:消息体包含必要信息
@Data
public class OrderDTO {
    private Long id;
    private Long userId;
    private Long productId;
    private Integer quantity;
    private BigDecimal amount;
    private Integer status;
    private LocalDateTime createTime;
}

// ❌ 避免:消息体只包含ID
@Data
public class OrderDTO {
    private Long id;  // 消费者需要再次查询数据库
}
```

### 2. 消息日志

```java
// 发送消息时记录日志
MqUtil.send(dto, LeMqConstant.Topic.ORDER_CREATED);
log.info("【MQ】发送订单创建消息,orderId:{}, topic:{}",
         dto.getId(), LeMqConstant.Topic.ORDER_CREATED);

// 消费消息时记录日志
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
public void handleOrderCreated(OrderDTO order) {
    log.info("【MQ消费】收到订单创建消息,orderId:{}", order.getId());
    // 处理逻辑
    log.info("【MQ消费】订单创建消息处理完成,orderId:{}", order.getId());
}
```

### 3. 异常处理

```java
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
public void handleOrderCreated(OrderDTO order) {
    try {
        // 业务处理
        orderService.processOrderCreated(order);
    } catch (Exception e) {
        log.error("【MQ消费】订单创建消息处理失败,orderId:{}", order.getId(), e);
        // 根据异常类型决定是否重试
        if (isRetryable(e)) {
            throw e;  // 重新抛出,触发重试
        }
    }
}
```
