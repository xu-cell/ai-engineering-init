---
name: leniu-backend-annotations
description: |
  leniu-yunshitang-core 项目后端注解速查指南。包含认证、校验、Swagger、MyBatis-Plus、审计字段等注解的正确用法。

  触发场景：
  - 配置 leniu 认证注解（@RequiresAuthentication, @RequiresGuest）
  - 配置参数校验和分组校验（InsertGroup, UpdateGroup）
  - 配置 Swagger 文档注解（@Api, @ApiOperation）
  - 配置 Entity 审计字段注解
  - 排查注解使用错误（javax vs jakarta、AddGroup vs InsertGroup）

  适用项目：leniu-tengyun-core（云食堂项目）

  触发词：@RequiresAuthentication、@RequiresGuest、@Validated、@NotNull、@Api、@ApiOperation、InsertGroup、UpdateGroup、注解用法、审计字段注解
---

# leniu 后端注解速查

## 注解总览

| 注解 | 作用层 | 包路径 | 场景 |
|------|--------|--------|------|
| `@RequiresAuthentication` | Controller 类/方法 | `net.xnzn.framework.secure.filter.annotation` | 需要登录 |
| `@RequiresGuest` | Controller 类/方法 | `net.xnzn.framework.secure.filter.annotation` | 允许游客 |
| `@Validated` | Controller 方法参数 | `org.springframework.validation.annotation` | 分组校验 |
| `@Valid` | Controller 方法参数 | `jakarta.validation` | 简单校验 |
| `@Api` | Controller 类 | `io.swagger.annotations` | Swagger 类文档 |
| `@ApiOperation` | Controller 方法 | `io.swagger.annotations` | Swagger 方法文档 |
| `@ApiModelProperty` | DTO/VO/Entity 字段 | `io.swagger.annotations` | Swagger 字段文档 |
| `@TableName` | Entity 类 | `com.baomidou.mybatisplus.annotation` | 表名映射 |
| `@TableId` | Entity 主键字段 | `com.baomidou.mybatisplus.annotation` | 主键策略 |
| `@TableField` | Entity 字段 | `com.baomidou.mybatisplus.annotation` | 字段映射/自动填充 |

---

## 1. 认证注解

```java
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;

@RestController
@RequiresAuthentication                    // 类级别：所有方法默认需登录
@RequestMapping("/api/v2/web/xxx")
@Api(tags = "XXX管理")
public class XxxController {

    @PostMapping("/add")                   // 继承类级别：需要登录
    @ApiOperation(value = "XXX-新增")
    public void add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        xxxService.add(request.getContent());
    }

    @RequiresGuest                         // 方法级别覆盖：允许游客
    @GetMapping("/list")
    @ApiOperation(value = "XXX-公开列表")
    public List<XxxVO> list() {
        return xxxService.list();
    }
}
```

---

## 2. 参数校验注解

### 分组校验（新增/修改场景区分）

```java
// 分组接口
public interface InsertGroup {}
public interface UpdateGroup {}

// Controller 中使用分组
@PostMapping("/add")
public void add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {}

@PostMapping("/update")
public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request) {}

// 不需要分组时用 @Valid 或 @Validated（不带参数）
@PostMapping("/query")
public Page<XxxVO> query(@Valid @RequestBody LeRequest<XxxQueryParam> request) {}
```

### DTO 校验字段

```java
import jakarta.validation.constraints.*;   // JDK 21 必须 jakarta

@Data
@ApiModel("XXX DTO")
public class XxxDTO implements Serializable {

    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    @ApiModelProperty("主键ID")
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称长度不能超过100个字符")
    @ApiModelProperty(value = "名称", required = true)
    private String name;

    @Min(value = 0, message = "状态不能小于0")
    @Max(value = 1, message = "状态不能大于1")
    @ApiModelProperty("状态")
    private Integer status;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    @ApiModelProperty("手机号")
    private String phone;

    @Email(message = "邮箱格式不正确")
    @ApiModelProperty("邮箱")
    private String email;

    @NotNull(message = "开始时间不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @ApiModelProperty(value = "开始时间", required = true)
    private Date startTime;

    @Size(max = 500, message = "备注长度不能超过500个字符")
    @ApiModelProperty("备注")
    private String remark;
}
```

---

## 3. Swagger 文档注解

```java
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.annotations.ApiParam;

// 类级别
@Api(value = "XXX管理", tags = "XXX管理")
public class XxxController {}

// 方法级别
@ApiOperation(value = "XXX-分页查询")
@PostMapping("/page")
public Page<XxxVO> page(@Valid @RequestBody LeRequest<XxxDTO> request) {}

// 路径参数
@GetMapping("/get/{id}")
public XxxVO getById(@ApiParam(value = "主键ID", required = true) @PathVariable Long id) {}

// 查询参数
@PostMapping("/search")
public List<XxxVO> search(@ApiParam(value = "搜索关键词") @RequestParam(required = false) String keyword) {}
```

### VO 字段文档

```java
@Data
@ApiModel("XXX VO")
public class XxxVO implements Serializable {

    @ApiModelProperty("主键ID")
    private Long id;

    @ApiModelProperty("名称")
    private String name;

    @ApiModelProperty("创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date crtime;
}
```

---

## 4. Entity 注解（MyBatis-Plus + 审计字段）

```java
import com.baomidou.mybatisplus.annotation.*;

@Data
@TableName("xxx_table")
public class XxxEntity implements Serializable {

    @ApiModelProperty("主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty("名称")
    @TableField("name")
    private String name;

    // ===== 审计字段（leniu 标准） =====
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

    @ApiModelProperty("删除标识(1-删除,2-正常)")
    private Integer delFlag;
}
```

### Mapper 接口

```java
import org.apache.ibatis.annotations.Mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {}
```

---

## 5. 注解组合速查

| 层级 | 标准注解组合 |
|------|-------------|
| Controller 类 | `@Api` + `@RestController` + `@RequiresAuthentication` + `@RequestMapping` |
| 写操作方法 | `@ApiOperation` + `@PostMapping` + `@Validated(InsertGroup/UpdateGroup.class)` |
| 查询方法 | `@ApiOperation` + `@PostMapping` + `@Valid` 或 `@Validated` |
| DTO 字段 | `@ApiModelProperty` + `@NotNull/@NotBlank` + `(groups = {InsertGroup.class})` |
| Entity 类 | `@Data` + `@TableName` |
| Entity 主键 | `@ApiModelProperty` + `@TableId(type = IdType.AUTO)` |
| 审计字段 | `@ApiModelProperty` + `@TableField(fill = FieldFill.INSERT/INSERT_UPDATE)` |

---

## 6. 错误对比

| 错误写法 | 正确写法 | 说明 |
|---------|---------|------|
| `@SaCheckPermission("xxx")` | `@RequiresAuthentication` | leniu 不用 Sa-Token 细粒度权限 |
| `import javax.validation.*` | `import jakarta.validation.*` | JDK 21 必须 jakarta |
| `@Validated(AddGroup.class)` | `@Validated(InsertGroup.class)` | leniu 分组名为 InsertGroup |
| `import io.swagger.v3.oas.*` | `import io.swagger.annotations.*` | leniu 用 Swagger 2.0 |
| `@TableField("create_by")` | `@TableField(value = "crby", fill = FieldFill.INSERT)` | leniu 审计字段 |
| `@TableField("create_time")` | `@TableField(value = "crtime", fill = FieldFill.INSERT)` | leniu 审计字段 |
| `@TableId(type = IdType.ASSIGN_ID)` | `@TableId(type = IdType.AUTO)` | leniu 用自增主键 |
| Controller 缺 `@Api` | 必须加 `@Api(tags = "模块名")` | Swagger 文档要求 |
| 方法缺 `@ApiOperation` | 必须加 `@ApiOperation(value = "描述")` | Swagger 文档要求 |

---

## 检查清单

- [ ] 认证注解：`@RequiresAuthentication` 或 `@RequiresGuest`
- [ ] 校验包：`jakarta.validation`（非 `javax.validation`）
- [ ] 分组名：`InsertGroup` / `UpdateGroup`（非 `AddGroup` / `EditGroup`）
- [ ] Swagger 包：`io.swagger.annotations`（非 `io.swagger.v3.oas`）
- [ ] Controller 有 `@Api`，方法有 `@ApiOperation`
- [ ] DTO/VO 字段有 `@ApiModelProperty`
- [ ] Entity 主键：`@TableId(type = IdType.AUTO)`
- [ ] 审计字段：`crby/crtime/upby/uptime` + 正确的 `FieldFill`

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| Controller 示例 | `sys-canteen/.../order/web/controller/OrderInfoWebController.java` |
| DTO 示例 | `sys-kitchen/.../attendance/.../dto/` |
| Entity 示例 | `sys-canteen/.../order/common/model/OrderInfo.java` |
