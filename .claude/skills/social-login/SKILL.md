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

## 概述

本框架基于 **JustAuth** 实现第三方登录，支持 20+ 种社交平台的 OAuth2 授权登录。

**核心特性**：
- ✅ 开箱即用，配置即生效
- ✅ 支持 20+ 社交平台
- ✅ Redis 状态缓存（防 CSRF）
- ✅ 多租户支持
- ✅ 账号绑定机制

---

## 一、支持的第三方平台

### 1.1 已集成平台列表

| 平台 | source 标识 | 说明 |
|------|------------|------|
| 钉钉 | `dingtalk` | 钉钉扫码登录（V2） |
| 百度 | `baidu` | 百度账号登录 |
| GitHub | `github` | GitHub OAuth |
| Gitee | `gitee` | 码云账号登录 |
| 微博 | `weibo` | 新浪微博登录 |
| Coding | `coding` | Coding 账号登录 |
| 开源中国 | `oschina` | OSChina 账号登录 |
| 支付宝 | `alipay_wallet` | 支付宝钱包登录 |
| QQ | `qq` | QQ 互联登录 |
| 微信开放平台 | `wechat_open` | 微信扫码登录 |
| 微信公众号 | `wechat_mp` | 微信公众号授权 |
| 企业微信 | `wechat_enterprise` | 企业微信扫码登录 |
| 淘宝 | `taobao` | 淘宝账号登录 |
| 抖音 | `douyin` | 抖音账号登录 |
| LinkedIn | `linkedin` | 领英账号登录 |
| Microsoft | `microsoft` | 微软账号登录 |
| 人人网 | `renren` | 人人网账号登录 |
| StackOverflow | `stack_overflow` | StackOverflow 登录 |
| 华为 | `huawei` | 华为账号登录（V3） |
| GitLab | `gitlab` | GitLab 账号登录 |
| 阿里云 | `aliyun` | 阿里云账号登录 |
| MaxKey | `maxkey` | MaxKey 单点登录 |
| TopIAM | `topiam` | TopIAM 单点登录 |
| Gitea | `gitea` | Gitea 账号登录 |

---

## 二、配置第三方登录

### 2.1 基础配置

```yaml
# application.yml
justauth:
  type:
    # GitHub 登录配置
    github:
      client-id: ${GITHUB_CLIENT_ID}
      client-secret: ${GITHUB_CLIENT_SECRET}
      redirect-uri: ${server.url}/social-callback?source=github

    # Gitee 登录配置
    gitee:
      client-id: ${GITEE_CLIENT_ID}
      client-secret: ${GITEE_CLIENT_SECRET}
      redirect-uri: ${server.url}/social-callback?source=gitee

    # 钉钉登录配置
    dingtalk:
      client-id: ${DINGTALK_APP_KEY}
      client-secret: ${DINGTALK_APP_SECRET}
      redirect-uri: ${server.url}/social-callback?source=dingtalk

    # 微信开放平台配置
    wechat_open:
      client-id: ${WECHAT_APP_ID}
      client-secret: ${WECHAT_APP_SECRET}
      redirect-uri: ${server.url}/social-callback?source=wechat_open

    # QQ 登录配置
    qq:
      client-id: ${QQ_APP_ID}
      client-secret: ${QQ_APP_KEY}
      redirect-uri: ${server.url}/social-callback?source=qq
      union-id: true  # 是否获取 unionId
```

### 2.2 特殊平台配置

#### 微软登录（需要 tenantId）

```yaml
justauth:
  type:
    microsoft:
      client-id: ${MICROSOFT_CLIENT_ID}
      client-secret: ${MICROSOFT_CLIENT_SECRET}
      redirect-uri: ${server.url}/social-callback?source=microsoft
      tenant-id: common  # common、organizations、consumers 或具体租户ID
```

#### 企业微信（需要 agentId）

```yaml
justauth:
  type:
    wechat_enterprise:
      client-id: ${WECHAT_CORP_ID}
      client-secret: ${WECHAT_CORP_SECRET}
      redirect-uri: ${server.url}/social-callback?source=wechat_enterprise
      agent-id: ${WECHAT_AGENT_ID}
```

#### 支付宝（需要公钥）

```yaml
justauth:
  type:
    alipay_wallet:
      client-id: ${ALIPAY_APP_ID}
      client-secret: ${ALIPAY_PRIVATE_KEY}
      redirect-uri: ${server.url}/social-callback?source=alipay_wallet
      alipay-public-key: ${ALIPAY_PUBLIC_KEY}
```

---

## 三、核心 API

### 3.1 SocialUtils 工具类

**位置**：`org.dromara.common.social.utils.SocialUtils`

```java
import org.dromara.common.social.utils.SocialUtils;
import org.dromara.common.social.config.properties.SocialProperties;
import me.zhyd.oauth.model.AuthResponse;
import me.zhyd.oauth.model.AuthUser;
import me.zhyd.oauth.request.AuthRequest;

// ========== 获取授权请求 ==========

// 1. 获取指定平台的授权请求对象
AuthRequest authRequest = SocialUtils.getAuthRequest("github", socialProperties);

// 2. 生成授权 URL（跳转到第三方登录页）
String authorizeUrl = authRequest.authorize("随机state");

// ========== 处理回调登录 ==========

// 3. 处理第三方回调，获取用户信息
AuthResponse<AuthUser> response = SocialUtils.loginAuth(
    "github",           // 平台标识
    code,               // 授权码
    state,              // 状态码（防 CSRF）
    socialProperties    // 配置属性
);

// 4. 检查登录结果
if (response.ok()) {
    AuthUser authUser = response.getData();
    String openId = authUser.getUuid();       // 用户唯一标识
    String nickname = authUser.getNickname(); // 昵称
    String avatar = authUser.getAvatar();     // 头像
    String source = authUser.getSource();     // 来源平台
}
```

### 3.2 AuthUser 用户信息

```java
// JustAuth 返回的用户信息
public class AuthUser {
    private String uuid;        // 第三方平台用户唯一ID
    private String username;    // 用户名
    private String nickname;    // 昵称
    private String avatar;      // 头像
    private String blog;        // 博客地址
    private String company;     // 公司
    private String location;    // 位置
    private String email;       // 邮箱
    private String remark;      // 备注
    private AuthUserGender gender;  // 性别
    private String source;      // 来源平台（github、gitee 等）
    private AuthToken token;    // Token 信息
    private Map<String, Object> rawUserInfo;  // 原始用户信息
}
```

### 3.3 状态缓存（AuthRedisStateCache）

**位置**：`org.dromara.common.social.utils.AuthRedisStateCache`

框架使用 Redis 缓存 OAuth2 state 参数，防止 CSRF 攻击：

```java
// 自动注入，无需手动操作
// 授权 URL 生成时自动存入 state
// 回调验证时自动校验 state
// 默认过期时间：3 分钟
```

---

## 四、完整登录流程

### 4.1 流程图

```
┌─────────────┐     1. 点击第三方登录      ┌─────────────┐
│   前端页面   │ ────────────────────────→ │   后端服务   │
└─────────────┘                           └─────────────┘
                                                 │
                                    2. 生成授权 URL（含 state）
                                                 │
                                                 ▼
┌─────────────┐     3. 跳转授权页面       ┌─────────────┐
│   前端页面   │ ←─────────────────────── │   后端服务   │
└─────────────┘                           └─────────────┘
       │
       │ 4. 用户在第三方平台授权
       ▼
┌─────────────┐     5. 回调（code+state）  ┌─────────────┐
│  第三方平台  │ ────────────────────────→ │   后端服务   │
└─────────────┘                           └─────────────┘
                                                 │
                                    6. 用 code 换取用户信息
                                                 │
                                    7. 查找绑定关系 / 创建用户
                                                 │
                                    8. 生成系统 Token
                                                 ▼
┌─────────────┐     9. 返回登录结果        ┌─────────────┐
│   前端页面   │ ←─────────────────────── │   后端服务   │
└─────────────┘                           └─────────────┘
```

### 4.2 后端实现示例

#### 步骤1：生成授权 URL

```java
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final SocialProperties socialProperties;

    /**
     * 获取第三方登录授权 URL
     *
     * @param source 平台标识（github、gitee、dingtalk 等）
     */
    @GetMapping("/binding/{source}")
    public R<String> authBinding(@PathVariable String source) {
        // 获取授权请求对象
        AuthRequest authRequest = SocialUtils.getAuthRequest(source, socialProperties);

        // 生成随机 state（自动存入 Redis）
        String state = AuthStateUtils.createState();

        // 生成授权 URL
        String authorizeUrl = authRequest.authorize(state);

        return R.ok("操作成功", authorizeUrl);
    }
}
```

#### 步骤2：处理回调登录

```java
@Slf4j
@Service("social" + IAuthStrategy.BASE_NAME)
@RequiredArgsConstructor
public class SocialAuthStrategy implements IAuthStrategy {

    private final SocialProperties socialProperties;
    private final ISysSocialService sysSocialService;
    private final SysUserMapper userMapper;
    private final SysLoginService loginService;

    @Override
    public LoginVo login(String body, SysClientVo client) {
        SocialLoginBody loginBody = JsonUtils.parseObject(body, SocialLoginBody.class);
        ValidatorUtils.validate(loginBody);

        // 1. 调用第三方登录，获取用户信息
        AuthResponse<AuthUser> response = SocialUtils.loginAuth(
            loginBody.getSource(),
            loginBody.getSocialCode(),
            loginBody.getSocialState(),
            socialProperties
        );

        if (!response.ok()) {
            throw new ServiceException(response.getMsg());
        }

        AuthUser authUserData = response.getData();

        // 2. 根据 authId 查找绑定关系
        String authId = authUserData.getSource() + authUserData.getUuid();
        List<SysSocialVo> list = sysSocialService.selectByAuthId(authId);

        if (CollUtil.isEmpty(list)) {
            throw new ServiceException("你还没有绑定第三方账号，绑定后才可以登录！");
        }

        // 3. 加载系统用户并生成 Token
        SysSocialVo social = list.get(0);
        LoginUser loginUser = loginService.buildLoginUser(loadUser(social.getUserId()));

        // 4. 登录并返回 Token
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

### 4.3 账号绑定实现

绑定入口：`AuthController.socialCallback()` → `SysLoginService.socialRegister()`

```java
// 位置：ruoyi-admin/.../web/controller/AuthController.java

/**
 * 前端回调绑定授权(需要token)
 */
@PostMapping("/social/callback")
public R<Void> socialCallback(@RequestBody SocialLoginBody loginBody) {
    StpUtil.checkLogin();
    AuthResponse<AuthUser> response = SocialUtils.loginAuth(
        loginBody.getSource(), loginBody.getSocialCode(),
        loginBody.getSocialState(), socialProperties);
    if (!response.ok()) {
        return R.fail(response.getMsg());
    }
    loginService.socialRegister(response.getData());
    return R.ok();
}
```

```java
// 位置：ruoyi-admin/.../web/service/SysLoginService.java

/**
 * 绑定第三方用户
 */
@Lock4j
public void socialRegister(AuthUser authUserData) {
    String authId = authUserData.getSource() + authUserData.getUuid();
    // 第三方用户信息转 BO
    SysSocialBo bo = BeanUtil.toBean(authUserData, SysSocialBo.class);
    BeanUtil.copyProperties(authUserData.getToken(), bo);
    Long userId = LoginHelper.getUserId();
    bo.setUserId(userId);
    bo.setAuthId(authId);
    bo.setOpenId(authUserData.getUuid());
    bo.setUserName(authUserData.getUsername());
    bo.setNickName(authUserData.getNickname());

    // 检查是否已被其他用户绑定
    List<SysSocialVo> checkList = sysSocialService.selectByAuthId(authId);
    if (CollUtil.isNotEmpty(checkList)) {
        throw new ServiceException("此三方账号已经被绑定!");
    }
    // 查询当前用户是否已绑定该平台
    SysSocialBo params = new SysSocialBo();
    params.setUserId(userId);
    params.setSource(bo.getSource());
    List<SysSocialVo> list = sysSocialService.queryList(params);
    if (CollUtil.isEmpty(list)) {
        sysSocialService.insertByBo(bo);    // 新增绑定
    } else {
        bo.setId(list.get(0).getId());
        sysSocialService.updateByBo(bo);    // 更新绑定
    }
}
```

解绑入口：`AuthController.unlockSocial()`

```java
// 位置：ruoyi-admin/.../web/controller/AuthController.java

/**
 * 取消授权(需要token)
 */
@DeleteMapping(value = "/unlock/{socialId}")
public R<Void> unlockSocial(@PathVariable Long socialId) {
    StpUtil.checkLogin();
    Boolean rows = socialUserService.deleteWithValidById(socialId);
    return rows ? R.ok() : R.fail("取消授权失败");
}
```

---

## 五、前端集成

### 5.1 跳转第三方授权

```javascript
// 获取授权 URL
async function getSocialLoginUrl(source) {
    const { data } = await request.get(`/auth/binding/${source}`);
    // 跳转到第三方授权页面
    window.location.href = data;
}

// 点击登录按钮
function handleGitHubLogin() {
    getSocialLoginUrl('github');
}

function handleWeChatLogin() {
    getSocialLoginUrl('wechat_open');
}
```

### 5.2 处理回调

```javascript
// 回调页面 social-callback.vue
export default {
    async mounted() {
        const { source, code, state } = this.$route.query;

        if (!code || !state) {
            this.$message.error('授权失败');
            return;
        }

        try {
            // 调用后端登录接口
            const { data } = await request.post('/auth/login', {
                grantType: 'social',
                source: source,
                socialCode: code,
                socialState: state,
                clientId: 'your-client-id'
            });

            // 保存 Token
            setToken(data.accessToken);

            // 跳转首页
            this.$router.push('/');
        } catch (error) {
            this.$message.error(error.message || '登录失败');
        }
    }
}
```

---

## 六、常见错误与最佳实践

### ❌ 错误1：回调地址配置错误

```yaml
# ❌ 错误：回调地址与第三方平台配置不一致
justauth:
  type:
    github:
      redirect-uri: http://localhost:8080/callback  # 本地地址

# ✅ 正确：使用与第三方平台一致的回调地址
justauth:
  type:
    github:
      redirect-uri: https://your-domain.com/social-callback?source=github
```

### ❌ 错误2：未处理 state 验证失败

```java
// ❌ 错误：不检查响应结果
AuthResponse<AuthUser> response = SocialUtils.loginAuth(...);
AuthUser user = response.getData();  // 可能为 null

// ✅ 正确：先检查响应状态
AuthResponse<AuthUser> response = SocialUtils.loginAuth(...);
if (!response.ok()) {
    throw new ServiceException("授权失败：" + response.getMsg());
}
AuthUser user = response.getData();
```

### ❌ 错误3：未处理账号未绑定情况

```java
// ❌ 错误：直接使用绑定关系
List<SysSocialVo> list = sysSocialService.selectByAuthId(authId);
SysSocialVo social = list.get(0);  // 可能 IndexOutOfBoundsException

// ✅ 正确：检查是否已绑定
List<SysSocialVo> list = sysSocialService.selectByAuthId(authId);
if (CollUtil.isEmpty(list)) {
    throw new ServiceException("请先绑定第三方账号");
}
SysSocialVo social = list.get(0);
```

### ❌ 错误4：source 标识拼写错误

```java
// ❌ 错误：使用错误的 source 标识
SocialUtils.getAuthRequest("wechat", socialProperties);  // 不存在

// ✅ 正确：使用正确的 source 标识
SocialUtils.getAuthRequest("wechat_open", socialProperties);   // 微信开放平台
SocialUtils.getAuthRequest("wechat_mp", socialProperties);     // 微信公众号
SocialUtils.getAuthRequest("wechat_enterprise", socialProperties);  // 企业微信
```

---

## 七、API 速查表

### SocialUtils 方法

| 方法 | 说明 |
|------|------|
| `getAuthRequest(source, properties)` | 获取指定平台的授权请求对象 |
| `loginAuth(source, code, state, properties)` | 处理回调登录，获取用户信息 |

### AuthRequest 方法

| 方法 | 说明 |
|------|------|
| `authorize(state)` | 生成授权 URL |
| `login(callback)` | 执行登录，获取用户信息 |
| `refresh(token)` | 刷新 Token |
| `revoke(token)` | 撤销授权 |

### AuthUser 属性

| 属性 | 说明 |
|------|------|
| `uuid` | 第三方平台用户唯一ID |
| `username` | 用户名 |
| `nickname` | 昵称 |
| `avatar` | 头像 URL |
| `email` | 邮箱 |
| `source` | 来源平台标识 |
| `token` | Token 信息（accessToken、refreshToken 等） |
| `rawUserInfo` | 原始用户信息（Map） |

---

## 八、配置参考

### 完整配置示例

```yaml
justauth:
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

    qq:
      client-id: ${QQ_APP_ID:}
      client-secret: ${QQ_APP_KEY:}
      redirect-uri: ${justauth.address}/social-callback?source=qq
      union-id: true

    wechat_open:
      client-id: ${WECHAT_OPEN_APP_ID:}
      client-secret: ${WECHAT_OPEN_APP_SECRET:}
      redirect-uri: ${justauth.address}/social-callback?source=wechat_open

    wechat_mp:
      client-id: ${WECHAT_MP_APP_ID:}
      client-secret: ${WECHAT_MP_APP_SECRET:}
      redirect-uri: ${justauth.address}/social-callback?source=wechat_mp

    maxkey:
      client-id: ${MAXKEY_CLIENT_ID:}
      client-secret: ${MAXKEY_CLIENT_SECRET:}
      redirect-uri: ${justauth.address}/social-callback?source=maxkey
      server-url: ${MAXKEY_SERVER_URL:}

  # 授权回调地址前缀
  address: https://your-domain.com
```

---

## 九、参考代码位置

| 类型 | 位置 |
|------|------|
| 社交登录工具类 | `ruoyi-common/ruoyi-common-social/src/main/java/org/dromara/common/social/utils/SocialUtils.java` |
| 状态缓存 | `ruoyi-common/ruoyi-common-social/src/main/java/org/dromara/common/social/utils/AuthRedisStateCache.java` |
| 配置属性 | `ruoyi-common/ruoyi-common-social/src/main/java/org/dromara/common/social/config/properties/SocialProperties.java` |
| 登录配置属性 | `ruoyi-common/ruoyi-common-social/src/main/java/org/dromara/common/social/config/properties/SocialLoginConfigProperties.java` |
| 社交登录策略 | `ruoyi-admin/src/main/java/org/dromara/web/service/impl/SocialAuthStrategy.java` |
| 认证控制器 | `ruoyi-admin/src/main/java/org/dromara/web/controller/AuthController.java` |
| 社交绑定服务 | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/ISysSocialService.java` |

---

## 十、扩展：自定义第三方平台

如需接入框架未支持的第三方平台，可参考 `AuthGiteaRequest` 实现：

```java
public class AuthCustomRequest extends AuthDefaultRequest {

    public AuthCustomRequest(AuthConfig config, AuthStateCache stateCache) {
        super(config, AuthCustomSource.CUSTOM, stateCache);
    }

    @Override
    protected AuthToken getAccessToken(AuthCallback authCallback) {
        // 实现获取 Token 的逻辑
    }

    @Override
    protected AuthUser getUserInfo(AuthToken authToken) {
        // 实现获取用户信息的逻辑
    }
}
```

然后在 `SocialUtils.getAuthRequest()` 中添加对应的 case 分支。
