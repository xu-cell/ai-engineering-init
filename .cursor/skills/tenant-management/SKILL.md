---
name: tenant-management
description: |
  当需要实现多租户数据隔离、租户管理、跨租户查询时自动使用此 Skill。

  触发场景：
  - 需要为业务表添加租户隔离
  - 需要临时忽略租户过滤查询全量数据
  - 需要切换到其他租户执行操作
  - 需要配置排除租户过滤的表
  - 需要理解多租户数据隔离原理

  触发词：多租户、租户隔离、TenantEntity、TenantHelper、租户ID、tenantId、跨租户、ignore租户、动态租户、租户切换、SaaS、数据隔离
---

# 多租户开发指南

> **适用模块**：`ruoyi-common-tenant`

## 概述

本框架基于 **MyBatis-Plus 租户插件** 实现多租户数据隔离，支持 SaaS 多租户架构。

**核心特性**：
- ✅ 自动 SQL 过滤（无需手动添加 tenant_id 条件）
- ✅ Redis 缓存自动隔离（Key 前缀自动添加租户）
- ✅ Spring Cache 租户隔离
- ✅ Sa-Token 会话租户隔离
- ✅ 支持临时忽略租户、动态切换租户

---

## 一、多租户架构原理

### 1.1 数据隔离流程

```
┌─────────────┐     请求头携带租户ID      ┌─────────────┐
│   前端请求   │ ───────────────────────→ │   后端服务   │
└─────────────┘                           └─────────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │     TenantHelper        │
                                    │   获取当前租户ID         │
                                    └────────────┬────────────┘
                                                 │
              ┌──────────────────────────────────┼──────────────────────────────────┐
              │                                  │                                  │
              ▼                                  ▼                                  ▼
    ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
    │ MyBatis-Plus    │              │ Redis 缓存      │              │ Spring Cache    │
    │ 自动追加条件     │              │ Key 前缀隔离    │              │ 缓存名隔离      │
    │ WHERE tenant_id │              │ {tenantId}:key  │              │ {tenantId}::xxx │
    └─────────────────┘              └─────────────────┘              └─────────────────┘
```

### 1.2 自动 SQL 改写

原始 SQL：
```sql
SELECT * FROM sys_user WHERE status = '1'
```

自动改写后：
```sql
SELECT * FROM sys_user WHERE status = '1' AND tenant_id = '000000'
```

---

## 二、Entity 继承规范

### 2.1 TenantEntity 基类

**位置**：`org.dromara.common.tenant.core.TenantEntity`

```java
/**
 * 租户基类
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class TenantEntity extends BaseEntity {

    /**
     * 租户编号
     */
    private String tenantId;

}
```

### 2.2 继承关系

```
TenantEntity
    └── BaseEntity
         ├── createDept    // 创建部门
         ├── createBy      // 创建者
         ├── createTime    // 创建时间
         ├── updateBy      // 更新者
         ├── updateTime    // 更新时间
         └── params        // 请求参数
```

### 2.3 Entity 示例

```java
import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 业务实体（需要租户隔离）
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("biz_order")
public class BizOrder extends TenantEntity {

    @TableId(value = "id")
    private Long id;

    private String orderNo;

    private String status;
}
```

### 2.4 数据库表设计

```sql
CREATE TABLE biz_order (
    id           BIGINT(20)   NOT NULL COMMENT '主键ID',
    tenant_id    VARCHAR(20)  DEFAULT '000000' COMMENT '租户ID',  -- 必须有此字段
    order_no     VARCHAR(64)  NOT NULL COMMENT '订单号',
    status       CHAR(1)      DEFAULT '0' COMMENT '状态',
    create_dept  BIGINT(20)   DEFAULT NULL COMMENT '创建部门',
    create_by    BIGINT(20)   DEFAULT NULL COMMENT '创建人',
    create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by    BIGINT(20)   DEFAULT NULL COMMENT '更新人',
    update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    del_flag     CHAR(1)      DEFAULT '0' COMMENT '删除标志',
    PRIMARY KEY (id),
    KEY idx_tenant_id (tenant_id)  -- 建议加索引
) ENGINE=InnoDB COMMENT='业务订单表';
```

---

## 三、TenantHelper 工具类

**位置**：`org.dromara.common.tenant.helper.TenantHelper`

### 3.1 核心方法

```java
import org.dromara.common.tenant.helper.TenantHelper;

// ========== 基础方法 ==========

// 1. 检查租户功能是否启用
boolean enabled = TenantHelper.isEnable();

// 2. 获取当前租户ID（优先返回动态租户，其次返回登录用户租户）
String tenantId = TenantHelper.getTenantId();

// ========== 忽略租户（查询全量数据） ==========

// 3. 在忽略租户中执行（无返回值）
TenantHelper.ignore(() -> {
    // 此代码块内的 SQL 不会追加 tenant_id 条件
    List<SysUser> allUsers = userMapper.selectList(null);
});

// 4. 在忽略租户中执行（有返回值）
List<SysUser> allUsers = TenantHelper.ignore(() -> {
    return userMapper.selectList(null);
});

// ========== 动态租户（切换到其他租户） ==========

// 5. 在指定租户中执行（无返回值）
TenantHelper.dynamic("000001", () -> {
    // 此代码块内使用租户 000001 的数据
    userMapper.insert(user);
});

// 6. 在指定租户中执行（有返回值）
List<SysUser> tenant001Users = TenantHelper.dynamic("000001", () -> {
    return userMapper.selectList(null);
});

// ========== 手动管理动态租户 ==========

// 7. 设置动态租户（需手动清理）
TenantHelper.setDynamic("000001");
// ... 执行操作 ...
TenantHelper.clearDynamic();  // 必须清理

// 8. 设置全局动态租户（跨请求生效，存入 Redis）
TenantHelper.setDynamic("000001", true);
// ... 多次请求都使用该租户 ...
TenantHelper.clearDynamic();
```

### 3.2 方法速查表

| 方法 | 说明 | 使用场景 |
|------|------|---------|
| `isEnable()` | 检查租户是否启用 | 条件判断 |
| `getTenantId()` | 获取当前租户ID | 业务逻辑 |
| `ignore(Runnable)` | 忽略租户执行（无返回值） | 查询全量数据 |
| `ignore(Supplier<T>)` | 忽略租户执行（有返回值） | 查询全量数据 |
| `dynamic(tenantId, Runnable)` | 切换租户执行（无返回值） | 跨租户操作 |
| `dynamic(tenantId, Supplier<T>)` | 切换租户执行（有返回值） | 跨租户查询 |
| `setDynamic(tenantId)` | 手动设置动态租户 | 复杂场景 |
| `setDynamic(tenantId, true)` | 设置全局动态租户 | 跨请求场景 |
| `getDynamic()` | 获取动态租户 | 调试/检查 |
| `clearDynamic()` | 清除动态租户 | 配合 setDynamic |

---

## 四、配置说明

### 4.1 启用多租户

```yaml
# application.yml
tenant:
  # 是否开启多租户
  enable: true
  # 排除表（这些表不追加 tenant_id 条件）
  excludes:
    - sys_menu        # 菜单表（所有租户共享）
    - sys_dict_type   # 字典类型（所有租户共享）
    - sys_dict_data   # 字典数据（所有租户共享）
```

### 4.2 排除表说明

以下类型的表通常需要排除：
- **系统配置表**：所有租户共享的配置
- **字典表**：公共字典数据
- **地区表**：省市区数据
- **代码生成表**：gen_table、gen_table_column（框架自动排除）

### 4.3 自动配置的组件

当 `tenant.enable=true` 时，框架自动配置：

| 组件 | 类名 | 功能 |
|------|------|------|
| MyBatis 租户插件 | `TenantLineInnerInterceptor` | SQL 自动追加租户条件 |
| Redis Key 前缀 | `TenantKeyPrefixHandler` | Redis Key 自动添加租户前缀 |
| 缓存管理器 | `TenantSpringCacheManager` | Spring Cache 租户隔离 |
| Sa-Token DAO | `TenantSaTokenDao` | 会话数据租户隔离 |

---

## 五、常见场景

### 5.1 场景：管理员查看所有租户数据

```java
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements IAdminUserService {

    private final SysUserMapper userMapper;

    /**
     * 管理员查看所有租户的用户（需要超级管理员权限）
     */
    @SaCheckRole("superadmin")
    public List<SysUserVo> listAllTenantUsers() {
        // 忽略租户过滤，查询所有数据
        return TenantHelper.ignore(() -> {
            return userMapper.selectVoList(null);
        });
    }
}
```

### 5.2 场景：跨租户数据同步

```java
@Service
@RequiredArgsConstructor
public class DataSyncServiceImpl implements IDataSyncService {

    private final SysConfigMapper configMapper;

    /**
     * 将配置同步到所有租户
     */
    public void syncConfigToAllTenants(SysConfig config) {
        // 1. 获取所有租户ID
        List<String> tenantIds = TenantHelper.ignore(() -> {
            return tenantMapper.selectList(null)
                .stream()
                .map(SysTenant::getTenantId)
                .collect(Collectors.toList());
        });

        // 2. 逐个租户同步
        for (String tenantId : tenantIds) {
            TenantHelper.dynamic(tenantId, () -> {
                // 检查是否已存在
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

### 5.3 场景：定时任务处理所有租户

```java
@Service
@RequiredArgsConstructor
public class OrderCleanupJob {

    private final OrderMapper orderMapper;
    private final SysTenantMapper tenantMapper;

    /**
     * 清理所有租户的过期订单
     */
    @Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨2点
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
                    // 删除30天前的已取消订单
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

### 5.4 场景：统计所有租户数据

```java
@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements IStatisticsService {

    private final OrderMapper orderMapper;

    /**
     * 统计各租户订单数量
     */
    public List<TenantOrderStats> getTenantOrderStats() {
        // 忽略租户，使用 GROUP BY 统计
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
}
```

---

## 六、Redis 缓存隔离

### 6.1 自动隔离原理

框架通过 `TenantKeyPrefixHandler` 自动为 Redis Key 添加租户前缀：

```
原始 Key: user:info:1001
实际 Key: 000000:user:info:1001  （租户 000000）
实际 Key: 000001:user:info:1001  （租户 000001）
```

### 6.2 全局 Key（不隔离）

使用 `GlobalConstants.GLOBAL_REDIS_KEY` 前缀的 Key 不会添加租户前缀：

```java
import org.dromara.common.core.constant.GlobalConstants;

// 全局缓存（所有租户共享）
String globalKey = GlobalConstants.GLOBAL_REDIS_KEY + "config:site_name";
RedisUtils.setCacheObject(globalKey, "网站名称");

// 租户隔离缓存
String tenantKey = "user:info:" + userId;  // 自动添加租户前缀
RedisUtils.setCacheObject(tenantKey, userInfo);
```

### 6.3 忽略租户时的缓存

在 `TenantHelper.ignore()` 中操作的缓存不会添加租户前缀：

```java
TenantHelper.ignore(() -> {
    // 此处的 Redis 操作不添加租户前缀
    RedisUtils.setCacheObject("global:data", data);
});
```

---

## 七、常见错误与最佳实践

### ❌ 错误1：忘记继承 TenantEntity

```java
// ❌ 错误：继承 BaseEntity，没有 tenantId 字段
@Data
@EqualsAndHashCode(callSuper = true)
public class BizOrder extends BaseEntity {
    // 没有 tenantId，数据无法隔离！
}

// ✅ 正确：继承 TenantEntity
@Data
@EqualsAndHashCode(callSuper = true)
public class BizOrder extends TenantEntity {
    // 自动包含 tenantId 字段
}
```

### ❌ 错误2：数据库表缺少 tenant_id 字段

```sql
-- ❌ 错误：表没有 tenant_id 字段
CREATE TABLE biz_order (
    id BIGINT(20) NOT NULL,
    order_no VARCHAR(64)
);

-- ✅ 正确：添加 tenant_id 字段
CREATE TABLE biz_order (
    id BIGINT(20) NOT NULL,
    tenant_id VARCHAR(20) DEFAULT '000000',  -- 必须有
    order_no VARCHAR(64)
);
```

### ❌ 错误3：setDynamic 后忘记 clearDynamic

```java
// ❌ 错误：设置后没有清理，后续请求使用错误的租户
TenantHelper.setDynamic("000001");
userMapper.insert(user);
// 忘记 clearDynamic()，租户ID泄漏到其他请求！

// ✅ 正确方式1：使用 try-finally
TenantHelper.setDynamic("000001");
try {
    userMapper.insert(user);
} finally {
    TenantHelper.clearDynamic();
}

// ✅ 正确方式2：使用 dynamic() 方法（推荐）
TenantHelper.dynamic("000001", () -> {
    userMapper.insert(user);
});
```

### ❌ 错误4：在事务中切换租户

```java
// ❌ 错误：事务内切换租户可能导致数据错乱
@Transactional
public void wrongMethod() {
    orderMapper.insert(order);  // 使用当前租户
    TenantHelper.dynamic("000001", () -> {
        logMapper.insert(log);  // 使用租户 000001
    });
    // 事务提交时可能出现问题！
}

// ✅ 正确：避免在事务中切换租户，或使用独立事务
public void correctMethod() {
    // 先处理当前租户
    saveOrder(order);

    // 再处理其他租户（独立事务）
    saveLogToOtherTenant("000001", log);
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveLogToOtherTenant(String tenantId, Log log) {
    TenantHelper.dynamic(tenantId, () -> {
        logMapper.insert(log);
    });
}
```

### ❌ 错误5：排除表配置不当

```yaml
# ❌ 错误：把业务表加入排除列表
tenant:
  excludes:
    - biz_order  # 业务表不应该排除！

# ✅ 正确：只排除真正需要共享的系统表
tenant:
  excludes:
    - sys_menu        # 菜单配置（共享）
    - sys_dict_type   # 字典类型（共享）
    - sys_config      # 系统配置（共享）
```

---

## 八、API 速查表

### TenantHelper 方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `isEnable()` | 租户功能是否启用 | boolean |
| `getTenantId()` | 获取当前租户ID | String |
| `ignore(Runnable)` | 忽略租户执行 | void |
| `ignore(Supplier<T>)` | 忽略租户执行 | T |
| `dynamic(tenantId, Runnable)` | 动态租户执行 | void |
| `dynamic(tenantId, Supplier<T>)` | 动态租户执行 | T |
| `setDynamic(tenantId)` | 设置动态租户 | void |
| `setDynamic(tenantId, global)` | 设置全局动态租户 | void |
| `getDynamic()` | 获取动态租户 | String |
| `clearDynamic()` | 清除动态租户 | void |

### Entity 继承

| 基类 | 说明 | 包含字段 |
|------|------|---------|
| `BaseEntity` | 基础实体 | createDept, createBy, createTime, updateBy, updateTime |
| `TenantEntity` | 租户实体 | tenantId + BaseEntity 所有字段 |

---

## 九、配置参考

### 完整配置示例

```yaml
# application.yml
tenant:
  # 是否开启多租户
  enable: true
  # 排除表（不追加租户条件的表）
  excludes:
    - sys_menu           # 菜单表
    - sys_dict_type      # 字典类型
    - sys_dict_data      # 字典数据
    - sys_oss_config     # OSS 配置
    - sys_config         # 系统配置
```

---

## 十、参考代码位置

| 类型 | 位置 |
|------|------|
| 租户基类 | `ruoyi-common/ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/core/TenantEntity.java` |
| 租户助手 | `ruoyi-common/ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/helper/TenantHelper.java` |
| 租户处理器 | `ruoyi-common/ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/handle/PlusTenantLineHandler.java` |
| Redis Key 处理 | `ruoyi-common/ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/handle/TenantKeyPrefixHandler.java` |
| 租户配置类 | `ruoyi-common/ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/config/TenantConfig.java` |
| 租户属性 | `ruoyi-common/ruoyi-common-tenant/src/main/java/org/dromara/common/tenant/properties/TenantProperties.java` |
| 配置文件 | `ruoyi-admin/src/main/resources/application.yml` |
