---
name: leniu-architecture-design
description: |
  leniu-yunshitang-core 项目架构设计指南。基于 pigx-framework 框架的云食堂双库架构，包含三层架构规范、双库多租户实现、业务模块划分、Entity 设计规范。

  触发场景：
  - 云食堂项目系统整体架构设计
  - 双库架构（系统库+商户库）的业务模块规划
  - 三层架构代码分层与重构策略
  - 多租户数据隔离设计
  - Entity 审计字段与逻辑删除设计

  触发词：leniu架构、云食堂架构、双库架构、商户库、系统库、net.xnzn、pigx框架
---

# leniu-yunshitang-core 架构设计指南

## 项目概述

leniu-yunshitang-core 是基于 **pigx-framework** 的智慧食堂云服务平台，采用**双库架构**（系统库 + 商户库）实现多租户隔离。

**核心特点：**
- JDK 21 + Spring Boot 3.x
- 双库架构：系统库（全局数据）+ 商户库（租户数据）
- 包名：`net.xnzn.*`
- 租户识别：请求头 `MERCHANT-ID`
- 审计字段：`crby/crtime/upby/uptime`
- 逻辑删除：`del_flag`（1=删除，2=正常，注意与 RuoYi 相反）

---

## 双库架构设计

### 架构说明

本项目采用**物理分离的双库架构**，而非单库多租户：

| 库类型 | 说明 | 数据范围 | 访问方式 |
|--------|------|---------|---------|
| **系统库** | 全局系统数据 | 租户信息、商户配置、系统字典等 | 默认访问（无 MERCHANT-ID） |
| **商户库** | 租户业务数据 | 订单、菜品、用户、设备等商户数据 | 请求头携带 MERCHANT-ID 时访问 |

**关键区别：**
- Entity 不需要 `tenant_id` 字段（物理库隔离）
- 通过 `TenantContextHolder.getTenantId()` 获取当前租户
- 使用 `Executors.doInTenant()` / `doInSystem()` 切换库

### 双库配置示例

```yaml
# bootstrap.yml
dataset:
  system:
    master:
      jdbcUrl: jdbc:mysql://${MYSQL_HOST:mysql}:${MYSQL_PORT:3306}/system
      username: ${MYSQL_USERNAME:root}
      password: ${MYSQL_PASSWORD:do@u.can}

tenant:
  carrier-name: MERCHANT-ID
```

### 多租户上下文

```java
// 获取当前租户ID
Long tenantId = TenantContextHolder.getTenantId();

// 在指定租户库执行操作
Executors.doInTenant(tenantId, () -> {
    // 业务代码 - 访问商户库
});

// 在系统库执行操作
Executors.doInSystem(() -> {
    // 业务代码 - 访问系统库
});

// 遍历所有租户执行
Executors.doInAllTenant(tenantId -> {
    // 业务代码
});
```

---

## 本项目技术栈

### 核心技术栈

| 层级 | 技术栈 | 版本 | 说明 |
|------|--------|------|------|
| **后端框架** | Spring Boot | 3.x | 核心框架 |
| **开发语言** | Java | 21 | LTS 版本 |
| **ORM** | MyBatis-Plus | 3.x | 持久层框架 |
| **基础框架** | pigx-framework | 3.4.7 | 企业级开发框架 |
| **数据库** | MySQL | 8.0+ | 双库架构 |
| **缓存** | Redis + Redisson | - | 分布式缓存 |
| **容器** | Undertow | - | Web 容器（替换 Tomcat） |

### 项目模块结构

```
leniu-tengyun-core/
├── core-base/                    # 公共基础模块
├── core-aggregator/              # 聚合器
├── sys-common/                   # 公共业务模块（支付、通知、对接等）
├── sys-canteen/                 # 食堂业务模块
├── sys-kitchen/                 # 后场厨房模块
├── sys-drp/                    # 供应链模块
├── sys-logistics/               # 物流模块
└── sys-open/                   # 开放接口模块
```

---

## 三层架构规范

本项目采用 **三层架构**：Controller → Service → Mapper

**没有独立的 DAO 层！**

```
┌──────────────────────────────────────────────────────────────┐
│                    Controller 层                            │
│     • 接收 HTTP 请求、参数校验、返回 Page<T>            │
│     • 使用 LeRequest<T> 封装请求体                       │
│     • 使用 @RequiresAuthentication 权限控制                 │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      Service 层                           │
│     • 业务逻辑处理、事务管理、编排协调                      │
│     • 直接注入 Mapper（无 DAO 层）                         │
│     • 使用 MyBatis-Plus LambdaQueryWrapper                   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      Mapper 层                             │
│     • extends BaseMapper<Entity>                             │
│     • MyBatis-Plus ORM 映射、SQL 执行                    │
└──────────────────────────────────────────────────────────────┘
```

### Controller 示例

```java
package net.xnzn.core.xxx.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pig4cloud.pigx.common.core.util.LeRequest;
import com.pig4cloud.pigx.common.core.exception.LeException;
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiresAuthentication
@RequestMapping("/xxx/resource")
public class XxxResourceController {

    @Autowired
    private XxxServiceImpl xxxService;

    @PostMapping("/add")
    public void add(@Validated @RequestBody LeRequest<XxxDTO> request) {
        xxxService.add(request.getContent());
    }

    @PostMapping("/query")
    public Page<XxxVO> query(@Validated @RequestBody LeRequest<PageDTO> request) {
        return xxxService.query(request.getContent());
    }
}
```

### Service 示例

```java
package net.xnzn.core.xxx.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import net.xnzn.core.common.enums.DelFlagEnum;
import net.xnzn.framework.id.Id;
import org.springframework.stereotype.Service;

@Service
public class XxxServiceImpl {
    @Autowired
    private XxxMapper xxxMapper;

    public void add(XxxDTO dto) {
        long id = Id.next();
        XxxEntity entity = dto.toEntity(id);
        xxxMapper.insert(entity);
    }

    public Page<XxxVO> query(PageDTO dto) {
        return xxxMapper.page(dto.getMpPage(), dto.getKeyword());
    }
}
```

### Mapper 示例

```java
package net.xnzn.core.xxx.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import net.xnzn.core.xxx.model.XxxEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {
    // 自定义查询方法
}
```

### ⚠️ Mapper XML 文件位置（重要差异）

**leniu-yunshitang-core 的 XML 文件与 Java Mapper 放在同一目录**，而非传统的 `resources/mapper/` 目录！

```
src/main/java/net/xnzn/core/xxx/mapper/
├── XxxMapper.java           # Java 接口
└── XxxMapper.xml            # XML 映射文件（同目录！）
```

**对比 RuoYi-Vue-Plus：**
```
# RuoYi-Vue-Plus 传统方式
src/main/java/.../mapper/XxxMapper.java
src/main/resources/mapper/XxxMapper.xml  # XML 在 resources 目录
```

**配置要求：**
需要在 `pom.xml` 中配置资源过滤，让 Maven 将 Java 目录下的 XML 文件也打包：

```xml
<build>
    <resources>
        <resource>
            <directory>src/main/java</directory>
            <includes>
                <include>**/*.xml</include>
            </includes>
        </resource>
        <resource>
            <directory>src/main/resources</directory>
        </resource>
    </resources>
</build>
```

**XML 文件示例：**
```xml
<!-- XxxMapper.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="net.xnzn.core.xxx.mapper.XxxMapper">

    <select id="page" resultType="net.xnzn.core.xxx.vo.XxxVO">
        SELECT * FROM xxx_table
        WHERE del_flag = 2
        <if test="keyword != null and keyword != ''">
            AND name LIKE CONCAT('%', #{keyword}, '%')
        </if>
    </select>

</mapper>
```

---

## Entity 设计规范

### Entity 审计字段

```java
package net.xnzn.core.xxx.model;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("xxx_table")
public class XxxEntity {

    // 主键（雪花ID或自增）
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    // 业务字段
    private String name;
    private Integer status;

    // 审计字段
    @TableField(fill = FieldFill.INSERT)
    private String crby;       // 创建人

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime crtime; // 创建时间

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String upby;       // 更新人

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime; // 更新时间

    // 逻辑删除（注意：1=删除，2=正常，与 RuoYi 相反）
    private Integer delFlag;
}
```

### 审计字段说明

| 字段 | 含义 | 自动填充 |
|------|------|---------|
| `crby` | 创建人 | INSERT |
| `crtime` | 创建时间 | INSERT |
| `upby` | 更新人 | INSERT_UPDATE |
| `uptime` | 更新时间 | INSERT_UPDATE |
| `delFlag` | 逻辑删除（1=删除，2=正常） | 手动设置 |

**注意：**
- `del_flag` 值与 RuoYi-Vue-Plus 相反！
  - leniu：1=删除，2=正常
  - RuoYi：0=正常，1=删除

### DelFlagEnum 示例

```java
public enum DelFlagEnum {
    DEL_TRUE(1, "删除"),
    DEL_FALSE(2, "正常");

    private final Integer key;
    private final String val;
}
```

---

## 请求响应封装

### LeRequest 请求封装

```java
@Data
public class LeRequest<T> {
    @NotNull(message = "请求内容不能为空")
    private T content;  // 实际请求数据
}

// 使用方式
@PostMapping("/add")
public void add(@RequestBody LeRequest<XxxDTO> request) {
    XxxDTO dto = request.getContent();  // 获取实际数据
}
```

### PageDTO 分页参数

```java
@Data
public class PageDTO {
    @NotNull
    @Min(1)
    private Integer pageNum;  // 当前页

    @NotNull
    @Min(1)
    private Integer pageSize; // 每页条数

    private String keyword;   // 搜索关键词

    // 转换为 MyBatis-Plus Page
    public Page<Object> getMpPage() {
        return new Page<>(pageNum, pageSize);
    }
}
```

### 分页响应

```java
// 直接返回 MyBatis-Plus Page
public Page<XxxVO> query(PageDTO dto) {
    return xxxMapper.page(dto.getMpPage(), dto.getKeyword());
}
```

---

## 异常处理

### LeException 业务异常

```java
import com.pig4cloud.pigx.common.core.exception.LeException;

// 抛出业务异常
throw new LeException("业务错误信息");

// 带国际化消息
import net.xnzn.framework.config.i18n.I18n;
throw new LeException(I18n.getMessage("error.key"));
```

---

## 国际化

### 消息文件配置

```yaml
# bootstrap.yml
spring:
  messages:
    basename: "message_canteen_ext,message_common_ext,..."
```

### 使用方式

```java
import net.xnzn.framework.config.i18n.I18n;

// 获取国际化消息
String message = I18n.getMessage("key");
throw new LeException(I18n.getMessage("error.key"));
```

---

## 权限控制

### @RequiresAuthentication 注解

```java
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;

@RestController
@RequiresAuthentication  // 需要认证
@RequestMapping("/xxx")
public class XxxController {
}
```

---

## 双库路由最佳实践

### 场景1：商户业务（默认）

```java
@PostMapping("/order/add")
public void addOrder(@RequestBody LeRequest<OrderDTO> request) {
    // 前端请求头携带 MERCHANT-ID
    // 自动路由到商户库，无需额外处理
    orderService.add(request.getContent());
}
```

### 场景2：系统配置操作

```java
@PostMapping("/merchant/config")
public void updateMerchantConfig(@RequestBody LeRequest<ConfigDTO> request) {
    // 强制在系统库执行
    Executors.doInSystem(() -> {
        configService.update(request.getContent());
    });
}
```

### 场景3：跨租户操作（定时任务）

```java
@Component
public class DailyDataTask {

    public void execute() {
        // 遍历所有租户执行
        Executors.doInAllTenant(tenantId -> {
            dailyReportService.generateReport(tenantId);
        });
    }
}
```

### 场景4：消息消费指定租户

```java
@RabbitListener(queues = "order.queue")
public void consumeOrder(Message message) {
    Long tenantId = getTenantFromMessage(message);
    // 在指定租户库执行
    Executors.doInTenant(tenantId, () -> {
        orderService.process(message);
    });
}
```

---

## 常见设计规范

### 模块包结构

```
net.xnzn.core.xxx/
├── controller/          # 控制器
├── service/
│   └── impl/          # 服务实现（不要求接口）
├── mapper/             # MyBatis Mapper
├── model/             # 实体类
├── dto/               # 数据传输对象
├── vo/                # 视图对象
└── util/              # 工具类
```

### 命名规范

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| Controller | `XxxResourceController` | `OrderResourceController` |
| Service | `XxxService` / `XxxServiceImpl` | `OrderService` |
| Mapper | `XxxMapper` | `OrderMapper` |
| Entity | `XxxEntity` | `OrderEntity` |
| DTO | `XxxDTO` | `OrderDTO` |
| VO | `XxxVO` | `OrderVO` |

### ID 生成

```java
import net.xnzn.framework.id.Id;

// 生成雪花ID
long id = Id.next();
```

---

## 与 RuoYi-Vue-Plus 对比

| 特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| **包名** | `org.dromara.*` | `net.xnzn.*` |
| **JDK** | 17 | 21 |
| **租户模式** | 单库多租户（tenant_id 字段） | 双库架构（物理库隔离） |
| **请求封装** | `Bo` | `LeRequest<T>` |
| **响应封装** | `R<T>`, `TableDataInfo<T>` | `Page<T>`, `void` |
| **异常类** | `ServiceException` | `LeException` |
| **国际化** | `MessageUtils.message()` | `I18n.getMessage()` |
| **权限注解** | `@SaCheckPermission` | `@RequiresAuthentication` |
| **审计字段** | `create_by/create_time/update_by/update_time` | `crby/crtime/upby/uptime` |
| **逻辑删除** | `del_flag` (0=正常, 1=删除) | `del_flag` (2=正常, 1=删除) |

---

## 快速检查清单

### 新模块设计检查

- [ ] **包路径正确**：`net.xnzn.xxx.*`
- [ ] **Entity 审计字段**：`crby/crtime/upby/uptime`
- [ ] **逻辑删除**：`delFlag`（1=删除，2=正常）
- [ ] **三层架构**：Controller → Service → Mapper
- [ ] **异常处理**：使用 `LeException`
- [ ] **权限控制**：`@RequiresAuthentication`
- [ ] **国际化**：使用 `I18n.getMessage()`
- [ ] **双库路由**：根据需要使用 `Executors.doInTenant/doInSystem`

### Entity 检查

- [ ] 主键配置：`@TableId(value = "id", type = IdType.AUTO)`
- [ ] 表名注解：`@TableName("table_name")`
- [ ] 审计字段自动填充：`@TableField(fill = FieldFill.INSERT/INSERT_UPDATE)`
- [ ] Lombok 注解：`@Data @Accessors(chain = true)`

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| Controller 示例 | `sys-kitchen/.../backfield/attendance/scheduling/controller/BackAttendanceWorkShiftController.java` |
| Service 示例 | `sys-kitchen/.../backfield/attendance/scheduling/service/impl/BackAttendanceWorkShiftServiceImpl.java` |
| Mapper 示例 | `sys-kitchen/.../backfield/attendance/scheduling/mapper/BackAttendanceWorkShiftMapper.java` |
| Entity 示例 | `sys-kitchen/.../backfield/attendance/scheduling/model/BackAttendanceWorkShift.java` |
| 配置文件 | `core-base/src/main/resources/bootstrap.yml` |
