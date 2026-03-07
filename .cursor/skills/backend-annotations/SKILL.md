---
name: backend-annotations
description: |
  通用后端高级注解指南。包含限流、防重复提交、数据脱敏、字段加密、接口加密等横切关注点的 AOP 实现模式。
  触发场景：
  - 配置接口限流
  - 配置防重复提交
  - 配置数据脱敏
  - 配置字段加密 / 接口加密
  触发词：注解、限流、防重复提交、脱敏、加密、RateLimiter、Idempotent、Sensitive、Encrypt、AOP
  注意：如果项目有专属技能（如 `leniu-backend-annotations`），优先使用专属版本。
---

# 后端高级注解开发指南

> 通用模板。如果项目有专属技能（如 `leniu-backend-annotations`），优先使用。

## 设计原则

1. **横切关注点用 AOP**：限流、防重复、脱敏、加密属于非功能性需求，应通过注解 + AOP/拦截器实现，不侵入业务代码。
2. **分层职责清晰**：限流/防重复作用于 Controller 层；脱敏作用于 VO 序列化层；加密作用于持久化层。
3. **声明式优于编程式**：用注解声明意图，框架自动执行，减少样板代码。
4. **配置外置**：密钥、阈值等参数放在配置文件或配置中心，不硬编码。

---

## 实现模式

### 1. 接口限流

**概念**：通过 AOP 拦截请求，基于 Redis/内存计数器控制单位时间内的请求次数。

```java
// 自定义注解
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimiter {
    String key() default "";          // 限流key，支持 SpEL
    int time() default 60;            // 时间窗口（秒）
    int count() default 100;          // 最大请求次数
    LimitType limitType() default LimitType.DEFAULT; // DEFAULT / IP / CLUSTER
    String message() default "请求过于频繁";
}

// AOP 切面
@Aspect
@Component
public class RateLimiterAspect {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Around("@annotation([你的包名].annotation.RateLimiter)")
    public Object around(ProceedingJoinPoint point) throws Throwable {
        RateLimiter limiter = /* 获取注解 */;
        String key = buildKey(limiter, point);
        // 使用 Redis Lua 脚本做原子计数
        Long count = redisTemplate.execute(rateLimiterScript, List.of(key),
            String.valueOf(limiter.count()), String.valueOf(limiter.time()));
        if (count != null && count > limiter.count()) {
            throw new [你的异常类](limiter.message());
        }
        return point.proceed();
    }
}
```

**推荐阈值参考**：

| 场景 | 时间窗口 | 次数 | 限流类型 |
|------|---------|------|---------|
| 登录接口 | 60s | 5-10 | IP |
| 验证码 | 60s | 3 | IP |
| 查询接口 | 60s | 100-1000 | DEFAULT |
| 写入接口 | 60s | 10-50 | DEFAULT |
| 敏感操作 | 60s | 1-5 | IP |

---

### 2. 防重复提交

**概念**：在指定时间窗口内，相同用户的相同请求（基于 Token + 参数哈希）只允许提交一次。

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RepeatSubmit {
    int interval() default 5000;       // 间隔时间（毫秒）
    TimeUnit timeUnit() default TimeUnit.MILLISECONDS;
    String message() default "请勿重复提交";
}

// AOP 切面核心逻辑
// 1. 从请求中提取 Token + 请求参数
// 2. 计算 MD5(token + ":" + serialize(params))
// 3. Redis SETNX，设置过期时间 = interval
// 4. 设置成功 -> 允许请求；设置失败 -> 拒绝
// 5. 请求异常时删除 key，允许重试
```

| 场景 | 推荐间隔 |
|------|---------|
| 普通表单 | 3-5 秒 |
| 订单创建 | 10 秒 |
| 支付操作 | 30 秒 |
| 文件上传 | 10 秒 |

---

### 3. 数据脱敏

**概念**：在 JSON 序列化阶段，对 VO 中的敏感字段进行掩码处理。通过自定义 Jackson 序列化器实现。

```java
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@JacksonAnnotationsInside
@JsonSerialize(using = SensitiveSerializer.class)
public @interface Sensitive {
    SensitiveStrategy strategy();
    String[] roleKey() default {};    // 拥有这些角色可查看原文
    String[] perms() default {};       // 拥有这些权限可查看原文
}

public enum SensitiveStrategy {
    ID_CARD(s -> s.substring(0, 3) + "***" + s.substring(s.length() - 4)),
    PHONE(s -> s.substring(0, 3) + "****" + s.substring(s.length() - 4)),
    EMAIL(s -> s.charAt(0) + "**@" + s.substring(s.indexOf('@') + 1)),
    CHINESE_NAME(s -> s.charAt(0) + "*".repeat(s.length() - 1)),
    BANK_CARD(s -> s.substring(0, 4) + "****" + s.substring(s.length() - 4)),
    PASSWORD(s -> "******");

    private final Function<String, String> desensitizer;
    // constructor, getter...
}

// 使用
public class UserVo {
    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;

    @Sensitive(strategy = SensitiveStrategy.ID_CARD, roleKey = {"admin"})
    private String idCard;
}
```

**权限逻辑**：roleKey 和 perms 都为空 = 全部脱敏；满足任一条件 = 可查看原文（OR 关系）。

---

### 4. 字段加密（持久层）

**概念**：通过 MyBatis 拦截器/TypeHandler，在数据写入数据库时自动加密，读取时自动解密。对业务代码透明。

```java
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface EncryptField {
    AlgorithmType algorithm() default AlgorithmType.DEFAULT; // 使用全局配置
    String password() default "";    // AES/SM4 密钥
    String publicKey() default "";   // RSA/SM2 公钥
    String privateKey() default "";  // RSA/SM2 私钥
}

public enum AlgorithmType {
    DEFAULT, BASE64, AES, RSA, SM2, SM4
}
```

**配置示例**：

```yaml
# [你的加密配置前缀]:
encrypt:
  enable: true
  algorithm: AES
  password: your-secret-key-16ch   # AES/SM4 密钥（16字符）
  public-key: MFkwEw...            # RSA/SM2 公钥
  private-key: MIIBVAIBADANBg...   # RSA/SM2 私钥
```

---

### 5. 接口加密（传输层）

**概念**：通过 Filter/Interceptor，对 HTTP 请求体自动解密、响应体自动加密。适用于前后端通信加密。

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiEncrypt {
    boolean response() default false; // 是否加密响应
}

// 在 RequestBodyAdvice / ResponseBodyAdvice 中拦截处理
// 或通过 Filter + HttpServletRequestWrapper 实现
```

---

## 选型建议

| 关注点 | 实现方式 | 作用层 | 依赖 |
|--------|---------|--------|------|
| 限流 | AOP + Redis Lua 脚本 | Controller | Redis |
| 防重复 | AOP + Redis SETNX | Controller | Redis + Token |
| 脱敏 | Jackson 自定义序列化器 | VO 字段 | 无 |
| 字段加密 | MyBatis 拦截器 / TypeHandler | Entity 字段 | 加密库 |
| 接口加密 | Filter / RequestBodyAdvice | Controller 方法 | 加密库 |

| 加密算法 | 类型 | 密钥要求 | 适用场景 |
|---------|------|---------|---------|
| BASE64 | 编码（非加密） | 无 | 简单混淆 |
| AES | 对称加密 | 16/24/32 字节 | 通用加密（推荐） |
| RSA | 非对称加密 | 公钥/私钥对 | 高安全场景 |
| SM4 | 国密对称 | 16 字节 | 国密合规 |
| SM2 | 国密非对称 | 公钥/私钥对 | 国密合规 |

---

## 常见错误

```java
// 1. 限流/防重复注解放在 Service 方法上（无效，应在 Controller）
@Service
public class XxxService {
    @RateLimiter(...)  // 无效！AOP 通常只拦截 Controller
    public void doSomething() { }
}

// 2. @Sensitive 用在 Entity 上（应在 VO 上，序列化时生效）
// 3. @EncryptField 用在 VO 上（应在 Entity 上，持久化时生效）

// 4. 加密密钥硬编码在注解中
@EncryptField(password = "my-secret-key")  // 不安全
// 应使用全局配置或环境变量

// 5. 限流 key 设计不合理
@RateLimiter(key = "")  // 所有用户共享限流
// 应根据场景选择：用户维度 key="#userId"，IP 维度 limitType=IP

// 6. 组合注解顺序不当
// 推荐顺序：限流 -> 防重复 -> 权限 -> 日志
@RateLimiter(time = 60, count = 10)
@RepeatSubmit(interval = 5000)
@PostMapping()
public Result<?> add(@RequestBody XxxDTO dto) { }
```
