---
name: code-patterns
description: |
  通用编码规范指南。涵盖 RESTful API 设计、命名规范、Git 提交规范、代码风格等。
  触发场景：代码审查、规范检查、命名讨论、API 设计。
  触发词：编码规范、代码风格、命名规范、RESTful、Git 提交。
  注意：如果项目有专属技能（如 `leniu-code-patterns`），优先使用专属版本。
---

# 编码规范指南

> 通用模板。如果项目有专属技能（如 `leniu-code-patterns`），优先使用。

## 核心规范

### RESTful API 设计

| 操作 | HTTP 方法 | URL 示例 | 说明 |
|------|----------|---------|------|
| 创建 | POST | `/api/v1/orders` | 请求体传参 |
| 查询列表 | GET | `/api/v1/orders` | Query 参数分页 |
| 查询详情 | GET | `/api/v1/orders/{id}` | 路径参数 |
| 全量更新 | PUT | `/api/v1/orders/{id}` | 请求体传参 |
| 部分更新 | PATCH | `/api/v1/orders/{id}` | 请求体传参 |
| 删除 | DELETE | `/api/v1/orders/{id}` | 路径参数 |

**URL 规范**：
- 使用名词复数：`/orders` 而非 `/order`
- 使用小写连字符：`/order-items` 而非 `/orderItems`
- 版本号放 URL 前缀：`/api/v1/`
- 嵌套资源不超过两层：`/orders/{id}/items`

### 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 类名 | UpperCamelCase | `OrderService`, `UserController` |
| 方法名 | lowerCamelCase | `createOrder()`, `getUserById()` |
| 变量名 | lowerCamelCase | `orderNo`, `userName` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| 包名 | 全小写 | `com.example.order` |
| 数据库表/字段 | lower_snake_case | `t_order`, `order_no` |

**类命名约定**：

| 后缀 | 用途 | 示例 |
|------|------|------|
| `Controller` | 控制器 | `OrderController` |
| `Service` / `ServiceImpl` | 服务层 | `OrderServiceImpl` |
| `Mapper` / `Repository` | 数据访问 | `OrderMapper` |
| `DTO` | 请求参数 | `OrderCreateDTO` |
| `VO` | 响应对象 | `OrderVO` |
| `Enum` | 枚举 | `OrderStatusEnum` |
| `Config` | 配置类 | `RedisConfig` |
| `Handler` | 处理器 | `GlobalExceptionHandler` |
| `Interceptor` | 拦截器 | `AuthInterceptor` |
| `Utils` / `Helper` | 工具类 | `DateUtils` |

### 方法命名约定

| 前缀 | 含义 | 示例 |
|------|------|------|
| `create` / `add` | 创建 | `createOrder()` |
| `update` / `modify` | 更新 | `updateStatus()` |
| `delete` / `remove` | 删除 | `deleteById()` |
| `get` / `find` / `query` | 查询 | `getById()`, `findByName()` |
| `list` | 查询列表 | `listByStatus()` |
| `page` | 分页查询 | `pageQuery()` |
| `count` | 计数 | `countByStatus()` |
| `is` / `has` / `can` | 布尔判断 | `isValid()`, `hasPermission()` |
| `check` / `validate` | 校验 | `checkDuplicate()` |
| `convert` / `to` | 转换 | `convertToVO()`, `toDTO()` |

### Git 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（非新功能、非修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具变更 |

**示例**：
```
feat(order): 新增订单导出功能

支持按时间范围导出订单数据为 Excel 格式。

Closes #123
```

## 数据类型规范

### 布尔语义字段必须使用 Boolean

```java
// ❌ 错误
private Integer ifNarrow;
private Integer isEnabled;

// ✅ 正确
private Boolean narrow;     // getter 自动生成 isNarrow()
private Boolean enabled;    // getter 自动生成 isEnabled()
```

**规则**：
- 语义为"是/否"的字段，类型必须为 `Boolean`
- 字段名不加 `if`/`is`/`has` 前缀（JavaBean 规范中 `Boolean` 的 getter 自动生成 `isXxx()`）
- 数据库字段使用 `TINYINT(1)` 或 `BIT(1)`

### 枚举字段必须提供明确约束

```java
// ❌ 错误：调用方无法知道合法值
@ApiModelProperty(value = "操作类型")
private Integer tradeType;

// ✅ 方案一：VO/DTO 层直接用枚举（推荐）
@ApiModelProperty(value = "操作类型")
private AccTradeTypeEnum tradeType;

// ✅ 方案二：保留 Integer 但标注合法值
@ApiModelProperty(value = "操作类型：1-充值 2-消费 3-退款", allowableValues = "1,2,3")
private Integer tradeType;
```

### 金额字段禁止使用浮点类型

```java
// ❌ 错误
private Double amount;
private Float price;

// ✅ 正确：Entity/Service 层用 Long（分），VO 层展示用 BigDecimal（元）
private Long amountFen;
private BigDecimal amountYuan;
```

### 原始类型 vs 包装类型

| 场景 | 用原始类型 | 用包装类型 |
|------|----------|----------|
| Entity / VO / DTO 字段 | — | ✅ 统一用包装类型 |
| 方法参数（不允许 null） | ✅ `int count` | — |
| 方法参数（允许 null） | — | ✅ `Integer count` |
| 局部变量 | ✅ `int i = 0` | — |

## Optional 使用规范

```java
// ❌ 错误：of() 不接受 null，value 为 null 直接 NPE
Optional.of(value).orElse(defaultValue);

// ✅ 正确：ofNullable() 安全处理 null
Optional.ofNullable(value).orElse(defaultValue);

// ❌ 禁止：Optional 作为方法参数或类字段
public void process(Optional<String> name) { ... }
private Optional<String> name;

// ✅ 允许：Optional 作为方法返回值、链式处理
public Optional<Entity> findById(Long id) { ... }
Optional.ofNullable(entity).map(Entity::getConfig).orElse(DEFAULT_VALUE);
```

## @Transactional 规范

```java
// ❌ 错误：默认只回滚 RuntimeException
@Transactional
public void createOrder() { ... }

// ✅ 正确：显式指定回滚异常
@Transactional(rollbackFor = Exception.class)
public void createOrder() { ... }
```

- 所有 `@Transactional` 必须显式写 `rollbackFor = Exception.class`
- 只读查询不加 `@Transactional`（或用 `readOnly = true`）
- 事务方法不要 try-catch 吞掉异常，否则事务不回滚

## TODO 管理规范

```java
// ❌ 错误：无负责人、无日期、无跟踪
// TODO 修改一下

// ✅ 正确：完整 TODO 格式
// TODO(@陈沈杰, 2026-03-20, #TASK-1234): 移动端 AppId 赋值逻辑待产品确认
```

- 每个 TODO 必须有对应的任务号
- 超过 2 个迭代未处理的 TODO 必须清理
- 不用的代码直接删除，不要注释保留

## 代码格式化规范

| 项目 | 规范 |
|------|------|
| 缩进 | 4 个空格（不用 Tab） |
| 行宽 | 120 字符 |
| 大括号 | K&R 风格（同行开始） |
| 空行 | 方法间 1 个空行，逻辑块间 1 个空行 |
| import | 分组排序：java → jakarta → org → net → com，组间空行 |

## 代码示例

### 统一响应格式

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Result<T> {
    private int code;
    private String message;
    private T data;

    public static <T> Result<T> ok(T data) {
        return new Result<>(200, "success", data);
    }

    public static <T> Result<T> fail(int code, String message) {
        return new Result<>(code, message, null);
    }
}
```

### 枚举定义规范

```java
@Getter
@AllArgsConstructor
public enum OrderStatusEnum {

    PENDING(0, "待处理"),
    COMPLETED(1, "已完成"),
    CANCELLED(2, "已取消");

    private final int code;
    private final String desc;

    public static OrderStatusEnum of(int code) {
        for (OrderStatusEnum status : values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("未知状态码: " + code);
    }
}
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| URL 用动词：`/getOrder` | 用名词 + HTTP 方法：`GET /orders/{id}` |
| 方法名含义不清：`process()` | 明确动作：`calculateTotalAmount()` |
| 魔法数字：`if (status == 1)` | 用枚举或常量 |
| 一个方法超过 80 行 | 拆分为多个私有方法 |
| 注释描述"做了什么" | 注释描述"为什么这样做" |
| Git 提交信息写"fix bug" | 写清楚修了什么：`fix(order): 修复金额计算精度丢失` |
| Boolean 变量名：`flag` | 有意义的名字：`isActive`, `hasPermission` |
| 缩写命名：`usr`, `mgr` | 完整命名：`user`, `manager` |
| `Optional.of(可能null值)` | `Optional.ofNullable(value)` |
| `@Transactional` 无 rollbackFor | `@Transactional(rollbackFor = Exception.class)` |
| TODO 无负责人和日期 | `// TODO(@负责人, 日期, #任务号): 描述` |
| 布尔字段用 `Integer` | 用 `Boolean` 类型 |
| 枚举字段无合法值说明 | `@ApiModelProperty` 标注合法值或直接用枚举类型 |
