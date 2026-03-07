---
name: database-ops
description: |
  通用数据库操作指南。涵盖建表规范、审计字段、逻辑删除、索引设计等。
  触发场景：建表、数据库设计、SQL 编写、数据迁移。
  触发词：建表、数据库、SQL、DDL、数据迁移、索引。
  注意：如果项目有专属技能（如 `leniu-database`），优先使用专属版本。
---

# 数据库操作指南

> 通用模板。如果项目有专属技能（如 `leniu-database`），优先使用。

## 核心规范

### 建表标准模板

```sql
CREATE TABLE t_order (
    id          BIGINT       NOT NULL                COMMENT '主键',
    order_no    VARCHAR(64)  NOT NULL                COMMENT '订单编号',
    status      TINYINT      NOT NULL DEFAULT 0      COMMENT '状态(0-待处理,1-已完成,2-已取消)',
    amount      BIGINT       NOT NULL DEFAULT 0      COMMENT '金额(单位:分)',
    remark      VARCHAR(500)          DEFAULT NULL   COMMENT '备注',
    create_by   VARCHAR(64)           DEFAULT NULL   COMMENT '创建人',
    create_time DATETIME              DEFAULT NULL   COMMENT '创建时间',
    update_by   VARCHAR(64)           DEFAULT NULL   COMMENT '更新人',
    update_time DATETIME              DEFAULT NULL   COMMENT '更新时间',
    deleted     TINYINT      NOT NULL DEFAULT 0      COMMENT '删除标识(0-正常,1-删除)',
    PRIMARY KEY (id),
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';
```

### 审计字段规范

| 字段 | 类型 | 说明 | 填充时机 |
|------|------|------|---------|
| `create_by` | VARCHAR(64) | 创建人 | INSERT |
| `create_time` | DATETIME | 创建时间 | INSERT |
| `update_by` | VARCHAR(64) | 更新人 | INSERT / UPDATE |
| `update_time` | DATETIME | 更新时间 | INSERT / UPDATE |
| `deleted` | TINYINT | 逻辑删除 | 手动 / 框架自动 |

> 审计字段自动填充可通过 MyBatis-Plus 的 `MetaObjectHandler` 实现。

### 逻辑删除

- `deleted = 0` 表示正常
- `deleted = 1` 表示已删除
- MyBatis-Plus 配置：

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 表名 | 小写下划线，建议加前缀 | `t_order`, `sys_user` |
| 字段名 | 小写下划线 | `order_no`, `create_time` |
| 主键 | `id` | `id BIGINT NOT NULL` |
| 外键字段 | `关联表_id` | `user_id`, `order_id` |
| 唯一索引 | `uk_字段名` | `uk_order_no` |
| 普通索引 | `idx_字段名` | `idx_status` |
| 联合索引 | `idx_字段1_字段2` | `idx_user_id_status` |

## 代码示例

### 审计字段自动填充

```java
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "createBy", String.class, getCurrentUser());
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateBy", String.class, getCurrentUser());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        this.strictUpdateFill(metaObject, "updateBy", String.class, getCurrentUser());
    }

    private String getCurrentUser() {
        // 从安全上下文获取当前用户，按项目实际实现
        return [你的用户上下文工具].getCurrentUsername();
    }
}
```

### 常见数据库设计模式

#### 模式一：树结构 - 祖先路径法

```sql
CREATE TABLE t_org (
    id          BIGINT       NOT NULL              COMMENT '主键',
    parent_id   BIGINT                DEFAULT NULL COMMENT '父节点ID',
    ancestors   VARCHAR(500)          DEFAULT NULL COMMENT '祖先路径(逗号分隔)',
    name        VARCHAR(100) NOT NULL              COMMENT '节点名称',
    sort        INT          NOT NULL DEFAULT 0    COMMENT '排序',
    create_by   VARCHAR(64)           DEFAULT NULL COMMENT '创建人',
    create_time DATETIME              DEFAULT NULL COMMENT '创建时间',
    update_by   VARCHAR(64)           DEFAULT NULL COMMENT '更新人',
    update_time DATETIME              DEFAULT NULL COMMENT '更新时间',
    deleted     TINYINT      NOT NULL DEFAULT 0    COMMENT '删除标识(0-正常,1-删除)',
    PRIMARY KEY (id),
    KEY idx_parent_id (parent_id),
    KEY idx_ancestors (ancestors(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组织树';
```

#### 模式二：关联表（多对多）

```sql
CREATE TABLE t_user_role (
    id      BIGINT NOT NULL              COMMENT '主键',
    user_id BIGINT NOT NULL              COMMENT '用户ID',
    role_id BIGINT NOT NULL              COMMENT '角色ID',
    create_time DATETIME DEFAULT NULL    COMMENT '创建时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联';
```

#### 模式三：状态字段（枚举驱动）

```java
@Getter
@AllArgsConstructor
public enum OrderStatusEnum {

    PENDING(0, "待处理"),
    COMPLETED(1, "已完成"),
    CANCELLED(2, "已取消");

    private final int code;
    private final String desc;
}

// SQL 字段
// status TINYINT NOT NULL DEFAULT 0 COMMENT '状态(0-待处理,1-已完成,2-已取消)'
```

### 常见查询模式

```sql
-- 分页查询（配合 MyBatis-Plus Page）
SELECT id, order_no, status, amount, create_time
FROM t_order
WHERE deleted = 0
  AND status = #{status}
ORDER BY create_time DESC;

-- 批量插入
INSERT INTO t_order (id, order_no, status, amount, create_by, create_time, deleted)
VALUES
    (#{id1}, #{orderNo1}, 0, #{amount1}, #{createBy}, NOW(), 0),
    (#{id2}, #{orderNo2}, 0, #{amount2}, #{createBy}, NOW(), 0);

-- 逻辑删除
UPDATE t_order SET deleted = 1, update_by = #{updateBy}, update_time = NOW()
WHERE id = #{id} AND deleted = 0;
```

### 索引设计原则

1. **必须有主键**：推荐 BIGINT 雪花 ID 或自增
2. **高频查询字段建索引**：WHERE、JOIN、ORDER BY 中的字段
3. **联合索引遵循最左前缀**：把区分度高的字段放前面
4. **避免在大文本字段上建索引**：TEXT、BLOB 等
5. **控制单表索引数量**：建议不超过 5-6 个

### 数据迁移脚本规范

```sql
-- V1.0.1__add_order_remark.sql
-- 描述：订单表新增备注字段
-- 作者：xxx
-- 日期：2024-01-01

ALTER TABLE t_order ADD COLUMN remark VARCHAR(500) DEFAULT NULL COMMENT '备注' AFTER amount;
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 用 VARCHAR 存金额 | 用 BIGINT 存分，或 DECIMAL(10,2) |
| 字段不加 COMMENT | 所有字段必须有注释 |
| 表没有主键 | 每张表必须有主键 |
| 用 UUID 做主键 | 推荐 BIGINT（索引友好） |
| 逻辑删除值搞反 | 确认项目约定（通用：0=正常, 1=删除） |
| 大表无索引 | 根据查询模式建立合适索引 |
| 字段允许 NULL 但业务不允许 | 加 NOT NULL 约束 + DEFAULT 值 |
| 直接物理删除数据 | 使用逻辑删除，保留数据可追溯 |
