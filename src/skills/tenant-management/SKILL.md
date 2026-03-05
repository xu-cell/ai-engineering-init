---
name: tenant-management
description: |
  多租户数据隔离开发指南。基于 MyBatis-Plus 租户插件，自动 SQL/Redis/Cache 隔离。

  触发场景：
  - 为业务表添加租户隔离
  - 临时忽略租户过滤查询全量数据
  - 切换到其他租户执行操作
  - 配置排除租户过滤的表
  - 定时任务遍历所有租户

  触发词：多租户、租户隔离、TenantEntity、TenantHelper、tenantId、跨租户、ignore租户、动态租户、租户切换、SaaS、数据隔离
---

# 多租户开发指南

> **模块**：`ruoyi-common-tenant` | **核心类**：`TenantHelper`、`TenantEntity`

## 一、Entity 规范

### 继承 TenantEntity

```java
import org.dromara.common.tenant.core.TenantEntity;

// TenantEntity 继承关系：TenantEntity → BaseEntity
// TenantEntity 额外字段：tenantId
// BaseEntity 字段：createDept, createBy, createTime, updateBy, updateTime, params

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

### 数据库表必须含 tenant_id

```sql
CREATE TABLE biz_order (
    id           BIGINT(20)   NOT NULL COMMENT '主键ID',
    tenant_id    VARCHAR(20)  DEFAULT '000000' COMMENT '租户ID',  -- 必须有
    order_no     VARCHAR(64)  NOT NULL COMMENT '订单号',
    status       CHAR(1)      DEFAULT '0' COMMENT '状态',
    create_dept  BIGINT(20)   DEFAULT NULL COMMENT '创建部门',
    create_by    BIGINT(20)   DEFAULT NULL COMMENT '创建人',
    create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by    BIGINT(20)   DEFAULT NULL COMMENT '更新人',
    update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    del_flag     CHAR(1)      DEFAULT '0' COMMENT '删除标志',
    PRIMARY KEY (id),
    KEY idx_tenant_id (tenant_id)
);
```

---

## 二、TenantHelper 工具类

**位置**：`org.dromara.common.tenant.helper.TenantHelper`

### API 速查

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `isEnable()` | 租户功能是否启用 | boolean |
| `getTenantId()` | 获取当前租户ID（优先动态租户） | String |
| `ignore(Runnable)` | 忽略租户执行（无返回值） | void |
| `ignore(Supplier<T>)` | 忽略租户执行（有返回值） | T |
| `dynamic(tenantId, Runnable)` | 切换租户执行（无返回值） | void |
| `dynamic(tenantId, Supplier<T>)` | 切换租户执行（有返回值） | T |
| `setDynamic(tenantId)` | 手动设置动态租户（需配合 clearDynamic） | void |
| `setDynamic(tenantId, true)` | 设置全局动态租户（跨请求，存 Redis） | void |
| `clearDynamic()` | 清除动态租户 | void |

### 核心用法

```java
import org.dromara.common.tenant.helper.TenantHelper;

// 1. 忽略租户（查全量数据）
List<SysUser> allUsers = TenantHelper.ignore(() -> {
    return userMapper.selectList(null);  // 不追加 tenant_id 条件
});

// 2. 切换到指定租户（推荐用法）
TenantHelper.dynamic("000001", () -> {
    userMapper.insert(user);  // 使用租户 000001
});

// 3. 手动管理（复杂场景）
TenantHelper.setDynamic("000001");
try {
    userMapper.insert(user);
} finally {
    TenantHelper.clearDynamic();  // 必须清理！
}
```

---

## 三、配置

```yaml
# application.yml
tenant:
  enable: true
  excludes:        # 不追加 tenant_id 条件的表
    - sys_menu
    - sys_dict_type
    - sys_dict_data
    - sys_oss_config
    - sys_config
```

**自动配置组件**（`tenant.enable=true` 时生效）：

| 组件 | 功能 |
|------|------|
| `TenantLineInnerInterceptor` | SQL 自动追加租户条件 |
| `TenantKeyPrefixHandler` | Redis Key 自动添加租户前缀 |
| `TenantSpringCacheManager` | Spring Cache 租户隔离 |
| `TenantSaTokenDao` | Sa-Token 会话租户隔离 |

---

## 四、常见场景

### 场景 1：管理员查看所有租户数据

```java
@SaCheckRole("superadmin")
public List<SysUserVo> listAllTenantUsers() {
    return TenantHelper.ignore(() -> userMapper.selectVoList(null));
}
```

### 场景 2：跨租户数据同步

```java
public void syncConfigToAllTenants(SysConfig config) {
    List<String> tenantIds = TenantHelper.ignore(() ->
        tenantMapper.selectList(null).stream()
            .map(SysTenant::getTenantId).collect(Collectors.toList())
    );
    for (String tenantId : tenantIds) {
        TenantHelper.dynamic(tenantId, () -> {
            SysConfig existing = configMapper.selectByKey(config.getConfigKey());
            if (existing == null) configMapper.insert(config);
            else configMapper.updateById(config);
        });
    }
}
```

### 场景 3：定时任务处理所有租户

> 详细示例见 `references/tenant-scenarios.md`

```java
@Scheduled(cron = "0 0 2 * * ?")
public void cleanupExpiredOrders() {
    List<SysTenant> tenants = TenantHelper.ignore(() ->
        tenantMapper.selectList(Wrappers.<SysTenant>lambdaQuery().eq(SysTenant::getStatus, "0"))
    );
    for (SysTenant tenant : tenants) {
        try {
            TenantHelper.dynamic(tenant.getTenantId(), () -> {
                orderMapper.delete(Wrappers.<Order>lambdaQuery()
                    .eq(Order::getStatus, "CANCELLED")
                    .lt(Order::getCreateTime, DateUtils.addDays(new Date(), -30)));
            });
        } catch (Exception e) {
            log.error("清理租户 {} 订单失败: {}", tenant.getTenantId(), e.getMessage());
        }
    }
}
```

---

## 五、Redis 缓存隔离

```
原始 Key: user:info:1001
实际 Key: 000000:user:info:1001  （租户 000000）
实际 Key: 000001:user:info:1001  （租户 000001）
```

**全局 Key（不隔离）**：使用 `GlobalConstants.GLOBAL_REDIS_KEY` 前缀

```java
import org.dromara.common.core.constant.GlobalConstants;

// 全局缓存（所有租户共享）
String globalKey = GlobalConstants.GLOBAL_REDIS_KEY + "config:site_name";
RedisUtils.setCacheObject(globalKey, "网站名称");

// 租户隔离缓存（自动添加前缀）
RedisUtils.setCacheObject("user:info:" + userId, userInfo);
```

> `TenantHelper.ignore()` 中的 Redis 操作不添加租户前缀。

---

## 六、常见错误

### 1. 忘记继承 TenantEntity

```java
// ❌ 继承 BaseEntity，没有 tenantId
public class BizOrder extends BaseEntity { }

// ✅ 继承 TenantEntity
public class BizOrder extends TenantEntity { }
```

### 2. 数据库表缺少 tenant_id

```sql
-- ❌ 表没有 tenant_id
CREATE TABLE biz_order (id BIGINT NOT NULL, order_no VARCHAR(64));

-- ✅ 添加 tenant_id
CREATE TABLE biz_order (id BIGINT NOT NULL, tenant_id VARCHAR(20) DEFAULT '000000', order_no VARCHAR(64));
```

### 3. setDynamic 后忘记 clearDynamic

```java
// ❌ 租户ID泄漏到其他请求
TenantHelper.setDynamic("000001");
userMapper.insert(user);
// 忘记 clearDynamic()

// ✅ 推荐使用 dynamic() 方法（自动清理）
TenantHelper.dynamic("000001", () -> userMapper.insert(user));
```

### 4. 事务中切换租户

```java
// ❌ 事务内切换租户导致数据错乱
@Transactional
public void wrongMethod() {
    orderMapper.insert(order);
    TenantHelper.dynamic("000001", () -> logMapper.insert(log));
}

// ✅ 使用独立事务
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveLogToOtherTenant(String tenantId, Log log) {
    TenantHelper.dynamic(tenantId, () -> logMapper.insert(log));
}
```

### 5. 排除表配置不当

```yaml
# ❌ 业务表不应排除
tenant:
  excludes:
    - biz_order

# ✅ 只排除共享的系统表
tenant:
  excludes:
    - sys_menu
    - sys_dict_type
```

---

## 七、参考代码位置

| 类型 | 位置 |
|------|------|
| 租户基类 | `ruoyi-common/ruoyi-common-tenant/.../core/TenantEntity.java` |
| 租户助手 | `ruoyi-common/ruoyi-common-tenant/.../helper/TenantHelper.java` |
| 租户处理器 | `ruoyi-common/ruoyi-common-tenant/.../handle/PlusTenantLineHandler.java` |
| Redis Key 处理 | `ruoyi-common/ruoyi-common-tenant/.../handle/TenantKeyPrefixHandler.java` |
| 配置文件 | `ruoyi-admin/src/main/resources/application.yml` |
