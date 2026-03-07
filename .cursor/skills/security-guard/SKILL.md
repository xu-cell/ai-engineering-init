---
name: security-guard
description: |
  通用后端安全开发指南。包含认证授权模式对比、输入校验、XSS/SQL注入防护、数据脱敏加密、安全检查清单。
  触发场景：
  - 设计认证授权方案
  - 配置权限校验
  - 防护 XSS / SQL 注入
  - 数据脱敏 / 加密处理
  - 安全合规审查
  触发词：安全、认证、授权、权限、Token、登录、XSS、SQL注入、脱敏、加密、RBAC、OAuth、CORS、漏洞防护
  注意：如果项目有专属技能（如 `leniu-security-guard`），优先使用专属版本。
---

# 安全开发指南

> 通用模板。如果项目有专属技能（如 `leniu-security-guard`），优先使用。

## 设计原则

1. **纵深防御**：不依赖单一安全机制，从传输层、认证层、授权层、数据层多维度防护。
2. **最小权限**：默认拒绝，显式授权。每个接口必须声明所需权限。
3. **输入不可信**：所有外部输入（用户参数、请求头、Cookie）必须校验后使用。
4. **敏感数据保护**：存储加密、传输加密、展示脱敏，三层保护。
5. **审计可追溯**：关键操作记录日志，包含操作人、操作时间、操作内容。

---

## 认证授权方案对比

| 维度 | Spring Security | Apache Shiro | Sa-Token |
|------|----------------|-------------|----------|
| 学习曲线 | 陡峭 | 中等 | 平缓 |
| 功能丰富度 | 最全面 | 基础够用 | 功能丰富 |
| Spring 集成 | 原生集成 | 需适配 | 自动配置 |
| OAuth2 支持 | 原生支持 | 需扩展 | 内置 SSO |
| 微服务支持 | 优秀 | 一般 | 良好 |
| 适用场景 | 企业级、复杂权限 | 轻量项目 | 快速开发 |

---

## 实现模式

### 1. 认证（Authentication）

```java
// 方式一：注解式认证（框架无关的概念）
@[你的认证注解]                          // 登录校验
@[你的权限注解]("system:user:add")       // 权限校验
@[你的角色注解]("admin")                 // 角色校验

// 方式二：编程式认证
@RestController
public class UserController {

    @Autowired
    private [你的安全工具类] securityUtils;

    @GetMapping("/profile")
    public Result<?> profile() {
        // 获取当前登录用户
        Long userId = securityUtils.getCurrentUserId();
        String username = securityUtils.getCurrentUsername();
        boolean isAdmin = securityUtils.hasRole("admin");
        boolean hasPerm = securityUtils.hasPermission("system:user:list");

        if (!securityUtils.isAuthenticated()) {
            throw new [你的异常类]("未登录");
        }
        // ...
    }
}
```

### 2. 授权模型（RBAC）

```
用户 (User)
  └── 角色 (Role)         -- 多对多
        └── 权限 (Permission) -- 多对多
              └── 菜单/按钮/API

权限标识格式：模块:资源:操作
示例：system:user:add, order:info:export
```

```java
// 多权限校验（满足其一 / 全部满足）
@RequiresPermissions(value = {"system:user:add", "system:user:edit"}, logical = Logical.OR)
@RequiresPermissions(value = {"system:user:add", "system:user:edit"}, logical = Logical.AND)

// 多角色校验
@RequiresRoles(value = {"admin", "editor"}, logical = Logical.OR)
```

### 3. 输入校验

```java
public class UserDTO {
    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 20, message = "用户名长度2-20")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "只能包含字母数字下划线")
    private String username;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Min(value = 0, message = "年龄不能为负")
    @Max(value = 150, message = "年龄超出范围")
    private Integer age;
}

// Controller 分组校验
@PostMapping
public Result<?> add(@Validated(AddGroup.class) @RequestBody UserDTO dto) { }

@PutMapping
public Result<?> update(@Validated(UpdateGroup.class) @RequestBody UserDTO dto) { }
```

### 4. 越权访问防护

```java
public [你的VO类] selectById(Long id) {
    var entity = baseMapper.selectById(id);
    if (entity == null) {
        throw new [你的异常类]("数据不存在");
    }
    // 非管理员只能访问自己的数据
    Long currentUserId = [你的安全工具类].getCurrentUserId();
    if (![你的安全工具类].isAdmin() && !entity.getCreatedBy().equals(currentUserId)) {
        throw new [你的异常类]("无权访问此数据");
    }
    return convertToVo(entity);
}
```

---

## 常见漏洞防护

### SQL 注入

```java
// 禁止：字符串拼接 SQL
"SELECT * FROM user WHERE name = '" + name + "'"
@Select("SELECT * FROM user WHERE name = '${name}'")

// 正确：参数化查询
@Select("SELECT * FROM user WHERE name = #{name}")
// 或使用 ORM 框架的 QueryWrapper / LambdaQueryWrapper
```

### XSS 防护

```java
// 方式一：全局 Filter（推荐）
@Bean
public FilterRegistrationBean<XssFilter> xssFilter() {
    FilterRegistrationBean<XssFilter> registration = new FilterRegistrationBean<>();
    registration.setFilter(new XssFilter());
    registration.addUrlPatterns("/*");
    registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
    return registration;
}

// 方式二：手动转义
String safe = HtmlUtils.htmlEscape(userInput);
String safe = StringEscapeUtils.escapeHtml4(userInput);
```

### 敏感信息泄露

```java
// 禁止：直接返回 Entity（可能包含密码等）
return userDao.getById(id);

// 正确：使用 VO 过滤 + @Sensitive 脱敏
UserVo vo = new UserVo();
BeanUtils.copyProperties(user, vo);
return vo;

// 日志脱敏
log.info("手机号: {}", DesensitizedUtil.mobilePhone(phone));
```

---

## 安全检查清单

### 代码审查

- [ ] 用户输入经过 `@NotBlank` / `@Size` / `@Pattern` 校验
- [ ] SQL 使用参数化查询（`#{}` 而非 `${}`）
- [ ] 敏感字段使用脱敏注解或 VO 过滤
- [ ] 存储敏感数据使用加密
- [ ] Controller 添加权限注解
- [ ] 写入接口添加防重复提交
- [ ] 高频接口添加限流
- [ ] 批量操作校验数据归属（防越权）
- [ ] 文件上传校验类型 / 大小 / 扩展名（白名单）
- [ ] 日志中无敏感信息（或已脱敏）

### 配置与部署

- [ ] 生产环境关闭调试模式、Swagger
- [ ] 敏感配置使用环境变量或配置中心加密
- [ ] Token 有效期合理（2-24h）
- [ ] CORS 不使用 `*`，限定域名
- [ ] 启用 HTTPS
- [ ] 设置安全响应头（X-Frame-Options、X-Content-Type-Options、CSP）
- [ ] 错误页不泄露堆栈信息
- [ ] 数据库 / Redis 端口不对外暴露

---

## 常见错误

```java
// 1. 忘记加认证注解，接口裸奔
@GetMapping("/users")
public Result<?> list() { ... }  // 任何人可访问！

// 2. 只校验前端，不校验后端
// 前端限制了输入范围，但后端不做校验 -> 可被绕过

// 3. 用 Map 传递用户信息（类型不安全）
Map<String, Object> user = getCurrentUser();  // 缺乏类型约束
// 应使用强类型 LoginUser 对象

// 4. 密码明文存储
user.setPassword(rawPassword);
// 应使用 BCrypt / SCrypt 哈希
user.setPassword(passwordEncoder.encode(rawPassword));

// 5. Token 存储敏感信息
// JWT payload 不应包含密码、完整身份证号等

// 6. CORS 配置过于宽松
.allowedOrigins("*").allowedMethods("*").allowCredentials(true)
// allowedOrigins("*") 与 allowCredentials(true) 不能同时使用
```
