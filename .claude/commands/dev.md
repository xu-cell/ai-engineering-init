# /dev - 开发新功能

智能开发向导，专为 leniu-tengyun-core（云食堂）四层架构设计。包含表结构设计、代码生成全流程。

## 适用场景

- ✅ 从零开始开发新业务功能
- ✅ 需要数据库表设计
- ✅ 需要完整的四层代码（Controller → Business → Service → Mapper）

---

## 执行流程

### 第一步：需求确认

询问用户：

```
请告诉我要开发的功能：

1. 功能名称？（如：员工考勤管理、菜品分类管理）
2. 所属模块？（sys-canteen / sys-kitchen / sys-drp / sys-common）
3. 端类型？（web管理端 / mobile移动端 / android设备端 / open开放接口）
```

根据所属模块确定包名：

| 模块 | 包名前缀 | 路由前缀 |
|------|---------|---------|
| sys-canteen | `net.xnzn.core.canteen` | `/api/v2/web/canteen` |
| sys-kitchen | `net.xnzn.core.kitchen` | `/api/v2/web/kitchen` |
| sys-drp | `net.xnzn.core.drp` | `/api/v2/web/drp` |
| sys-common | `net.xnzn.core.common` | `/api/v2/web/common` |

---

### 第二步：功能重复检查（强制执行）

```bash
# 检查是否已有相同 Controller
Grep pattern: "[功能名]Controller" path: [模块目录]/src/main/java output_mode: files_with_matches

# 检查是否已有相同 Service
Grep pattern: "[功能名]Service" path: [模块目录]/src/main/java output_mode: files_with_matches
```

- ✅ 未存在 → 继续开发
- ⚠️ 已存在 → 停止，提示修改现有代码

---

### 第三步：数据库表设计

#### 3.1 智能字段命名推断

| 字段后缀 | Java 类型 | 查询方式 | 说明 |
|---------|---------|---------|------|
| `xxx_name` / `xxx_title` | String | LIKE | 名称/标题（模糊搜索）|
| `xxx_type` / `xxx_status` | Integer | EQ | 类型/状态（精确匹配）|
| `xxx_time` / `xxx_date` | LocalDateTime | BETWEEN | 时间范围查询 |
| `xxx_amount` / `xxx_price` | Long | EQ | 金额（分为单位）|
| `remark` | String | - | 备注 |
| `is_xxx` | Integer | EQ | 布尔标志（0/1）|

#### 3.2 建表 SQL 模板（leniu 规范）

```sql
CREATE TABLE `[表名]` (
    `id`       BIGINT        NOT NULL COMMENT '主键（雪花ID）',

    -- 业务字段
    `xxx_name` VARCHAR(100)  NOT NULL COMMENT '名称',
    `xxx_type` TINYINT       DEFAULT 1 COMMENT '类型(1-xxx,2-xxx)',
    `status`   TINYINT       DEFAULT 1 COMMENT '状态(0停用 1启用)',

    -- 审计字段（注意：leniu 规范，不是 createBy/createTime）
    `crby`     VARCHAR(64)   DEFAULT NULL COMMENT '创建人',
    `crtime`   DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `upby`     VARCHAR(64)   DEFAULT NULL COMMENT '更新人',
    `uptime`   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 逻辑删除（注意：leniu 规范 2=正常，1=删除，与 RuoYi 相反）
    `del_flag` TINYINT       DEFAULT 2 COMMENT '删除标识(1删除 2正常)',

    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_crtime` (`crtime`),
    KEY `idx_del_flag` (`del_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='[功能说明]表';
```

**⚠️ 重要规范**：
- `id` 使用雪花ID（`Id.next()`），不使用 `AUTO_INCREMENT`
- `del_flag`：`2=正常，1=删除`（与 RuoYi 的 `0=正常` 相反）
- 无需 `tenant_id` 字段（双库物理隔离）
- 无需 `create_dept` 字段（leniu 不使用）

---

### 第四步：生成方案确认（仅此一次）

```markdown
## 代码生成方案

### 基本配置
- **功能名称**：XXX 管理
- **模块**：sys-canteen
- **表名**：canteen_xxx
- **Java 类名前缀**：Xxx
- **包名**：net.xnzn.core.canteen.xxx
- **接口路由**：/api/v2/web/canteen/xxx

### 文件清单（四层架构）
| 层 | 文件 | 说明 |
|----|------|------|
| Controller | `web/controller/XxxWebController.java` | Web 端接口 |
| Business | `web/business/impl/XxxWebBusiness.java` | 业务编排 |
| Service | `common/service/impl/XxxService.java` | 单表 CRUD |
| Mapper | `common/mapper/XxxMapper.java` | ORM 映射 |
| Entity | `common/model/Xxx.java` | 实体类 |
| DTO | `web/dto/XxxDTO.java` | 请求参数 |
| VO | `web/vo/XxxVO.java` | 返回对象 |

**确认开始生成？**（回复"确认"或"开始"）
```

---

### 第五步：自动生成代码

用户确认后，按以下顺序生成所有文件：

#### 5.1 Entity 实体类

```java
package net.xnzn.core.[模块].[功能].common.model;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * [功能名称] 实体
 *
 * @author [作者]
 * @date [日期]
 */
@Data
@Accessors(chain = true)
@TableName("[表名]")
@ApiModel("[功能名称]")
public class [实体名] implements Serializable {

    @ApiModelProperty("主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private Long id;

    @ApiModelProperty("名称")
    @TableField("xxx_name")
    private String xxxName;

    // 审计字段
    @ApiModelProperty("删除标识(1删除,2正常)")
    @TableField("del_flag")
    private Integer delFlag;

    @ApiModelProperty("创建人")
    @TableField(value = "crby", fill = FieldFill.INSERT)
    private String crby;

    @ApiModelProperty("创建时间")
    @TableField(value = "crtime", fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    @ApiModelProperty("更新人")
    @TableField(value = "upby", fill = FieldFill.INSERT_UPDATE)
    private String upby;

    @ApiModelProperty("更新时间")
    @TableField(value = "uptime", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;
}
```

#### 5.2 DTO 请求参数

```java
package net.xnzn.core.[模块].[功能].web.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import jakarta.validation.constraints.*;
import java.io.Serializable;

@Data
@ApiModel("[功能名称] 请求参数")
public class [实体名]DTO implements Serializable {

    @ApiModelProperty("主键ID（修改时必填）")
    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @ApiModelProperty("名称")
    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称不能超过100个字符")
    private String xxxName;

    // 分页参数（查询接口使用）
    @ApiModelProperty("页码")
    private Integer pageNum = 1;

    @ApiModelProperty("每页条数")
    private Integer pageSize = 10;
}
```

#### 5.3 VO 返回对象

```java
package net.xnzn.core.[模块].[功能].web.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@ApiModel("[功能名称] 返回对象")
public class [实体名]VO implements Serializable {

    @ApiModelProperty("主键ID")
    private Long id;

    @ApiModelProperty("名称")
    private String xxxName;

    @ApiModelProperty("创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime crtime;
}
```

#### 5.4 Mapper 接口（与 XML 同目录）

```java
package net.xnzn.core.[模块].[功能].common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import net.xnzn.core.[模块].[功能].common.model.[实体名];
import org.apache.ibatis.annotations.Mapper;

/**
 * [功能名称] Mapper
 */
@Mapper
public interface [实体名]Mapper extends BaseMapper<[实体名]> {
}
```

#### 5.5 Service 实现

```java
package net.xnzn.core.[模块].[功能].common.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pig4cloud.pigx.common.core.exception.LeException;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.[模块].[功能].web.dto.[实体名]DTO;
import net.xnzn.core.[模块].[功能].common.mapper.[实体名]Mapper;
import net.xnzn.core.[模块].[功能].common.model.[实体名];
import net.xnzn.core.[模块].[功能].web.vo.[实体名]VO;
import net.xnzn.framework.id.Id;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class [实体名]Service {

    @Resource
    private [实体名]Mapper [实体名小写]Mapper;

    @Transactional(rollbackFor = Exception.class)
    public Long add([实体名]DTO dto) {
        [实体名] entity = BeanUtil.copyProperties(dto, [实体名].class);
        entity.setId(Id.next());
        entity.setDelFlag(2); // 2=正常
        [实体名小写]Mapper.insert(entity);
        return entity.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void update([实体名]DTO dto) {
        Optional.ofNullable([实体名小写]Mapper.selectById(dto.getId()))
            .orElseThrow(() -> new LeException("记录不存在"));
        [实体名] entity = BeanUtil.copyProperties(dto, [实体名].class);
        [实体名小写]Mapper.updateById(entity);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        Optional.ofNullable([实体名小写]Mapper.selectById(id))
            .orElseThrow(() -> new LeException("记录不存在"));
        [实体名] entity = new [实体名]().setId(id).setDelFlag(1); // 1=删除
        [实体名小写]Mapper.updateById(entity);
    }

    public [实体名]VO getById(Long id) {
        [实体名] entity = Optional.ofNullable([实体名小写]Mapper.selectById(id))
            .orElseThrow(() -> new LeException("记录不存在"));
        return BeanUtil.copyProperties(entity, [实体名]VO.class);
    }

    public List<[实体名]VO> list([实体名]DTO dto) {
        LambdaQueryWrapper<[实体名]> wrapper = buildWrapper(dto);
        List<[实体名]> list = [实体名小写]Mapper.selectList(wrapper);
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        return BeanUtil.copyToList(list, [实体名]VO.class);
    }

    private LambdaQueryWrapper<[实体名]> buildWrapper([实体名]DTO dto) {
        LambdaQueryWrapper<[实体名]> wrapper = Wrappers.lambdaQuery();
        wrapper.eq([实体名]::getDelFlag, 2); // 只查正常数据
        if (StrUtil.isNotBlank(dto.getXxxName())) {
            wrapper.like([实体名]::getXxxName, dto.getXxxName());
        }
        wrapper.orderByDesc([实体名]::getCrtime);
        return wrapper;
    }
}
```

#### 5.6 Business 业务层

```java
package net.xnzn.core.[模块].[功能].web.business.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.github.pagehelper.page.PageMethod;
import net.xnzn.core.[模块].[功能].web.dto.[实体名]DTO;
import net.xnzn.core.[模块].[功能].common.service.impl.[实体名]Service;
import net.xnzn.core.[模块].[功能].web.vo.[实体名]VO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Slf4j
@Service
public class [实体名]WebBusiness {

    @Resource
    private [实体名]Service [实体名小写]Service;

    public Long add([实体名]DTO dto) {
        return [实体名小写]Service.add(dto);
    }

    public void update([实体名]DTO dto) {
        [实体名小写]Service.update(dto);
    }

    public void delete(Long id) {
        [实体名小写]Service.delete(id);
    }

    public [实体名]VO getById(Long id) {
        return [实体名小写]Service.getById(id);
    }

    public List<[实体名]VO> page([实体名]DTO dto) {
        PageMethod.startPage(dto.getPageNum(), dto.getPageSize());
        return [实体名小写]Service.list(dto);
    }
}
```

#### 5.7 Controller 接口层

```java
package net.xnzn.core.[模块].[功能].web.controller;

import com.pig4cloud.pigx.common.core.util.LeRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.[模块].[功能].web.business.impl.[实体名]WebBusiness;
import net.xnzn.core.[模块].[功能].web.dto.[实体名]DTO;
import net.xnzn.core.[模块].[功能].web.vo.[实体名]VO;
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v2/web/[模块]/[功能]")
@Api(tags = "[功能名称]管理")
public class [实体名]WebController {

    @Resource
    private [实体名]WebBusiness [实体名小写]Business;

    @PostMapping("/add")
    @ApiOperation("新增")
    @RequiresAuthentication
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<[实体名]DTO> request) {
        return [实体名小写]Business.add(request.getContent());
    }

    @PostMapping("/update")
    @ApiOperation("修改")
    @RequiresAuthentication
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<[实体名]DTO> request) {
        [实体名小写]Business.update(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation("删除")
    @RequiresAuthentication
    public void delete(@RequestBody LeRequest<Long> request) {
        [实体名小写]Business.delete(request.getContent());
    }

    @GetMapping("/get/{id}")
    @ApiOperation("获取详情")
    @RequiresAuthentication
    public [实体名]VO getById(@PathVariable Long id) {
        return [实体名小写]Business.getById(id);
    }

    @PostMapping("/page")
    @ApiOperation("分页查询")
    @RequiresAuthentication
    public List<[实体名]VO> page(@RequestBody LeRequest<[实体名]DTO> request) {
        return [实体名小写]Business.page(request.getContent());
    }
}
```

---

### 第六步：完成报告

```markdown
## 代码生成完成！

### 已生成文件（7 个）

| 层 | 文件 |
|----|------|
| Controller | web/controller/[实体名]WebController.java |
| Business | web/business/impl/[实体名]WebBusiness.java |
| Service | common/service/impl/[实体名]Service.java |
| Mapper | common/mapper/[实体名]Mapper.java |
| Entity | common/model/[实体名].java |
| DTO | web/dto/[实体名]DTO.java |
| VO | web/vo/[实体名]VO.java |

### 下一步

1. 执行建表 SQL
2. 根据业务需求完善 buildWrapper 查询条件
3. 如有复杂业务逻辑，在 Business 层添加编排
4. 使用 /check 检查代码规范
```

---

## 执行规则

1. ✅ **包名**：必须是 `net.xnzn.core.[模块].*`
2. ✅ **四层架构**：Controller → Business → Service → Mapper
3. ✅ **审计字段**：crby/crtime/upby/uptime（不是 createBy/createTime）
4. ✅ **del_flag**：`2=正常，1=删除`（不是 0=正常）
5. ✅ **无 tenant_id**：双库物理隔离，Entity 不含此字段
6. ✅ **LeRequest<T>**：POST 请求体统一封装
7. ✅ **BeanUtil**：对象转换用 `BeanUtil.copyProperties()`（不用 MapstructUtils）
8. ✅ **LeException**：异常用 `LeException`（不用 ServiceException）
9. ✅ **Id.next()**：主键用雪花 ID（不用 AUTO_INCREMENT）
10. ✅ **Mapper XML**：与 Java 文件放同一目录（不在 resources/mapper/）
