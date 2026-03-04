# OSS 数据库实体类定义

## SysOss 实体

```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_oss")
public class SysOss extends TenantEntity {

    @TableId(value = "oss_id")
    private Long ossId;

    private String fileName;         // OSS对象键
    private String originalName;     // 原始文件名
    private String fileSuffix;       // 后缀名（如 .jpg）
    private String url;              // URL地址
    private String ext1;             // 扩展字段（JSON）
    private String service;          // 服务商标识

    // 继承自 TenantEntity: tenantId, createTime, createBy, updateTime, updateBy, delFlag
}
```

## SysOssVo 视图对象

```java
@Data
@AutoMapper(target = SysOss.class)
public class SysOssVo implements Serializable {

    private Long ossId;
    private String fileName;
    private String originalName;
    private String fileSuffix;
    private String url;
    private String ext1;
    private Date createTime;
    private Long createBy;

    @Translation(type = TransConstant.USER_ID_TO_NAME, mapper = "createBy")
    private String createByName;  // 上传人名称（自动翻译）

    private String service;
}
```

## SysOssBo 业务对象

```java
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = SysOss.class, reverseConvertGenerate = false)
public class SysOssBo extends BaseEntity {

    private Long ossId;
    private String fileName;
    private String originalName;
    private String fileSuffix;
    private String url;
    private String ext1;
    private String service;
}
```

## SysOssExt 扩展信息对象

> 以 JSON 字符串形式存储在 ext1 字段中

```java
@Data
public class SysOssExt implements Serializable {

    private String bizType;         // 业务类型（avatar、report等）
    private Long fileSize;          // 文件大小（字节）
    private String contentType;     // MIME类型
    private String source;          // 来源标识
    private String uploadIp;        // 上传IP
    private String remark;          // 备注
    private List<String> tags;      // 标签
    private String refId;           // 绑定业务ID
    private String refType;         // 绑定业务类型
    private Boolean isTemp;         // 是否临时文件
    private String md5;             // 文件MD5值
}
```

## OssProperties 配置类

```java
@Data
public class OssProperties {

    private String tenantId;
    private String endpoint;       // 访问站点
    private String domain;         // 自定义域名
    private String prefix;         // 文件前缀
    private String accessKey;
    private String secretKey;
    private String bucketName;
    private String region;
    private String isHttps;        // Y/N
    private String accessPolicy;   // 0-private, 1-public, 2-custom
}
```
