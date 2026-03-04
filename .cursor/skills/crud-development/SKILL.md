---
name: crud-development
description: |
  后端 CRUD 开发规范。基于 RuoYi-Vue-Plus 三层架构（Controller -> Service -> Mapper），无独立 DAO 层。

  触发场景：
  - 新建业务模块的 CRUD 功能
  - 创建 Entity、BO、VO、Service、Mapper、Controller
  - 分页查询、新增、修改、删除、导出
  - 查询条件构建（buildQueryWrapper）

  触发词：CRUD、增删改查、新建模块、Entity、BO、VO、Service、Mapper、Controller、分页查询、buildQueryWrapper、@AutoMapper、BaseMapperPlus、TenantEntity

  注意：
  - 三层架构，Service 直接注入 Mapper，无 DAO 层。
  - 查询条件在 Service 层构建（buildQueryWrapper）。
  - 使用 @AutoMapper（单数）而非 @AutoMappers。
  - API 路径使用标准 RESTful 格式（/list、/{id}）。
---

# CRUD 开发规范（RuoYi-Vue-Plus 三层架构）

## 核心架构特征

| 项 | 规范 |
|----|------|
| **包名前缀** | `org.dromara.*` |
| **架构** | Controller -> Service -> Mapper（无 DAO 层） |
| **查询构建** | Service 层 `buildQueryWrapper()` |
| **Mapper** | 继承 `BaseMapperPlus<Entity, VO>` |
| **对象转换** | `MapstructUtils.convert()` |
| **Entity 基类** | `TenantEntity`（多租户） |
| **BO 映射** | `@AutoMapper`（单数） |
| **API 路径** | RESTful：`/list`、`/{id}` |

---

## 1. Entity

```java
package org.dromara.demo.domain;

import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.io.Serial;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("test_xxx")
public class Xxx extends TenantEntity {

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(value = "id")
    private Long id;

    private String xxxName;

    private String status;

    @TableLogic
    private Long delFlag;
}
```

## 2. BO

```java
package org.dromara.demo.domain.bo;

import io.github.linpeilie.annotations.AutoMapper;
import org.dromara.demo.domain.Xxx;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)
public class XxxBo extends BaseEntity {

    @NotNull(message = "主键不能为空", groups = {EditGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {AddGroup.class, EditGroup.class})
    private String xxxName;

    private String status;
}
```

## 3. VO

```java
package org.dromara.demo.domain.vo;

import io.github.linpeilie.annotations.AutoMapper;
import org.dromara.demo.domain.Xxx;
import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import lombok.Data;
import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = Xxx.class)
public class XxxVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @ExcelProperty(value = "主键")
    private Long id;

    @ExcelProperty(value = "名称")
    private String xxxName;

    @ExcelProperty(value = "状态")
    private String status;

    @ExcelProperty(value = "创建时间")
    private Date createTime;
}
```

## 4. Service 接口

```java
package org.dromara.demo.service;

import org.dromara.demo.domain.bo.XxxBo;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import java.util.Collection;
import java.util.List;

public interface IXxxService {
    XxxVo queryById(Long id);
    List<XxxVo> queryList(XxxBo bo);
    TableDataInfo<XxxVo> queryPageList(XxxBo bo, PageQuery pageQuery);
    Boolean insertByBo(XxxBo bo);
    Boolean updateByBo(XxxBo bo);
    Boolean deleteWithValidByIds(Collection<Long> ids, Boolean isValid);
}
```

## 5. Service 实现（核心）

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

@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements IXxxService {

    private final XxxMapper baseMapper;  // 直接注入 Mapper（无 DAO 层）

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
        LambdaQueryWrapper<Xxx> lqw = buildQueryWrapper(bo);
        Page<XxxVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    @Override
    public Boolean insertByBo(XxxBo bo) {
        Xxx add = MapstructUtils.convert(bo, Xxx.class);
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

    private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getId() != null, Xxx::getId, bo.getId());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), Xxx::getStatus, bo.getStatus());
        lqw.like(StringUtils.isNotBlank(bo.getXxxName()), Xxx::getXxxName, bo.getXxxName());
        lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
            Xxx::getCreateTime, params.get("beginCreateTime"), params.get("endCreateTime"));
        lqw.orderByAsc(Xxx::getId);
        return lqw;
    }

    private void validEntityBeforeSave(Xxx entity) {
        // TODO 做一些数据校验，如唯一约束
    }
}
```

## 6. Mapper

```java
package org.dromara.demo.mapper;

import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.common.mybatis.core.mapper.BaseMapperPlus;

public interface XxxMapper extends BaseMapperPlus<Xxx, XxxVo> {
    // 已提供 selectVoById、selectVoPage、selectVoList 等方法
}
```

## 7. Controller

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

@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/demo/xxx")
public class XxxController extends BaseController {

    private final IXxxService xxxService;

    @SaCheckPermission("demo:xxx:list")
    @GetMapping("/list")
    public TableDataInfo<XxxVo> list(XxxBo bo, PageQuery pageQuery) {
        return xxxService.queryPageList(bo, pageQuery);
    }

    @SaCheckPermission("demo:xxx:query")
    @GetMapping("/{id}")
    public R<XxxVo> getInfo(@NotNull(message = "主键不能为空") @PathVariable Long id) {
        return R.ok(xxxService.queryById(id));
    }

    @SaCheckPermission("demo:xxx:add")
    @Log(title = "XXX管理", businessType = BusinessType.INSERT)
    @RepeatSubmit()
    @PostMapping()
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XxxBo bo) {
        return toAjax(xxxService.insertByBo(bo));
    }

    @SaCheckPermission("demo:xxx:edit")
    @Log(title = "XXX管理", businessType = BusinessType.UPDATE)
    @RepeatSubmit()
    @PutMapping()
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XxxBo bo) {
        return toAjax(xxxService.updateByBo(bo));
    }

    @SaCheckPermission("demo:xxx:remove")
    @Log(title = "XXX管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")
    public R<Void> remove(@NotEmpty(message = "主键不能为空") @PathVariable Long[] ids) {
        return toAjax(xxxService.deleteWithValidByIds(Arrays.asList(ids), true));
    }

    @SaCheckPermission("demo:xxx:export")
    @Log(title = "XXX管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(@Validated XxxBo bo, HttpServletResponse response) {
        List<XxxVo> list = xxxService.queryList(bo);
        ExcelUtil.exportExcel(list, "XXX数据", XxxVo.class, response);
    }
}
```

## 8. 建表 SQL

```sql
CREATE TABLE demo_xxx (
    id           BIGINT(20)   NOT NULL COMMENT '主键（雪花ID，不用AUTO_INCREMENT）',
    tenant_id    VARCHAR(20)  DEFAULT '000000' COMMENT '租户ID',
    xxx_name     VARCHAR(100) NOT NULL COMMENT '名称',
    status       CHAR(1)      DEFAULT '0' COMMENT '状态(0正常 1停用)',
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

## 常见错误速查

```java
// ---- 错误写法 ----
private final IXxxDao xxxDao;                    // 本项目没有 DAO 层
BeanUtil.copyProperties(bo, entity);             // 必须用 MapstructUtils.convert()
class XxxServiceImpl extends ServiceImpl<...> {} // Service 不继承基类
@AutoMappers({@AutoMapper(...)})                 // 用单数 @AutoMapper
@GetMapping("/pageXxxs")                         // 应该是 /list
@GetMapping("/getXxx/{id}")                      // 应该是 /{id}

// ---- 正确写法 ----
private final XxxMapper baseMapper;              // 直接注入 Mapper
MapstructUtils.convert(bo, Xxx.class);           // MapstructUtils 转换
class XxxServiceImpl implements IXxxService {}   // 只实现接口
@AutoMapper(target = Xxx.class)                  // 单数注解
@GetMapping("/list")                             // RESTful 路径
@GetMapping("/{id}")                             // RESTful 路径
```

---

## 检查清单

- [ ] 包名是 `org.dromara.*`？
- [ ] Service 只实现接口，不继承基类？
- [ ] Service 直接注入 Mapper（无 DAO）？
- [ ] `buildQueryWrapper()` 在 Service 层？
- [ ] Entity 继承 `TenantEntity`？
- [ ] BO 使用 `@AutoMapper`（单数）？
- [ ] 使用 `MapstructUtils.convert()` 转换？
- [ ] Mapper 继承 `BaseMapperPlus<Entity, VO>`？
- [ ] Controller 使用 RESTful 路径？
- [ ] SQL 使用 `del_flag`（0正常 1删除）？
- [ ] 主键使用雪花 ID（无 AUTO_INCREMENT）？
- [ ] 代码注释和 SQL COMMENT 使用中文？

---

## 参考实现

| 类型 | 类名 |
|------|------|
| Entity | `org.dromara.demo.domain.TestDemo` |
| BO | `org.dromara.demo.domain.bo.TestDemoBo` |
| VO | `org.dromara.demo.domain.vo.TestDemoVo` |
| Service | `org.dromara.demo.service.impl.TestDemoServiceImpl` |
| Mapper | `org.dromara.demo.mapper.TestDemoMapper` |
| Controller | `org.dromara.demo.controller.TestDemoController` |
