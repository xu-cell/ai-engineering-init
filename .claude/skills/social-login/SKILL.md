---
name: social-login
description: |
  当需要实现第三方登录、OAuth2 认证、社交账号绑定时自动使用此 Skill。

  触发场景：
  - 需要接入微信/QQ/支付宝等第三方登录
  - 需要实现 OAuth2 授权流程
  - 需要配置 JustAuth 第三方登录
  - 需要实现社交账号与系统账号绑定
  - 需要获取第三方用户信息

  触发词：第三方登录、微信登录、QQ登录、OAuth、OAuth2、JustAuth、社交登录、扫码登录、AuthRequest、SocialUtils、授权登录、GitHub登录、钉钉登录
---

# 第三方登录开发指南（JustAuth）

> **适用模块**：`ruoyi-common-social`（基于 JustAuth）
> **特性**：Sa-Token 认证集成、Redis 状态缓存（防 CSRF）、多租户支持、账号绑定机制

## 一、支持平台

| 平台 | source 标识 | 平台 | source 标识 |
|------|------------|------|------------|
| 钉钉 | `dingtalk` | GitHub | `github` |
| Gitee | `gitee` | 微博 | `weibo` |
| 支付宝 | `alipay_wallet` | QQ | `qq` |
| 微信开放平台 | `wechat_open` | 微信公众号 | `wechat_mp` |
| 企业微信 | `wechat_enterprise` | 抖音 | `douyin` |
| 华为 | `huawei` | 微软 | `microsoft` |
| MaxKey | `maxkey` | TopIAM | `topiam` |
| GitLab | `gitlab` | Gitea | `gitea` |

完整平台列表及特殊配置详见 `references/provider-configs.md`。

---

## 二、基础配置

```yaml
justauth:
  address: https://your-domain.com    # 回调地址前缀
  type:
    github:
      client-id: ${GITHUB_CLIENT_ID:}
      client-secret: ${GITHUB_CLIENT_SECRET:}
      redirect-uri: ${justauth.address}/social-callback?source=github
    gitee:
      client-id: ${GITEE_CLIENT_ID:}
      client-secret: ${GITEE_CLIENT_SECRET:}
      redirect-uri: ${justauth.address}/social-callback?source=gitee
    dingtalk:
      client-id: ${DINGTALK_APP_KEY:}
      client-secret: ${DINGTALK_APP_SECRET:}
      redirect-uri: ${justauth.address}/social-callback?source=dingtalk
```

> 各平台特殊配置（微软 tenantId、企业微信 agentId、支付宝公钥等）详见 `references/provider-configs.md`。

---

## 三、核心 API

### 3.1 SocialUtils

**位置**：`org.dromara.common.social.utils.SocialUtils`

```java
import org.dromara.common.social.utils.SocialUtils;
import me.zhyd.oauth.model.AuthResponse;
import me.zhyd.oauth.model.AuthUser;
import me.zhyd.oauth.request.AuthRequest;

// 获取授权请求对象
AuthRequest authRequest = SocialUtils.getAuthRequest("github", socialProperties);

// 生成授权 URL
String authorizeUrl = authRequest.authorize(state);

// 处理回调登录
AuthResponse<AuthUser> response = SocialUtils.loginAuth(
    "github", code, state, socialProperties
);
if (response.ok()) {
    AuthUser user = response.getData();
    String openId = user.getUuid();       // 唯一标识
    String nickname = user.getNickname(); // 昵称
    String source = user.getSource();     // 来源平台
}
```

### 3.2 AuthUser 关键字段

| 属性 | 说明 | 属性 | 说明 |
|------|------|------|------|
| `uuid` | 平台用户唯一ID | `username` | 用户名 |
| `nickname` | 昵称 | `avatar` | 头像 |
| `email` | 邮箱 | `source` | 来源平台 |
| `token` | Token 信息 | `rawUserInfo` | 原始数据(Map) |

### 3.3 状态缓存

`AuthRedisStateCache` 自动管理 OAuth2 state 参数（Redis 缓存，3分钟过期），无需手动操作。

---

## 四、后端实现

### 4.1 生成授权 URL

```java
@GetMapping("/binding/{source}")
public R<String> authBinding(@PathVariable String source) {
    AuthRequest authRequest = SocialUtils.getAuthRequest(source, socialProperties);
    String state = AuthStateUtils.createState();
    return R.ok("操作成功", authRequest.authorize(state));
}
```

### 4.2 回调登录（SocialAuthStrategy）

```java
@Slf4j
@Service("social" + IAuthStrategy.BASE_NAME)
@RequiredArgsConstructor
public class SocialAuthStrategy implements IAuthStrategy {

    @Override
    public LoginVo login(String body, SysClientVo client) {
        SocialLoginBody loginBody = JsonUtils.parseObject(body, SocialLoginBody.class);
        ValidatorUtils.validate(loginBody);

        // 1. 获取第三方用户信息
        AuthResponse<AuthUser> response = SocialUtils.loginAuth(
            loginBody.getSource(), loginBody.getSocialCode(),
            loginBody.getSocialState(), socialProperties);
        if (!response.ok()) {
            throw new ServiceException(response.getMsg());
        }

        // 2. 查找绑定关系
        String authId = response.getData().getSource() + response.getData().getUuid();
        List<SysSocialVo> list = sysSocialService.selectByAuthId(authId);
        if (CollUtil.isEmpty(list)) {
            throw new ServiceException("你还没有绑定第三方账号，绑定后才可以登录！");
        }

        // 3. 生成系统 Token
        LoginUser loginUser = loginService.buildLoginUser(loadUser(list.get(0).getUserId()));
        LoginHelper.login(loginUser, new SaLoginParameter()
            .setDeviceType(client.getDeviceType())
            .setTimeout(client.getTimeout())
            .setActiveTimeout(client.getActiveTimeout()));

        LoginVo loginVo = new LoginVo();
        loginVo.setAccessToken(StpUtil.getTokenValue());
        loginVo.setExpireIn(StpUtil.getTokenTimeout());
        return loginVo;
    }
}
```

### 4.3 账号绑定

```java
// 绑定：AuthController.socialCallback() → SysLoginService.socialRegister()
@PostMapping("/social/callback")
public R<Void> socialCallback(@RequestBody SocialLoginBody loginBody) {
    StpUtil.checkLogin();
    AuthResponse<AuthUser> response = SocialUtils.loginAuth(...);
    if (!response.ok()) return R.fail(response.getMsg());
    loginService.socialRegister(response.getData());
    return R.ok();
}

// socialRegister 核心逻辑：
// 1. 生成 authId = source + uuid
// 2. 检查 authId 是否已被其他用户绑定
// 3. 查询当前用户是否已绑定该平台 -> 新增或更新
```

### 4.4 解绑

```java
@DeleteMapping("/unlock/{socialId}")
public R<Void> unlockSocial(@PathVariable Long socialId) {
    StpUtil.checkLogin();
    return socialUserService.deleteWithValidById(socialId) ? R.ok() : R.fail("取消授权失败");
}
```

---

## 五、前端集成

```javascript
// 跳转授权
const { data } = await request.get(`/auth/binding/${source}`);
window.location.href = data;

// 回调页面处理
const { source, code, state } = this.$route.query;
const { data } = await request.post('/auth/login', {
    grantType: 'social',
    source, socialCode: code, socialState: state,
    clientId: 'your-client-id'
});
setToken(data.accessToken);
```

---

## 六、常见错误

```yaml
# ❌ 回调地址与第三方平台配置不一致
redirect-uri: http://localhost:8080/callback

# ✅ 使用与第三方平台一致的地址
redirect-uri: https://your-domain.com/social-callback?source=github
```

```java
// ❌ 不检查响应结果
AuthUser user = response.getData();  // 可能 null

// ✅ 先检查状态
if (!response.ok()) throw new ServiceException(response.getMsg());

// ❌ source 标识拼写错误
SocialUtils.getAuthRequest("wechat", props);       // 不存在

// ✅ 正确标识
SocialUtils.getAuthRequest("wechat_open", props);   // 微信开放平台
SocialUtils.getAuthRequest("wechat_mp", props);     // 微信公众号
```

---

## 七、扩展自定义平台

```java
public class AuthCustomRequest extends AuthDefaultRequest {
    public AuthCustomRequest(AuthConfig config, AuthStateCache stateCache) {
        super(config, AuthCustomSource.CUSTOM, stateCache);
    }
    @Override
    protected AuthToken getAccessToken(AuthCallback authCallback) { ... }
    @Override
    protected AuthUser getUserInfo(AuthToken authToken) { ... }
}
// 然后在 SocialUtils.getAuthRequest() 中添加对应 case
```

---

## 八、参考代码位置

| 类型 | 位置 |
|------|------|
| SocialUtils | `ruoyi-common/ruoyi-common-social/.../utils/SocialUtils.java` |
| AuthRedisStateCache | `ruoyi-common/ruoyi-common-social/.../utils/AuthRedisStateCache.java` |
| SocialProperties | `ruoyi-common/ruoyi-common-social/.../config/properties/SocialProperties.java` |
| SocialAuthStrategy | `ruoyi-admin/.../web/service/impl/SocialAuthStrategy.java` |
| AuthController | `ruoyi-admin/.../web/controller/AuthController.java` |
| ISysSocialService | `ruoyi-modules/ruoyi-system/.../service/ISysSocialService.java` |
