---
name: java-exception
description: |
  Java异常处理规范。当编写异常处理代码时使用此skill，包括异常捕获、转换和NPE防护规范。
  
    触发场景：
    - 编写try-catch异常处理代码
    - 实现NPE防护（Optional、Objects.requireNonNull）
    - 异常转换（底层异常转业务异常）
    - finally块资源关闭规范
  
    触发词：异常处理、Exception、NPE、NullPointerException、finally、try-catch、异常捕获、异常转换、Optional、异常链
---

# Java异常处理规范

## 核心原则

### 1. 异常不用于流程控制

```java
// ❌ 错误:用异常做流程控制
try {
    user = userService.getById(id);
} catch (NotFoundException e) {
    user = createDefaultUser();
}

// ✅ 正确:用条件判断
User user = userService.getById(id);
if (user == null) {
    user = createDefaultUser();
}
```

### 2. 异常必须处理或透传

```java
// ❌ 错误:空catch块
try {
    doSomething();
} catch (Exception e) {
    // 什么都不做 - 吞掉异常
}

// ✅ 正确:至少记录日志
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败", e);
    throw new LeException("处理失败");
}
```

## 业务异常

### 使用LeException

```java
// 直接抛出业务异常
throw new LeException("错误信息");

// 带检查的业务异常
throw new LeCheckedException("错误信息");

// 断言式异常(推荐)
Assert.notNull(obj, () -> new LeException("对象不能为空"));
Assert.isTrue(condition, () -> new LeException("条件不满足"));
Assert.notEmpty(list, () -> new LeException("列表不能为空"));
```

### 条件判断抛异常

```java
// 判空抛异常
if (ObjectUtil.isNull(entity)) {
    throw new LeException("数据不存在");
}

// 集合判空
if (CollUtil.isEmpty(list)) {
    throw new LeException("列表不能为空");
}

// 条件判断
if (!condition) {
    throw new LeException("条件不满足");
}
```

## 异常捕获

### 捕获具体异常

```java
// ✅ 正确:捕获具体异常
try {
    doSomething();
} catch (IOException e) {
    log.error("IO操作失败", e);
    throw new LeException("文件处理失败");
} catch (SQLException e) {
    log.error("数据库操作失败", e);
    throw new LeException("数据操作失败");
}

// ❌ 避免:捕获Exception
try {
    doSomething();
} catch (Exception e) {
    // 太宽泛,可能捕获不应该捕获的异常
}
```

### 异常转换

```java
// 将底层异常转换为业务异常
try {
    // 调用第三方API
    thirdPartyApi.call();
} catch (ApiException e) {
    log.error("第三方API调用失败", e);
    throw new LeException("服务暂时不可用,请稍后重试");
}
```

## Finally块规范

### 资源关闭

```java
// ✅ 推荐:使用try-with-resources
try (InputStream is = new FileInputStream(file);
     OutputStream os = new FileOutputStream(target)) {
    // 操作
}

// ✅ 或在finally中关闭
InputStream is = null;
try {
    is = new FileInputStream(file);
    // 操作
} finally {
    if (is != null) {
        try {
            is.close();
        } catch (IOException e) {
            log.error("关闭流失败", e);
        }
    }
}
```

### 不要在finally中使用return

```java
// ❌ 错误:finally中使用return
public int method() {
    try {
        return 1;
    } finally {
        return 2;  // 会覆盖try中的return
    }
}

// ✅ 正确:不在finally中return
public int method() {
    try {
        return 1;
    } finally {
        // 清理资源
    }
}
```

## NPE防护

### 数据库查询结果判空

```java
// ✅ 查询结果判空
XxxEntity entity = mapper.selectOne(query);
if (ObjectUtil.isNull(entity)) {
    throw new LeException("数据不存在");
}

// ✅ 使用Optional
Optional.ofNullable(mapper.selectOne(query))
    .orElseThrow(() -> new LeException("数据不存在"));
```

### 集合操作判空

```java
// ✅ 集合判空
if (CollUtil.isEmpty(list)) {
    return Collections.emptyList();
}

// ✅ 集合元素判空
list.stream()
    .filter(Objects::nonNull)
    .map(XxxVO::getId)
    .collect(Collectors.toList());
```

### 级联调用防护

```java
// ❌ 错误:级联调用易产生NPE
String city = user.getAddress().getCity().getName();

// ✅ 正确:使用Optional
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .map(City::getName)
    .orElse("未知");

// ✅ 或逐级判空
if (user != null && user.getAddress() != null
    && user.getAddress().getCity() != null) {
    city = user.getAddress().getCity().getName();
}
```

### 远程调用结果判空

```java
// ✅ 远程调用结果必须判空
UserDTO userDTO = remoteUserService.getUser(userId);
if (ObjectUtil.isNull(userDTO)) {
    throw new LeException("用户信息获取失败");
}
```

## 事务场景异常处理

### 事务回滚

```java
@Transactional(rollbackFor = Exception.class)
public void businessMethod() {
    try {
        // 业务逻辑
        orderMapper.insert(order);
        orderDetailMapper.insert(detail);
    } catch (Exception e) {
        log.error("订单创建失败", e);
        // 异常会自动触发事务回滚
        throw new LeException("订单创建失败");
    }
}
```

### 手动回滚

```java
@Transactional(rollbackFor = Exception.class)
public void businessMethod() {
    try {
        // 业务逻辑
    } catch (Exception e) {
        log.error("处理失败", e);
        // 如果需要手动回滚
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        throw new LeException("处理失败");
    }
}
```

## 异常日志

### 记录异常堆栈

```java
// ✅ 正确:记录异常堆栈
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败,参数:{}", param, e);  // e作为最后一个参数
    throw new LeException("处理失败");
}

// ❌ 错误:不记录异常堆栈
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败:{}", e.getMessage());  // 只记录消息,丢失堆栈
}
```

### 异常信息包含案发现场

```java
// ✅ 记录案发现场信息
try {
    processOrder(orderId);
} catch (Exception e) {
    log.error("订单处理失败,orderId:{}, userId:{}", orderId, userId, e);
    throw new LeException("订单处理失败");
}
```

## 常见场景

### 场景1: 参数校验失败

```java
public void process(XxxParam param) {
    // 参数校验
    Assert.notNull(param, () -> new LeException("参数不能为空"));
    Assert.notBlank(param.getName(), () -> new LeException("名称不能为空"));
    Assert.notEmpty(param.getIds(), () -> new LeException("ID列表不能为空"));

    // 业务逻辑
}
```

### 场景2: 数据不存在

```java
public XxxVO getById(Long id) {
    XxxEntity entity = mapper.selectById(id);
    if (ObjectUtil.isNull(entity)) {
        throw new LeException("数据不存在");
    }
    return BeanUtil.copyProperties(entity, XxxVO.class);
}
```

### 场景3: 业务规则校验失败

```java
public void updateStatus(Long id, Integer status) {
    XxxEntity entity = mapper.selectById(id);
    Assert.notNull(entity, () -> new LeException("数据不存在"));

    // 业务规则校验
    if (entity.getStatus().equals(StatusEnum.COMPLETED.getCode())) {
        throw new LeException("已完成的订单不能修改状态");
    }

    entity.setStatus(status);
    mapper.updateById(entity);
}
```

### 场景4: 第三方调用失败

```java
public void callThirdParty(XxxParam param) {
    try {
        ThirdPartyResponse response = thirdPartyApi.call(param);
        if (!response.isSuccess()) {
            throw new LeException("第三方服务返回失败:" + response.getMessage());
        }
    } catch (ApiException e) {
        log.error("第三方API调用失败", e);
        throw new LeException("服务暂时不可用,请稍后重试");
    }
}
```

## 最佳实践

### 1. 异常分层

- **Controller层**: 捕获Service层异常,转换为HTTP响应
- **Service层**: 抛出业务异常(LeException)
- **Mapper层**: 抛出数据访问异常

### 2. 异常信息清晰

```java
// ✅ 清晰的异常信息
throw new LeException("用户名已存在,请使用其他用户名");

// ❌ 模糊的异常信息
throw new LeException("操作失败");
```

### 3. 不要过度捕获

```java
// ❌ 过度捕获
public void method1() {
    try {
        method2();
    } catch (Exception e) {
        log.error("method1失败", e);
        throw new LeException("method1失败");
    }
}

public void method2() {
    try {
        method3();
    } catch (Exception e) {
        log.error("method2失败", e);
        throw new LeException("method2失败");
    }
}

// ✅ 在合适的层级捕获
public void method1() {
    method2();  // 让异常向上传播
}

public void method2() {
    try {
        method3();
    } catch (Exception e) {
        log.error("业务处理失败", e);
        throw new LeException("业务处理失败");
    }
}
```
