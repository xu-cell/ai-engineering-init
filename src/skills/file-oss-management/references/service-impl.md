# SysOssServiceImpl 完整实现

> 位置：`ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/impl/SysOssServiceImpl.java`

## 文件上传

```java
@RequiredArgsConstructor
@Service
public class SysOssServiceImpl implements ISysOssService {

    private final SysOssMapper baseMapper;

    @Override
    public SysOssVo upload(MultipartFile file) {
        if (ObjectUtil.isNull(file) || file.isEmpty()) {
            throw new ServiceException("上传文件不能为空");
        }

        String originalfileName = file.getOriginalFilename();
        String suffix = StringUtils.substring(originalfileName,
                                             originalfileName.lastIndexOf("."),
                                             originalfileName.length());

        OssClient storage = OssFactory.instance();

        UploadResult uploadResult;
        try {
            uploadResult = storage.uploadSuffix(file.getBytes(), suffix, file.getContentType());
        } catch (IOException e) {
            throw new ServiceException(e.getMessage());
        }

        SysOssExt ext1 = new SysOssExt();
        ext1.setFileSize(file.getSize());
        ext1.setContentType(file.getContentType());

        return buildResultEntity(originalfileName, suffix,
            storage.getConfigKey(), uploadResult, ext1);
    }

    private SysOssVo buildResultEntity(String originalfileName, String suffix,
        String configKey, UploadResult uploadResult, SysOssExt ext1) {

        SysOss oss = new SysOss();
        oss.setUrl(uploadResult.getUrl());
        oss.setFileSuffix(suffix);
        oss.setFileName(uploadResult.getFilename());       // 小写 'n'
        oss.setOriginalName(originalfileName);
        oss.setService(configKey);
        oss.setExt1(JsonUtils.toJsonString(ext1));

        baseMapper.insert(oss);
        SysOssVo sysOssVo = MapstructUtils.convert(oss, SysOssVo.class);
        return this.matchingUrl(sysOssVo);
    }
}
```

## 文件下载

```java
@Override
public void download(Long ossId, HttpServletResponse response) throws IOException {
    SysOssVo sysOss = SpringUtils.getAopProxy(this).getById(ossId);
    if (ObjectUtil.isNull(sysOss)) {
        throw new ServiceException("文件数据不存在!");
    }

    FileUtils.setAttachmentResponseHeader(response, sysOss.getOriginalName());
    response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE + "; charset=UTF-8");

    OssClient storage = OssFactory.instance(sysOss.getService());
    storage.download(sysOss.getFileName(),
        response.getOutputStream(),
        response::setContentLengthLong);
}
```

## 文件删除

```java
@Override
public Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid) {
    List<SysOss> list = baseMapper.selectByIds(ids);
    for (SysOss sysOss : list) {
        OssClient storage = OssFactory.instance(sysOss.getService());
        storage.delete(sysOss.getUrl());
    }
    return baseMapper.deleteByIds(ids) > 0;
}
```

## 私有桶预签名URL

```java
private SysOssVo matchingUrl(SysOssVo oss) {
    OssClient storage = OssFactory.instance(oss.getService());
    if (AccessPolicyType.PRIVATE == storage.getAccessPolicy()) {
        oss.setUrl(storage.createPresignedGetUrl(oss.getFileName(), Duration.ofSeconds(120)));
    }
    return oss;
}
```
