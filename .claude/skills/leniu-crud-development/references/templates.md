# leniu CRUD 完整代码模板

> 本文件是 `leniu-crud-development` 技能的参考文档，包含完整的代码模板。

## 1. Entity 完整模板

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

    @ApiModelProperty("主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty("名称")
    @TableField("name")
    private String name;

    @ApiModelProperty("状态")
    @TableField("status")
    private Integer status;

    @ApiModelProperty("删除标识(1删除,2正常)")
    @TableField("del_flag")
    private Integer delFlag;

    @ApiModelProperty("乐观锁")
    @TableField("revision")
    private Integer revision;

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

---

## 2. DTO 完整模板

```java
package net.xnzn.core.xxx.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.util.Date;

/**
 * XXX DTO
 */
@Data
@ApiModel("XXX DTO")
public class XxxDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @NotNull(message = "主键ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @ApiModelProperty(value = "名称", required = true)
    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @ApiModelProperty(value = "状态")
    private Integer status;

    @ApiModelProperty(value = "开始时间", required = true)
    @NotNull(message = "开始时间不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private Date startTime;

    @ApiModelProperty(value = "结束时间", required = true)
    @NotNull(message = "结束时间不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private Date endTime;
}
```

---

## 3. VO 完整模板

```java
package net.xnzn.core.xxx.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * XXX VO
 */
@Data
@ApiModel("XXX VO")
public class XxxVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("主键ID")
    private Long id;

    @ApiModelProperty("名称")
    private String name;

    @ApiModelProperty("状态")
    private String status;

    @ApiModelProperty("状态描述")
    private String statusDesc;

    @ApiModelProperty(value = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date crtime;

    @ApiModelProperty(value = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date uptime;
}
```

---

## 4. Service 接口完整模板

```java
package net.xnzn.core.xxx.service;

import net.xnzn.core.xxx.dto.XxxDTO;
import net.xnzn.core.xxx.vo.XxxVO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import java.util.List;

/**
 * XXX 服务接口
 */
public interface XxxService {

    Long add(XxxDTO dto);

    void update(XxxDTO dto);

    void delete(Long id);

    XxxVO getById(Long id);

    Page<XxxVO> page(XxxDTO dto);

    List<XxxVO> list(XxxDTO dto);
}
```

---

## 5. Service 实现完整模板

```java
package net.xnzn.core.xxx.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pig4cloud.pigx.common.core.exception.LeException;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.xxx.dto.XxxDTO;
import net.xnzn.core.xxx.mapper.XxxMapper;
import net.xnzn.core.xxx.model.XxxEntity;
import net.xnzn.core.xxx.service.XxxService;
import net.xnzn.core.xxx.vo.XxxVO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * XXX 服务实现
 */
@Slf4j
@Service
public class XxxServiceImpl implements XxxService {

    @Resource
    private XxxMapper xxxMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long add(XxxDTO dto) {
        log.info("开始新增XXX，名称: {}", dto.getName());

        // 参数校验
        if (StrUtil.isBlank(dto.getName())) {
            throw new LeException("名称不能为空");
        }

        // 唯一性检查
        LambdaQueryWrapper<XxxEntity> wrapper = Wrappers.lambdaQuery();
        wrapper.eq(XxxEntity::getName, dto.getName());
        wrapper.eq(XxxEntity::getDelFlag, 2);
        Long count = xxxMapper.selectCount(wrapper);
        if (count > 0) {
            throw new LeException("名称已存在");
        }

        // 转换并保存
        XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);
        entity.setDelFlag(2); // 正常状态

        xxxMapper.insert(entity);

        log.info("新增XXX成功，ID: {}", entity.getId());
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(XxxDTO dto) {
        if (ObjectUtil.isNull(dto.getId())) {
            throw new LeException("ID不能为空");
        }

        Optional.ofNullable(xxxMapper.selectById(dto.getId()))
            .orElseThrow(() -> new LeException("记录不存在"));

        XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);
        xxxMapper.updateById(entity);

        log.info("更新XXX成功，ID: {}", dto.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        if (ObjectUtil.isNull(id)) {
            throw new LeException("ID不能为空");
        }

        Optional.ofNullable(xxxMapper.selectById(id))
            .orElseThrow(() -> new LeException("记录不存在"));

        // 逻辑删除
        XxxEntity entity = new XxxEntity();
        entity.setId(id);
        entity.setDelFlag(1); // 删除状态

        xxxMapper.updateById(entity);

        log.info("删除XXX成功，ID: {}", id);
    }

    @Override
    public XxxVO getById(Long id) {
        if (ObjectUtil.isNull(id)) {
            throw new LeException("ID不能为空");
        }

        XxxEntity entity = Optional.ofNullable(xxxMapper.selectById(id))
            .orElseThrow(() -> new LeException("记录不存在"));

        return BeanUtil.copyProperties(entity, XxxVO.class);
    }

    @Override
    public Page<XxxVO> page(XxxDTO dto) {
        LambdaQueryWrapper<XxxEntity> wrapper = buildWrapper(dto);

        Page<XxxEntity> page = new Page<>(dto.getPageNum(), dto.getPageSize());
        Page<XxxEntity> result = xxxMapper.selectPage(page, wrapper);

        Page<XxxVO> voPage = new Page<>();
        BeanUtil.copyProperties(result, voPage, "records");
        voPage.setRecords(BeanUtil.copyToList(result.getRecords(), XxxVO.class));

        return voPage;
    }

    @Override
    public List<XxxVO> list(XxxDTO dto) {
        LambdaQueryWrapper<XxxEntity> wrapper = buildWrapper(dto);
        List<XxxEntity> list = xxxMapper.selectList(wrapper);

        if (CollUtil.isEmpty(list)) {
            return Collections.emptyList();
        }

        return list.stream()
            .map(entity -> BeanUtil.copyProperties(entity, XxxVO.class))
            .collect(Collectors.toList());
    }

    /**
     * 构建查询条件
     */
    private LambdaQueryWrapper<XxxEntity> buildWrapper(XxxDTO dto) {
        LambdaQueryWrapper<XxxEntity> wrapper = Wrappers.lambdaQuery();
        wrapper.eq(XxxEntity::getDelFlag, 2);

        if (StrUtil.isNotBlank(dto.getName())) {
            wrapper.like(XxxEntity::getName, dto.getName());
        }
        if (ObjectUtil.isNotNull(dto.getStatus())) {
            wrapper.eq(XxxEntity::getStatus, dto.getStatus());
        }

        wrapper.orderByDesc(XxxEntity::getCrtime);
        return wrapper;
    }
}
```

---

## 6. Mapper 接口完整模板

```java
package net.xnzn.core.xxx.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import net.xnzn.core.xxx.model.XxxEntity;
import org.apache.ibatis.annotations.Mapper;

/**
 * XXX Mapper 接口
 */
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {
    // 继承 BaseMapper，自定义 SQL 在此添加方法并在 XML 中实现
}
```

---

## 7. Mapper XML 完整模板（与 Java 同目录）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="net.xnzn.core.xxx.mapper.XxxMapper">

    <!-- 禁止使用 SELECT *，明确指定查询字段 -->
    <select id="selectCustom" resultType="net.xnzn.core.xxx.model.XxxEntity">
        SELECT id, name, status, del_flag, crby, crtime, upby, uptime
        FROM xxx_table
        WHERE del_flag = 2
    </select>

</mapper>
```

---

## 8. Controller 完整模板

```java
package net.xnzn.core.xxx.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pig4cloud.pigx.common.core.util.LeRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.xxx.dto.XxxDTO;
import net.xnzn.core.xxx.service.XxxService;
import net.xnzn.core.xxx.vo.XxxVO;
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.List;

/**
 * XXX 管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/v2/web/xxx")
@Api(tags = "XXX管理")
public class XxxWebController {

    @Resource
    private XxxService xxxService;

    @PostMapping("/add")
    @ApiOperation(value = "XXX-新增")
    @RequiresAuthentication
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.add(request.getContent());
    }

    @PostMapping("/update")
    @ApiOperation(value = "XXX-修改")
    @RequiresAuthentication
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        xxxService.update(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation(value = "XXX-删除")
    @RequiresAuthentication
    public void delete(@RequestBody LeRequest<Long> request) {
        xxxService.delete(request.getContent());
    }

    @GetMapping("/get/{id}")
    @ApiOperation(value = "XXX-获取详情")
    @RequiresGuest
    public XxxVO getById(@PathVariable Long id) {
        return xxxService.getById(id);
    }

    @PostMapping("/page")
    @ApiOperation(value = "XXX-分页查询")
    @RequiresAuthentication
    public Page<XxxVO> page(@Validated @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.page(request.getContent());
    }

    @PostMapping("/list")
    @ApiOperation(value = "XXX-查询列表")
    @RequiresGuest
    public List<XxxVO> list(@RequestBody LeRequest<XxxDTO> request) {
        return xxxService.list(request.getContent());
    }
}
```

---

## 9. 建表 SQL 完整模板

```sql
CREATE TABLE `xxx_table` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',

    -- 业务字段
    `name` VARCHAR(100) NOT NULL COMMENT '名称',
    `status` TINYINT(1) DEFAULT 1 COMMENT '状态(0停用 1启用)',

    -- 删除标识（注意：1=删除，2=正常）
    `del_flag` TINYINT(1) DEFAULT 2 COMMENT '删除标识(1删除 2正常)',
    `revision` INT DEFAULT 0 COMMENT '乐观锁版本号',

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
-- 无需 tenant_id（双库物理隔离）
```

---

## 10. 分组校验接口

```java
// InsertGroup.java
public interface InsertGroup {}

// UpdateGroup.java
public interface UpdateGroup {}
```

---

## 11. 多表事务操作模板

```java
@Transactional(rollbackFor = Exception.class)
public void createOrderWithStock(OrderDTO dto) {
    // 操作订单表
    OrderEntity order = BeanUtil.copyProperties(dto, OrderEntity.class);
    orderMapper.insert(order);

    // 操作订单明细表
    List<OrderDetailEntity> details = dto.getDetails().stream()
        .map(d -> BeanUtil.copyProperties(d, OrderDetailEntity.class))
        .collect(Collectors.toList());
    orderDetailMapper.insert(details);

    // 操作库存表
    stockMapper.deduct(dto.getStockId(), dto.getQuantity());
}
```

---

## 12. 代码质量模板

### 空指针防护

```java
// Optional 链式处理
XxxEntity entity = Optional.ofNullable(xxxMapper.selectById(id))
    .orElseThrow(() -> new LeException("数据不存在"));
```

### 返回值兜底

```java
public List<XxxVO> listByParam(XxxDTO dto) {
    List<XxxEntity> list = xxxMapper.selectList(buildWrapper(dto));
    if (CollUtil.isEmpty(list)) {
        return Collections.emptyList();
    }
    return BeanUtil.copyToList(list, XxxVO.class);
}
```

### 集合参数防御

```java
public List<XxxVO> selectByIds(List<Long> ids) {
    if (CollUtil.isEmpty(ids)) {
        return Collections.emptyList();
    }
    return BeanUtil.copyToList(xxxMapper.selectBatchIds(ids), XxxVO.class);
}
```

### 级联调用防护

```java
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .map(City::getName)
    .orElse("未知");
```

### Stream 操作

```java
// Java 21 使用 toList()
List<Long> ids = list.stream().map(XxxVO::getId).distinct().toList();

// 转 Map
Map<Long, XxxVO> map = list.stream()
    .collect(Collectors.toMap(XxxVO::getId, Function.identity()));

// 分组
Map<Integer, List<XxxVO>> grouped = list.stream()
    .collect(Collectors.groupingBy(XxxVO::getStatus));
```
