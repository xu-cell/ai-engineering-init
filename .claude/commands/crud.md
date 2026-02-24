# /crud - 快速生成 CRUD 代码

作为 CRUD 代码生成助手，基于已存在的数据库表快速生成 leniu-tengyun-core 标准后端代码。

## 适用场景

- ✅ **数据库表已存在** - 表结构已设计完毕
- ✅ **快速生成四层代码** - Entity / DTO / VO / Mapper / Service / Business / Controller
- ✅ **标准 CRUD** - 增删改查、分页列表

不适合：
- ❌ 表结构尚未设计 → 使用 `/dev` 命令
- ❌ 需要复杂业务逻辑 → 使用 `/dev` 后手动增强

---

## 执行流程

### 第一步：获取表信息

询问用户：

```
请提供以下信息：

1. 表名？（如：canteen_order_info）
2. 所属模块？（sys-canteen / sys-kitchen / sys-drp / sys-common）
3. 功能名称（中文）？（如：订单管理）
4. 端类型？（web / mobile / android，默认 web）
```

#### 1.1 查看表结构

```bash
# 查看表结构（用户提供连接信息，或从配置文件读取）
SHOW CREATE TABLE [表名];
DESC [表名];
```

#### 1.2 字段类型映射

| 数据库类型 | Java 类型 | 说明 |
|-----------|---------|------|
| BIGINT | Long | 主键、外键、金额（分）|
| INT / TINYINT | Integer | 状态、类型 |
| VARCHAR / CHAR | String | 字符串 |
| TEXT / LONGTEXT | String | 长文本 |
| DATETIME / TIMESTAMP | LocalDateTime | 时间 |
| DECIMAL | BigDecimal | 高精度数值 |

#### 1.3 输出表结构分析

```markdown
## 表结构分析

**表名**：canteen_order_info
**功能名称**：订单管理
**包名**：net.xnzn.core.canteen.order

**字段列表**：
| 字段 | 类型 | 注释 | 是否审计 |
|------|------|------|---------|
| id | BIGINT | 主键 | - |
| order_no | VARCHAR(32) | 订单号 | - |
| total_amount | BIGINT | 订单金额（分）| - |
| status | TINYINT | 订单状态 | - |
| crby | VARCHAR(64) | 创建人 | ✅ |
| crtime | DATETIME | 创建时间 | ✅ |
| upby | VARCHAR(64) | 更新人 | ✅ |
| uptime | DATETIME | 更新时间 | ✅ |
| del_flag | TINYINT | 删除标识(1删除,2正常) | ✅ |

**审计字段**：✅ 完整（crby/crtime/upby/uptime/del_flag）
**逻辑删除**：✅ del_flag（2=正常，1=删除）
```

---

### 第二步：生成代码清单确认

```markdown
## 代码生成方案

**功能名称**：订单管理
**Java 类名前缀**：OrderInfo
**包名**：net.xnzn.core.canteen.order
**路由**：/api/v2/web/canteen/order

**将生成 7 个文件**：

| 层 | 文件 |
|----|------|
| Controller | web/controller/OrderInfoWebController.java |
| Business | web/business/impl/OrderInfoWebBusiness.java |
| Service | common/service/impl/OrderInfoService.java |
| Mapper | common/mapper/OrderInfoMapper.java + OrderInfoMapper.xml |
| Entity | common/model/OrderInfo.java |
| DTO | web/dto/OrderInfoDTO.java |
| VO | web/vo/OrderInfoVO.java |

确认开始生成？
```

---

### 第三步：生成所有文件

#### Entity 实体类

根据表字段逐一映射，**注意**：
- 审计字段使用 `@TableField(fill = FieldFill.INSERT)` 自动填充
- `delFlag` 字段不加自动填充（手动设置）
- 不生成 `tenantId` 字段

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
 */
@Data
@Accessors(chain = true)
@TableName("[表名]")
@ApiModel("[功能名称]")
public class [实体名] implements Serializable {

    @ApiModelProperty("主键ID")
    @TableId(value = "id", type = IdType.INPUT)
    private Long id;

    // === 业务字段（从表结构逐一映射）===

    @ApiModelProperty("删除标识(1删除,2正常)")
    @TableField("del_flag")
    private Integer delFlag;

    @TableField(value = "crby", fill = FieldFill.INSERT)
    private String crby;

    @TableField(value = "crtime", fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    @TableField(value = "upby", fill = FieldFill.INSERT_UPDATE)
    private String upby;

    @TableField(value = "uptime", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;
}
```

#### DTO 请求参数

根据业务字段生成，审计字段不放入 DTO：

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

    @ApiModelProperty("主键ID（修改必填）")
    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    // === 业务字段 ===

    // 分页参数
    private Integer pageNum = 1;
    private Integer pageSize = 10;
}
```

#### VO 返回对象

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

    // === 业务字段 ===

    @ApiModelProperty("创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime crtime;
}
```

#### Mapper 接口

```java
package net.xnzn.core.[模块].[功能].common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import net.xnzn.core.[模块].[功能].common.model.[实体名];
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface [实体名]Mapper extends BaseMapper<[实体名]> {
}
```

#### Mapper XML（与 Java 同目录）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="net.xnzn.core.[模块].[功能].common.mapper.[实体名]Mapper">

</mapper>
```

#### Service 实现

```java
package net.xnzn.core.[模块].[功能].common.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
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
    private [实体名]Mapper mapper;

    @Transactional(rollbackFor = Exception.class)
    public Long add([实体名]DTO dto) {
        [实体名] entity = BeanUtil.copyProperties(dto, [实体名].class);
        entity.setId(Id.next()).setDelFlag(2);
        mapper.insert(entity);
        return entity.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void update([实体名]DTO dto) {
        Optional.ofNullable(mapper.selectById(dto.getId()))
            .orElseThrow(() -> new LeException("记录不存在"));
        mapper.updateById(BeanUtil.copyProperties(dto, [实体名].class));
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        Optional.ofNullable(mapper.selectById(id))
            .orElseThrow(() -> new LeException("记录不存在"));
        mapper.updateById(new [实体名]().setId(id).setDelFlag(1));
    }

    public [实体名]VO getById(Long id) {
        return BeanUtil.copyProperties(
            Optional.ofNullable(mapper.selectById(id))
                .orElseThrow(() -> new LeException("记录不存在")),
            [实体名]VO.class
        );
    }

    public List<[实体名]VO> list([实体名]DTO dto) {
        List<[实体名]> list = mapper.selectList(buildWrapper(dto));
        if (CollUtil.isEmpty(list)) return Collections.emptyList();
        return BeanUtil.copyToList(list, [实体名]VO.class);
    }

    private LambdaQueryWrapper<[实体名]> buildWrapper([实体名]DTO dto) {
        return Wrappers.<[实体名]>lambdaQuery()
            .eq([实体名]::getDelFlag, 2)
            // 根据业务字段追加查询条件
            // .like(StrUtil.isNotBlank(dto.getXxxName()), [实体名]::getXxxName, dto.getXxxName())
            .orderByDesc([实体名]::getCrtime);
    }
}
```

#### Business 业务层

```java
package net.xnzn.core.[模块].[功能].web.business.impl;

import com.github.pagehelper.page.PageMethod;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.[模块].[功能].web.dto.[实体名]DTO;
import net.xnzn.core.[模块].[功能].common.service.impl.[实体名]Service;
import net.xnzn.core.[模块].[功能].web.vo.[实体名]VO;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

@Slf4j
@Service
public class [实体名]WebBusiness {

    @Resource
    private [实体名]Service service;

    public Long add([实体名]DTO dto) { return service.add(dto); }
    public void update([实体名]DTO dto) { service.update(dto); }
    public void delete(Long id) { service.delete(id); }

    public [实体名]VO getById(Long id) { return service.getById(id); }

    public List<[实体名]VO> page([实体名]DTO dto) {
        PageMethod.startPage(dto.getPageNum(), dto.getPageSize());
        return service.list(dto);
    }
}
```

#### Controller 接口层

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
    private [实体名]WebBusiness business;

    @PostMapping("/add")
    @ApiOperation("新增")
    @RequiresAuthentication
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<[实体名]DTO> request) {
        return business.add(request.getContent());
    }

    @PostMapping("/update")
    @ApiOperation("修改")
    @RequiresAuthentication
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<[实体名]DTO> request) {
        business.update(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation("删除")
    @RequiresAuthentication
    public void delete(@RequestBody LeRequest<Long> request) {
        business.delete(request.getContent());
    }

    @GetMapping("/get/{id}")
    @ApiOperation("获取详情")
    @RequiresAuthentication
    public [实体名]VO getById(@PathVariable Long id) {
        return business.getById(id);
    }

    @PostMapping("/page")
    @ApiOperation("分页查询")
    @RequiresAuthentication
    public List<[实体名]VO> page(@RequestBody LeRequest<[实体名]DTO> request) {
        return business.page(request.getContent());
    }
}
```

---

### 第四步：输出清单

```markdown
## CRUD 代码生成完成！

### 已生成文件（8 个）

| 文件 | 状态 |
|------|------|
| common/model/[实体名].java | ✅ |
| web/dto/[实体名]DTO.java | ✅ |
| web/vo/[实体名]VO.java | ✅ |
| common/mapper/[实体名]Mapper.java | ✅ |
| common/mapper/[实体名]Mapper.xml | ✅ |
| common/service/impl/[实体名]Service.java | ✅ |
| web/business/impl/[实体名]WebBusiness.java | ✅ |
| web/controller/[实体名]WebController.java | ✅ |

### 下一步

1. 完善 DTO 查询条件字段
2. 完善 Service buildWrapper 查询逻辑
3. 根据业务在 Business 层增加复杂编排
4. 运行 /check 检查代码规范
```

---

## 与 /dev 的区别

| 对比 | `/crud` | `/dev` |
|------|---------|--------|
| **适用** | 表已存在 | 从零设计 |
| **建表 SQL** | ❌ 跳过 | ✅ 引导设计 |
| **代码生成** | ✅ 快速 | ✅ 完整 |
