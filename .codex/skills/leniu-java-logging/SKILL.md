---
name: leniu-java-logging
description: |
  leniu-tengyun-core / leniu-yunshitang 项目日志规范。当编写日志代码时使用此 skill，包括日志框架使用、级别选择、异常日志规范和日志文件管理。

  触发场景：
  - 编写日志记录代码（@Slf4j、log.info/error/debug）
  - 配置日志级别和输出格式
  - 记录异常日志（含完整堆栈）
  - 业务关键路径日志埋点
  - 日志文件管理和保留策略

  触发词：日志、@Slf4j、log.info、log.error、log.debug、log.warn、日志级别、日志格式、日志记录、logging、logback、leniu-yunshitang、leniu-tengyun-core、net.xnzn
---

# leniu-tengyun-core / leniu-yunshitang 日志规范

## 项目定位

| **适用项目** | leniu-tengyun-core：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core` |
|-------------|------------------------------------------------------------------------------------------|
|             | leniu-yunshitang：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang` |

## 日志框架配置

### 使用 SLF4J + Lombok

```java
import lombok.extern.slf4j.Slf4j;

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
// ❌ 错误：直接使用 Log4j/Logback
import org.apache.log4j.Logger;
Logger logger = Logger.getLogger(XxxService.class);

// ✅ 正确：使用 SLF4J
import lombok.extern.slf4j.Slf4j;
@Slf4j
public class XxxService { }
```

### 日志配置文件

项目使用 Logback 日志框架，配置文件位于：

```
core-starter/src/main/resources/logback-spring.xml
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
    <include resource="org/springframework/boot/logging/logback/file-appender.xml"/>

    <springProfile name="!no_log_console">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="!no_log_file">
        <root level="INFO">
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```

### Profile 控制

| Profile | 作用 |
|---------|------|
| `no_log_console` | 不输出到控制台 |
| `no_log_file` | 不输出到文件 |

## 日志级别

### ERROR - 错误日志

用于记录系统错误、异常情况，需要立即关注和处理。

```java
import cn.hutool.core.util.ObjectUtil;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    public void processOrder(Long orderId) {
        try {
            // 业务逻辑
            doProcess(orderId);
        } catch (Exception e) {
            log.error("订单处理失败, orderId:{}", orderId, e);
            throw new LeException("订单处理失败");
        }
    }

    // 业务异常
    public void validateOrder(Order order) {
        if (ObjectUtil.isNull(order)) {
            log.error("订单不存在, orderId:{}", orderId);
            throw new LeException("订单不存在");
        }
    }

    // 业务数据异常
    public void checkGoods(List<String> missingNames) {
        log.error("以下{}个货品在系统中不存在: {}", missingNames.size(), missingNames);
    }
}
```

### WARN - 警告日志

用于记录非预期但可处理的情况，不影响系统运行但需要关注。

```java
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ConfigService {

    // 数据不存在
    public Config getConfig(String key) {
        Config config = configMapper.selectById(key);
        if (ObjectUtil.isNull(config)) {
            log.warn("配置不存在, key:{}", key);
            return null;
        }
        return config;
    }

    // 配置缺失
    public String getConfigWithDefault(String key, String defaultValue) {
        String value = getConfigValue(key);
        if (StrUtil.isBlank(value)) {
            log.warn("配置项缺失, key:{}, 使用默认值", key);
            return defaultValue;
        }
        return value;
    }
}
```

### INFO - 信息日志

用于记录关键业务节点、重要操作，便于追踪业务流程。

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    @Transactional(rollbackFor = Exception.class)
    public Long createOrder(OrderParam param) {
        log.info("【订单】开始创建订单, userId:{}, productId:{}",
                 param.getUserId(), param.getProductId());

        // 业务逻辑
        Order order = buildOrder(param);
        orderMapper.insert(order);

        log.info("【订单】订单创建成功, orderId:{}", order.getId());
        return order.getId();
    }

    public void payOrder(Long orderId, Long amount) {
        log.info("【支付】开始支付, orderId:{}, amount:{}", orderId, amount);

        // 支付逻辑
        PaymentResult result = paymentService.pay(orderId, amount);

        log.info("【支付】支付成功, orderId:{}, transactionId:{}",
                 orderId, result.getTransactionId());
    }
}
```

### DEBUG - 调试日志

用于开发调试，记录详细的执行过程和数据。生产环境不输出。

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    public List<OrderVO> queryList(OrderQueryParam param) {
        log.debug("查询参数: {}", param);

        // 执行查询
        List<OrderEntity> entities = orderMapper.selectList(buildWrapper(param));

        log.debug("查询结果数量: {}", entities.size());
        log.debug("查询结果: {}", entities);

        return BeanUtil.copyToList(entities, OrderVO.class);
    }
}
```

## 日志输出格式

### 使用占位符

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class UserService {

    // ✅ 正确：使用占位符
    public void login(String username, String password) {
        log.info("用户登录, userId:{}, userName:{}", userId, userName);
    }

    // ❌ 错误：字符串拼接
    public void loginWrong(String username, String password) {
        log.info("用户登录, userId:" + userId + ", userName:" + userName);
    }
}
```

### 条件输出

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class QueryService {

    // ✅ 对于 debug/trace 级别，使用条件输出
    public void queryWithDebug(Data param) {
        if (log.isDebugEnabled()) {
            log.debug("详细数据: {}", expensiveOperation());
        }
    }

    // ✅ 或使用 Lambda 形式（推荐）
    public void queryWithLambda(Data param) {
        log.debug("详细数据: {}", () -> expensiveOperation());
    }
}
```

### 模块标识

使用 `【模块名】` 标识，便于日志检索：

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    public void createOrder(OrderParam param) {
        log.info("【订单】开始创建订单, userId:{}", param.getUserId());
    }
}

@Slf4j
@Service
public class PaymentService {

    public void pay(Long orderId) {
        log.info("【支付】开始支付, orderId:{}", orderId);
    }
}

@Slf4j
@Service
public class InventoryService {

    public void reduceStock(Long productId, Integer quantity) {
        log.info("【库存】扣减库存, productId:{}, quantity:{}", productId, quantity);
    }
}
```

## 异常日志

### 记录异常堆栈

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    public void processOrder(Long orderId) {
        try {
            doProcess(orderId);
        } catch (Exception e) {
            // ✅ 正确：异常作为最后一个参数
            log.error("订单处理失败, orderId:{}", orderId, e);
            throw new LeException("订单处理失败");
        }
    }
}
```

```java
// ❌ 错误：只记录异常消息，丢失堆栈信息
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败:{}", e.getMessage());
}
```

### 记录案发现场

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    public void updateOrderStatus(Long orderId, Integer status) {
        try {
            // 业务逻辑
            updateStatus(orderId, status);
        } catch (Exception e) {
            // ✅ 记录关键参数和上下文
            log.error("订单状态更新失败, orderId:{}, oldStatus:{}, newStatus:{}",
                      orderId, oldStatus, status, e);
            throw new LeException("订单状态更新失败");
        }
    }
}
```

## 敏感信息处理

### 不要记录敏感信息

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class UserService {

    // ❌ 错误：记录密码
    public void login(String username, String password) {
        log.info("用户登录, username:{}, password:{}", username, password);
    }

    // ✅ 正确：不记录密码
    public void login(String username, String password) {
        log.info("用户登录, username:{}", username);
        // 验证密码
    }

    // ❌ 错误：记录完整手机号
    public void sendSms(String mobile, String code) {
        log.info("发送验证码, mobile:{}, code:{}", mobile, code);
    }

    // ✅ 正确：脱敏处理
    public void sendSms(String mobile, String code) {
        log.info("发送验证码, mobile:{}", maskMobile(mobile));
        // 发送短信
    }
}
```

### 脱敏工具方法

```java
public class DataMaskUtil {

    // 手机号脱敏：138****1234
    public static String maskMobile(String mobile) {
        if (StrUtil.isBlank(mobile) || mobile.length() != 11) {
            return mobile;
        }
        return mobile.substring(0, 3) + "****" + mobile.substring(7);
    }

    // 身份证脱敏：1234**********5678
    public static String maskIdCard(String idCard) {
        if (StrUtil.isBlank(idCard) || idCard.length() < 8) {
            return idCard;
        }
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }

    // 银行卡脱敏：6222************8888
    public static String maskBankCard(String bankCard) {
        if (StrUtil.isBlank(bankCard) || bankCard.length() < 8) {
            return bankCard;
        }
        return bankCard.substring(0, 4) + "************" + bankCard.substring(bankCard.length() - 4);
    }
}
```

## 日志内容规范

### 1. 关键业务操作

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OrderService {

    @Transactional(rollbackFor = Exception.class)
    public Long createOrder(OrderParam param) {
        log.info("【订单】开始创建订单, userId:{}, productId:{}",
                 param.getUserId(), param.getProductId());

        // 业务逻辑
        Order order = buildOrder(param);
        orderMapper.insert(order);

        log.info("【订单】订单创建成功, orderId:{}", order.getId());
        return order.getId();
    }
}
```

### 2. 外部调用

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class RemoteUserService {

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
}
```

### 3. 定时任务

```java
import com.xxl.job.core.handler.annotation.XxlJob;
import lombok.extern.slf4j.Slf4j;

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

### 4. 消息队列

```java
import lombok.extern.slf4j.Slf4j;
import net.xnzn.framework.mq.MQListener;
import net.xnzn.framework.mq.MQMessageListener;

// ✅ 正确：leniu 项目 MQ 消费者用 @MQMessageListener + implements MQListener
@Slf4j
@MQMessageListener(group = "order-order-v3-xxx", topic = "order", tag = "order-v3-xxx")
public class OrderMqListenerXxx implements MQListener<MqPayload<String>> {

    @Override
    public void onMessage(MqPayload<String> payload) {
        log.info("[xxx事件]MQ消费：开始");
        // 委托给 Handler 处理
        orderMqHandler.handleMessage(payload, OrderXxxPO.class, OrderMqHandler::handleXxx);
    }
}

// Handler 中的日志规范
public void handleXxx(OrderXxxPO payload) {
    try {
        log.info("[xxx事件]MQ消费：开始");
        processXxx(payload);
        log.info("[xxx事件]MQ消费：消息消费完成");
    } catch (Exception e) {
        log.error("[xxx事件]MQ消费：处理异常", e);
    }
}
```

## 日志性能优化

### 1. 避免大对象序列化

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class QueryService {

    // ❌ 避免：序列化大对象
    public List<Order> queryOrders() {
        List<Order> orders = orderMapper.selectList(null);
        log.info("查询结果: {}", BeanUtil.beanToString(orders));  // 可能产生大量日志
        return orders;
    }

    // ✅ 推荐：只记录关键信息
    public List<Order> queryOrders() {
        List<Order> orders = orderMapper.selectList(null);
        log.info("查询结果数量: {}", orders.size());
        return orders;
    }
}
```

### 2. 使用条件判断

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class DebugService {

    // ✅ 对于复杂计算，使用条件判断
    public void processComplexData(Data data) {
        if (log.isDebugEnabled()) {
            log.debug("详细数据: {}", buildComplexString(data));
        }
    }
}
```

### 3. 避免循环中打印日志

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class BatchOrderService {

    // ❌ 避免：循环中打印日志
    public void batchProcess(List<Order> orders) {
        for (Order order : orders) {
            log.info("处理订单, orderId:{}", order.getId());  // 可能产生大量日志
            process(order);
        }
    }

    // ✅ 推荐：批量处理后打印
    public void batchProcess(List<Order> orders) {
        log.info("开始处理订单, 数量:{}", orders.size());

        int successCount = 0;
        int failCount = 0;
        for (Order order : orders) {
            try {
                process(order);
                successCount++;
            } catch (Exception e) {
                log.error("订单处理失败, orderId:{}", order.getId(), e);
                failCount++;
            }
        }

        log.info("订单处理完成, 成功:{}, 失败:{}", successCount, failCount);
    }
}
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

## 日志级别配置

### application.yml 配置

```yaml
logging:
  level:
    # 项目日志级别
    net.xnzn.core.order: INFO
    net.xnzn.core.payment: INFO
    net.xnzn.core.inventory: INFO

    # 框架日志级别
    com.baomidou.mybatisplus: INFO
    org.springframework: WARN
    org.apache.ibatis: WARN

  # 日志文件配置
  file:
    name: logs/application.log
```

### Profile 环境配置

```yaml
spring:
  profiles:
    active: dev

---
# 开发环境
spring:
  profiles: dev

logging:
  level:
    net.xnzn.core: DEBUG

---
# 生产环境
spring:
  profiles: prod

logging:
  level:
    net.xnzn.core: INFO
  # 生产环境不输出到控制台
  profiles:
    include: no_log_console
```

## 常见场景

### 场景1：Controller 层

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiresAuthentication
@RestController
@RequestMapping("/api/order")
@Api(value = "订单管理", tags = "订单管理")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @ApiOperation(value = "创建订单")
    @PostMapping("/create")
    public Long create(@Valid @RequestBody LeRequest<OrderParam> request) {
        OrderParam param = request.getContent();
        log.info("【订单】创建订单请求, userId:{}, productId:{}",
                 param.getUserId(), param.getProductId());

        Long orderId = orderService.create(param);

        log.info("【订单】订单创建成功, orderId:{}", orderId);
        return orderId;
    }
}
```

### 场景2：Service 层

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class OrderService {

    @Autowired
    private OrderMapper orderMapper;

    @Transactional(rollbackFor = Exception.class)
    public Long create(OrderParam param) {
        log.info("【订单】开始创建订单, param:{}", param);

        try {
            // 业务逻辑
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

### 场景3：分页查询

```java
import lombok.extern.slf4j.Slf4j;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;

@Slf4j
@Service
public class OrderService {

    public Page<OrderVO> pageList(OrderQueryParam param) {
        log.info("【订单】分页查询订单, pageNum:{}, pageSize:{}, keyword:{}",
                 param.getPage().getPageNum(),
                 param.getPage().getPageSize(),
                 param.getKeyword());

        // 开启分页
        PageMethod.startPage(param.getPage().getPageNum(), param.getPage().getPageSize());

        List<OrderEntity> records = orderMapper.selectList(buildWrapper(param));
        Page<OrderVO> result = new Page<>(BeanUtil.copyToList(records, OrderVO.class));

        log.info("【订单】分页查询完成, total:{}", result.getTotal());
        return result;
    }
}
```

## 最佳实践

### 1. 日志要有意义

```java
// ❌ 无意义的日志
log.info("进入方法");
log.info("退出方法");

// ✅ 有意义的日志
log.info("【订单】开始创建订单, userId:{}", userId);
log.info("【订单】订单创建成功, orderId:{}", orderId);
```

### 2. 日志要完整

```java
// ✅ 记录完整的业务流程
log.info("【支付】开始支付, orderId:{}, amount:{}", orderId, amount);
// 调用支付接口
log.info("【支付】支付接口调用成功, orderId:{}, transactionId:{}", orderId, transactionId);
// 更新订单状态
log.info("【支付】订单状态更新成功, orderId:{}", orderId);
```

### 3. 日志要准确

```java
// ✅ 准确描述操作结果
log.info("【库存】扣减库存成功, productId:{}, quantity:{}", productId, quantity);
log.warn("【库存】库存不足, productId:{}, available:{}, required:{}",
         productId, available, required);
```

### 4. 使用中文

```java
// ❌ 英文日志
log.info("Order created successfully, orderId:{}", orderId);

// ✅ 中文日志
log.info("【订单】订单创建成功, orderId:{}", orderId);
```

## 参考文档

- leniu-tengyun-core 源码：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core`
- leniu-yunshitang 源码：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang`
