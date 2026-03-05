---
name: security-guard
description: |
  后端安全开发规范。包含 Sa-Token 认证授权、数据脱敏、数据加密、接口安全、漏洞防护。

  触发场景：
  - Sa-Token 权限控制配置
  - 登录认证、Token 管理
  - 数据脱敏处理（@Sensitive）
  - 数据加密处理（@EncryptField、@ApiEncrypt）
  - 接口限流（@RateLimiter）
  - 防重复提交（@RepeatSubmit）
  - XSS/SQL注入防护

  触发词：安全、Sa-Token、@SaCheckPermission、@SaCheckLogin、@SaCheckRole、登录认证、Token、数据脱敏、@Sensitive、加密解密、@EncryptField、@ApiEncrypt、限流、@RateLimiter、防重复、@RepeatSubmit、XSS、SQL注入、漏洞防护、敏感数据、LoginHelper

  注意：
  - 如需行级数据权限（@DataPermission、部门隔离），请使用 data-permission。
  - 如果是设计异常处理机制（try-catch、错误码），请使用 error-handler。
---

# 后端安全开发指南

> 本项目是纯后端项目，本文档专注于 Java 后端安全规范。

## 1. Sa-Token 认证授权

### 1.1 权限注解

```java
import cn.dev33.satoken.annotation.*;

@SaCheckLogin                          // 登录校验
@SaCheckPermission("system:user:add")  // 权限校验
@SaCheckRole("admin")                  // 角色校验
@SaCheckSafe                           // 二级认证（敏感操作）

// 多权限（满足其一 / 全部满足）
@SaCheckPermission(value = {"system:user:add", "system:user:update"}, mode = SaMode.OR)
@SaCheckPermission(value = {"system:user:add", "system:user:update"}, mode = SaMode.AND)

// 多角色（满足其一）
@SaCheckRole(value = {"admin", "editor"}, mode = SaMode.OR)
```

### 1.2 LoginHelper 工具类

> 位置：`ruoyi-common-satoken/.../utils/LoginHelper.java`

```java
import org.dromara.common.satoken.utils.LoginHelper;

// 用户信息
LoginUser user = LoginHelper.getLoginUser();
Long userId   = LoginHelper.getUserId();
String name   = LoginHelper.getUsername();
String tenant  = LoginHelper.getTenantId();
Long deptId   = LoginHelper.getDeptId();

// 管理员判断
LoginHelper.isSuperAdmin();           // userId = 1
LoginHelper.isTenantAdmin();          // 租户管理员
LoginHelper.isLogin();                // 是否已登录

// 用户类型 & 登录
UserType type = LoginHelper.getUserType();
LoginHelper.login(loginUser, loginParameter);
```

### 1.3 角色与权限常量

| 常量 | 值 | 说明 |
|------|-----|------|
| 超级管理员角色 | `superadmin` | 拥有所有权限 |
| 租户管理员角色 | `admin` | 租户内所有权限 |
| 通配符权限 | `*:*:*` | 所有权限标识 |
| 超级管理员ID | `1L` | 系统超管用户ID |

---

## 2. 数据脱敏（@Sensitive）

> 位置：`ruoyi-common-sensitive/.../`
> 完整 17 种策略详见 `references/sensitive-strategies.md`

### 基本用法

```java
import org.dromara.common.sensitive.annotation.Sensitive;
import org.dromara.common.sensitive.core.SensitiveStrategy;

public class UserVo {
    @Sensitive(strategy = SensitiveStrategy.PHONE)          // 138****8888
    private String phone;

    @Sensitive(strategy = SensitiveStrategy.ID_CARD)        // 110***********1234
    private String idCard;

    @Sensitive(strategy = SensitiveStrategy.EMAIL)          // t**@example.com
    private String email;

    @Sensitive(strategy = SensitiveStrategy.BANK_CARD)      // 6222***********1234
    private String bankCard;

    @Sensitive(strategy = SensitiveStrategy.CHINESE_NAME)   // 张*
    private String realName;

    @Sensitive(strategy = SensitiveStrategy.PASSWORD)       // ******
    private String password;
}
```

### 基于角色/权限的脱敏控制

```java
// admin 角色可查看原数据，其他用户看脱敏数据
@Sensitive(strategy = SensitiveStrategy.ID_CARD, roleKey = {"admin"})
private String idCard;

// 需要权限才能看原数据
@Sensitive(strategy = SensitiveStrategy.PHONE, perms = {"system:user:detail"})
private String phone;

// roleKey 和 perms 是 OR 关系
@Sensitive(strategy = SensitiveStrategy.BANK_CARD,
           roleKey = {"admin"}, perms = {"finance:account:query"})
private String bankCard;
```

### 日志脱敏

```java
// NG: log.info("手机号: {}", phone);
// OK:
log.info("手机号: {}", DesensitizedUtil.mobilePhone(phone));
```

---

## 3. 数据加密（@EncryptField / @ApiEncrypt）

> 位置：`ruoyi-common-encrypt/.../`
> 完整加密配置和工具类详见 `references/encrypt-config.md`

### 支持算法

| 算法 | 类型 | 密钥要求 |
|------|------|---------|
| BASE64 | 编码 | 无 |
| AES | 对称加密 | 16/24/32 位 |
| RSA | 非对称加密 | 公钥/私钥 |
| SM2 | 国密非对称 | 公钥/私钥 |
| SM4 | 国密对称 | 16 位 |

### 字段级加密

```java
import org.dromara.common.encrypt.annotation.EncryptField;
import org.dromara.common.encrypt.enumd.AlgorithmType;

public class User {
    @EncryptField                                           // 默认（全局配置）
    private String password;

    @EncryptField(algorithm = AlgorithmType.AES)            // AES
    private String idCard;

    @EncryptField(algorithm = AlgorithmType.SM4)            // SM4 国密
    private String phone;
}
```

### API 级加密

```java
import org.dromara.common.encrypt.annotation.ApiEncrypt;

@ApiEncrypt                   // 请求体自动解密
@PostMapping("/addUser")
public R<Long> addUser(@RequestBody UserBo bo) { }

@ApiEncrypt(response = true)  // 请求解密 + 响应加密
@PostMapping("/updateUser")
public R<Void> updateUser(@RequestBody UserBo bo) { }
```

---

## 4. 接口限流（@RateLimiter）

> 位置：`ruoyi-common-ratelimiter/.../`

```java
import org.dromara.common.ratelimiter.annotation.RateLimiter;
import org.dromara.common.ratelimiter.enums.LimitType;

// 全局限流：60秒内最多100次
@RateLimiter(time = 60, count = 100)

// IP 限流：每个 IP 每分钟最多10次
@RateLimiter(time = 60, count = 10, limitType = LimitType.IP)

// 动态 key（SpEL）
@RateLimiter(key = "#userId", time = 60, count = 5)

// 自定义错误消息
@RateLimiter(time = 60, count = 10, message = "访问过于频繁，请稍后再试")

// 集群限流
@RateLimiter(time = 60, count = 1000, limitType = LimitType.CLUSTER)
```

### 推荐配置

| 场景 | time | count | limitType |
|------|------|-------|-----------|
| 登录接口 | 60 | 5-10 | IP |
| 验证码 | 60 | 3 | IP |
| 查询接口 | 60 | 100-1000 | DEFAULT |
| 写入接口 | 60 | 10-50 | DEFAULT |
| 敏感操作 | 60 | 1-5 | IP |

---

## 5. 防重复提交（@RepeatSubmit）

> 位置：`ruoyi-common-idempotent/.../`

```java
import org.dromara.common.idempotent.annotation.RepeatSubmit;

@RepeatSubmit()                                              // 默认 5 秒
@RepeatSubmit(interval = 10, timeUnit = TimeUnit.SECONDS)    // 10 秒
@RepeatSubmit(interval = 5000, message = "请勿重复提交订单")   // 自定义消息
```

| 场景 | 推荐间隔 |
|------|---------|
| 普通表单 | 3-5 秒 |
| 订单创建 | 10 秒 |
| 支付操作 | 30 秒 |
| 文件上传 | 10 秒 |

---

## 6. 数据权限（@DataPermission）

> **完整指南请使用 `data-permission` 技能**

```java
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept"),
    @DataColumn(key = "userName", value = "create_by")
})
public TableDataInfo<OrderVo> pageWithPermission(OrderBo bo, PageQuery pageQuery) { }
```

权限类型：全部数据 | 本部门 | 本部门及以下 | 仅本人 | 自定义

---

## 7. 输入校验

```java
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;

public class UserBo {
    @NotNull(message = "ID不能为空", groups = { EditGroup.class })
    private Long id;

    @NotBlank(message = "用户名不能为空", groups = { AddGroup.class, EditGroup.class })
    @Size(min = 2, max = 20)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "只能包含字母数字下划线")
    private String username;
}

// Controller 分组校验
@PostMapping  public R<Long> add(@Validated(AddGroup.class) @RequestBody UserBo bo) { }
@PutMapping   public R<Void> update(@Validated(EditGroup.class) @RequestBody UserBo bo) { }
```

---

## 8. 常见漏洞防护

### SQL 注入

```java
// NG: "SELECT * FROM user WHERE name = '" + name + "'"
// NG: @Select("SELECT * FROM user WHERE name = '${name}'")
// OK: MyBatis-Plus LambdaQueryWrapper
// OK: @Select("SELECT * FROM user WHERE name = #{name}")
```

### 越权访问

```java
@Override
public OrderVo selectById(Long id) {
    Order order = baseMapper.selectById(id);
    if (ObjectUtil.isNull(order)) {
        throw new ServiceException("订单不存在");
    }
    if (!LoginHelper.isSuperAdmin() && !order.getUserId().equals(LoginHelper.getUserId())) {
        throw new ServiceException("无权访问此订单");
    }
    return MapstructUtils.convert(order, OrderVo.class);
}

// 批量操作同样校验归属
```

### 敏感信息泄露

```java
// NG: return userDao.getById(id);              // 包含密码等
// OK: return MapstructUtils.convert(user, UserVo.class);  // VO 过滤敏感字段
// OK: 使用 @Sensitive 自动脱敏
```

---

## 9. 安全检查清单

### 代码审查

- [ ] 用户输入经过 `@NotBlank`/`@Size`/`@Pattern` 校验
- [ ] SQL 使用 MyBatis-Plus 或参数化查询（#{}）
- [ ] 敏感字段使用 `@Sensitive` 脱敏
- [ ] 需加密字段使用 `@EncryptField`
- [ ] Controller 添加 `@SaCheckPermission`
- [ ] 敏感操作添加 `@RepeatSubmit`
- [ ] 高频接口添加 `@RateLimiter`
- [ ] 批量操作校验数据归属（防越权）
- [ ] 文件上传校验类型/大小/扩展名
- [ ] 日志中无敏感信息（或已脱敏）

### 配置 & 部署

- [ ] 生产关闭调试模式
- [ ] 敏感配置已加密或使用环境变量
- [ ] Token 有效期合理（2-24h）
- [ ] CORS 不使用 `*`
- [ ] 启用 HTTPS、安全响应头
- [ ] 错误页不泄露堆栈、数据库/Redis 端口不对外

---

## 注意事项

- leniu-tengyun-core 项目请使用 `leniu-security-guard` skill
- leniu 使用自研 secure 模块，注解和工具类与 RuoYi-Vue-Plus 不同
