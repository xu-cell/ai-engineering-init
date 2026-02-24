---
name: leniu-security-guard
description: |
  leniu-tengyun-core / leniu-yunshitang 项目安全权限控制规范。包含认证注解、SQL注入防护、XSS防护、数据脱敏、限流防重放。

  触发场景：
  - 配置接口认证注解（@RequiresAuthentication/@RequiresGuest）
  - 防 SQL 注入（#{} 参数化查询）
  - XSS/CSRF 防护
  - 数据脱敏（密码、手机号）
  - 限流和防重放攻击

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-安全、leniu-认证、leniu-@RequiresAuthentication、leniu-@RequiresGuest、leniu-SQL注入、leniu-XSS、leniu-数据脱敏、leniu-限流、net.xnzn、leniu-yunshitang
---

# leniu-security-guard

适用于 leniu-tengyun-core / leniu-yunshitang 项目的安全权限控制。

## 认证注解

| 注解 | 用途 | 位置 |
|------|------|------|
| `@RequiresAuthentication` | 需要登录认证 | `net.xnzn.framework.secure.filter.annotation.RequiresAuthentication` |
| `@RequiresGuest` | 允许游客访问 | `net.xnzn.framework.secure.filter.annotation.RequiresGuest` |
| `@RequiresPermissions` | 需要指定权限 | `net.xnzn.framework.secure.filter.annotation.RequiresPermissions` |
| `@RequiresRoles` | 需要指定角色 | `net.xnzn.framework.secure.filter.annotation.RequiresRoles` |
| `@RequiresUser` | 需要用户登录 | `net.xnzn.framework.secure.filter.annotation.RequiresUser` |
| `@RequiresHeader` | 需要指定请求头 | `net.xnzn.framework.secure.filter.annotation.RequiresHeader` |

## 基础用法

### Controller 认证

```java
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;

// 需要登录认证
@RestController
@RequestMapping("/api/v2/xxx")
@RequiresAuthentication
public class XxxController {
    // ...
}

// 允许游客访问（无需登录）
@GetMapping("/public/info")
@RequiresGuest
public LeResponse<String> getPublicInfo() {
    return LeResponse.succ("public data");
}

// 需要特定权限
@GetMapping("/admin/users")
@RequiresPermissions("system:user:list")
public LeResponse<List<User>> listUsers() {
    return LeResponse.succ(userService.list());
}

// 需要所有指定权限（AND 逻辑，默认）
@RequiresPermissions(value = {"system:user:add", "system:user:edit"}, logical = Logical.AND)
public LeResponse<Void> addUser(User user) { }

// 需要任一权限（OR 逻辑）
@RequiresPermissions(value = {"system:user:add", "system:user:edit"}, logical = Logical.OR)
public LeResponse<Void> editUser(User user) { }

// 需要指定角色
@RequiresRoles("admin")
public LeResponse<Void> adminAction() { }

// 需要所有角色
@RequiresRoles(value = {"admin", "manager"}, logical = Logical.AND)
public LeResponse<Void> superAction() { }
```

### Service 层获取用户信息

```java
import net.xnzn.framework.secure.token.TokenManager;

// 检查是否登录
if (TokenManager.isLogin()) {
    // 已登录
}

// 获取用户 ID
Long userId = TokenManager.getSubjectId().orElse(null);

// 获取用户名
String userName = TokenManager.getSubjectName().orElse(null);

// 获取附加数据
Map<String, String> userData = TokenManager.getSubjectData();
String orgId = userData.get("orgId");

// 检查权限
if (TokenManager.hasPermission("system:user:add")) {
    // 有权限
}

// 检查多个权限（AND）
if (TokenManager.hasPermission("system:user:add", "system:user:edit")) {
    // 拥有所有权限
}

// 检查任一权限（OR）
if (TokenManager.hasAnyPermission("system:user:add", "system:user:edit")) {
    // 拥有任一权限
}

// 检查角色
if (TokenManager.hasRole("admin")) {
    // 是管理员
}

// 检查任一角色
if (TokenManager.hasAnyRole("admin", "manager")) {
    // 是管理员或经理
}
```

### 附加用户数据

```java
// 添加附加数据到 Token
TokenManager.attachData("orgId", "12345");
TokenManager.attachData("deptId", "67890");

// 批量添加
Map<String, String> data = new HashMap<>();
data.put("orgId", "12345");
data.put("deptId", "67890");
TokenManager.attachData(data);

// 获取附加数据
Map<String, String> userData = TokenManager.getSubjectData();
String orgId = userData.get("orgId");

// 移除附加数据
TokenManager.removeData("orgId", "deptId");
```

### 登出操作

```java
// 登出当前用户
TokenManager.logout();

// 撤销认证（强制下线）
TokenManager.revokeAuthenticate();

// 撤销指定用户的旧 Token（保留最近 N 个）
TokenManager.revokeAuthenticate(userId, 3);
```

### 权限缓存管理

```java
// 清除用户权限缓存
TokenManager.clearPermission(userId);

// 清除用户角色缓存
TokenManager.clearRole(userId);

// 清除用户权限和角色缓存
TokenManager.clearRoleAndPermission(userId);

// 清除所有权限缓存
TokenManager.clearAllRoleAndPermission();
```

## WebContext 使用

```java
import net.xnzn.framework.secure.WebContext;

// 获取当前请求
HttpServletRequest request = WebContext.get().getRequest().orElse(null);

// 获取当前响应
HttpServletResponse response = WebContext.get().getResponse().orElse(null);

// 获取 AccessToken
Optional<AccessToken> token = WebContext.get().getAccessToken();

// 设置/获取属性
WebContext.get().setAttribute("customKey", "customValue");
Object value = WebContext.get().getAttribute("customKey");

// 清除上下文
WebContext.reset();
```

## SQL 注入防护

### 使用参数化查询（MyBatis #{} 占位符）

```java
// ❌ 错误：字符串拼接有注入风险
String sql = "SELECT * FROM user WHERE name = '" + name + "'";

// ✅ 正确：使用 MyBatis 参数化查询
mapper.selectByName(name);  // MyBatis 内部使用 #{name}
```

### MyBatis XML 中必须使用 `#{}`

```xml
<!-- ✅ 正确：使用 #{} -->
<select id="selectByName" resultType="User">
    SELECT id, name, mobile FROM user WHERE name = #{name}
</select>

<!-- ❌ 错误：使用 ${} 有 SQL 注入风险 -->
<select id="selectByName" resultType="User">
    SELECT * FROM user WHERE name = '${name}'
</select>
```

### 禁止 SELECT *

```xml
<!-- ❌ 错误：使用 SELECT * -->
<select id="queryList">
    SELECT * FROM user WHERE status = #{status}
</select>

<!-- ✅ 正确：明确指定字段 -->
<select id="queryList">
    SELECT id, name, mobile, status FROM user WHERE status = #{status}
</select>
```

## XSS 防护

### 输出时转义

```java
// 使用 Spring 的 HtmlUtils 转义
String safeContent = HtmlUtils.htmlEscape(userInput);

// 或使用 Apache Commons Text
String safeContent = StringEscapeUtils.escapeHtml4(userInput);
```

### VO 中使用 @JsonSerialize

```java
@Data
public class ArticleVO {
    @JsonSerialize(using = HtmlEscapeSerializer.class)
    private String content;  // 自动转义 HTML
}
```

## 数据权限校验（防越权）

```java
@Transactional(rollbackFor = Exception.class)
public void delete(Long id) {
    // 查询数据
    Order order = orderMapper.selectById(id);
    Assert.notNull(order, () -> new LeException("订单不存在"));

    // 校验数据归属
    Long currentUserId = TokenManager.getSubjectId().orElseThrow(
        () -> new LeException("用户未登录")
    );
    if (!order.getUserId().equals(currentUserId)) {
        throw new LeException("无权操作该订单");
    }

    // 执行删除
    orderMapper.deleteById(id);
}
```

## 数据脱敏

### 日志脱敏

```java
// ❌ 错误：记录敏感信息
log.info("用户登录,username:{}, password:{}", username, password);

// ✅ 正确：不记录敏感信息
log.info("用户登录,username:{}", username);
```

### 手机号 / 身份证 / 银行卡脱敏

```java
// 手机号脱敏
public static String maskMobile(String mobile) {
    if (StrUtil.isBlank(mobile) || mobile.length() != 11) {
        return mobile;
    }
    return mobile.substring(0, 3) + "****" + mobile.substring(7);
}

// 身份证脱敏
public static String maskIdCard(String idCard) {
    if (StrUtil.isBlank(idCard) || idCard.length() < 8) {
        return idCard;
    }
    return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
}

// 银行卡脱敏
public static String maskBankCard(String bankCard) {
    if (StrUtil.isBlank(bankCard) || bankCard.length() < 8) {
        return bankCard;
    }
    return bankCard.substring(0, 4) + " **** **** " + bankCard.substring(bankCard.length() - 4);
}
```

### VO 中敏感字段处理

```java
@Data
public class UserVO {
    // 密码绝不返回
    @JsonIgnore
    private String password;

    // 手机号脱敏
    @JsonSerialize(using = MobileSerializer.class)
    private String mobile;

    // 身份证脱敏
    @JsonSerialize(using = IdCardSerializer.class)
    private String idCard;
}
```

## BCrypt 密码安全

```java
@Autowired
private PasswordEncoder passwordEncoder;

// 注册时加密密码（BCrypt）
public void register(UserParam param) {
    User user = new User();
    user.setUsername(param.getUsername());
    user.setPassword(passwordEncoder.encode(param.getPassword()));
    userMapper.insert(user);
}

// 登录时验证密码
public void login(String username, String password) {
    User user = userMapper.selectByUsername(username);
    if (user == null) {
        throw new LeException("用户不存在");
    }
    if (!passwordEncoder.matches(password, user.getPassword())) {
        throw new LeException("密码错误");
    }
}
```

## 防重放攻击

```java
public void processRequest(ApiRequest request) {
    // 1. 校验时间戳（5 分钟内有效）
    long timestamp = request.getTimestamp();
    long now = System.currentTimeMillis();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
        throw new LeException("请求已过期");
    }

    // 2. 校验签名
    String sign = request.getSign();
    String expectedSign = generateSign(request);
    if (!sign.equals(expectedSign)) {
        throw new LeException("签名验证失败");
    }

    // 3. 校验 nonce（防止重放）
    String nonce = request.getNonce();
    if (redisTemplate.hasKey("nonce:" + nonce)) {
        throw new LeException("请求已处理");
    }

    // 4. 记录 nonce（5 分钟有效）
    redisTemplate.opsForValue().set("nonce:" + nonce, "1", 5, TimeUnit.MINUTES);

    // 5. 处理业务
    doProcess(request);
}
```

## 限流防护（Redis 计数器）

```java
public void checkRateLimit(Long userId, String api, int limit, int seconds) {
    String key = String.format("rate:%d:%s", userId, api);
    Integer count = RedisUtil.incr(key, (long) seconds);

    // 首次请求已由 incr 设置过期时间
    if (count > limit) {
        throw new LeException("请求过于频繁，请稍后重试");
    }
}
```

## 输入验证

```java
@Data
public class UserParam {
    @NotBlank(message = "用户名不能为空")
    @Pattern(regexp = "^[a-zA-Z0-9_]{4,20}$", message = "用户名格式不正确")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 20, message = "密码长度必须在6-20之间")
    private String password;

    @NotBlank(message = "手机号不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String mobile;

    @Email(message = "邮箱格式不正确")
    private String email;
}
```

## 文件上传校验

```java
public String uploadFile(MultipartFile file) {
    // 1. 校验文件是否为空
    if (file == null || file.isEmpty()) {
        throw new LeException("文件不能为空");
    }

    // 2. 校验文件大小（10MB）
    if (file.getSize() > 10 * 1024 * 1024) {
        throw new LeException("文件大小不能超过10MB");
    }

    // 3. 白名单校验文件类型（白名单优于黑名单）
    String contentType = file.getContentType();
    List<String> allowedTypes = Arrays.asList("image/jpeg", "image/png", "image/gif");
    if (!allowedTypes.contains(contentType)) {
        throw new LeException("不支持的文件类型");
    }

    // 4. 校验文件扩展名
    String filename = file.getOriginalFilename();
    String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    List<String> allowedExtensions = Arrays.asList("jpg", "jpeg", "png", "gif");
    if (!allowedExtensions.contains(extension)) {
        throw new LeException("不支持的文件扩展名");
    }

    // 5. 生成安全的文件名（避免路径穿越）
    String safeFilename = UUID.randomUUID().toString() + "." + extension;

    return fileService.upload(file, safeFilename);
}
```

## 最小权限原则

```java
// ✅ 只授予必要的权限，且限制用户只能操作自己的数据
@RequiresAuthentication
@RequiresPermissions("order:view")
public PageVO<OrderVO> pageList(OrderPageParam param) {
    Long userId = TokenManager.getSubjectId().orElseThrow(
        () -> new LeException("用户未登录")
    );
    param.setUserId(userId);
    return orderService.pageList(param);
}
```

## 安全的随机数

```java
// ✅ 使用 SecureRandom（密码学安全）
SecureRandom random = new SecureRandom();
byte[] bytes = new byte[32];
random.nextBytes(bytes);

// ❌ 不安全：使用 Random（可预测）
Random random = new Random();
```

## 与 RuoYi-Plus 的区别

| 特性 | RuoYi-Plus | leniu-tengyun-core |
|------|-----------|-------------------|
| 权限注解 | `@SaCheckPermission("system:user:list")` | `@RequiresPermissions("system:user:list")` |
| 角色注解 | `@SaCheckRole("admin")` | `@RequiresRoles("admin")` |
| 登录检查 | `StpUtil.isLogin()` | `TokenManager.isLogin()` |
| 获取用户 ID | `StpUtil.getLoginIdAsLong()` | `TokenManager.getSubjectId()` |
| 权限检查 | `StpUtil.hasPermission("key")` | `TokenManager.hasPermission("key")` |
| 角色检查 | `StpUtil.hasRole("admin")` | `TokenManager.hasRole("admin")` |
| 登出 | `StpUtil.logout()` | `TokenManager.logout()` |

## 注意事项

1. `@RequiresPermissions` 注解如果不指定 `value`，会自动使用 `@RequestMapping` 的路径作为权限码
2. 权限和角色数据会自动缓存到 Redis，可以通过 `clearPermission/clearRole` 手动清除
3. `TokenManager` 方法都需要在已登录的上下文中使用
4. `@RequiresGuest` 注解用于公开接口，不需要登录
5. MyBatis XML 中必须使用 `#{}` 而非 `${}`，防止 SQL 注入
6. VO 中密码字段必须使用 `@JsonIgnore`，手机号等敏感字段使用序列化脱敏
7. 限流 key 格式：`rate:{userId}:{api}`，防重放 key 格式：`nonce:{nonce}`
