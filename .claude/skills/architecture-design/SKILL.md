---
name: architecture-design
description: |
  系统架构设计、模块划分、代码重构、技术栈选型。核心内容：三层架构规范、业务模块划分、表设计规范、技术栈优先级决策。

  触发场景：
  - 系统整体架构设计
  - 新业务模块的模块划分与结构规划
  - 代码分层与重构策略
  - 依赖关系梳理与解耦
  - 架构演进路径建议（从单体到微服务）
  - 领域边界划分与包结构设计
  - 技术栈选型与方案决策

  触发词：架构设计、模块划分、三层架构、分层、领域划分、重构、解耦、依赖管理、系统设计、代码组织、技术栈、架构演进

  注意：
  1. 具体技术对比（Redis vs 本地缓存）→ 使用 tech-decision
  2. 开发具体 CRUD 模块 → 使用 crud-development
  3. 数据库建表与字典配置 → 使用 database-ops
  4. 本项目是纯后端项目（无前端代码）
---

# 架构设计指南

## 本项目技术栈

### 核心技术架构

| 层级 | 技术栈 | 版本 | 说明 |
|------|--------|------|------|
| **后端框架** | Spring Boot | 3.5.9 | 核心框架 |
| **开发语言** | Java | 17 | LTS 版本 |
| **ORM** | MyBatis-Plus | 3.5.16 | 持久层框架 |
| **安全** | Sa-Token | 1.44.0 | 认证授权 |
| **数据库** | MySQL 8.0+ | 8.0+ | 主数据库（支持多库） |
| **缓存** | Redis + Redisson | 3.52.0 | 分布式缓存 |
| **文档** | SpringDoc | 2.8.15 | API 文档 |
| **工具库** | Hutool | 5.8.43 | Java 工具集 |
| **对象转换** | Mapstruct-Plus | 1.5.0 | BO/VO/Entity 映射 |

**注：** 本项目是纯后端项目，前端项目独立维护。

### 扩展技术栈（按优先级）

#### 1️⃣ 高优先级技术（优先选择）

| 技术 | 优先级 | 使用场景 | 说明 |
|------|--------|---------|------|
| **Redis** | ⭐⭐⭐⭐⭐ | 缓存、分布式锁、延迟队列 | 优先选择（已集成 Redisson + Caffeine） |
| **WebSocket** | ⭐⭐⭐⭐⭐ | 实时推送、在线聊天、消息通知 | 实时通信首选（已集成） |
| **Sa-Token** | ⭐⭐⭐⭐⭐ | 权限控制、登录认证、单点登录 | 项目安全核心 |
| **Lock4j** | ⭐⭐⭐⭐⭐ | 分布式锁 | 基于 Redisson 实现（已集成） |
| **MyBatis-Plus** | ⭐⭐⭐⭐⭐ | ORM、CRUD | 项目数据访问核心 |
| **Redisson** | ⭐⭐⭐⭐⭐ | 分布式对象、布隆过滤器、延迟队列 | Redis 客户端增强（已集成） |
| **SnailJob** | ⭐⭐⭐⭐ | 分布式定时任务、复杂调度 | 项目定时任务框架（已集成） |

#### 2️⃣ 中优先级技术（按需使用）

| 技术 | 优先级 | 使用场景 | 说明 |
|------|--------|---------|------|
| **SSE** | ⭐⭐⭐⭐ | 服务端推送、单向消息 | 实时通知场景（已集成） |
| **FastExcel** | ⭐⭐⭐⭐ | Excel 导入导出 | 比 EasyExcel 性能更好（已集成） |
| **SMS4j** | ⭐⭐⭐ | 多平台短信发送 | 支持阿里云、腾讯、华为等（已集成） |
| **JustAuth** | ⭐⭐⭐ | 第三方 OAuth 登录 | 支持微信、QQ、支付宝等 30+ 平台（已集成） |
| **AWS S3** | ⭐⭐⭐ | 对象存储服务 | S3 兼容协议，支持 MinIO 自建（已集成） |
| **MailSender** | ⭐⭐⭐ | 邮件发送 | 支持 SMTP、企业邮箱（已集成） |
| **Redis Streams** | ⭐⭐⭐ | 消息队列（简单场景） | 比 RocketMQ 轻量级 |

#### 3️⃣ 扩展能力（按需集成）

| 技术 | 优先级 | 使用场景 | 集成状态 |
|------|--------|---------|---------|
| **数据加密** | ⭐⭐⭐⭐ | 敏感数据加密、字段级加密 | ✅ 已集成 |
| **数据脱敏** | ⭐⭐⭐⭐ | 身份证、手机号脱敏 | ✅ 已集成 |
| **防重复提交** | ⭐⭐⭐⭐ | 表单防重复、API 幂等 | ✅ 已集成 |
| **国际化翻译** | ⭐⭐⭐ | 多语言支持 | ✅ 已集成 |
| **审计日志** | ⭐⭐⭐ | 操作日志、变更追溯 | ✅ 已集成 |
| **接口限流** | ⭐⭐⭐ | 接口频率限制、防滥用 | ✅ 已集成 |

#### 4️⃣ 需自行扩展的技术

| 技术 | 使用场景 | 说明 |
|------|---------|------|
| **RocketMQ** | 高吞吐消息队列、分布式事务 | 高并发场景可自行引入 |
| **MQTT** | 物联网设备通信 | IoT 场景可使用 mica-mqtt |
| **LangChain4j** | AI 大模型集成 | AI 业务可自行集成 |

### 技术选型决策树

```
需要实时通信？
├─ 是 → WebSocket（首选，已集成）
└─ 否 → 需要消息队列？
         ├─ 是 → Redis Streams（优先，轻量级）
         │       或 RocketMQ（自行引入，高吞吐）
         └─ 否 → 需要定时任务？
                ├─ 是 → SnailJob（分布式，已集成）
                │       或 @Scheduled（简单场景）
                └─ 否 → 需要缓存？
                       └─ 是 → Redis + Redisson（首选，已集成）
```

---

## 本项目架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端                                │
├──────────────────┬──────────────────┬───────────────────────┤
│     PC Web       │     小程序        │         App           │
│   (独立项目)      │   (独立项目)      │     (独立项目)         │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 网关 (可选)                          │
│                   Nginx / Spring Cloud Gateway              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端服务                                │
│           ruoyi-admin (Spring Boot 3.5.9)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐│
│  │ruoyi-system│ │ ruoyi-demo │ │ruoyi-generator│ │  ruoyi-job │ │ruoyi-workflow││
│  │  系统管理   │ │  演示模块  │ │   代码生成    │ │  定时任务  │ │   工作流     ││
│  │  (sys_*)   │ │ (test_*)   │ │   (gen_*)     │ │  (job)     │ │  (flow_*)    ││
│  └────────────┘ └────────────┘ └──────────────┘ └────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    ruoyi-common (20+ 模块)                   │
│ mybatis/redis/oss/websocket/satoken/job/sms/excel/mail/sse │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据与存储层                             │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│  MySQL   │  Redis   │   OSS    │   可选扩展中间件              │
│ (主数据)  │  (缓存)  │ (文件)   │  (RocketMQ/MQTT/SnailJob)   │
└──────────┴──────────┴──────────┴──────────────────────────────┘
```

### 🔴 后端三层架构（本项目核心）

本项目采用 **三层架构**：Controller → Service → Mapper

**注意：没有独立的 DAO 层！Service 层直接调用 Mapper。**

```
┌──────────────────────────────────────────────────────────────┐
│                    Controller 层                              │
│     • 接收 HTTP 请求、参数校验、返回 R<T> 响应               │
│     • 路由：/list, /{id}, /, /, /{ids}, /export            │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      Service 层                               │
│     • 业务逻辑处理、事务管理、编排协调                        │
│     • buildQueryWrapper() 查询条件构建                       │
│     • 使用 MyBatis-Plus LambdaQueryWrapper                   │
│     • 直接注入 Mapper（无 DAO 层）                           │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      Mapper 层                                │
│     • extends BaseMapperPlus<Entity, Vo>                     │
│     • MyBatis-Plus ORM 映射、SQL 执行                        │
└──────────────────────────────────────────────────────────────┘
```

**为什么是三层而非四层？**
- **没有独立 DAO 层**：Service 层直接注入 Mapper
- `buildQueryWrapper()` 方法在 **Service 实现类** 中
- 更简洁、更少的样板代码

---

## 架构设计原则

### 1. 单一职责

```java
// ✅ 好的设计：每个类只负责一件事
public class OrderService {
    // 只处理订单业务
}

public class PaymentService {
    // 只处理支付业务
}

// ❌ 不好的设计：一个类做太多事
public class OrderService {
    // 订单 + 支付 + 物流 + 通知...
}
```

### 2. 开闭原则

```java
// ✅ 好的设计：对扩展开放，对修改关闭
public interface PaymentStrategy {
    void pay(Order order);
}

public class WechatPayment implements PaymentStrategy { }
public class AlipayPayment implements PaymentStrategy { }
// 新增支付方式只需新增实现类

// ❌ 不好的设计：新增功能需要修改原有代码
public void pay(Order order, String type) {
    if ("wechat".equals(type)) {
        // 微信支付
    } else if ("alipay".equals(type)) {
        // 支付宝支付
    }
    // 新增支付方式需要修改这里
}
```

### 3. 依赖倒置

```java
// ✅ 好的设计：依赖抽象而非具体实现
@Service
public class OrderServiceImpl implements IOrderService {
    private final IPaymentService paymentService;  // 依赖接口
}

// ❌ 不好的设计：直接依赖具体实现
@Service
public class OrderServiceImpl {
    private final WechatPaymentService paymentService;  // 依赖具体类
}
```

---

## 模块划分与表前缀规范

### 核心约束（必须遵守）

**包名必须是 `org.dromara.*`**

### 标准模块与表前缀对应

| 模块 | 目录路径 | 包路径 | 表前缀 | 用途 |
|------|---------|--------|--------|------|
| **系统管理** | `ruoyi-modules/ruoyi-system/` | `org.dromara.system` | `sys_` | 系统管理功能 |
| **演示模块** | `ruoyi-modules/ruoyi-demo/` | `org.dromara.demo` | `test_` | 示例与演示 |
| **工作流** | `ruoyi-modules/ruoyi-workflow/` | `org.dromara.workflow` | `flow_` | 工作流引擎 |

### 业务模块扩展（按业务领域）

创建新业务模块时，遵循以下规范：

| 业务领域 | 新模块命名 | 包路径 | 表前缀 |
|---------|----------|--------|--------|
| **基础业务** | `ruoyi-modules/ruoyi-xxx/` | `org.dromara.xxx` | `xxx_` |
| **商城业务** | `ruoyi-modules/ruoyi-mall/` | `org.dromara.mall` | `m_` |
| **物联网** | `ruoyi-modules/ruoyi-iot/` | `org.dromara.iot` | `iot_` |

### 关键设计原则

**1. 表前缀与模块一一对应**
```
✅ 正确：sys_user 表 → ruoyi-system 模块
❌ 错误：sys_user 表 → ruoyi-demo 模块（前缀与模块不符）
```

**2. Java 类名不带前缀**
```java
// ✅ 正确
@TableName("sys_user")  // 表名带前缀
public class SysUser extends TenantEntity { }  // 类名带 Sys（系统模块特例）

@TableName("test_demo")
public class TestDemo extends TenantEntity { }  // 类名不带 test 前缀
```

**3. 所有业务表继承 TenantEntity**
```java
// ✅ 正确：支持多租户
public class Order extends TenantEntity {
    // TenantEntity/BaseEntity 提供：tenant_id, create_dept, create_by, create_time, update_by, update_time
    // 子类需自行定义：
    @TableId(value = "id")
    private Long id;                  // 主键（雪花ID，全局配置）

    @TableLogic
    private Long delFlag;             // 逻辑删除标志
}
```

**4. 主键使用雪花 ID（全局配置）**
```java
// ✅ 正确：依赖全局配置（common-mybatis.yml 中 idType: ASSIGN_ID），不需要显式指定 type
@TableId(value = "id")
private Long id;

// ❌ 错误：显式指定 type（冗余，全局已配置）
@TableId(value = "id", type = IdType.ASSIGN_ID)

// ❌ 错误：SQL 中使用自增
id BIGINT AUTO_INCREMENT  -- 禁止！本项目用雪花ID
```

### 🔴 模块内部结构规范（三层架构）

以 `TestDemo` 表为例：

```
ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/
├── controller/
│   └── TestDemoController.java      # @RestController
├── service/
│   ├── ITestDemoService.java        # Service 接口
│   └── impl/
│       └── TestDemoServiceImpl.java # Service 实现（包含 buildQueryWrapper）
├── mapper/
│   └── TestDemoMapper.java          # extends BaseMapperPlus<TestDemo, TestDemoVo>
└── domain/
    ├── TestDemo.java                # Entity，继承 TenantEntity
    ├── bo/
    │   └── TestDemoBo.java          # 业务对象（@AutoMapper）
    └── vo/
        └── TestDemoVo.java          # 视图对象
```

**Service 实现示例（buildQueryWrapper 在 Service 层）：**

```java
@Service
public class TestDemoServiceImpl implements ITestDemoService {

    private final TestDemoMapper baseMapper;  // 直接注入 Mapper，无 DAO 层

    /**
     * 构建查询条件（在 Service 层）
     */
    private LambdaQueryWrapper<TestDemo> buildQueryWrapper(TestDemoBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<TestDemo> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getDeptId() != null, TestDemo::getDeptId, bo.getDeptId());
        lqw.eq(bo.getUserId() != null, TestDemo::getUserId, bo.getUserId());
        lqw.like(StringUtils.isNotBlank(bo.getTestKey()), TestDemo::getTestKey, bo.getTestKey());
        lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
            TestDemo::getCreateTime, params.get("beginCreateTime"), params.get("endCreateTime"));
        return lqw;
    }

    @Override
    public TableDataInfo<TestDemoVo> queryPageList(TestDemoBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<TestDemo> lqw = buildQueryWrapper(bo);
        Page<TestDemoVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }
}
```

### 表设计规范

#### 建表模板（MySQL）

```sql
CREATE TABLE xxx_table (
    -- 主键（雪花 ID，不用 AUTO_INCREMENT）
    id              BIGINT(20)    NOT NULL COMMENT '主键ID',

    -- 多租户字段（必须）
    tenant_id       VARCHAR(20)   DEFAULT '000000' COMMENT '租户ID',

    -- 业务字段
    xxx_name        VARCHAR(100)  NOT NULL COMMENT '名称',
    status          CHAR(1)       DEFAULT '0' COMMENT '状态',
    remark          VARCHAR(500)  DEFAULT NULL COMMENT '备注',

    -- 审计字段（必须，继承自 TenantEntity）
    create_dept     BIGINT(20)    DEFAULT NULL COMMENT '创建部门',
    create_by       BIGINT(20)    DEFAULT NULL COMMENT '创建人',
    create_time     DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by       BIGINT(20)    DEFAULT NULL COMMENT '更新人',
    update_time     DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    -- 逻辑删除
    del_flag        CHAR(1)       DEFAULT '0' COMMENT '删除标志(0正常 1已删除)',

    PRIMARY KEY (id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='xxx表';
```

**建表注意事项：**
- 表前缀与模块必须对应
- 必须包含 `tenant_id`（支持多租户）
- 必须包含审计字段
- 必须包含逻辑删除字段（`del_flag`）
- 主键不使用 `AUTO_INCREMENT`（使用雪花 ID）
- 添加必要的索引

#### 多数据库支持

| 数据库 | SQL 文件位置 |
|--------|------------|
| MySQL | `script/sql/ry_vue_5.X.sql` |
| Oracle | `script/sql/oracle/` |
| PostgreSQL | `script/sql/postgres/` |
| SQL Server | `script/sql/sqlserver/` |

---

## 实战架构案例

### 案例 1：订单系统架构

**需求：** 电商订单创建、支付、发货

**模块划分：**
```
ruoyi-modules/ruoyi-mall/
├── order/              # 订单模块（m_order）
├── goods/              # 商品模块（m_goods）
└── payment/            # 支付模块（m_payment）
```

**包路径规范：**
```
org.dromara.mall.order.controller.OrderController
org.dromara.mall.order.service.IOrderService
org.dromara.mall.order.service.impl.OrderServiceImpl
org.dromara.mall.order.mapper.OrderMapper
org.dromara.mall.order.domain.Order
```

**技术选型：**
```
├── 数据存储
│   ├── MySQL（订单主数据）
│   ├── Redis（库存缓存、分布式锁）
│   └── OSS（发票、物流单图片）
├── 消息通信
│   ├── WebSocket（订单状态实时推送）
│   └── Redis Streams（订单异步处理）
└── 定时任务
    ├── SnailJob（对账任务 - 分布式）
    └── @Scheduled（订单超时取消 - 简单）
```

### 案例 2：IoT 设备监控系统

**需求：** 设备数据采集、实时监控、告警推送

**模块划分：**
```
org.dromara.iot.device.*
org.dromara.iot.data.*
org.dromara.iot.alert.*
```

**技术选型：**
```
├── 设备通信
│   └── MQTT（物联网协议，需自行集成）
├── 数据存储
│   ├── MySQL（设备元数据、告警记录）
│   └── Redis（设备在线状态、实时数据）
├── 实时推送
│   └── WebSocket（告警推送）
└── 定时任务
    └── @Scheduled（设备离线检测）
```

---

## 技术选型决策指南

### 场景 1：需要消息队列吗？

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 订单创建后发送通知 | ❌ 不需要，同步调用 | 简单场景 |
| 订单支付成功后更新库存 | ✅ Redis Streams | 解耦 |
| 秒杀活动削峰填谷 | ✅ RocketMQ | 高并发 |

### 场景 2：定时任务如何选择？

| 场景 | 推荐方案 |
|------|---------|
| 订单超时自动取消（单机） | `@Scheduled` |
| 每日数据汇总（分布式） | SnailJob |
| 实时监控设备状态 | `@Scheduled` |

### 场景 3：实时通信方案

| 场景 | 推荐方案 |
|------|---------|
| 订单状态推送 | WebSocket |
| 系统通知推送 | SSE |
| IoT 设备通信 | MQTT（自行集成） |

---

## 常见架构模式对比

| 架构模式 | 适用场景 | 本项目采用 |
|---------|---------|-----------|
| **分层架构** | 中小型项目 | ✅ 是（三层架构） |
| **DDD** | 复杂业务领域 | ❌ 否 |
| **微服务** | 大型分布式系统 | ⚠️ 可选 |

### 本项目推荐架构路径

```
阶段 1：单体应用（当前）
├── 三层架构：Controller → Service → Mapper
├── 多租户支持
├── 模块化设计
└── 适合：0-10万用户

阶段 2：垂直拆分（可选）
├── 按模块拆分微服务
├── 引入 Spring Cloud Gateway
└── 适合：10万-100万用户
```

---

## 架构设计快速检查清单

### ✅ 新模块设计检查

- [ ] **包路径正确**：`org.dromara.{模块名}`
- [ ] **表前缀匹配**：`sys_` / `test_` / `flow_` / 自定义
- [ ] **表设计规范**：
  - [ ] 主键使用雪花 ID
  - [ ] 包含 `tenant_id` 字段
  - [ ] 包含审计字段
  - [ ] 包含逻辑删除字段 `del_flag`
- [ ] **三层架构完整**：
  - [ ] Controller
  - [ ] Service（包含 `buildQueryWrapper()` 方法）
  - [ ] Mapper（`extends BaseMapperPlus<Entity, Vo>`）
- [ ] **对象转换**：使用 `MapstructUtils.convert()`
- [ ] **异常处理**：使用 `ServiceException`
- [ ] **权限注解**：`@SaCheckPermission("{模块}:{实体}:{操作}")`

### ✅ 技术选型检查

- [ ] **缓存需求**：优先选择 Redis + Redisson
- [ ] **实时通信**：优先选择 WebSocket
- [ ] **定时任务**：简单场景用 `@Scheduled`，复杂场景用 SnailJob
- [ ] **消息队列**：优先 Redis Streams
- [ ] **数据导出**：使用 FastExcel
- [ ] **文件存储**：使用 AWS S3 SDK

---

## 常见问题 FAQ

### Q1: 什么时候需要使用 RocketMQ？

**A:** 本框架未内置 RocketMQ，只在高并发削峰、分布式事务等场景考虑使用。
- 简单场景 → Redis Streams（已集成）
- 异步任务 → SnailJob（已集成）
- 高吞吐 → RocketMQ（自行集成）

### Q2: 本项目为什么没有 DAO 层？

**A:** 本项目采用三层架构：
- Service 层直接注入 Mapper
- `buildQueryWrapper()` 方法在 Service 实现类中
- 更简洁、更少的样板代码
- 避免过度分层

### Q3: 表前缀与模块如何对应？

**A:** 严格对应规则：
| 模块 | 表前缀 |
|------|--------|
| system | `sys_` |
| demo | `test_` |
| workflow | `flow_` |
| 自定义 | 自定义前缀 |

### Q4: 什么时候用 SnailJob 而非 @Scheduled？

**A:** 选择标准：
- **@Scheduled**：单机、简单定时任务
- **SnailJob**：分布式、需要失败重试、工作流编排

### Q5: 新增模块需要创建哪些文件？

**A:** 最小集合（以 `XxxDemo` 表为例）：

```
ruoyi-modules/ruoyi-xxx/src/main/java/org/dromara/xxx/
├── controller/
│   └── XxxDemoController.java      # @RestController
├── service/
│   ├── IXxxDemoService.java        # 接口
│   └── impl/
│       └── XxxDemoServiceImpl.java # 实现（含 buildQueryWrapper）
├── mapper/
│   └── XxxDemoMapper.java          # extends BaseMapperPlus
└── domain/
    ├── XxxDemo.java                # extends TenantEntity
    ├── bo/
    │   └── XxxDemoBo.java          # @AutoMapper
    └── vo/
        └── XxxDemoVo.java          # 视图对象
```

**关键清单：**
- [ ] 包名：`org.dromara.xxx.*`
- [ ] Entity 继承：`TenantEntity`
- [ ] Service 不继承基类，直接注入 Mapper
- [ ] `buildQueryWrapper()` 在 Service 实现类中
- [ ] 对象转换使用 `MapstructUtils.convert()`
