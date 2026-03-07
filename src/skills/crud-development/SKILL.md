---
name: crud-development
description: |
  通用 CRUD 开发指南。基于 Spring Boot 三层架构（Controller -> Service -> Mapper），
  提供 Entity、DTO、VO、Service、Controller 的标准模板。
  触发场景：新增业务模块、增删改查开发、快速生成 CRUD 代码。
  触发词：CRUD、增删改查、新增模块、生成代码。
  注意：如果项目有专属技能（如 `leniu-crud`），优先使用专属版本。
---

# CRUD 开发指南

> 通用模板。如果项目有专属技能（如 `leniu-crud`），优先使用。

## 核心规范

### 三层架构

| 层 | 职责 | 命名示例 |
|----|------|---------|
| Controller | 接收请求、参数校验、路由分发 | `OrderController` |
| Service | 业务逻辑、事务管理 | `OrderService` / `OrderServiceImpl` |
| Mapper | 数据访问（ORM 映射） | `OrderMapper` |

### 标准包结构

```
[你的包名]/
├── controller/        # 控制器
├── service/
│   └── impl/          # 服务实现
├── mapper/            # 数据访问层
├── entity/            # 实体类
├── dto/               # 请求参数对象
├── vo/                # 响应视图对象
├── enums/             # 枚举常量
└── config/            # 模块配置
```

## 代码示例

### 1. Entity（实体类）

```java
package [你的包名].entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_order")
public class Order {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String orderNo;

    private Integer status;

    private Long amount;

    @TableField(fill = FieldFill.INSERT)
    private String createBy;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String updateBy;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableLogic(value = "0", delval = "1")
    private Integer deleted;
}
```

### 2. DTO（请求参数）

```java
package [你的包名].dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class OrderCreateDTO {

    @NotBlank(message = "订单号不能为空")
    private String orderNo;

    @NotNull(message = "金额不能为空")
    @Min(value = 1, message = "金额必须大于0")
    private Long amount;
}
```

```java
package [你的包名].dto;

import lombok.Data;

@Data
public class OrderQueryDTO {

    private String orderNo;

    private Integer status;

    private Integer pageNum = 1;

    private Integer pageSize = 10;
}
```

### 3. VO（响应对象）

```java
package [你的包名].vo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OrderVO {

    private Long id;

    private String orderNo;

    private Integer status;

    private Long amount;

    private LocalDateTime createTime;
}
```

### 4. Mapper

```java
package [你的包名].mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import [你的包名].entity.Order;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderMapper extends BaseMapper<Order> {
}
```

### 5. Service

```java
package [你的包名].service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import [你的包名].entity.Order;
import [你的包名].dto.OrderCreateDTO;
import [你的包名].dto.OrderQueryDTO;
import [你的包名].vo.OrderVO;

public interface IOrderService extends IService<Order> {

    Long createOrder(OrderCreateDTO dto);

    void updateOrder(Long id, OrderCreateDTO dto);

    OrderVO getOrderDetail(Long id);

    Page<OrderVO> pageQuery(OrderQueryDTO query);
}
```

```java
package [你的包名].service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import [你的包名].dto.OrderCreateDTO;
import [你的包名].dto.OrderQueryDTO;
import [你的包名].entity.Order;
import [你的包名].mapper.OrderMapper;
import [你的包名].service.IOrderService;
import [你的包名].vo.OrderVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements IOrderService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createOrder(OrderCreateDTO dto) {
        Order order = new Order();
        // 使用 [你的对象转换工具] 或手动赋值
        order.setOrderNo(dto.getOrderNo());
        order.setAmount(dto.getAmount());
        order.setStatus(0);
        this.save(order);
        return order.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateOrder(Long id, OrderCreateDTO dto) {
        Order order = this.getById(id);
        if (order == null) {
            throw new [你的业务异常类]("订单不存在");
        }
        order.setOrderNo(dto.getOrderNo());
        order.setAmount(dto.getAmount());
        this.updateById(order);
    }

    @Override
    public OrderVO getOrderDetail(Long id) {
        Order order = this.getById(id);
        if (order == null) {
            throw new [你的业务异常类]("订单不存在");
        }
        OrderVO vo = new OrderVO();
        // 使用 [你的对象转换工具] 或手动赋值
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setStatus(order.getStatus());
        vo.setAmount(order.getAmount());
        vo.setCreateTime(order.getCreateTime());
        return vo;
    }

    @Override
    public Page<OrderVO> pageQuery(OrderQueryDTO query) {
        Page<Order> page = new Page<>(query.getPageNum(), query.getPageSize());
        LambdaQueryWrapper<Order> wrapper = new LambdaQueryWrapper<Order>()
                .like(StringUtils.hasText(query.getOrderNo()), Order::getOrderNo, query.getOrderNo())
                .eq(query.getStatus() != null, Order::getStatus, query.getStatus())
                .orderByDesc(Order::getCreateTime);
        Page<Order> result = this.page(page, wrapper);

        // 转换为 VO
        Page<OrderVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        voPage.setRecords(result.getRecords().stream().map(order -> {
            OrderVO vo = new OrderVO();
            vo.setId(order.getId());
            vo.setOrderNo(order.getOrderNo());
            vo.setStatus(order.getStatus());
            vo.setAmount(order.getAmount());
            vo.setCreateTime(order.getCreateTime());
            return vo;
        }).toList());
        return voPage;
    }
}
```

### 6. Controller

```java
package [你的包名].controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import [你的包名].dto.OrderCreateDTO;
import [你的包名].dto.OrderQueryDTO;
import [你的包名].service.IOrderService;
import [你的包名].vo.OrderVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final IOrderService orderService;

    @PostMapping
    public ResponseEntity<Long> create(@Valid @RequestBody OrderCreateDTO dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> update(@PathVariable Long id,
                                       @Valid @RequestBody OrderCreateDTO dto) {
        orderService.updateOrder(id, dto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderVO> detail(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderDetail(id));
    }

    @GetMapping
    public ResponseEntity<Page<OrderVO>> page(OrderQueryDTO query) {
        return ResponseEntity.ok(orderService.pageQuery(query));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        orderService.removeById(id);
        return ResponseEntity.ok().build();
    }
}
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| Controller 里写业务逻辑 | 业务逻辑放 Service 层 |
| 直接返回 Entity 给前端 | 使用 VO 封装响应数据 |
| 用 Map 传递业务数据 | 使用 DTO/VO 强类型对象 |
| 忘记加 `@Transactional` | 写操作方法加事务注解 |
| 逻辑删除字段值搞反 | 确认项目约定（通用：0=正常, 1=删除） |
| 分页参数未设默认值 | DTO 中给 pageNum/pageSize 默认值 |
| Service 之间循环依赖 | 提取公共 Service 或使用事件机制解耦 |
