---
name: sms-mail
description: |
  当需要发送短信、邮件通知时自动使用此 Skill。

  触发场景：
  - 需要发送短信验证码
  - 需要发送邮件通知（文本/HTML）
  - 需要配置短信服务商（阿里云/腾讯云/华为云等）
  - 需要配置邮件服务器（SMTP）
  - 需要实现多渠道消息通知

  触发词：短信、邮件、SMS、验证码、通知、SMS4j、MailUtils、邮件发送、短信发送、SmsBlend、SmsFactory、SMTP、模板消息
---

# 短信与邮件开发指南

> 短信模块：`ruoyi-common/ruoyi-common-sms`（SMS4j）
> 邮件模块：`ruoyi-common/ruoyi-common-mail`（Hutool JakartaMail）

---

## 一、短信开发（SMS4j）

### 1.1 配置

```yaml
sms:
  config-type: yaml   # yaml / 接口 / 数据库
  blends:
    config1:
      supplier: alibaba
      access-key-id: ${ALIYUN_SMS_ACCESS_KEY_ID}
      access-key-secret: ${ALIYUN_SMS_ACCESS_KEY_SECRET}
      signature: 若依框架
    config2:
      supplier: tencent
      access-key-id: ${TENCENT_SMS_SECRET_ID}
      access-key-secret: ${TENCENT_SMS_SECRET_KEY}
      signature: 若依框架
      sdk-app-id: "1400000000"   # 腾讯云需要
```

> 支持的服务商：alibaba / tencent / huawei / yunpian / unisms / jdcloud / cloopen / emay / ctyun
> 限流配置详见 [references/sms-config.md](references/sms-config.md)

### 1.2 核心 API

```java
import org.dromara.sms4j.api.SmsBlend;
import org.dromara.sms4j.api.entity.SmsResponse;
import org.dromara.sms4j.core.factory.SmsFactory;

// 获取短信实例
SmsBlend smsBlend = SmsFactory.getSmsBlend();            // 默认配置
SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");   // 指定配置

// 发送模板短信
Map<String, String> params = new LinkedHashMap<>();
params.put("code", "123456");
params.put("time", "5");
SmsResponse response = smsBlend.sendMessage("13800138000", "SMS_123456789", params);

// 批量发送
List<String> phones = Arrays.asList("13800138001", "13800138002");
SmsResponse response = smsBlend.sendMessage(phones, "SMS_123456789", params);

// 检查结果
if (response.isSuccess()) {
    log.info("发送成功，msgId: {}", response.getBizId());
} else {
    log.error("发送失败：{}", response.getMessage());
}
```

### 1.3 验证码短信示例

```java
@RestController
@RequestMapping("/captcha")
@RequiredArgsConstructor
public class CaptchaController {

    @GetMapping("/sms")
    public R<Void> sendSmsCode(@RequestParam String phonenumber) {
        String code = RandomUtil.randomNumbers(6);

        // 存入Redis（5分钟有效）
        RedisUtils.setCacheObject("sms:code:" + phonenumber, code, Duration.ofMinutes(5));

        // 发送短信
        Map<String, String> map = new LinkedHashMap<>();
        map.put("code", code);
        SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
        SmsResponse smsResponse = smsBlend.sendMessage(phonenumber, "SMS_123456789", map);

        if (!smsResponse.isSuccess()) {
            log.error("短信发送失败：{}", smsResponse.getMessage());
            return R.fail("短信发送失败");
        }
        return R.ok("验证码已发送");
    }

    @PostMapping("/verify")
    public R<Boolean> verifySmsCode(@RequestParam String phonenumber,
                                     @RequestParam String code) {
        String cacheKey = "sms:code:" + phonenumber;
        String cachedCode = RedisUtils.getCacheObject(cacheKey);

        if (cachedCode == null) return R.fail("验证码已过期");
        if (!cachedCode.equals(code)) return R.fail("验证码错误");

        RedisUtils.deleteObject(cacheKey);
        return R.ok(true);
    }
}
```

---

## 二、邮件开发（Hutool Mail）

### 2.1 配置

```yaml
mail:
  enabled: true
  host: smtp.163.com
  port: 465
  auth: true
  from: system@example.com
  user: system@example.com
  pass: ${MAIL_PASSWORD}        # 授权码，非登录密码
  sslEnable: true
  starttlsEnable: false
  timeout: 10000
  connectionTimeout: 10000
```

> 常用 SMTP 服务器配置详见 [references/mail-config.md](references/mail-config.md)

### 2.2 核心 API

```java
import org.dromara.common.mail.utils.MailUtils;

// 发送文本邮件
String msgId = MailUtils.sendText("to@example.com", "标题", "正文内容");

// 发送HTML邮件
String msgId = MailUtils.sendHtml("to@example.com", "标题", "<h1>内容</h1>");

// 带附件
String msgId = MailUtils.sendText("to@example.com", "标题", "正文", attachment);
String msgId = MailUtils.sendHtml("to@example.com", "标题", htmlContent, attachment);

// 带内嵌图片
Map<String, InputStream> imageMap = Map.of("logo", new FileInputStream("logo.png"));
String msgId = MailUtils.sendHtml("to@example.com", "标题",
    "<img src='cid:logo'/>", imageMap);

// 群发
String msgId = MailUtils.sendHtml(List.of("a@x.com", "b@x.com"), "标题", htmlContent);

// 抄送/密送
String msgId = MailUtils.send("to@x.com", "cc@x.com", "bcc@x.com", "标题", "内容", true);

// 获取邮件账户配置
MailAccount account = MailUtils.getMailAccount();
```

### 2.3 邮件验证码示例

```java
@Service
@RequiredArgsConstructor
public class EmailService {

    public void sendEmailCode(String email) {
        String code = RandomUtil.randomNumbers(6);
        RedisUtils.setCacheObject("email:code:" + email, code, Duration.ofMinutes(10));

        String htmlContent = String.format("""
            <div style="padding: 20px; background: #f5f5f5;">
                <h2>验证码</h2>
                <p>您的验证码是：<strong style="color: #1890ff; font-size: 24px;">%s</strong></p>
                <p>有效期10分钟，请勿泄露。</p>
            </div>
            """, code);

        try {
            MailUtils.sendHtml(email, "【若依系统】验证码", htmlContent);
        } catch (Exception e) {
            log.error("邮件发送失败：{}", e.getMessage());
            throw new ServiceException("邮件发送失败");
        }
    }

    public boolean verifyEmailCode(String email, String code) {
        String cacheKey = "email:code:" + email;
        String cachedCode = RedisUtils.getCacheObject(cacheKey);
        if (cachedCode != null && cachedCode.equals(code)) {
            RedisUtils.deleteObject(cacheKey);
            return true;
        }
        return false;
    }
}
```

---

## 三、多渠道消息通知示例

```java
@Service
@RequiredArgsConstructor
public class MessageService {

    public void sendMessage(List<String> messageType, String subject,
                           String message, List<UserDTO> userList) {
        for (UserDTO user : userList) {
            try {
                if (messageType.contains("sms") && StringUtils.isNotBlank(user.getPhone())) {
                    Map<String, String> params = new LinkedHashMap<>();
                    params.put("content", message);
                    SmsFactory.getSmsBlend("config1")
                        .sendMessage(user.getPhone(), "SMS_NOTIFY", params);
                }
                if (messageType.contains("email") && StringUtils.isNotBlank(user.getEmail())) {
                    MailUtils.sendHtml(user.getEmail(), subject,
                        "<div style='padding:20px;'><h3>" + subject + "</h3><p>" + message + "</p></div>");
                }
            } catch (Exception e) {
                log.error("消息发送失败，类型：{}，用户：{}，错误：{}",
                    messageType, user.getUserId(), e.getMessage());
            }
        }
    }
}
```

---

## 四、常见错误

```java
// ❌ 未配置就使用，getSmsBlend 返回 null → NPE
SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
smsBlend.sendMessage(...);

// ❌ 模板参数名与模板定义不匹配
params.put("verifyCode", "123456");  // 模板中是 ${code}
// ✅ params.put("code", "123456");

// ❌ 不检查发送结果
smsBlend.sendMessage(phone, templateId, params);
// ✅ SmsResponse response = smsBlend.sendMessage(...);
//    if (!response.isSuccess()) throw new ServiceException("短信发送失败");

// ❌ 验证码无过期时间
RedisUtils.setCacheObject("sms:code:" + phone, code);
// ✅ RedisUtils.setCacheObject("sms:code:" + phone, code, Duration.ofMinutes(5));
```

---

## 五、API 速查表

### 短信 API（SMS4j）

| 方法 | 说明 |
|------|------|
| `SmsFactory.getSmsBlend()` | 获取默认短信实例 |
| `SmsFactory.getSmsBlend("config1")` | 获取指定配置短信实例 |
| `smsBlend.sendMessage(phone, templateId, params)` | 发送模板短信 |
| `smsBlend.sendMessage(phones, templateId, params)` | 批量发送 |
| `response.isSuccess()` | 是否成功 |
| `response.getMessage()` | 错误信息 |
| `response.getBizId()` | 消息ID |

### 邮件 API（MailUtils）

| 方法 | 说明 |
|------|------|
| `MailUtils.sendText(to, subject, content)` | 文本邮件 |
| `MailUtils.sendHtml(to, subject, content)` | HTML邮件 |
| `MailUtils.sendText(to, subject, content, files...)` | 带附件文本邮件 |
| `MailUtils.sendHtml(to, subject, content, files...)` | 带附件HTML邮件 |
| `MailUtils.sendHtml(to, subject, content, imageMap)` | 带内嵌图片邮件 |
| `MailUtils.send(to, cc, bcc, subject, content, isHtml)` | 抄送/密送 |
| `MailUtils.sendHtml(tos, subject, content)` | 群发HTML邮件 |
| `MailUtils.getMailAccount()` | 获取邮件配置 |

---

## 六、核心文件位置

| 类型 | 位置 |
|------|------|
| 短信配置 | `ruoyi-common/ruoyi-common-sms/.../config/SmsAutoConfiguration.java` |
| 短信缓存 | `ruoyi-common/ruoyi-common-sms/.../core/dao/PlusSmsDao.java` |
| 邮件工具类 | `ruoyi-common/ruoyi-common-mail/.../utils/MailUtils.java` |
| 邮件配置 | `ruoyi-common/ruoyi-common-mail/.../config/MailConfig.java` |
| 邮件属性 | `ruoyi-common/ruoyi-common-mail/.../config/properties/MailProperties.java` |
| 验证码示例 | `ruoyi-admin/.../web/controller/CaptchaController.java` |
| 短信演示 | `ruoyi-modules/ruoyi-demo/.../controller/SmsController.java` |
| 工作流消息 | `ruoyi-modules/ruoyi-workflow/.../service/impl/FlwCommonServiceImpl.java` |
