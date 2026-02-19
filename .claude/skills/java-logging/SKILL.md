---
name: java-logging
description: |
  Java日志规范。当编写日志代码时使用此skill，包括日志框架使用、级别选择和异常日志规范。

  触发场景：
  - 编写日志记录代码（@Slf4j、log.info/error/debug）
  - 配置日志级别和输出格式
  - 记录异常日志（含完整堆栈）
  - 业务关键路径日志埋点

  触发词：日志、@Slf4j、log.info、log.error、log.debug、log.warn、日志级别、日志格式、日志记录、logging
---

# Java日志规范

## 日志框架

### 使用SLF4J + Lombok

```java
@Slf4j
@Service
public class XxxService {

    public void doSomething() {
        log.info("开始处理");
        log.debug("详细信息");
        log.warn("警告信息");
        log.error("错误信息");
    }
}
```

### 不要直接使用日志实现

```java
// ❌ 错误:直接使用Log4j/Logback
import org.apache.log4j.Logger;
Logger logger = Logger.getLogger(XxxService.class);

// ✅ 正确:使用SLF4J
import lombok.extern.slf4j.Slf4j;
@Slf4j
public class XxxService { }
```

## 日志级别

### ERROR - 错误日志

用于记录系统错误、异常情况,需要立即关注和处理。

```java
try {
    processOrder(orderId);
} catch (Exception e) {
    log.error("订单处理失败,orderId:{}", orderId, e);
    throw new LeException("订单处理失败");
}

// 业务异常
log.error("以下{}个货品在系统中不存在: {}", missingNames.size(), missingNames);
```

### WARN - 警告日志

用于记录非预期但可处理的情况,不影响系统运行但需要关注。

```java
// 数据不存在
if (ObjectUtil.isNull(entity)) {
    log.warn("数据不存在,id:{}", id);
    return null;
}

// 配置缺失
if (StringUtils.isBlank(config)) {
    log.warn("配置项缺失,使用默认值");
    config = DEFAULT_CONFIG;
}
```

### INFO - 信息日志

用于记录关键业务节点、重要操作,便于追踪业务流程。

```java
// 关键业务节点
log.info("【模块名】开始处理xxx,参数:{}", param);
log.info("【模块名】处理成功,结果:{}", result);

// 重要操作
log.info("【订单】创建订单,orderId:{}, userId:{}", orderId, userId);
log.info("【支付】支付成功,orderId:{}, amount:{}", orderId, amount);
```

### DEBUG - 调试日志

用于开发调试,记录详细的执行过程和数据。生产环境不输出。

```java
// 详细数据
log.debug("查询参数: {}", JacksonUtil.writeValueAsString(param));
log.debug("查询结果: {}", JacksonUtil.writeValueAsString(result));

// 执行过程
log.debug("开始查询数据库");
log.debug("查询完成,耗时:{}ms", duration);
```

## 日志输出格式

### 使用占位符

```java
// ✅ 正确:使用占位符
log.info("用户登录,userId:{}, userName:{}", userId, userName);

// ❌ 错误:字符串拼接
log.info("用户登录,userId:" + userId + ", userName:" + userName);
```

### 条件输出

```java
// ✅ 对于debug/trace级别,使用条件输出
if (log.isDebugEnabled()) {
    log.debug("详细数据: {}", expensiveOperation());
}

// ✅ 或使用占位符(推荐)
log.debug("详细数据: {}", () -> expensiveOperation());
```

### 模块标识

```java
// 使用【模块名】标识,便于日志检索
log.info("【订单】创建订单,orderId:{}", orderId);
log.info("【支付】支付成功,orderId:{}", orderId);
log.info("【库存】扣减库存,productId:{}, quantity:{}", productId, quantity);
```

## 异常日志

### 记录异常堆栈

```java
// ✅ 正确:异常作为最后一个参数
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败,参数:{}", param, e);
}

// ❌ 错误:只记录异常消息
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败:{}", e.getMessage());  // 丢失堆栈信息
}
```

### 记录案发现场

```java
// ✅ 记录关键参数和上下文
try {
    processOrder(orderId, userId);
} catch (Exception e) {
    log.error("订单处理失败,orderId:{}, userId:{}, status:{}",
              orderId, userId, status, e);
}
```

## 日志内容规范

### 1. 关键业务操作

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    log.info("【订单】开始创建订单,userId:{}, productId:{}",
             param.getUserId(), param.getProductId());

    // 业务逻辑
    Order order = buildOrder(param);
    orderMapper.insert(order);

    log.info("【订单】订单创建成功,orderId:{}", order.getId());
}
```

### 2. 外部调用

```java
public UserDTO getUserFromRemote(Long userId) {
    log.info("【远程调用】开始调用用户服务,userId:{}", userId);

    try {
        UserDTO user = remoteUserService.getUser(userId);
        log.info("【远程调用】用户服务调用成功,userId:{}", userId);
        return user;
    } catch (Exception e) {
        log.error("【远程调用】用户服务调用失败,userId:{}", userId, e);
        throw new LeException("用户信息获取失败");
    }
}
```

### 3. 定时任务

```java
@XxlJob("syncDataJob")
public void syncData() {
    log.info("【定时任务】开始同步数据");

    try {
        int count = doSync();
        log.info("【定时任务】数据同步完成,同步数量:{}", count);
    } catch (Exception e) {
        log.error("【定时任务】数据同步失败", e);
    }
}
```

### 4. 消息队列

```java
@MqConsumer(topic = LeMqConstant.Topic.ORDER_CREATED)
public void handleOrderCreated(OrderDTO order) {
    log.info("【MQ消费】收到订单创建消息,orderId:{}", order.getId());

    try {
        processOrder(order);
        log.info("【MQ消费】订单处理完成,orderId:{}", order.getId());
    } catch (Exception e) {
        log.error("【MQ消费】订单处理失败,orderId:{}", order.getId(), e);
        throw e;  // 重新抛出,触发重试
    }
}
```

## 敏感信息处理

### 不要记录敏感信息

```java
// ❌ 错误:记录密码
log.info("用户登录,username:{}, password:{}", username, password);

// ✅ 正确:不记录密码
log.info("用户登录,username:{}", username);

// ❌ 错误:记录完整手机号
log.info("发送验证码,mobile:{}", mobile);

// ✅ 正确:脱敏处理
log.info("发送验证码,mobile:{}", maskMobile(mobile));  // 138****1234
```

### 脱敏工具方法

```java
// 手机号脱敏
public static String maskMobile(String mobile) {
    if (StringUtils.isBlank(mobile) || mobile.length() != 11) {
        return mobile;
    }
    return mobile.substring(0, 3) + "****" + mobile.substring(7);
}

// 身份证脱敏
public static String maskIdCard(String idCard) {
    if (StringUtils.isBlank(idCard) || idCard.length() < 8) {
        return idCard;
    }
    return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
}
```

## 日志性能优化

### 1. 避免大对象序列化

```java
// ❌ 避免:序列化大对象
log.info("查询结果: {}", JacksonUtil.writeValueAsString(largeList));

// ✅ 推荐:只记录关键信息
log.info("查询结果数量: {}", largeList.size());
```

### 2. 使用条件判断

```java
// ✅ 对于复杂计算,使用条件判断
if (log.isDebugEnabled()) {
    log.debug("详细数据: {}", buildComplexString());
}
```

### 3. 避免循环中打印日志

```java
// ❌ 避免:循环中打印日志
for (Order order : orders) {
    log.info("处理订单,orderId:{}", order.getId());  // 可能产生大量日志
}

// ✅ 推荐:批量处理后打印
log.info("开始处理订单,数量:{}", orders.size());
// 处理逻辑
log.info("订单处理完成,成功:{}, 失败:{}", successCount, failCount);
```

## 日志文件管理

### 日志保留时间

- 所有日志文件至少保存 **15天**
- 重要业务日志建议保存 **30天** 或更长

### 日志分类

```properties
# application.properties
# 按模块分类日志
logging.level.net.xnzn.core.order=INFO
logging.level.net.xnzn.core.payment=INFO
logging.level.net.xnzn.core.inventory=INFO

# 按功能分类日志
logging.file.name=logs/application.log
logging.file.error.name=logs/error.log
logging.file.business.name=logs/business.log
```

## 常见场景

### 场景1: Controller层

```java
@PostMapping("/create")
public Long create(@Valid @RequestBody LeRequest<OrderParam> request) {
    OrderParam param = request.getContent();
    log.info("【订单】创建订单请求,userId:{}, productId:{}",
             param.getUserId(), param.getProductId());

    Long orderId = orderService.create(param);

    log.info("【订单】订单创建成功,orderId:{}", orderId);
    return orderId;
}
```

### 场景2: Service层

```java
@Transactional(rollbackFor = Exception.class)
public Long create(OrderParam param) {
    log.info("【订单】开始创建订单,param:{}", param);

    try {
        // 业务逻辑
        Order order = buildOrder(param);
        orderMapper.insert(order);

        log.info("【订单】订单创建成功,orderId:{}", order.getId());
        return order.getId();
    } catch (Exception e) {
        log.error("【订单】订单创建失败,param:{}", param, e);
        throw new LeException("订单创建失败");
    }
}
```

### 场景3: 分页查询

```java
public PageVO<OrderVO> pageList(OrderPageParam param) {
    log.info("【订单】分页查询订单,pageNum:{}, pageSize:{}, keyword:{}",
             param.getPage().getPageNum(),
             param.getPage().getPageSize(),
             param.getKeyword());

    PageMethod.startPage(param);
    List<Order> records = orderMapper.pageList(param);
    PageVO<OrderVO> result = PageVO.of(BeanUtil.copyToList(records, OrderVO.class));

    log.info("【订单】分页查询完成,total:{}", result.getTotal());
    return result;
}
```

## 最佳实践

### 1. 日志要有意义

```java
// ❌ 无意义的日志
log.info("进入方法");
log.info("退出方法");

// ✅ 有意义的日志
log.info("【订单】开始创建订单,userId:{}", userId);
log.info("【订单】订单创建成功,orderId:{}", orderId);
```

### 2. 日志要完整

```java
// ✅ 记录完整的业务流程
log.info("【支付】开始支付,orderId:{}, amount:{}", orderId, amount);
// 调用支付接口
log.info("【支付】支付接口调用成功,orderId:{}, transactionId:{}", orderId, transactionId);
// 更新订单状态
log.info("【支付】订单状态更新成功,orderId:{}", orderId);
```

### 3. 日志要准确

```java
// ✅ 准确描述操作结果
log.info("【库存】扣减库存成功,productId:{}, quantity:{}", productId, quantity);
log.warn("【库存】库存不足,productId:{}, available:{}, required:{}",
         productId, available, required);
```
