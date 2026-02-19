---
name: java-controller
description: |
  Java Controller层API接口规范。当编写Controller接口时使用此skill，规范接口路径、参数和响应设计。
  
    触发场景：
    - 定义Controller类和接口路径
    - 设计RESTful接口（GET/POST/PUT/DELETE）
    - 配置参数封装和响应格式
    - 添加参数校验和API文档注解
  
    触发词：Controller、@RestController、接口路径、@RequestMapping、@GetMapping、@PostMapping、@PutMapping、@DeleteMapping、参数校验、API接口
---

# Java Controller层规范

## Controller类模板

```java
@RequiresAuthentication
@RestController
@RequestMapping("/api/module/feature")
@Api(value = "模块/功能", tags = "模块/功能")
public class XxxController {

    @Autowired
    private XxxService xxxService;

    @ApiOperation(value = "功能描述")
    @PostMapping("/action")
    public ReturnType methodName(@RequestBody LeRequest<ParamType> request) {
        ParamType param = request.getContent();
        return xxxService.doSomething(param);
    }

    @ApiOperation(value = "分页查询")
    @PostMapping("/page")
    public PageVO<XxxVO> page(@Valid @RequestBody LeRequest<XxxPageParam> request) {
        return xxxService.pageList(request.getContent());
    }
}
```

## 必须遵守的规范

### 1. 接口定义
- 统一使用`@PostMapping`
- 使用`@RequiresAuthentication`认证
- 路径格式: `/api/{模块}/{功能}`

### 2. 参数封装
- 使用`LeRequest<T>`封装请求参数
- 通过`request.getContent()`获取参数
- 需要校验的参数加`@Valid`

### 3. 响应封装
```java
// 成功响应
return LeResponse.succ(data);

// 失败响应
return LeResponse.fail(msg);
```

### 4. API文档注解
```java
@Api(value = "模块/功能", tags = "模块/功能")  // 类级别
@ApiOperation(value = "接口描述")  // 方法级别
```

### 5. 参数校验
**重要**: 项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

// VO/DTO中定义校验规则
@NotNull(message = "ID不能为空")
private Long id;

@NotBlank(message = "名称不能为空")
private String name;

// Controller中触发校验
public ReturnType method(@Valid @RequestBody LeRequest<ParamType> request)
```

## 常用接口类型

### 分页查询
```java
@PostMapping("/page")
public PageVO<XxxVO> page(@Valid @RequestBody LeRequest<XxxPageParam> request)
```

### 新增
```java
@PostMapping("/add")
public Long add(@Valid @RequestBody LeRequest<XxxParam> request)
```

### 更新
```java
@PostMapping("/update")
public void update(@Valid @RequestBody LeRequest<XxxParam> request)
```

### 删除
```java
@PostMapping("/delete")
public void delete(@RequestBody LeRequest<Long> request)
```

### 导出
```java
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request)
```
