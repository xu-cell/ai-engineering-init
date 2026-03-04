# 数据加密详细配置

## 加密配置（application.yml）

```yaml
mybatis-encryptor:
  enable: true
  algorithm: AES
  password: your-aes-key-16bit    # AES 密钥（16/24/32位）
  encode: BASE64
  publicKey: xxx                  # RSA 公钥
  privateKey: xxx                 # RSA 私钥
```

## EncryptUtils 工具类

```java
import org.dromara.common.encrypt.utils.EncryptUtils;

// AES
String encrypted = EncryptUtils.encryptByAes(data, aesKey);
String decrypted = EncryptUtils.decryptByAes(encrypted, aesKey);

// RSA（公钥加密，私钥解密）
String encrypted = EncryptUtils.encryptByRsa(data, publicKey);
String decrypted = EncryptUtils.decryptByRsa(encrypted, privateKey);

// SM2 国密
String encrypted = EncryptUtils.encryptBySm2(data, publicKey);
String decrypted = EncryptUtils.decryptBySm2(encrypted, privateKey);

// SM4 国密
String encrypted = EncryptUtils.encryptBySm4(data, sm4Key);
String decrypted = EncryptUtils.decryptBySm4(encrypted, sm4Key);

// BASE64
String encoded = EncryptUtils.encryptByBase64(data);
String decoded = EncryptUtils.decryptByBase64(encoded);
```

## 字段加密完整示例

```java
import org.dromara.common.encrypt.annotation.EncryptField;
import org.dromara.common.encrypt.enumd.AlgorithmType;
import org.dromara.common.encrypt.enumd.EncodeType;

public class User {
    @EncryptField                                                          // 使用全局配置
    private String password;

    @EncryptField(algorithm = AlgorithmType.AES)                          // AES
    private String idCard;

    @EncryptField(algorithm = AlgorithmType.SM4)                          // SM4
    private String phone;

    @EncryptField(algorithm = AlgorithmType.AES, encode = EncodeType.HEX) // AES + HEX 编码
    private String bankCard;
}
```

## @RateLimiter 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | String | `""` | 限流 key，支持 SpEL |
| `time` | int | `60` | 时间窗口（秒） |
| `count` | int | `100` | 最大请求次数 |
| `limitType` | LimitType | `DEFAULT` | 限流类型（DEFAULT/IP/CLUSTER） |
| `message` | String | 国际化 key | 错误提示 |
| `timeout` | int | `86400` | Redis 超时时间（秒） |

## @RepeatSubmit 注解参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `interval` | int | `5000` | 间隔时间 |
| `timeUnit` | TimeUnit | `MILLISECONDS` | 时间单位 |
| `message` | String | 国际化 key | 错误提示 |

## 文件上传安全模板

```java
private static final Set<String> ALLOWED_TYPES = Set.of(
    "image/jpeg", "image/png", "image/gif", "image/webp"
);
private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

public void uploadFile(MultipartFile file) {
    if (!ALLOWED_TYPES.contains(file.getContentType())) {
        throw new ServiceException("不支持的文件类型");
    }
    if (file.getSize() > MAX_FILE_SIZE) {
        throw new ServiceException("文件大小不能超过10MB");
    }
    String extension = getExtension(file.getOriginalFilename());
    if (!Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp").contains(extension.toLowerCase())) {
        throw new ServiceException("不支持的文件扩展名");
    }
    String newName = UUID.randomUUID() + extension; // 重命名防路径穿越
}
```
