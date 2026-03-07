---
name: social-login
description: |
  通用 OAuth2 第三方登录开发指南。涵盖授权码流程、接口设计、账号绑定机制、多平台接入。
  触发场景：
  - 接入微信/QQ/GitHub 等第三方登录
  - 实现 OAuth2 授权码流程
  - 实现社交账号与系统账号绑定/解绑
  - 获取第三方用户信息
  触发词：第三方登录、OAuth、OAuth2、社交登录、微信登录、QQ登录、GitHub登录、扫码登录、授权码、授权登录
  注意：如果项目有专属技能，优先使用专属版本。
---

# OAuth2 第三方登录开发指南

> 通用模板。如果项目有专属技能，优先使用。

## 设计原则

1. **标准协议**：遵循 OAuth 2.0 授权码模式（Authorization Code Flow），这是最安全的 OAuth 流程。
2. **状态防护**：使用 `state` 参数防止 CSRF 攻击，每次授权请求生成唯一 state 并校验。
3. **绑定机制**：第三方账号与系统账号通过绑定表关联，支持一个系统账号绑定多个第三方平台。
4. **信息最小化**：只获取必要的第三方用户信息（OpenID、昵称、头像），不过度获取。

---

## OAuth 2.0 授权码流程

```
用户 -> 前端 -> 后端（生成授权URL） -> 第三方平台（授权页）
                                              |
用户授权                                       |
                                              v
第三方平台 -> 前端回调页（携带 code + state）-> 后端
                                              |
后端用 code 换 access_token                    |
后端用 access_token 获取用户信息                |
                                              v
                                     查绑定关系 -> 登录/绑定
```

### 步骤详解

| 步骤 | 描述 | 关键参数 |
|------|------|---------|
| 1. 构建授权 URL | 拼接第三方授权地址 | client_id, redirect_uri, state, scope |
| 2. 用户授权 | 用户在第三方平台确认授权 | - |
| 3. 回调获取 code | 第三方重定向回应用 | code, state |
| 4. code 换 token | 后端调用第三方 Token 接口 | code, client_id, client_secret |
| 5. 获取用户信息 | 后端调用第三方用户信息接口 | access_token |
| 6. 登录/绑定 | 根据 OpenID 查找绑定关系 | openId, source |

---

## 实现模式

### 一、抽象接口设计

```java
// 第三方认证请求接口
public interface SocialAuthProvider {
    String getSource();                              // 平台标识
    String buildAuthorizeUrl(String state);           // 构建授权URL
    SocialUser authenticate(String code, String state); // 回调认证
}

// 第三方用户信息
@Data
public class SocialUser {
    private String openId;      // 平台唯一标识
    private String source;      // 来源平台（github, wechat_open 等）
    private String nickname;    // 昵称
    private String avatar;      // 头像
    private String email;       // 邮箱（可能为空）
    private String accessToken; // 第三方 Token
    private Map<String, Object> rawInfo; // 原始数据
}
```

### 二、GitHub 实现示例

```java
@Component
public class GitHubAuthProvider implements SocialAuthProvider {

    @Value("${social.github.client-id}")
    private String clientId;

    @Value("${social.github.client-secret}")
    private String clientSecret;

    @Value("${social.github.redirect-uri}")
    private String redirectUri;

    @Override
    public String getSource() { return "github"; }

    @Override
    public String buildAuthorizeUrl(String state) {
        return "https://github.com/login/oauth/authorize"
            + "?client_id=" + clientId
            + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            + "&state=" + state
            + "&scope=user:email";
    }

    @Override
    public SocialUser authenticate(String code, String state) {
        // 1. code 换 access_token
        String tokenUrl = "https://github.com/login/oauth/access_token";
        Map<String, String> body = Map.of(
            "client_id", clientId,
            "client_secret", clientSecret,
            "code", code
        );
        String accessToken = httpPost(tokenUrl, body); // 解析响应获取 token

        // 2. 获取用户信息
        String userInfo = httpGet("https://api.github.com/user",
            Map.of("Authorization", "Bearer " + accessToken));

        // 3. 构建 SocialUser
        SocialUser user = new SocialUser();
        user.setOpenId(parseField(userInfo, "id"));
        user.setSource("github");
        user.setNickname(parseField(userInfo, "login"));
        user.setAvatar(parseField(userInfo, "avatar_url"));
        user.setEmail(parseField(userInfo, "email"));
        return user;
    }
}
```

### 三、Controller 层

```java
@RestController
@RequestMapping("/auth/social")
public class SocialLoginController {

    @Autowired
    private Map<String, SocialAuthProvider> providers; // Spring 自动注入所有实现

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private SocialBindService bindService;

    // 1. 获取授权 URL
    @GetMapping("/authorize/{source}")
    public Result<String> authorize(@PathVariable String source) {
        SocialAuthProvider provider = getProvider(source);
        String state = UUID.randomUUID().toString().replace("-", "");
        // state 存入 Redis，3分钟有效
        redisTemplate.opsForValue().set("social:state:" + state, source, 3, TimeUnit.MINUTES);
        return Result.ok(provider.buildAuthorizeUrl(state));
    }

    // 2. 回调登录
    @PostMapping("/callback")
    public Result<?> callback(@RequestBody SocialCallbackDTO dto) {
        // 校验 state
        String cachedSource = redisTemplate.opsForValue().get("social:state:" + dto.getState());
        if (cachedSource == null) {
            throw new [你的异常类]("授权已过期，请重新操作");
        }
        redisTemplate.delete("social:state:" + dto.getState());

        // 获取第三方用户信息
        SocialAuthProvider provider = getProvider(dto.getSource());
        SocialUser socialUser = provider.authenticate(dto.getCode(), dto.getState());

        // 查找绑定关系
        String authId = socialUser.getSource() + ":" + socialUser.getOpenId();
        SocialBind bind = bindService.findByAuthId(authId);

        if (bind == null) {
            // 未绑定 -> 返回第三方信息，引导绑定或注册
            return Result.fail("NEED_BINDIND", "请绑定系统账号", socialUser);
        }

        // 已绑定 -> 执行登录
        LoginUser loginUser = loadUserById(bind.getUserId());
        String token = [你的认证工具类].login(loginUser);
        return Result.ok(Map.of("token", token));
    }

    // 3. 绑定（已登录用户绑定第三方账号）
    @PostMapping("/bind")
    public Result<?> bind(@RequestBody SocialCallbackDTO dto) {
        [你的认证工具类].checkLogin();
        Long currentUserId = [你的认证工具类].getCurrentUserId();

        SocialAuthProvider provider = getProvider(dto.getSource());
        SocialUser socialUser = provider.authenticate(dto.getCode(), dto.getState());

        String authId = socialUser.getSource() + ":" + socialUser.getOpenId();
        bindService.bindOrUpdate(currentUserId, authId, socialUser);
        return Result.ok("绑定成功");
    }

    // 4. 解绑
    @DeleteMapping("/unbind/{bindId}")
    public Result<?> unbind(@PathVariable Long bindId) {
        [你的认证工具类].checkLogin();
        bindService.unbind(bindId, [你的认证工具类].getCurrentUserId());
        return Result.ok("已解除绑定");
    }

    private SocialAuthProvider getProvider(String source) {
        // providers Map 的 key 是 Bean 名称，需要匹配 source
        return providers.values().stream()
            .filter(p -> p.getSource().equals(source))
            .findFirst()
            .orElseThrow(() -> new [你的异常类]("不支持的登录平台: " + source));
    }
}
```

### 四、绑定表设计

```sql
CREATE TABLE sys_social_bind (
    id          BIGINT       NOT NULL COMMENT '主键',
    user_id     BIGINT       NOT NULL COMMENT '系统用户ID',
    auth_id     VARCHAR(128) NOT NULL COMMENT '唯一标识 (source:openId)',
    source      VARCHAR(32)  NOT NULL COMMENT '来源平台',
    open_id     VARCHAR(128) NOT NULL COMMENT '平台用户ID',
    nickname    VARCHAR(64)           COMMENT '昵称',
    avatar      VARCHAR(512)          COMMENT '头像',
    email       VARCHAR(128)          COMMENT '邮箱',
    created_time DATETIME    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_auth_id (auth_id),
    KEY idx_user_id (user_id)
);
```

### 五、配置

```yaml
social:
  github:
    client-id: ${GITHUB_CLIENT_ID:}
    client-secret: ${GITHUB_CLIENT_SECRET:}
    redirect-uri: https://your-domain.com/social-callback?source=github
  wechat:
    app-id: ${WECHAT_APP_ID:}
    app-secret: ${WECHAT_APP_SECRET:}
    redirect-uri: https://your-domain.com/social-callback?source=wechat_open
```

---

## 选型建议

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| 自研（如上） | 完全可控、无依赖 | 每个平台需手动对接 | 接入 1-3 个平台 |
| JustAuth | 开箱即用、20+ 平台 | 引入第三方依赖 | 多平台快速接入 |
| Spring Security OAuth2 Client | Spring 生态原生 | 配置复杂 | 企业级、标准 OAuth2 |

### 常见平台接入

| 平台 | 标识 | 特殊要求 |
|------|------|---------|
| GitHub | `github` | 无 |
| 微信开放平台 | `wechat_open` | 需企业开发者认证 |
| 微信公众号 | `wechat_mp` | 需服务号 |
| QQ | `qq` | 需备案域名 |
| 钉钉 | `dingtalk` | 需创建 H5 微应用 |
| 企业微信 | `wechat_enterprise` | 需 agentId |
| 支付宝 | `alipay` | 需应用公钥/私钥 |

---

## 常见错误

```java
// 1. 不校验 state 参数（CSRF 攻击风险）
SocialUser user = provider.authenticate(code, state);
// 应先从 Redis 校验 state 是否有效

// 2. 回调地址与第三方平台配置不一致
// 应确保 redirect_uri 与第三方平台配置完全一致（包括协议、域名、路径、参数）

// 3. 不检查认证响应
SocialUser user = provider.authenticate(code, state);
user.getOpenId();  // 认证可能失败，user 为 null 或字段缺失
// 应先检查认证结果

// 4. source 标识拼写错误
getProvider("wechat");       // 不存在
getProvider("wechat_open");  // 正确

// 5. 绑定关系不检查冲突
// 同一个第三方账号被多个系统账号绑定
// authId 应设为唯一索引

// 6. 未处理 Token 过期
// 第三方 access_token 有有效期，需要用 refresh_token 刷新
// 或每次登录重新获取

// 7. 前端直接传 client_secret
// client_secret 只能在后端使用，绝不能暴露给前端
```

### 前端集成参考

```javascript
// 跳转授权
const { data: authorizeUrl } = await request.get(`/auth/social/authorize/${source}`);
window.location.href = authorizeUrl;

// 回调页面处理
const { source, code, state } = getQueryParams();
const { data } = await request.post('/auth/social/callback', {
    source, code, state
});
if (data.token) {
    setToken(data.token);
    router.push('/');
} else {
    // 引导绑定或注册
    router.push({ path: '/bindAccount', query: { source, code, state } });
}
```
