---
name: architecture-design
description: |
  系统架构设计、模块划分、代码重构、技术栈选型。核心内容：三层架构规范、业务模块划分、表设计规范、技术栈优先级决策。

  触发场景：
  - 系统整体架构设计
  - 新业务模块的模块划分与结构规划
  - 代码分层与重构策略
  - 依赖关系梳理与解耦
  - 架构演进路径建议
  - 领域边界划分与包结构设计
  - 技术栈选型与方案决策

  触发词：架构设计、模块划分、三层架构、分层、领域划分、重构、解耦、依赖管理、系统设计、代码组织、技术栈、架构演进

  注意：
  1. 具体技术对比（Redis vs 本地缓存）-> 使用 tech-decision
  2. 开发具体 CRUD 模块 -> 使用 crud-development
  3. 数据库建表与字典配置 -> 使用 database-ops
  4. 本项目是纯后端项目（无前端代码）
---

# 架构设计指南

## 核心技术栈

| 层级 | 技术栈 | 版本 |
|------|--------|------|
| 后端框架 | Spring Boot | 3.5.9 |
| 开发语言 | Java | 17 |
| ORM | MyBatis-Plus | 3.5.16 |
| 安全 | Sa-Token | 1.44.0 |
| 数据库 | MySQL | 8.0+ |
| 缓存 | Redis + Redisson | 3.52.0 |
| 文档 | SpringDoc | 2.8.15 |
| 工具库 | Hutool | 5.8.43 |
| 对象转换 | Mapstruct-Plus | 1.5.0 |

## 已集成技术栈（按优先级）

### 高优先级（优先选择）

| 技术 | 使用场景 |
|------|---------|
| Redis + Redisson | 缓存、分布式锁、延迟队列、布隆过滤器 |
| WebSocket | 实时推送、在线聊天、消息通知 |
| Sa-Token | 权限控制、登录认证、单点登录 |
| Lock4j | 分布式锁（基于 Redisson） |
| SnailJob | 分布式定时任务、复杂调度 |

### 中优先级（按需使用）

| 技术 | 使用场景 |
|------|---------|
| SSE | 服务端单向推送 |
| FastExcel | Excel 导入导出 |
| SMS4j | 多平台短信发送 |
| JustAuth | 第三方 OAuth 登录（30+ 平台） |
| AWS S3 | 对象存储（兼容 MinIO） |
| MailSender | 邮件发送 |
| Redis Streams | 轻量级消息队列 |

### 已集成扩展能力

数据加密、数据脱敏、防重复提交、国际化翻译、审计日志、接口限流

### 需自行扩展

| 技术 | 使用场景 |
|------|---------|
| RocketMQ | 高吞吐消息队列、分布式事务 |
| MQTT | 物联网设备通信 |
| LangChain4j | AI 大模型集成 |

### 技术选型决策树

```
需要实时通信？
+-- 是 -> WebSocket（首选）
+-- 否 -> 需要消息队列？
         +-- 是 -> Redis Streams（优先） / RocketMQ（高吞吐，自行引入）
         +-- 否 -> 需要定时任务？
                +-- 是 -> SnailJob（分布式） / @Scheduled（简单场景）
                +-- 否 -> 需要缓存？
                       +-- 是 -> Redis + Redisson
```

---

## 三层架构（Controller -> Service -> Mapper）

**没有独立的 DAO 层。** Service 直接调用 Mapper，`buildQueryWrapper()` 在 Service 实现类中。

```
Controller 层：接收 HTTP 请求、参数校验、返回 R<T>
    |
Service 层：业务逻辑、事务管理、buildQueryWrapper()、直接注入 Mapper
    |
Mapper 层：extends BaseMapperPlus<Entity, Vo>，ORM 映射
```

---

## 模块划分与表前缀

**包名必须是 `org.dromara.*`**

### 标准模块

| 模块 | 目录 | 包路径 | 表前缀 |
|------|------|--------|--------|
| 系统管理 | `ruoyi-modules/ruoyi-system/` | `org.dromara.system` | `sys_` |
| 演示模块 | `ruoyi-modules/ruoyi-demo/` | `org.dromara.demo` | `test_` |
| 工作流 | `ruoyi-modules/ruoyi-workflow/` | `org.dromara.workflow` | `flow_` |

### 扩展模块命名

```
ruoyi-modules/ruoyi-{业务}/  ->  org.dromara.{业务}  ->  {前缀}_
例：ruoyi-mall/  ->  org.dromara.mall  ->  m_
```

### 关键规则

```java
// 1. 表前缀与模块一一对应
// OK: sys_user -> ruoyi-system    NG: sys_user -> ruoyi-demo

// 2. 所有业务表继承 TenantEntity
public class Order extends TenantEntity {
    @TableId(value = "id")       // 雪花ID，依赖全局配置，不指定 type
    private Long id;

    @TableLogic
    private Long delFlag;        // 逻辑删除
}

// 3. 主键使用雪花 ID（全局配置 idType: ASSIGN_ID）
@TableId(value = "id")           // OK
@TableId(value = "id", type = IdType.ASSIGN_ID)  // NG: 冗余
// SQL 中禁止 AUTO_INCREMENT
```

---

## 模块内部结构（以 TestDemo 为例）

```
ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/
+-- controller/
|   +-- TestDemoController.java      # @RestController
+-- service/
|   +-- ITestDemoService.java        # 接口
|   +-- impl/
|       +-- TestDemoServiceImpl.java  # 实现（含 buildQueryWrapper）
+-- mapper/
|   +-- TestDemoMapper.java          # extends BaseMapperPlus<TestDemo, TestDemoVo>
+-- domain/
    +-- TestDemo.java                # extends TenantEntity
    +-- bo/
    |   +-- TestDemoBo.java          # @AutoMapper
    +-- vo/
        +-- TestDemoVo.java
```

### Service 实现核心模式

```java
@Service
public class TestDemoServiceImpl implements ITestDemoService {
    private final TestDemoMapper baseMapper;  // 直接注入 Mapper

    private LambdaQueryWrapper<TestDemo> buildQueryWrapper(TestDemoBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<TestDemo> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getDeptId() != null, TestDemo::getDeptId, bo.getDeptId());
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

---

## 建表模板（MySQL）

```sql
CREATE TABLE xxx_table (
    id              BIGINT(20)    NOT NULL COMMENT '主键ID',
    tenant_id       VARCHAR(20)   DEFAULT '000000' COMMENT '租户ID',
    -- 业务字段
    xxx_name        VARCHAR(100)  NOT NULL COMMENT '名称',
    status          CHAR(1)       DEFAULT '0' COMMENT '状态',
    remark          VARCHAR(500)  DEFAULT NULL COMMENT '备注',
    -- 审计字段（TenantEntity 提供）
    create_dept     BIGINT(20)    DEFAULT NULL COMMENT '创建部门',
    create_by       BIGINT(20)    DEFAULT NULL COMMENT '创建人',
    create_time     DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_by       BIGINT(20)    DEFAULT NULL COMMENT '更新人',
    update_time     DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    del_flag        CHAR(1)       DEFAULT '0' COMMENT '删除标志(0正常 1已删除)',
    PRIMARY KEY (id),
    INDEX idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='xxx表';
```

**建表必须**：tenant_id、审计字段、del_flag、雪花ID（无 AUTO_INCREMENT）、表前缀对应模块。

多数据库 SQL 位置：`script/sql/` 下的 `ry_vue_5.X.sql`（MySQL）、`oracle/`、`postgres/`、`sqlserver/`

---

## 技术选型决策速查

| 场景 | 推荐方案 |
|------|---------|
| 简单异步通知 | 同步调用即可 |
| 解耦场景消息队列 | Redis Streams |
| 高并发削峰 | RocketMQ（自行引入） |
| 单机定时任务 | `@Scheduled` |
| 分布式定时任务 | SnailJob |
| 实时双向通信 | WebSocket |
| 服务端单向推送 | SSE |
| IoT 设备通信 | MQTT（自行集成） |

---

## 新模块设计检查清单

- [ ] 包路径：`org.dromara.{模块名}`
- [ ] 表前缀与模块对应
- [ ] 主键雪花ID、含 tenant_id、审计字段、del_flag
- [ ] 三层完整：Controller / Service（含 buildQueryWrapper） / Mapper（extends BaseMapperPlus）
- [ ] 对象转换：`MapstructUtils.convert()`
- [ ] 异常处理：`ServiceException`
- [ ] 权限注解：`@SaCheckPermission("{模块}:{实体}:{操作}")`
- [ ] 缓存优先 Redis、实时通信优先 WebSocket、导出用 FastExcel

---

## 多项目适配对照

| 特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| 包名前缀 | `org.dromara.*` | `net.xnzn.core.*` |
| JDK | 17 | 21 |
| 请求封装 | 直接 BO | `LeRequest<T>` |
| 响应封装 | `R<T>`, `TableDataInfo<T>` | `Page<T>`, `void` |
| 异常类 | `ServiceException` | `LeException` |
| 国际化 | `MessageUtils.message()` | `I18n.getMessage()` |
| 权限注解 | `@SaCheckPermission` | `@RequiresAuthentication` |
| 分页 | `PageQuery`, `TableDataInfo` | `PageDTO`, `Page<VO>` |
