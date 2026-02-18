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

### 1.1 后端权限注解

```java
import cn.dev33.satoken.annotation.*;
import cn.dev33.satoken.stp.StpUtil;

// 登录校验
@SaCheckLogin
@GetMapping("/userInfo")
public R<UserVo> getUserInfo() { }

// 权限校验
@SaCheckPermission("system:user:add")
@PostMapping("/addUser")
public R<Long> addUser(@RequestBody UserBo bo) { }

// 角色校验
@SaCheckRole("admin")
@DeleteMapping("/deleteUser/{id}")
public R<Void> deleteUser(@PathVariable Long id) { }

// 多权限校验（满足其一）
@SaCheckPermission(value = {"system:user:add", "system:user:update"}, mode = SaMode.OR)

// 多权限校验（全部满足）
@SaCheckPermission(value = {"system:user:add", "system:user:update"}, mode = SaMode.AND)

// 多角色校验（满足其一）
@SaCheckRole(value = {"admin", "editor"}, mode = SaMode.OR)

// 二级认证（敏感操作需要再次验证）
@SaCheckSafe
```

### 1.2 LoginHelper 工具类（核心）

> **位置**：`ruoyi-common-satoken/src/main/java/org/dromara/common/satoken/utils/LoginHelper.java`

```java
import org.dromara.common.satoken.utils.LoginHelper;

// ==================== 用户信息获取 ====================

// 获取当前登录用户完整信息
LoginUser user = LoginHelper.getLoginUser();

// 获取用户ID
Long userId = LoginHelper.getUserId();
String userIdStr = LoginHelper.getUserIdStr();

// 获取用户名
String userName = LoginHelper.getUsername();

// 获取租户ID（多租户场景）
String tenantId = LoginHelper.getTenantId();

// 获取部门信息
Long deptId = LoginHelper.getDeptId();
String deptName = LoginHelper.getDeptName();
String deptCategory = LoginHelper.getDeptCategory();

// 根据 Token 获取用户信息
LoginUser user = LoginHelper.getLoginUser(token);

// ==================== 管理员判断 ====================

// 判断是否为超级管理员（userId = 1）
boolean isSuperAdmin = LoginHelper.isSuperAdmin();
boolean isSuperAdmin = LoginHelper.isSuperAdmin(userId);

// 判断是否为租户管理员
boolean isTenantAdmin = LoginHelper.isTenantAdmin();
boolean isTenantAdmin = LoginHelper.isTenantAdmin(rolePermissions);

// 检查是否已登录
boolean isLogin = LoginHelper.isLogin();

// ==================== 用户类型 ====================

// 获取用户类型（PC端用户、APP用户等）
UserType userType = LoginHelper.getUserType();

// ==================== 用户登录 ====================

// 用户登录（支持多设备类型）
LoginHelper.login(loginUser, loginParameter);
```

### 1.3 角色与权限常量

| 常量 | 值 | 说明 |
|------|-----|------|
| 超级管理员角色 | `superadmin` | 拥有所有权限 |
| 租户管理员角色 | `admin` | 租户内所有权限 |
| 通配符权限 | `*:*:*` | 拥有所有权限标识 |
| 超级管理员ID | `1L` | 系统超管用户ID |

---

## 2. 数据脱敏（@Sensitive）

> **位置**：`ruoyi-common-sensitive/src/main/java/org/dromara/common/sensitive/`

### 2.1 脱敏策略一览（17种）

| 策略 | 枚举值 | 脱敏效果 | 说明 |
|------|--------|---------|------|
| 身份证 | `ID_CARD` | `110***********1234` | 保留前3位和后4位 |
| 手机号 | `PHONE` | `138****8888` | 保留前3位和后4位 |
| 邮箱 | `EMAIL` | `t**@example.com` | 保留用户名首尾和完整域名 |
| 银行卡 | `BANK_CARD` | `6222***********1234` | 保留前4位和后4位 |
| 中文姓名 | `CHINESE_NAME` | `张*` | 保留姓氏，名字用*代替 |
| 地址 | `ADDRESS` | `北京市朝阳区****` | 保留前8个字符 |
| 固定电话 | `FIXED_PHONE` | `010****1234` | 保留区号和后4位 |
| 密码 | `PASSWORD` | `******` | 全部用*代替 |
| IPv4 地址 | `IPV4` | `192.168.***.***` | 保留网络段，隐藏主机段 |
| IPv6 地址 | `IPV6` | 部分隐藏 | 保留前缀，隐藏接口标识 |
| 车牌号 | `CAR_LICENSE` | `京A***12` | 支持普通和新能源车辆 |
| 用户ID | `USER_ID` | 随机数字 | 生成随机数字替代 |
| 首字符保留 | `FIRST_MASK` | `张***` | 只显示第一个字符 |
| 通用掩码 | `STRING_MASK` | `1234**7890` | 前4位+4个*+后4位 |
| 高安全级别 | `MASK_HIGH_SECURITY` | `to******en` | Token/私钥脱敏，前2后2可见 |
| 清空 | `CLEAR` | 空字符串 | 返回空字符串 |
| 置空 | `CLEAR_TO_NULL` | `null` | 返回 null |

### 2.2 基本用法

```java
import org.dromara.common.sensitive.annotation.Sensitive;
import org.dromara.common.sensitive.core.SensitiveStrategy;

public class UserVo {

    // 手机号脱敏
    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;  // 138****8888

    // 身份证脱敏
    @Sensitive(strategy = SensitiveStrategy.ID_CARD)
    private String idCard;  // 110***********1234

    // 邮箱脱敏
    @Sensitive(strategy = SensitiveStrategy.EMAIL)
    private String email;  // t**@example.com

    // 银行卡脱敏
    @Sensitive(strategy = SensitiveStrategy.BANK_CARD)
    private String bankCard;  // 6222***********1234

    // 中文姓名脱敏
    @Sensitive(strategy = SensitiveStrategy.CHINESE_NAME)
    private String realName;  // 张*

    // 地址脱敏
    @Sensitive(strategy = SensitiveStrategy.ADDRESS)
    private String address;  // 北京市朝阳区****

    // 密码脱敏（显示为******）
    @Sensitive(strategy = SensitiveStrategy.PASSWORD)
    private String password;

    // IP 地址脱敏
    @Sensitive(strategy = SensitiveStrategy.IPV4)
    private String loginIp;  // 192.168.***.***

    // 车牌号脱敏
    @Sensitive(strategy = SensitiveStrategy.CAR_LICENSE)
    private String carNumber;  // 京A***12
}
```

### 2.3 基于角色/权限的脱敏控制

```java
public class UserVo {

    // admin 角色可查看原数据，其他用户看脱敏数据
    @Sensitive(strategy = SensitiveStrategy.ID_CARD, roleKey = {"admin"})
    private String idCard;

    // 需要 system:user:detail 权限才能看原数据
    @Sensitive(strategy = SensitiveStrategy.PHONE, perms = {"system:user:detail"})
    private String phone;

    // admin 角色 或 拥有 finance:account:query 权限都可查看原数据
    // roleKey 和 perms 是 OR 关系
    @Sensitive(strategy = SensitiveStrategy.BANK_CARD,
               roleKey = {"admin"},
               perms = {"finance:account:query"})
    private String bankCard;

    // 多角色（任一角色即可）
    @Sensitive(strategy = SensitiveStrategy.EMAIL,
               roleKey = {"admin", "finance"})
    private String email;

    // 多权限（任一权限即可）
    @Sensitive(strategy = SensitiveStrategy.ADDRESS,
               perms = {"system:user:detail", "system:user:update"})
    private String address;
}
```

### 2.4 日志脱敏

```java
import cn.hutool.core.util.DesensitizedUtil;

// ❌ 不好：记录敏感信息
log.info("用户登录，手机号: {}", phone);

// ✅ 好的：脱敏后记录
log.info("用户登录，手机号: {}", DesensitizedUtil.mobilePhone(phone));
log.info("用户登录，身份证: {}", DesensitizedUtil.idCardNum(idCard, 3, 4));
```

---

## 3. 数据加密（@EncryptField / @ApiEncrypt）

> **位置**：`ruoyi-common-encrypt/src/main/java/org/dromara/common/encrypt/`

### 3.1 支持的加密算法（5种）

| 算法 | 枚举值 | 类型 | 密钥要求 | 说明 |
|------|--------|------|---------|------|
| BASE64 | `BASE64` | 编码 | 无 | 仅编码，不是加密 |
| AES | `AES` | 对称加密 | 16/24/32 位 | 标准对称加密 |
| RSA | `RSA` | 非对称加密 | 公钥/私钥 | 标准非对称加密 |
| SM2 | `SM2` | 国密非对称 | 公钥/私钥 | 国密算法 |
| SM4 | `SM4` | 国密对称 | 16 位 | 国密算法 |

### 3.2 字段级加密 @EncryptField

```java
import org.dromara.common.encrypt.annotation.EncryptField;
import org.dromara.common.encrypt.enumd.AlgorithmType;
import org.dromara.common.encrypt.enumd.EncodeType;

public class User {

    // 默认加密（使用全局配置）
    @EncryptField
    private String password;

    // 指定 AES 加密
    @EncryptField(algorithm = AlgorithmType.AES)
    private String idCard;

    // 指定 SM4 国密加密
    @EncryptField(algorithm = AlgorithmType.SM4)
    private String phone;

    // 指定编码方式
    @EncryptField(algorithm = AlgorithmType.AES, encode = EncodeType.HEX)
    private String bankCard;
}
```

### 3.3 API 级加密 @ApiEncrypt

```java
import org.dromara.common.encrypt.annotation.ApiEncrypt;

@RestController
public class UserController {

    // 请求体加密（AES+RSA 混合加密）
    @ApiEncrypt
    @PostMapping("/addUser")
    public R<Long> addUser(@RequestBody UserBo bo) {
        // 请求体会自动解密
        return R.ok(userService.add(bo));
    }

    // 请求解密 + 响应加密
    @ApiEncrypt(response = true)
    @PostMapping("/updateUser")
    public R<Void> updateUser(@RequestBody UserBo bo) {
        // 请求体自动解密，响应体自动加密
        return R.status(userService.update(bo));
    }
}
```

### 3.4 EncryptUtils 工具类

```java
import org.dromara.common.encrypt.utils.EncryptUtils;

// AES 加密/解密
String encrypted = EncryptUtils.encryptByAes(data, aesKey);
String decrypted = EncryptUtils.decryptByAes(encrypted, aesKey);

// RSA 加密/解密（公钥加密，私钥解密）
String encrypted = EncryptUtils.encryptByRsa(data, publicKey);
String decrypted = EncryptUtils.decryptByRsa(encrypted, privateKey);

// SM2 国密加密/解密
String encrypted = EncryptUtils.encryptBySm2(data, publicKey);
String decrypted = EncryptUtils.decryptBySm2(encrypted, privateKey);

// SM4 国密加密/解密
String encrypted = EncryptUtils.encryptBySm4(data, sm4Key);
String decrypted = EncryptUtils.decryptBySm4(encrypted, sm4Key);

// BASE64 编码/解码
String encoded = EncryptUtils.encryptByBase64(data);
String decoded = EncryptUtils.decryptByBase64(encoded);
```

### 3.5 加密配置

```yaml
# application.yml
mybatis-encryptor:
  # 是否启用加密
  enable: true
  # 默认加密算法
  algorithm: AES
  # AES 密钥（16/24/32位）
  password: your-aes-key-16bit
  # 编码方式
  encode: BASE64
  # RSA 公钥
  publicKey: xxx
  # RSA 私钥
  privateKey: xxx
```

---

## 4. 接口限流（@RateLimiter）

> **位置**：`ruoyi-common-ratelimiter/src/main/java/org/dromara/common/ratelimiter/`

### 4.1 限流类型

| 类型 | 枚举值 | 说明 |
|------|--------|------|
| 全局限流 | `DEFAULT` | 所有请求共享配额 |
| IP 限流 | `IP` | 每个 IP 独立计算 |
| 集群限流 | `CLUSTER` | 每个集群节点独立 |

### 4.2 使用示例

```java
import org.dromara.common.ratelimiter.annotation.RateLimiter;
import org.dromara.common.ratelimiter.enums.LimitType;

@RestController
public class ApiController {

    // 基本用法：60秒内最多100次
    @RateLimiter(time = 60, count = 100)
    @GetMapping("/list")
    public R<List<XxxVo>> list() { }

    // IP 限流：每个 IP 每分钟最多10次
    @RateLimiter(time = 60, count = 10, limitType = LimitType.IP)
    @PostMapping("/login")
    public R<String> login() { }

    // 动态 key：基于用户ID限流
    @RateLimiter(key = "#userId", time = 60, count = 5)
    @PostMapping("/submit")
    public R<Void> submit(Long userId) { }

    // SpEL 表达式
    @RateLimiter(key = "#{#user.id + ':' + #action}", time = 60, count = 5)
    @PostMapping("/action")
    public R<Void> doAction(User user, String action) { }

    // 自定义错误消息
    @RateLimiter(time = 60, count = 10, message = "访问过于频繁，请稍后再试")
    @GetMapping("/data")
    public R<DataVo> getData() { }

    // 集群限流
    @RateLimiter(time = 60, count = 1000, limitType = LimitType.CLUSTER)
    @GetMapping("/global")
    public R<Void> globalApi() { }
}
```

### 4.3 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | String | `""` | 限流 key，支持 SpEL 表达式 |
| `time` | int | `60` | 时间窗口（秒） |
| `count` | int | `100` | 最大请求次数 |
| `limitType` | LimitType | `DEFAULT` | 限流类型 |
| `message` | String | 国际化 key | 错误提示消息 |
| `timeout` | int | `86400` | Redis 超时时间（秒） |

### 4.4 推荐配置

| 场景 | time | count | limitType |
|------|------|-------|-----------|
| 登录接口 | 60 | 5-10 | IP |
| 验证码 | 60 | 3 | IP |
| 查询接口 | 60 | 100-1000 | DEFAULT |
| 写入接口 | 60 | 10-50 | DEFAULT |
| 敏感操作 | 60 | 1-5 | IP |

---

## 5. 防重复提交（@RepeatSubmit）

> **位置**：`ruoyi-common-idempotent/src/main/java/org/dromara/common/idempotent/`

### 5.1 使用示例

```java
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import java.util.concurrent.TimeUnit;

@RestController
public class OrderController {

    // 默认：5秒内不能重复提交
    @RepeatSubmit()
    @PostMapping("/addOrder")
    public R<Long> addOrder(@RequestBody OrderBo bo) { }

    // 自定义间隔：10秒（毫秒单位）
    @RepeatSubmit(interval = 10000)
    @PostMapping("/pay")
    public R<Void> pay(@RequestBody PayBo bo) { }

    // 使用秒作为单位
    @RepeatSubmit(interval = 10, timeUnit = TimeUnit.SECONDS)
    @PostMapping("/submit")
    public R<Void> submit(@RequestBody SubmitBo bo) { }

    // 自定义提示消息
    @RepeatSubmit(interval = 5000, message = "请勿重复提交订单")
    @PostMapping("/createOrder")
    public R<Long> createOrder(@RequestBody OrderBo bo) { }
}
```

### 5.2 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `interval` | int | `5000` | 间隔时间 |
| `timeUnit` | TimeUnit | `MILLISECONDS` | 时间单位 |
| `message` | String | 国际化 key | 错误提示消息 |

### 5.3 推荐配置

| 场景 | 推荐间隔 |
|------|---------|
| 普通表单 | 3-5 秒 |
| 订单创建 | 10 秒 |
| 支付操作 | 30 秒 |
| 文件上传 | 10 秒 |

---

## 6. 数据权限（@DataPermission）

> **完整指南请参考 `data-permission` 技能**，本节仅作简要说明。

数据权限是行级数据过滤机制，通过 MyBatis 拦截器自动注入 WHERE 条件。

### 快速示例

```java
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept"),
    @DataColumn(key = "userName", value = "create_by")
})
@Override
public TableDataInfo<OrderVo> pageWithPermission(OrderBo bo, PageQuery pageQuery) {
    return page(buildQueryWrapper(bo), pageQuery).convert(OrderVo.class);
}
```

### 权限类型

| 类型 | 说明 |
|------|------|
| 全部数据 | 无过滤 |
| 本部门 | 只看本部门 |
| 本部门及以下 | 本部门 + 子部门 |
| 仅本人 | 只看自己创建的 |
| 自定义 | 按角色关联的部门 |

**更多内容**（表别名配置、临时忽略、扩展自定义类型、问题排查）请使用 `data-permission` 技能。

---

## 7. 输入校验

```java
import jakarta.validation.constraints.*;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;

public class UserBo {

    @NotNull(message = "ID不能为空", groups = { EditGroup.class })
    private Long id;

    @NotBlank(message = "用户名不能为空", groups = { AddGroup.class, EditGroup.class })
    @Size(min = 2, max = 20, message = "用户名长度2-20")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "用户名只能包含字母数字下划线")
    private String username;

    @NotBlank(message = "密码不能为空", groups = { AddGroup.class })
    @Size(min = 6, max = 20, message = "密码长度6-20")
    private String password;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;
}

// Controller 中使用分组校验
@PostMapping("/addUser")
public R<Long> addUser(@Validated(AddGroup.class) @RequestBody UserBo bo) { }

@PutMapping("/updateUser")
public R<Void> updateUser(@Validated(EditGroup.class) @RequestBody UserBo bo) { }
```

---

## 8. 常见漏洞防护

### 8.1 SQL 注入防护

```java
// ❌ 危险：字符串拼接
String sql = "SELECT * FROM user WHERE name = '" + name + "'";

// ✅ 安全：使用参数化查询（MyBatis-Plus）
PlusLambdaQuery<User> query = PlusLambdaQuery.of();
query.eq(User::getName, name);

// ✅ 安全：MyBatis 参数绑定
@Select("SELECT * FROM user WHERE name = #{name}")
User getByName(@Param("name") String name);

// ❌ 危险：MyBatis 使用 ${}
@Select("SELECT * FROM user WHERE name = '${name}'")  // 禁止！

// ✅ 安全：MyBatis 使用 #{}
@Select("SELECT * FROM user WHERE name = #{name}")
```

### 8.2 XSS 攻击防护

```java
import cn.hutool.http.HtmlUtil;

// 输出时转义 HTML 标签
String safe = HtmlUtil.escape(userInput);

// 过滤 HTML 标签（移除所有标签）
String text = HtmlUtil.cleanHtmlTag(userInput);

// 移除危险标签（保留安全标签）
String filtered = HtmlUtil.removeHtmlTag(userInput, "script", "iframe", "object");
```

### 8.3 越权访问防护

```java
// ✅ 必须校验数据归属（三层架构：Service 直接调用 Mapper）
@Override
public OrderVo selectById(Long id) {
    Order order = baseMapper.selectById(id);
    if (ObjectUtil.isNull(order)) {
        throw new ServiceException("订单不存在");
    }

    // 超管可以查看所有数据
    if (LoginHelper.isSuperAdmin()) {
        return MapstructUtils.convert(order, OrderVo.class);
    }

    // 校验数据归属
    if (!order.getUserId().equals(LoginHelper.getUserId())) {
        throw new ServiceException("无权访问此订单");
    }

    return MapstructUtils.convert(order, OrderVo.class);
}

// ✅ 批量操作也要校验
@Override
@Transactional(rollbackFor = Exception.class)
public int deleteByIds(Collection<Long> ids) {
    // 查询要删除的数据
    List<Order> orders = baseMapper.selectByIds(ids);

    // 非超管需要校验归属
    if (!LoginHelper.isSuperAdmin()) {
        Long currentUserId = LoginHelper.getUserId();
        boolean hasUnauthorized = orders.stream()
            .anyMatch(o -> !o.getUserId().equals(currentUserId));
        if (hasUnauthorized) {
            throw new ServiceException("包含无权删除的数据");
        }
    }

    return baseMapper.deleteByIds(ids);
}
```

### 8.4 文件上传安全

```java
import org.dromara.common.core.exception.ServiceException;

// ✅ 安全的文件上传
private static final Set<String> ALLOWED_TYPES = Set.of(
    "image/jpeg", "image/png", "image/gif", "image/webp"
);

private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

public void uploadFile(MultipartFile file) {
    // 1. 校验文件类型
    String contentType = file.getContentType();
    if (!ALLOWED_TYPES.contains(contentType)) {
        throw new ServiceException("不支持的文件类型");
    }

    // 2. 校验文件大小
    if (file.getSize() > MAX_FILE_SIZE) {
        throw new ServiceException("文件大小不能超过10MB");
    }

    // 3. 校验文件扩展名
    String originalName = file.getOriginalFilename();
    String extension = getExtension(originalName);
    if (!Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(extension.toLowerCase())) {
        throw new ServiceException("不支持的文件扩展名");
    }

    // 4. 重命名文件，避免路径穿越
    String newName = UUID.randomUUID() + extension;

    // 5. 保存文件...
}
```

### 8.5 敏感信息泄露防护

```java
// ❌ 危险：返回敏感信息
@GetMapping("/user/{id}")
public User getUser(@PathVariable Long id) {
    return userDao.getById(id);  // 包含密码等敏感字段
}

// ✅ 安全：使用 VO 过滤敏感字段
@GetMapping("/getUser/{id}")
public R<UserVo> getUser(@PathVariable Long id) {
    User user = userDao.getById(id);
    return R.ok(MapstructUtils.convert(user, UserVo.class));  // VO 不包含密码字段
}

// ✅ 使用 @Sensitive 注解自动脱敏
public class UserVo {
    private Long id;
    private String userName;

    @Sensitive(strategy = SensitiveStrategy.PHONE)
    private String phone;  // 自动脱敏为 138****8888
}
```

---

## 9. 安全检查清单

### 代码审查

- [ ] 所有用户输入都经过 `@NotBlank`/`@Size`/`@Pattern` 等校验？
- [ ] SQL 查询使用 MyBatis-Plus 或参数化查询（#{}）？
- [ ] 敏感字段使用 `@Sensitive` 脱敏？
- [ ] 需要加密的字段使用 `@EncryptField`？
- [ ] Controller 方法添加了 `@SaCheckPermission` 注解？
- [ ] 敏感操作添加了 `@RepeatSubmit` 防重复？
- [ ] 高频接口添加了 `@RateLimiter` 限流？
- [ ] 批量操作校验了数据归属（防越权）？
- [ ] 文件上传校验了类型、大小、扩展名？
- [ ] 日志中无敏感信息（或已脱敏）？

### 配置检查

- [ ] 生产环境关闭调试模式？
- [ ] 数据库密码等敏感配置已加密（或使用环境变量）？
- [ ] Token 有效期合理（建议 2-24 小时）？
- [ ] CORS 配置正确（不使用 `*`）？
- [ ] 限流配置合理？

### 部署检查

- [ ] 启用 HTTPS？
- [ ] 配置安全响应头（X-Frame-Options、X-XSS-Protection 等）？
- [ ] 错误页面不泄露堆栈信息？
- [ ] 数据库端口不对外暴露？
- [ ] Redis 设置了密码？
