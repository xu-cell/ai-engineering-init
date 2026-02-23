---
name: leniu-backend-annotations
description: |
  leniu-yunshitang-core 项目后端注解使用指南。包含认证注解、参数校验注解、Swagger 文档注解、分组校验注解等核心注解的用法。

  触发场景：
  - 配置认证注解（@RequiresAuthentication, @RequiresGuest）
  - 配置参数校验（@Validated, @NotNull, @NotBlank）
  - 配置 Swagger 文档注解（@Api, @ApiOperation, @ApiModelProperty）
  - 配置分组校验（InsertGroup, UpdateGroup）

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-注解、leniu-@RequiresAuthentication、leniu-@RequiresGuest、leniu-@Validated、leniu-@NotNull、leniu-@Api、leniu-@ApiOperation、leniu-@ApiModelProperty、leniu-分组校验、leniu-InsertGroup、leniu-UpdateGroup、net.xnzn、leniu-yunshitang、leniu-yunshitang-core、云食堂注解
---

# leniu-yunshitang-core 后端注解指南

> 本文档专注于 leniu-tengyun-core 项目的 Java 后端注解使用规范。

## 注解快速特征对比

| 注解 | 作用范围 | 包路径 | 常用场景 |
|------|--------|--------|---------|
| `@RequiresAuthentication` | Controller 类/方法 | `net.xnzn.framework.secure.filter` | 需要登录认证 |
| `@RequiresGuest` | Controller 类/方法 | `net.xnzn.framework.secure.filter` | 允许游客访问 |
| `@Validated` | Controller 方法 | `jakarta.validation` | 参数校验 |
| `@Valid` | Controller 方法 | `jakarta.validation` | 参数校验 |
| `@Api` | Controller 类 | `io.swagger.annotations` | Swagger 文档 |
| `@ApiOperation` | Controller 方法 | `io.swagger.annotations` | Swagger 文档 |
| `@ApiModelProperty` | DTO/VO 字段 | `io.swagger.annotations` | Swagger 文档 |

---

## 1. 认证注解

### @RequiresAuthentication - 需要登录

```java
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;

@RestController
@RequestMapping("/api/xxx")
@Api(tags = "XXX管理")
@RequiresAuthentication  // 类级别：所有方法都需要登录
public class XxxController {

    @Resource
    private XxxService xxxService;

    @PostMapping("/add")
    @ApiOperation(value = "XXX-新增")
    public Long add(@Valid @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.add(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation(value = "XXX-删除")
    public void delete(@RequestBody LeRequest<Long> request) {
        xxxService.delete(request.getContent());
    }
}
```

### @RequiresGuest - 允许游客访问

```java
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;

@RestController
@RequestMapping("/api/public")
@Api(tags = "公开接口")
public class PublicController {

    @Resource
    private PublicService publicService;

    @RequiresGuest
    @GetMapping("/config")
    @ApiOperation(value = "获取配置")
    public LeResponse<ConfigVO> getConfig() {
        return LeResponse.succ(publicService.getConfig());
    }
}
```

### 混合使用

```java
@RestController
@RequestMapping("/api/xxx")
@Api(tags = "XXX管理")
@RequiresAuthentication  // 类级别默认需要登录
public class XxxController {

    // 继承类级别配置：需要登录
    @PostMapping("/add")
    @ApiOperation(value = "XXX-新增")
    public Long add(@Valid @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.add(request.getContent());
    }

    // 覆盖类级别配置：允许游客访问
    @RequiresGuest
    @GetMapping("/list")
    @ApiOperation(value = "XXX-列表")
    public List<XxxVO> list() {
        return xxxService.list();
    }
}
```

---

## 2. 参数校验注解

### @Validated 和 @Valid

```java
import jakarta.validation.Valid;
import jakarta.validation.Validated;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping("/api/xxx")
public class XxxController {

    // 使用 @Validated 进行分组校验
    @PostMapping("/add")
    @ApiOperation(value = "XXX-新增")
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.add(request.getContent());
    }

    // 使用 @Valid 进行简单校验
    @PostMapping("/update")
    @ApiOperation(value = "XXX-修改")
    public void update(@Valid @RequestBody LeRequest<XxxDTO> request) {
        xxxService.update(request.getContent());
    }
}
```

### DTO 校验注解

```java
import jakarta.validation.constraints.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import java.io.Serializable;

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
    @Min(value = 0, message = "状态不能小于0")
    @Max(value = 1, message = "状态不能大于1")
    private Integer status;

    @ApiModelProperty(value = "邮箱")
    @Email(message = "邮箱格式不正确")
    private String email;

    @ApiModelProperty(value = "手机号")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @ApiModelProperty(value = "身份证号")
    @Pattern(regexp = "^[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$", message = "身份证号格式不正确")
    private String idCard;

    @ApiModelProperty(value = "URL")
    @Pattern(regexp = "^https?://.+", message = "URL格式不正确")
    private String url;

    @ApiModelProperty(value = "开始时间", required = true)
    @NotNull(message = "开始时间不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private Date startTime;

    @ApiModelProperty(value = "结束时间", required = true)
    @NotNull(message = "结束时间不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private Date endTime;

    @ApiModelProperty(value = "备注")
    @Size(max = 500, message = "备注长度不能超过500个字符")
    private String remark;
}
```

### 分组校验

```java
// InsertGroup.java - 新增分组
public interface InsertGroup {}

// UpdateGroup.java - 修改分组
public interface UpdateGroup {}
```

---

## 3. Swagger 文档注解

### @Api - 类级别

```java
import io.swagger.annotations.Api;

@RestController
@RequestMapping("/api/xxx")
@Api(value = "XXX管理", tags = "XXX管理")
@RequiresAuthentication
public class XxxController {
    // ...
}
```

### @ApiOperation - 方法级别

```java
import io.swagger.annotations.ApiOperation;

@PostMapping("/add")
@ApiOperation(value = "XXX-新增")
public Long add(@Valid @RequestBody LeRequest<XxxDTO> request) {
    return xxxService.add(request.getContent());
}

@PostMapping("/update")
@ApiOperation(value = "XXX-修改")
public void update(@Valid @RequestBody LeRequest<XxxDTO> request) {
    xxxService.update(request.getContent());
}

@PostMapping("/delete")
@ApiOperation(value = "XXX-删除")
public void delete(@RequestBody LeRequest<Long> request) {
    xxxService.delete(request.getContent());
}

@GetMapping("/get/{id}")
@ApiOperation(value = "XXX-获取详情")
public XxxVO getById(@PathVariable Long id) {
    return xxxService.getById(id);
}

@PostMapping("/page")
@ApiOperation(value = "XXX-分页查询")
public Page<XxxVO> page(@Valid @RequestBody LeRequest<XxxDTO> request) {
    return xxxService.page(request.getContent());
}
```

### @ApiModelProperty - 字段级别

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@ApiModel("XXX VO")
public class XxxVO implements Serializable {

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

### @ApiParam - 参数级别

```java
import io.swagger.annotations.ApiParam;

@GetMapping("/get/{id}")
@ApiOperation(value = "XXX-获取详情")
public XxxVO getById(
    @ApiParam(value = "主键ID", required = true)
    @PathVariable Long id
) {
    return xxxService.getById(id);
}

@PostMapping("/search")
@ApiOperation(value = "XXX-搜索")
public List<XxxVO> search(
    @ApiParam(value = "搜索关键词")
    @RequestParam(required = false) String keyword
) {
    return xxxService.search(keyword);
}
```

---

## 4. MyBatis 注解

### @Mapper - Mapper 接口

```java
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {
    // ...
}
```

### @TableName - 实体类

```java
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("xxx_table")
public class XxxEntity {
    // ...
}
```

### @TableId - 主键

```java
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.IdType;

@TableId(value = "id", type = IdType.AUTO)
private Long id;
```

### @TableField - 字段映射

```java
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.FieldFill;

@TableField("name")
private String name;

@TableField(value = "crby", fill = FieldFill.INSERT)
private String crby;

@TableField(value = "crtime", fill = FieldFill.INSERT)
private Date crtime;

@TableField(value = "upby", fill = FieldFill.INSERT_UPDATE)
private String upby;

@TableField(value = "uptime", fill = FieldFill.INSERT_UPDATE)
private Date uptime;
```

---

## 5. JSON 序列化注解

### @JsonFormat - 日期格式化

```java
import com.fasterxml.jackson.annotation.JsonFormat;

@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
private Date crtime;

@JsonFormat(pattern = "yyyy-MM-dd")
private Date date;
```

---

## 6. Lombok 注解

### @Data - 实体类

```java
import lombok.Data;

@Data
@TableName("xxx_table")
public class XxxEntity {
    private Long id;
    private String name;
}
```

### @Accessors(chain = true) - 链式调用

```java
import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class XxxEntity {
    private Long id;
    private String name;
}

// 使用
XxxEntity entity = new XxxEntity()
    .setId(1L)
    .setName("test");
```

---

## 7. 完整 Controller 示例

```java
package net.xnzn.core.xxx.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pig4cloud.pigx.common.core.util.LeRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.xxx.dto.XxxDTO;
import net.xnzn.core.xxx.service.XxxService;
import net.xnzn.core.xxx.vo.XxxVO;
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;

import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

/**
 * XXX 管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/xxx")
@Api(value = "XXX管理", tags = "XXX管理")
@RequiresAuthentication
public class XxxController {

    @Resource
    private XxxService xxxService;

    /**
     * 新增
     */
    @PostMapping("/add")
    @ApiOperation(value = "XXX-新增")
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        log.info("新增XXX，参数: {}", request.getContent());
        return xxxService.add(request.getContent());
    }

    /**
     * 修改
     */
    @PostMapping("/update")
    @ApiOperation(value = "XXX-修改")
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        log.info("修改XXX，参数: {}", request.getContent());
        xxxService.update(request.getContent());
    }

    /**
     * 删除
     */
    @PostMapping("/delete")
    @ApiOperation(value = "XXX-删除")
    public void delete(@RequestBody LeRequest<Long> request) {
        log.info("删除XXX，参数: {}", request.getContent());
        xxxService.delete(request.getContent());
    }

    /**
     * 获取详情
     */
    @GetMapping("/get/{id}")
    @ApiOperation(value = "XXX-获取详情")
    @RequiresGuest
    public XxxVO getById(
        @ApiParam(value = "主键ID", required = true)
        @PathVariable Long id
    ) {
        return xxxService.getById(id);
    }

    /**
     * 分页查询
     */
    @PostMapping("/page")
    @ApiOperation(value = "XXX-分页查询")
    public Page<XxxVO> page(@Valid @RequestBody LeRequest<XxxDTO> request) {
        log.info("分页查询XXX，参数: {}", request.getContent());
        return xxxService.page(request.getContent());
    }

    /**
     * 查询列表
     */
    @PostMapping("/list")
    @ApiOperation(value = "XXX-查询列表")
    @RequiresGuest
    public List<XxxVO> list(@Valid @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.list(request.getContent());
    }
}
```

---

## 8. 常见错误对比

### ❌ 错误写法

```java
// 错误 1: 使用 RuoYi 的认证注解
@SaCheckPermission("system:user:list")  // ❌ leniu 使用 @RequiresAuthentication

// 错误 2: 使用 javax.validation（JDK 21 应用 jakarta.validation）
import javax.validation.Valid;  // ❌ 错误
import javax.validation.constraints.NotNull;  // ❌ 错误

// 错误 3: 使用 RuoYi 的分组
@Validated(AddGroup.class)  // ❌ 应该用 InsertGroup.class

// 错误 4: Swagger 注解包错误
import io.swagger.v3.oas.annotations.*;  // ❌ OpenAPI 3.0
// 应该用
import io.swagger.annotations.*;  // ✅ Swagger 2.0

// 错误 5: 缺少 Swagger 文档注解
@RestController
public class XxxController {  // ❌ 缺少 @Api
    @PostMapping("/add")
    public Long add(@RequestBody LeRequest<XxxDTO> request) {  // ❌ 缺少 @ApiOperation
        return xxxService.add(request.getContent());
    }
}

// 错误 6: 审计字段注解错误
@TableField("create_by")  // ❌ 应该用 crby
@TableField("create_time")  // ❌ 应该用 crtime
```

### ✅ 正确写法

```java
// 正确 1: 使用 leniu 的认证注解
@RequiresAuthentication  // ✅
@RequiresGuest  // ✅

// 正确 2: 使用 Jakarta Validation
import jakarta.validation.Valid;  // ✅
import jakarta.validation.constraints.NotNull;  // ✅

// 正确 3: 使用 leniu 的分组
@Validated(InsertGroup.class)  // ✅

// 正确 4: Swagger 注解包正确
import io.swagger.annotations.Api;  // ✅
import io.swagger.annotations.ApiOperation;  // ✅

// 正确 5: Swagger 文档注解完整
@RestController
@Api(value = "XXX管理", tags = "XXX管理")  // ✅
public class XxxController {
    @PostMapping("/add")
    @ApiOperation(value = "XXX-新增")  // ✅
    public Long add(@RequestBody LeRequest<XxxDTO> request) {
        return xxxService.add(request.getContent());
    }
}

// 正确 6: 审计字段注解正确
@TableField(value = "crby", fill = FieldFill.INSERT)  // ✅
@TableField(value = "crtime", fill = FieldFill.INSERT)  // ✅
```

---

## 9. 检查清单

使用注解前必须检查：

- [ ] **是否使用 `@RequiresAuthentication` 或 `@RequiresGuest`**？
- [ ] **是否使用 Jakarta Validation**（jakarta.validation）？
- [ ] **分组校验是否正确**（InsertGroup/UpdateGroup）？
- [ ] **Controller 是否添加 `@Api` 注解**？
- [ ] **方法是否添加 `@ApiOperation` 注解**？
- [ ] **DTO/VO 是否添加 `@ApiModelProperty` 注解**？
- [ ] **Swagger 注解包是否正确**（io.swagger.annotations）？
- [ ] **Entity 是否正确配置 `@TableName`**？
- [ ] **主键是否正确配置 `@TableId`**？
- [ ] **审计字段是否配置 `FieldFill`**？

---

## 10. 快速参考

### 注解速查表

```
@RequiresAuthentication → 需要登录认证
@RequiresGuest       → 允许游客访问
@Validated           → 参数校验（支持分组）
@Valid              → 参数校验（不支持分组）
@Api                → Swagger 文档（类级别）
@ApiOperation        → Swagger 文档（方法级别）
@ApiModelProperty     → Swagger 文档（字段级别）
@ApiParam           → Swagger 文档（参数级别）
```

### 注解组合速查

```
Controller:     @Api + @RequiresAuthentication
Method:         @ApiOperation + @Validated(InsertGroup.class)
DTO Field:      @ApiModelProperty + @NotNull/NotBlank
Entity Field:    @TableField + @ApiModelProperty
```

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| Controller 示例 | `core-attendance/.../controller/AttendanceLeaveInfoController.java` |
| DTO 示例 | `core-attendance/.../dto/AddOrUpdateAttendanceLeaveInfoDTO.java` |
| Entity 示例 | `core-bus/.../model/BusLine.java` |

**项目路径**：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core`
