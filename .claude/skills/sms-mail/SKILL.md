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

> **适用模块**：`ruoyi-common-sms`（SMS4j）、`ruoyi-common-mail`（Hutool Mail）

## 概述

本框架提供两种消息通知方案：

| 方案 | 模块 | 技术栈 | 适用场景 |
|------|------|--------|---------|
| **短信** | `ruoyi-common-sms` | SMS4j | 验证码、营销短信、通知短信 |
| **邮件** | `ruoyi-common-mail` | Hutool JakartaMail | 系统通知、报表发送、验证邮件 |

**共同特性**：
- ✅ 多供应商支持
- ✅ 模板消息
- ✅ 配置热更新

---

## 一、短信开发指南（SMS4j）

### 1.1 支持的短信服务商

SMS4j 支持多种短信服务商，开箱即用：

| 服务商 | 配置标识 | 说明 |
|--------|---------|------|
| 阿里云 | `alibaba` | 阿里云短信服务 |
| 腾讯云 | `tencent` | 腾讯云短信 |
| 华为云 | `huawei` | 华为云短信 |
| 云片 | `yunpian` | 云片短信 |
| 合一 | `unisms` | 合一短信 |
| 京东云 | `jdcloud` | 京东云短信 |
| 容联云 | `cloopen` | 容联云通讯 |
| 亿美软通 | `emay` | 亿美短信 |
| 天翼云 | `ctyun` | 天翼云短信 |

### 1.2 配置短信服务

```yaml
# application.yml
sms:
  # 配置源类型：yaml（默认）、接口、数据库
  config-type: yaml

  # 短信配置列表
  blends:
    # 配置标识（可自定义，用于 SmsFactory.getSmsBlend("config1")）
    config1:
      # 供应商类型
      supplier: alibaba
      # AccessKey ID
      access-key-id: your-access-key-id
      # AccessKey Secret
      access-key-secret: your-access-key-secret
      # 短信签名
      signature: 若依框架
      # SDK AppId（腾讯云需要）
      sdk-app-id: ""

    # 可配置多个供应商
    config2:
      supplier: tencent
      access-key-id: your-tencent-secret-id
      access-key-secret: your-tencent-secret-key
      signature: 若依框架
      sdk-app-id: "1400000000"
```

### 1.3 核心 API：SmsBlend

**位置**：`org.dromara.sms4j.api.SmsBlend`（SMS4j 库）

```java
import org.dromara.sms4j.api.SmsBlend;
import org.dromara.sms4j.api.entity.SmsResponse;
import org.dromara.sms4j.core.factory.SmsFactory;

// ========== 获取短信实例 ==========

// 1. 获取默认配置的短信实例
SmsBlend smsBlend = SmsFactory.getSmsBlend();

// 2. 获取指定配置的短信实例
SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");  // 阿里云
SmsBlend smsBlend = SmsFactory.getSmsBlend("config2");  // 腾讯云

// ========== 发送短信 ==========

// 3. 发送模板短信（推荐）
Map<String, String> templateParams = new LinkedHashMap<>();
templateParams.put("code", "123456");
templateParams.put("time", "5");

SmsResponse response = smsBlend.sendMessage(
    "13800138000",           // 手机号
    "SMS_123456789",         // 模板ID
    templateParams           // 模板参数
);

// 4. 检查发送结果
if (response.isSuccess()) {
    log.info("短信发送成功，msgId: {}", response.getBizId());
} else {
    log.error("短信发送失败：{}", response.getMessage());
}

// 5. 批量发送短信
List<String> phones = Arrays.asList("13800138001", "13800138002");
SmsResponse response = smsBlend.sendMessage(phones, "SMS_123456789", templateParams);
```

### 1.4 发送验证码短信示例

```java
@RestController
@RequestMapping("/captcha")
@RequiredArgsConstructor
public class CaptchaController {

    private final RedisUtils redisUtils;

    /**
     * 发送短信验证码
     */
    @GetMapping("/sms")
    public R<Void> sendSmsCode(@RequestParam String phonenumber) {
        // 1. 生成验证码
        String code = RandomUtil.randomNumbers(6);

        // 2. 存入 Redis（5分钟有效）
        String cacheKey = "sms:code:" + phonenumber;
        RedisUtils.setCacheObject(cacheKey, code, Duration.ofMinutes(5));

        // 3. 构建模板参数
        Map<String, String> map = new LinkedHashMap<>();
        map.put("code", code);

        // 4. 发送短信
        String templateId = "SMS_123456789";  // 短信模板ID
        SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
        SmsResponse smsResponse = smsBlend.sendMessage(phonenumber, templateId, map);

        // 5. 处理结果
        if (!smsResponse.isSuccess()) {
            log.error("短信发送失败：{}", smsResponse.getMessage());
            return R.fail("短信发送失败");
        }

        return R.ok("验证码已发送");
    }

    /**
     * 验证短信验证码
     */
    @PostMapping("/verify")
    public R<Boolean> verifySmsCode(@RequestParam String phonenumber,
                                     @RequestParam String code) {
        String cacheKey = "sms:code:" + phonenumber;
        String cachedCode = RedisUtils.getCacheObject(cacheKey);

        if (cachedCode == null) {
            return R.fail("验证码已过期");
        }

        if (!cachedCode.equals(code)) {
            return R.fail("验证码错误");
        }

        // 验证成功，删除缓存
        RedisUtils.deleteObject(cacheKey);
        return R.ok(true);
    }
}
```

### 1.5 业务通知短信示例

```java
@Service
@RequiredArgsConstructor
public class OrderNotifyService {

    /**
     * 订单发货通知
     */
    public void notifyShipment(Order order) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("orderNo", order.getOrderNo());
        params.put("expressNo", order.getExpressNo());
        params.put("expressCompany", order.getExpressCompany());

        SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
        SmsResponse response = smsBlend.sendMessage(
            order.getPhone(),
            "SMS_SHIPMENT_NOTIFY",  // 发货通知模板
            params
        );

        if (!response.isSuccess()) {
            log.error("发货通知短信发送失败，订单号：{}，错误：{}",
                order.getOrderNo(), response.getMessage());
        }
    }

    /**
     * 批量发送营销短信
     */
    public void sendMarketingSms(List<String> phones, String content) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("content", content);

        SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
        SmsResponse response = smsBlend.sendMessage(
            phones,
            "SMS_MARKETING",
            params
        );

        log.info("营销短信发送结果：成功={}, 消息={}",
            response.isSuccess(), response.getMessage());
    }
}
```

---

## 二、邮件开发指南（Hutool Mail）

### 2.1 配置邮件服务

```yaml
# application.yml
mail:
  enabled: true
  # SMTP 服务器
  host: smtp.163.com
  # SMTP 端口
  port: 465
  # 是否需要认证
  auth: true
  # 发件人邮箱
  from: xxx@163.com
  # 用户名（通常与发件人相同）
  user: xxx@163.com
  # 密码（授权码，非登录密码）
  pass: your-smtp-password
  # 使用 SSL
  sslEnable: true
  # 使用 STARTTLS
  starttlsEnable: false
  # 超时时间（毫秒）
  timeout: 10000
  connectionTimeout: 10000
```

### 2.2 常用 SMTP 服务器配置

| 邮箱服务商 | SMTP 服务器 | SSL 端口 | 非 SSL 端口 |
|-----------|-------------|---------|------------|
| 163 邮箱 | smtp.163.com | 465 | 25 |
| QQ 邮箱 | smtp.qq.com | 465 | 587 |
| 阿里企业邮箱 | smtp.mxhichina.com | 465 | 25 |
| 腾讯企业邮箱 | smtp.exmail.qq.com | 465 | 587 |
| Gmail | smtp.gmail.com | 465 | 587 |
| Outlook | smtp.office365.com | 587 | 587 |

### 2.3 核心工具类：MailUtils

**位置**：`org.dromara.common.mail.utils.MailUtils`

```java
import org.dromara.common.mail.utils.MailUtils;

// ========== 发送文本邮件 ==========

// 1. 发送简单文本邮件
String messageId = MailUtils.sendText(
    "recipient@example.com",    // 收件人
    "邮件标题",                  // 标题
    "这是邮件正文内容"            // 正文
);

// 2. 发送文本邮件（带附件）
File attachment = new File("/path/to/file.pdf");
String messageId = MailUtils.sendText(
    "recipient@example.com",
    "带附件的邮件",
    "请查看附件",
    attachment
);

// ========== 发送 HTML 邮件 ==========

// 3. 发送 HTML 邮件
String htmlContent = """
    <h1>欢迎注册</h1>
    <p>您的验证码是：<strong>123456</strong></p>
    <p>有效期5分钟</p>
    """;

String messageId = MailUtils.sendHtml(
    "recipient@example.com",
    "验证码邮件",
    htmlContent
);

// 4. 发送 HTML 邮件（带内嵌图片）
Map<String, InputStream> imageMap = new HashMap<>();
imageMap.put("logo", new FileInputStream("/path/to/logo.png"));

String htmlWithImage = """
    <h1>欢迎使用若依系统</h1>
    <img src="cid:logo" alt="Logo"/>
    """;

String messageId = MailUtils.sendHtml(
    "recipient@example.com",
    "带图片的邮件",
    htmlWithImage,
    imageMap
);

// ========== 发送给多人 ==========

// 5. 发送给多个收件人
List<String> recipients = Arrays.asList(
    "user1@example.com",
    "user2@example.com"
);

String messageId = MailUtils.sendHtml(
    recipients,
    "群发邮件",
    "<p>这是群发的邮件内容</p>"
);

// 6. 发送邮件（带抄送、密送）
String messageId = MailUtils.send(
    "recipient@example.com",     // 收件人
    "cc@example.com",            // 抄送人
    "bcc@example.com",           // 密送人
    "重要通知",                   // 标题
    "<p>这是重要通知内容</p>",    // 正文
    true                         // 是否 HTML
);
```

### 2.4 邮件验证码示例

```java
@Service
@RequiredArgsConstructor
public class EmailService {

    /**
     * 发送邮箱验证码
     */
    public void sendEmailCode(String email) {
        // 1. 生成验证码
        String code = RandomUtil.randomNumbers(6);

        // 2. 存入 Redis
        String cacheKey = "email:code:" + email;
        RedisUtils.setCacheObject(cacheKey, code, Duration.ofMinutes(10));

        // 3. 构建邮件内容
        String htmlContent = String.format("""
            <div style="padding: 20px; background: #f5f5f5;">
                <h2>验证码</h2>
                <p>您的验证码是：<strong style="color: #1890ff; font-size: 24px;">%s</strong></p>
                <p>有效期10分钟，请勿泄露给他人。</p>
                <p style="color: #999;">如非本人操作，请忽略此邮件。</p>
            </div>
            """, code);

        // 4. 发送邮件
        try {
            MailUtils.sendHtml(email, "【若依系统】验证码", htmlContent);
            log.info("验证码邮件发送成功：{}", email);
        } catch (Exception e) {
            log.error("验证码邮件发送失败：{}", e.getMessage());
            throw new ServiceException("邮件发送失败");
        }
    }

    /**
     * 验证邮箱验证码
     */
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

### 2.5 业务通知邮件示例

```java
@Service
@RequiredArgsConstructor
public class NotificationService {

    /**
     * 发送订单确认邮件
     */
    public void sendOrderConfirmation(Order order, User user) {
        String htmlContent = String.format("""
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial;">
                <h2>订单确认</h2>
                <p>尊敬的 %s，您好！</p>
                <p>您的订单已确认，订单信息如下：</p>
                <table style="width: 100%%; border-collapse: collapse;">
                    <tr><td>订单号：</td><td>%s</td></tr>
                    <tr><td>下单时间：</td><td>%s</td></tr>
                    <tr><td>订单金额：</td><td>￥%s</td></tr>
                </table>
                <p>感谢您的购买！</p>
            </div>
            """,
            user.getNickName(),
            order.getOrderNo(),
            DateUtils.parseDateToStr("yyyy-MM-dd HH:mm:ss", order.getCreateTime()),
            order.getTotalAmount()
        );

        MailUtils.sendHtml(user.getEmail(), "【若依商城】订单确认", htmlContent);
    }

    /**
     * 发送密码重置邮件
     */
    public void sendPasswordResetEmail(String email, String resetToken) {
        String resetUrl = "https://example.com/reset-password?token=" + resetToken;

        String htmlContent = String.format("""
            <div style="padding: 20px;">
                <h2>密码重置</h2>
                <p>您正在重置密码，请点击下方链接完成操作：</p>
                <p><a href="%s" style="color: #1890ff;">点击重置密码</a></p>
                <p>链接有效期30分钟。</p>
                <p style="color: #999;">如非本人操作，请忽略此邮件。</p>
            </div>
            """, resetUrl);

        MailUtils.sendHtml(email, "【若依系统】密码重置", htmlContent);
    }

    /**
     * 发送报表邮件（带附件）
     */
    public void sendReportEmail(String email, String reportName, File reportFile) {
        String htmlContent = String.format("""
            <div style="padding: 20px;">
                <h2>%s</h2>
                <p>请查看附件中的报表文件。</p>
                <p>报表生成时间：%s</p>
            </div>
            """, reportName, DateUtils.getTime());

        MailUtils.sendHtml(email, reportName, htmlContent, reportFile);
    }
}
```

---

## 三、多渠道消息通知

### 3.1 统一消息服务

```java
@Service
@RequiredArgsConstructor
public class MessageService {

    /**
     * 消息类型枚举
     */
    public enum MessageType {
        SMS,    // 短信
        EMAIL,  // 邮件
        WECHAT, // 微信（需额外实现）
        SITE    // 站内信（需额外实现）
    }

    /**
     * 发送多渠道消息
     */
    public void sendMessage(List<MessageType> types, String userId,
                           String subject, String content) {
        // 获取用户信息
        SysUser user = userService.selectUserById(Long.valueOf(userId));

        for (MessageType type : types) {
            try {
                switch (type) {
                    case SMS -> sendSms(user.getPhonenumber(), content);
                    case EMAIL -> sendEmail(user.getEmail(), subject, content);
                    // case WECHAT -> sendWechat(user.getOpenId(), content);
                    // case SITE -> sendSiteMessage(userId, subject, content);
                }
            } catch (Exception e) {
                log.error("消息发送失败，类型：{}，用户：{}，错误：{}",
                    type, userId, e.getMessage());
            }
        }
    }

    private void sendSms(String phone, String content) {
        if (StringUtils.isBlank(phone)) return;

        Map<String, String> params = new LinkedHashMap<>();
        params.put("content", content);

        SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
        smsBlend.sendMessage(phone, "SMS_NOTIFY", params);
    }

    private void sendEmail(String email, String subject, String content) {
        if (StringUtils.isBlank(email)) return;

        MailUtils.sendHtml(email, subject,
            "<div style='padding:20px;'>" + content + "</div>");
    }
}
```

### 3.2 工作流消息通知示例

```java
/**
 * 工作流消息服务（参考框架实现）
 */
@Service
@RequiredArgsConstructor
public class FlwCommonServiceImpl implements IFlwCommonService {

    /**
     * 发送审批通知
     */
    @Override
    public void sendMessage(List<String> messageType, String message,
                           String subject, List<UserDTO> userList) {
        if (CollUtil.isEmpty(messageType) || CollUtil.isEmpty(userList)) {
            return;
        }

        for (UserDTO user : userList) {
            // 短信通知
            if (messageType.contains("sms") && StringUtils.isNotBlank(user.getPhone())) {
                Map<String, String> params = new LinkedHashMap<>();
                params.put("content", message);

                SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
                smsBlend.sendMessage(user.getPhone(), "SMS_APPROVAL", params);
            }

            // 邮件通知
            if (messageType.contains("email") && StringUtils.isNotBlank(user.getEmail())) {
                String htmlContent = String.format("""
                    <div style="padding: 20px;">
                        <h3>%s</h3>
                        <p>%s</p>
                        <p>请登录系统处理。</p>
                    </div>
                    """, subject, message);

                MailUtils.sendHtml(user.getEmail(), subject, htmlContent);
            }
        }
    }
}
```

---

## 四、常见错误与最佳实践

### ❌ 错误1：未配置短信/邮件服务就使用

```java
// ❌ 错误：未配置 sms.blends 就调用
SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");  // 返回 null
smsBlend.sendMessage(...);  // NullPointerException
```

```yaml
# ✅ 正确：先配置
sms:
  blends:
    config1:
      supplier: alibaba
      access-key-id: xxx
      access-key-secret: xxx
      signature: 若依框架
```

### ❌ 错误2：邮箱使用登录密码而非授权码

```yaml
# ❌ 错误：使用登录密码
mail:
  pass: my-login-password  # 错误！

# ✅ 正确：使用授权码（在邮箱设置中生成）
mail:
  pass: ABCDEFGHIJKLMNOP  # 授权码
```

### ❌ 错误3：短信模板参数与模板不匹配

```java
// ❌ 错误：参数名与模板中定义的不一致
Map<String, String> params = new LinkedHashMap<>();
params.put("verifyCode", "123456");  // 模板中是 ${code}

// ✅ 正确：参数名要与模板一致
Map<String, String> params = new LinkedHashMap<>();
params.put("code", "123456");  // 匹配模板 ${code}
```

### ❌ 错误4：未处理发送失败的情况

```java
// ❌ 错误：直接发送，不处理结果
SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
smsBlend.sendMessage(phone, templateId, params);
// 如果失败，用户无感知

// ✅ 正确：检查发送结果
SmsResponse response = smsBlend.sendMessage(phone, templateId, params);
if (!response.isSuccess()) {
    log.error("短信发送失败：{}", response.getMessage());
    throw new ServiceException("短信发送失败，请稍后重试");
}
```

### ❌ 错误5：验证码明文存储或无过期时间

```java
// ❌ 错误：无过期时间
RedisUtils.setCacheObject("sms:code:" + phone, code);  // 永不过期

// ✅ 正确：设置合理的过期时间
RedisUtils.setCacheObject("sms:code:" + phone, code, Duration.ofMinutes(5));
```

---

## 五、API 速查表

### 短信 API（SMS4j）

| 方法 | 说明 |
|------|------|
| `SmsFactory.getSmsBlend()` | 获取默认短信实例 |
| `SmsFactory.getSmsBlend("config1")` | 获取指定配置的短信实例 |
| `smsBlend.sendMessage(phone, templateId, params)` | 发送模板短信 |
| `smsBlend.sendMessage(phones, templateId, params)` | 批量发送短信 |
| `response.isSuccess()` | 检查是否发送成功 |
| `response.getMessage()` | 获取错误信息 |
| `response.getBizId()` | 获取消息ID |

### 邮件 API（MailUtils）

| 方法 | 说明 |
|------|------|
| `MailUtils.sendText(to, subject, content)` | 发送文本邮件 |
| `MailUtils.sendHtml(to, subject, content)` | 发送 HTML 邮件 |
| `MailUtils.sendText(to, subject, content, files...)` | 发送带附件的文本邮件 |
| `MailUtils.sendHtml(to, subject, content, files...)` | 发送带附件的 HTML 邮件 |
| `MailUtils.sendHtml(to, subject, content, imageMap)` | 发送带内嵌图片的邮件 |
| `MailUtils.send(to, cc, bcc, subject, content, isHtml)` | 发送带抄送/密送的邮件 |
| `MailUtils.sendHtml(tos, subject, content)` | 群发 HTML 邮件 |
| `MailUtils.getMailAccount()` | 获取邮件账户配置 |

---

## 六、配置参考

### 短信完整配置

```yaml
sms:
  # 配置源类型：yaml、接口、数据库
  config-type: yaml
  # 短信拦截配置（可选）
  restricted:
    # 是否开启账号维度的每日发送上限
    account-max: 0
    # 是否开启手机号维度的每分钟发送上限
    minute-max: 1
    # 单账号每日发送上限
    account-max-count: 10
    # 单手机号每分钟发送上限
    minute-max-count: 1

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
      sdk-app-id: "1400000000"
```

### 邮件完整配置

```yaml
mail:
  enabled: true
  host: smtp.163.com
  port: 465
  auth: true
  from: system@example.com
  user: system@example.com
  pass: ${MAIL_PASSWORD}
  sslEnable: true
  starttlsEnable: false
  timeout: 10000
  connectionTimeout: 10000
```

---

## 七、参考代码位置

| 类型 | 位置 |
|------|------|
| 短信配置 | `ruoyi-common/ruoyi-common-sms/src/main/java/org/dromara/common/sms/config/SmsAutoConfiguration.java` |
| 短信缓存 | `ruoyi-common/ruoyi-common-sms/src/main/java/org/dromara/common/sms/core/dao/PlusSmsDao.java` |
| 邮件工具类 | `ruoyi-common/ruoyi-common-mail/src/main/java/org/dromara/common/mail/utils/MailUtils.java` |
| 邮件配置 | `ruoyi-common/ruoyi-common-mail/src/main/java/org/dromara/common/mail/config/MailConfig.java` |
| 邮件属性 | `ruoyi-common/ruoyi-common-mail/src/main/java/org/dromara/common/mail/config/properties/MailProperties.java` |
| 验证码示例 | `ruoyi-admin/src/main/java/org/dromara/web/controller/CaptchaController.java` |
| 短信演示 | `ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/controller/SmsController.java` |
| 工作流消息 | `ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/service/impl/FlwCommonServiceImpl.java` |
