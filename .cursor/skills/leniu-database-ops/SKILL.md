---
name: leniu-database-ops
description: |
  leniu-yunshitang-core 项目数据库操作规范。包含建表模板、Entity 实体类模板、双库架构设计模式、审计字段、逻辑删除。

  触发场景：
  - 创建 leniu 数据库表（MySQL）
  - 设计 Entity 实体类（审计字段、逻辑删除）
  - 配置逻辑删除、乐观锁
  - 双库架构（系统库+商户库）设计
  - 表字段设计

  适用项目：leniu-tengyun-core（云食堂项目）

  触发词：leniu-数据库、leniu-SQL、leniu-建表、leniu-Entity、leniu-双库、leniu-商户库、leniu-系统库、net.xnzn、leniu-yunshitang、云食堂数据库
---

# leniu-yunshitang-core 数据库操作规范

## 项目概述

leniu-yunshitang-core 是基于 **pigx-framework** 的智慧食堂云服务平台，采用**双库架构**（系统库 + 商户库）实现多租户隔离。

| 项目 | 路径 |
|------|------|
| **云食堂后端** | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core` |
| **包名前缀** | `net.xnzn.*` |

---

## 核心架构差异

| 对比项 | leniu-tengyun-core |
|--------|-------------------|
| **包名前缀** | `net.xnzn.*` |
| **数据库** | MySQL 8.0+ |
| **租户模式** | **双库架构**（系统库 + 商户库） |
| **Entity 基类** | 无基类（自定义审计字段） |
| **主键策略** | 雪花ID 或 自增ID |
| **逻辑删除** | `del_flag` (1=删除, 2=正常) |
| **审计字段** | `crby/crtime/upby/uptime` |
| **租户字段** | **无 tenant_id 字段**（双库隔离） |

---

## 1. 双库架构设计

### 架构说明

本项目采用**物理分离的双库架构**，而非单库多租户：

| 库类型 | 说明 | 数据范围 | 访问方式 |
|--------|------|---------|---------|
| **系统库** | 全局系统数据 | 租户信息、商户配置、系统字典等 | 默认访问（无 MERCHANT-ID） |
| **商户库** | 租户业务数据 | 订单、菜品、用户、设备等商户数据 | 请求头携带 MERCHANT-ID 时访问 |

**关键区别**：
- Entity 不需要 `tenant_id` 字段（物理库隔离）
- 通过 `TenantContextHolder.getTenantId()` 获取当前租户
- 使用 `Executors.doInTenant()` / `doInSystem()` 切换库

### 双库配置示例

```yaml
# bootstrap.yml
dataset:
  system:
    master:
      jdbcUrl: jdbc:mysql://${MYSQL_HOST:mysql}:${MYSQL_PORT:3306}/system
      username: ${MYSQL_USERNAME:root}
      password: ${MYSQL_PASSWORD:do@u.can}

tenant:
  carrier-name: MERCHANT-ID
```

### 多租户上下文

```java
// 获取当前租户ID
Long tenantId = TenantContextHolder.getTenantId();

// 在指定租户库执行操作
Executors.doInTenant(tenantId, () -> {
    // 业务代码 - 访问商户库
});

// 在系统库执行操作
Executors.doInSystem(() -> {
    // 业务代码 - 访问系统库
});

// 遍历所有租户执行
Executors.doInAllTenant(tenantId -> {
    // 业务代码
});
```

---

## 2. Entity 实体类模板（带审计字段）

```java
package net.xnzn.core.xxx.model;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * XXX 对象
 */
@Data
@Accessors(chain = true)
@TableName("xxx_table")
@ApiModel(value = "XXX对象", description = "XXX表")
public class XxxEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 主键 ID
     */
    @ApiModelProperty("主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 业务字段 - 名称
     */
    @ApiModelProperty("名称")
    @TableField("name")
    private String name;

    /**
     * 业务字段 - 状态
     */
    @ApiModelProperty("状态")
    @TableField("status")
    private Integer status;

    /**
     * 删除标识(1删除,2正常)
     * ⚠️ 注意：与 RuoYi 相反！
     */
    @ApiModelProperty("删除标识(1删除,2正常)")
    @TableField("del_flag")
    private Integer delFlag;

    /**
     * 乐观锁
     */
    @ApiModelProperty("乐观锁")
    @TableField("revision")
    private Integer revision;

    /**
     * 创建人
     */
    @ApiModelProperty("创建人")
    @TableField(value = "crby", fill = FieldFill.INSERT)
    private String crby;

    /**
     * 创建时间
     */
    @ApiModelProperty("创建时间")
    @TableField(value = "crtime", fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    /**
     * 更新人
     */
    @ApiModelProperty("更新人")
    @TableField(value = "upby", fill = FieldFill.INSERT_UPDATE)
    private String upby;

    /**
     * 更新时间
     */
    @ApiModelProperty("更新时间")
    @TableField(value = "uptime", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;
}
```

---

## 3. MySQL CREATE TABLE 模板

```sql
CREATE TABLE `xxx_table` (
    -- 主键
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',

    -- ⚠️ 注意：双库架构不需要 tenant_id 字段！

    -- 业务字段
    `name` VARCHAR(100) NOT NULL COMMENT '名称',
    `status` TINYINT(1) DEFAULT 1 COMMENT '状态(0停用 1启用)',

    -- 版本和删除
    `revision` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `del_flag` TINYINT(1) DEFAULT 2 COMMENT '删除标识(1删除 2正常)',

    -- 审计字段
    `crby` VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    `crtime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `upby` VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    `uptime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_crtime` (`crtime`),
    KEY `idx_del_flag` (`del_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='XXX表';
```

---

## 4. 八大数据库设计模式

### 模式一：双库多租户

```java
// ⚠️ 双库架构：Entity 不需要 tenant_id 字段
// 租户隔离通过物理库实现，而非 tenant_id 字段

// 获取当前租户ID（从上下文获取，而非 Entity 字段）
Long tenantId = TenantContextHolder.getTenantId();

// 查询时自动路由到对应租户库
List<XxxEntity> list = xxxMapper.selectList(wrapper);
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
    del_flag TINYINT DEFAULT 2,
    PRIMARY KEY (id),
    INDEX idx_ancestors (ancestors)
) COMMENT='树形表';
```

---

### 模式三：树结构 - 简单父子法

```sql
CREATE TABLE demo_tree_simple (
    id BIGINT NOT NULL,
    parent_id BIGINT,
    name VARCHAR(100),
    del_flag TINYINT DEFAULT 2,
    PRIMARY KEY (id)
) COMMENT='简单树形表';
```

---

### 模式四：逻辑删除

```java
// Java Entity 中
@TableField("del_flag")
private Integer delFlag;  // 1=删除，2=正常（注意与 RuoYi 相反！）

// MyBatis-Plus 查询时需要手动添加
wrapper.eq(XxxEntity::getDelFlag, 2);
```

---

### 模式五：审计追踪（自动填充）

```sql
CREATE TABLE demo_audit (
    id BIGINT NOT NULL,
    crby VARCHAR(64),      -- 创建人（自动填充）
    crtime DATETIME,       -- 创建时间（自动填充）
    upby VARCHAR(64),      -- 更新人（自动填充）
    uptime DATETIME,        -- 更新时间（自动填充）
    PRIMARY KEY (id)
) COMMENT='带审计的表';
```

---

### 模式六：状态字段

```java
@ApiModelProperty("状态")
@TableField("status")
private Integer status;  // 0=停用，1=启用
```

---

### 模式七：数据权限控制

```java
// leniu 项目通常在 Service 层进行权限过滤
// 通过 mgrAuthApi.getUserAuthPO() 获取用户权限
```

---

### 模式八：跨数据库兼容

| 场景 | MySQL | PostgreSQL | Oracle |
|------|-------|-----------|--------|
| 查询 Long 字段 | `LIKE` | `CAST AS VARCHAR` | `TO_CHAR()` |
| 主键策略 | 雪花ID/自增 | 同 | 同 |
| 日期函数 | `CURRENT_TIMESTAMP` | `NOW()` | `SYSDATE` |

---

## 5. 审计字段说明

| 字段 | 含义 | 类型 | 自动填充 |
|------|------|------|---------|
| `crby` | 创建人 | VARCHAR(64) | INSERT |
| `crtime` | 创建时间 | DATETIME | INSERT |
| `upby` | 更新人 | VARCHAR(64) | INSERT_UPDATE |
| `uptime` | 更新时间 | DATETIME | INSERT_UPDATE |

**注意**：
- `del_flag` 值与 RuoYi-Vue-Plus 相反！
  - leniu：1=删除，2=正常
  - RuoYi：0=正常，1=删除

---

## 6. 常见错误对比

### ❌ 不要做

```sql
-- 错误1: 使用 tenant_id 字段（双库架构不需要）
tenant_id VARCHAR(20) DEFAULT '000000',  -- ❌ 双库架构不需要！

-- 错误2: 使用错误的 del_flag 值
del_flag TINYINT DEFAULT 0,  -- ❌ leniu 中 2=正常

-- 错误3: 使用 RuoYi 审计字段命名
create_by BIGINT,  -- ❌ 应该用 crby
create_time DATETIME,  -- ❌ 应该用 crtime

-- 错误4: COMMENT 使用英文
`user_name` VARCHAR(50) COMMENT 'user name',  -- ❌ 禁止英文！

-- 错误5: 字段名不规范
userName VARCHAR(50)  -- ❌ 应该用 user_name
```

### ✅ 正确做法

```sql
-- 正确1: 双库架构不需要 tenant_id
-- （直接省略该字段）

-- 正确2: 使用正确的 del_flag 值
del_flag TINYINT DEFAULT 2 COMMENT '删除标识(1删除 2正常)',  -- ✅

-- 正确3: 使用 leniu 审计字段命名
crby VARCHAR(64) DEFAULT NULL COMMENT '创建人',  -- ✅
crtime DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',  -- ✅

-- 正确4: COMMENT 使用中文
`user_name` VARCHAR(50) COMMENT '用户名',  -- ✅

-- 正确5: 字段名使用蛇形命名法
user_name VARCHAR(50)  -- ✅
```

---

## 7. 检查清单

建表前必须检查：

- [ ] **主键是否是 BIGINT(20)**？（支持雪花ID或自增）
- [ ] **是否不需要 tenant_id 字段**？（双库架构）
- [ ] **是否有 del_flag TINYINT 字段**？（1=删除，2=正常）
- [ ] **是否有 revision INT 字段**？（乐观锁）
- [ ] **是否有完整的审计字段**？（crby, crtime, upby, uptime）
- [ ] **字段名是否全部使用蛇形命名法**？
- [ ] **所有字段是否有注释**？
- [ ] **所有 COMMENT 是否使用中文**？
- [ ] **Entity 审计字段是否配置了 FieldFill**？
- [ ] **Entity 是否正确使用了 @TableName 注解**？
- [ ] **Mapper XML 是否与 Java 文件同目录**？

---

## 8. SQL 文件位置

| 数据库 | 脚本位置 |
|--------|---------|
| MySQL | 根据实际项目配置位置存放 |

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| Entity 示例 | `core-bus/.../model/BusLine.java` |
| Mapper 示例 | `core-bus/.../mapper/BusLineMapper.java` |
| 配置文件 | `core-common/src/main/resources/bootstrap.yml` |

**项目路径**：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core`
