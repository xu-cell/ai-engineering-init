---
name: error-handler
description: |
  通用异常处理指南。涵盖自定义业务异常、全局异常处理器、参数校验等。
  触发场景：异常设计、错误处理、参数校验、全局异常捕获。
  触发词：异常处理、错误处理、参数校验、validation、异常捕获。
  注意：如果项目有专属技能（如 `leniu-error-handler`），优先使用专属版本。
---

# 异常处理指南

> 通用模板。如果项目有专属技能（如 `leniu-error-handler`），优先使用。

## 核心规范

### 异常分层设计

```
RuntimeException
└── BusinessException          # 业务异常基类
    ├── NotFoundException      # 资源不存在 (404)
    ├── ForbiddenException     # 无权限 (403)
    ├── BadRequestException    # 参数错误 (400)
    └── ConflictException      # 数据冲突 (409)
```

### 异常处理原则

1. **业务异常用自定义异常类**，不要直接抛 `RuntimeException`
2. **全局统一捕获**，通过 `@RestControllerAdvice` 处理
3. **区分异常层级**：Controller 层不 try-catch（交给全局处理器），Service 层只捕获需要转换的异常
4. **异常信息面向用户**：不暴露堆栈、SQL 等技术细节
5. **日志记录完整**：异常日志包含完整上下文和堆栈

## 代码示例

### 1. 自定义业务异常

```java
package [你的包名].exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = 500;
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessException(int code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
```

```java
package [你的包名].exception;

public class NotFoundException extends BusinessException {

    public NotFoundException(String message) {
        super(404, message);
    }

    public static NotFoundException of(String resource, Object id) {
        return new NotFoundException(resource + " 不存在: " + id);
    }
}
```

### 2. 全局异常处理器

```java
package [你的包名].handler;

import [你的包名].exception.BusinessException;
import [你的包名].exception.NotFoundException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusinessException(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Result.fail(e.getCode(), e.getMessage()));
    }

    /**
     * 资源不存在
     */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Result<Void>> handleNotFoundException(NotFoundException e) {
        log.warn("资源不存在: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Result.fail(404, e.getMessage()));
    }

    /**
     * @RequestBody 参数校验失败
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Map<String, String>>> handleValidationException(
            MethodArgumentNotValidException e) {
        Map<String, String> errors = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "校验失败",
                        (v1, v2) -> v1
                ));
        log.warn("参数校验失败: {}", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Result.fail(400, "参数校验失败"));
    }

    /**
     * @RequestParam / @PathVariable 校验失败
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Result<Void>> handleConstraintViolation(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining("; "));
        log.warn("约束校验失败: {}", message);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Result.fail(400, message));
    }

    /**
     * 缺少请求参数
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Result<Void>> handleMissingParam(MissingServletRequestParameterException e) {
        log.warn("缺少请求参数: {}", e.getParameterName());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Result.fail(400, "缺少参数: " + e.getParameterName()));
    }

    /**
     * 兜底：未知异常
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e) {
        log.error("系统异常", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.fail(500, "系统繁忙，请稍后重试"));
    }
}
```

### 3. 参数校验（jakarta.validation）

```java
package [你的包名].dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 32, message = "用户名长度 2-32 位")
    private String username;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotNull(message = "年龄不能为空")
    @Min(value = 1, message = "年龄最小为 1")
    @Max(value = 150, message = "年龄最大为 150")
    private Integer age;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;
}
```

**Controller 中使用**：
```java
@PostMapping
public ResponseEntity<Result<Long>> create(@Valid @RequestBody UserCreateDTO dto) {
    return ResponseEntity.ok(Result.ok(userService.create(dto)));
}
```

### 4. 分组校验

```java
public interface CreateGroup {}
public interface UpdateGroup {}

@Data
public class UserDTO {

    @Null(groups = CreateGroup.class, message = "创建时不能指定 ID")
    @NotNull(groups = UpdateGroup.class, message = "更新时必须指定 ID")
    private Long id;

    @NotBlank(groups = {CreateGroup.class, UpdateGroup.class})
    private String username;
}

// Controller 使用
@PostMapping
public Result<Long> create(@Validated(CreateGroup.class) @RequestBody UserDTO dto) { ... }

@PutMapping("/{id}")
public Result<Void> update(@Validated(UpdateGroup.class) @RequestBody UserDTO dto) { ... }
```

### 5. Service 层异常使用

```java
@Service
public class UserServiceImpl implements IUserService {

    @Override
    public UserVO getById(Long id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw NotFoundException.of("用户", id);
        }
        // ... 转换为 VO
        return userVO;
    }

    @Override
    public void updateEmail(Long id, String email) {
        // 检查邮箱是否已被使用
        User existing = userMapper.selectByEmail(email);
        if (existing != null && !existing.getId().equals(id)) {
            throw new BusinessException(409, "邮箱已被其他用户使用");
        }
        // ... 更新逻辑
    }
}
```

### 6. 日志规范

```java
@Slf4j
@Service
public class OrderServiceImpl {

    // 使用占位符（性能更好）
    log.info("创建订单: orderNo={}, amount={}", dto.getOrderNo(), dto.getAmount());

    // 异常日志带堆栈（第三个参数传异常对象）
    log.error("处理失败: {}", e.getMessage(), e);

    // 事务方法：所有异常都回滚
    @Transactional(rollbackFor = Exception.class)
    public void createOrder(OrderCreateDTO dto) {
        log.info("开始创建订单, orderNo={}", dto.getOrderNo());
        // ... 业务逻辑
        log.info("订单创建成功, id={}", order.getId());
    }
}
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 抛 `RuntimeException("xxx")` | 使用自定义业务异常类 |
| Controller 里 try-catch 所有异常 | 交给 `@RestControllerAdvice` 统一处理 |
| 异常信息暴露 SQL / 堆栈 | 对用户返回友好提示，日志记录完整信息 |
| 用 `javax.validation` 包 | JDK 17+ 使用 `jakarta.validation` |
| 吞掉异常：`catch (Exception e) {}` | 至少记录日志 `log.error("...", e)` |
| 所有异常都返回 200 状态码 | 根据异常类型返回对应 HTTP 状态码 |
| 用 `e.getMessage()` 直接返回给用户 | 第三方异常信息可能包含敏感信息，需要包装 |
| 校验逻辑写在 Controller 里 | 用 `@Valid` + DTO 注解声明式校验 |
| 日志用字符串拼接 `"失败:" + msg` | 用占位符 `log.error("失败: {}", msg, e)` |
| `@Transactional` 不指定回滚 | 加 `rollbackFor = Exception.class` |
