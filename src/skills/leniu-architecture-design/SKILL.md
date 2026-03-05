---
name: leniu-architecture-design
description: |
  leniu-tengyun-core 项目架构设计指南。基于 pigx-framework 的云食堂双库架构，包含四层架构规范、双库多租户实现、模块划分、Entity 设计。

  触发场景：
  - 新模块/新功能的架构设计与代码分层
  - 双库架构（系统库+商户库）数据路由决策
  - 四层架构（Controller→Business→Service→Mapper）编排
  - 多租户数据隔离与跨租户操作
  - Entity/DTO/VO 结构设计
  - Mapper XML 文件放置与配置

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：架构设计、双库架构、商户库、系统库、pigx框架、四层架构、模块划分、Business层、分层设计、代码结构
---

# leniu-tengyun-core 架构设计指南

## 双库架构

物理分离双库，**Entity 无 tenant_id 字段**：

| 库类型 | 数据范围 | 访问方式 |
|--------|---------|---------|
| **系统库** | 租户信息、商户配置、系统字典 | `Executors.doInSystem()` |
| **商户库** | 订单、菜品、用户、设备等 | 默认（请求头 `MERCHANT-ID`） |

### 多租户上下文切换

```java
// 获取当前租户
Long tenantId = TenantContextHolder.getTenantId();

// 在指定商户库执行
Executors.doInTenant(tenantId, () -> { /* 商户库 */ });

// 在系统库执行
Executors.doInSystem(() -> { /* 系统库 */ });

// 遍历所有租户执行（定时任务场景）
Executors.doInAllTenant(tenantId -> { /* 每个租户 */ });
```

### 双库路由场景

```java
// 场景1：商户业务（默认，前端请求头携带 MERCHANT-ID）
@PostMapping("/order/add")
public void addOrder(@RequestBody LeRequest<OrderDTO> request) {
    orderService.add(request.getContent()); // 自动路由商户库
}

// 场景2：系统配置操作
@PostMapping("/merchant/config")
public void updateConfig(@RequestBody LeRequest<ConfigDTO> request) {
    Executors.doInSystem(() -> configService.update(request.getContent()));
}

// 场景3：定时任务遍历所有租户
public void execute() {
    Executors.doInAllTenant(tenantId -> reportService.generate(tenantId));
}

// 场景4：MQ 消费指定租户
@RabbitListener(queues = "order.queue")
public void consumeOrder(Message message) {
    Long tenantId = getTenantFromMessage(message);
    Executors.doInTenant(tenantId, () -> orderService.process(message));
}
```

---

## 四层架构

```
Controller → Business → Service → Mapper
```

| 层 | 职责 | 命名 |
|----|------|------|
| **Controller** | 接收请求、参数校验、路由分端 | `XxxWebController` |
| **Business** | 业务编排、跨 Service 协调 | `XxxWebBusiness` |
| **Service** | 单表 CRUD、事务 | `XxxServiceImpl` |
| **Mapper** | ORM 映射（XML 同目录） | `XxxMapper` |

> **Business 层**是本项目核心特色，复杂逻辑在此编排，简单 CRUD 可跳过直接 Controller→Service。

### Controller 示例

```java
package net.xnzn.core.xxx.controller;

import com.pig4cloud.pigx.common.core.util.LeRequest;
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;

@RestController
@RequiresAuthentication
@RequestMapping("/api/v2/web/xxx")
public class XxxWebController {

    @Autowired
    private XxxWebBusiness xxxBusiness;

    @PostMapping("/add")
    public void add(@Validated @RequestBody LeRequest<XxxDTO> request) {
        xxxBusiness.add(request.getContent());
    }

    @PostMapping("/query")
    public Page<XxxVO> query(@Validated @RequestBody LeRequest<PageDTO> request) {
        return xxxBusiness.query(request.getContent());
    }
}
```

### Business 示例

```java
package net.xnzn.core.xxx.business.impl;

@Component
public class XxxWebBusiness {

    @Autowired
    private XxxServiceImpl xxxService;
    @Autowired
    private YyyServiceImpl yyyService;

    public void add(XxxDTO dto) {
        // 编排多个 Service
        xxxService.add(dto);
        yyyService.bindRelation(dto.getId());
    }

    public Page<XxxVO> query(PageDTO dto) {
        return xxxService.query(dto);
    }
}
```

### Service 示例

```java
package net.xnzn.core.xxx.service.impl;

@Service
public class XxxServiceImpl {
    @Autowired
    private XxxMapper xxxMapper;

    public void add(XxxDTO dto) {
        long id = Id.next();
        XxxEntity entity = new XxxEntity();
        BeanUtil.copyProperties(dto, entity);
        entity.setId(id);
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

@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {
    Page<XxxVO> page(Page<Object> page, @Param("keyword") String keyword);
}
```

### Mapper XML（与 Java 同目录）

```
src/main/java/net/xnzn/core/xxx/mapper/
├── XxxMapper.java
└── XxxMapper.xml    ← 同目录，非 resources/mapper/
```

**pom.xml 必须配置资源过滤：**
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
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="net.xnzn.core.xxx.mapper.XxxMapper">
    <select id="page" resultType="net.xnzn.core.xxx.vo.XxxVO">
        SELECT id, name, status, crtime, uptime
        FROM xxx_table
        WHERE del_flag = 2
        <if test="keyword != null and keyword != ''">
            AND name LIKE CONCAT('%', #{keyword}, '%')
        </if>
    </select>
</mapper>
```

---

## 多端 Controller 路由

| 端 | 路由前缀 | Controller 命名 |
|----|---------|----------------|
| Web 管理端 | `/api/v2/web/{module}` | `XxxWebController` |
| 移动端 | `/api/v2/mobile/{module}` | `XxxMobileController` |
| 设备端 | `/api/v2/android/{module}` | `XxxAndroidController` |
| 开放接口 | `/api/v2/open/{module}` | `XxxOpenController` |

---

## Entity 设计

```java
package net.xnzn.core.xxx.model;

@Data
@TableName("xxx_table")
public class XxxEntity {

    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;  // 雪花ID：Id.next()

    private String name;
    private Integer status;

    // 审计字段
    @TableField(fill = FieldFill.INSERT)
    private String crby;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime crtime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String upby;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;

    // 逻辑删除：1=删除，2=正常
    private Integer delFlag;
}
```

### DelFlagEnum

```java
public enum DelFlagEnum {
    DEL_TRUE(1, "删除"),
    DEL_FALSE(2, "正常");

    private final Integer key;
    private final String val;
}
```

### 对应建表 SQL

```sql
CREATE TABLE xxx_table (
    id       BIGINT      NOT NULL COMMENT '主键（雪花ID）',
    name     VARCHAR(100) COMMENT '名称',
    status   INT          COMMENT '状态',
    crby     VARCHAR(64)  COMMENT '创建人',
    crtime   DATETIME     COMMENT '创建时间',
    upby     VARCHAR(64)  COMMENT '更新人',
    uptime   DATETIME     COMMENT '更新时间',
    del_flag INT DEFAULT 2 COMMENT '删除标识(1-删除,2-正常)',
    PRIMARY KEY (id)
);
-- 无需 tenant_id（双库物理隔离）
```

---

## 请求响应封装

```java
// 请求体：LeRequest<T> 包装
@PostMapping("/add")
public void add(@Validated @RequestBody LeRequest<XxxDTO> request) {
    XxxDTO dto = request.getContent();
}

// 分页请求
@PostMapping("/query")
public Page<XxxVO> query(@Validated @RequestBody LeRequest<PageDTO> request) {
    return xxxService.query(request.getContent());
}
```

### PageDTO

```java
@Data
public class PageDTO {
    @NotNull @Min(1)
    private Integer pageNum;
    @NotNull @Min(1)
    private Integer pageSize;
    private String keyword;

    public Page<Object> getMpPage() {
        return new Page<>(pageNum, pageSize);
    }
}
```

---

## 异常与国际化

```java
// 业务异常
throw new LeException("业务错误信息");

// 带国际化
throw new LeException(I18n.getMessage("error.key"));
```

---

## 项目模块结构

```
leniu-tengyun-core/
├── core-base/          # 公共基础模块
├── sys-common/         # 公共业务（支付、通知、对接）
├── sys-canteen/        # 食堂业务
├── sys-kitchen/        # 后场厨房
├── sys-drp/            # 供应链
├── sys-logistics/      # 物流
└── sys-open/           # 开放接口
```

### 标准包结构

```
net.xnzn.core.[module]/
├── controller/         # 按端分：web/mobile/android
├── business/impl/      # 业务编排
├── service/impl/       # 服务层
├── mapper/             # Mapper + XML（同目录）
├── model/              # Entity
├── vo/                 # 响应对象
├── dto/                # 请求参数
├── constants/          # 枚举和常量
├── mq/                 # 消息队列
└── task/               # 定时任务
```

---

## 参考代码位置

| 类型 | 路径 |
|------|------|
| 订单 Controller | `sys-canteen/.../order/web/controller/OrderInfoWebController.java` |
| 订单 Business | `sys-canteen/.../order/web/business/impl/OrderWebBusiness.java` |
| 订单 Service | `sys-canteen/.../order/common/service/impl/OrderInfoService.java` |
| 排班 Controller | `sys-kitchen/.../attendance/scheduling/controller/BackAttendanceWorkShiftController.java` |
| Bootstrap 配置 | `core-base/src/main/resources/bootstrap.yml` |
