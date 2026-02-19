---
name: java-code-optimizer
description: |
  Java代码优化指南。当需要优化Java代码性能、重构代码结构、检测代码坏味道、改进代码质量时使用此skill。
  
    触发场景：
    - 优化Java代码性能（循环、数据库查询、并发处理）
    - 重构代码结构（卫语句、策略模式、状态模式）
    - 检测代码坏味道（长方法、重复代码、过深嵌套）
    - 代码质量改进和建议
  
    触发词：代码优化、性能优化、重构、坏味道、循环优化、策略模式、卫语句、代码改进、代码简化
---

# Java代码优化指南

## 性能优化

### 1. 循环优化

#### 避免循环内创建对象

```java
// ❌ 错误:循环内创建对象
for (int i = 0; i < 10000; i++) {
    StringBuilder sb = new StringBuilder();  // 每次循环都创建新对象
    sb.append("value").append(i);
}

// ✅ 正确:循环外创建对象
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.setLength(0);  // 清空内容
    sb.append("value").append(i);
}
```

#### 避免循环内查询数据库

```java
// ❌ 错误:循环查询数据库(N+1问题)
for (Long id : ids) {
    User user = userMapper.selectById(id);  // N次查询
    process(user);
}

// ✅ 正确:批量查询
List<User> users = userMapper.selectBatchIds(ids);  // 1次查询
for (User user : users) {
    process(user);
}
```

#### 提取循环不变量

```java
// ❌ 错误:循环内重复计算
for (int i = 0; i < list.size(); i++) {  // 每次都调用size()
    process(list.get(i));
}

// ✅ 正确:提取不变量
int size = list.size();
for (int i = 0; i < size; i++) {
    process(list.get(i));
}

// ✅ 更好:使用增强for循环
for (Item item : list) {
    process(item);
}
```

### 2. 数据库查询优化

#### 避免SELECT *

```java
// ❌ 错误:查询所有字段
List<User> users = userMapper.selectList(Wrappers.emptyWrapper());  // SELECT *

// ✅ 正确:只查询需要的字段
List<User> users = userMapper.selectList(
    Wrappers.lambdaQuery(User.class)
        .select(User::getId, User::getName, User::getEmail)
);
```

#### 使用分页查询

```java
// ❌ 错误:一次查询所有数据
List<Order> orders = orderMapper.selectList(Wrappers.emptyWrapper());  // 可能有几十万条

// ✅ 正确:使用分页
PageMethod.startPage(1, 100);
List<Order> orders = orderMapper.selectList(query);
```

#### 使用索引

```java
// ❌ 错误:未使用索引的查询
// WHERE name LIKE '%keyword%'  -- 全表扫描

// ✅ 正确:使用索引
// WHERE name LIKE 'keyword%'  -- 使用索引
// 或使用全文索引/搜索引擎
```

### 3. 集合操作优化

#### 指定集合初始容量

```java
// ❌ 错误:未指定初始容量
List<String> list = new ArrayList<>();  // 默认容量10,可能需要多次扩容
Map<String, String> map = new HashMap<>();  // 默认容量16

// ✅ 正确:指定初始容量
List<String> list = new ArrayList<>(100);  // 预知大小时指定容量
Map<String, String> map = new HashMap<>(128);  // (需要存储的元素个数 / 0.75) + 1
```

#### 使用合适的集合类型

```java
// ❌ 错误:频繁插入删除使用ArrayList
List<String> list = new ArrayList<>();
for (int i = 0; i < 10000; i++) {
    list.add(0, "value");  // 每次插入都需要移动元素
}

// ✅ 正确:频繁插入删除使用LinkedList
List<String> list = new LinkedList<>();
for (int i = 0; i < 10000; i++) {
    list.add(0, "value");  // O(1)时间复杂度
}
```

### 4. 并发处理优化

#### 使用CompletableFuture并行处理

```java
// ❌ 错误:串行处理
UserInfo userInfo = userService.getUserInfo(userId);  // 100ms
OrderInfo orderInfo = orderService.getOrderInfo(userId);  // 100ms
// 总耗时: 200ms

// ✅ 正确:并行处理
CompletableFuture<UserInfo> userFuture = CompletableFuture
    .supplyAsync(() -> userService.getUserInfo(userId), executor);
CompletableFuture<OrderInfo> orderFuture = CompletableFuture
    .supplyAsync(() -> orderService.getOrderInfo(userId), executor);

CompletableFuture.allOf(userFuture, orderFuture).join();
UserInfo userInfo = userFuture.join();
OrderInfo orderInfo = orderFuture.join();
// 总耗时: 100ms
```

#### 使用线程池

```java
// ❌ 错误:直接创建线程
for (int i = 0; i < 1000; i++) {
    new Thread(() -> process()).start();  // 创建1000个线程
}

// ✅ 正确:使用线程池
ExecutorService executor = new ThreadPoolExecutor(
    10, 20, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(100),
    new ThreadFactoryBuilder().setNameFormat("process-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()
);

for (int i = 0; i < 1000; i++) {
    executor.submit(() -> process());
}
```

### 5. 字符串操作优化

#### 使用StringBuilder拼接字符串

```java
// ❌ 错误:循环内使用+拼接
String result = "";
for (int i = 0; i < 1000; i++) {
    result += "value" + i;  // 每次都创建新String对象
}

// ✅ 正确:使用StringBuilder
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append("value").append(i);
}
String result = sb.toString();
```

## 代码重构

### 1. 使用卫语句减少嵌套

```java
// ❌ 错误:多层嵌套
public void process(Order order) {
    if (order != null) {
        if (order.getStatus() == OrderStatus.PAID) {
            if (order.getAmount() > 0) {
                // 业务逻辑
                doProcess(order);
            }
        }
    }
}

// ✅ 正确:使用卫语句
public void process(Order order) {
    if (order == null) {
        return;
    }
    if (order.getStatus() != OrderStatus.PAID) {
        return;
    }
    if (order.getAmount() <= 0) {
        return;
    }

    // 业务逻辑
    doProcess(order);
}
```

### 2. 使用策略模式替代if-else

```java
// ❌ 错误:大量if-else
public BigDecimal calculatePrice(String type, BigDecimal amount) {
    if ("VIP".equals(type)) {
        return amount.multiply(new BigDecimal("0.8"));
    } else if ("SVIP".equals(type)) {
        return amount.multiply(new BigDecimal("0.7"));
    } else if ("NORMAL".equals(type)) {
        return amount;
    } else {
        throw new LeException("未知类型");
    }
}

// ✅ 正确:使用策略模式
public interface PriceStrategy {
    BigDecimal calculate(BigDecimal amount);
}

public class VipPriceStrategy implements PriceStrategy {
    public BigDecimal calculate(BigDecimal amount) {
        return amount.multiply(new BigDecimal("0.8"));
    }
}

public class SvipPriceStrategy implements PriceStrategy {
    public BigDecimal calculate(BigDecimal amount) {
        return amount.multiply(new BigDecimal("0.7"));
    }
}

// 使用Map管理策略
private Map<String, PriceStrategy> strategyMap = new HashMap<>();

public BigDecimal calculatePrice(String type, BigDecimal amount) {
    PriceStrategy strategy = strategyMap.get(type);
    if (strategy == null) {
        throw new LeException("未知类型");
    }
    return strategy.calculate(amount);
}
```

### 3. 提取方法减少重复代码

```java
// ❌ 错误:重复代码
public void processOrder(Order order) {
    log.info("【订单】开始处理订单,orderId:{}", order.getId());
    // 业务逻辑1
    log.info("【订单】订单处理完成,orderId:{}", order.getId());
}

public void cancelOrder(Order order) {
    log.info("【订单】开始取消订单,orderId:{}", order.getId());
    // 业务逻辑2
    log.info("【订单】订单取消完成,orderId:{}", order.getId());
}

// ✅ 正确:提取公共方法
private void logOrderOperation(String operation, Long orderId, Runnable action) {
    log.info("【订单】开始{},orderId:{}", operation, orderId);
    action.run();
    log.info("【订单】{}完成,orderId:{}", operation, orderId);
}

public void processOrder(Order order) {
    logOrderOperation("处理订单", order.getId(), () -> {
        // 业务逻辑1
    });
}

public void cancelOrder(Order order) {
    logOrderOperation("取消订单", order.getId(), () -> {
        // 业务逻辑2
    });
}
```

### 4. 使用Optional避免空指针

```java
// ❌ 错误:多层null判断
public String getUserCity(Long userId) {
    User user = userMapper.selectById(userId);
    if (user != null) {
        Address address = user.getAddress();
        if (address != null) {
            return address.getCity();
        }
    }
    return "未知";
}

// ✅ 正确:使用Optional
public String getUserCity(Long userId) {
    return Optional.ofNullable(userMapper.selectById(userId))
        .map(User::getAddress)
        .map(Address::getCity)
        .orElse("未知");
}
```

## 代码坏味道检测

### 1. 长方法(方法超过80行)

**问题**: 方法过长,难以理解和维护

**解决方案**: 拆分为多个小方法

```java
// ❌ 错误:长方法(100+行)
public void processOrder(OrderParam param) {
    // 参数校验(10行)
    // 查询数据(20行)
    // 业务处理(50行)
    // 保存数据(20行)
}

// ✅ 正确:拆分为多个方法
public void processOrder(OrderParam param) {
    validateParam(param);
    OrderData data = queryOrderData(param);
    OrderResult result = processOrderBusiness(data);
    saveOrderResult(result);
}

private void validateParam(OrderParam param) { ... }
private OrderData queryOrderData(OrderParam param) { ... }
private OrderResult processOrderBusiness(OrderData data) { ... }
private void saveOrderResult(OrderResult result) { ... }
```

### 2. 重复代码

**问题**: 相同或相似的代码出现在多个地方

**解决方案**: 提取公共方法或使用模板方法模式

```java
// ❌ 错误:重复代码
public void createUser(UserParam param) {
    User user = new User();
    user.setName(param.getName());
    user.setEmail(param.getEmail());
    user.setCreateTime(LocalDateTime.now());
    user.setUpdateTime(LocalDateTime.now());
    userMapper.insert(user);
}

public void createOrder(OrderParam param) {
    Order order = new Order();
    order.setUserId(param.getUserId());
    order.setAmount(param.getAmount());
    order.setCreateTime(LocalDateTime.now());
    order.setUpdateTime(LocalDateTime.now());
    orderMapper.insert(order);
}

// ✅ 正确:提取公共逻辑
private <T> void setAuditFields(T entity) {
    // 使用MyBatis Plus的MetaObjectHandler自动填充
    // 或使用反射设置通用字段
}
```

### 3. 过深的嵌套(超过3层)

**问题**: 嵌套层次过深,代码难以理解

**解决方案**: 使用卫语句、提取方法、使用策略模式

```java
// ❌ 错误:过深嵌套
public void process(Order order) {
    if (order != null) {
        if (order.getStatus() == OrderStatus.PAID) {
            if (order.getAmount() > 0) {
                if (order.getUserId() != null) {
                    // 业务逻辑
                }
            }
        }
    }
}

// ✅ 正确:使用卫语句
public void process(Order order) {
    if (order == null) return;
    if (order.getStatus() != OrderStatus.PAID) return;
    if (order.getAmount() <= 0) return;
    if (order.getUserId() == null) return;

    // 业务逻辑
}
```

### 4. 魔法值

**问题**: 代码中直接使用数字或字符串字面量

**解决方案**: 使用常量或枚举

```java
// ❌ 错误:魔法值
if (status == 1) {
    // 处理
}

// ✅ 正确:使用枚举
if (Objects.equals(status, OrderStatus.PAID.getCode())) {
    // 处理
}
```

### 5. 过大的类(超过500行)

**问题**: 类承担了过多职责

**解决方案**: 按职责拆分为多个类

```java
// ❌ 错误:一个类包含所有逻辑
public class OrderService {
    // 订单创建(100行)
    // 订单查询(100行)
    // 订单更新(100行)
    // 订单删除(100行)
    // 订单统计(100行)
    // 订单导出(100行)
}

// ✅ 正确:按职责拆分
public class OrderService {
    // 核心业务逻辑
}

public class OrderQueryService {
    // 查询相关
}

public class OrderStatisticsService {
    // 统计相关
}

public class OrderExportService {
    // 导出相关
}
```

## 代码质量改进建议

### 1. 使用合适的数据类型

```java
// ❌ 错误:使用float/double存储金额
double amount = 10.1;  // 精度问题

// ✅ 正确:使用BigDecimal
BigDecimal amount = new BigDecimal("10.1");
```

### 2. 正确使用equals

```java
// ❌ 错误:可能NPE
if (str.equals("test")) { ... }

// ✅ 正确:常量在前或使用Objects.equals
if ("test".equals(str)) { ... }
if (Objects.equals(str, "test")) { ... }
```

### 3. 包装类型比较使用equals

```java
// ❌ 错误:使用==比较Integer
Integer a = 200;
Integer b = 200;
if (a == b) { ... }  // false,超出缓存范围

// ✅ 正确:使用equals
if (Objects.equals(a, b)) { ... }
```

### 4. 集合判空使用isEmpty

```java
// ❌ 错误:使用size() == 0
if (list.size() == 0) { ... }

// ✅ 正确:使用isEmpty()
if (CollUtil.isEmpty(list)) { ... }
```

### 5. 使用try-with-resources

```java
// ❌ 错误:手动关闭资源
InputStream is = null;
try {
    is = new FileInputStream(file);
    // 处理
} finally {
    if (is != null) {
        is.close();
    }
}

// ✅ 正确:使用try-with-resources
try (InputStream is = new FileInputStream(file)) {
    // 处理
}
```

## 优化检查清单

### 性能优化检查

- [ ] 是否存在循环内创建对象?
- [ ] 是否存在循环内查询数据库(N+1问题)?
- [ ] 是否使用了SELECT *?
- [ ] 大数据量查询是否使用了分页?
- [ ] 集合是否指定了初始容量?
- [ ] 是否可以使用并行处理提升性能?
- [ ] 字符串拼接是否使用了StringBuilder?

### 代码结构检查

- [ ] 方法是否超过80行?
- [ ] 是否存在重复代码?
- [ ] if-else嵌套是否超过3层?
- [ ] 是否存在魔法值?
- [ ] 类是否超过500行?

### 代码质量检查

- [ ] 是否正确处理了空指针?
- [ ] 是否使用了合适的数据类型?
- [ ] equals使用是否正确?
- [ ] 集合判空是否使用isEmpty?
- [ ] 资源是否正确关闭?
- [ ] 异常是否正确处理?
- [ ] 日志是否完整?

## 优化流程

1. **识别问题**: 使用上述检查清单识别代码中的问题
2. **评估影响**: 评估问题对性能、可维护性的影响
3. **制定方案**: 根据问题类型选择合适的优化方案
4. **实施优化**: 按照最佳实践进行代码优化
5. **测试验证**: 确保优化后功能正常且性能提升
6. **代码审查**: 提交代码前进行审查确认
