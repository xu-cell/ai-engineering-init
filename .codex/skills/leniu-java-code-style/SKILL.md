---
name: leniu-java-code-style
description: |
  leniu-tengyun-core 项目代码风格和命名规范。当编写或生成 Java 代码时使用此 skill，适用于所有 Java 类的命名和风格规范。

  触发场景：
  - 编写 Java 类时的命名规范（类名、方法名、变量名）
  - 代码风格检查（注解使用、依赖注入方式）
  - 包结构规范设计
  - Controller/Service/Entity/VO/DTO 等各类型 Java 类规范

  触发词：代码风格、命名规范、类命名、方法命名、包结构、注解使用、依赖注入、驼峰命名、代码规范
---

# leniu-tengyun-core 代码风格规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **Validation** | `jakarta.validation.*` |
| **工具库** | Hutool (CollUtil, ObjectUtil, BeanUtil) |
| **异常类** | `LeException` |
| **国际化** | `I18n` |
| **租户上下文** | `TenantContextHolder` |
| **分页组件** | PageHelper (PageMethod) |

## 包结构规范

```
net.xnzn.core
├── [module]/
│   ├── controller/         # 控制器层
│   ├── service/            # 服务层
│   │   └── impl/        # 服务实现
│   ├── mapper/             # 数据访问层（含 XML）
│   ├── model/             # 数据模型
│   │   ├── entity/       # 实体类
│   │   └── po/          # 持久化对象
│   ├── vo/                # 视图对象（返回前端）
│   ├── dto/               # 数据传输对象（服务间/MQ）
│   ├── param/             # 请求参数对象
│   ├── constants/          # 常量
│   ├── enums/             # 枚举
│   ├── api/               # 对外 API 接口
│   ├── config/            # 配置类
│   ├── mq/                # 消息队列监听器
│   ├── task/              # 定时任务
│   ├── handle/            # 业务处理器（策略模式）
│   └── util/              # 工具类
```

## 类命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| Controller | `XxxController` | `OrderController` |
| Service 接口 | `XxxService` | `OrderService` |
| Service 实现 | `XxxServiceImpl` | `OrderServiceImpl` |
| Mapper | `XxxMapper` | `OrderMapper` |
| Entity | `Xxx` 或 `XxxEntity` | `Order` |
| PO | `XxxPO` | `OrderPO` |
| VO | `XxxVO` | `OrderVO` |
| DTO | `XxxDTO` | `OrderDTO` |
| Param | `XxxParam` / `XxxQueryParam` | `OrderQueryParam` |
| Enum | `XxxEnum` | `OrderStatusEnum` |
| Converter | `XxxConverter` | `OrderConverter` |
| Handler | `XxxHandler` | `OrderHandler` |
| Api | `XxxApi` | `OrderApi` |

## 方法命名规范

| 操作 | Service 方法 | Mapper 方法 | Controller URL |
|------|-------------|-------------|---------------|
| 分页查询 | `pageXxx` | `pageXxx` | `GET /list` |
| 查询列表 | `listXxx` | `listXxx` | - |
| 查询单个 | `getXxx` | `selectById` | `GET /{id}` |
| 新增 | `save` / `add` / `create` | `insert` | `POST /` |
| 更新 | `update` / `modify` | `updateById` | `PUT /` |
| 删除 | `delete` / `remove` | `deleteById` | `DELETE /{ids}` |
| 统计 | `count` / `summary` | `selectCount` | - |
| 导出 | `export` | - | `POST /export` |
| 同步 | `sync` | - | - |

## Controller 层模板

```java
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.common.exception.LeException;
import net.xnzn.core.common.response.LeResponse;
import net.xnzn.core.order.param.OrderQueryParam;
import net.xnzn.core.order.service.OrderService;
import net.xnzn.core.order.vo.OrderVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@Slf4j
@RequiresAuthentication
@RestController
@RequestMapping("/api/order")
@Api(value = "订单管理", tags = "订单管理")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @ApiOperation(value = "分页查询订单")
    @PostMapping("/list")
    public LeResponse<Page<OrderVO>> list(@Valid @RequestBody OrderQueryParam param) {
        return LeResponse.success(orderService.pageList(param));
    }

    @ApiOperation(value = "获取订单详情")
    @GetMapping("/{id}")
    public LeResponse<OrderVO> getById(@PathVariable Long id) {
        return LeResponse.success(orderService.getById(id));
    }

    @ApiOperation(value = "创建订单")
    @PostMapping("/")
    public LeResponse<Long> create(@Valid @RequestBody OrderParam param) {
        return LeResponse.success(orderService.create(param));
    }

    @ApiOperation(value = "更新订单")
    @PutMapping("/")
    public LeResponse<Boolean> update(@Valid @RequestBody OrderParam param) {
        return LeResponse.success(orderService.update(param));
    }

    @ApiOperation(value = "删除订单")
    @DeleteMapping("/{ids}")
    public LeResponse<Boolean> delete(@PathVariable String ids) {
        return LeResponse.success(orderService.delete(ids));
    }
}
```

**要点**：
- 统一使用 `@PostMapping`（部分查询也可以用 `@GetMapping`）
- 需要 `@RequiresAuthentication` 认证注解
- 使用 `LeResponse<T>` 封装返回结果
- 参数校验使用 `@Valid` 触发

## Service 层模板

```java
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.bean.BeanUtil;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.common.exception.LeException;
import net.xnzn.core.order.mapper.OrderMapper;
import net.xnzn.core.order.model.Order;
import net.xnzn.core.order.param.OrderParam;
import net.xnzn.core.order.vo.OrderVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderMapper orderMapper;

    @Autowired
    @Lazy
    private ProductService productService;

    @Transactional(rollbackFor = Exception.class)
    public Long create(OrderParam param) {
        // 业务逻辑
        Order order = BeanUtil.copyProperties(param, Order.class);
        orderMapper.insert(order);
        return order.getId();
    }

    public OrderVO getById(Long id) {
        Order order = orderMapper.selectById(id);
        if (ObjectUtil.isNull(order)) {
            throw new LeException("订单不存在");
        }
        return BeanUtil.copyProperties(order, OrderVO.class);
    }

    public List<OrderVO> list(OrderQueryParam param) {
        List<Order> orders = orderMapper.selectList(buildWrapper(param));
        return BeanUtil.copyToList(orders, OrderVO.class);
    }
}
```

**要点**：
- 使用 `@Slf4j` 日志注解
- 循环依赖使用 `@Lazy`
- 事务使用 `@Transactional(rollbackFor = Exception.class)`
- 使用 Hutool 工具类：`BeanUtil`、`ObjectUtil`

## Entity 实体类模板

```java
import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName(value = "order_table", autoResultMap = true)
public class Order {

    @TableId
    @ApiModelProperty(value = "订单ID")
    private Long id;

    @ApiModelProperty(value = "用户ID")
    private Long userId;

    @ApiModelProperty(value = "订单金额（分）")
    private Long amount;

    @ApiModelProperty(value = "删除标识(1-删除,2-正常)")
    private Integer delFlag;

    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建人")
    private String crby;

    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建时间")
    private LocalDateTime crtime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新人")
    private String upby;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新时间")
    private LocalDateTime uptime;
}
```

**要点**：
- 使用 `@TableName` 指定表名
- 主键使用 `@TableId`
- 字段使用 `@TableField` 映射
- 审计字段：`delFlag`（1=删除，2=正常）、`crby`、`crtime`、`upby`、`uptime`

## VO/DTO 类模板

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.experimental.Accessors;

@Data
@ApiModel("订单信息")
@Accessors(chain = true)
public class OrderVO {

    @ApiModelProperty("订单ID")
    private Long id;

    @ApiModelProperty("用户ID")
    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @ApiModelProperty("订单金额（元）")
    @NotNull(message = "订单金额不能为空")
    @DecimalMin(value = "0.01", message = "金额必须大于0.01")
    private BigDecimal amount;

    @ApiModelProperty("订单状态")
    private Integer status;
}
```

**要点**：
- 使用 `@ApiModel` 类注解
- 使用 `@ApiModelProperty` 字段注解
- 参数校验使用 `jakarta.validation.constraints.*` 注解
- 使用 `@Accessors(chain = true)` 支持链式调用

## 枚举类模板

```java
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum OrderStatusEnum {

    CREATED(1, "已创建"),
    PAID(2, "已支付"),
    COMPLETED(3, "已完成"),
    CANCELLED(4, "已取消");

    private final Integer key;
    private final String desc;

    public static OrderStatusEnum getByKey(Integer key) {
        if (key == null) {
            return null;
        }
        for (OrderStatusEnum status : values()) {
            if (status.getKey().equals(key)) {
                return status;
            }
        }
        return null;
    }

    public static boolean isExistKey(Integer key) {
        return getByKey(key) != null;
    }
}
```

**要点**：
- 使用 `@Getter` 和 `@AllArgsConstructor`
- 提供 `getByKey` 静态方法
- 提供 `isExistKey` 校验方法

## 依赖注入规范

```java
// 推荐：字段注入
@Autowired
private OrderService orderService;

// 解决循环依赖
@Resource
@Lazy
private ProductService productService;
```

## 异常处理

```java
import net.xnzn.core.common.exception.LeException;
import net.xnzn.core.common.i18n.I18n;

// 简单异常
throw new LeException("订单不存在");

// 国际化异常
throw new LeException(I18n.getMessage("order.not.exists"));

// 带参数的国际化
throw new LeException(I18n.getMessage("order.status.invalid", status));
```

## Hutool 工具类速查

```java
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.bean.BeanUtil;

// 集合操作
if (CollUtil.isEmpty(list)) {
    throw new LeException("列表不能为空");
}
if (CollUtil.isNotEmpty(list)) {
    // 处理列表
}

// 对象判空
if (ObjectUtil.isNull(user)) {
    throw new LeException("用户不存在");
}
if (ObjectUtil.isNotNull(user)) {
    // 处理用户
}

// 字符串操作
if (StrUtil.isBlank(name)) {
    throw new LeException("名称不能为空");
}
String trimmed = StrUtil.trim(name);
String joined = StrUtil.join(",", list);

// 对象拷贝
TargetDTO target = BeanUtil.copyProperties(source, TargetDTO.class);
List<TargetDTO> targets = BeanUtil.copyToList(sources, TargetDTO.class);
```

## 常用注解

### Jakarta Validation

**重要**：项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
```

- `@NotNull` - 不能为 null
- `@NotBlank` - 字符串不能为空
- `@NotEmpty` - 集合不能为空
- `@Valid` - 触发参数校验

### Lombok

- `@Data` - 生成 getter/setter
- `@Slf4j` - 日志
- `@Builder` - 建造者模式
- `@AllArgsConstructor` - 全参构造
- `@Accessors(chain = true)` - 链式调用

### MyBatis-Plus

- `@TableName` - 表名映射
- `@TableId` - 主键
- `@TableField` - 字段映射
- `@TableField(fill = FieldFill.INSERT)` - 插入时自动填充
- `@TableField(fill = FieldFill.INSERT_UPDATE)` - 更新时自动填充

## 类注释规范

推荐使用 JavaDoc 标准格式：

```java
/**
 * 类功能描述
 *
 * @author xujiajun
 * @date 2026-02-20
 */
public class OrderService {
    // ...
}
```

**说明**：
- `@author` 使用实际作者名称
- `@date` 使用代码创建日期（格式：`YYYY-MM-DD`）

## 常见错误

### 错误1：使用 RuoYi 的包名

```java
// ❌ 错误：使用 RuoYi 的包名
package org.dromara.system.service;

// ✅ 正确：使用 leniu 的包名
package net.xnzn.core.order.service;
```

### 错误2：使用 javax.validation

```java
// ❌ 错误：使用 javax.validation（JDK 21 应该用 jakarta）
import javax.validation.constraints.NotNull;

// ✅ 正确：使用 jakarta.validation
import jakarta.validation.constraints.NotNull;
```

### 错误3：使用 MapstructUtils

```java
// ❌ 错误：使用 RuoYi 的工具类
import org.dromara.common.core.utils.MapstructUtils;
Target target = MapstructUtils.convert(source, Target.class);

// ✅ 正确：leniu 使用 Hutool
import cn.hutool.core.bean.BeanUtil;
Target target = BeanUtil.copyProperties(source, Target.class);
```

### 错误4：使用 LeException 不使用 I18n

```java
// ❌ 不推荐：直接硬编码中文
throw new LeException("订单不存在");

// ✅ 推荐：使用国际化
throw new LeException(I18n.getMessage("order.not.exists"));
```

### 错误5：使用 RuoYi 的 ServiceException

```java
// ❌ 错误：使用 RuoYi 的异常
import org.dromara.common.core.exception.ServiceException;

// ✅ 正确：使用 leniu 的异常
import net.xnzn.core.common.exception.LeException;
```

## 参考文档

详见：[leniu-tengyun-core 源码](/Users/xujiajun/Developer/gongsi_proj/core/leniu-tengyun-core)
