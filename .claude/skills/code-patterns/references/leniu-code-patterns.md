# leniu-tengyun-core 代码模式详解

## Hutool 工具类完整用法

```java
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.bean.BeanUtil;

// 1. 集合操作
if (CollUtil.isEmpty(list)) {
    throw new LeException("列表不能为空");
}
if (CollUtil.isNotEmpty(list)) {
    // 处理列表
}

// 2. 对象判空
if (ObjectUtil.isNull(user)) {
    throw new LeException("用户不存在");
}

// 3. 字符串操作
if (StrUtil.isBlank(name)) {
    throw new LeException("名称不能为空");
}
String trimmed = StrUtil.trim(name);
String joined = StrUtil.join(",", list);

// 4. 对象拷贝
TargetDTO target = BeanUtil.copyProperties(source, TargetDTO.class);
List<TargetDTO> targets = BeanUtil.copyToList(sources, TargetDTO.class);

// 5. 集合创建
List<String> list = CollUtil.newArrayList("a", "b", "c");
Map<String, Object> map = CollUtil.newHashMap();
```

## 国际化消息

```java
import net.xnzn.core.common.i18n.I18n;

// RuoYi-Vue-Plus 风格
throw new ServiceException(MessageUtils.message("user.not.exists"));

// leniu-tengyun-core 风格
throw new LeException(I18n.getMessage("user.not.exists"));

// 带参数
throw new LeException(I18n.getMessage("user.password.retry.limit.exceed", maxRetryCount));
```

## 租户上下文

```java
import net.xnzn.core.context.TenantContextHolder;

Long tenantId = TenantContextHolder.getTenantId();
TenantContextHolder.setTenantId(tenantId);
TenantContextHolder.clear();
```

## 分页参数处理

```java
@Data
public class XxxQueryParam implements Serializable {
    @ApiModelProperty(value = "分页参数", required = true)
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;

    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("状态")
    private Integer status;
}

// Service 层
public Page<XxxVO> pageList(XxxQueryParam param) {
    PageMethod.startPage(param.getPage().getPageNum(), param.getPage().getPageSize());
    List<XxxEntity> list = xxxMapper.selectList(buildWrapper(param));
    return new Page<>(list);
}
```
