# 数据脱敏策略完整列表（17种）

> 来源：`ruoyi-common-sensitive/.../core/SensitiveStrategy`

| 策略 | 枚举值 | 脱敏效果 | 说明 |
|------|--------|---------|------|
| 身份证 | `ID_CARD` | `110***********1234` | 保留前3位和后4位 |
| 手机号 | `PHONE` | `138****8888` | 保留前3位和后4位 |
| 邮箱 | `EMAIL` | `t**@example.com` | 保留用户名首尾和完整域名 |
| 银行卡 | `BANK_CARD` | `6222***********1234` | 保留前4位和后4位 |
| 中文姓名 | `CHINESE_NAME` | `张*` | 保留姓氏 |
| 地址 | `ADDRESS` | `北京市朝阳区****` | 保留前8个字符 |
| 固定电话 | `FIXED_PHONE` | `010****1234` | 保留区号和后4位 |
| 密码 | `PASSWORD` | `******` | 全部掩码 |
| IPv4 地址 | `IPV4` | `192.168.***.***` | 保留网络段 |
| IPv6 地址 | `IPV6` | 部分隐藏 | 保留前缀 |
| 车牌号 | `CAR_LICENSE` | `京A***12` | 支持普通和新能源 |
| 用户ID | `USER_ID` | 随机数字 | 生成随机数字替代 |
| 首字符保留 | `FIRST_MASK` | `张***` | 只显示第一个字符 |
| 通用掩码 | `STRING_MASK` | `1234**7890` | 前4+4个*+后4 |
| 高安全级别 | `MASK_HIGH_SECURITY` | `to******en` | 前2后2可见 |
| 清空 | `CLEAR` | 空字符串 | 返回空字符串 |
| 置空 | `CLEAR_TO_NULL` | `null` | 返回 null |

## 用法示例

```java
@Sensitive(strategy = SensitiveStrategy.PHONE)
private String phone;

@Sensitive(strategy = SensitiveStrategy.ID_CARD)
private String idCard;

@Sensitive(strategy = SensitiveStrategy.ADDRESS)
private String address;

@Sensitive(strategy = SensitiveStrategy.IPV4)
private String loginIp;

@Sensitive(strategy = SensitiveStrategy.CAR_LICENSE)
private String carNumber;
```
