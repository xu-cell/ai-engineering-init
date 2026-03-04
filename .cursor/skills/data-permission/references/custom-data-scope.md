# 扩展自定义数据权限类型 - 完整指南

## 步骤 1：修改 DataScopeType 枚举

位置：`ruoyi-common-mybatis/.../enums/DataScopeType.java`

```java
public enum DataScopeType {

    // ... 现有类型 ...

    /**
     * 按区域过滤（自定义类型示例）
     */
    REGION("7", "按区域", "#{#regionName} IN ( #{@sdss.getUserRegions( #user.userId )} )"),
    ;

    // ... 其他代码 ...
}
```

## 步骤 2：在 ISysDataScopeService 中添加方法

```java
// 接口
public interface ISysDataScopeService {
    // ... 现有方法 ...

    /**
     * 获取用户关联的区域ID列表
     */
    String getUserRegions(Long userId);
}

// 实现
@Service("sdss")
public class SysDataScopeServiceImpl implements ISysDataScopeService {

    @Override
    @Cacheable(cacheNames = CacheNames.SYS_USER_REGIONS, key = "#userId")
    public String getUserRegions(Long userId) {
        List<Long> regionIds = userRegionMapper.selectRegionIdsByUserId(userId);
        if (CollUtil.isEmpty(regionIds)) {
            return "-1";  // 返回 -1 表示无权限
        }
        return StringUtils.join(regionIds, ",");
    }
}
```

## 步骤 3：使用新权限类型

```java
@DataPermission({
    @DataColumn(key = "regionName", value = "region_id")
})
@Override
public List<Store> listByRegion(StoreBo bo) {
    return list(buildQueryWrapper(bo));
}
```

## 添加自定义变量

通过 `DataPermissionHelper` 设置自定义变量供 SpEL 表达式使用。

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final OrderMapper baseMapper;

    @Override
    public TableDataInfo<OrderVo> pageByShop(Long shopId, OrderBo bo, PageQuery pageQuery) {
        // 设置自定义变量（请求结束后 SaStorage 自动清理，无需手动移除）
        DataPermissionHelper.setVariable("shopId", shopId);
        return pageWithPermission(bo, pageQuery);
    }

    @DataPermission({
        @DataColumn(key = "shopId", value = "shop_id")
    })
    private TableDataInfo<OrderVo> pageWithPermission(OrderBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<Order> lqw = buildQueryWrapper(bo);
        Page<OrderVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }
}
```
