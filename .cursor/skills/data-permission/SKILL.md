---
name: data-permission
description: |
  数据权限开发指南。实现行级数据隔离，支持部门权限、本人权限、自定义权限等 6 种权限类型。

  触发场景：
  - 为业务模块添加数据权限过滤
  - 配置部门级数据隔离
  - 扩展自定义数据权限类型
  - 临时忽略数据权限查询全量数据
  - 排查数据权限不生效问题

  触发词：数据权限、@DataPermission、DataScope、行级权限、数据隔离、部门权限、本人权限、自定义权限、权限过滤、数据过滤、按部门过滤、按创建人过滤

  注意：如果是认证授权（登录、Token、Sa-Token）或菜单/按钮权限，请使用 security-guard。
---

# 数据权限开发指南

## 概述

数据权限是**行级**数据过滤机制，通过 MyBatis 拦截器在 SQL 执行前自动注入过滤条件，实现"不同用户看到不同数据"。

**与功能权限的区别**：
- **功能权限**（security-guard）：控制"能不能访问这个接口"
- **数据权限**（本技能）：控制"访问接口后能看到哪些数据"

---

## 1. 核心概念

### 1.1 六种权限类型

| 类型 | 字典值 | 说明 | SQL 效果 |
|------|--------|------|---------|
| **全部数据** | 1 | 无过滤条件 | 不拼接任何条件 |
| **自定义权限** | 2 | 按角色关联的部门 | `dept_id IN (1,2,3)` |
| **本部门** | 3 | 只看本部门 | `dept_id = 100` |
| **本部门及以下** | 4 | 本部门 + 子部门 | `dept_id IN (100,101,102)` |
| **仅本人** | 5 | 只看自己创建的 | `create_by = 1` |
| **部门及以下或本人** | 6 | 混合模式 | `dept_id IN (...) OR create_by = 1` |

### 1.2 技术架构

```
请求 → Controller → Service (@DataPermission) → Mapper
                        ↓
            PlusDataPermissionInterceptor 拦截
                        ↓
            PlusDataPermissionHandler 解析 SpEL
                        ↓
            拼接 WHERE 条件 → 执行 SQL
```

### 1.3 核心类位置

| 类 | 路径 | 职责 |
|---|------|------|
| `@DataPermission` | `ruoyi-common/ruoyi-common-mybatis/.../annotation/` | 权限注解 |
| `@DataColumn` | `ruoyi-common/ruoyi-common-mybatis/.../annotation/` | 列配置注解 |
| `DataScopeType` | `ruoyi-common/ruoyi-common-mybatis/.../enums/` | 权限类型枚举 |
| `PlusDataPermissionInterceptor` | `ruoyi-common/ruoyi-common-mybatis/.../interceptor/` | SQL 拦截器 |
| `PlusDataPermissionHandler` | `ruoyi-common/ruoyi-common-mybatis/.../handler/` | 权限处理器 |
| `DataPermissionHelper` | `ruoyi-common/ruoyi-common-mybatis/.../helper/` | 权限助手类 |
| `ISysDataScopeService` | `ruoyi-modules/ruoyi-system/.../service/` | 权限数据服务 |

---

## 2. 快速上手（3 分钟添加权限）

### 步骤 1：在 Service 方法上添加注解

```java
import org.dromara.common.mybatis.annotation.DataPermission;
import org.dromara.common.mybatis.annotation.DataColumn;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final OrderMapper baseMapper;  // ✅ 直接注入 Mapper（NO DAO!）

    /**
     * 分页查询（带数据权限）
     */
    @DataPermission({
        @DataColumn(key = "deptName", value = "create_dept"),
        @DataColumn(key = "userName", value = "create_by")
    })
    @Override
    public TableDataInfo<OrderVo> pageWithPermission(OrderBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<Order> lqw = buildQueryWrapper(bo);
        Page<OrderVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }
}
```

### 步骤 2：确保表有权限字段

```sql
CREATE TABLE m_order (
    id           BIGINT(20)   NOT NULL COMMENT '主键ID',
    -- ... 业务字段 ...

    -- ✅ 必须有这两个字段用于数据权限
    create_dept  BIGINT(20)   DEFAULT NULL COMMENT '创建部门',
    create_by    BIGINT(20)   DEFAULT NULL COMMENT '创建人',

    -- 其他审计字段
    create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

### 步骤 3：配置角色的数据权限

在系统管理 → 角色管理中，为角色配置数据权限范围（全部/本部门/本部门及以下/仅本人/自定义）。

---

## 3. 使用场景模板

### 场景 A：按部门过滤

最常见的场景，用户只能看到本部门及以下的数据。

```java
/**
 * 按部门过滤
 *
 * 权限效果：
 * - 全部数据：无过滤
 * - 本部门：WHERE create_dept = 100
 * - 本部门及以下：WHERE create_dept IN (100, 101, 102)
 * - 自定义：WHERE create_dept IN (角色关联的部门ID)
 */
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept")
})
@Override
public List<Order> listWithPermission(OrderBo bo) {
    return list(buildQueryWrapper(bo));
}
```

### 场景 B：按创建人过滤

用户只能看到自己创建的数据。

```java
/**
 * 按创建人过滤
 *
 * 权限效果：
 * - 仅本人：WHERE create_by = 1（当前用户ID）
 */
@DataPermission({
    @DataColumn(key = "userName", value = "create_by")
})
@Override
public List<Task> listMyTasks(TaskBo bo) {
    return list(buildQueryWrapper(bo));
}
```

### 场景 C：部门 + 创建人混合

同时支持按部门和按创建人过滤，根据角色配置自动选择。

```java
/**
 * 部门 + 创建人混合
 *
 * 权限效果：
 * - 本部门：WHERE create_dept = 100
 * - 仅本人：WHERE create_by = 1
 * - 部门及以下或本人：WHERE create_dept IN (...) OR create_by = 1
 */
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept"),
    @DataColumn(key = "userName", value = "create_by")
})
@Override
public TableDataInfo<ProjectVo> pageWithPermission(ProjectBo bo, PageQuery pageQuery) {
    LambdaQueryWrapper<Project> lqw = buildQueryWrapper(bo);
    Page<ProjectVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
    return TableDataInfo.build(result);
}
```

### 场景 D：关联查询时的表别名

当 SQL 涉及多表关联时，需要使用正确的表别名。

```java
/**
 * 多表关联查询
 *
 * SQL 示例：
 * SELECT u.*, d.dept_name
 * FROM sys_user u
 * LEFT JOIN sys_dept d ON u.dept_id = d.dept_id
 *
 * 注意：value 中使用表别名 u.dept_id
 */
@DataPermission({
    @DataColumn(key = "deptName", value = "u.dept_id"),
    @DataColumn(key = "userName", value = "u.user_id")
})
@Override
public TableDataInfo<SysUserVo> pageWithPermission(SysUserBo bo, PageQuery pageQuery) {
    // ...
}
```

### 场景 E：临时忽略数据权限

某些场景需要查询全量数据（如统计、初始化）。

```java
import org.dromara.common.mybatis.helper.DataPermissionHelper;

@Service
public class StatisticsServiceImpl implements IStatisticsService {

    @Autowired
    private IOrderService orderService;

    /**
     * 统计总数（需要全量数据）
     */
    @Override
    public Long countTotal() {
        // 忽略数据权限，查询所有数据
        return DataPermissionHelper.ignore(() -> {
            return orderService.count();
        });
    }

    /**
     * 初始化缓存（需要全量数据）
     */
    @Override
    public void initCache() {
        DataPermissionHelper.ignore(() -> {
            List<Config> configs = configService.list();
            // 处理缓存...
            return null;
        });
    }
}
```

### 场景 F：指定权限标识跳过过滤

拥有特定权限的角色可以跳过数据过滤。

```java
/**
 * 拥有 order:all 权限的角色可以查看所有订单
 */
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept", permission = "order:all")
})
@Override
public List<Order> listAllOrders(OrderBo bo) {
    return list(buildQueryWrapper(bo));
}
```

---

## 4. 扩展自定义权限类型

### 4.1 添加新的权限类型

**步骤 1**：修改 `DataScopeType` 枚举

```java
// 位置：ruoyi-common-mybatis/.../enums/DataScopeType.java

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

**步骤 2**：在 `ISysDataScopeService` 中添加方法

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

**步骤 3**：使用新权限类型

```java
@DataPermission({
    @DataColumn(key = "regionName", value = "region_id")
})
@Override
public List<Store> listByRegion(StoreBo bo) {
    return list(buildQueryWrapper(bo));
}
```

### 4.2 添加自定义变量

通过 `DataPermissionHelper` 设置自定义变量供 SpEL 表达式使用。

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final OrderMapper baseMapper;  // ✅ 直接注入 Mapper（NO DAO!）

    @Override
    public TableDataInfo<OrderVo> pageByShop(Long shopId, OrderBo bo, PageQuery pageQuery) {
        // 设置自定义变量（请求结束后 SaStorage 自动清理，无需手动移除）
        DataPermissionHelper.setVariable("shopId", shopId);
        return pageWithPermission(bo, pageQuery);
    }

    // Service 中使用
    @DataPermission({
        @DataColumn(key = "shopId", value = "shop_id")  // 使用自定义变量
    })
    private TableDataInfo<OrderVo> pageWithPermission(OrderBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<Order> lqw = buildQueryWrapper(bo);
        Page<OrderVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }
}
```

---

## 5. 禁止项与必须项

### 5.1 绝对禁止

```java
// ❌ 禁止 1：在 ISysDataScopeService 内调用带权限的方法（导致死循环）
@Service("sdss")
public class SysDataScopeServiceImpl implements ISysDataScopeService {

    @Override
    public String getDeptAndChild(Long deptId) {
        // ❌ 禁止！deptService.list() 如果带 @DataPermission 会死循环
        List<SysDept> depts = deptService.list(wrapper);

        // ✅ 正确：直接使用 Mapper 或忽略权限
        List<SysDept> depts = deptMapper.selectList(wrapper);
        // 或
        List<SysDept> depts = DataPermissionHelper.ignore(() -> deptService.list(wrapper));
    }
}

// ❌ 禁止 2：表别名不匹配
@DataPermission({
    @DataColumn(key = "deptName", value = "user.dept_id")  // ❌ 别名是 user
})
// 但 SQL 是：SELECT * FROM sys_user u ...  // 别名是 u

// ✅ 正确
@DataPermission({
    @DataColumn(key = "deptName", value = "u.dept_id")  // ✅ 与 SQL 别名一致
})

// ❌ 禁止 3：在 Controller 层使用 @DataPermission
@RestController
public class OrderController {
    @DataPermission({...})  // ❌ 无效！必须在 Service/Mapper 层
    @GetMapping("/list")
    public R<List<OrderVo>> list() { }
}
```

### 5.2 必须遵守

```java
// ✅ 必须 1：Entity 继承 TenantEntity（包含 create_dept、create_by）
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("m_order")
public class Order extends TenantEntity {  // ✅ 继承 TenantEntity
    // ...
}

// ✅ 必须 2：@DataPermission 放在 Service 实现类或 Mapper 接口上
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final OrderMapper baseMapper;  // ✅ 直接注入 Mapper

    @DataPermission({...})  // ✅ 正确位置
    @Override
    public TableDataInfo<OrderVo> pageWithPermission(...) { }
}

// ✅ 必须 3：多表查询时使用正确的表别名
// SQL: SELECT o.*, u.user_name FROM m_order o LEFT JOIN sys_user u ON o.create_by = u.user_id
@DataPermission({
    @DataColumn(key = "deptName", value = "o.create_dept"),  // ✅ 订单表别名 o
    @DataColumn(key = "userName", value = "o.create_by")     // ✅ 使用 o.create_by
})
```

---

## 6. 问题排查清单

### 6.1 数据权限不生效

| 检查项 | 可能原因 | 解决方案 |
|--------|---------|---------|
| 是否超级管理员 | 超管和租户管理员自动跳过权限 | 使用普通用户测试 |
| 角色是否配置数据权限 | 角色的数据范围为"全部数据" | 修改角色数据权限范围 |
| 注解位置是否正确 | @DataPermission 不在 Service/Mapper 层 | 移动注解到 Service 实现类 |
| 表别名是否匹配 | value 中的别名与 SQL 不一致 | 检查并修正表别名 |
| 是否调用了带注解的方法 | Service 调用了不带注解的方法 | 确保调用带 @DataPermission 的方法 |

### 6.2 SQL 语法错误

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `Unknown column` | 表别名不存在 | 检查 value 中的表别名 |
| `dept_id IN ()` | 权限服务返回空 | 检查 ISysDataScopeService 实现 |
| 条件重复拼接 | 多次调用带权限的方法 | 检查调用链 |

### 6.3 调试技巧

```yaml
# application.yml - 开启 SQL 日志查看拼接结果
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

```java
// 代码中打印当前用户权限信息
LoginUser user = LoginHelper.getLoginUser();
log.info("当前用户: {}, 部门: {}, 角色: {}",
    user.getUserId(),
    user.getDeptId(),
    user.getRoles().stream()
        .map(r -> r.getRoleName() + "(" + r.getDataScope() + ")")
        .collect(Collectors.joining(",")));
```

---

## 7. 常见问题 FAQ

### Q1：如何让某个接口不受数据权限限制？

```java
// 方法 1：使用 DataPermissionHelper.ignore()
public List<Order> listAll() {
    return DataPermissionHelper.ignore(() -> orderService.list());
}

// 方法 2：调用不带 @DataPermission 的 Service 方法
public List<Order> listAll() {
    return orderService.list();  // 这个方法没有 @DataPermission
}

// 方法 3：使用 permission 参数
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept", permission = "order:all")
})
// 拥有 order:all 权限的角色不过滤
```

### Q2：多角色用户权限如何计算？

- **SELECT 查询**：多个角色的权限用 `OR` 连接（权限并集）
- **UPDATE/DELETE**：多个角色的权限用 `AND` 连接（权限交集）
- 可通过 `joinStr` 参数自定义

```java
@DataPermission(value = {
    @DataColumn(key = "deptName", value = "create_dept")
}, joinStr = "AND")  // 强制使用 AND 连接
```

### Q3：如何只对特定方法启用数据权限？

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final OrderMapper baseMapper;  // ✅ 直接注入 Mapper

    // 不带权限的普通查询
    @Override
    public List<Order> list(LambdaQueryWrapper<Order> wrapper) {
        return baseMapper.selectList(wrapper);
    }

    // 带权限的查询（命名区分）
    @DataPermission({
        @DataColumn(key = "deptName", value = "create_dept")
    })
    @Override
    public List<Order> listWithPermission(LambdaQueryWrapper<Order> wrapper) {
        return baseMapper.selectList(wrapper);
    }
}
```

### Q4：如何在 Mapper XML 中使用数据权限？

```java
// Mapper 接口
@DataPermission({
    @DataColumn(key = "deptName", value = "o.create_dept")
})
List<OrderVo> selectOrderReport(@Param("bo") OrderBo bo);
```

```xml
<!-- Mapper XML -->
<select id="selectOrderReport" resultType="OrderVo">
    SELECT o.*, u.user_name
    FROM m_order o
    LEFT JOIN sys_user u ON o.create_by = u.user_id
    WHERE o.status = #{bo.status}
    <!-- 数据权限会自动追加到这里 -->
</select>
```

---

## 8. 参考文件路径

### 核心文件

| 文件 | 路径 |
|------|------|
| @DataPermission | `ruoyi-common/ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/annotation/DataPermission.java` |
| @DataColumn | `ruoyi-common/ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/annotation/DataColumn.java` |
| DataScopeType | `ruoyi-common/ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/enums/DataScopeType.java` |
| PlusDataPermissionInterceptor | `ruoyi-common/ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/interceptor/PlusDataPermissionInterceptor.java` |
| PlusDataPermissionHandler | `ruoyi-common/ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/handler/PlusDataPermissionHandler.java` |
| DataPermissionHelper | `ruoyi-common/ruoyi-common-mybatis/src/main/java/org/dromara/common/mybatis/helper/DataPermissionHelper.java` |
| ISysDataScopeService | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/ISysDataScopeService.java` |

### 使用示例

| 文件 | 路径 |
|------|------|
| SysUserServiceImpl | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/impl/SysUserServiceImpl.java` |
| SysRoleServiceImpl | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/impl/SysRoleServiceImpl.java` |
| SysDeptMapper | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/mapper/SysDeptMapper.java` |

---

## 多项目适配说明


## 注意事项

- 如果需要 leniu-tengyun-core 项目的数据权限开发规范，请使用 `leniu-data-permission` skill
- leniu-tengyun-core 使用物理库隔离架构，与 RuoYi-Vue-Plus 的逻辑隔离方式不同
