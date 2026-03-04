# 多租户扩展场景

## 统计所有租户数据

```java
public List<TenantOrderStats> getTenantOrderStats() {
    return TenantHelper.ignore(() -> {
        return orderMapper.selectMaps(
            new QueryWrapper<Order>()
                .select("tenant_id", "COUNT(*) as order_count", "SUM(amount) as total_amount")
                .groupBy("tenant_id")
        ).stream().map(map -> {
            TenantOrderStats stats = new TenantOrderStats();
            stats.setTenantId((String) map.get("tenant_id"));
            stats.setOrderCount(((Number) map.get("order_count")).longValue());
            stats.setTotalAmount((BigDecimal) map.get("total_amount"));
            return stats;
        }).collect(Collectors.toList());
    });
}
```

## 定时任务完整模板

```java
@Service
@RequiredArgsConstructor
public class OrderCleanupJob {

    private final OrderMapper orderMapper;
    private final SysTenantMapper tenantMapper;

    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredOrders() {
        // 1. 获取所有启用的租户
        List<SysTenant> tenants = TenantHelper.ignore(() -> {
            return tenantMapper.selectList(
                Wrappers.<SysTenant>lambdaQuery()
                    .eq(SysTenant::getStatus, "0")
            );
        });

        // 2. 逐个租户处理
        for (SysTenant tenant : tenants) {
            try {
                TenantHelper.dynamic(tenant.getTenantId(), () -> {
                    orderMapper.delete(
                        Wrappers.<Order>lambdaQuery()
                            .eq(Order::getStatus, "CANCELLED")
                            .lt(Order::getCreateTime, DateUtils.addDays(new Date(), -30))
                    );
                });
            } catch (Exception e) {
                log.error("清理租户 {} 订单失败: {}", tenant.getTenantId(), e.getMessage());
            }
        }
    }
}
```

## 跨租户数据同步完整模板

```java
@Service
@RequiredArgsConstructor
public class DataSyncServiceImpl implements IDataSyncService {

    private final SysConfigMapper configMapper;
    private final SysTenantMapper tenantMapper;

    public void syncConfigToAllTenants(SysConfig config) {
        List<String> tenantIds = TenantHelper.ignore(() -> {
            return tenantMapper.selectList(null)
                .stream()
                .map(SysTenant::getTenantId)
                .collect(Collectors.toList());
        });

        for (String tenantId : tenantIds) {
            TenantHelper.dynamic(tenantId, () -> {
                SysConfig existing = configMapper.selectByKey(config.getConfigKey());
                if (existing == null) {
                    configMapper.insert(config);
                } else {
                    configMapper.updateById(config);
                }
            });
        }
    }
}
```
