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
