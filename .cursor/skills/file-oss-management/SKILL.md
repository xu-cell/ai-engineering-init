---
name: file-oss-management
description: |
  当需要进行文件上传、下载、存储管理时自动使用此 Skill。支持本地存储、阿里云OSS、腾讯云COS、七牛云、MinIO等。

  触发场景：
  - 文件上传下载
  - 云存储配置
  - 预签名URL生成
  - 文件元数据管理
  - OSS服务商切换

  触发词：文件上传、OSS、云存储、MinIO、阿里云、腾讯云、七牛、图片上传、文件下载、预签名、presigned、S3
---

# 文件与云存储指南

> 统一协议：基于 AWS S3 SDK v2，兼容所有 S3 协议云服务

## 架构概述

| 组件 | 说明 |
|----|------|
| `[你的OssClient]` | 统一操作入口（基于 AWS S3 SDK v2） |
| `S3Client` | AWS SDK 底层客户端 |
| `UploadResult` | 上传结果（url, filename, eTag） |

---

## 一、S3 Client 初始化

```java
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.regions.Region;

// 通用 S3 客户端构建（兼容 MinIO / 阿里云 / 腾讯云等）
S3Client s3Client = S3Client.builder()
    .endpointOverride(URI.create(endpoint))
    .credentialsProvider(StaticCredentialsProvider.create(
        AwsBasicCredentials.create(accessKey, secretKey)))
    .region(Region.of(region))
    .forcePathStyle(true)   // MinIO 需要开启
    .build();
```

---

## 二、文件上传

### 基础上传

```java
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

// 上传文件
PutObjectRequest request = PutObjectRequest.builder()
    .bucket(bucketName)
    .key("images/photo.jpg")
    .contentType("image/jpeg")
    .build();

s3Client.putObject(request, RequestBody.fromFile(file.toPath()));

// 上传输入流
s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));

// 上传字节数组
s3Client.putObject(request, RequestBody.fromBytes(data));
```

### 封装上传服务（推荐模式）

```java
@Service
@RequiredArgsConstructor
public class OssService {

    private final S3Client s3Client;
    private final OssProperties properties;

    /**
     * 上传文件，自动生成路径
     */
    public UploadResult upload(MultipartFile file) {
        String suffix = getFileSuffix(file.getOriginalFilename());
        String key = generateObjectKey(suffix);  // 如 2026/03/07/uuid.jpg

        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(properties.getBucketName())
            .key(key)
            .contentType(file.getContentType())
            .build();

        s3Client.putObject(request,
            RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return UploadResult.builder()
            .url(properties.getDomain() + "/" + key)
            .filename(key)
            .build();
    }

    private String generateObjectKey(String suffix) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return datePath + "/" + UUID.randomUUID() + suffix;
    }
}
```

---

## 三、文件下载

```java
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.core.ResponseInputStream;

// 下载到输出流（推荐用于HTTP响应）
GetObjectRequest getRequest = GetObjectRequest.builder()
    .bucket(bucketName)
    .key("images/photo.jpg")
    .build();

ResponseInputStream<?> response = s3Client.getObject(getRequest);

// 写入 HTTP 响应
try (InputStream is = response) {
    httpResponse.setContentType("image/jpeg");
    httpResponse.setContentLengthLong(response.response().contentLength());
    is.transferTo(httpResponse.getOutputStream());
}
```

---

## 四、文件删除

```java
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
    .bucket(bucketName)
    .key("images/photo.jpg")
    .build();

s3Client.deleteObject(deleteRequest);
```

---

## 五、预签名 URL

```java
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.*;

S3Presigner presigner = S3Presigner.builder()
    .endpointOverride(URI.create(endpoint))
    .credentialsProvider(credentialsProvider)
    .region(Region.of(region))
    .build();

// 下载预签名URL
GetObjectPresignRequest getPresignRequest = GetObjectPresignRequest.builder()
    .signatureDuration(Duration.ofMinutes(60))
    .getObjectRequest(b -> b.bucket(bucketName).key("images/photo.jpg"))
    .build();
String downloadUrl = presigner.presignGetObject(getPresignRequest).url().toString();

// 上传预签名URL（前端直传）
PutObjectPresignRequest putPresignRequest = PutObjectPresignRequest.builder()
    .signatureDuration(Duration.ofHours(1))
    .putObjectRequest(b -> b.bucket(bucketName).key("images/upload.jpg"))
    .build();
String uploadUrl = presigner.presignPutObject(putPresignRequest).url().toString();
```

---

## 六、Controller 接口（设计模式）

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/oss")
public class OssController {

    private final OssService ossService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResult upload(@RequestPart("file") MultipartFile file) {
        return ossService.upload(file);
    }

    @GetMapping("/download/{id}")
    public void download(@PathVariable Long id, HttpServletResponse response) throws IOException {
        ossService.download(id, response);
    }

    @DeleteMapping("/{ids}")
    public void delete(@PathVariable List<Long> ids) {
        ossService.deleteByIds(ids);
    }
}
```

---

## 七、配置模型

```yaml
# application.yml
oss:
  endpoint: https://s3.amazonaws.com    # 或 MinIO/阿里云/腾讯云端点
  access-key: your-access-key
  secret-key: your-secret-key
  bucket-name: your-bucket
  region: us-east-1
  domain: https://cdn.example.com       # 自定义域名（可选）
```

```java
@Data
@ConfigurationProperties(prefix = "oss")
public class OssProperties {
    private String endpoint;
    private String accessKey;
    private String secretKey;
    private String bucketName;
    private String region;
    private String domain;
}
```

---

## 八、服务商对照

| 服务商 | endpoint 示例 | 备注 |
|--------|-------------|------|
| 阿里云 OSS | `https://oss-cn-hangzhou.aliyuncs.com` | S3 兼容 |
| 腾讯云 COS | `https://cos.ap-guangzhou.myqcloud.com` | S3 兼容 |
| 七牛云 | `https://s3-cn-south-1.qiniucs.com` | S3 兼容 |
| MinIO | `http://localhost:9000` | 需 `forcePathStyle(true)` |
| AWS S3 | `https://s3.amazonaws.com` | 原生支持 |

---

## 九、设计要点

1. **统一封装**：通过 S3 协议统一对接多个云服务商，切换只需改配置
2. **路径生成**：按日期+UUID生成对象路径，避免冲突
3. **私有桶**：私有桶文件通过预签名URL访问，设置合理的过期时间
4. **文件记录**：上传后保存数据库记录，关联业务数据
5. **大文件**：超过 100MB 考虑分片上传（`CreateMultipartUpload`）
6. **安全**：前端直传使用预签名URL，不暴露密钥
