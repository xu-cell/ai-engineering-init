---
name: leniu-crud-development
description: |
  leniu 项目 CRUD 开发规范。基于 pigx-framework 三层架构（Controller → Service → Mapper），无独立 DAO 层。
  涵盖 Service 层事务管理、分页查询模式、并发处理、代码质量要点。

  触发场景：
  - 新建 leniu 业务模块的 CRUD 功能
  - 创建 Entity、DTO、VO、Service、Mapper、Controller
  - 分页查询、新增、修改、删除、导出
  - 查询条件构建（LambdaQueryWrapper）
  - Service 层事务管理（多表操作、事务回滚）
  - 并发处理（CompletableFuture、分布式锁）
  - 代码质量：空指针防护、返回值兜底、集合参数防御

  适用项目：
  - leniu-tengyun-core（云食堂核心服务）
  - leniu-yunshitang（云食堂业务服务）

  触发词：leniu-CRUD、leniu-增删改查、leniu-新建模块、leniu-Entity、leniu-DTO、leniu-VO、leniu-Service、leniu-Mapper、leniu-Controller、leniu-分页查询、LeRequest、PageDTO、net.xnzn、leniu-yunshitang、云食堂CRUD、leniu-事务、leniu-并发、leniu-代码质量、leniu-空指针、leniu-ServiceImpl
---

# leniu CRUD 开发规范

## 项目定位

本技能专用于 **leniu 云食堂项目** 的 CRUD 功能开发。

| 项目 | 路径 |
|------|------|
| **leniu-tengyun-core** | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core` |
| **leniu-yunshitang** | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang` |
| **包名前缀** | `net.xnzn.core.*` |

---

## 核心架构差异

| 对比项 | leniu-tengyun-core |
|--------|-------------------|
| **包名前缀** | `net.xnzn.*` |
| **架构** | 三层：Controller → Service → Mapper |
| **DAO 层** | 不存在，Service 直接注入 Mapper |
| **查询构建** | Service 层 LambdaQueryWrapper |
| **Mapper 继承** | `BaseMapper<Entity>` |
| **对象转换** | `BeanUtil.copyProperties()` (Hutool) |
| **Entity 基类** | 无基类（自定义审计字段） |
| **请求封装** | `LeRequest<T>` 包装 |
| **响应封装** | `Page<T>`, `LeResponse<T>`, `void` |
| **分组校验** | `InsertGroup`, `UpdateGroup` |
| **认证注解** | `@RequiresAuthentication`, `@RequiresGuest` |
| **异常类** | `LeException` |
| **审计字段** | `crby/crtime/upby/uptime` |
| **逻辑删除** | `del_flag` (1=删除, 2=正常) |
| **主键策略** | 雪花ID 或 自增ID |
| **Mapper XML** | 与 Java 同目录（非 resources/mapper） |

---

## 1. Entity 实体类

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
     * 名称
     */
    @ApiModelProperty("名称")
    @TableField("name")
    private String name;

    /**
     * 状态
     */
    @ApiModelProperty("状态")
    @TableField("status")
    private Integer status;

    /**
     * 删除标识(1删除,2正常)
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

## 2. DTO 数据传输对象

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

## 3. VO 视图对象

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

## 4. Service 接口

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

    /**
     * 新增
     */
    Long add(XxxDTO dto);

    /**
     * 修改
     */
    void update(XxxDTO dto);

    /**
     * 删除
     */
    void delete(Long id);

    /**
     * 根据ID查询
     */
    XxxVO getById(Long id);

    /**
     * 分页查询
     */
    Page<XxxVO> page(XxxDTO dto);

    /**
     * 查询列表
     */
    List<XxxVO> list(XxxDTO dto);
}
```

---

## 5. Service 实现类

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

        // 业务校验：唯一性检查
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

        // 查询并校验记录存在
        XxxEntity exist = Optional.ofNullable(xxxMapper.selectById(dto.getId()))
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

        // 分页
        Page<XxxEntity> page = new Page<>(dto.getPageNum(), dto.getPageSize());
        Page<XxxEntity> result = xxxMapper.selectPage(page, wrapper);

        // 转换为 VO
        Page<XxxVO> voPage = new Page<>();
        BeanUtil.copyProperties(result, voPage, "records");
        List<XxxVO> voList = result.getRecords().stream()
            .map(entity -> BeanUtil.copyProperties(entity, XxxVO.class))
            .collect(Collectors.toList());
        voPage.setRecords(voList);

        return voPage;
    }

    @Override
    public List<XxxVO> list(XxxDTO dto) {
        LambdaQueryWrapper<XxxEntity> wrapper = buildWrapper(dto);

        List<XxxEntity> list = xxxMapper.selectList(wrapper);

        // 空集合兜底
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

        // 只查询正常数据
        wrapper.eq(XxxEntity::getDelFlag, 2);

        // 名称模糊查询
        if (StrUtil.isNotBlank(dto.getName())) {
            wrapper.like(XxxEntity::getName, dto.getName());
        }

        // 状态精确查询
        if (ObjectUtil.isNotNull(dto.getStatus())) {
            wrapper.eq(XxxEntity::getStatus, dto.getStatus());
        }

        // 按创建时间倒序
        wrapper.orderByDesc(XxxEntity::getCrtime);

        return wrapper;
    }
}
```

---

## 6. Mapper 接口

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

    // 继承 BaseMapper，已提供常用 CRUD 方法
    // 如需自定义 SQL，在此添加方法并在对应的 XML 中实现
}
```

---

## 7. Mapper XML（与 Java 同目录）

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

## 8. Controller 控制器

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
@RequestMapping("/api/xxx")
@Api(tags = "XXX管理")
public class XxxController {

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

## 9. 数据库建表（SQL）

```sql
-- 表名：xxx_table（根据业务命名，格式: {模块}_{业务名}）
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
```

---

## 10. 事务管理规范

### 多表操作必须加事务

```java
/**
 * 多表操作示例：创建订单同时更新库存
 */
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

### 查询方法不加事务

```java
// 查询方法不需要事务，避免不必要的事务开销
public XxxVO getById(Long id) {
    // 无需 @Transactional
    XxxEntity entity = xxxMapper.selectById(id);
    ...
}
```

### 手动回滚（特殊场景）

```java
@Transactional(rollbackFor = Exception.class)
public void businessMethod() {
    try {
        // 业务逻辑
    } catch (Exception e) {
        log.error("处理失败", e);
        // 手动标记回滚
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        throw new LeException("处理失败");
    }
}
```

### Self 自注入（同类事务调用）

当 Service/Business 中的方法 A 需要调用同类的带 `@Transactional` 方法 B 时，必须通过 `self` 代理调用，否则事务不生效：

```java
@Slf4j
@Service
public class OrderPlaceBusiness {

    @Autowired
    @Lazy
    private OrderPlaceBusiness self;  // ⚠️ 自注入，用于触发 Spring AOP 事务代理

    /**
     * 外部调用入口（可以不加事务）
     */
    public void doSave(OrderSavePO orderSavePO) {
        // ✅ 通过 self 调用，保证 @Transactional 生效
        self.save(orderSavePO, false, false);
    }

    /**
     * 实际保存逻辑
     */
    @Transactional(rollbackFor = Exception.class)
    public void save(OrderSavePO orderSavePO, boolean orderExists, boolean removeDetails) {
        // 多表操作...
    }
}
```

**规则**：
- 同类方法互调，被调用方有 `@Transactional` → 必须用 `self.xxx()` 而非 `this.xxx()`
- `self` 字段必须配合 `@Autowired @Lazy` 避免循环依赖
- 纯方法重载（无 `@Transactional`）的情况无需 `self`

---

## 11. 分页查询模式

### 标准 MyBatis-Plus 分页

```java
@Override
public Page<XxxVO> page(XxxDTO dto) {
    LambdaQueryWrapper<XxxEntity> wrapper = buildWrapper(dto);

    // 创建分页对象
    Page<XxxEntity> page = new Page<>(dto.getPageNum(), dto.getPageSize());
    Page<XxxEntity> result = xxxMapper.selectPage(page, wrapper);

    // 转换 VO
    Page<XxxVO> voPage = new Page<>();
    BeanUtil.copyProperties(result, voPage, "records");
    voPage.setRecords(BeanUtil.copyToList(result.getRecords(), XxxVO.class));

    return voPage;
}
```

### PageHelper 分页（报表场景）

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    // 1. 开启分页：必须传入 param.getPage()（PageDTO对象），不能传整个 param
    if (Objects.nonNull(param.getPage())) {
        PageMethod.startPage(param.getPage());
    }

    // 2. 执行查询
    List<XxxVO> records = xxxMapper.pageList(param);

    // 3. 封装分页结果（自动提取 total 等信息）
    return PageVO.of(records);
}
```

**分页关键规则**：
1. `PageMethod.startPage(param.getPage())` 必须紧接在查询前调用，传 `PageDTO` 对象
2. 调用 startPage 和查询之间不能插入其他查询，否则分页失效
3. `PageVO.of()` 自动从 Page 对象提取分页信息
4. Mapper 方法返回 `List` 即可，PageHelper 自动转换

### 带合计行的分页（报表场景）

```java
public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dataPermission = reportDataPermissionService.getDataPermission(authPO);

    if (Objects.nonNull(param.getPage())) {
        PageMethod.startPage(param.getPage());
    }
    List<XxxVO> list = xxxMapper.getSummaryList(param, authPO, dataPermission);
    XxxVO totalLine = Optional.ofNullable(xxxMapper.getSummaryTotal(param, authPO, dataPermission))
            .orElse(new XxxVO());
    return new ReportBaseTotalVO<XxxVO>()
            .setResultPage(PageVO.of(list))
            .setTotalLine(totalLine);
}
```

---

## 12. 报表 Service 模式（含数据权限）

报表模块 Service 直接作为 `@Service` 类（**无接口**），标准模式如下：

```java
@Slf4j
@Service
public class ReportXxxService {

    @Autowired
    private ReportXxxMapper reportXxxMapper;
    @Autowired
    private MgrAuthV2Api mgrAuthApi;
    @Autowired
    private ReportDataPermissionService reportDataPermissionService;
    @Resource(name = "yunshitangTaskExecutor")
    private AsyncTaskExecutor asyncTaskExecutor;

    /**
     * 分页查询（含合计行）
     */
    public ReportBaseTotalVO<XxxVO> pageXxx(XxxParam param) {
        long start = System.currentTimeMillis();
        MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
        ReportDataPermissionParam dataPermission = reportDataPermissionService.getDataPermission(authPO);

        if (Objects.nonNull(param.getPage())) {
            PageMethod.startPage(param.getPage());
        }
        List<XxxVO> list = reportXxxMapper.pageXxx(param, authPO, dataPermission);
        XxxVO totalLine = Optional.ofNullable(reportXxxMapper.sumXxx(param, authPO, dataPermission))
                .orElse(new XxxVO());
        log.info("pageXxx耗时：{}", System.currentTimeMillis() - start);
        return new ReportBaseTotalVO<XxxVO>()
                .setResultPage(PageVO.of(list))
                .setTotalLine(totalLine);
    }
}
```

**报表 Service 关键规则**：
- 通过 `mgrAuthApi.getUserAuthPO()` 获取当前用户权限
- 通过 `reportDataPermissionService.getDataPermission(authPO)` 获取数据权限
- 线程池名称为 `yunshitangTaskExecutor`（用 `@Resource(name = "yunshitangTaskExecutor")`）
- 性能日志：`log.info("方法名耗时：{}", System.currentTimeMillis() - start)`

---

## 13. 并发处理

### CompletableFuture 并行查询（报表场景）

```java
@Resource(name = "yunshitangTaskExecutor")
private AsyncTaskExecutor asyncTaskExecutor;

public ReportXxxVO getXxx(XxxParam param) {
    long start = System.currentTimeMillis();
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dataPermission = reportDataPermissionService.getDataPermission(authPO);

    // 并发查询多维度数据
    CompletableFuture<List<TypeA>> futureA = CompletableFuture
        .supplyAsync(() -> reportXxxMapper.getTypeA(param, authPO, dataPermission), asyncTaskExecutor);
    CompletableFuture<List<TypeB>> futureB = CompletableFuture
        .supplyAsync(() -> reportXxxMapper.getTypeB(param, authPO, dataPermission), asyncTaskExecutor);
    CompletableFuture<TypeC> futureC = CompletableFuture
        .supplyAsync(() -> reportXxxMapper.getTotal(param, authPO, dataPermission), asyncTaskExecutor);

    // 等待所有完成
    CompletableFuture.allOf(futureA, futureB, futureC).join();

    log.info("getXxx耗时：{}", System.currentTimeMillis() - start);
    return new ReportXxxVO(futureC.join(), futureA.join(), futureB.join());
}
```

### Redisson 分布式锁（导入/并发写操作）

```java
@Resource
private RedissonClient redissonClient;

public void importExcel(MultipartFile file) {
    RLock lock = redissonClient.getLock("import:lock:" + TenantContextHolder.getTenantId());
    if (!lock.tryLock(5, 60, TimeUnit.SECONDS)) {
        throw new LeException("正在处理中，请稍后再试");
    }
    try {
        // 业务逻辑
        doImport(file);
    } finally {
        // 必须在 finally 中释放锁
        if (lock.isLocked() && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
```

### 异步执行（不等待结果）

```java
CompletableFuture.runAsync(() -> {
    // 异步操作（如发送通知、记录日志等）
}, asyncTaskExecutor);
```

---

## 13. 代码质量要点

### 空指针防护

```java
// ❌ 错误：selectOne 返回值未判空
XxxEntity entity = xxxMapper.selectOne(query);
entity.getName();  // 可能 NPE

// ✅ 正确：ObjectUtil 判空
XxxEntity entity = xxxMapper.selectOne(query);
if (ObjectUtil.isNull(entity)) {
    throw new LeException("数据不存在");
}

// ✅ 推荐：Optional 链式处理
XxxEntity entity = Optional.ofNullable(xxxMapper.selectById(id))
    .orElseThrow(() -> new LeException("数据不存在"));
```

### 返回值兜底

```java
// ❌ 错误：返回 null 导致前端 NPE
public List<XxxVO> listByParam(XxxDTO dto) {
    return xxxMapper.selectList(buildWrapper(dto));  // 可能返回 null
}

// ✅ 正确：空集合兜底
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
// ❌ 错误：空集合导致 SQL 异常 WHERE id IN ()
public List<XxxVO> selectByIds(List<Long> ids) {
    return xxxMapper.selectByIds(ids);
}

// ✅ 正确：集合判空提前返回
public List<XxxVO> selectByIds(List<Long> ids) {
    if (CollUtil.isEmpty(ids)) {
        return Collections.emptyList();
    }
    return BeanUtil.copyToList(xxxMapper.selectBatchIds(ids), XxxVO.class);
}
```

### 级联调用防护

```java
// ❌ 错误：级联调用易产生 NPE
String city = user.getAddress().getCity().getName();

// ✅ 正确：使用 Optional 链式处理
String city = Optional.ofNullable(user)
    .map(User::getAddress)
    .map(Address::getCity)
    .map(City::getName)
    .orElse("未知");
```

### Stream 操作规范

```java
// Java 21 使用 toList()
List<Long> ids = list.stream()
    .map(XxxVO::getId)
    .distinct()
    .toList();

// 转 Map（注意 key 重复问题）
Map<Long, XxxVO> map = list.stream()
    .collect(Collectors.toMap(XxxVO::getId, Function.identity()));

// 分组
Map<Integer, List<XxxVO>> grouped = list.stream()
    .collect(Collectors.groupingBy(XxxVO::getStatus));

// 过滤空元素
list.stream()
    .filter(Objects::nonNull)
    .collect(Collectors.toList());
```

---

## 14. 分组校验定义

```java
// InsertGroup.java
public interface InsertGroup {}

// UpdateGroup.java
public interface UpdateGroup {}
```

---

## 15. 常见错误速查

### 不要做

```java
// 错误 1: 在 Service 层注入 DAO
@Resource
private XxxDao xxxDao;  // leniu 没有 DAO 层！

// 错误 2: 使用错误的包名
package org.dromara.xxx;  // 必须是 net.xnzn.*

// 错误 3: 使用 javax.validation（JDK 21 应用 jakarta.validation）
import javax.validation.Valid;  // 错误

// 错误 4: 使用 AddGroup/EditGroup（leniu 使用 InsertGroup/UpdateGroup）
@Validated(AddGroup.class)  // 应该用 InsertGroup.class

// 错误 5: 使用错误的审计字段
private String createBy;  // 应该用 crby

// 错误 6: 使用错误的逻辑删除值
entity.setDelFlag(0);  // leniu 中 0=错误，1=删除，2=正常

// 错误 7: Mapper XML 放在 resources/mapper 目录
// src/main/resources/mapper/XxxMapper.xml  // 错误位置

// 错误 8: 使用错误的异常类
throw new ServiceException("错误");  // 应该用 LeException

// 错误 9: 多表操作不加事务
public void multiTableOp() { ... }  // 应该加 @Transactional(rollbackFor = Exception.class)

// 错误 10: 返回 null（应返回空集合）
return null;  // 应返回 Collections.emptyList()
```

### 正确做法

```java
// 正确 1: 直接在 Service 中注入 Mapper
@Resource
private XxxMapper xxxMapper;

// 正确 2: 使用正确的包名
package net.xnzn.core.xxx;

// 正确 3: 使用 Jakarta Validation
import jakarta.validation.Valid;

// 正确 4: 使用正确的分组
@Validated(InsertGroup.class)

// 正确 5: 使用 leniu 审计字段
private String crby;

// 正确 6: 使用正确的逻辑删除值
entity.setDelFlag(2);  // 2=正常

// 正确 7: Mapper XML 与 Java 同目录
// src/main/java/net/xnzn/core/xxx/mapper/XxxMapper.xml

// 正确 8: 使用 LeException
throw new LeException("错误");

// 正确 9: 多表操作加事务
@Transactional(rollbackFor = Exception.class)
public void multiTableOp() { ... }

// 正确 10: 返回空集合
return Collections.emptyList();
```

---

## 检查清单

生成代码前必须检查：

- [ ] **包名是否是 `net.xnzn.core.*`**？
- [ ] **Service 是否只实现接口，不继承任何基类**？
- [ ] **Service 是否直接注入 Mapper（无 DAO 层）**？
- [ ] **查询条件是否在 Service 层构建**？
- [ ] **Entity 是否包含审计字段**（crby/crtime/upby/uptime）？
- [ ] **delFlag 是否正确使用**（1=删除，2=正常）？
- [ ] **是否使用 `BeanUtil.copyProperties()` 转换对象**？
- [ ] **是否使用 Jakarta Validation**（jakarta.validation）？
- [ ] **是否使用正确的分组**（InsertGroup/UpdateGroup）？
- [ ] **Mapper XML 是否与 Java 文件同目录**？
- [ ] **异常是否使用 `LeException`**？
- [ ] **Controller 是否添加认证注解**（@RequiresAuthentication/@RequiresGuest）？
- [ ] **请求是否使用 `LeRequest<T>` 封装**？
- [ ] **响应是否使用 `Page<T>` 或 `LeResponse<T>`**？
- [ ] **多表操作是否添加 `@Transactional(rollbackFor = Exception.class)`**？
- [ ] **查询方法是否未添加不必要的事务**？
- [ ] **返回 List 是否有空集合兜底**？
- [ ] **集合参数是否有判空保护**？
- [ ] **selectOne/selectById 结果是否有判空处理**？
- [ ] **所有代码注释是否使用中文**？

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| Controller 示例 | `core-attendance/.../controller/AttendanceLeaveInfoController.java` |
| Service 示例 | `core-attendance/.../service/impl/AttendanceLeaveInfoServiceImpl.java` |
| Mapper 示例 | `core-attendance/.../mapper/AttendanceLeaveInfoMapper.java` |
| Entity 示例 | `core-attendance/.../model/AttendanceLeaveInfo.java` |

| 项目 | 路径 |
|------|------|
| **leniu-tengyun-core** | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core` |
| **leniu-yunshitang** | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang` |
