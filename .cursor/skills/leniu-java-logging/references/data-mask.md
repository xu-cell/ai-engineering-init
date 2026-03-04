# 日志脱敏工具方法

```java
public class DataMaskUtil {

    /**
     * 手机号脱敏：138****1234
     */
    public static String maskMobile(String mobile) {
        if (StrUtil.isBlank(mobile) || mobile.length() != 11) {
            return mobile;
        }
        return mobile.substring(0, 3) + "****" + mobile.substring(7);
    }

    /**
     * 身份证脱敏：1234**********5678
     */
    public static String maskIdCard(String idCard) {
        if (StrUtil.isBlank(idCard) || idCard.length() < 8) {
            return idCard;
        }
        return idCard.substring(0, 4) + "**********" + idCard.substring(idCard.length() - 4);
    }

    /**
     * 银行卡脱敏：6222************8888
     */
    public static String maskBankCard(String bankCard) {
        if (StrUtil.isBlank(bankCard) || bankCard.length() < 8) {
            return bankCard;
        }
        return bankCard.substring(0, 4) + "************" + bankCard.substring(bankCard.length() - 4);
    }
}
```

## 使用示例

```java
// ❌ 禁止
log.info("发送验证码, mobile:{}, code:{}", mobile, code);

// ✅ 正确
log.info("发送验证码, mobile:{}", DataMaskUtil.maskMobile(mobile));
```
