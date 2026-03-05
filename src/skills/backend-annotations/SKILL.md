---
name: backend-annotations
description: |
  后端高级注解使用指南。包含 @RateLimiter、@RepeatSubmit、@Sensitive、@EncryptField、@ApiEncrypt、@DataPermission 等注解的用法。

  触发场景：
  - 配置接口限流（@RateLimiter）
  - 配置防重复提交（@RepeatSubmit）
  - 配置数据脱敏（@Sensitive）
  - 配置字段加密（@EncryptField）
  - 配置接口加密（@ApiEncrypt）
  - 配置数据权限注解（@DataPermission）

  触发词：注解、@RateLimiter、@RepeatSubmit、@Sensitive、@EncryptField、@ApiEncrypt、@DataPermission、@DataColumn、限流、防重复、脱敏、加密、数据权限注解
---

# 后端高级注解指南

> RuoYi-Vue-Plus 三层架构，包名 `org.dromara.*`

## 注解总览

| 注解 | 机制 | 作用层 | 依赖 |
|------|------|--------|------|
| `@RateLimiter` | AOP | Controller 方法 | Redis |
| `@RepeatSubmit` | AOP | Controller 方法 | Redis + Token |
| `@Sensitive` | Jackson 序列化器 | VO 字段 | 无 |
| `@EncryptField` | MyBatis 拦截器 | Entity 字段 | 无 |
| `@ApiEncrypt` | 拦截器 | Controller 方法 | 无 |
| `@DataPermission` | AOP | Mapper 接口 | MyBatis |

---

## 1. @RateLimiter - 接口限流

**导入**：`org.dromara.common.ratelimiter.annotation.RateLimiter`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | String | "" | 限流key，支持SpEL |
| `time` | int | 60 | 时间窗口（秒） |
| `count` | int | 100 | 最大请求次数 |
| `limitType` | LimitType | DEFAULT | DEFAULT/IP/CLUSTER |
| `message` | String | 国际化key | 错误提示 |

```java
// 全局限流：60秒100次
@RateLimiter(time = 60, count = 100)
@GetMapping("/list")
public R<List<XxxVo>> list() { }

// IP限流：每个IP每分钟10次（登录、验证码）
@RateLimiter(time = 60, count = 10, limitType = LimitType.IP)
@PostMapping("/login")
public R<String> login() { }

// 动态key：基于用户ID限流
@RateLimiter(key = "#userId", time = 60, count = 5)
@PostMapping("/submit")
public R<Void> submit(Long userId) { }
```

---

## 2. @RepeatSubmit - 防重复提交

**导入**：`org.dromara.common.idempotent.annotation.RepeatSubmit`

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `interval` | int | 5000 | 间隔时间（毫秒） |
| `timeUnit` | TimeUnit | MILLISECONDS | 时间单位 |
| `message` | String | 国际化key | 错误提示 |

```java
// 默认5秒
@RepeatSubmit()
@PostMapping()
public R<Long> add(@RequestBody OrderBo bo) { }

// 10秒间隔 + 自定义提示
@RepeatSubmit(interval = 10, timeUnit = TimeUnit.SECONDS, message = "请勿重复提交")
@PostMapping("/pay")
public R<Void> pay(@RequestBody PayBo bo) { }
```

**原理**：`MD5(token + ":" + 序列化参数)` -> Redis 设置/检查 -> 成功保留key防重复 -> 异常删除key允许重试。

---

## 3. @Sensitive - 数据脱敏

**导入**：`org.dromara.common.sensitive.annotation.Sensitive`

### 脱敏策略

| 策略 | 效果 | 策略 | 效果 |
|------|------|------|------|
| `ID_CARD` | 110\*\*\*5431 | `PHONE` | 176\*\*\*\*5371 |
| `EMAIL` | t\*\*@example.com | `BANK_CARD` | 6222\*\*\*2853 |
| `CHINESE_NAME` | 张\* | `ADDRESS` | 北京市朝阳区\*\*\*\* |
| `PASSWORD` | \*\*\*\*\*\* | `IPV4` | 192.\*.\*.\* |
| `FIRST_MASK` | a\*\*\*\*\* | `CLEAR` | "" |

```java
public class UserVo {
    // 所有人看脱敏数据
    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;

    // admin 角色可查看原数据
    @Sensitive(strategy = SensitiveStrategy.ID_CARD, roleKey = {"admin"})
    private String idCard;

    // 需要权限才能看原数据
    @Sensitive(strategy = SensitiveStrategy.EMAIL, perms = {"system:user:detail"})
    private String email;
}
```

**权限逻辑**：roleKey 和 perms 都为空 = 全部脱敏；满足任一 roleKey **或** 任一 perms = 可查看原数据（OR 关系）。

---

## 4. @EncryptField - 字段加密

**导入**：`org.dromara.common.encrypt.annotation.EncryptField`

| 算法 | 说明 | 算法 | 说明 |
|------|------|------|------|
| `BASE64` | 编码（低安全） | `AES` | 对称加密（推荐） |
| `RSA` | 非对称（高安全） | `SM2` | 国密非对称 |
| `SM4` | 国密对称 | | |

```java
@Data
@TableName("test_demo")
public class TestDemo extends BaseEntity {
    // AES 加密（使用 yml 全局秘钥）
    @EncryptField(algorithm = AlgorithmType.AES)
    private String phone;

    // RSA 加密（指定公私钥）
    @EncryptField(algorithm = AlgorithmType.RSA,
                 privateKey = "MIICdQ...", publicKey = "MFkwEw...")
    private String idCard;

    // 使用 yml 默认配置
    @EncryptField
    private String secretField;
}
```

**配置**：

```yaml
mybatis-encryptor:
  enable: false
  algorithm: BASE64          # 默认算法
  encode: BASE64             # 编码方式：BASE64 | HEX
  password: your-secret-16   # AES/SM4 秘钥（16字符）
  publicKey: MFwwDQ...       # RSA/SM2 公钥
  privateKey: MIIBVAIBADANBg... # RSA/SM2 私钥
```

---

## 5. @ApiEncrypt - 接口加密

**导入**：`org.dromara.common.encrypt.annotation.ApiEncrypt`

```java
// 加密响应数据
@ApiEncrypt(response = true)
@GetMapping("/{id}")
public R<UserVo> getUser(@PathVariable Long id) { }
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `response` | boolean | false | 是否加密响应 |

**配置**：

```yaml
api-decrypt:
  enabled: true
  headerFlag: encrypt-key
  publicKey: MFwwDQ...       # 响应加密公钥
  privateKey: MIIBVAIBADANBg... # 请求解密私钥
```

---

## 6. @DataPermission - 数据权限

**导入**：`org.dromara.common.mybatis.annotation.DataPermission`、`@DataColumn`

```java
public interface OrderMapper extends BaseMapperPlus<Order, OrderVo> {

    // 按部门+创建人隔离
    @DataPermission({
        @DataColumn(key = "deptName", value = "dept_id"),
        @DataColumn(key = "userName", value = "create_by")
    })
    default Page<OrderVo> selectPageOrderList(Page<Order> page, Wrapper<Order> wrapper) {
        return this.selectVoPage(page, wrapper);
    }

    // 使用表别名
    @DataPermission({
        @DataColumn(key = "deptName", value = "d.dept_id"),
        @DataColumn(key = "userName", value = "u.create_by")
    })
    List<OrderVo> selectWithJoin(@Param(Constants.WRAPPER) Wrapper<Order> wrapper);
}
```

**@DataColumn 参数**：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `key` | "deptName" | 占位符关键字 |
| `value` | "dept_id" | 替换的字段名 |
| `permission` | "" | 拥有此权限则不过滤 |

**权限范围**：全部数据 / 本部门 / 本部门及以下 / 仅本人 / 自定义。

---

## 七、组合使用

```java
// 接口防护：限流 + 防重复 + 日志
@RateLimiter(time = 60, count = 10, limitType = LimitType.IP)
@RepeatSubmit(interval = 10, timeUnit = TimeUnit.SECONDS)
@Log(title = "订单", businessType = BusinessType.INSERT)
@PostMapping()
public R<Long> addOrder(@Validated @RequestBody OrderBo bo) { }
```

```java
// 数据保护分层：Entity 加密存储 + VO 脱敏展示
@TableName("sys_user")
public class SysUser extends TenantEntity {
    @EncryptField(algorithm = AlgorithmType.AES)
    private String phone;          // 存储时加密
}

public class UserVo {
    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;          // 序列化时脱敏
}
```

---

## 八、常见错误

```java
// ❌ @RateLimiter 用在 Service 方法上（无效，只能 Controller）
@Service
public class XxxService {
    @RateLimiter(...)  // 无效！
    public void doSomething() { }
}

// ❌ @DataPermission 未配置 @DataColumn
@DataPermission  // 空注解无效！
public interface UserMapper { }

// ❌ @Sensitive 用在 Entity 上（应在 VO 上）
// ❌ @EncryptField 用在 VO 上（应在 Entity 上）

// ✅ @DataPermission 支持类级别 + 方法级别（方法覆盖类）
@DataPermission({ @DataColumn(key = "deptName", value = "dept_id") })
public interface UserMapper {
    @DataPermission({ /* 方法级覆盖 */ })
    List<UserVo> selectList();
}
```

---

## 九、参考实现

| 类型 | 位置 |
|------|------|
| 限流示例 | `org.dromara.demo.controller.RedisRateLimiterController` |
| 脱敏示例 | `org.dromara.demo.controller.TestSensitiveController` |
| 加密示例 | `org.dromara.demo.domain.TestDemo` |
| 数据权限 | `org.dromara.system.mapper.SysUserMapper` |

**配置位置**：

```
application.yml:
  mybatis-encryptor.*  → @EncryptField 全局配置
  api-decrypt.*        → @ApiEncrypt 全局配置
  spring.data.redis.*  → @RateLimiter/@RepeatSubmit 依赖
```
