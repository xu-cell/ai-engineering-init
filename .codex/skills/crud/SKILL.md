---
name: crud
description: |
  当需要基于已存在的数据库表快速生成 CRUD 代码时自动使用此 Skill。

  触发场景：
  - 数据库表已存在，需要生成后端代码
  - 需要标准的增删改查功能
  - 快速原型开发
  - 需要生成树形结构的 CRUD

  触发词：生成CRUD、crud、代码生成、快速生成、生成代码、CRUD生成、表生成代码
---

# /crud - 快速生成 CRUD 代码

作为 CRUD 代码生成助手，基于已存在的数据库表快速生成标准后端 CRUD 代码。

## 🎯 适用场景

### ✅ 适合使用 `/crud` 的情况

- ✅ **数据库表已存在** - 表结构已设计完毕
- ✅ **只需标准 CRUD** - 增删改查、导入导出等标准功能
- ✅ **无复杂业务逻辑** - 没有特殊的业务规则
- ✅ **快速原型开发** - 需要快速搭建基础功能
- ✅ **树形结构数据** - 部门、分类等层级数据（tree 模板）

### ❌ 不适合使用 `/crud` 的情况

- ❌ **表结构尚未设计** → 请使用 `/dev` 命令
- ❌ **需要复杂业务逻辑** → 请使用 `/dev` 命令后手动增强

### 📋 支持的模板类型

| 模板类型 | 适用场景 | 特点 |
|---------|---------|------|
| **crud** | 普通表 | 标准增删改查、分页列表 |
| **tree** | 树形表 | 父子层级、展开折叠、无分页 |

---

## 📋 执行流程

### 第一步：连接数据库并查看表结构

```
请提供表名：
（如：sys_notice, demo_xxx）

💡 数据库连接信息将从 application-dev.yml 自动读取
```

读取 `ruoyi-admin/src/main/resources/application-dev.yml` 获取数据库配置。

### 第二步：分析表结构

```bash
SHOW CREATE TABLE [表名];
DESC [表名];
```

**字段类型映射规则**：

| 数据库类型 | Java类型 | 说明 |
|-----------|---------|------|
| BIGINT(20), BIGINT | Long | 长整数 |
| INT(11), INT | Integer | 整数 |
| VARCHAR(n), CHAR(n) | String | 字符串 |
| TEXT, LONGTEXT | String | 长文本 |
| DATETIME, TIMESTAMP | Date | 日期时间 |
| DECIMAL(m,n) | BigDecimal | 高精度数值 |
| TINYINT(1), CHAR(1) | String | 状态字段（0/1）|

### 第三步：选择模板类型

**自动检测规则**：
- 表中包含 `parent_id` 字段且 `parent_id` 为 BIGINT → `tree` 模板
- 其他情况 → `crud` 模板

### 第四步：生成菜单 SQL

根据表名前缀确定模块名：

| 表名前缀 | 模块名 | 权限标识符格式 |
|---------|--------|--------------|
| `sys_` | `system` | `system:[功能名]:[操作]` |
| `demo_` | `demo` | `demo:[功能名]:[操作]` |

生成完整的菜单 SQL（6个权限：查看、查询、新增、修改、删除、导出）。

### 第五步：生成后端代码

**学习现有代码（强制执行）**：

```bash
Read ruoyi-system/src/main/java/org/dromara/system/controller/SysNoticeController.java
Read ruoyi-system/src/main/java/org/dromara/system/service/impl/SysNoticeServiceImpl.java
```

**生成代码顺序（三层架构）**：

1. **Entity** - 继承 TenantEntity，字段从表结构映射
2. **BO** - 使用 @AutoMapper 注解
3. **VO** - 含 Excel 导出注解
4. **Mapper** - 继承 BaseMapperPlus
5. **Service 接口** - 标准 CRUD 方法声明
6. **ServiceImpl** - 业务逻辑实现，包含 buildQueryWrapper
7. **Controller** - 标准接口 + 导入导出

**查询条件生成规则**：

| 字段名后缀 | 查询方式 | Java类型 | 说明 |
|-----------|---------|---------|------|
| `xxx_name`、`xxx_title` | LIKE | String | 名称/标题字段 |
| `xxx_content`、`remark` | LIKE | String | 长文本/备注字段 |
| `id`、`code` | EQ | Long/String | ID/编码字段 |
| `status` | EQ | String | 标准状态字段 |
| `xxx_type` | EQ | String | 分类/类型字段 |
| `xxx_time`、`xxx_date` | BETWEEN | Date | 日期/时间范围查询 |

---

## 代码模板

### Entity 模板

```java
package org.dromara.[模块].domain;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import org.dromara.common.tenant.core.TenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("[表名]")
public class [实体名] extends TenantEntity {

    @TableId(value = "id")
    private Long id;

    // 业务字段...
}
```

### BO 模板

```java
package org.dromara.[模块].domain.bo;

import org.dromara.[模块].domain.[实体名];
import org.dromara.common.mybatis.core.domain.BaseEntity;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = [实体名].class, reverseConvertGenerate = false)
public class [实体名]Bo extends BaseEntity {

    private Long id;

    // 业务字段...
}
```

### ServiceImpl 模板

```java
package org.dromara.[模块].service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.dromara.[模块].domain.[实体名];
import org.dromara.[模块].domain.bo.[实体名]Bo;
import org.dromara.[模块].domain.vo.[实体名]Vo;
import org.dromara.[模块].mapper.[实体名]Mapper;
import org.dromara.[模块].service.I[实体名]Service;
import org.dromara.common.core.utils.MapstructUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class [实体名]ServiceImpl implements I[实体名]Service {

    private final [实体名]Mapper baseMapper;

    private LambdaQueryWrapper<[实体名]> buildQueryWrapper([实体名]Bo bo) {
        LambdaQueryWrapper<[实体名]> lqw = Wrappers.lambdaQuery();
        // 根据字段类型添加查询条件
        return lqw;
    }

    @Override
    public Boolean insertByBo([实体名]Bo bo) {
        [实体名] add = MapstructUtils.convert(bo, [实体名].class);
        boolean flag = baseMapper.insert(add) > 0;
        if (flag) {
            bo.setId(add.getId());
        }
        return flag;
    }

    @Override
    public Boolean updateByBo([实体名]Bo bo) {
        [实体名] update = MapstructUtils.convert(bo, [实体名].class);
        return baseMapper.updateById(update) > 0;
    }
}
```

---

## 输出清单

```markdown
✅ CRUD 代码生成完成！

## 已生成文件清单

### 菜单 SQL
- ✅ 菜单 SQL（需手动执行）

### 后端代码 (7个文件)
- ✅ domain/Xxx.java (Entity)
- ✅ domain/bo/XxxBo.java (BO)
- ✅ domain/vo/XxxVo.java (VO)
- ✅ mapper/XxxMapper.java (Mapper)
- ✅ service/IXxxService.java (Service接口)
- ✅ service/impl/XxxServiceImpl.java (Service实现)
- ✅ controller/XxxController.java (Controller)

## 下一步操作

1. 执行菜单 SQL
2. 重启后端服务
3. 测试接口（Swagger: http://localhost:8080/doc.html）
4. 配置菜单权限
```

---

## 与 `/dev` 命令的区别

| 对比项 | `/crud` | `/dev` |
|--------|---------|--------|
| **适用场景** | 表已存在 | 从零开始 |
| **表结构设计** | ❌ 跳过 | ✅ 引导设计 |
| **菜单 SQL** | ✅ 生成 | ✅ 生成 |
| **代码生成** | ✅ 自动 | ✅ 自动 |
| **树表支持** | ✅ 支持 | ✅ 支持 |
| **执行速度** | ⚡ 快速 | 🐢 较慢 |

**建议**：
- 快速原型：使用 `/crud`
- 正式开发：使用 `/dev`
- 表已存在：使用 `/crud`
