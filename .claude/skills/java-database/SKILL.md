---
name: java-database
description: |
  Java数据库设计和SQL规范。当创建数据库表、编写Flyway迁移脚本或编写SQL时使用此skill。
  
    触发场景：
    - 创建数据库表（表结构设计、字段命名、索引设计）
    - 编写Flyway数据库迁移脚本
    - 设计审计字段和标准表结构
    - 多数据库兼容（MySQL/PostgreSQL/Oracle）
  
    触发词：建表、数据库设计、SQL规范、Flyway、迁移脚本、字段命名、索引设计、CREATE TABLE、审计字段、数据库迁移
---

# Java 数据库规范

## 表结构模板

```sql
CREATE TABLE `table_name` (
    `id` bigint NOT NULL COMMENT '主键ID',

    -- 业务字段
    `field_name` varchar(100) NOT NULL COMMENT '字段描述',
    `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态(0-禁用,1-启用)',

    -- 标准审计字段
    `crby` varchar(64) DEFAULT NULL COMMENT '创建人',
    `crtime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `upby` varchar(64) DEFAULT NULL COMMENT '修改人',
    `uptime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志(0-未删除,1-已删除)',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_field_name` (`field_name`, `del_flag`),
    KEY `idx_status_del_flag` (`status`, `del_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='表描述';
```

## 命名规范

### 表名
- 使用小写字母和下划线
- 格式: `{模块}_{业务名}`
- 示例: `monitor_safety_back`、`dining_record`

### 字段名
- 使用小写字母和下划线
- 布尔字段: `is_xxx` (数据库)、`xxx` (Java)
- 示例: `tenant_id`、`create_time`、`is_deleted`

### 索引名
- 主键: `pk_{字段名}`
- 唯一索引: `uk_{字段名}`
- 普通索引: `idx_{字段名}`
- 示例: `pk_id`、`uk_tenant_id`、`idx_status_del_flag`

## 标准字段

### 主键
- `id` bigint NOT NULL COMMENT '主键ID'
- 使用雪花ID生成

### 审计字段(必填)
```sql
`crby` varchar(64) DEFAULT NULL COMMENT '创建人',
`crtime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
`upby` varchar(64) DEFAULT NULL COMMENT '修改人',
`uptime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
`del_flag` tinyint NOT NULL DEFAULT '0' COMMENT '删除标志(0-未删除,1-已删除)'
```



## 字段类型规范

| 类型 | MySQL类型 | Java类型 | 说明 |
|------|-----------|----------|------|
| 主键 | bigint | Long | 使用雪花ID |
| 字符串(短) | varchar(n) | String | n<=5000 |
| 字符串(长) | text | String | >5000 |
| 整数 | int | Integer | - |
| 大整数 | bigint | Long | - |
| 小数 | decimal(m,d) | BigDecimal | 金额使用 |
| 布尔 | tinyint | Integer | 0/1 |
| 日期时间 | datetime | LocalDateTime | 统一使用datetime |
| JSON | json | String | 复杂结构 |

## Flyway迁移脚本

### 命名规范
```
db/migration/business/upgrade/
└── V{version}__{description}.sql
```

示例: `V5.52.2.2.0__add_payment_type_table.sql`

### 版本号规范
- 格式: `V{大版本}.{小版本}.{修正版本}.{迁移版本}.{序号}`
- 示例: `V5.52.2.2.0`

## SQL编写规范

### SELECT语句
- 禁止使用`SELECT *`
- 明确指定查询字段
- 使用`<where>`和`<if>`动态SQL

### INSERT语句
- 明确指定字段列表
- 不省略列名

### UPDATE语句
- 必须有WHERE条件
- 软更新使用`del_flag`

### DELETE语句
- 优先使用软删除(`del_flag=1`)
- 物理删除需要特别确认

## 索引设计

### 必须加索引的场景
- WHERE条件字段
- JOIN关联字段
- ORDER BY排序字段
- 唯一性字段

### 索引规范
- 唯一索引包含`del_flag`
- 复合索引考虑选择性
- 避免冗余索引
