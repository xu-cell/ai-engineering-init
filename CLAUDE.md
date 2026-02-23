# CLAUDE.md - leniu-tengyun-core 云食堂项目

## 语言设置
**必须使用中文**与用户对话。

## 术语约定

| 术语 | 含义 | 路径 |
|------|------|------|
| **后端** | Java 服务 | `leniu-tengyun-core/` |
| **前端** | PC 管理端 | `/Users/xujiajun/Developer/frontProj/web`（Vue 2） |
| **食堂模块** | 食堂业务 | `sys-canteen/` |
| **后场模块** | 后场厨房 | `sys-kitchen/` |
| **供应链模块** | 供应链 | `sys-drp/` |
| **公共模块** | 基础公共 | `core-base/`、`sys-common/` |

## 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 2.7.16 | Options API |
| Element UI | 2.15.9 | `el-` 前缀组件 |
| Vuex | 3.4.0 | namespaced:true |
| Vue Router | 3.2.0 | Hash 路由 |
| vue-i18n | 7.3.2 | `$t('key')` |

**前端关键机制**：Token=`Admin-Token`（localStorage）、租户=`MERCHANT-ID`（请求头）、成功码=`10000`、金额=分（`money()` 转元）、权限=`v-hasPerm`、加密=SM4

**前端 src 结构**：`api/`(65个接口) | `leniuview/`(35个业务模块) | `leniu-components/`(业务组件) | `components/`(~87) | `store/`(30个模块)

> **前端技能**：`ui-pc`（组件/API/权限）、`store-pc`（Vuex）

## MCP 工具触发

| 触发词 | 工具 |
|-------|------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` |
| 最佳实践、官方文档、标准写法 | `context7` |
| 打开浏览器、截图、检查元素 | `chrome-devtools` |

## Skills 强制评估

> UserPromptSubmit Hook 会注入评估提示，**必须严格遵循**。

1. **评估**：列出匹配的技能
2. **激活**：逐个调用 `Skill(技能名)`（串行，不能并行）
3. **实现**：所有技能激活完成后开始

**Skills 位置**：`.claude/skills/[skill-name]/SKILL.md`

---

## 核心规范速查

| 项目 | 规范 |
|------|------|
| **包名** | `net.xnzn.core.*` |
| **JDK** | 21 |
| **框架** | pigx-framework 3.4.7 + Spring Boot 3.x |
| **架构** | Controller → Business → Service → Mapper |
| **请求封装** | `LeRequest<T>` |
| **分页** | `PageDTO` + `PageVO` + PageHelper |
| **异常** | `LeException` |
| **国际化** | `I18n.getMessage()` |
| **对象转换** | `BeanUtil.copyProperties()`（Hutool） |
| **权限** | `@RequiresAuthentication` |
| **ID** | `Id.next()`（雪花ID） |
| **验证** | `jakarta.validation.*`（JDK 21） |

## 双库架构

物理分离双库，**无 tenant_id 字段**：

| 库 | 说明 | 切换方式 |
|----|------|---------|
| 系统库 | 全局数据（商户配置、字典） | `Executors.doInSystem()` |
| 商户库 | 租户业务数据（订单、菜品） | 默认（请求头 `MERCHANT-ID`） |

```java
Executors.doInTenant(tenantId, () -> { /* 商户库 */ });
Executors.doInSystem(() -> { /* 系统库 */ });
Executors.doInAllTenant(tenantId -> { /* 遍历所有租户 */ });
```

## 四层架构说明

| 层 | 职责 | 命名示例 |
|----|------|---------|
| Controller | 接收请求、参数校验、路由 | `OrderInfoWebController` |
| **Business** | 业务编排、跨 Service 协调 | `OrderWebBusiness` |
| Service | 单表 CRUD、事务 | `OrderInfoService` |
| Mapper | ORM 映射（含 XML 同目录） | `OrderInfoMapper` |

> Business 层是本项目核心特色，复杂逻辑在此处编排。

## 标准包结构

```
net.xnzn.core.[module]/
├── controller/         # 按端分：web/mobile/android
├── business/impl/      # 业务编排
├── service/impl/       # 服务层
├── mapper/             # Mapper + XML（同目录！）
├── model/              # Entity
├── vo/                 # 响应对象
├── dto/                # 请求参数
├── constants/          # 枚举和常量
├── mq/                 # 消息队列
└── task/               # 定时任务
```

> **XML 与 Mapper 同目录**（非 `resources/mapper/`），需在 pom.xml 配置资源过滤。

## 多端 Controller 路由

| 端 | 路由前缀 |
|----|---------|
| Web 管理端 | `/api/v2/web/{module}` |
| 移动端 | `/api/v2/mobile/{module}` |
| 设备端 | `/api/v2/android/{module}` |
| 开放接口 | `/api/v2/open/{module}` |

## Entity 审计字段

| leniu 字段 | 含义 | 填充时机 |
|-----------|------|---------|
| `crby` | 创建人 | INSERT |
| `crtime` | 创建时间 | INSERT |
| `upby` | 更新人 | INSERT_UPDATE |
| `uptime` | 更新时间 | INSERT_UPDATE |
| `delFlag` | **1=删除，2=正常** | 手动 |

## 工具类速查

| 工具 | 用途 |
|------|------|
| `BeanUtil.copyProperties()` | 对象转换 |
| `CollUtil.isEmpty()` | 集合判空 |
| `ObjectUtil.isNull()` | 对象判空 |
| `StrUtil.isBlank()` | 字符串判空 |
| `Id.next()` | 雪花ID |
| `LeException` | 业务异常 |
| `I18n.getMessage()` | 国际化 |
| `TenantContextHolder.getTenantId()` | 租户上下文 |
| `PageMethod.startPage()` | 分页拦截 |

## 绝对禁止

```java
// ❌ 错误包名
package org.dromara.xxx;           // 必须 net.xnzn.core.xxx

// ❌ 旧验证包（JDK 21 必须用 jakarta）
import javax.validation.constraints.*;

// ❌ RuoYi 工具类
MapstructUtils.convert();          // 用 BeanUtil.copyProperties()
throw new ServiceException("msg"); // 用 throw new LeException("msg")

// ❌ 错误审计字段名
private String createBy;           // 必须 crby
private LocalDateTime createTime;  // 必须 crtime

// ❌ Entity 加 tenant_id（双库物理隔离，不需要）

// ❌ del_flag: 0=正常（leniu 是 2=正常）

// ❌ Map 传递业务数据（必须用 VO/DTO）
```

## 数据库规范

```sql
CREATE TABLE xxx (
    id       BIGINT    NOT NULL COMMENT '主键（雪花ID）',
    -- 业务字段...
    crby     VARCHAR(64) COMMENT '创建人',
    crtime   DATETIME    COMMENT '创建时间',
    upby     VARCHAR(64) COMMENT '更新人',
    uptime   DATETIME    COMMENT '更新时间',
    del_flag INT DEFAULT 2 COMMENT '删除标识(1-删除,2-正常)',
    PRIMARY KEY (id)
);
-- ⚠️ 无需 tenant_id（双库物理隔离）
```

## 参考代码位置

| 类型 | 路径 |
|------|------|
| 订单 Controller | `sys-canteen/.../order/web/controller/OrderInfoWebController.java` |
| 订单 Business | `sys-canteen/.../order/web/business/impl/OrderWebBusiness.java` |
| 订单 Service | `sys-canteen/.../order/common/service/impl/OrderInfoService.java` |
| 订单 Entity | `sys-canteen/.../order/common/model/OrderInfo.java` |
| 订单枚举 | `sys-canteen/.../order/common/constants/OrderStateEnum.java` |
| 排班 Controller | `sys-kitchen/.../attendance/scheduling/controller/BackAttendanceWorkShiftController.java` |
| Bootstrap 配置 | `core-base/src/main/resources/bootstrap.yml` |

## 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能 |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
