# 邮件完整配置参考

## 常用 SMTP 服务器

| 邮箱服务商 | SMTP 服务器 | SSL 端口 | 非 SSL 端口 |
|-----------|-------------|---------|------------|
| 163 邮箱 | smtp.163.com | 465 | 25 |
| QQ 邮箱 | smtp.qq.com | 465 | 587 |
| 阿里企业邮箱 | smtp.mxhichina.com | 465 | 25 |
| 腾讯企业邮箱 | smtp.exmail.qq.com | 465 | 587 |
| Gmail | smtp.gmail.com | 465 | 587 |
| Outlook | smtp.office365.com | 587 | 587 |

## 完整配置示例

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

## 业务通知邮件示例

### 订单确认邮件

```java
public void sendOrderConfirmation(Order order, User user) {
    String htmlContent = String.format("""
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial;">
            <h2>订单确认</h2>
            <p>尊敬的 %s，您好！</p>
            <table style="width: 100%%; border-collapse: collapse;">
                <tr><td>订单号：</td><td>%s</td></tr>
                <tr><td>下单时间：</td><td>%s</td></tr>
                <tr><td>订单金额：</td><td>￥%s</td></tr>
            </table>
        </div>
        """,
        user.getNickName(), order.getOrderNo(),
        DateUtils.parseDateToStr("yyyy-MM-dd HH:mm:ss", order.getCreateTime()),
        order.getTotalAmount()
    );

    MailUtils.sendHtml(user.getEmail(), "【若依商城】订单确认", htmlContent);
}
```

### 密码重置邮件

```java
public void sendPasswordResetEmail(String email, String resetToken) {
    String resetUrl = "https://example.com/reset-password?token=" + resetToken;
    String htmlContent = String.format("""
        <div style="padding: 20px;">
            <h2>密码重置</h2>
            <p><a href="%s" style="color: #1890ff;">点击重置密码</a></p>
            <p>链接有效期30分钟。</p>
        </div>
        """, resetUrl);

    MailUtils.sendHtml(email, "【若依系统】密码重置", htmlContent);
}
```

### 报表邮件（带附件）

```java
public void sendReportEmail(String email, String reportName, File reportFile) {
    String htmlContent = String.format("""
        <div style="padding: 20px;">
            <h2>%s</h2>
            <p>请查看附件中的报表文件。</p>
            <p>生成时间：%s</p>
        </div>
        """, reportName, DateUtils.getTime());

    MailUtils.sendHtml(email, reportName, htmlContent, reportFile);
}
```
