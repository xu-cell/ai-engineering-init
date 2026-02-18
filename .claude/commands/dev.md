# /dev - 开发新功能（RuoYi-Vue-Plus 纯后端版）

智能代码生成器配置助手，专为 RuoYi-Vue-Plus 三层架构（Controller→Service→Mapper）设计。

## 🎯 核心优势
- ✅ **纯后端专注**：无前端，专注后端 CRUD 代码生成
- ✅ **包名适配**：`org.dromara.*`
- ✅ **智能推断**：模块 → 表前缀 → 包名 → 图标自动识别
- ✅ **全自动配置**：代码生成器配置完整（gen_table + gen_table_column）
- ✅ **菜单权限**：自动生成完整的菜单和权限配置

## 🚀 执行流程

### 第一步：需求确认

```
请告诉我要开发的功能：

1. **功能名称**？（如：广告管理、反馈管理）
2. **所属模块**？（system/business/其他）
```

**自动推断**：

| 模块 | 表前缀 | 包名 | 上级菜单 |
|------|--------|------|---------|
| system | `sys_` | `org.dromara.system` | 系统管理 |
| business | `b_` | `org.dromara.business` | 业务管理 |
| 其他（如 demo） | `demo_` | `org.dromara.demo` | [模块]管理 |

---

### 第二步：功能重复检查（强制执行）⭐⭐⭐⭐⭐

**⚠️ 重要**：检查功能是否已存在，避免重复开发

```bash
# 1. 检查后端代码
Grep pattern: "[功能名]Service" path: ruoyi-modules/ output_mode: files_with_matches
Grep pattern: "[功能名]Controller" path: ruoyi-modules/ output_mode: files_with_matches

# 2. 检查数据库表
SHOW TABLES LIKE '[表前缀]%';

# 3. 检查菜单
SELECT menu_name FROM sys_menu WHERE menu_name LIKE '%[功能名]%';
```

**处理结果**：
- ✅ 未存在 → 继续开发
- ⚠️ 已存在 → 停止，提示用户修改现有代码

---

### 第三步：数据库现状分析（自动执行）

从 `ruoyi-admin/src/main/resources/application-dev.yml` 动态读取：

```bash
# 1. 读取数据库配置
Read ruoyi-admin/src/main/resources/application-dev.yml

# 2. 连接数据库查询
mysql -h[host] -P[port] -u[user] -p[pass] [db] <<EOF
-- 查询最大ID（用于生成新ID）
SELECT MAX(menu_id) FROM sys_menu;
SELECT MAX(table_id) FROM gen_table;
SELECT MAX(dict_id) FROM sys_dict_type WHERE dict_type NOT LIKE 'sys_%';
SELECT MAX(dict_code) FROM sys_dict_data;

-- 查询上级菜单（确定菜单归属）⚠️ 记录查询结果的 menu_id，后续步骤动态引用
SELECT menu_id, menu_name FROM sys_menu
WHERE menu_type = 'M' AND parent_id = 0 AND del_flag = '0'
ORDER BY order_num;

-- 查询现有字典类型（避免创建重复字典）
SELECT dict_type, dict_name FROM sys_dict_type WHERE del_flag = '0';
EOF
```

---

### 第四步：智能表结构设计

#### 4.1 数据库规范学习

```bash
# 阅读规范文档
Read CLAUDE.md
# 查看示例表
Show CREATE TABLE sys_notice;
```

#### 4.2 智能字段命名和推断

根据字段名后缀自动推断控件和查询方式：

| 字段后缀 | 推断结果 | 控件类型 | 查询方式 |
|---------|---------|---------|---------|
| `xxx_name` | 名称 | input | LIKE |
| `xxx_title` | 标题 | input | LIKE |
| `xxx_content` | 内容 | editor | 富文本 |
| `status` | 状态 | select | EQ + sys_normal_disable |
| `xxx_type` | 分类 | select | EQ + 自定义字典 |
| `is_xxx` | 是否 | radio | EQ + sys_yes_no |
| `xxx_amount` / `xxx_price` | 金额 | input | EQ |
| `xxx_time` / `xxx_date` | 时间 | datetime | BETWEEN |
| `xxx_img` / `xxx_cover` | 图片 | 存储URL | - |
| `remark` | 备注 | textarea | - |

#### 4.3 标准表结构模板

```sql
CREATE TABLE [表前缀]_[功能名] (
    id              BIGINT(20)   NOT NULL COMMENT '主键ID',
    tenant_id       VARCHAR(20)  DEFAULT '000000' COMMENT '租户ID',

    -- 业务字段（遵循命名规则）
    xxx_name        VARCHAR(100) NOT NULL COMMENT '名称',
    xxx_type        CHAR(1)      DEFAULT '1' COMMENT '类型',
    status          CHAR(1)      DEFAULT '0' COMMENT '状态(0正常 1停用)',

    -- 审计字段
    create_dept     BIGINT(20)   DEFAULT NULL COMMENT '创建部门',
    create_by       BIGINT(20)   DEFAULT NULL COMMENT '创建人',
    create_time     DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by       BIGINT(20)   DEFAULT NULL COMMENT '更新人',
    update_time     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark          VARCHAR(500) DEFAULT NULL COMMENT '备注',
    del_flag        CHAR(1)      DEFAULT '0' COMMENT '删除标志',

    PRIMARY KEY (id),
    KEY idx_tenant_id (tenant_id),
    KEY idx_status (status),
    KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='xxx表';
```

**⚠️ 重要默认值**：
- `tenant_id`: 必须默认 `'000000'`
- `status`: 必须默认 `'0'` (正常)，原框架约定 0=正常 1=停用
- `del_flag`: 必须默认 `'0'` (未删除)

---

### 第五步：生成方案并确认（仅此一次确认）⭐⭐⭐⭐⭐

**输出完整方案**，让用户确认后自动执行：

```markdown
## 📋 代码生成方案

### 基本配置
- **功能名称**：广告管理
- **模块**：business
- **表名**：b_ad
- **Java类名**：Ad
- **包名**：org.dromara.business
- **接口路径**：/business/ad

### 菜单配置
- **上级菜单**：业务管理 (menu_id: [从第三步查询获取])
- **菜单顺序**：20

### 字段信息
| 字段 | 类型 | 推断结果 | 字典类型 |
|------|------|---------|---------|
| id | BIGINT(20) | 主键 | - |
| tenant_id | VARCHAR(20) | 租户 | - |
| ad_name | VARCHAR(100) | 名称 | - |
| ad_type | CHAR(1) | 分类 | b_ad_type（需创建）|
| status | CHAR(1) | 状态 | sys_normal_disable |
| ... | ... | ... | ... |

### 字典类型检查
| 字典类型 | 状态 | 说明 |
|---------|------|------|
| sys_normal_disable | ✅ 已存在 | 系统内置 |
| b_ad_type | ⚠️ 需创建 | 广告分类（如：图片、文字、视频）|

**确认开始生成？**（回复"确认"或"开始"）
```

---

### 第六步：自动执行生成（无需确认）

用户确认后，AI 自动执行：

#### 6.1 建表 SQL

```bash
mysql -h[host] -P[port] -u[user] -p[pass] [db] <<EOF
[表结构SQL]
EOF
```

输出：`✅ 表创建成功：b_ad`

#### 6.2 创建字典（如需要）

```bash
mysql -h[host] -P[port] -u[user] -p[pass] [db] <<EOF
-- 检查字典类型是否存在
SELECT * FROM sys_dict_type WHERE dict_type = 'b_ad_type';

-- 不存在则创建（字段顺序参考 ry_workflow.sql）
INSERT INTO sys_dict_type VALUES (
    [新dict_id], '000000', '广告分类', 'b_ad_type',
    103, 1, NOW(), NULL, NULL, '业务字典：广告分类'
);

-- 创建字典数据（字段：dict_code, tenant_id, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, create_dept, create_by, create_time, update_by, update_time, remark）
INSERT INTO sys_dict_data VALUES
([新dict_code], '000000', 1, '图片广告', '1', 'b_ad_type', '', 'primary', 'N', 103, 1, NOW(), NULL, NULL, '图片广告'),
([新dict_code], '000000', 2, '文字广告', '2', 'b_ad_type', '', 'success', 'N', 103, 1, NOW(), NULL, NULL, '文字广告'),
([新dict_code], '000000', 3, '视频广告', '3', 'b_ad_type', '', 'info', 'N', 103, 1, NOW(), NULL, NULL, '视频广告');
EOF
```

输出：
```markdown
✅ 字典创建成功：
- 字典类型：b_ad_type（广告分类）
- 字典项：3 个（图片、文字、视频）
```

#### 6.3 生成代码生成器配置 SQL

```bash
mysql -h[host] -P[port] -u[user] -p[pass] [db] <<EOF
-- 表配置
INSERT INTO gen_table (
    table_id, data_name, table_name, table_comment, class_name, tpl_category,
    package_name, module_name, business_name, function_name,
    function_author, gen_type, gen_path, options, remark,
    create_dept, create_by, create_time, update_time
) VALUES (
    [新table_id], 'master', 'b_ad', '广告表', 'Ad', 'crud',
    'org.dromara.business', 'business', 'ad', '广告',
    '系统生成', '1', '/',
    '{"parentMenuId":"[查询到的上级菜单ID]","parentMenuName":"业务管理"}', '广告管理',
    103, 1, NOW(), NOW()
);

-- 列配置（详细的字段配置）
-- ⚠️ 原框架 gen_table_column 没有 column_label 和 column_default 字段
INSERT INTO gen_table_column (
    column_id, table_id, column_name, column_comment,
    column_type, java_type, java_field, is_pk, is_increment, is_required,
    is_insert, is_edit, is_list, is_query, query_type, html_type, dict_type,
    sort, create_dept, create_by, create_time, update_time
) VALUES
-- id 主键（雪花ID，is_increment='0'）
([新id], [table_id], 'id', '广告ID', 'bigint(20)', 'Long', 'id', '1', '0', '1', NULL, '1', '1', '1', 'EQ', 'input', '', 1, 103, 1, NOW(), NOW()),
-- tenant_id（框架自动处理，配置全为0）
([新id], [table_id], 'tenant_id', '租户ID', 'varchar(20)', 'String', 'tenantId', '0', '0', '0', '0', '0', '0', '0', 'EQ', 'input', '', 2, 103, 1, NOW(), NOW()),
-- 业务字段
([新id], [table_id], 'ad_name', '广告名称', 'varchar(100)', 'String', 'adName', '0', '0', '1', '1', '1', '1', '1', 'LIKE', 'input', '', 3, 103, 1, NOW(), NOW()),
([新id], [table_id], 'ad_type', '广告类型', 'char(1)', 'String', 'adType', '0', '0', '0', '1', '1', '1', '1', 'EQ', 'select', 'b_ad_type', 4, 103, 1, NOW(), NOW()),
([新id], [table_id], 'status', '状态', 'char(1)', 'String', 'status', '0', '0', '0', '1', '1', '1', '1', 'EQ', 'radio', 'sys_normal_disable', 5, 103, 1, NOW(), NOW()),
-- 审计字段（示例）
([新id], [table_id], 'create_by', '创建人', 'bigint(20)', 'Long', 'createBy', '0', '0', '0', '0', '0', '0', '0', 'EQ', 'input', '', 6, 103, 1, NOW(), NOW()),
([新id], [table_id], 'create_time', '创建时间', 'datetime', 'Date', 'createTime', '0', '0', '0', '0', '0', '1', '1', 'BETWEEN', 'datetime', '', 7, 103, 1, NOW(), NOW()),
([新id], [table_id], 'update_by', '更新人', 'bigint(20)', 'Long', 'updateBy', '0', '0', '0', '0', '0', '0', '0', 'EQ', 'input', '', 8, 103, 1, NOW(), NOW()),
([新id], [table_id], 'update_time', '更新时间', 'datetime', 'Date', 'updateTime', '0', '0', '0', '0', '0', '0', '0', 'EQ', 'datetime', '', 9, 103, 1, NOW(), NOW()),
([新id], [table_id], 'remark', '备注', 'varchar(500)', 'String', 'remark', '0', '0', '0', '1', '1', '0', '0', 'EQ', 'textarea', '', 10, 103, 1, NOW(), NOW()),
([新id], [table_id], 'del_flag', '删除标志', 'char(1)', 'String', 'delFlag', '0', '0', '0', '0', '0', '0', '0', 'EQ', 'input', '', 11, 103, 1, NOW(), NOW())
;
EOF
```

输出：
```markdown
✅ 代码生成配置保存完成！
- gen_table: 1 条
- gen_table_column: 11 条
```

---

### 第七步：完成报告

```markdown
## 🎉 代码生成方案配置完成！

### 已完成
- ✅ 数据库表创建：b_ad
- ✅ 业务字典创建：b_ad_type（3 个字典项）
- ✅ 代码生成配置：表 + 11 个字段（含上级菜单配置）

### 上级菜单配置（写入 gen_table.options）
- 上级菜单ID：[从第三步查询获取] (业务管理)
- 说明：菜单和权限将在代码生成器【生成代码】时自动创建到 sys_menu 表

### 字段配置详情
| 字段 | 类型 | 控件 | 查询 | 字典 |
|------|------|------|------|------|
| ad_name | String | input | LIKE | - |
| ad_type | String | select | EQ | b_ad_type |
| status | String | radio | EQ | sys_normal_disable |
| create_time | Date | datetime | BETWEEN | - |

---

## 🚀 下一步：前往代码生成器生成代码

1. **登录系统后台**：http://localhost:8080
2. **导航**：系统工具 → 代码生成
3. **查找表**：找到 `b_ad` 表
4. **生成代码**：点击【生成代码】按钮
5. **重启服务**：代码生成后需重启后端服务

### 生成后的文件结构

```
[对应模块目录]/
├── controller/AdController.java
├── domain/Ad.java
├── domain/bo/AdBo.java
├── domain/vo/AdVo.java
├── mapper/AdMapper.java
├── service/IAdService.java
└── service/impl/AdServiceImpl.java
```

---

## ⚠️ AI 执行规则

1. ✅ **仅后端**：三层架构（Controller→Service→Mapper）
2. ✅ **包名**：必须是 `org.dromara.*`
3. ✅ **一次确认**：第五步确认后全自动执行
4. ✅ **tenant_id**：框架自动处理，所有权限配置为 0
5. ✅ **原框架 gen_table_column 无 column_default 和 column_label 字段**，不要在 INSERT 中包含
6. ✅ **检查功能重复**：禁止重复开发相同功能
7. ✅ **智能字段推断**：根据字段名后缀自动推断控件和查询方式
8. ✅ **字典智能处理**：检查字典存在性，不存在则创建
9. ✅ **雪花ID**：is_increment 必须为 '0'，禁止使用 AUTO_INCREMENT
10. ✅ **状态约定**：原框架 '0'=正常 '1'=停用（sys_normal_disable），status 默认 '0'
11. ✅ **菜单 ID 必须从第三步查询动态获取**（禁止硬编码）
12. ✅ **options JSON 仅支持**：parentMenuId、parentMenuName（树表额外支持 treeCode、treeParentCode、treeName）
