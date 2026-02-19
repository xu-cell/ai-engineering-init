---
name: java-security
description: |
  Java安全规范。当编写涉及安全的代码时使用此skill，包括SQL注入、XSS防护和权限控制规范。

  触发场景：
  - 防SQL注入（参数化查询、@SafeXxx）
  - XSS/CSRF防护配置
  - 权限控制（@SaCheckPermission、@SaCheckRole）
  - 数据脱敏和输入验证

  触发词：安全规范、SQL注入、XSS、CSRF、权限控制、数据脱敏、输入验证、@SaCheckPermission、@SaCheckRole、安全漏洞

  注意：与 security-guard 技能有重叠，security-guard 侧重Sa-Token认证授权体系，本技能侧重通用Java安全编码规范。
---

# Java安全规范

## SQL注入防护

### 使用参数化查询

```java
// ❌ 错误:字符串拼接
String sql = "SELECT * FROM user WHERE name = '" + name + "'";

// ✅ 正确:使用MyBatis参数化查询
mapper.selectByName(name);  // MyBatis使用 #{name}
```

### MyBatis XML中使用#{}

```xml
<!-- ✅ 正确:使用 #{} -->
<select id="selectByName" resultType="User">
    SELECT * FROM user WHERE name = #{name}
</select>

<!-- ❌ 错误:使用 ${} 有SQL注入风险 -->
<select id="selectByName" resultType="User">
    SELECT * FROM user WHERE name = '${name}'
</select>
```

## XSS防护

### 输出时转义

```java
// 使用Spring的HtmlUtils转义
String safeContent = HtmlUtils.htmlEscape(userInput);

// 或使用Apache Commons Text
String safeContent = StringEscapeUtils.escapeHtml4(userInput);
```

### VO中使用@JsonSerialize

```java
@Data
public class ArticleVO {
    @JsonSerialize(using = HtmlEscapeSerializer.class)
    private String content;  // 自动转义HTML
}
```

## CSRF防护

### 使用CSRF Token

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .and()
            // 其他配置
    }
}
```

## 权限控制

### 接口权限校验

```java
// 需要认证
@RequiresAuthentication
@RestController
@RequestMapping("/api/order")
public class OrderController {

    @PostMapping("/create")
    public Long create(@RequestBody LeRequest<OrderParam> request) {
        // 业务逻辑
    }
}
```

### 数据权限校验

```java
@Transactional(rollbackFor = Exception.class)
public void delete(Long id) {
    // 查询数据
    Order order = orderMapper.selectById(id);
    Assert.notNull(order, () -> new LeException("订单不存在"));

    // 校验数据归属
    Long currentUserId = SecurityUtils.getUserId();
    if (!order.getUserId().equals(currentUserId)) {
        throw new LeException("无权操作该订单");
    }

    // 执行删除
    orderMapper.deleteById(id);
}
```

## 敏感信息保护

### 日志脱敏

```java
// ❌ 错误:记录敏感信息
log.info("用户登录,username:{}, password:{}", username, password);

// ✅ 正确:不记录敏感信息
log.info("用户登录,username:{}", username);
```

### 数据脱敏

```java
// 手机号脱敏
public static String maskMobile(String mobile) {
    if (StringUtils.isBlank(mobile) || mobile.length() != 11) {
        return mobile;
    }
    return mobile.substring(0, 3) + "****" + mobile.substring(7);
}

// 身份证脱敏
public static String maskIdCard(String idCard) {
    if (StringUtils.isBlank(idCard) || idCard.length() < 8) {
        return idCard;
    }
    return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
}

// 银行卡脱敏
public static String maskBankCard(String bankCard) {
    if (StringUtils.isBlank(bankCard) || bankCard.length() < 8) {
        return bankCard;
    }
    return bankCard.substring(0, 4) + " **** **** " + bankCard.substring(bankCard.length() - 4);
}
```

### VO中敏感字段处理

```java
@Data
public class UserVO {
    // 密码不返回
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

## 输入验证

### 参数校验

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

### 文件上传校验

```java
public String uploadFile(MultipartFile file) {
    // 1. 校验文件是否为空
    if (file == null || file.isEmpty()) {
        throw new LeException("文件不能为空");
    }

    // 2. 校验文件大小
    if (file.getSize() > 10 * 1024 * 1024) {  // 10MB
        throw new LeException("文件大小不能超过10MB");
    }

    // 3. 校验文件类型
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

    // 5. 上传文件
    return fileService.upload(file);
}
```

## 密码安全

### 密码加密

```java
@Autowired
private PasswordEncoder passwordEncoder;

// 注册时加密密码
public void register(UserParam param) {
    User user = new User();
    user.setUsername(param.getUsername());
    // 使用BCrypt加密
    user.setPassword(passwordEncoder.encode(param.getPassword()));
    userMapper.insert(user);
}

// 登录时验证密码
public void login(String username, String password) {
    User user = userMapper.selectByUsername(username);
    if (user == null) {
        throw new LeException("用户不存在");
    }

    // 验证密码
    if (!passwordEncoder.matches(password, user.getPassword())) {
        throw new LeException("密码错误");
    }
}
```

## 防重放攻击

### 使用时间戳和签名

```java
public void processRequest(ApiRequest request) {
    // 1. 校验时间戳(5分钟内有效)
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

    // 3. 校验nonce(防止重放)
    String nonce = request.getNonce();
    if (redisTemplate.hasKey("nonce:" + nonce)) {
        throw new LeException("请求已处理");
    }

    // 4. 记录nonce
    redisTemplate.opsForValue().set("nonce:" + nonce, "1", 5, TimeUnit.MINUTES);

    // 5. 处理业务
    doProcess(request);
}
```

## 限流防护

### 使用Redis实现限流

```java
@Autowired
private RedisTemplate<String, String> redisTemplate;

public void checkRateLimit(String userId) {
    String key = "rate:limit:" + userId;

    // 获取当前计数
    String countStr = redisTemplate.opsForValue().get(key);
    int count = countStr == null ? 0 : Integer.parseInt(countStr);

    // 检查是否超过限制(每分钟10次)
    if (count >= 10) {
        throw new LeException("请求过于频繁,请稍后重试");
    }

    // 增加计数
    redisTemplate.opsForValue().increment(key);

    // 设置过期时间(首次设置)
    if (count == 0) {
        redisTemplate.expire(key, 1, TimeUnit.MINUTES);
    }
}
```

## 常见场景

### 场景1: 用户注册

```java
@Transactional(rollbackFor = Exception.class)
public void register(RegisterParam param) {
    // 1. 参数校验
    Assert.notBlank(param.getUsername(), () -> new LeException("用户名不能为空"));
    Assert.notBlank(param.getPassword(), () -> new LeException("密码不能为空"));
    Assert.notBlank(param.getMobile(), () -> new LeException("手机号不能为空"));

    // 2. 校验用户名是否存在
    User existUser = userMapper.selectByUsername(param.getUsername());
    if (existUser != null) {
        throw new LeException("用户名已存在");
    }

    // 3. 校验手机号是否存在
    existUser = userMapper.selectByMobile(param.getMobile());
    if (existUser != null) {
        throw new LeException("手机号已注册");
    }

    // 4. 创建用户
    User user = new User();
    user.setUsername(param.getUsername());
    // 密码加密
    user.setPassword(passwordEncoder.encode(param.getPassword()));
    user.setMobile(param.getMobile());
    userMapper.insert(user);

    log.info("用户注册成功,username:{}", param.getUsername());
}
```

### 场景2: 文件上传

```java
public String uploadAvatar(MultipartFile file) {
    // 1. 校验文件
    if (file == null || file.isEmpty()) {
        throw new LeException("文件不能为空");
    }

    // 2. 校验文件大小(2MB)
    if (file.getSize() > 2 * 1024 * 1024) {
        throw new LeException("文件大小不能超过2MB");
    }

    // 3. 校验文件类型
    String contentType = file.getContentType();
    if (!contentType.startsWith("image/")) {
        throw new LeException("只支持图片文件");
    }

    // 4. 校验文件扩展名
    String filename = file.getOriginalFilename();
    String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    List<String> allowedExtensions = Arrays.asList("jpg", "jpeg", "png", "gif");
    if (!allowedExtensions.contains(extension)) {
        throw new LeException("不支持的文件格式");
    }

    // 5. 生成安全的文件名
    String safeFilename = UUID.randomUUID().toString() + "." + extension;

    // 6. 上传文件
    String url = ossService.upload(file, safeFilename);

    log.info("头像上传成功,url:{}", url);
    return url;
}
```

### 场景3: API接口签名验证

```java
public void verifySign(ApiRequest request) {
    // 1. 获取签名
    String sign = request.getSign();
    if (StringUtils.isBlank(sign)) {
        throw new LeException("签名不能为空");
    }

    // 2. 获取时间戳
    Long timestamp = request.getTimestamp();
    if (timestamp == null) {
        throw new LeException("时间戳不能为空");
    }

    // 3. 校验时间戳(5分钟内有效)
    long now = System.currentTimeMillis();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
        throw new LeException("请求已过期");
    }

    // 4. 生成签名
    String expectedSign = generateSign(request);

    // 5. 验证签名
    if (!sign.equals(expectedSign)) {
        throw new LeException("签名验证失败");
    }
}

private String generateSign(ApiRequest request) {
    // 按字段名排序
    Map<String, Object> params = new TreeMap<>();
    params.put("appId", request.getAppId());
    params.put("timestamp", request.getTimestamp());
    params.put("data", request.getData());

    // 拼接字符串
    StringBuilder sb = new StringBuilder();
    for (Map.Entry<String, Object> entry : params.entrySet()) {
        sb.append(entry.getKey()).append("=").append(entry.getValue()).append("&");
    }
    sb.append("appSecret=").append(getAppSecret(request.getAppId()));

    // MD5加密
    return DigestUtils.md5Hex(sb.toString());
}
```

## 最佳实践

### 1. 最小权限原则

```java
// ✅ 只授予必要的权限
@RequiresAuthentication
@RequiresPermissions("order:view")
public PageVO<OrderVO> pageList(OrderPageParam param) {
    // 只能查看自己的订单
    Long userId = SecurityUtils.getUserId();
    param.setUserId(userId);
    return orderService.pageList(param);
}
```

### 2. 白名单优于黑名单

```java
// ✅ 使用白名单
List<String> allowedExtensions = Arrays.asList("jpg", "jpeg", "png", "gif");
if (!allowedExtensions.contains(extension)) {
    throw new LeException("不支持的文件格式");
}

// ❌ 使用黑名单(容易遗漏)
List<String> blockedExtensions = Arrays.asList("exe", "bat", "sh");
if (blockedExtensions.contains(extension)) {
    throw new LeException("不支持的文件格式");
}
```

### 3. 安全的随机数

```java
// ✅ 使用SecureRandom
SecureRandom random = new SecureRandom();
byte[] bytes = new byte[32];
random.nextBytes(bytes);

// ❌ 使用Random(不安全)
Random random = new Random();
```
