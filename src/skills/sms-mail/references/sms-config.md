# 短信完整配置参考

## 支持的服务商

| 服务商 | 配置标识 | 说明 |
|--------|---------|------|
| 阿里云 | `alibaba` | 阿里云短信服务 |
| 腾讯云 | `tencent` | 腾讯云短信（需 sdk-app-id） |
| 华为云 | `huawei` | 华为云短信 |
| 云片 | `yunpian` | 云片短信 |
| 合一 | `unisms` | 合一短信 |
| 京东云 | `jdcloud` | 京东云短信 |
| 容联云 | `cloopen` | 容联云通讯 |
| 亿美软通 | `emay` | 亿美短信 |
| 天翼云 | `ctyun` | 天翼云短信 |

## 完整配置示例

```yaml
sms:
  config-type: yaml
  # 短信拦截配置（可选）
  restricted:
    account-max: 0              # 是否开启账号维度每日上限
    minute-max: 1               # 是否开启手机号维度每分钟上限
    account-max-count: 10       # 单账号每日上限
    minute-max-count: 1         # 单手机号每分钟上限

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

## 业务通知短信示例

```java
@Service
@RequiredArgsConstructor
public class OrderNotifyService {

    public void notifyShipment(Order order) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("orderNo", order.getOrderNo());
        params.put("expressNo", order.getExpressNo());
        params.put("expressCompany", order.getExpressCompany());

        SmsBlend smsBlend = SmsFactory.getSmsBlend("config1");
        SmsResponse response = smsBlend.sendMessage(
            order.getPhone(), "SMS_SHIPMENT_NOTIFY", params);

        if (!response.isSuccess()) {
            log.error("发货通知短信发送失败，订单号：{}，错误：{}",
                order.getOrderNo(), response.getMessage());
        }
    }

    public void sendMarketingSms(List<String> phones, String content) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("content", content);

        SmsFactory.getSmsBlend("config1").sendMessage(phones, "SMS_MARKETING", params);
    }
}
```
