---
name: api-development
description: |
  后端 API 接口设计规范。基于 RuoYi-Vue-Plus 三层架构的 RESTful API 开发指南。

  触发场景：
  - 设计 RESTful API 接口
  - 编写 Controller 层代码
  - 配置接口权限、日志、防重复提交注解
  - 接口返回值类型选择（R/TableDataInfo/void）
  - 数据验证（@Validated/ValidatorUtils）

  触发词：API、接口、RESTful、Controller、GetMapping、PostMapping、@SaCheckPermission、@Log、@RepeatSubmit、TableDataInfo、R<T>、toAjax、接口规范
---

# API 接口设计规范（RuoYi-Vue-Plus 三层架构版）

> **⚠️ 重要声明**: 本项目是 **RuoYi-Vue-Plus 纯后端项目**，采用三层架构！
> 本文档规范基于 **TestDemo 模块**的真实 API 实现。

## 核心架构特征

| 对比项 | 本项目 (RuoYi-Vue-Plus) |
|--------|----------------------|
| **包名前缀** | `org.dromara.*` |
| **API 路径** | 标准 RESTful：`/list`、`/{id}`、`/export`、`/importData` |
| **Controller 基类** | `extends BaseController` |
| **HTTP 方法** | GET(查询), POST(新增/导出/导入), PUT(修改), DELETE(删除) |
| **返回类型** | `R<T>`（单个数据）或 `TableDataInfo<T>`（列表）或 `void`（导出） |
| **权限控制** | `@SaCheckPermission("module:resource:operation")` |
| **操作日志** | `@Log(title = "xxx", businessType = BusinessType.XXX)` |
| **幂等性** | `@RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS)` |
| **数据验证** | `@Validated(QueryGroup.class)` 或 `ValidatorUtils.validate()` |
| **Excel 处理** | `ExcelUtil.importExcel()` 和 `ExcelUtil.exportExcel()` |

---

## 1. 标准 RESTful API 路径规范

### 路径格式

| 操作 | HTTP 方法 | 路径 | 说明 |
|------|---------|------|------|
| **列表查询** | GET | `/list` | 分页查询列表 |
| **获取详情** | GET | `/{id}` | 根据 ID 查询单个数据 |
| **新增** | POST | `/` (空) | 创建新数据 |
| **修改** | PUT | `/` (空) | 更新数据 |
| **删除** | DELETE | `/{ids}` | 批量删除 |
| **导出** | POST | `/export` | 导出数据到 Excel |
| **导入** | POST | `/importData` | 从 Excel 导入数据 |
| **自定义查询** | GET | `/page` | 自定义分页逻辑 |

### 路径示例

```java
@RequestMapping("/demo/demo")  // 基础路径
public class TestDemoController {

    @GetMapping("/list")          // GET /demo/demo/list
    @GetMapping("/{id}")          // GET /demo/demo/{id}
    @PostMapping()                // POST /demo/demo
    @PutMapping()                 // PUT /demo/demo
    @DeleteMapping("/{ids}")      // DELETE /demo/demo/{ids}
    @PostMapping("/export")       // POST /demo/demo/export
    @PostMapping("/importData")   // POST /demo/demo/importData
}
```

---

## 2. API 方法完整模板

### 2.1 列表查询（分页）

```java
/**
 * 查询列表
 * ✅ 返回 TableDataInfo<T>（自动分页）
 * ✅ 使用 @Validated(QueryGroup.class) 进行参数验证
 * ✅ 使用 @SaCheckPermission 进行权限检查
 */
@SaCheckPermission("demo:demo:list")
@GetMapping("/list")
public TableDataInfo<TestDemoVo> list(
    @Validated(QueryGroup.class) TestDemoBo bo,
    PageQuery pageQuery) {
    return testDemoService.queryPageList(bo, pageQuery);
}
```

**关键点**:
- `@Validated(QueryGroup.class)` - 使用查询分组进行验证
- `PageQuery` - 分页参数（页码、页大小、排序）
- `TableDataInfo<T>` - 自动包装分页结果（包含 total、rows）
- `@SaCheckPermission` - 权限控制，参数格式："module:resource:operation"

---

### 2.2 自定义分页查询

```java
/**
 * 自定义分页查询
 * ✅ 用于需要特殊业务逻辑的分页查询
 * ✅ 调用 Service 的 customPageList() 方法
 */
@SaCheckPermission("demo:demo:list")
@GetMapping("/page")
public TableDataInfo<TestDemoVo> page(
    @Validated(QueryGroup.class) TestDemoBo bo,
    PageQuery pageQuery) {
    return testDemoService.customPageList(bo, pageQuery);
}
```

**使用场景**:
- 需要与标准列表查询不同的业务逻辑
- 数据需要额外的计算或组装
- 返回结果需要特殊处理

---

### 2.3 获取详情

```java
/**
 * 获取详情
 * ✅ 返回 R<T> 包装单个数据
 * ✅ 使用 @NotNull 验证 ID 参数
 * ✅ @SaCheckPermission 使用 "query" 操作
 */
@SaCheckPermission("demo:demo:query")
@GetMapping("/{id}")
public R<TestDemoVo> getInfo(
    @NotNull(message = "主键不能为空")
    @PathVariable("id") Long id) {
    return R.ok(testDemoService.queryById(id));
}
```

**关键点**:
- `@PathVariable` - 从 URL 路径提取 ID
- `@NotNull` - 参数验证注解
- `R.ok(data)` - 包装成功响应
- `@SaCheckPermission` - 参数为 "query" 表示查询权限

---

### 2.4 新增数据

```java
/**
 * 新增
 * ✅ POST 到空路径
 * ✅ 返回 R<Void> via toAjax()
 * ✅ 使用 ValidatorUtils 进行验证（非 @Validated）
 * ✅ @RepeatSubmit 防止重复提交
 * ✅ @Log 记录操作日志
 */
@SaCheckPermission("demo:demo:add")
@Log(title = "测试单表", businessType = BusinessType.INSERT)
@RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS,
              message = "{repeat.submit.message}")
@PostMapping()
public R<Void> add(@RequestBody TestDemoBo bo) {
    // ✅ 使用 ValidatorUtils 而非 @Validated（用于非 Controller 校验）
    ValidatorUtils.validate(bo, AddGroup.class);
    return toAjax(testDemoService.insertByBo(bo));
}
```

**关键点**:
- `@PostMapping()` - POST 到空路径（不带子路径）
- `@RequestBody` - 从请求体解析 JSON
- `ValidatorUtils.validate(bo, AddGroup.class)` - 手动验证
- `@RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS)` - 2 秒内防重
- `toAjax()` - 继承自 BaseController，将 boolean/int 转 R<Void>
- `@Log` 记录日志，`businessType = BusinessType.INSERT`

---

### 2.5 修改数据

```java
/**
 * 修改
 * ✅ PUT 到空路径
 * ✅ 返回 R<Void> via toAjax()
 * ✅ 使用 @Validated(EditGroup.class) 验证
 * ✅ @RepeatSubmit 使用默认配置
 * ✅ @Log 记录操作日志
 */
@SaCheckPermission("demo:demo:edit")
@Log(title = "测试单表", businessType = BusinessType.UPDATE)
@RepeatSubmit
@PutMapping()
public R<Void> edit(
    @Validated(EditGroup.class) @RequestBody TestDemoBo bo) {
    return toAjax(testDemoService.updateByBo(bo));
}
```

**关键点**:
- `@PutMapping()` - PUT 到空路径
- `@Validated(EditGroup.class)` - BO 级别验证（BO 上需要标注 @NotNull(groups = {EditGroup.class})）
- `@RepeatSubmit` - 使用默认防重配置（不指定间隔，框架默认值）
- `toAjax()` - 返回结果包装
- `businessType = BusinessType.UPDATE`

---

### 2.6 删除数据

```java
/**
 * 删除
 * ✅ DELETE /{ids} 接受多个 ID
 * ✅ 返回 R<Void> via toAjax()
 * ✅ 使用 @NotEmpty 验证 ID 数组非空
 * ✅ @Log 记录操作日志
 */
@SaCheckPermission("demo:demo:remove")
@Log(title = "测试单表", businessType = BusinessType.DELETE)
@DeleteMapping("/{ids}")
public R<Void> remove(
    @NotEmpty(message = "主键不能为空")
    @PathVariable Long[] ids) {
    return toAjax(testDemoService.deleteWithValidByIds(
        Arrays.asList(ids), true));
}
```

**关键点**:
- `@DeleteMapping("/{ids}")` - DELETE 到 /{ids} 路径
- `Long[] ids` - 接收数组格式 ID（路径参数）
- `@NotEmpty` - 验证数组非空
- `Arrays.asList(ids)` - 转换为 List
- `true` 参数 - 通常表示验证权限或检查是否存在
- `businessType = BusinessType.DELETE`

---

### 2.7 导出数据

```java
/**
 * 导出
 * ✅ POST 到 /export 路径
 * ✅ 返回 void（直接写入 HttpServletResponse）
 * ✅ 使用 @Validated 验证查询参数
 * ✅ @Log 记录操作日志
 */
@SaCheckPermission("demo:demo:export")
@Log(title = "测试单表", businessType = BusinessType.EXPORT)
@PostMapping("/export")
public void export(
    @Validated TestDemoBo bo,
    HttpServletResponse response) {
    List<TestDemoVo> list = testDemoService.queryList(bo);
    ExcelUtil.exportExcel(list, "测试单表", TestDemoVo.class, response);
}
```

**关键点**:
- `@PostMapping("/export")` - POST 到 /export 子路径
- `HttpServletResponse response` - 用于写入 Excel 文件
- 返回 `void` - 直接返回文件，不需要 R<T> 包装
- `ExcelUtil.exportExcel(records, title, voClass, response)` - 导出 Excel
- `businessType = BusinessType.EXPORT`

**ExcelUtil 导出参数说明**:
```java
ExcelUtil.exportExcel(
    list,                      // 数据列表
    "测试单表",                 // 文件名（不含后缀）
    TestDemoVo.class,          // VO 类（包含 @ExcelProperty）
    response                   // HttpServletResponse
);
```

---

### 2.8 导入数据

```java
/**
 * 导入
 * ✅ POST 到 /importData 路径
 * ✅ consumes = MediaType.MULTIPART_FORM_DATA_VALUE
 * ✅ 返回 R<Void> 包含导入结果分析
 * ✅ @RequestPart 接收文件
 * ✅ @Log 记录操作日志
 */
@Log(title = "测试单表", businessType = BusinessType.IMPORT)
@SaCheckPermission("demo:demo:import")
@PostMapping(value = "/importData",
             consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public R<Void> importData(@RequestPart("file") MultipartFile file) throws Exception {
    // ✅ 使用 ExcelUtil 导入，指定 ImportVo 类
    ExcelResult<TestDemoImportVo> excelResult =
        ExcelUtil.importExcel(file.getInputStream(),
                             TestDemoImportVo.class, true);

    // ✅ 转换为 Entity
    List<TestDemo> list = MapstructUtils.convert(
        excelResult.getList(), TestDemo.class);

    // ✅ 保存到数据库
    testDemoService.saveBatch(list);

    // ✅ 返回导入分析结果
    return R.ok(excelResult.getAnalysis());
}
```

**关键点**:
- `@PostMapping(value = "/importData", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)`
- `@RequestPart("file")` - 文件上传字段名为 "file"
- `throws Exception` - 处理文件异常
- `ExcelUtil.importExcel(inputStream, ImportVo.class, true)` - 导入 Excel
  - 第三个参数 `true` 表示是否需要导入分析（错误统计等）
- `excelResult.getList()` - 得到导入的数据
- `excelResult.getAnalysis()` - 得到导入分析结果（错误行数等）
- `MapstructUtils.convert()` - 转换为 Entity
- `saveBatch()` - 批量保存

---

## 3. 注解使用规范

### 3.1 权限控制 - @SaCheckPermission

```java
// 格式：@SaCheckPermission("module:resource:operation")
@SaCheckPermission("demo:demo:list")     // list - 列表查询
@SaCheckPermission("demo:demo:query")    // query - 详情查询
@SaCheckPermission("demo:demo:add")      // add - 新增
@SaCheckPermission("demo:demo:edit")     // edit - 修改
@SaCheckPermission("demo:demo:remove")   // remove - 删除
@SaCheckPermission("demo:demo:export")   // export - 导出
@SaCheckPermission("demo:demo:import")   // import - 导入
```

**权限字符串规则**:
- 格式：`module:resource:operation`
- `module` - 业务模块名（如 demo、system、business）
- `resource` - 资源名称（如 user、menu、xxx）
- `operation` - 操作类型（list、query、add、edit、remove、export、import）

---

### 3.2 操作日志 - @Log

```java
// 格式：@Log(title = "功能名称", businessType = BusinessType.XXX)
@Log(title = "测试单表", businessType = BusinessType.INSERT)   // 新增
@Log(title = "测试单表", businessType = BusinessType.UPDATE)   // 修改
@Log(title = "测试单表", businessType = BusinessType.DELETE)   // 删除
@Log(title = "测试单表", businessType = BusinessType.EXPORT)   // 导出
@Log(title = "测试单表", businessType = BusinessType.IMPORT)   // 导入
```

**BusinessType 枚举值**:
```java
public enum BusinessType {
    OTHER,      // 其他
    INSERT,     // 新增
    UPDATE,     // 修改
    DELETE,     // 删除
    GRANT,      // 授权
    EXPORT,     // 导出
    IMPORT,     // 导入
    FORCE,      // 强退
    GENCODE,    // 代码生成
    CLEAN       // 清空数据
}
```

---

### 3.3 幂等性防护 - @RepeatSubmit

```java
// 使用默认配置
@RepeatSubmit
public R<Void> add(...) { ... }

// 自定义间隔和单位
@RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS,
              message = "{repeat.submit.message}")
public R<Void> add(...) { ... }

// 自定义消息（i18n 国际化）
@RepeatSubmit(message = "{repeat.submit.message}")
```

**参数说明**:
- `interval` - 防重间隔（默认值由框架定义）
- `timeUnit` - 时间单位（SECONDS、MILLISECONDS 等）
- `message` - 提示消息（支持 i18n 占位符，格式：{key}）

---

### 3.4 数据验证 - @Validated 和 ValidatorUtils

#### 方式一：@Validated 注解（Controller 级别）

```java
// ✅ 列表查询：使用 QueryGroup
@GetMapping("/list")
public TableDataInfo<TestDemoVo> list(
    @Validated(QueryGroup.class) TestDemoBo bo,
    PageQuery pageQuery) { ... }

// ✅ 修改：使用 EditGroup
@PutMapping()
public R<Void> edit(
    @Validated(EditGroup.class) @RequestBody TestDemoBo bo) { ... }

// ✅ 新增或导出：不指定分组（使用默认或所有分组）
@PostMapping("/export")
public void export(@Validated TestDemoBo bo, HttpServletResponse response) { ... }
```

#### 方式二：ValidatorUtils 工具类（手动验证）

```java
// ✅ 在 Controller 方法内手动验证
@PostMapping()
public R<Void> add(@RequestBody TestDemoBo bo) {
    ValidatorUtils.validate(bo, AddGroup.class);
    return toAjax(testDemoService.insertByBo(bo));
}

// ✅ 用途：
// - 非 Controller 方法内验证（Service/DAO 层）
// - 需要自定义验证逻辑的地方
// - 手动捕获验证异常
```

**验证分组说明**:

| 分组 | 用途 | 在 BO 中标注 |
|------|------|----------|
| `QueryGroup.class` | 查询时验证 | `@NotNull(groups = QueryGroup.class)` |
| `AddGroup.class` | 新增时验证 | `@NotNull(groups = AddGroup.class)` |
| `EditGroup.class` | 修改时验证 | `@NotNull(groups = EditGroup.class)` |

---

## 4. 返回值类型规范

### 4.1 R<T> - 单个数据返回

```java
// ✅ 返回成功（包含数据）
return R.ok(data);                    // 返回数据

// ✅ 返回成功（无数据）
return R.ok();                        // 仅返回 {code: 200}

// ✅ 使用 toAjax() 包装服务返回值
return toAjax(testDemoService.insertByBo(bo));  // int/boolean → R<Void>

// ✅ 返回失败
return R.fail("错误信息");
```

**R<T> 响应格式**:
```json
{
  "code": 200,                    // 响应码
  "msg": "操作成功",              // 响应消息
  "data": {...}                   // 数据
}
```

---

### 4.2 TableDataInfo<T> - 分页列表返回

```java
// ✅ Service 返回分页结果
@GetMapping("/list")
public TableDataInfo<TestDemoVo> list(
    @Validated(QueryGroup.class) TestDemoBo bo,
    PageQuery pageQuery) {
    return testDemoService.queryPageList(bo, pageQuery);
}
```

**TableDataInfo<T> 响应格式**:
```json
{
  "total": 100,                   // 总条数
  "rows": [                       // 数据行
    {...},
    {...}
  ],
  "code": 200,
  "msg": "操作成功"
}
```

---

### 4.3 void - 直接响应（导出）

```java
// ✅ 导出时不使用返回值，直接写入 HttpServletResponse
@PostMapping("/export")
public void export(@Validated TestDemoBo bo, HttpServletResponse response) {
    List<TestDemoVo> list = testDemoService.queryList(bo);
    ExcelUtil.exportExcel(list, "测试单表", TestDemoVo.class, response);
}
```

---

## 5. 数据验证注解

| 注解 | 用途 | 示例 |
|------|------|------|
| `@NotNull` | 不能为 null | `@NotNull(message = "主键不能为空")` |
| `@NotBlank` | 字符串不能为空或空白 | `@NotBlank(message = "名称不能为空")` |
| `@NotEmpty` | 集合/数组不能为空 | `@NotEmpty(message = "ID 不能为空")` |
| `@Min` | 最小值 | `@Min(value = 0, message = "不能小于0")` |
| `@Max` | 最大值 | `@Max(value = 100, message = "不能大于100")` |
| `@Length` | 字符串长度 | `@Length(min = 1, max = 50)` |
| `@Pattern` | 正则表达式 | `@Pattern(regexp = "^[0-9]+$")` |
| `@Email` | 邮箱格式 | `@Email(message = "邮箱格式错误")` |

---

## 6. BaseController 工具方法

### toAjax() 方法

```java
// ✅ 将 Service 返回的 int/boolean 转换为 R<Void>
return toAjax(testDemoService.insertByBo(bo));
return toAjax(testDemoService.updateByBo(bo));
return toAjax(testDemoService.deleteWithValidByIds(ids, true));

// 原理：
// - 入参 > 0 或 true → R.ok()
// - 入参 = 0 或 false → R.fail()
```

---

## 7. 常见错误对比

### ❌ 不要做

```java
// 错误 1: 用 /page 替代 /list 作为标准列表端点
@GetMapping("/page")           // ❌ 不能替代 /list（/page 仅用于自定义分页，见 2.2 节）

// 错误 2: 返回值不包装
public List<TestDemoVo> list() { ... }     // ❌ 禁止！应返回 TableDataInfo<T>
public TestDemoVo getInfo(Long id) { ... } // ❌ 禁止！应返回 R<T>

// 错误 3: 不使用权限注解
@GetMapping("/list")
public TableDataInfo<TestDemoVo> list(...) { ... }  // ❌ 缺少 @SaCheckPermission

// 错误 4: 不使用日志注解
@PostMapping()
public R<Void> add(...) { ... }  // ❌ 缺少 @Log

// 错误 5: 新增/修改不防重复提交
@PostMapping()
public R<Void> add(...) { ... }  // ❌ 缺少 @RepeatSubmit

// 错误 6: 使用 @Validated 而不指定分组
@PostMapping()
public R<Void> add(@Validated @RequestBody TestDemoBo bo) { ... }
// ❌ 应该用 ValidatorUtils.validate(bo, AddGroup.class)

// 错误 7: 导出返回 R<T>
@PostMapping("/export")
public R<List<TestDemoVo>> export(...) { ... }  // ❌ 应返回 void
```

### ✅ 正确做法

```java
// 正确 1: 路径唯一，遵循 RESTful 规范
@GetMapping("/list")           // ✅
@GetMapping("/{id}")           // ✅
@PostMapping()                 // ✅
@PutMapping()                  // ✅
@DeleteMapping("/{ids}")       // ✅

// 正确 2: 返回值类型正确
public TableDataInfo<TestDemoVo> list(...) { ... }    // ✅
public R<TestDemoVo> getInfo(Long id) { ... }         // ✅
public R<Void> add(...) { ... }                        // ✅

// 正确 3: 使用权限注解
@SaCheckPermission("demo:demo:list")
@GetMapping("/list")
public TableDataInfo<TestDemoVo> list(...) { ... }  // ✅

// 正确 4: 使用日志注解
@Log(title = "测试单表", businessType = BusinessType.INSERT)
@PostMapping()
public R<Void> add(...) { ... }  // ✅

// 正确 5: 新增/修改防重复提交
@RepeatSubmit(interval = 2, timeUnit = TimeUnit.SECONDS)
@PostMapping()
public R<Void> add(...) { ... }  // ✅

// 正确 6: 手动验证 BO
@PostMapping()
public R<Void> add(@RequestBody TestDemoBo bo) {
    ValidatorUtils.validate(bo, AddGroup.class);  // ✅
    return toAjax(testDemoService.insertByBo(bo));
}

// 正确 7: 导出返回 void
@PostMapping("/export")
public void export(@Validated TestDemoBo bo, HttpServletResponse response) {
    // ... 导出逻辑 ...
}  // ✅
```

---

## 8. 检查清单

生成 API 代码前必须检查：

- [ ] **权限注解是否添加**？(`@SaCheckPermission`)
- [ ] **操作日志是否添加**？(`@Log(title = "xxx", businessType = BusinessType.XXX)`)
- [ ] **新增/修改是否防重复提交**？(`@RepeatSubmit`)
- [ ] **返回值类型是否正确**？(LIST→TableDataInfo, GET→R<T>, DELETE/UPDATE→R<Void>, EXPORT→void)
- [ ] **HTTP 方法是否正确**？(GET查询, POST新增/导出/导入, PUT修改, DELETE删除)
- [ ] **路径是否遵循 RESTful 规范**？(/list, /{id}, /export, /importData)
- [ ] **数据验证是否正确**？(@Validated + 分组 或 ValidatorUtils)
- [ ] **是否使用了 toAjax() 包装返回值**？(用于 int/boolean → R<Void>)
- [ ] **是否使用了 MapstructUtils** 进行对象转换？(导入数据时)
- [ ] **是否所有类型都先 import 再使用短类名**？(禁止完整类名内联)
- [ ] **Controller 是否继承 BaseController**？
- [ ] **Service 接口是否遵循三层架构**？(Service → Mapper，无 DAO)
- [ ] **导出是否使用 ExcelUtil.exportExcel()**？
- [ ] **导入是否使用 ExcelUtil.importExcel() 和 MapstructUtils.convert()**？

---

## 9. 参考实现

查看已有的完整实现：

- **Controller 参考**: `org.dromara.demo.controller.TestDemoController`（完整的 7 个 API 方法）
- **Service 参考**: `org.dromara.demo.service.impl.TestDemoServiceImpl`
- **Entity 参考**: `org.dromara.demo.domain.TestDemo`
- **BO 参考**: `org.dromara.demo.domain.bo.TestDemoBo`
- **VO 参考**: `org.dromara.demo.domain.vo.TestDemoVo`
- **Mapper 参考**: `org.dromara.demo.mapper.TestDemoMapper`

**特别注意**：上述参考代码是本项目的标准实现，严格遵循 RESTful 规范和三层架构。

---

## 10. 快速参考

### HTTP 方法速查

```
GET    /list            → 列表查询（分页）
GET    /{id}            → 获取详情
POST   /                → 新增数据
PUT    /                → 修改数据
DELETE /{ids}           → 删除数据
POST   /export          → 导出数据
POST   /importData      → 导入数据
```

### 注解组合速查

```
LIST:    @SaCheckPermission + @GetMapping("/list") + @Validated(QueryGroup.class)
GET:     @SaCheckPermission + @GetMapping("/{id}") + @NotNull + R.ok()
ADD:     @SaCheckPermission + @Log(INSERT) + @RepeatSubmit + ValidatorUtils
EDIT:    @SaCheckPermission + @Log(UPDATE) + @RepeatSubmit + @Validated(EditGroup.class)
DELETE:  @SaCheckPermission + @Log(DELETE) + @DeleteMapping("/{ids}") + toAjax()
EXPORT:  @SaCheckPermission + @Log(EXPORT) + @PostMapping("/export") + void
IMPORT:  @SaCheckPermission + @Log(IMPORT) + @PostMapping("/importData") + R<Void>
```

