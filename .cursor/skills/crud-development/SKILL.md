---
name: crud-development
description: |
  后端 CRUD 开发规范。基于 RuoYi-Vue-Plus 三层架构（Controller → Service → Mapper），无独立 DAO 层。

  触发场景：
  - 新建业务模块的 CRUD 功能
  - 创建 Entity、BO、VO、Service、Mapper、Controller
  - 分页查询、新增、修改、删除、导出
  - 查询条件构建（buildQueryWrapper）

  触发词：CRUD、增删改查、新建模块、Entity、BO、VO、Service、Mapper、Controller、分页查询、buildQueryWrapper、@AutoMapper、BaseMapperPlus、TenantEntity

  注意：
  - 本项目是三层架构，Service 直接注入 Mapper，无 DAO 层。
  - 查询条件在 Service 层构建（buildQueryWrapper）。
  - 使用 @AutoMapper（单数）而非 @AutoMappers。
  - API 路径使用标准 RESTful 格式（/list、/{id}）。
---

# CRUD 全栈开发规范（RuoYi-Vue-Plus 三层架构版）

> **⚠️ 重要声明**: 本项目是 **RuoYi-Vue-Plus 纯后端项目**，采用三层架构！
> 不同于其他四层架构项目，本项目 **无独立 DAO 层**，Service 直接调用 Mapper。

## 核心架构特征

| 对比项 | 本项目 (RuoYi-Vue-Plus) |
|--------|----------------------|
| **包名前缀** | `org.dromara.*` |
| **架构** | 三层：Controller → Service → Mapper |
| **DAO 层** | ❌ 不存在，Service 直接注入 Mapper |
| **查询构建** | Service 层 `buildQueryWrapper()` |
| **Mapper 继承** | `BaseMapperPlus<Entity, VO>` |
| **对象转换** | `MapstructUtils.convert()` |
| **Entity 基类** | `TenantEntity`（多租户） |
| **BO 映射** | `@AutoMapper` 注解（单数） |
| **API 路径** | 标准 RESTful：`/list`、`/{id}` |

---

## 1. Entity 实体类（继承 TenantEntity）

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
@TableName("test_xxx")
public class Xxx extends TenantEntity {  // ✅ 继承 TenantEntity（多租户）

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
     * 删除标志
     */
    @TableLogic
    private Long delFlag;
}
```

---

## 2. BO 业务对象（@AutoMapper 映射）

```java
package org.dromara.demo.domain.bo;

import io.github.linpeilie.annotations.AutoMapper;
import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import jakarta.validation.constraints.*;

/**
 * XXX 业务对象
 */
@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)  // ✅ 映射到 Entity
public class XxxBo extends BaseEntity {

    /**
     * 主键 ID
     */
    @NotNull(message = "主键 ID 不能为空", groups = {EditGroup.class})
    private Long id;

    /**
     * 名称
     */
    @NotBlank(message = "名称不能为空", groups = {AddGroup.class, EditGroup.class})
    private String xxxName;

    /**
     * 状态
     */
    private String status;
}
```

---

## 3. VO 视图对象（@AutoMapper 映射）

```java
package org.dromara.demo.domain.vo;

import io.github.linpeilie.annotations.AutoMapper;
import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.bo.XxxBo;
import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import lombok.Data;
import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

/**
 * XXX 视图对象
 */
@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = Xxx.class)  // ✅ VO 也使用 @AutoMapper
public class XxxVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键 ID
     */
    @ExcelProperty(value = "主键 ID")
    private Long id;

    /**
     * 名称
     */
    @ExcelProperty(value = "名称")
    private String xxxName;

    /**
     * 状态
     */
    @ExcelProperty(value = "状态")
    private String status;

    /**
     * 创建时间
     */
    @ExcelProperty(value = "创建时间")
    private Date createTime;
}
```

---

## 4. Service 接口

```java
package org.dromara.demo.service;

import org.dromara.demo.domain.bo.XxxBo;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import java.util.Collection;
import java.util.List;

/**
 * XXX 服务接口
 */
public interface IXxxService {

    /**
     * 根据 ID 查询
     */
    XxxVo queryById(Long id);

    /**
     * 查询列表
     */
    List<XxxVo> queryList(XxxBo bo);

    /**
     * 分页查询
     */
    TableDataInfo<XxxVo> queryPageList(XxxBo bo, PageQuery pageQuery);

    /**
     * 新增
     */
    Boolean insertByBo(XxxBo bo);

    /**
     * 修改
     */
    Boolean updateByBo(XxxBo bo);

    /**
     * 删除
     */
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
```

---

## 5. Service 实现类（⭐ 核心：三层架构，NO DAO 层）

```java
package org.dromara.demo.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.dromara.common.core.exception.ServiceException;
import org.dromara.common.core.utils.MapstructUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.bo.XxxBo;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.demo.mapper.XxxMapper;
import org.dromara.demo.service.IXxxService;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * XXX 服务实现
 *
 * @author Lion Li
 */
@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements IXxxService {

    private final XxxMapper baseMapper;  // ✅ 直接注入 Mapper（NO DAO!）

    @Override
    public XxxVo queryById(Long id) {
        return baseMapper.selectVoById(id);
    }

    @Override
    public List<XxxVo> queryList(XxxBo bo) {
        return baseMapper.selectVoList(buildQueryWrapper(bo));
    }

    @Override
    public TableDataInfo<XxxVo> queryPageList(XxxBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<Xxx> lqw = buildQueryWrapper(bo);  // ✅ Service 层构建查询
        Page<XxxVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    @Override
    public Boolean insertByBo(XxxBo bo) {
        Xxx add = MapstructUtils.convert(bo, Xxx.class);  // ✅ MapstructUtils 转换
        validEntityBeforeSave(add);
        return baseMapper.insert(add) > 0;
    }

    @Override
    public Boolean updateByBo(XxxBo bo) {
        Xxx update = MapstructUtils.convert(bo, Xxx.class);
        validEntityBeforeSave(update);
        return baseMapper.updateById(update) > 0;
    }

    @Override
    public Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid) {
        if (isValid) {
            List<Xxx> list = baseMapper.selectByIds(ids);
            if (list.size() != ids.size()) {
                throw new ServiceException("您没有删除权限!");
            }
        }
        return baseMapper.deleteByIds(ids) > 0;
    }

    /**
     * 构建查询条件
     * ✅ Service 层直接构建（不是 DAO 层）
     */
    private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();

        // ✅ 精确匹配
        lqw.eq(bo.getId() != null, Xxx::getId, bo.getId());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), Xxx::getStatus, bo.getStatus());

        // ✅ 模糊匹配
        lqw.like(StringUtils.isNotBlank(bo.getXxxName()), Xxx::getXxxName, bo.getXxxName());

        // ✅ 时间范围
        lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
            Xxx::getCreateTime, params.get("beginCreateTime"), params.get("endCreateTime"));

        // ✅ 排序
        lqw.orderByAsc(Xxx::getId);
        return lqw;
    }

    /**
     * 保存前验证
     */
    private void validEntityBeforeSave(Xxx entity) {
        // TODO 做一些数据校验，如唯一约束
    }
}
```

---

## 6. Mapper 接口（继承 BaseMapperPlus）

```java
package org.dromara.demo.mapper;

import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.common.mybatis.core.mapper.BaseMapperPlus;

/**
 * XXX Mapper 接口
 */
public interface XxxMapper extends BaseMapperPlus<Xxx, XxxVo> {
    // ✅ 继承 BaseMapperPlus，已提供 selectVoById、selectVoPage、selectVoList 等方法
}
```

---

## 7. Controller 控制器（标准 RESTful 路径）

```java
package org.dromara.demo.controller;

import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.*;
import cn.dev33.satoken.annotation.SaCheckPermission;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.dromara.common.idempotent.annotation.RepeatSubmit;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.excel.utils.ExcelUtil;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.demo.domain.bo.XxxBo;
import org.dromara.demo.service.IXxxService;

/**
 * XXX 管理控制器
 */
@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/demo/xxx")
public class XxxController extends BaseController {  // ✅ 继承 BaseController

    private final IXxxService xxxService;

    /**
     * 查询列表
     * ✅ RESTful 路径：/list（不是 /pageXxxs）
     */
    @SaCheckPermission("demo:xxx:list")
    @GetMapping("/list")
    public TableDataInfo<XxxVo> list(XxxBo bo, PageQuery pageQuery) {
        return xxxService.queryPageList(bo, pageQuery);
    }

    /**
     * 获取详情
     * ✅ RESTful 路径：/{id}（不是 /getXxx/{id}）
     */
    @SaCheckPermission("demo:xxx:query")
    @GetMapping("/{id}")
    public R<XxxVo> getInfo(@NotNull(message = "主键不能为空") @PathVariable Long id) {
        return R.ok(xxxService.queryById(id));
    }

    /**
     * 新增
     * ✅ POST 空路径
     */
    @SaCheckPermission("demo:xxx:add")
    @Log(title = "XXX管理", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XxxBo bo) {
        return toAjax(xxxService.insertByBo(bo));
    }

    /**
     * 修改
     * ✅ PUT 空路径
     */
    @SaCheckPermission("demo:xxx:edit")
    @Log(title = "XXX管理", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XxxBo bo) {
        return toAjax(xxxService.updateByBo(bo));
    }

    /**
     * 删除
     * ✅ DELETE /{ids}
     */
    @SaCheckPermission("demo:xxx:remove")
    @Log(title = "XXX管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空") @PathVariable Long[] ids) {
        return toAjax(xxxService.deleteWithValidByIds(Arrays.asList(ids), true));
    }

    /**
     * 导出
     */
    @SaCheckPermission("demo:xxx:export")
    @Log(title = "XXX管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(@Validated XxxBo bo, HttpServletResponse response) {
        List<XxxVo> list = xxxService.queryList(bo);
        ExcelUtil.exportExcel(list, "XXX数据", XxxVo.class, response);
    }
}
```

---

## 8. 数据库建表（SQL）

```sql
-- 表前缀：demo_（根据模块选择：sys_/demo_/workflow_ 等）
CREATE TABLE demo_xxx (
    id           BIGINT(20)   NOT NULL COMMENT '主键 ID',  -- ✅ 雪花 ID，不用 AUTO_INCREMENT
    tenant_id    VARCHAR(20)  DEFAULT '000000' COMMENT '租户 ID',

    -- 业务字段
    xxx_name     VARCHAR(100) NOT NULL COMMENT '名称',
    status       CHAR(1)      DEFAULT '0' COMMENT '状态(0正常 1停用)',

    -- 审计字段（必须）
    create_dept  BIGINT(20)   DEFAULT NULL COMMENT '创建部门',
    create_by    BIGINT(20)   DEFAULT NULL COMMENT '创建人',
    create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by    BIGINT(20)   DEFAULT NULL COMMENT '更新人',
    update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    remark       VARCHAR(255) DEFAULT NULL COMMENT '备注',
    del_flag     BIGINT(20)   DEFAULT 0 COMMENT '删除标志(0正常 1已删除)',

    PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='XXX表';
```

---

## 架构对比

### 三层架构流程图

```
请求到达
   ↓
Controller （路由转发 + 权限检查 + 参数校验）
   ↓
Service （业务逻辑 + 查询构建 + 对象转换）
   ↓
Mapper （数据持久化）
   ↓
数据库
```

### 关键差异

| 环节 | 操作 | 位置 |
|------|------|------|
| **查询构建** | `buildQueryWrapper()` | **Service 层** ✅ |
| **Mapper 注入** | 在 Service 中注入 | ✅ 直接注入 baseMapper |
| **DAO 层** | 是否存在 | ❌ **不存在** |
| **对象转换** | `MapstructUtils.convert()` | Service 层 |
| **权限注解** | `@DataPermission` | Mapper 接口方法 |

---

## 常见错误速查

### ❌ 不要做

```java
// 错误 1: 在 Service 层注入 DAO
@Service
public class XxxServiceImpl {
    private final IXxxDao xxxDao;  // ❌ 本项目没有 DAO 层！
}

// 错误 2: 使用 BeanUtil
BeanUtil.copyProperties(bo, entity);  // ❌ 必须用 MapstructUtils.convert()

// 错误 3: Service 继承基类
public class XxxServiceImpl extends ServiceImpl<XxxMapper, Xxx> {  // ❌ 不继承！
}

// 错误 4: 使用 @AutoMappers（复数）
@AutoMappers({  // ❌ 本项目用单数 @AutoMapper
    @AutoMapper(target = Xxx.class)
})
public class XxxBo { }

// 错误 5: 包名错误
package org.dromara.xxx;  // ❌ 必须是 org.dromara.xxx

// 错误 6: 使用错误的路径格式
@GetMapping("/pageXxxs")  // ❌ 应该是 /list
@GetMapping("/getXxx/{id}")  // ❌ 应该是 /{id}
```

### ✅ 正确做法

```java
// 正确 1: 直接在 Service 中注入 Mapper
@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements IXxxService {
    private final XxxMapper baseMapper;  // ✅ 直接注入 Mapper
}

// 正确 2: 使用 MapstructUtils
Xxx entity = MapstructUtils.convert(bo, Xxx.class);  // ✅

// 正确 3: Service 只实现接口
public class XxxServiceImpl implements IXxxService {  // ✅

// 正确 4: 使用 @AutoMapper（单数）
@AutoMapper(target = Xxx.class)  // ✅
public class XxxBo { }

// 正确 5: 使用 org.dromara 包名
package org.dromara.demo.service;  // ✅

// 正确 6: 使用标准 RESTful 路径
@GetMapping("/list")  // ✅
@GetMapping("/{id}")  // ✅
@PostMapping
@PutMapping
@DeleteMapping("/{ids}")
```

---

## 检查清单

生成代码前必须检查：

- [ ] **包名是否是 `org.dromara.*`**？
- [ ] **Service 是否只实现接口，不继承任何基类**？
- [ ] **Service 是否直接注入 Mapper（无 DAO 层）**？
- [ ] **buildQueryWrapper() 是否在 Service 层实现**？
- [ ] **Entity 是否继承 `TenantEntity`**？
- [ ] **BO 是否使用 `@AutoMapper`（单数）映射到 Entity**？
- [ ] **VO 是否使用 `@AutoMapper` 映射**？
- [ ] **是否使用 `MapstructUtils.convert()` 转换对象**？
- [ ] **是否所有类型都先 import 再使用短类名**？
- [ ] **Mapper 是否继承 `BaseMapperPlus<Entity, VO>`**？
- [ ] **Controller 是否使用标准 RESTful 路径（/list、/{id} 等）**？
- [ ] **是否使用了 `@DataPermission` 进行行级权限控制**？
- [ ] **SQL 是否使用了 `del_flag`（非 `is_deleted`）**？
- [ ] **主键是否使用雪花 ID（无 AUTO_INCREMENT）**？
- [ ] **所有代码注释是否使用中文**？（Javadoc、行内注释、SQL 注释）
- [ ] **SQL COMMENT 是否使用中文**？（禁止英文 COMMENT）

---

## 参考实现

查看已有的完整实现：

- **Entity 参考**: `org.dromara.demo.domain.TestDemo`
- **BO 参考**: `org.dromara.demo.domain.bo.TestDemoBo`
- **VO 参考**: `org.dromara.demo.domain.vo.TestDemoVo`
- **Service 参考**: `org.dromara.demo.service.impl.TestDemoServiceImpl`
- **Mapper 参考**: `org.dromara.demo.mapper.TestDemoMapper`
- **Controller 参考**: `org.dromara.demo.controller.TestDemoController`

**特别注意**：上述参考代码是本项目的标准实现，严格遵循三层架构（Service 直接调用 Mapper，无 DAO 层）。

---

## 参考实现

查看已有的完整实现：

- **Entity 参考**: `org.dromara.demo.domain.TestDemo`
- **BO 参考**: `org.dromara.demo.domain.bo.TestDemoBo`
- **VO 参考**: `org.dromara.demo.domain.vo.TestDemoVo`
- **Service 参考**: `org.dromara.demo.service.impl.TestDemoServiceImpl`
- **Mapper 参考**: `org.dromara.demo.mapper.TestDemoMapper`
- **Controller 参考**: `org.dromara.demo.controller.TestDemoController`

**特别注意**：上述参考代码是本项目的标准实现，严格遵循三层架构（Service 直接调用 Mapper，无 DAO 层）。
