---
name: leniu-error-handler
description: |
  leniu-yunshitang-core 项目异常处理规范。包含 LeException 用法、全局异常处理器、参数校验、日志规范、错误码设计、国际化。

  触发场景：
  - 抛出业务异常（LeException）
  - 全局异常处理器配置
  - 参数校验异常处理
  - 日志记录规范
  - 错误码设计与国际化
  - 事务异常处理

  适用项目：leniu-tengyun-core（云食堂项目）

  触发词：leniu-异常、leniu-LeException、leniu-throw、leniu-错误处理、leniu-全局异常、leniu-@Validated、leniu-参数校验、leniu-日志、leniu-log、leniu-错误码、leniu-事务、leniu-I18n、net.xnzn、leniu-yunshitang、云食堂异常
---

# leniu-yunshitang-core 异常处理指南

> 本文档专注于 leniu-tengyun-core 项目的 Java 后端异常处理规范。

## 快速索引

| 场景 | 推荐方式 |
|------|---------|
| 业务异常 | `throw new LeException("msg")` |
| 带参数异常 | `throw new LeException("用户 {} 不存在", userId)` |
| 参数校验 | `@Validated(InsertGroup.class)` |
| 日志记录 | `log.error("msg: {}", e.getMessage(), e)` |
| 国际化消息 | `throw new LeException(I18n.getMessage("key"))` |

---

## 1. 业务异常 - LeException

### 基本用法

```java
import com.pig4cloud.pigx.common.core.exception.LeException;

// ✅ 基本用法：抛出业务异常
throw new LeException("用户不存在");

// ✅ 带占位符（支持 {} 占位符）
throw new LeException("用户 {} 不存在", userId);
throw new LeException("订单 {} 状态 {} 无法支付", orderId, status);

// ✅ 条件抛出（手动检查）
if (ObjectUtil.isNull(user)) {
    throw new LeException("用户不存在");
}

// ✅ 参数校验
if (StrUtil.isBlank(bo.getName())) {
    throw new LeException("名称不能为空");
}

// ✅ 集合判空
if (CollUtil.isEmpty(list)) {
    throw new LeException("列表不能为空");
}
```

---

## 2. 国际化 - I18n

### 国际化消息使用

```java
import net.xnzn.core.common.i18n.I18n;

// 获取国际化消息
String message = I18n.getMessage("user.not.exists");

// 带参数的国际化消息
String message = I18n.getMessage("user.password.retry.limit.exceed", maxRetryCount);

// 在异常中使用
throw new LeException(I18n.getMessage("user.not.exists"));
throw new LeException(I18n.getMessage("order.status.invalid", orderStatus));

// 带占位符的国际化
throw new LeException(I18n.getMessage("user.not.found", userId));
```

---

## 3. 参数校验

### 使用 @Validated 自动校验

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

// Controller 层校验
@PostMapping("/add")
public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
    // 参数校验失败会自动抛出异常
    return xxxService.add(request.getContent());
}

@PostMapping("/update")
public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request) {
    xxxService.update(request.getContent());
}
```

### DTO 类校验注解

```java
@Data
@ApiModel("XXX DTO")
public class XxxDTO implements Serializable {

    @ApiModelProperty(value = "主键ID")
    @NotNull(message = "主键ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @ApiModelProperty(value = "名称", required = true)
    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @ApiModelProperty(value = "邮箱")
    @Email(message = "邮箱格式不正确")
    private String email;

    @ApiModelProperty(value = "手机号")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @ApiModelProperty(value = "数量")
    @Min(value = 0, message = "数量不能小于0")
    @Max(value = 9999, message = "数量不能大于9999")
    private Integer count;

    @ApiModelProperty(value = "开始时间", required = true)
    @NotNull(message = "开始时间不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    private Date startTime;
}
```

### 分组校验定义

```java
// InsertGroup.java
public interface InsertGroup {}

// UpdateGroup.java
public interface UpdateGroup {}
```

---

## 4. 日志规范

### 日志级别

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| ERROR | 系统错误、业务异常 | 数据库连接失败、第三方接口超时 |
| WARN | 警告信息、潜在问题 | 缓存未命中、重试操作 |
| INFO | 重要业务流程、操作记录 | 用户登录、订单创建 |
| DEBUG | 开发调试信息 | 方法入参、中间变量 |

### 日志最佳实践

```java
import lombok.extern.slf4j.Slf4j;
import cn.hutool.core.util.ObjectUtil;

@Slf4j
@Service
public class XxxServiceImpl implements XxxService {

    @Resource
    private XxxMapper xxxMapper;

    // ✅ 好的：使用占位符（性能更好）
    @Override
    public Long add(XxxDTO dto) {
        log.info("开始新增XXX，名称: {}", dto.getName());

        // 业务逻辑
        XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);
        xxxMapper.insert(entity);

        log.info("新增XXX成功，ID: {}", entity.getId());
        return entity.getId();
    }

    // ❌ 不好：字符串拼接（每次都会拼接，即使日志级别不输出）
    @Override
    public Long addBad(XxxDTO dto) {
        log.info("开始新增XXX，名称: " + dto.getName());  // ❌
        // ...
    }

    // ✅ 好的：异常日志带堆栈（第三个参数传异常对象）
    @Override
    public XxxVO getById(Long id) {
        try {
            XxxEntity entity = xxxMapper.selectById(id);
            if (ObjectUtil.isNull(entity)) {
                throw new LeException("记录不存在");
            }
            return BeanUtil.copyProperties(entity, XxxVO.class);
        } catch (Exception e) {
            log.error("查询失败: {}", e.getMessage(), e);  // ✅
            throw new LeException("查询失败");
        }
    }

    // ❌ 不好：只记录消息，丢失堆栈
    @Override
    public void bad() {
        try {
            // ...
        } catch (Exception e) {
            log.error("处理失败: {}", e.getMessage());  // ❌
            throw new LeException("处理失败");
        }
    }

    // ✅ 好的：判断日志级别（避免不必要的序列化开销）
    @Override
    public void debugMethod(XxxDTO dto) {
        if (log.isDebugEnabled()) {
            log.debug("详细数据: {}", JacksonUtil.writeValueAsString(dto));
        }
        // ...
    }
}
```

---

## 5. Service 层完整示例

```java
import com.pig4cloud.pigx.common.core.exception.LeException;
import com.pig4cloud.pigx.common.core.util.LeRequest;
import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.collection.CollUtil;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.common.i18n.I18n;
import net.xnzn.core.xxx.dto.XxxDTO;
import net.xnzn.core.xxx.mapper.XxxMapper;
import net.xnzn.core.xxx.model.XxxEntity;
import net.xnzn.core.xxx.vo.XxxVO;

import javax.annotation.Resource;
import java.util.List;

/**
 * XXX 服务实现
 */
@Slf4j
@Service
public class XxxServiceImpl implements XxxService {

    @Resource
    private XxxMapper xxxMapper;

    @Override
    public Long add(XxxDTO dto) {
        log.info("开始新增XXX，类型: {}", dto.getXXXType());

        // 参数校验
        if (StrUtil.isBlank(dto.getName())) {
            throw new LeException(I18n.getMessage("name.required"));
        }

        // 业务校验
        if (dto.getStartTime().after(dto.getEndTime())) {
            throw new LeException(I18n.getMessage("time.invalid"));
        }

        // 转换并保存
        XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);
        entity.setDelFlag(2); // 正常状态

        xxxMapper.insert(entity);

        log.info("新增XXX成功，ID: {}", entity.getId());
        return entity.getId();
    }

    @Override
    public void update(XxxDTO dto) {
        if (ObjectUtil.isNull(dto.getId())) {
            throw new LeException(I18n.getMessage("id.required"));
        }

        XxxEntity exist = xxxMapper.selectById(dto.getId());
        if (ObjectUtil.isNull(exist)) {
            throw new LeException(I18n.getMessage("record.not.exists"));
        }

        XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);
        xxxMapper.updateById(entity);

        log.info("更新XXX成功，ID: {}", dto.getId());
    }

    @Override
    public void delete(Long id) {
        if (ObjectUtil.isNull(id)) {
            throw new LeException(I18n.getMessage("id.required"));
        }

        int rows = xxxMapper.deleteById(id);
        if (rows == 0) {
            throw new LeException(I18n.getMessage("delete.failed"));
        }

        log.info("删除XXX成功，ID: {}", id);
    }
}
```

---

## 6. 用户友好提示

### 错误提示规范

```java
// ✅ 好的：用户友好提示
throw new LeException("订单已发货，无法取消");
throw new LeException("库存不足，请减少购买数量");
throw new LeException("验证码已过期，请重新获取");
throw new LeException("该用户名已被注册，请换一个试试");

// ❌ 不好：技术术语
throw new LeException("order.status.invalid");
throw new LeException("NullPointerException at line 123");
throw new LeException("数据库连接失败");
throw new LeException("Duplicate entry for key 'uk_username'");
```

---

## 7. 常见错误对比

### ❌ 错误写法

```java
// 错误 1: 使用 RuoYi 的 ServiceException
throw new ServiceException("用户不存在");  // ❌ 应该用 LeException

// 错误 2: 使用 RuoYi 的 MessageUtils
throw new ServiceException(MessageUtils.message("user.not.exists"));  // ❌ 应该用 I18n.getMessage()

// 错误 3: 使用 javax.validation（JDK 21 应用 jakarta.validation）
import javax.validation.Valid;  // ❌ 错误

// 错误 4: 使用 RuoYi 的 AddGroup/EditGroup
@Validated(AddGroup.class)  // ❌ 应该用 InsertGroup.class

// 错误 5: 使用 RuoYi 的 StringUtils
StringUtils.isBlank(str);  // ❌ 应该用 StrUtil.isBlank()

// 错误 6: 使用 RuoYi 的 CollUtil
CollUtil.isEmpty(list);  // ❌ 应该用 CollUtil.isEmpty()（Hutool）

// 错误 7: 日志不带堆栈
log.error("处理失败: {}", e.getMessage());  // ❌

// 错误 8: 字符串拼接日志
log.info("处理用户: " + userId);  // ❌
```

### ✅ 正确写法

```java
// 正确 1: 使用 leniu 的 LeException
throw new LeException("用户不存在");  // ✅

// 正确 2: 使用 leniu 的 I18n
throw new LeException(I18n.getMessage("user.not.exists"));  // ✅

// 正确 3: 使用 Jakarta Validation
import jakarta.validation.Valid;  // ✅

// 正确 4: 使用 leniu 的 InsertGroup/UpdateGroup
@Validated(InsertGroup.class)  // ✅

// 正确 5: 使用 Hutool 的 StrUtil
StrUtil.isBlank(str);  // ✅

// 正确 6: 使用 Hutool 的 CollUtil
CollUtil.isEmpty(list);  // ✅

// 正确 7: 日志带堆栈
log.error("处理失败: {}", e.getMessage(), e);  // ✅

// 正确 8: 日志使用占位符
log.info("处理用户: {}", userId);  // ✅
```

---

## 8. 工具类选择

| 场景 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| **异常类** | `ServiceException` | `LeException` |
| **国际化** | `MessageUtils.message(key)` | `I18n.getMessage(key)` |
| **静态工厂** | 无（必须 `new`） | 无（必须 `new`） |
| **对象判空** | `ObjectUtil.isNull()` | `ObjectUtil.isNull()` |
| **集合判空** | `CollUtil.isEmpty()` | `CollUtil.isEmpty()` |
| **字符串判空** | `StringUtils.isBlank()` | `StrUtil.isBlank()` |
| **日志框架** | `@Slf4j` | `@Slf4j` |

---

## 9. 检查清单

使用异常处理前必须检查：

- [ ] **业务异常使用 `new LeException()`**？
- [ ] **条件判断使用 `if + ObjectUtil.isNull()`**？
- [ ] **参数校验使用 `@Validated(InsertGroup.class)`**？
- [ ] **异常消息是否使用国际化**（`I18n.getMessage()`）？
- [ ] **日志记录异常堆栈**（`log.error("msg: {}", e.getMessage(), e)`）？
- [ ] **日志使用占位符 `{}`**，不使用字符串拼接？
- [ ] **重要操作记录 INFO 日志**？
- [ ] **错误提示使用用户友好语言**？
- [ ] **是否使用 Jakarta Validation**？
- [ ] **分组是否正确**（InsertGroup/UpdateGroup）？
- [ ] **是否使用正确的工具类**（StrUtil/CollUtil）？

---

## 10. 快速对照表

| ❌ 错误写法 | ✅ 正确写法 |
|-----------|-----------|
| `throw new ServiceException("msg")` | `throw new LeException("msg")` |
| `MessageUtils.message("key")` | `I18n.getMessage("key")` |
| `import javax.validation.Valid` | `import jakarta.validation.Valid` |
| `@Validated(AddGroup.class)` | `@Validated(InsertGroup.class)` |
| `StringUtils.isBlank(str)` | `StrUtil.isBlank(str)` |
| `log.error("失败: " + e.getMessage())` | `log.error("失败: {}", e.getMessage(), e)` |
| `log.info("用户: " + userId)` | `log.info("用户: {}", userId)` |
| `throw new LeException("DB error")` | `throw new LeException("数据保存失败，请重试")` |

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| Service 示例 | `core-attendance/.../service/impl/AttendanceLeaveInfoServiceImpl.java` |

**项目路径**：`/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core`
