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
  - 本项目是三层架构：Controller -> Service -> Mapper
  - 参考 java-controller 技能获取更详细的 Controller 层规范
---

# API 接口设计规范

## 核心规范

| 原则 | 说明 |
|------|------|
| 统一入口 | 所有接口使用 POST 或 RESTful 风格 |
| 认证保护 | 所有业务接口必须添加认证注解 |
| 参数校验 | 使用分组校验区分新增/修改场景 |
| 统一响应 | 使用统一的响应格式包装返回数据 |

### HTTP 方法规范

| 操作 | 方法 | 路径 |
|------|------|------|
| 列表查询 | POST/GET | `/query` 或 `/list` |
| 获取详情 | POST/GET | `/{id}` 或 `/detail` |
| 新增 | POST | `/add` |
| 修改 | POST/PUT | `/update` |
| 删除 | POST/DELETE | `/delete` 或 `/batch/delete` |
| 导出 | POST | `/export` |
| 导入 | POST | `/import-excel` |

---

## Controller 标准模板

```java
@Slf4j
@RestController
@RequiresAuthentication
@RequestMapping("/module/feature")
@Api(value = "模块/功能", tags = "模块/功能")
public class XxxController {

    @Resource @Lazy
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

### 请求参数用 LeRequest 包装

```java
@PostMapping("/query")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    return xxxService.pageList(request.getContent());
}
```

### 分页参数

```java
@Data
public class XxxPageParam implements Serializable {
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;
    private String keyword;
    private Integer status;
}
```

### 分组校验

```java
// DTO 中使用分组
@Data
public class XxxDTO {
    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private String name;
}

// Controller 中应用
@PostMapping("/add")
public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request)
```

> Jakarta Validation: 项目用 JDK 21，必须 `import jakarta.validation.constraints.*`

---

## 响应格式

```java
// 分页响应
@PostMapping("/query")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) { ... }

// 单条数据
@GetMapping("/{id}")
public XxxVO getById(@PathVariable Long id) { ... }

// 新增返回 ID / 修改删除返回 void
@PostMapping("/add")
public Long add(@RequestBody LeRequest<XxxDTO> request) { ... }
```

---

## 常见场景

### 带 Redisson 分布式锁的导入

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

### 批量删除

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

### 带合计行的分页查询

```java
@PostMapping("/query")
@ApiOperation(value = "分页查询（带合计）")
public ReportBaseTotalVO<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();
    result.setTotalLine(xxxService.getSummaryTotal(request.getContent()));
    result.setResultPage(PageVO.of(xxxService.pageList(request.getContent())));
    return result;
}
```

---

## Swagger 注解

```java
@Api(value = "模块/功能", tags = "模块/功能")  // Controller 类
@ApiOperation(value = "功能描述-新增")           // 方法
@ApiModel("功能描述DTO")                         // DTO/VO 类
@ApiModelProperty(value = "主键ID", required = true) // 字段
```

---

## 检查清单

- [ ] 认证注解 `@RequiresAuthentication`
- [ ] API 文档注解 `@ApiOperation`
- [ ] 参数校验 `@Validated` + 分组
- [ ] 返回值类型正确（分页用 `Page<VO>`）
- [ ] 使用 `LeRequest<T>` 封装请求
- [ ] 敏感操作加分布式锁

---

## 多项目对比

| 特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|-----|----------------|-------------------|
| JDK | 17 | 21 |
| 包名 | `org.dromara.*` | `net.xnzn.core.*` |
| 请求封装 | 直接 BO | `LeRequest<T>` |
| 响应封装 | `R<T>`, `TableDataInfo<T>` | `Page<T>`, `void` |
| 分组校验 | `AddGroup`, `EditGroup` | `InsertGroup`, `UpdateGroup` |
| 认证 | `@SaCheckPermission` | `@RequiresAuthentication` |
| 异常 | `ServiceException` | `LeException` |
| 国际化 | `MessageUtils.message()` | `I18n.getMessage()` |

---

## 错误对比

```java
// ---- 错误 ----
@RestController                                    // 缺认证注解
public Long add(@RequestBody XxxDTO dto) { }       // 不用 LeRequest
public Long add(@Valid @RequestBody LeRequest<XxxDTO> request) { }  // @Valid 应为 @Validated(InsertGroup.class)
import javax.validation.constraints.NotNull;        // JDK 21 用 jakarta

// ---- 正确 ----
@RestController @RequiresAuthentication
public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
    return xxxService.add(request.getContent());
}
import jakarta.validation.constraints.NotNull;
```

---

## 相关技能

| 需要了解 | Skill |
|---------|-------|
| Service 层 | `java-service` |
| Controller 详细 | `java-controller` |
| 异常处理 | `error-handler` |
| 参数校验 | `java-entity` |
| 数据库设计 | `database-ops` |
