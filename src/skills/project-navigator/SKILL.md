---
name: project-navigator
description: |
  当需要了解项目结构、查找文件、定位代码时自动使用此 Skill。提供 leniu 云食堂项目的精确导航。

  触发场景：
  - 询问某个功能/文件在哪里
  - 新建模块时需要确认目录位置
  - 查找参考代码（Controller/Service/Mapper/Entity 示例）
  - 了解项目整体结构和模块划分
  - 查找技能、命令、Hook 的位置

  触发词：项目结构、文件在哪、代码位置、目录结构、模块在哪、参考代码、怎么找、哪个文件、路径、在哪里
---

# leniu 项目导航指南

## 工程化配置项目

```
ai-engineering-init/      # 当前工作目录（本仓库根目录）
├── CLAUDE.md              # 项目规范（核心约束必读）
├── AGENTS.md              # Agent 配置文档
├── .claude/
│   ├── skills/            # 73 个技能模块
│   ├── commands/          # 10 个快速命令（/dev /crud /check 等）
│   ├── hooks/             # Hooks（skill-forced-eval.js 强制技能评估）
│   └── docs/              # 开发文档
└── .codex/skills/         # Codex CLI 技能同步目录
```

---

## 后端 Java 项目

**根路径**：由用户在 `CLAUDE.md` 中配置，各安装者路径不同

### 业务模块（25 个 core-* 模块）

| 模块 | 职责 |
|------|------|
| `core-order` | 订单管理 |
| `core-menu` | 菜品管理 |
| `core-marketing` | 营销（充值/优惠） |
| `core-report` | 报表统计 |
| `core-pay` | 支付 |
| `core-account` | 账号管理 |
| `core-merchant` | 商户配置 |
| `core-customer` | 用户/员工 |
| `core-device` | 设备管理 |
| `core-attendance` | 考勤 |
| `core-kitchen` / `core-backfield` | 后场厨房 |
| `core-drp` | 供应链 |
| `core-dorm` | 宿舍管理 |
| `core-notice` | 通知消息 |
| `core-open` | 开放接口 |
| `core-nutrition` | 营养管理 |
| `core-supermarket` | 超市 |
| `core-common` / `core-base` | 公共基础 |
| `core-auth` / `core-starter` | 认证/启动 |

### 标准包结构（四层架构）

```
net.xnzn.core.{module}/
├── controller/
│   ├── web/          # Web 管理端（/api/v2/web/{module}）
│   ├── mobile/       # 移动端（/api/v2/mobile/{module}）
│   ├── android/      # 设备端（/api/v2/android/{module}）
│   └── open/         # 开放接口（/api/v2/open/{module}）
├── business/impl/    # Business 层（跨 Service 编排）
├── service/impl/     # Service 层（单表 CRUD、事务）
├── mapper/           # Mapper + XML（同目录！非 resources/mapper/）
├── model/            # Entity
├── vo/               # 响应对象
├── dto/              # 请求参数（含 Param）
├── constants/        # 枚举、常量
├── mq/               # 消息队列
└── task/             # 定时任务
```

### 参考代码位置

| 需要参考 | 路径 |
|---------|------|
| Controller 写法 | `core-order/.../order/web/controller/OrderInfoWebController.java` |
| Business 层写法 | `core-order/.../order/web/business/impl/OrderWebBusiness.java` |
| Service 写法 | `core-order/.../order/common/service/impl/OrderInfoService.java` |
| Entity 写法 | `core-order/.../order/common/model/OrderInfo.java` |
| 枚举写法 | `core-order/.../order/common/constants/OrderStateEnum.java` |
| 配置文件 | `core-base/src/main/resources/bootstrap.yml` |

---

## 前端项目

**根路径**：由用户在 `CLAUDE.md` 中配置，各安装者路径不同

### src/ 核心目录

| 目录 | 说明 | 规模 |
|------|------|------|
| `api/` | 接口定义 | 63 个文件 |
| `leniuview/` | 业务模块页面 | 33 个模块 |
| `leniu-components/` | 业务组件库 | 12 个组件包 |
| `components/` | 通用组件 | ~87 个 |
| `store/` | Vuex 状态管理 | 30+ 个模块 |
| `utils/` | 工具函数 | 37 个文件 |

### 常用前端文件

| 需要查找 | 路径 |
|---------|------|
| 主入口 | `src/main.js` |
| 权限路由守卫 | `src/permission.js` |
| 请求封装 | `src/utils/request.js` |
| Token/租户工具 | `src/utils/auth.js` |
| 全局工具 | `src/utils/index.js` |
| Vuex 根配置 | `src/store/index.js` |
| 构建配置 | `vue.config.js` |

### 前端业务模块（leniuview 33 个）

```
accountCenter、canteenBackcourt、cost、dashboard、dataScreen、
deviceMange、dormitory、marketing、menudish、orderCenter、
purchase、reportCenter、stock、supplyChain、attendance、
campus、approvalManage、noticeV2、personalV2 ...
```

---

## 技能系统导航

**技能路径**：`.claude/skills/{技能名}/SKILL.md`

### 按开发场景选择技能

| 场景 | 技能 |
|------|------|
| 新建 CRUD 模块 | `leniu-crud-development` |
| API 接口设计 | `leniu-api-development` |
| 建表/SQL | `leniu-database-ops` |
| Entity/VO/DTO | `leniu-java-entity` |
| MyBatis/Mapper | `leniu-java-mybatis` |
| 异常处理 | `leniu-error-handler` |
| 工具类使用 | `leniu-utils-toolkit` |
| 注解使用 | `leniu-backend-annotations` |
| 代码规范 | `leniu-code-patterns` |
| 数据权限/双库 | `leniu-data-permission` |
| 定制报表 | `leniu-report-customization` |
| 标准报表 | `leniu-report-standard-customization` |
| 金额处理 | `leniu-java-amount-handling` |
| 并发/异步 | `leniu-java-concurrent` |
| 导出功能 | `leniu-java-export` |
| 定时任务 | `leniu-java-task` |
| 消息队列 | `leniu-java-mq` |
| Redis 缓存 | `leniu-redis-cache` |
| 合计行查询 | `leniu-java-total-line` |
| 报表查询入参 | `leniu-java-report-query-param` |
| 营销计费规则 | `leniu-marketing-price-rule-customizer` |
| 营销充值规则 | `leniu-marketing-recharge-rule-customizer` |
| 餐次处理 | `leniu-mealtime` |
| 定制开发位置 | `leniu-customization-location` |
| Bug 排查 | `bug-detective`（数据问题自动联动 `mysql-debug`） |
| 数据库查询验证 | `mysql-debug` |
| Codex 代码审查 | `codex-code-review` |
| 前端组件/权限 | `ui-pc` |
| 前端 Vuex | `store-pc` |
| 方案设计 | `leniu-brainstorm` |
| 架构设计 | `leniu-architecture-design` |
| 安全认证 | `leniu-security-guard` |

### 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能 |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
| `/start` | 项目快速了解 |
| `/progress` | 查看项目进度 |
| `/next` | 下一步建议 |
| `/add-todo` | 添加待办事项 |

---

## 常用搜索模式

```bash
# 查找某模块的 Controller
Glob core-order/**/*Controller*.java

# 查找 Service 实现类
Glob core-order/**/impl/*Service*.java

# 查找 Mapper XML
Glob core-order/**/*Mapper.xml

# 查找 Entity
Glob core-order/**/model/*.java

# 查找某接口路由
Grep "/api/v2/web/order" --type java

# 查找前端某页面
Glob src/leniuview/**/index.vue

# 查找前端接口定义
Glob src/api/*.js
```
