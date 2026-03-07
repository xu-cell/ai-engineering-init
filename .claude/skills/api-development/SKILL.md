---
name: api-development
description: |
  后端 API 接口设计规范。基于 Spring Boot 的 RESTful API 开发指南。

  触发场景：
  - 设计 RESTful API 接口
  - 编写 Controller 层代码
  - 配置接口权限、日志注解
  - 接口返回值类型选择
  - 数据验证和参数校验

  触发词：API、接口、RESTful、Controller、GetMapping、PostMapping、权限注解、日志注解、分页查询、接口规范

  注意：
  - 参考项目实际架构层次选择合适的分层模式
---

# API 接口设计规范

## 核心规范

| 原则 | 说明 |
|------|------|
| RESTful 风格 | 使用标准 HTTP 方法表达语义 |
| 认证保护 | 所有业务接口必须添加认证注解 |
| 参数校验 | 使用分组校验区分新增/修改场景 |
| 统一响应 | 使用统一的响应格式包装返回数据 |

### HTTP 方法规范

| 操作 | 方法 | 路径示例 |
|------|------|---------|
| 列表查询 | GET | `/list` 或 `/page` |
| 获取详情 | GET | `/{id}` |
| 新增 | POST | `/` 或 `/add` |
| 修改 | PUT | `/` 或 `/update` |
| 删除 | DELETE | `/{ids}` |
| 导出 | POST | `/export` |
| 导入 | POST | `/import` |

---

## Controller 标准模板

```java
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/[模块]/[功能]")
public class XxxController {

    private final XxxService xxxService;

    /**
     * 分页查询
     */
    @GetMapping("/page")
    public Result<PageResult<XxxVO>> page(XxxQueryDTO query) {
        return Result.ok(xxxService.pageList(query));
    }

    /**
     * 获取详情
     */
    @GetMapping("/{id}")
    public Result<XxxVO> getById(@PathVariable Long id) {
        return Result.ok(xxxService.getById(id));
    }

    /**
     * 新增
     */
    @PostMapping
    public Result<Long> add(@Validated(InsertGroup.class) @RequestBody XxxDTO dto) {
        return Result.ok(xxxService.add(dto));
    }

    /**
     * 修改
     */
    @PutMapping
    public Result<Void> update(@Validated(UpdateGroup.class) @RequestBody XxxDTO dto) {
        xxxService.update(dto);
        return Result.ok();
    }

    /**
     * 删除
     */
    @DeleteMapping("/{ids}")
    public Result<Void> delete(@PathVariable List<Long> ids) {
        xxxService.deleteByIds(ids);
        return Result.ok();
    }
}
```

---

## 统一响应封装

### Result 包装类（通用模式）

```java
@Data
public class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> ok() {
        return ok(null);
    }

    public static <T> Result<T> ok(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }

    public static <T> Result<T> fail(String message) {
        Result<T> result = new Result<>();
        result.setCode(500);
        result.setMessage(message);
        return result;
    }
}
```

### 分页响应

```java
@Data
public class PageResult<T> {
    private List<T> records;
    private long total;
    private long current;
    private long size;
}
```

---

## 参数校验

### 分组校验

```java
// DTO 中使用分组
@Data
public class XxxDTO {
    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @Min(value = 0, message = "排序不能为负数")
    private Integer sort;
}

// Controller 中应用
@PostMapping
public Result<Long> add(@Validated(InsertGroup.class) @RequestBody XxxDTO dto) { ... }

@PutMapping
public Result<Void> update(@Validated(UpdateGroup.class) @RequestBody XxxDTO dto) { ... }
```

> Jakarta Validation: JDK 17+ 必须 `import jakarta.validation.constraints.*`

### 查询参数

```java
@Data
public class XxxQueryDTO {
    private String keyword;
    private Integer status;

    @Min(value = 1)
    private Integer pageNum = 1;

    @Min(value = 1) @Max(value = 100)
    private Integer pageSize = 10;
}
```

---

## 常见场景

### 带分布式锁的导入

```java
@PostMapping("/import")
public Result<Void> importExcel(@RequestPart("file") MultipartFile file) {
    if (file == null || file.isEmpty()) {
        throw new [你的异常类]("文件不能为空");
    }
    RLock lock = redissonClient.getLock("import:lock:" + getCurrentTenantId());
    try {
        if (!lock.tryLock(5, 60, TimeUnit.SECONDS)) {
            throw new [你的异常类]("正在处理中，请稍后再试");
        }
        try {
            xxxService.importExcel(file);
        } finally {
            if (lock.isLocked() && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new [你的异常类]("导入被中断");
    }
    return Result.ok();
}
```

### 批量删除

```java
@DeleteMapping("/{ids}")
public Result<Void> delete(@PathVariable List<Long> ids) {
    if (ids == null || ids.isEmpty()) {
        throw new [你的异常类]("ID列表不能为空");
    }
    xxxService.deleteByIds(ids);
    return Result.ok();
}
```

### 文件上传

```java
@PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public Result<UploadResult> upload(@RequestPart("file") MultipartFile file) {
    return Result.ok(ossService.upload(file));
}
```

---

## API 文档注解

### Swagger / SpringDoc 注解

```java
// SpringDoc (OpenAPI 3.0, 推荐)
@Tag(name = "用户管理")                              // Controller 类
@Operation(summary = "新增用户")                      // 方法
@Schema(description = "用户DTO")                      // DTO/VO 类
@Schema(description = "主键ID", requiredMode = REQUIRED) // 字段

// Swagger 2 (旧项目)
@Api(value = "用户管理", tags = "用户管理")
@ApiOperation(value = "新增用户")
@ApiModel("用户DTO")
@ApiModelProperty(value = "主键ID", required = true)
```

---

## 全局异常处理

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler([你的异常类].class)
    public Result<Void> handleBusinessException([你的异常类] e) {
        return Result.fail(e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        return Result.fail(message);
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e) {
        log.error("系统异常", e);
        return Result.fail("系统繁忙，请稍后再试");
    }
}
```

---

## 检查清单

- [ ] 认证注解（`@PreAuthorize` / `[你的认证注解]`）
- [ ] API 文档注解（`@Operation` / `@ApiOperation`）
- [ ] 参数校验 `@Validated` + 分组
- [ ] 统一响应包装 `Result<T>`
- [ ] 敏感操作加分布式锁
- [ ] 全局异常处理器已配置

---

## 相关技能

| 需要了解 | Skill |
|---------|-------|
| 异常处理 | `error-handler` |
| 数据库设计 | `database-ops` |
| 缓存 | `redis-cache` |
| 文件上传 | `file-oss-management` |
