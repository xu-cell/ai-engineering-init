---
name: leniu-java-logging
description: |
  leniu-tengyun-core / leniu-yunshitang 项目日志规范。当编写日志代码时使用此 skill。

  触发场景：
  - 编写日志记录代码（@Slf4j、log.info/error/debug）
  - 记录异常日志（含完整堆栈）
  - 业务关键路径日志埋点（订单/支付/MQ/定时任务）
  - 配置日志级别和 Logback
  - 敏感信息脱敏处理

  触发词：日志、@Slf4j、log.info、log.error、log.debug、日志级别、logback、日志格式、日志脱敏、异常日志
---

# leniu 日志规范

## 基本规则

- 使用 `@Slf4j`（Lombok），禁止直接用 Log4j/Logback API
- 使用 `{}` 占位符，禁止字符串拼接
- 异常对象作为 `log.error` 的**最后一个参数**（自动打印堆栈）
- 日志用**中文**，用 `【模块名】` 前缀便于检索
- 禁止记录密码、完整手机号等敏感信息

## 日志级别选择

| 级别 | 场景 | 示例 |
|------|------|------|
| ERROR | 系统错误、需立即处理 | 数据库异常、外部服务失败 |
| WARN | 非预期但可处理 | 配置缺失用默认值、数据不存在 |
| INFO | 关键业务节点 | 订单创建/支付成功、定时任务完成 |
| DEBUG | 开发调试（生产不输出） | 查询参数、中间结果 |

## 模块标识格式

```java
log.info("【订单】开始创建订单, userId:{}", userId);
log.info("【支付】支付成功, orderId:{}, transactionId:{}", orderId, txId);
log.info("【库存】扣减库存, productId:{}, quantity:{}", productId, qty);
log.error("【远程调用】用户服务调用失败, userId:{}", userId, e);
```

MQ 消费用方括号：
```java
log.info("[xxx事件]MQ消费：开始");
log.info("[xxx事件]MQ消费：消息消费完成");
log.error("[xxx事件]MQ消费：处理异常", e);
```

## 异常日志（最重要）

```java
// ✅ 正确：异常 e 作为最后参数，保留完整堆栈
try {
    doProcess(orderId);
} catch (Exception e) {
    log.error("订单处理失败, orderId:{}", orderId, e);
    throw new LeException("订单处理失败");
}

// ✅ 记录案发现场（关键参数 + 上下文）
try {
    updateStatus(orderId, status);
} catch (Exception e) {
    log.error("订单状态更新失败, orderId:{}, oldStatus:{}, newStatus:{}",
              orderId, oldStatus, status, e);
    throw new LeException("订单状态更新失败");
}

// ❌ 错误：只记录 message，丢失堆栈
log.error("处理失败:{}", e.getMessage());
```

## 各层日志规范

### Business/Service 层（关键业务）

```java
@Slf4j
@Service
public class OrderService {

    @Transactional(rollbackFor = Exception.class)
    public Long create(OrderParam param) {
        log.info("【订单】开始创建订单, userId:{}, productId:{}",
                 param.getUserId(), param.getProductId());
        try {
            Order order = buildOrder(param);
            orderMapper.insert(order);
            log.info("【订单】订单创建成功, orderId:{}", order.getId());
            return order.getId();
        } catch (Exception e) {
            log.error("【订单】订单创建失败, param:{}", param, e);
            throw new LeException("订单创建失败");
        }
    }
}
```

### 定时任务

```java
@Slf4j
@Component
public class DataSyncJob {

    @XxlJob("syncDataJob")
    public void syncData() {
        log.info("【定时任务】开始同步数据");
        try {
            int count = doSync();
            log.info("【定时任务】数据同步完成, 同步数量:{}", count);
        } catch (Exception e) {
            log.error("【定时任务】数据同步失败", e);
        }
    }
}
```

### MQ 消费者

```java
@Slf4j
@MQMessageListener(group = "order-order-v3-xxx", topic = "order", tag = "order-v3-xxx")
public class OrderMqListenerXxx implements MQListener<MqPayload<String>> {

    @Override
    public void onMessage(MqPayload<String> payload) {
        log.info("[xxx事件]MQ消费：开始");
        orderMqHandler.handleMessage(payload, OrderXxxPO.class, OrderMqHandler::handleXxx);
    }
}
```

### 外部调用

```java
public UserDTO getUserFromRemote(Long userId) {
    log.info("【远程调用】开始调用用户服务, userId:{}", userId);
    try {
        UserDTO user = remoteUserService.getUser(userId);
        log.info("【远程调用】用户服务调用成功, userId:{}", userId);
        return user;
    } catch (Exception e) {
        log.error("【远程调用】用户服务调用失败, userId:{}", userId, e);
        throw new LeException("用户信息获取失败");
    }
}
```

## 性能规则

```java
// ✅ debug 级别用条件判断或 Lambda（避免无用计算）
if (log.isDebugEnabled()) {
    log.debug("详细数据: {}", expensiveOperation());
}

// ✅ 批量操作：前后各一条，不在循环内打印
log.info("开始处理订单, 数量:{}", orders.size());
int success = 0, fail = 0;
for (Order order : orders) {
    try { process(order); success++; }
    catch (Exception e) { log.error("订单处理失败, orderId:{}", order.getId(), e); fail++; }
}
log.info("订单处理完成, 成功:{}, 失败:{}", success, fail);

// ✅ 只记录关键信息，不序列化大对象
log.info("查询结果数量: {}", orders.size());  // ✅
// log.info("查询结果: {}", orders);          // ❌ 大对象
```

## 敏感信息脱敏

```java
// ❌ 禁止记录：密码、完整手机号、身份证、银行卡
log.info("用户登录, username:{}, password:{}", username, password);

// ✅ 脱敏后记录
log.info("发送验证码, mobile:{}", maskMobile(mobile)); // 138****1234
```

脱敏工具：详见 `references/data-mask.md`

## Logback 配置

配置文件：`core-starter/src/main/resources/logback-spring.xml`

| Profile | 作用 |
|---------|------|
| `no_log_console` | 不输出到控制台 |
| `no_log_file` | 不输出到文件 |

```yaml
# application.yml 日志级别
logging:
  level:
    net.xnzn.core: INFO        # 项目
    com.baomidou.mybatisplus: INFO
    org.springframework: WARN
```

开发环境 `net.xnzn.core: DEBUG`，生产环境 `INFO` + `no_log_console`。

## 禁止项

```java
// ❌ 直接用 Log4j API
import org.apache.log4j.Logger;

// ❌ 字符串拼接
log.info("userId:" + userId + ", name:" + name);

// ❌ 无意义日志
log.info("进入方法");
log.info("退出方法");

// ❌ 英文日志（项目要求中文）
log.info("Order created successfully");

// ❌ 丢失异常堆栈
log.error("失败:{}", e.getMessage());
```

## 参考文档

- 详细场景示例（Controller/分页/远程调用）：详见 `references/logging-scenarios.md`
- 脱敏工具方法：详见 `references/data-mask.md`
