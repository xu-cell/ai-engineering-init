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

  触发词：文件上传、OSS、云存储、MinIO、阿里云、腾讯云、七牛、图片上传、文件下载、预签名、presigned、OssClient、OssFactory
---

# 文件与云存储指南

> 模块位置：`ruoyi-common/ruoyi-common-oss`
> 统一协议：基于 AWS S3 SDK v2，兼容所有 S3 协议云服务

## 核心类

| 类 | 说明 |
|----|------|
| `OssFactory` | 获取 OssClient 实例（只有2个方法） |
| `OssClient` | 统一操作入口（基于 AWS S3 SDK v2） |
| `UploadResult` | 上传结果（url, filename, eTag） |
| `ISysOssService` | OSS 文件管理服务接口 |

---

## 一、获取 OssClient

```java
import org.dromara.common.oss.factory.OssFactory;
import org.dromara.common.oss.core.OssClient;

OssClient client = OssFactory.instance();            // 默认配置
OssClient client = OssFactory.instance("aliyun");    // 指定配置（字符串，非枚举）
OssClient client = OssFactory.instance("minio");

// ❌ 不存在 OssType 枚举参数
OssClient client = OssFactory.instance(OssType.ALIYUN);  // 编译错误！
```

> 内部使用 ConcurrentHashMap + ReentrantLock 双检锁缓存实例，支持多租户隔离。

---

## 二、文件上传

```java
import org.dromara.common.oss.entity.UploadResult;

// 1. 上传字节数组，自动生成路径（推荐）
UploadResult result = client.uploadSuffix(data, ".jpg", "image/jpeg");

// 2. 上传输入流，自动生成路径
UploadResult result = client.uploadSuffix(is, ".jpg", fileSize, "image/jpeg");

// 3. 上传 File 对象，自动生成路径
UploadResult result = client.uploadSuffix(file, ".jpg");

// 4. 上传到指定路径
UploadResult result = client.upload(file.toPath(), "avatar/user123.jpg", null, "image/jpeg");

// 5. 上传流到指定路径
UploadResult result = client.upload(is, "images/photo.jpg", fileSize, "image/jpeg");
```

**方法签名：**
```java
UploadResult upload(Path filePath, String key, String md5Digest, String contentType)
UploadResult upload(InputStream inputStream, String key, Long length, String contentType)
UploadResult uploadSuffix(byte[] data, String suffix, String contentType)
UploadResult uploadSuffix(InputStream inputStream, String suffix, Long length, String contentType)
UploadResult uploadSuffix(File file, String suffix)
```

---

## 三、UploadResult 字段

> 只有 3 个字段，使用 Lombok `@Builder`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | String | 文件访问URL |
| `filename` | String | 文件名/对象键（**小写 n**） |
| `eTag` | String | 文件校验标记 |

```java
String url = result.getUrl();
String filename = result.getFilename();   // ✅ 小写 'n'
// ❌ result.getFileName() / result.getFileSize() / result.getContentType() 不存在
```

---

## 四、文件下载

```java
// 下载到临时文件
Path tempFile = client.fileDownload("images/photo.jpg");

// 下载到输出流（推荐用于HTTP响应）
client.download("images/photo.jpg", out, contentLength -> {
    response.setContentLengthLong(contentLength);
});

// 获取文件输入流（内部创建临时文件，使用后自动删除）
InputStream is = client.getObjectContent("images/photo.jpg");
```

---

## 五、文件删除与预签名URL

```java
// 删除
client.delete("images/photo.jpg");
// ❌ client.copyFile() / client.getFileMetadata() / client.listFiles() 不存在

// 下载预签名URL
String url = client.createPresignedGetUrl("images/photo.jpg", Duration.ofMinutes(60));

// 上传预签名URL（前端直传）
String url = client.createPresignedPutUrl("images/upload.jpg", Duration.ofHours(1), metadata);
// ❌ client.generatePresignedUrl() / client.generatePublicUrl() 不存在
```

---

## 六、OssClient 工具方法

```java
String baseUrl = client.getUrl();                  // 基础URL
String endpoint = client.getEndpoint();            // 终端点URL
String domain = client.getDomain();                // 自定义域名
String configKey = client.getConfigKey();           // 配置键
AccessPolicyType policy = client.getAccessPolicy(); // 桶权限（PUBLIC/PRIVATE）
String path = client.getPath("", ".jpg");          // 生成对象键路径
String relative = client.removeBaseUrl(fullUrl);   // 获取相对路径
boolean same = client.checkPropertiesSame(props);  // 配置是否相同
```

---

## 七、Controller 接口（SysOssController）

| 操作 | HTTP | 路径 | 权限 |
|------|------|------|------|
| 查询列表 | GET | `/resource/oss/list` | `system:oss:list` |
| 批量查询 | GET | `/resource/oss/listByIds/{ossIds}` | `system:oss:query` |
| 上传文件 | POST | `/resource/oss/upload` | `system:oss:upload` |
| 下载文件 | GET | `/resource/oss/download/{ossId}` | `system:oss:download` |
| 删除文件 | DELETE | `/resource/oss/{ossIds}` | `system:oss:remove` |

**上传接口规范：**
```java
// 必须使用 @RequestPart("file")，必须指定 consumes
@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public R<SysOssUploadVo> upload(@RequestPart("file") MultipartFile file) {
    SysOssVo oss = ossService.upload(file);
    SysOssUploadVo uploadVo = new SysOssUploadVo();
    uploadVo.setUrl(oss.getUrl());
    uploadVo.setFileName(oss.getOriginalName());
    uploadVo.setOssId(oss.getOssId().toString());
    return R.ok(uploadVo);
}
```

**SysOssUploadVo**：`url`(String) / `fileName`(String) / `ossId`(String)

---

## 八、Service 层接口（ISysOssService）

```java
TableDataInfo<SysOssVo> queryPageList(SysOssBo sysOss, PageQuery pageQuery);
List<SysOssVo> listByIds(Collection<Long> ossIds);
@Cacheable(cacheNames = CacheNames.SYS_OSS, key = "#ossId")
SysOssVo getById(Long ossId);
SysOssVo upload(MultipartFile file);
SysOssVo upload(File file);
void download(Long ossId, HttpServletResponse response) throws IOException;
Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
```

> 推荐通过 `ISysOssService.upload()` 上传，会自动保存数据库记录。
> 直接使用 `OssClient` 上传不会有数据库记录。

> 完整 Service 实现代码详见 [references/service-impl.md](references/service-impl.md)

---

## 九、数据库实体

> 完整实体/VO/BO 定义详见 [references/entities.md](references/entities.md)

**SysOss 关键字段：**

| 字段 | 说明 |
|------|------|
| `ossId` | 主键 |
| `fileName` | OSS对象键 |
| `originalName` | 原始文件名 |
| `fileSuffix` | 后缀名 |
| `url` | 访问URL |
| `ext1` | 扩展字段（JSON，存储 SysOssExt） |
| `service` | 服务商标识 |

---

## 十、配置（sys_oss_config 表）

| 字段 | 说明 |
|------|------|
| `config_key` | 配置标识（aliyun、minio等） |
| `access_key` / `secret_key` | 认证信息 |
| `bucket_name` | 存储桶 |
| `prefix` | 路径前缀 |
| `endpoint` | 服务端点 |
| `domain` | 自定义域名 |
| `is_https` | 是否HTTPS（Y/N） |
| `region` | 区域 |
| `access_policy` | 0-private, 1-public, 2-custom |

> 配置从 Redis 读取（`CacheNames.SYS_OSS_CONFIG`），私有桶文件自动生成 120 秒预签名URL。

---

## 十一、快速对照表

| 错误 | 正确 |
|------|------|
| `OssFactory.instance(OssType.ALIYUN)` | `OssFactory.instance("aliyun")` |
| `result.getFileName()` | `result.getFilename()` |
| `result.getFileSize()` | 不存在 |
| `client.downloadToTempFile(path)` | `client.fileDownload(path)` |
| `client.generatePresignedUrl(...)` | `client.createPresignedGetUrl(...)` |
| `throw ServiceException.of("msg")` | `throw new ServiceException("msg")` |
| `client.copyFile/listFiles/getFileMetadata` | 不存在 |

---

## 核心文件位置

| 类型 | 位置 |
|------|------|
| OssFactory | `ruoyi-common/ruoyi-common-oss/.../factory/OssFactory.java` |
| OssClient | `ruoyi-common/ruoyi-common-oss/.../core/OssClient.java` |
| UploadResult | `ruoyi-common/ruoyi-common-oss/.../entity/UploadResult.java` |
| SysOssController | `ruoyi-modules/ruoyi-system/.../controller/system/SysOssController.java` |
| SysOssServiceImpl | `ruoyi-modules/ruoyi-system/.../service/impl/SysOssServiceImpl.java` |
