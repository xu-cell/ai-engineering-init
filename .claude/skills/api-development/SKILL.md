---
name: api-development
description: |
  后端 API 接口设计规范。基于三层架构的 RESTful API 开发指南。

  触发场景：
  - 设计 RESTful API 接口
  - 编写 Controller 层代码
  - 配置接口权限、日志、防重复提交注解
  - 接口返回值类型选择
  - 数据验证和参数校验

  触发词：API、接口、RESTful、Controller、GetMapping、PostMapping、权限注解、日志注解、分页查询、接口规范

  注意：
  - 本项目是三层架构：Controller → Service → Mapper
  - 参考 java-controller 技能获取更详细的 Controller 层规范
---

# API 接口设计规范

## 核心规范

### 1. 接口定义原则

| 原则 | 说明 |
|------|------|
| **统一入口** | 所有接口使用 POST 或 RESTful 风格 |
| **认证保护** | 所有业务接口必须添加认证注解 |
| **参数校验** | 使用分组校验区分新增/修改场景 |
| **统一响应** | 使用统一的响应格式包装返回数据 |

### 2. HTTP 方法规范

| 操作 | HTTP 方法 | 路径 | 说明 |
|------|---------|------|------|
| **列表查询** | POST/GET | `/query` 或 `/list` | 分页查询列表 |
| **获取详情** | POST/GET | `/{id}` 或 `/detail` | 根据 ID 查询 |
| **新增** | POST | `/add` | 创建新数据 |
| **修改** | POST/PUT | `/update` | 更新数据 |
| **删除** | POST/DELETE | `/delete` 或 `/batch/delete` | 删除数据 |
| **导出** | POST | `/export` | 导出数据到 Excel |
| **导入** | POST | `/import-excel` | 从 Excel 导入数据 |

---

## Controller 类模板

### 标准模板

```java
@Slf4j
@RestController
@RequiresAuthentication  // 认证注解
@RequestMapping("/module/feature")
@Api(value = "模块/功能", tags = "模块/功能")
public class XxxController {

    @Resource
    @Lazy
    private XxxService xxxService;

    @PostMapping("/add")
    @ApiOperation(value = "功能描述-新增")
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        return xxxService.add(request.getContent());
    }

    @PostMapping("/update")
    @ApiOperation(value = "功能描述-修改")
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        xxxService.update(request.getContent());
    }

    @PostMapping("/query")
    @ApiOperation(value = "功能描述-分页查询")
    public Page<XxxVO> query(@Validated @RequestBody LeRequest<XxxQueryParam> request) {
        return xxxService.pageList(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation(value = "功能描述-删除")
    public void delete(@RequestBody LeRequest<Long> request) {
        xxxService.delete(request.getContent());
    }
}
```

---

## 参数封装规范

### 1. 请求参数封装

使用统一的请求包装类 `LeRequest<T>`:

```java
@PostMapping("/query")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    XxxQueryParam param = request.getContent();  // 获取实际参数
    return xxxService.pageList(param);
}
```

### 2. 分页参数

```java
@Data
public class XxxPageParam implements Serializable {

    @ApiModelProperty(value = "分页参数", required = true)
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;

    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("状态")
    private Integer status;
}
```

### 3. 分组校验

```java
// 定义校验分组
public interface InsertGroup {}
public interface UpdateGroup {}

// DTO 中使用分组
@Data
public class XxxDTO {

    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private String name;
}

// Controller 中应用分组
@PostMapping("/add")
public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request)

@PostMapping("/update")
public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request)
```

---

## 响应格式规范

### 1. 分页响应

```java
// 使用 MyBatis-Plus 的 Page 对象
@PostMapping("/query")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    return xxxService.pageList(request.getContent());
}

// 或使用自定义分页对象
public class PageVO<T> {
    private List<T> records;     // 数据列表
    private Long total;          // 总条数
    private Integer pageNum;     // 当前页
    private Integer pageSize;    // 每页条数
}
```

### 2. 单条数据响应

```java
// 直接返回 VO 对象
@GetMapping("/{id}")
public XxxVO getById(@PathVariable Long id) {
    return xxxService.getById(id);
}

// 或使用统一响应对象
@GetMapping("/{id}")
public R<XxxVO> getById(@PathVariable Long id) {
    return R.ok(xxxService.getById(id));
}
```

### 3. 无返回值操作

```java
// 新增/修改/删除可以直接返回 void
@PostMapping("/add")
public void add(@RequestBody LeRequest<XxxDTO> request) {
    xxxService.add(request.getContent());
}

// 或返回 ID
@PostMapping("/add")
public Long add(@RequestBody LeRequest<XxxDTO> request) {
    return xxxService.add(request.getContent());
}
```

---

## 参数校验规范

### 1. Jakarta Validation 注解

**重要**: 项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

@Data
public class XxxDTO {

    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @Min(value = 0, message = "数量不能小于0")
    @Max(value = 9999, message = "数量不能大于9999")
    private Integer count;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Email(message = "邮箱格式不正确")
    private String email;
}
```

### 2. 校验注解速查表

| 注解 | 用途 | 示例 |
|------|------|------|
| `@NotNull` | 不能为 null | `@NotNull(message = "ID不能为空")` |
| `@NotBlank` | 字符串不能为空或空白 | `@NotBlank(message = "名称不能为空")` |
| `@NotEmpty` | 集合/数组不能为空 | `@NotEmpty(message = "ID列表不能为空")` |
| `@Size` | 集合/字符串长度 | `@Size(min = 1, max = 100)` |
| `@Min` | 最小值 | `@Min(value = 0, message = "不能小于0")` |
| `@Max` | 最大值 | `@Max(value = 100, message = "不能大于100")` |
| `@Pattern` | 正则表达式 | `@Pattern(regexp = "^[0-9]+$")` |
| `@Email` | 邮箱格式 | `@Email(message = "邮箱格式错误")` |

---

## API 文档注解

### Swagger 注解使用

```java
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

// Controller 类级别
@Api(value = "模块/功能", tags = "模块/功能")
@RestController
public class XxxController {

    // 方法级别
    @ApiOperation(value = "功能描述-新增")
    @PostMapping("/add")
    public Long add(@RequestBody LeRequest<XxxDTO> request) {
        // ...
    }
}

// DTO/VO 类级别
@Data
@ApiModel("功能描述DTO")
public class XxxDTO {

    @ApiModelProperty(value = "主键ID", required = true)
    private Long id;

    @ApiModelProperty("名称")
    private String name;
}
```

---

## 常见场景示例

### 1. 带 Redisson 分布式锁的导入

```java
@PostMapping("/import-excel")
@ApiOperation(value = "Excel导入")
public void importExcel(@RequestParam(value = "file") MultipartFile file) {
    if (Objects.isNull(file) || file.isEmpty()) {
        throw new LeException("文件不能为空");
    }
    RLock lock = redissonClient.getLock("import:lock:" + TenantContextHolder.getTenantId());
    if (!lock.tryLock(5, 60, TimeUnit.SECONDS)) {
        throw new LeException("正在处理中，请稍后再试");
    }
    try {
        xxxService.importExcel(file);
    } finally {
        if (lock.isLocked() && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
```

### 2. 批量删除

```java
@RequestMapping(value = "/batch/delete", method = {RequestMethod.POST, RequestMethod.PUT})
@ApiOperation(value = "批量删除")
public void batchDelete(@RequestBody LeRequest<List<Long>> request) {
    if (CollUtil.isEmpty(request.getContent())) {
        throw new LeException("ID列表不能为空");
    }
    xxxService.batchDelete(request.getContent());
}
```

### 3. 带合计行的分页查询

```java
@PostMapping("/query")
@ApiOperation(value = "分页查询（带合计）")
public ReportBaseTotalVO<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

    // 查询合计行
    XxxVO totalLine = xxxService.getSummaryTotal(request.getContent());
    result.setTotalLine(totalLine);

    // 分页查询
    Page<XxxVO> page = xxxService.pageList(request.getContent());
    result.setResultPage(PageVO.of(page));

    return result;
}
```

---

## 检查清单

生成 API 代码前必须检查：

- [ ] **认证注解是否添加**？(`@RequiresAuthentication` 或类似)
- [ ] **API 文档注解是否添加**？(`@ApiOperation`)
- [ ] **参数校验是否正确**？(`@Validated` + 分组)
- [ ] **返回值类型是否正确**？(分页用 `Page<VO>`，单条用 VO 或 `R<VO>`)
- [ ] **HTTP 方法是否正确**？(查询 POST/GET，新增 POST，修改 POST/PUT)
- [ ] **路径命名是否规范**？(`/add`, `/update`, `/query`, `/delete`)
- [ ] **是否使用了 `LeRequest<T>` 封装请求**？
- [ ] **是否使用中文注释和错误提示**？
- [ ] **敏感操作是否加了分布式锁**？

---

## 错误对比

### ❌ 不要做

```java
// 错误 1: 缺少认证注解
@RestController
public class XxxController { }

// 错误 2: 不使用参数封装
@PostMapping("/add")
public Long add(@RequestBody XxxDTO dto) { }  // 应该用 LeRequest<XxxDTO>

// 错误 3: 不使用分组校验
@PostMapping("/add")
public Long add(@Valid @RequestBody LeRequest<XxxDTO> request) { }  // 应该用 @Validated(InsertGroup.class)

// 错误 4: 使用 javax.validation（JDK 21 应用 jakarta.validation）
import javax.validation.constraints.NotNull;  // ❌ 错误
```

### ✅ 正确做法

```java
// 正确 1: 添加认证注解
@RestController
@RequiresAuthentication
public class XxxController { }

// 正确 2: 使用参数封装
@PostMapping("/add")
public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
    return xxxService.add(request.getContent());
}

// 正确 3: 使用分组校验
@Validated(InsertGroup.class)

// 正确 4: 使用 Jakarta Validation
import jakarta.validation.constraints.NotNull;  // ✅ 正确
```

---

## 相关技能

| 需要了解 | 激活 Skill |
|---------|-----------|
| Service 层规范 | `java-service` |
| Controller 详细规范 | `java-controller` |
| 异常处理 | `java-exception` / `error-handler` |
| 参数校验详细 | `java-entity` |
| 数据库设计 | `java-database` / `database-ops` |

---

## 多项目深度对比

### 项目架构差异详解

| 特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|-----|----------------|-------------------|
| **JDK 版本** | 17 | 21 |
| **包名前缀** | `org.dromara.*` | `net.xnzn.core.*` |
| **请求封装** | 直接使用 BO | `LeRequest<T>` 包装 |
| **响应封装** | `R<T>`, `TableDataInfo<T>` | `Page<T>`, `void` |
| **分组校验** | `AddGroup`, `EditGroup` | `InsertGroup`, `UpdateGroup` |
| **认证注解** | `@SaCheckPermission` | `@RequiresAuthentication` |
| **异常类** | `ServiceException` | `LeException` |
| **国际化** | `MessageUtils.message()` | `I18n.getMessage()` |

### leniu-tengyun-core Controller 完整示例

```java
@RequiresAuthentication
@RestController
@RequestMapping("/back/attendance/leave-info")
@Api(value = "考勤/请假信息", tags = "考勤/请假信息")
public class LeaveInfoController {

    @Resource
    @Lazy
    private LeaveInfoService leaveInfoService;

    @PostMapping("/add")
    @ApiOperation(value = "请假信息-新增")
    public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<LeaveInfoDTO> request) {
        return leaveInfoService.add(request.getContent());
    }

    @PostMapping("/update")
    @ApiOperation(value = "请假信息-修改")
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<LeaveInfoDTO> request) {
        leaveInfoService.update(request.getContent());
    }

    @PostMapping("/query")
    @ApiOperation(value = "请假信息-分页查询")
    public Page<LeaveInfoVO> query(@Validated @RequestBody LeRequest<LeaveInfoQueryParam> request) {
        return leaveInfoService.pageList(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation(value = "请假信息-删除")
    public void delete(@RequestBody LeRequest<Long> request) {
        leaveInfoService.delete(request.getContent());
    }
}
```

### Redisson 分布式锁完整示例

```java
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import java.util.concurrent.TimeUnit;

@Resource
private RedissonClient redissonClient;

@PostMapping("/import-excel")
@ApiOperation(value = "Excel导入")
public void importExcel(@RequestParam(value = "file") MultipartFile file) {
    if (Objects.isNull(file) || file.isEmpty()) {
        throw new LeException("文件不能为空");
    }

    // 获取分布式锁
    RLock lock = redissonClient.getLock("import:lock:" + TenantContextHolder.getTenantId());

    // 尝试获取锁：等待5秒，锁定60秒后自动释放
    if (!lock.tryLock(5, 60, TimeUnit.SECONDS)) {
        throw new LeException("正在处理中，请稍后再试");
    }

    try {
        xxxService.importExcel(file);
    } finally {
        // 释放锁前检查当前线程是否持有锁
        if (lock.isLocked() && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
```

### 批量操作示例

```java
@RequestMapping(value = "/batch/delete", method = {RequestMethod.POST, RequestMethod.PUT})
@ApiOperation(value = "批量删除")
public void batchDelete(@RequestBody LeRequest<List<Long>> request) {
    // 使用 Hutool 的 CollUtil 进行判空
    if (CollUtil.isEmpty(request.getContent())) {
        throw new LeException("ID列表不能为空");
    }
    xxxService.batchDelete(request.getContent());
}

@PostMapping("/batch/update-status")
@ApiOperation(value = "批量更新状态")
public void batchUpdateStatus(@RequestBody LeRequest<BatchUpdateDTO> request) {
    BatchUpdateDTO dto = request.getContent();
    if (CollUtil.isEmpty(dto.getIds())) {
        throw new LeException("ID列表不能为空");
    }
    xxxService.batchUpdateStatus(dto.getIds(), dto.getStatus());
}
```

### 带合计行的分页查询

```java
@PostMapping("/query")
@ApiOperation(value = "分页查询（带合计）")
public ReportBaseTotalVO<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

    // 1. 查询合计行
    XxxVO totalLine = xxxService.getSummaryTotal(request.getContent());
    result.setTotalLine(totalLine);

    // 2. 分页查询
    Page<XxxVO> page = xxxService.pageList(request.getContent());
    result.setResultPage(PageVO.of(page));

    return result;
}
```
