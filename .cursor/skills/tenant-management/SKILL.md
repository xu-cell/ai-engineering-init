---
name: tenant-management
description: |
  通用多租户架构设计指南。涵盖字段隔离、Schema 隔离、物理隔离三种模式的对比与实现要点。
  触发场景：
  - 设计多租户 SaaS 系统架构
  - 选择租户隔离方案
  - 处理跨租户数据操作
  - 定时任务遍历所有租户
  - 配置 Redis / 缓存租户隔离
  触发词：多租户、租户隔离、SaaS、tenantId、跨租户、租户切换、数据隔离、Schema隔离、物理隔离、字段隔离
  注意：如果项目有专属技能（如 `leniu-data-permission` 或 `leniu-tenant`），优先使用专属版本。
---

# 多租户架构设计指南

> 通用模板。如果项目有专属技能，优先使用。

## 设计原则

1. **隔离性**：租户数据必须完全隔离，不可跨租户访问。
2. **透明性**：业务代码尽量不感知多租户，由框架层自动处理。
3. **可扩展**：新增租户不需要改代码，配置即可上线。
4. **运维友好**：备份恢复、数据迁移应以租户为单位。

---

## 三种隔离模式对比

| 维度 | 字段隔离 | Schema 隔离 | 物理隔离（独立库） |
|------|---------|------------|-----------------|
| **实现方式** | 每张表加 `tenant_id` 字段 | 每个租户独立 Schema | 每个租户独立数据库 |
| **隔离强度** | 低（逻辑隔离） | 中（Schema 级） | 高（物理隔离） |
| **数据安全** | 依赖应用层正确过滤 | 数据库级隔离 | 最安全 |
| **资源利用** | 高（共享一切） | 中（共享实例） | 低（独占资源） |
| **扩展性** | 单库上限制约 | 单实例 Schema 数限制 | 水平扩展灵活 |
| **运维复杂度** | 低 | 中 | 高 |
| **备份恢复** | 复杂（需过滤） | 简单（按 Schema） | 最简单（按库） |
| **租户定制** | 困难 | 可支持 | 完全独立 |
| **成本** | 最低 | 中等 | 最高 |
| **适用场景** | 中小 SaaS、租户量大 | 中等规模、需一定隔离 | 大客户、强合规需求 |

---

## 实现模式

### 模式一：字段隔离（最常见）

```java
// 1. Entity 携带 tenant_id
public class [你的租户基类] extends [你的基础Entity] {
    private String tenantId;
}

@TableName("biz_order")
public class BizOrder extends [你的租户基类] {
    private Long id;
    private String orderNo;
}

// 2. 数据库表必须含 tenant_id
// CREATE TABLE biz_order (
//     id         BIGINT NOT NULL,
//     tenant_id  VARCHAR(20) DEFAULT '000000' COMMENT '租户ID',
//     order_no   VARCHAR(64) NOT NULL,
//     PRIMARY KEY (id),
//     KEY idx_tenant_id (tenant_id)
// );

// 3. MyBatis 拦截器自动追加条件
// SELECT * FROM biz_order WHERE tenant_id = '000001' AND ...
// INSERT INTO biz_order (tenant_id, ...) VALUES ('000001', ...)
```

**核心工具类模式**：

```java
public class [你的租户工具类] {

    // 获取当前租户ID（从请求上下文/ThreadLocal）
    public static String getTenantId() { ... }

    // 忽略租户过滤（查全量数据）
    public static <T> T ignore(Supplier<T> supplier) {
        // 临时关闭拦截器的租户条件追加
        try {
            setIgnore(true);
            return supplier.get();
        } finally {
            setIgnore(false);
        }
    }

    // 切换到指定租户执行
    public static void dynamic(String tenantId, Runnable runnable) {
        String original = getTenantId();
        try {
            setTenantId(tenantId);
            runnable.run();
        } finally {
            setTenantId(original);
        }
    }

    // 带返回值的租户切换
    public static <T> T dynamic(String tenantId, Supplier<T> supplier) {
        String original = getTenantId();
        try {
            setTenantId(tenantId);
            return supplier.get();
        } finally {
            setTenantId(original);
        }
    }
}
```

**配置排除表**（不需要租户过滤的共享表）：

```yaml
tenant:
  enable: true
  excludes:
    - sys_menu
    - sys_dict_type
    - sys_dict_data
    - sys_config
```

### 模式二：Schema 隔离

```java
// 动态数据源 / 动态 Schema 切换
public class TenantSchemaResolver {
    public String resolveSchema(String tenantId) {
        return "tenant_" + tenantId;  // tenant_000001, tenant_000002
    }
}

// 通过 AbstractRoutingDataSource 或 MyBatis 拦截器切换 Schema
// SET search_path TO tenant_000001;  (PostgreSQL)
// USE tenant_000001;                 (MySQL)
```

### 模式三：物理隔离（独立库）

```java
// 每个租户对应独立的数据源配置
// 通过 AbstractRoutingDataSource 或动态数据源框架切换

public class TenantDataSourceRouter extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return [你的租户工具类].getTenantId();
    }
}

// 典型用法
[你的租户工具类].doInTenant(tenantId, () -> {
    // 自动路由到该租户的数据库
    orderMapper.insert(order);
});

[你的租户工具类].doInSystem(() -> {
    // 路由到系统公共库
    configMapper.selectList(null);
});
```

---

## 常见场景

### 场景 1：管理员查看所有租户数据

```java
public List<UserVo> listAllTenantUsers() {
    return [你的租户工具类].ignore(() -> userMapper.selectVoList(null));
}
```

### 场景 2：跨租户数据同步

```java
public void syncConfigToAllTenants(Config config) {
    List<String> tenantIds = [你的租户工具类].ignore(() ->
        tenantMapper.selectList(null).stream()
            .map(Tenant::getTenantId).collect(Collectors.toList())
    );
    for (String tenantId : tenantIds) {
        [你的租户工具类].dynamic(tenantId, () -> {
            configMapper.insertOrUpdate(config);
        });
    }
}
```

### 场景 3：定时任务遍历所有租户

```java
@Scheduled(cron = "0 0 2 * * ?")
public void cleanupExpiredOrders() {
    List<Tenant> tenants = [你的租户工具类].ignore(() ->
        tenantMapper.selectByStatus("ACTIVE")
    );
    for (Tenant tenant : tenants) {
        try {
            [你的租户工具类].dynamic(tenant.getTenantId(), () -> {
                orderMapper.deleteExpired(30);
            });
        } catch (Exception e) {
            log.error("清理租户 {} 订单失败: {}", tenant.getTenantId(), e.getMessage());
        }
    }
}
```

### 场景 4：Redis 缓存隔离

```
原始 Key: user:info:1001
实际 Key: 000000:user:info:1001  （租户 000000）
实际 Key: 000001:user:info:1001  （租户 000001）
```

全局缓存（不隔离）：使用特定前缀标识全局 Key。

---

## 选型建议

| 维度 | 字段隔离 | Schema 隔离 | 物理隔离 |
|------|---------|------------|---------|
| 租户数量 | 大量（100+） | 中等（10-100） | 少量（<20） |
| 数据量级 | 单租户数据量小 | 中等 | 大 |
| 合规要求 | 一般 | 中等 | 严格（金融、政务） |
| 预算 | 有限 | 中等 | 充足 |
| 定制化 | 几乎不需要 | 少量 | 高度定制 |

---

## 常见错误

```java
// 1. Entity 忘记继承租户基类 / 表缺少 tenant_id（字段隔离模式）
public class BizOrder extends BaseEntity { }  // 缺少 tenantId
// 表中也没有 tenant_id 字段 -> 数据不隔离

// 2. 手动设置租户后忘记清理
[你的租户工具类].setTenantId("000001");
userMapper.insert(user);
// 忘记恢复原租户ID -> 后续请求使用错误租户
// 应使用 dynamic() 方法（自动恢复）

// 3. 事务中切换租户（字段隔离模式下可能数据错乱）
@Transactional
public void wrongMethod() {
    orderMapper.insert(order);                                // 租户 A
    [你的租户工具类].dynamic("B", () -> logMapper.insert(log)); // 租户 B
    // 如果回滚，租户 B 的数据不会回滚（不同事务）
}
// 应使用独立事务
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveToOtherTenant(String tenantId, Log log) { ... }

// 4. 共享表未排除租户过滤
// sys_dict_type 等共享表被加上 tenant_id 条件 -> 查不到数据
// 应在配置中排除这些表

// 5. 物理隔离模式下使用 tenant_id 字段（画蛇添足）
// 物理隔离已通过数据源区分租户，表中不需要 tenant_id
```
