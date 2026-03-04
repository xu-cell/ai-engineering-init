---
name: error-handler
description: |
  后端异常处理规范。包含 ServiceException 用法、全局异常处理器、参数校验、日志规范、错误码设计。

  触发场景：
  - 抛出业务异常（ServiceException）
  - 全局异常处理器配置
  - 参数校验异常处理
  - 日志记录规范
  - 错误码设计与国际化
  - 事务异常处理

  触发词：异常、ServiceException、throw、错误处理、全局异常、@Validated、参数校验、日志、log、错误码、事务、@Transactional、try-catch、异常捕获

  注意：
  - 如果是安全相关（认证授权、数据脱敏），请使用 security-guard。
  - 如果是数据权限（@DataPermission），请使用 data-permission。
---

# 后端异常处理指南

> 本项目是纯后端项目，本文档专注于 Java 后端异常处理规范。

---

## 快速索引

| 场景 | 推荐方式 |
|------|---------|
| 业务异常 | `throw new ServiceException("msg")` |
| 带参数异常 | `throw new ServiceException("用户 {} 不存在", userId)` |
| 带错误码 | `throw new ServiceException("msg", 200101)` |
| 参数校验 | `@Validated(AddGroup.class)` |
| 日志记录 | `log.error("msg: {}", e.getMessage(), e)` |

---

## 1. 业务异常 - ServiceException

### 基本用法

```java
import org.dromara.common.core.exception.ServiceException;

// ✅ 基本用法：抛出业务异常
throw new ServiceException("用户不存在");

// ✅ 带占位符（支持 {} 占位符，使用 Hutool StrFormatter）
throw new ServiceException("用户 {} 不存在", userId);
throw new ServiceException("订单 {} 状态 {} 无法支付", orderId, status);

// ✅ 带错误码（第二个参数是 Integer code）
throw new ServiceException("用户不存在", 200101);

// ✅ 条件抛出（手动检查）
if (ObjectUtil.isNull(user)) {
    throw new ServiceException("用户不存在");
}

// ✅ 参数校验
if (StringUtils.isBlank(bo.getName())) {
    throw new ServiceException("名称不能为空");
}
```

### ServiceException 完整 API

> **🔴 重要**：ServiceException **没有静态工厂方法**（如 `of()`）和条件检查方法（如 `throwIf()`, `notNull()`），必须使用 `new` 关键字创建异常对象。

| 构造函数 | 说明 | 示例 |
|---------|------|------|
| `new ServiceException(String message)` | 只有错误消息 | `new ServiceException("操作失败")` |
| `new ServiceException(String message, Object... args)` | 带占位符参数 | `new ServiceException("用户{}不存在", userId)` |
| `new ServiceException(String message, Integer code)` | 带错误码 | `new ServiceException("用户不存在", 200101)` |

**链式调用方法**：
- `setMessage(String message)`: 设置错误消息
- `setDetailMessage(String detailMessage)`: 设置详细错误（用于内部调试）

**源码位置**: `ruoyi-common/ruoyi-common-core/src/main/java/org/dromara/common/core/exception/ServiceException.java`

---

## 2. 全局异常处理器

框架已提供全局异常处理器，自动捕获并处理各类异常。

**位置**: `ruoyi-common/ruoyi-common-web/src/main/java/org/dromara/common/web/handler/GlobalExceptionHandler.java`

### 异常处理映射

> **注意**：所有异常的 HTTP 响应状态码均为 200，错误码通过 `R.code` 字段返回。

| 异常类型 | 处理方式 | R.code |
|---------|---------|--------|
| `ServiceException` | 返回业务错误信息 | 自定义 code 或 500 |
| `BindException` | 返回参数绑定错误 | 500 |
| `ConstraintViolationException` | 返回参数校验错误 | 500 |
| `MethodArgumentNotValidException` | 返回参数校验错误 | 500 |
| `HandlerMethodValidationException` | 返回 @Validated 校验错误 | 500 |
| `HttpRequestMethodNotSupportedException` | 请求方式不支持 | 405 |
| `NoHandlerFoundException` | 路由不存在 | 404 |
| `JsonParseException` | JSON 解析失败 | 400 |
| `HttpMessageNotReadableException` | 请求参数格式错误 | 400 |
| `ExpressionException` | SpEL 表达式解析失败 | 500 |
| `RuntimeException` / `Exception` | 系统错误 | 500 |

---

## 3. 参数校验

### 使用 @Validated 自动校验

```java
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;

// Controller 层校验
@PostMapping
public R<Long> add(@Validated(AddGroup.class) @RequestBody XxxBo bo) {
    // 参数校验失败会自动抛出异常
    // 全局异常处理器会自动捕获并返回错误信息
    return R.ok(xxxService.insert(bo));
}

@PutMapping
public R<Void> edit(@Validated(EditGroup.class) @RequestBody XxxBo bo) {
    return toAjax(xxxService.update(bo));
}
```

### BO 类校验注解

```java
public class XxxBo extends BaseEntity {

    @NotNull(message = "ID不能为空", groups = { EditGroup.class })
    private Long id;

    @NotBlank(message = "名称不能为空", groups = { AddGroup.class, EditGroup.class })
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Min(value = 0, message = "数量不能小于0")
    @Max(value = 9999, message = "数量不能大于9999")
    private Integer count;
}
```

### 手动校验（Service 层）

```java
import org.dromara.common.core.utils.ValidatorUtils;

// 手动触发校验
ValidatorUtils.validate(bo, AddGroup.class);
ValidatorUtils.validate(bo, EditGroup.class);
```

---

## 4. 日志规范

### 日志级别

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| ERROR | 系统错误、业务异常 | 数据库连接失败、第三方接口超时 |
| WARN | 警告信息、潜在问题 | 缓存未命中、重试操作 |
| INFO | 重要业务流程、操作记录 | 用户登录、订单创建 |
| DEBUG | 开发调试信息 | 方法入参、中间变量 |
| TRACE | 详细追踪信息 | 循环内部数据 |

### 日志最佳实践

```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class XxxServiceImpl implements IXxxService {

    // ✅ 好的：使用占位符（性能更好）
    log.info("处理订单: {}, 状态: {}", orderId, status);

    // ❌ 不好：字符串拼接（每次都会拼接，即使日志级别不输出）
    log.info("处理订单: " + orderId + ", 状态: " + status);

    // ✅ 好的：异常日志带堆栈（第三个参数传异常对象）
    log.error("处理失败: {}", e.getMessage(), e);

    // ❌ 不好：只记录消息，丢失堆栈
    log.error("处理失败: {}", e.getMessage());

    // ✅ 好的：判断日志级别（避免不必要的序列化开销）
    if (log.isDebugEnabled()) {
        log.debug("详细数据: {}", JsonUtils.toJsonString(data));
    }

    // ✅ 好的：敏感信息脱敏
    log.info("用户登录，手机: {}", DesensitizedUtil.mobilePhone(phone));

    // ❌ 不好：记录敏感信息
    log.info("用户登录，手机: {}", phone);
}
```

### Service 层日志示例

```java
@Slf4j
@RequiredArgsConstructor
@Service
public class SysUserServiceImpl implements ISysUserService {

    private final SysUserMapper baseMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long insertUser(SysUserBo bo) {
        log.info("开始新增用户，用户名: {}", bo.getUserName());

        // 1. 业务校验
        SysUser existUser = baseMapper.selectUserByUserName(bo.getUserName());
        if (ObjectUtil.isNotNull(existUser)) {
            throw new ServiceException("用户名 {} 已存在", bo.getUserName());
        }

        // 2. 执行插入
        SysUser user = MapstructUtils.convert(bo, SysUser.class);
        baseMapper.insert(user);

        log.info("新增用户成功，用户ID: {}, 用户名: {}", user.getUserId(), user.getUserName());
        return user.getUserId();
    }

    @Override
    public SysUserVo selectUserById(Long userId) {
        SysUser user = baseMapper.selectById(userId);
        if (ObjectUtil.isNull(user)) {
            throw new ServiceException("用户 {} 不存在", userId);
        }
        return MapstructUtils.convert(user, SysUserVo.class);
    }
}
```

---

## 5. 错误码设计

### 错误码规范

```java
// 格式: 模块(2位) + 类型(2位) + 序号(2位)
// 模块: 10-系统, 20-用户, 30-订单, 40-商品
// 类型: 01-参数错误, 02-业务错误, 03-权限错误, 04-系统错误

public class ErrorCode {
    // 通用错误
    public static final int SUCCESS = 200;
    public static final int ERROR = 500;
    public static final int UNAUTHORIZED = 401;
    public static final int FORBIDDEN = 403;

    // 用户模块 20xxxx
    public static final int USER_NOT_FOUND = 200201;      // 用户不存在
    public static final int USER_PASSWORD_ERROR = 200202; // 密码错误
    public static final int USER_DISABLED = 200203;       // 用户已禁用

    // 订单模块 30xxxx
    public static final int ORDER_NOT_FOUND = 300201;     // 订单不存在
    public static final int ORDER_STATUS_ERROR = 300202;  // 订单状态错误
}

// 使用示例
throw new ServiceException("用户不存在", ErrorCode.USER_NOT_FOUND);
```

### 错误消息国际化

```java
import org.dromara.common.core.utils.MessageUtils;

// 使用 MessageUtils.message() 获取国际化消息
throw new ServiceException(MessageUtils.message("user.not.exists"));

// 带参数的国际化消息
throw new ServiceException(MessageUtils.message("user.password.retry.limit.exceed", maxRetryCount));
```

---

## 6. 用户友好提示

### 错误提示规范

```java
// ✅ 好的：用户友好提示
throw new ServiceException("订单已发货，无法取消");
throw new ServiceException("库存不足，请减少购买数量");
throw new ServiceException("验证码已过期，请重新获取");
throw new ServiceException("该用户名已被注册，请换一个试试");

// ❌ 不好：技术术语
throw new ServiceException("order.status.invalid");
throw new ServiceException("NullPointerException at line 123");
throw new ServiceException("数据库连接失败");
throw new ServiceException("Duplicate entry for key 'uk_username'");
```

---

## 7. 事务异常处理

```java
@Transactional(rollbackFor = Exception.class)  // 所有异常都回滚
public void batchOperation() {
    // 业务逻辑
}

// ✅ 好的：指定回滚异常类型
@Transactional(rollbackFor = Exception.class)

// ❌ 不好：使用默认（只回滚 RuntimeException）
@Transactional
```

---

## 错误处理检查清单

- [ ] 业务异常使用 `new ServiceException()`（不是 `ServiceException.of()`）
- [ ] 条件检查使用 `if + ObjectUtil.isNull()` 判断
- [ ] 参数校验使用 `@Validated(XxxGroup.class)`
- [ ] 事务方法添加 `@Transactional(rollbackFor = Exception.class)`
- [ ] 日志记录异常堆栈：`log.error("msg: {}", e.getMessage(), e)`
- [ ] 日志使用占位符 `{}`，不使用字符串拼接
- [ ] 敏感信息脱敏后再记录日志
- [ ] 重要操作记录 INFO 日志
- [ ] 错误提示使用用户友好语言

---

## 快速对照表

| ❌ 错误写法 | ✅ 正确写法 |
|-----------|-----------|
| `throw ServiceException.of("msg")` | `throw new ServiceException("msg")` |
| `ServiceException.throwIf(cond, "msg")` | `if (cond) { throw new ServiceException("msg"); }` |
| `ServiceException.notNull(obj, "msg")` | `if (ObjectUtil.isNull(obj)) { throw new ServiceException("msg"); }` |
| `log.error("失败: " + e.getMessage())` | `log.error("失败: {}", e.getMessage(), e)` |
| `@Transactional` | `@Transactional(rollbackFor = Exception.class)` |
| `throw new ServiceException("DB error")` | `throw new ServiceException("数据保存失败，请重试")` |

---

## 相关技能

| 需要了解 | 激活 Skill |
|---------|-----------|
| Java 异常规范 | `java-exception` |
| Service 层规范 | `java-service` |
| Controller 层规范 | `java-controller` |
