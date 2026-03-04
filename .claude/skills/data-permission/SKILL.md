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

> 通过 MyBatis 拦截器自动注入 WHERE 条件，实现行级数据过滤。

## 1. 六种权限类型

| 类型 | 字典值 | SQL 效果 |
|------|--------|---------|
| 全部数据 | 1 | 不拼接条件 |
| 自定义权限 | 2 | `dept_id IN (角色关联的部门ID)` |
| 本部门 | 3 | `dept_id = 100` |
| 本部门及以下 | 4 | `dept_id IN (100,101,102)` |
| 仅本人 | 5 | `create_by = 1` |
| 部门及以下或本人 | 6 | `dept_id IN (...) OR create_by = 1` |

---

## 2. 快速上手

### 步骤 1：Service 方法加注解

```java
import org.dromara.common.mybatis.annotation.DataPermission;
import org.dromara.common.mybatis.annotation.DataColumn;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final OrderMapper baseMapper;

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
    -- 业务字段 ...
    create_dept  BIGINT(20)   DEFAULT NULL COMMENT '创建部门',  -- 必须
    create_by    BIGINT(20)   DEFAULT NULL COMMENT '创建人',    -- 必须
    create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

### 步骤 3：角色管理中配置数据权限范围

---

## 3. 使用场景

### 按部门过滤（最常见）

```java
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept")
})
public List<Order> listWithPermission(OrderBo bo) {
    return list(buildQueryWrapper(bo));
}
```

### 按创建人过滤

```java
@DataPermission({
    @DataColumn(key = "userName", value = "create_by")
})
public List<Task> listMyTasks(TaskBo bo) {
    return list(buildQueryWrapper(bo));
}
```

### 部门 + 创建人混合

```java
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept"),
    @DataColumn(key = "userName", value = "create_by")
})
public TableDataInfo<ProjectVo> pageWithPermission(ProjectBo bo, PageQuery pageQuery) {
    // ...
}
```

### 多表关联（使用表别名）

```java
// SQL: SELECT u.*, d.dept_name FROM sys_user u LEFT JOIN sys_dept d ON ...
@DataPermission({
    @DataColumn(key = "deptName", value = "u.dept_id"),
    @DataColumn(key = "userName", value = "u.user_id")
})
```

### 临时忽略数据权限

```java
import org.dromara.common.mybatis.helper.DataPermissionHelper;

// 忽略数据权限，查全量
Long total = DataPermissionHelper.ignore(() -> orderService.count());

// 无返回值
DataPermissionHelper.ignore(() -> {
    List<Config> configs = configService.list();
    return null;
});
```

### 指定权限标识跳过过滤

```java
// 拥有 order:all 权限的角色不过滤
@DataPermission({
    @DataColumn(key = "deptName", value = "create_dept", permission = "order:all")
})
```

---

## 4. Mapper XML 中使用

```java
// Mapper 接口
@DataPermission({
    @DataColumn(key = "deptName", value = "o.create_dept")
})
List<OrderVo> selectOrderReport(@Param("bo") OrderBo bo);
```

```xml
<select id="selectOrderReport" resultType="OrderVo">
    SELECT o.*, u.user_name
    FROM m_order o
    LEFT JOIN sys_user u ON o.create_by = u.user_id
    WHERE o.status = #{bo.status}
    <!-- 数据权限自动追加到这里 -->
</select>
```

---

## 5. 扩展自定义权限类型

> 详细步骤见 `references/custom-data-scope.md`

**步骤 1**：修改 `DataScopeType` 枚举

```java
REGION("7", "按区域", "#{#regionName} IN ( #{@sdss.getUserRegions( #user.userId )} )"),
```

**步骤 2**：在 `ISysDataScopeService` 添加方法

```java
@Service("sdss")
public class SysDataScopeServiceImpl implements ISysDataScopeService {
    @Override
    @Cacheable(cacheNames = CacheNames.SYS_USER_REGIONS, key = "#userId")
    public String getUserRegions(Long userId) {
        List<Long> regionIds = userRegionMapper.selectRegionIdsByUserId(userId);
        return CollUtil.isEmpty(regionIds) ? "-1" : StringUtils.join(regionIds, ",");
    }
}
```

**步骤 3**：使用

```java
@DataPermission({
    @DataColumn(key = "regionName", value = "region_id")
})
```

### 自定义变量

```java
// 设置自定义变量（请求结束后自动清理）
DataPermissionHelper.setVariable("shopId", shopId);

@DataPermission({
    @DataColumn(key = "shopId", value = "shop_id")
})
```

---

## 6. 多角色权限计算

- **SELECT 查询**：多角色权限用 `OR` 连接（并集）
- **UPDATE/DELETE**：多角色权限用 `AND` 连接（交集）
- 可通过 `joinStr` 参数自定义：

```java
@DataPermission(value = {
    @DataColumn(key = "deptName", value = "create_dept")
}, joinStr = "AND")
```

---

## 7. 禁止项

```java
// ❌ 在 ISysDataScopeService 内调用带权限的方法（死循环）
public String getDeptAndChild(Long deptId) {
    deptService.list(wrapper);  // 如果带 @DataPermission 会死循环
    // ✅ 直接用 Mapper 或 DataPermissionHelper.ignore()
    deptMapper.selectList(wrapper);
}

// ❌ 表别名不匹配
@DataColumn(key = "deptName", value = "user.dept_id")  // SQL 别名是 u
// ✅ @DataColumn(key = "deptName", value = "u.dept_id")

// ❌ 在 Controller 层使用 @DataPermission（无效！）
// ✅ 必须在 Service 实现类或 Mapper 接口上

// ✅ Entity 必须继承 TenantEntity（包含 create_dept、create_by）
// ✅ 多表查询时使用正确的表别名
```

---

## 8. 问题排查

| 检查项 | 可能原因 | 解决方案 |
|--------|---------|---------|
| 超级管理员？ | 超管自动跳过权限 | 用普通用户测试 |
| 角色数据范围？ | 范围为"全部数据" | 修改角色数据权限 |
| 注解位置？ | 不在 Service/Mapper 层 | 移动到 Service 实现类 |
| 表别名？ | value 别名与 SQL 不一致 | 检查修正别名 |
| Unknown column？ | 表别名不存在 | 检查 value 中的别名 |
| dept_id IN ()？ | 权限服务返回空 | 检查 ISysDataScopeService |

**调试**：开启 SQL 日志查看拼接结果

```yaml
mybatis-plus:
  configuration:
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

---

## 9. 核心类位置

| 类 | 路径 |
|---|------|
| `@DataPermission` | `ruoyi-common/ruoyi-common-mybatis/.../annotation/DataPermission.java` |
| `@DataColumn` | `ruoyi-common/ruoyi-common-mybatis/.../annotation/DataColumn.java` |
| `DataScopeType` | `ruoyi-common/ruoyi-common-mybatis/.../enums/DataScopeType.java` |
| `DataPermissionHelper` | `ruoyi-common/ruoyi-common-mybatis/.../helper/DataPermissionHelper.java` |
| `PlusDataPermissionHandler` | `ruoyi-common/ruoyi-common-mybatis/.../handler/PlusDataPermissionHandler.java` |
| 使用示例 | `ruoyi-modules/ruoyi-system/.../impl/SysUserServiceImpl.java` |

---

## 多项目适配说明

- 如果需要 leniu-tengyun-core 项目的数据权限开发规范，请使用 `leniu-data-permission` skill
- leniu-tengyun-core 使用物理库隔离架构，与 RuoYi-Vue-Plus 的逻辑隔离方式不同
