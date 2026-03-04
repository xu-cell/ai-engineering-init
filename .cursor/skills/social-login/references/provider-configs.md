# 第三方登录平台配置参考

## 完整平台列表

| 平台 | source 标识 | 平台 | source 标识 |
|------|------------|------|------------|
| 钉钉 | `dingtalk` | 百度 | `baidu` |
| GitHub | `github` | Gitee | `gitee` |
| 微博 | `weibo` | Coding | `coding` |
| 开源中国 | `oschina` | 支付宝 | `alipay_wallet` |
| QQ | `qq` | 微信开放平台 | `wechat_open` |
| 微信公众号 | `wechat_mp` | 企业微信 | `wechat_enterprise` |
| 淘宝 | `taobao` | 抖音 | `douyin` |
| LinkedIn | `linkedin` | Microsoft | `microsoft` |
| 人人网 | `renren` | StackOverflow | `stack_overflow` |
| 华为 | `huawei` | GitLab | `gitlab` |
| 阿里云 | `aliyun` | MaxKey | `maxkey` |
| TopIAM | `topiam` | Gitea | `gitea` |

## 特殊平台配置

### 微软登录（需要 tenantId）

```yaml
justauth:
  type:
    microsoft:
      client-id: ${MICROSOFT_CLIENT_ID}
      client-secret: ${MICROSOFT_CLIENT_SECRET}
      redirect-uri: ${justauth.address}/social-callback?source=microsoft
      tenant-id: common  # common、organizations、consumers 或具体租户ID
```

### 企业微信（需要 agentId）

```yaml
justauth:
  type:
    wechat_enterprise:
      client-id: ${WECHAT_CORP_ID}
      client-secret: ${WECHAT_CORP_SECRET}
      redirect-uri: ${justauth.address}/social-callback?source=wechat_enterprise
      agent-id: ${WECHAT_AGENT_ID}
```

### 支付宝（需要公钥）

```yaml
justauth:
  type:
    alipay_wallet:
      client-id: ${ALIPAY_APP_ID}
      client-secret: ${ALIPAY_PRIVATE_KEY}
      redirect-uri: ${justauth.address}/social-callback?source=alipay_wallet
      alipay-public-key: ${ALIPAY_PUBLIC_KEY}
```

### QQ（支持 unionId）

```yaml
justauth:
  type:
    qq:
      client-id: ${QQ_APP_ID}
      client-secret: ${QQ_APP_KEY}
      redirect-uri: ${justauth.address}/social-callback?source=qq
      union-id: true
```

### MaxKey 单点登录

```yaml
justauth:
  type:
    maxkey:
      client-id: ${MAXKEY_CLIENT_ID}
      client-secret: ${MAXKEY_CLIENT_SECRET}
      redirect-uri: ${justauth.address}/social-callback?source=maxkey
      server-url: ${MAXKEY_SERVER_URL}
```

## 完整配置模板

```yaml
justauth:
  address: https://your-domain.com
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
```
