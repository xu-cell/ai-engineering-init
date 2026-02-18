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

> **⚠️ 重要声明**: 本项目是 **RuoYi-Vue-Plus 纯后端项目**，采用三层架构！
> 本文档规范基于框架内置的高级注解功能。所有注解均依赖 Redis 或数据库拦截机制。

## 注解快速特征对比

| 注解 | 实现机制 | 作用范围 | 依赖 | 常用场景 |
|------|--------|--------|------|---------|
| `@RateLimiter` | AOP 切面 | Controller 方法 | Redis | 接口防刷、流量保护 |
| `@RepeatSubmit` | AOP 切面 | Controller 方法 | Redis + Token | 防重复提交、幂等性 |
| `@Sensitive` | Jackson 序列化器 | VO 字段 | 无 | 数据脱敏、隐私保护 |
| `@EncryptField` | MyBatis 拦截器 | Entity 字段 | 无 | 数据库加密、敏感字段 |
| `@ApiEncrypt` | 拦截器 | Controller 方法 | 无 | 接口加密、传输安全 |
| `@DataPermission` | AOP 拦截器 | Mapper 接口 | MyBatis | 数据隔离、行级权限 |

---

## 1. @RateLimiter - 接口限流

### 作用
基于 Redis 和令牌桶算法实现分布式限流，防止接口被恶意刷新或频繁访问。

### 限流类型

| 类型 | 说明 | 适用场景 |
|------|------|---------|
| `LimitType.DEFAULT` | 全局限流，所有请求共享配额 | 查询接口、通用接口 |
| `LimitType.IP` | IP限流，每个IP独立计算 | 登录、验证码、敏感操作 |
| `LimitType.CLUSTER` | 集群限流，每个节点独立 | 集群部署、分布式场景 |

### 使用示例

```java
import org.dromara.common.ratelimiter.annotation.RateLimiter;
import org.dromara.common.ratelimiter.enums.LimitType;

@RestController
@RequestMapping("/demo")
public class DemoController {

    // ✅ 基本用法：60秒内最多100次
    @RateLimiter(time = 60, count = 100)
    @GetMapping("/list")
    public R<List<XxxVo>> list() { }

    // ✅ IP限流：每个IP每分钟最多10次
    @RateLimiter(time = 60, count = 10, limitType = LimitType.IP)
    @PostMapping("/login")
    public R<String> login() { }

    // ✅ 集群限流：每个节点独立限流
    @RateLimiter(time = 60, count = 20, limitType = LimitType.CLUSTER)
    @GetMapping("/data")
    public R<DataVo> getData() { }

    // ✅ 动态key：基于用户ID限流
    @RateLimiter(key = "#userId", time = 60, count = 5)
    @PostMapping("/submit")
    public R<Void> submit(Long userId) { }

    // ✅ 自定义错误消息
    @RateLimiter(time = 60, count = 10, message = "访问过于频繁，请稍后再试")
    @GetMapping("/sensitive")
    public R<DataVo> getSensitiveData() { }
}
```

### 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | String | "" | 限流key，支持SpEL表达式 |
| `time` | int | 60 | 时间窗口（秒） |
| `count` | int | 100 | 最大请求次数 |
| `limitType` | LimitType | DEFAULT | 限流类型 |
| `message` | String | 国际化key | 错误提示消息 |
| `timeout` | int | 86400 | Redis超时（秒） |

### 推荐配置

| 场景 | time | count | limitType | 说明 |
|------|------|-------|-----------|------|
| 登录接口 | 60 | 5-10 | IP | 防止暴力破解 |
| 验证码 | 60 | 3 | IP | 防止验证码滥用 |
| 查询接口 | 60 | 100-1000 | DEFAULT | 一般查询 |
| 写入接口 | 60 | 10-50 | DEFAULT | 新增/修改/删除 |
| 敏感操作 | 60 | 1-5 | IP | 支付、提现等 |

---

## 2. @RepeatSubmit - 防重复提交

### 作用
基于 Redis 分布式锁防止短时间内重复提交表单或请求，保证接口幂等性。

### 使用示例

```java
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/order")
public class OrderController {

    // ✅ 默认：5秒内不能重复提交
    @RepeatSubmit()
    @PostMapping()
    public R<Long> addOrder(@RequestBody OrderBo bo) {
        return R.ok(orderService.add(bo));
    }

    // ✅ 自定义间隔：10秒
    @RepeatSubmit(interval = 10000)
    @PostMapping("/pay")
    public R<Void> pay(@RequestBody PayBo bo) { }

    // ✅ 使用秒作为单位
    @RepeatSubmit(interval = 10, timeUnit = TimeUnit.SECONDS)
    @PostMapping("/submit")
    public R<Void> submit(@RequestBody SubmitBo bo) { }

    // ✅ 自定义提示消息
    @RepeatSubmit(interval = 5000, message = "请勿重复提交订单")
    @PostMapping("/create")
    public R<Long> createOrder(@RequestBody OrderBo bo) { }
}
```

### 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `interval` | int | 5000 | 间隔时间（毫秒） |
| `timeUnit` | TimeUnit | MILLISECONDS | 时间单位 |
| `message` | String | 国际化key | 错误提示消息 |

### 工作原理

1. **提交前** - 生成请求唯一键：`MD5(token + ":" + 序列化参数)`
2. **Redis检查** - 尝试在 Redis 中设置该键，有效期为 `interval`
3. **重复检测** - 如果已存在该键，说明重复提交，直接返回错误
4. **成功处理** - 如果返回 `R.SUCCESS`，保持 Redis 数据不删除（防止短时间重复）
5. **异常处理** - 如果异常，删除 Redis 数据允许重新提交

### 常见场景

| 场景 | 推荐间隔 |
|------|---------|
| 普通表单 | 3-5秒 |
| 订单创建 | 10秒 |
| 支付操作 | 30秒 |
| 文件上传 | 10秒 |

---

## 3. @Sensitive - 数据脱敏

### 作用
在 JSON 序列化时自动对敏感字段进行脱敏处理，支持基于角色/权限的访问控制。

### 脱敏策略

| 策略 | 说明 | 效果示例 |
|------|------|---------|
| `ID_CARD` | 身份证 | 110397198608215431 → 110***5431 |
| `PHONE` | 手机号 | 17640125371 → 176****5371 |
| `EMAIL` | 邮箱 | test@example.com → t**@example.com |
| `BANK_CARD` | 银行卡 | 6222456952351452853 → 6222***2853 |
| `CHINESE_NAME` | 中文名 | 张三 → 张* |
| `ADDRESS` | 地址 | 北京市朝阳区某街道 → 北京市朝阳区**** |
| `FIXED_PHONE` | 固定电话 | 010-12345678 → 010****5678 |
| `PASSWORD` | 密码 | ****** |
| `IPV4` | IPv4地址 | 192.168.1.1 → 192.*.*.* |
| `IPV6` | IPv6地址 | 2001:0db8:... → 2001:*:*:*:*:*:*:* |
| `USER_ID` | 用户ID | 0 |
| `CAR_LICENSE` | 车牌号 | 京A12345 → 京A1***5 |
| `FIRST_MASK` | 只显示第一个字符 | abcdef → a***** |
| `STRING_MASK` | 通用字符串脱敏 | abcdefghij → abcd****ghij |
| `MASK_HIGH_SECURITY` | 高安全级别脱敏 | token → to******en |
| `CLEAR` | 清空为空字符串 | abc → "" |
| `CLEAR_TO_NULL` | 清空为null | abc → null |

### 使用示例

```java
import org.dromara.common.sensitive.annotation.Sensitive;
import org.dromara.common.sensitive.core.SensitiveStrategy;

public class UserVo {

    private Long id;
    private String name;

    // ✅ 手机号脱敏（所有人看脱敏数据）
    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;

    // ✅ 身份证脱敏，admin角色可查看原数据
    @Sensitive(strategy = SensitiveStrategy.ID_CARD, roleKey = {"admin"})
    private String idCard;

    // ✅ 邮箱脱敏，需要用户详情权限才能看原数据
    @Sensitive(strategy = SensitiveStrategy.EMAIL, perms = {"system:user:detail"})
    private String email;

    // ✅ 银行卡脱敏，admin角色或有权限都可查看
    @Sensitive(strategy = SensitiveStrategy.BANK_CARD,
               roleKey = {"admin"},
               perms = {"finance:account:query"})
    private String bankCard;
}
```

### 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `strategy` | SensitiveStrategy | 必填 | 脱敏策略 |
| `roleKey` | String[] | {} | 可查看原数据的角色 |
| `perms` | String[] | {} | 可查看原数据的权限 |

**权限控制逻辑**:
- `roleKey` 和 `perms` 都为空：所有人都看脱敏数据
- 满足任一 `roleKey` **或** 任一 `perms`：可查看原数据
- 两者是 **OR** 关系，不是 AND

---

## 4. @EncryptField - 字段加密

### 作用
在数据库级别对敏感字段进行加密存储，读取时自动解密。支持多种加密算法。

### 支持的算法

| 算法 | 说明 | 性能 | 安全性 | 适用场景 |
|------|------|------|--------|---------|
| `BASE64` | BASE64编码 | 高 | 低 | 简单数据保护 |
| `AES` | AES对称加密 | 中 | 中 | 生产环境推荐 |
| `RSA` | RSA非对称加密 | 低 | 高 | 高安全需求 |
| `SM2` | SM2非对称加密 | 低 | 高 | 国密要求 |
| `SM4` | SM4对称加密 | 中 | 高 | 国密要求 |

### 使用示例

```java
import org.dromara.common.encrypt.annotation.EncryptField;
import org.dromara.common.encrypt.enums.AlgorithmType;

@Data
@TableName("test_demo")
public class TestDemo extends BaseEntity {

    private Long id;

    // ✅ AES加密（使用yml配置的秘钥）
    @EncryptField(algorithm = AlgorithmType.AES)
    private String aesField;

    // ✅ RSA加密（指定公私钥）
    @EncryptField(algorithm = AlgorithmType.RSA,
                 privateKey = "MIICdQIBADANB...",
                 publicKey = "MFkwEwYHKoZI...")
    private String rsaField;

    // ✅ 使用默认配置
    @EncryptField
    private String defaultField;

    // ❌ 不加密字段 - 无需添加注解
    private String normalField;
}
```

### 配置文件（application.yml）

```yaml
mybatis-encryptor:
  # 是否开启加密
  enable: false
  # 默认加密算法：BASE64 | AES | RSA | SM2 | SM4
  algorithm: BASE64
  # 编码方式：BASE64 | HEX
  encode: BASE64
  # AES/SM4 对称算法秘钥（16字符）
  password: your-secret-key-16-chars
  # RSA/SM2 公私钥
  publicKey: MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJnNwrj4hi/...
  privateKey: MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6...
```

### 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `algorithm` | AlgorithmType | DEFAULT | 加密算法 |
| `password` | String | "" | 对称算法秘钥 |
| `publicKey` | String | "" | 非对称算法公钥 |
| `privateKey` | String | "" | 非对称算法私钥 |
| `encode` | EncodeType | DEFAULT | 编码方式 |

---

## 5. @ApiEncrypt - 接口加密

### 作用
对接口的请求和响应进行加密处理，确保数据在网络传输中的安全性。

### 使用示例

```java
import org.dromara.common.encrypt.annotation.ApiEncrypt;

@RestController
@RequestMapping("/api/user")
public class UserController {

    // ✅ 加密响应数据
    @ApiEncrypt(response = true)
    @GetMapping("/{id}")
    public R<UserVo> getUser(@PathVariable Long id) {
        // 返回的数据会被自动加密
        return R.ok(userService.getById(id));
    }

    // ✅ 不加密响应（默认）
    @GetMapping("/public")
    public R<List<PublicVo>> getPublicData() { }
}
```

### 配置文件（application.yml）

```yaml
api-decrypt:
  # 是否开启接口加密
  enabled: true
  # 加密头标识
  headerFlag: encrypt-key
  # 响应加密公钥（客户端使用私钥解密）
  publicKey: MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJnNwrj4hi/y3CCJu868ghCG5dUj8...
  # 请求解密私钥（服务端使用私钥解密客户端加密的数据）
  privateKey: MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEAqhHyZfSsYouqNxaY7...
```

### 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `response` | boolean | false | 是否加密响应 |

---

## 6. @DataPermission - 数据权限

### 作用
在 SQL 查询时自动拼接数据权限过滤条件，实现部门级或用户级数据隔离（行级权限）。

### 使用示例

```java
import org.dromara.common.mybatis.annotation.DataPermission;
import org.dromara.common.mybatis.annotation.DataColumn;

public interface OrderMapper extends BaseMapperPlus<Order, OrderVo> {

    // ✅ 类级别配置：按部门和创建人隔离数据
    @DataPermission({
        @DataColumn(key = "deptName", value = "dept_id"),
        @DataColumn(key = "userName", value = "create_by")
    })
    default Page<OrderVo> selectPageOrderList(Page<Order> page, Wrapper<Order> queryWrapper) {
        return this.selectVoPage(page, queryWrapper);
    }

    // ✅ 方法级别配置：覆盖类级别设置
    @DataPermission({
        @DataColumn(key = "deptName", value = "create_dept")
    })
    List<OrderVo> selectByDept(Long deptId);

    // ✅ 指定权限标识：拥有此权限的角色不拼接过滤条件
    @DataPermission({
        @DataColumn(key = "deptName", value = "dept_id", permission = "order:all")
    })
    List<OrderVo> selectAllOrders();

    // ✅ 使用表别名
    @DataPermission({
        @DataColumn(key = "deptName", value = "d.dept_id"),
        @DataColumn(key = "userName", value = "u.create_by")
    })
    List<OrderVo> selectWithJoin(@Param(Constants.WRAPPER) Wrapper<Order> queryWrapper);
}
```

### 注解参数

**@DataPermission**

| 参数 | 类型 | 说明 |
|------|------|------|
| `value` | DataColumn[] | **必填**，数据权限配置数组 |
| `joinStr` | String | SQL连接符（OR/AND），默认为空 |

**@DataColumn**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | String[] | "deptName" | 占位符关键字 |
| `value` | String[] | "dept_id" | 替换的字段名 |
| `permission` | String | "" | 权限标识（拥有此权限不过滤） |

### 数据权限范围

系统支持的权限范围：
1. **全部数据** - 无过滤条件
2. **本部门数据** - 仅查看本部门数据
3. **本部门及以下** - 本部门 + 所有子部门数据
4. **仅本人数据** - 只看自己创建的数据
5. **自定义权限** - 根据指定权限控制

---

## 最佳实践

### 1. 限流 + 防重复提交组合

```java
@RestController
@RequestMapping("/order")
public class OrderController {

    // ✅ 同时使用限流 + 防重复提交 + 日志
    @RateLimiter(time = 60, count = 10, limitType = LimitType.IP)
    @RepeatSubmit(interval = 10, timeUnit = TimeUnit.SECONDS)
    @Log(title = "订单", businessType = BusinessType.INSERT)
    @PostMapping()
    public R<Long> addOrder(@Validated @RequestBody OrderBo bo) {
        return R.ok(orderService.add(bo));
    }
}
```

### 2. VO层脱敏示例

```java
public class UserDetailVo {

    private Long id;

    // 脱敏：手机号
    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;

    // 脱敏：身份证（admin角色可查看）
    @Sensitive(strategy = SensitiveStrategy.ID_CARD, roleKey = {"admin"})
    private String idCard;

    // 脱敏：邮箱（需要权限才能查看原数据）
    @Sensitive(strategy = SensitiveStrategy.EMAIL, perms = {"system:user:detail"})
    private String email;

    // 脱敏：银行卡
    @Sensitive(strategy = SensitiveStrategy.BANK_CARD)
    private String bankCard;
}
```

### 3. Entity层字段加密

```java
@Data
@TableName("sys_user")
public class SysUser extends TenantEntity {

    private Long id;
    private String username;

    // ✅ 加密存储手机号
    @EncryptField(algorithm = AlgorithmType.AES)
    private String phone;

    // ✅ 加密存储身份证
    @EncryptField(algorithm = AlgorithmType.AES)
    private String idCard;
}
```

---

## 常见错误

### ❌ 不要做

```java
// 错误1：RateLimiter 用在 Service 方法上（无效）
@Service
public class XxxService {
    @RateLimiter(...)  // ❌ 无效！只能用在 Controller
    public void doSomething() { }
}

// 错误2：@DataPermission 未配置 @DataColumn
@DataPermission  // ❌ 空注解无效！必须至少有一个 @DataColumn
public interface UserMapper { }

// 错误3：@Sensitive 和 @EncryptField 混淆
// @Sensitive 是序列化脱敏（VO层）
// @EncryptField 是数据库加密（Entity层）
// 不应该在 Entity 中使用 @Sensitive
```

### ✅ 正确做法

```java
// 正确1：限流只能用在 Controller
@RestController
public class XxxController {
    @RateLimiter(...)  // ✅
    @GetMapping("/test")
    public R<Void> test() { }
}

// 正确2：@DataPermission 用在 Mapper 接口或方法上（支持类/方法两级）
@DataPermission({  // ✅ 类级别：所有方法默认使用此配置
    @DataColumn(key = "deptName", value = "dept_id")
})
public interface UserMapper {
    @DataPermission({  // ✅ 方法级别：覆盖类级别配置
        @DataColumn(key = "deptName", value = "dept_id"),
        @DataColumn(key = "userName", value = "create_by")
    })
    List<UserVo> selectList();
}

// 正确3：分层使用注解
@Entity
public class SysUser {
    @EncryptField(algorithm = AlgorithmType.AES)  // 存储时加密
    private String phone;
}

@VO
public class UserVo {
    @Sensitive(strategy = SensitiveStrategy.PHONE)  // 序列化时脱敏
    private String phone;
}
```

---

## 使用检查清单

使用后端注解前必须检查：

- [ ] **使用 @RateLimiter 吗**？是否选择了正确的 `limitType`？
- [ ] **使用 @RepeatSubmit 吗**？新增/修改/支付 必须添加！
- [ ] **使用 @Sensitive 吗**？VO 中的敏感字段应该脱敏
- [ ] **使用 @EncryptField 吗**？Entity 中的敏感字段应该加密
- [ ] **使用 @DataPermission 吗**？Mapper 需要数据隔离时必须添加！
- [ ] **所有配置都在 yml 中**？Redis 密钥、加密算法等
- [ ] **是否正确处理了异常**？脱敏/加密异常不应该导致请求失败
- [ ] **是否测试了权限控制**？不同角色应该看到不同数据
- [ ] **依赖是否齐全**？Redis、MyBatis-Plus 等必需库
- [ ] **导入路径是否正确**？使用 `org.dromara.*` 包名

---

## 快速参考

### 注解速查表

```
@RateLimiter         → 接口限流（Controller 方法）
@RepeatSubmit        → 防重复提交（POST/PUT 方法）
@Sensitive           → 数据脱敏（VO 字段）
@EncryptField        → 字段加密（Entity 字段）
@ApiEncrypt          → 接口加密（Controller 方法）
@DataPermission      → 数据权限（Mapper 接口）
```

### 组合使用速查

```
接口防护：     @RateLimiter + @RepeatSubmit
数据保护：     @EncryptField + @Sensitive + @ApiEncrypt
数据隔离：     @DataPermission（Mapper）
```

### 配置位置速查

```
application.yml:
  - mybatis-encryptor.*    → @EncryptField 全局配置
  - api-decrypt.*          → @ApiEncrypt 全局配置
  - spring.data.redis.*    → @RateLimiter/@RepeatSubmit 依赖（Redisson 客户端）
```

---

## 参考实现

查看框架中的完整实现：

- **限流示例**: `org.dromara.demo.controller.RedisRateLimiterController`（@RateLimiter 详细用法）
- **脱敏示例**: `org.dromara.demo.controller.TestSensitiveController`（@Sensitive 各策略）
- **防重示例**: 任何 POST/PUT 方法都有 @RepeatSubmit
- **加密示例**: `org.dromara.demo.domain.TestDemo`（@EncryptField 使用）
- **数据权限**: `org.dromara.system.mapper.SysUserMapper`（@DataPermission 使用）
- **对象映射**: 系统 BO/VO 类中的 `@AutoMapper` 注解（见 crud-development 技能）

**特别注意**：上述参考代码是本项目的标准实现，严格遵循三层架构和后端规范。

---

## 关键配置

```yaml
# Redis 配置（必须，限流和防重复依赖）
# ⚠️ Spring Boot 3 使用 spring.data.redis（非 spring.redis）
# 本项目使用 Redisson 客户端（非 Jedis/Lettuce），连接池由 Redisson 管理
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password:
      timeout: 10s

# 字段加密配置
mybatis-encryptor:
  enable: false
  algorithm: BASE64
  encode: BASE64
  password: your-secret-key
  publicKey: your-public-key
  privateKey: your-private-key

# 接口加密配置
api-decrypt:
  enabled: true
  headerFlag: encrypt-key
  publicKey: your-public-key
  privateKey: your-private-key
```
