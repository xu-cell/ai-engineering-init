---
name: database-ops
description: |
  数据库操作规范。包含建表模板、Entity 实体类模板、八大数据库设计模式、多数据库兼容。

  触发场景：
  - 创建数据库表（MySQL/PostgreSQL/Oracle/SQL Server）
  - 设计 Entity 实体类（TenantEntity、@TableLogic、@Version）
  - 配置逻辑删除、乐观锁、审计字段
  - 树结构表设计（祖先路径法/父子法）
  - 字典数据和菜单 SQL 配置

  触发词：数据库、SQL、建表、CREATE TABLE、Entity、TenantEntity、@TableLogic、del_flag、逻辑删除、字典、菜单SQL、表设计、字段设计、数据库设计
---

# 数据库操作规范（RuoYi-Vue-Plus 三层架构版）

> **⚠️ 重要声明**: 本项目是 **RuoYi-Vue-Plus 纯后端项目**，采用三层架构！
> 本文档规范基于 **TestDemo 模块**的真实实现。

## 核心架构特征

| 对比项 | 本项目 (RuoYi-Vue-Plus) |
|--------|----------------------|
| **包名前缀** | `org.dromara.*` |
| **架构** | 三层：Controller → Service → Mapper |
| **Entity基类** | `TenantEntity`（多租户） |
| **主键策略** | 雪花 ID（不用 AUTO_INCREMENT） |
| **逻辑删除** | `@TableLogic private Long delFlag;`（Long 类型） |
| **乐观锁** | `@Version private Long version;` |
| **对象转换** | `MapstructUtils.convert()` |
| **表前缀** | 按模块区分：sys_/test_/flow_ 等 |

---

## 1. Entity 实体类模板（带逻辑删除）

```java
package org.dromara.demo.domain;

import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.io.Serial;

/**
 * XXX 对象
 *
 * @author Lion Li
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("demo_xxx")
public class Xxx extends TenantEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键 ID
     */
    @TableId(value = "id")
    private Long id;

    /**
     * 名称
     */
    private String xxxName;

    /**
     * 状态（0正常 1停用）
     */
    private String status;

    /**
     * 版本号（乐观锁）
     */
    @Version
    private Long version;

    /**
     * 删除标志（0正常 1已删除）
     * ✅ 使用 @TableLogic 标记，MyBatis-Plus 自动处理逻辑删除
     * ✅ 类型必须是 Long（自动映射到数据库 del_flag BIGINT）
     */
    @TableLogic
    private Long delFlag;
}
```

---

## 2. MySQL CREATE TABLE 模板

```sql
CREATE TABLE `demo_xxx` (
    -- 主键和租户
    `id` BIGINT(20) NOT NULL COMMENT '主键 ID',
    `tenant_id` VARCHAR(20) DEFAULT '000000' COMMENT '租户 ID',

    -- 业务字段
    `xxx_name` VARCHAR(100) NOT NULL COMMENT '名称',
    `status` CHAR(1) DEFAULT '0' COMMENT '状态(0正常 1停用)',

    -- 版本和删除
    `version` INT(0) DEFAULT 0 COMMENT '版本号',
    `del_flag` BIGINT(20) DEFAULT 0 COMMENT '删除标志(0正常 1已删除)',

    -- 审计字段（必须）
    `create_dept` BIGINT(20) DEFAULT NULL COMMENT '创建部门',
    `create_by` BIGINT(20) DEFAULT NULL COMMENT '创建人',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by` BIGINT(20) DEFAULT NULL COMMENT '更新人',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注（可选业务字段，不在 BaseEntity 中）',

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='XXX表';
```

---

## 3. PostgreSQL CREATE TABLE 模板

```sql
CREATE TABLE demo_xxx (
    -- 主键和租户
    id BIGINT NOT NULL,
    tenant_id VARCHAR(20) DEFAULT '000000',

    -- 业务字段
    xxx_name VARCHAR(100) NOT NULL,
    status CHAR(1) DEFAULT '0',

    -- 版本和删除
    version INT DEFAULT 0,
    del_flag BIGINT DEFAULT 0,

    -- 审计字段
    create_dept BIGINT DEFAULT NULL,
    create_by BIGINT DEFAULT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_by BIGINT DEFAULT NULL,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remark VARCHAR(500) DEFAULT NULL,

    PRIMARY KEY (id)
);

COMMENT ON TABLE demo_xxx IS 'XXX表';
COMMENT ON COLUMN demo_xxx.id IS '主键 ID';
COMMENT ON COLUMN demo_xxx.tenant_id IS '租户 ID';
COMMENT ON COLUMN demo_xxx.xxx_name IS '名称';
COMMENT ON COLUMN demo_xxx.del_flag IS '删除标志(0正常 1已删除)';
```

---

## 4. 八大数据库设计模式

### 模式一：多租户隔离

```java
// 自动处理：TenantEntity 已包含
private String tenantId;  // 自动填充为当前租户 ID

// SQL 查询自动添加租户过滤：
// WHERE tenant_id = ?
```

**使用场景**：所有需要租户隔离的业务表

---

### 模式二：树结构 - 祖先路径法（推荐）

```sql
CREATE TABLE demo_tree (
    id BIGINT NOT NULL,
    parent_id BIGINT,
    ancestors VARCHAR(500),  -- 祖先路径：0,1,2,3
    name VARCHAR(100),
    del_flag BIGINT DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_ancestors (ancestors)
) COMMENT='树形表';
```

**优势**：快速查询所有祖先和子孙节点（无需递归）

---

### 模式三：树结构 - 简单父子法

```sql
CREATE TABLE demo_tree_simple (
    id BIGINT NOT NULL,
    parent_id BIGINT,
    name VARCHAR(100),
    del_flag BIGINT DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (parent_id) REFERENCES demo_tree_simple(id)
) COMMENT='简单树形表';
```

**适用**：二级分类、简单层级

---

### 模式四：软删除（逻辑删除）

```java
// Java Entity 中
@TableLogic
private Long delFlag;  // 0=正常，1=已删除

// MyBatis-Plus 自动处理
// INSERT/UPDATE: 业务代码不变
// SELECT: 自动添加 WHERE del_flag = 0
// DELETE: 转换为 UPDATE del_flag = 1
```

**优势**：数据可恢复，审计日志完整

---

### 模式五：审计追踪（自动填充）

```sql
CREATE TABLE demo_audit (
    id BIGINT NOT NULL,
    create_dept BIGINT,      -- 创建部门（自动填充）
    create_by BIGINT,        -- 创建人（自动填充）
    create_time DATETIME,    -- 创建时间（自动填充）
    update_by BIGINT,        -- 更新人（自动填充）
    update_time DATETIME,    -- 更新时间（自动填充）
    PRIMARY KEY (id)
) COMMENT='带审计的表';
```

**TenantEntity 已包含所有审计字段**

---

### 模式六：状态字段（字典驱动）

```java
@ExcelProperty(value = "状态")
@ExcelDictFormat(dictType = "sys_normal_disable")
private String status;  // 0=正常，1=停用
```

**配合字典表**：不硬编码状态值，支持动态扩展

---

### 模式七：数据权限控制

```java
// ✅ 在 Mapper 接口上标注（类级别或方法级别均可）
@DataPermission({
    @DataColumn(key = "deptName", value = "dept_id"),
    @DataColumn(key = "userName", value = "user_id")
})
public interface XxxMapper extends BaseMapperPlus<Xxx, XxxVo> {
}
```

**权限类型**（通过 `sys_role.data_scope` 配置）：
- 1=全部数据权限、2=自定义数据权限、3=本部门数据权限
- 4=本部门及以下数据权限、5=仅本人数据权限

---

### 模式八：跨数据库兼容

| 场景 | MySQL | PostgreSQL | Oracle | SQL Server |
|------|-------|-----------|--------|------------|
| 查询 Long 字段 | `LIKE` | `CAST AS VARCHAR)` | `TO_CHAR()` | `CAST` |
| 自增ID | MyBatis-Plus 雪花ID | 同 | 同 | 同 |
| 日期函数 | `CURRENT_TIMESTAMP` | `NOW()` | `SYSDATE` | `GETDATE()` |

---

## 5. 模块表前缀参考

| 模块 | 前缀 | 包路径 | 示例表 |
|------|------|--------|---------|
| system | `sys_` | `org.dromara.system` | sys_user, sys_menu |
| demo | `test_` | `org.dromara.demo` | test_demo, test_tree |
| workflow | `flow_` | `org.dromara.workflow` | flow_xxx |

---

## 6. 常见错误对比

### ❌ 不要做

```sql
-- 错误1: 使用自增 ID
id INT AUTO_INCREMENT

-- 错误2: 使用 TINYINT 存储删除标志
del_flag TINYINT(1)  -- ❌ 应该用 BIGINT

-- 错误3: 软删除字段缺少注释
del_flag BIGINT  -- ❌ 应添加注释说明用途

-- 错误4: 缺少审计字段
CREATE TABLE xxx (id BIGINT)  -- ❌ 缺少 create_by, update_by 等

-- 错误5: 字段名不规范
userName VARCHAR(50)  -- ❌ 应该是 user_name

-- 错误6: COMMENT 使用英文（⚠️ 高频错误，尤其 Codex 协作时）
`user_name` VARCHAR(50) COMMENT 'user name'        -- ❌ 禁止英文！
`status` CHAR(1) COMMENT 'status(0=normal 1=off)'  -- ❌ 禁止英文！
COMMENT='user table'                                -- ❌ 表注释也禁止英文！
```

### ✅ 正确做法

```sql
-- 正确1: 使用雪花 ID（MyBatis-Plus 自动生成）
id BIGINT(20) NOT NULL

-- 正确2: 逻辑删除字段用 BIGINT
del_flag BIGINT(20) DEFAULT 0 COMMENT '删除标志'

-- 正确3: 添加完整注释
del_flag BIGINT(20) DEFAULT 0 COMMENT '删除标志(0正常 1已删除)'

-- 正确4: 包含所有审计字段（TenantEntity 提供）
CREATE TABLE xxx (
    create_by BIGINT,
    create_time DATETIME,
    update_by BIGINT,
    update_time DATETIME
)

-- 正确5: 字段名使用蛇形命名法
user_name VARCHAR(50)

-- 正确6: COMMENT 必须使用中文
`user_name` VARCHAR(50) COMMENT '用户名'                  -- ✅ 中文
`status` CHAR(1) DEFAULT '0' COMMENT '状态(0正常 1停用)'   -- ✅ 中文
COMMENT='用户表'                                           -- ✅ 表注释中文
```

---

## 7. 检查清单

生成表前必须检查：

- [ ] **主键是否是 BIGINT(20)？**（使用雪花 ID）
- [ ] **是否有 tenant_id 字段？**（多租户隔离）
- [ ] **是否有 del_flag BIGINT 字段？**（逻辑删除）
- [ ] **是否有 version BIGINT 字段？**（乐观锁）
- [ ] **是否有完整的审计字段？**（create_by, create_time, update_by, update_time）
- [ ] **字段名是否全部使用蛇形命名法？**（xxx_name 而非 xxxName）
- [ ] **所有字段是否有注释？**
- [ ] **所有 COMMENT 是否使用中文？**（禁止英文 COMMENT，包括字段注释和表注释）
- [ ] **Entity 是否继承 TenantEntity？**
- [ ] **@TableLogic 注解是否应用到 delFlag？**
- [ ] **SQL 脚本是否保存到正确目录？**（script/sql/ry_vue_5.X.sql）

---

## 8. SQL 文件位置

| 数据库 | 脚本位置 |
|--------|---------|
| MySQL | `script/sql/ry_vue_5.X.sql` |
| PostgreSQL | `script/sql/postgres/postgres_ry_vue_5.X.sql` |
| Oracle | `script/sql/oracle/oracle_ry_vue_5.X.sql` |
| SQL Server | `script/sql/sqlserver/sqlserver_ry_vue_5.X.sql` |

---

## 参考实现

查看已有的完整实现：

- **Entity 参考**: `org.dromara.demo.domain.TestDemo`
- **表结构参考**: `script/sql/ry_vue_5.X.sql` 中的 test_demo 表

**特别注意**：
- ✅ 软删除字段类型是 `Long delFlag`（不是 CHAR(1)）
- ✅ MyBatis-Plus 自动将 Java `delFlag` 映射到数据库 `del_flag`
- ✅ `@TableLogic` 注解自动处理查询和删除操作

---

## 多项目适配说明

### 不同项目数据库设计对比

| 项目特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|---------|----------------|-------------------|
| **主键类型** | 雪花 ID (Long) | 雪花 ID (Long) |
| **逻辑删除** | `del_flag BIGINT` | `del_flag TINYINT` |
| **审计字段** | `create_by`, `create_time` | `crby`, `crtime` |
| **表前缀** | `sys_`, `test_`, `flow_` | 按业务命名 |

### 通用数据库原则

1. **主键使用雪花 ID**：不使用 AUTO_INCREMENT
2. **必须包含审计字段**：创建人、创建时间、更新人、更新时间
3. **逻辑删除字段**：`del_flag` 或类似字段
4. **字段命名使用蛇形**：`user_name` 而非 `userName`
5. **索引命名规范**：`pk_`, `uk_`, `idx_` 前缀
6. **COMMENT 使用中文**：所有字段和表注释

### 参考 java*skill

更详细的规范请参考 `java-database` 技能。

---

## leniu-tengyun-core 数据库设计

### ⚠️ 双库架构（重要差异）

leniu-tengyun-core 采用**双库架构**进行租户隔离，与 RuoYi-Vue-Plus 的单库 tenant_id 方式完全不同：

| 特性 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| **隔离方式** | 单库 + tenant_id 字段 | 双库（商户库 + 系统库） |
| **租户字段** | Entity 包含 tenant_id | **Entity 不包含 tenant_id** |
| **路由机制** | SQL 自动拼接 tenant_id | 请求头决定访问哪个库 |

**双库架构说明**：
- **系统库**：前端请求头**不携带**商户ID时，自动请求系统库
- **商户库**：前端请求头**携带**商户ID时，自动请求商户库
- **租户上下文**：通过 `TenantContextHolder.getTenantId()` 获取，而非 Entity 字段

### 审计字段命名差异

| 字段用途 | RuoYi-Vue-Plus | leniu-tengyun-core |
|---------|----------------|-------------------|
| **创建人** | `create_by` | `crby` |
| **创建时间** | `create_time` | `crtime` |
| **更新人** | `update_by` | `upby` / `modby` |
| **更新时间** | `update_time` | `uptime` / `modtime` |
| **创建部门** | `create_dept` | 无 |
| **租户ID** | `tenant_id` (字段) | **无字段**（双库隔离） |
| **删除标志** | `del_flag BIGINT` | `del_flag TINYINT/INTEGER` |

### Entity 类示例

```java
// leniu-tengyun-core 风格
// ⚠️ 注意：不需要 tenant_id 字段！租户隔离通过双库架构实现
@Data
@TableName("leave_info")
@ApiModel("请假信息")
@EqualsAndHashCode(callSuper = false)
public class LeaveInfo extends Model<LeaveInfo> {

    @TableId(value = "id")  // 默认雪花ID
    private Long id;

    // ❌ 不需要 tenant_id 字段！
    // @TableField("tenant_id")
    // private Long tenantId;

    @TableField("leave_type")
    private String leaveType;

    @TableField("start_time")
    private LocalDateTime startTime;

    @TableField("end_time")
    private LocalDateTime endTime;

    @TableField("reason")
    private String reason;

    @TableField("status")
    private Integer status;

    @TableLogic
    @TableField("del_flag")
    private Integer delFlag;  // 1=删除, 2=正常 (DelFlagEnum)

    @TableField(value = "crby", fill = FieldFill.INSERT)
    private String crby;        // 创建人

    @TableField(value = "crtime", fill = FieldFill.INSERT)
    private LocalDateTime crtime;  // 创建时间

    @TableField(value = "upby", fill = FieldFill.UPDATE)
    private String upby;        // 更新人

    @TableField(value = "uptime", fill = FieldFill.UPDATE)
    private LocalDateTime uptime;  // 更新时间
}

// 获取租户ID的方式（从上下文获取，而非Entity字段）
Long tenantId = TenantContextHolder.getTenantId();
```

### 建表 SQL 对比

```sql
-- RuoYi-Vue-Plus 风格（单库 + tenant_id）
CREATE TABLE `sys_order` (
    `id` BIGINT(20) NOT NULL COMMENT '主键ID',
    `tenant_id` VARCHAR(20) DEFAULT '000000' COMMENT '租户ID',
    `order_no` VARCHAR(50) NOT NULL COMMENT '订单号',
    `status` CHAR(1) DEFAULT '0' COMMENT '状态',
    `create_dept` BIGINT(20) DEFAULT NULL COMMENT '创建部门',
    `create_by` BIGINT(20) DEFAULT NULL COMMENT '创建人',
    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_by` BIGINT(20) DEFAULT NULL COMMENT '更新人',
    `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag` BIGINT(20) DEFAULT 0 COMMENT '删除标志',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT='订单表';

-- leniu-tengyun-core 风格（双库架构，不需要 tenant_id）
CREATE TABLE `leave_info` (
    `id` BIGINT(20) NOT NULL COMMENT '主键ID',
    -- ❌ 不需要 tenant_id 字段！双库架构自动隔离
    `leave_type` VARCHAR(20) NOT NULL COMMENT '请假类型',
    `start_time` DATETIME NOT NULL COMMENT '开始时间',
    `end_time` DATETIME NOT NULL COMMENT '结束时间',
    `reason` VARCHAR(500) DEFAULT NULL COMMENT '请假原因',
    `status` INT DEFAULT 0 COMMENT '状态',
    `crby` VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    `crtime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `upby` VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    `uptime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag` TINYINT DEFAULT 2 COMMENT '删除标志(1删除 2正常)',
    PRIMARY KEY (`id`),
    INDEX `idx_crtime` (`crtime`)
) ENGINE=InnoDB COMMENT='请假信息表';
```

### 租户隔离方式对比

| 方式 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| **架构** | 单库多租户 | 双库（系统库 + 商户库） |
| **路由依据** | Entity 中的 tenant_id | 请求头中的商户ID |
| **Entity 字段** | 需要 tenant_id | 不需要 tenant_id |
| **获取租户** | `LoginHelper.getTenantId()` | `TenantContextHolder.getTenantId()` |
| **跨租户查询** | `TenantHelper.dynamic()` | `Executors.readInSystem()` |

详细规范请参考 `java-multitenant` 技能。

