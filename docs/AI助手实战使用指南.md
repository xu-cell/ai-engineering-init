# AI 助手实战使用指南

> 本文档介绍如何使用 AI 编程助手的命令、技能和工具进行实战项目开发。
> 核心理念：**OpenSpec 负责思考（需求拆解），Commands 负责执行（代码生成）**。

---

## 快速入门

### 第一步：了解项目

```
/start
```

AI 会自动扫描项目结构，识别已有模块和开发阶段，给出项目概览。

### 第二步：评估复杂度，选择工作流

| 复杂度 | 判断标准 | 推荐做法 |
|--------|---------|---------|
| 轻量 | 单表 CRUD、字段增删 | `/dev` 或 `/crud` 直接开发 |
| 中等 | 2-3 张表联动、状态流转 | `/dev` 开发（可选 OpenSpec） |
| 复杂 | 多模块协作、复杂审批流程 | `/opsx:ff` 先拆解 → 再逐步 `/dev` |

### 第三步：开始开发

```
# 简单功能 → 直接开发
/dev

# 复杂功能 → 先拆解需求
/opsx:ff [功能名称]
# 拆解完成后按任务实现
/opsx:apply [变更名称]
```

### 第四步：检查和收尾

```
/check          → 检查代码规范
/progress       → 查看项目进度（含 OpenSpec 变更状态）
```

---

## 实战案例

### 案例一：简单功能 — 员工考勤管理（轻量）

```
用户: /dev

AI: 请告诉我要开发的功能：
    1. 功能名称？
    2. 所属模块？（sys-canteen / sys-kitchen / sys-drp / sys-common）
    3. 端类型？（web / mobile / android）

用户: 员工考勤管理，sys-kitchen，web管理端

AI: [第零步评估] 1张表、单模块、简单CRUD → 轻量，直接开发
    → 重复检查
    → 设计表结构（建表 SQL）
    → 确认方案
    → 生成四层架构 8 个文件
    → 完成报告
```

**产出**：Entity、DTO、VO、Mapper、XML、Service、Business、Controller 共 8 个文件。

### 案例二：复杂功能 — 采购审批流程（复杂）

```
用户: /dev 多级采购审批流程

AI: [第零步评估] 4张表、跨 canteen+drp 模块、审批流程 → 复杂
    建议先用 OpenSpec 拆解：
    - /opsx:ff purchase-approval（快速拆解）
    - /opsx:new purchase-approval（交互式拆解）

用户: /opsx:ff purchase-approval

AI: 生成制品：
    ✓ proposal.md — 变更提案
    ✓ specs/approval-flow.md — 审批流程规格
    ✓ specs/notification.md — 通知规格
    ✓ design.md — 技术设计（表结构、接口）
    ✓ tasks.md — 7 个开发任务

用户: /opsx:apply purchase-approval

AI: 开始实现任务 1: 建表...
    [逐个完成所有任务]

用户: /opsx:verify purchase-approval
AI: 验证通过，所有任务已正确实现

用户: /opsx:archive purchase-approval
AI: 变更已归档
```

### 案例三：表已存在，快速生成代码

```
/crud
```

AI 会跳过表设计，直接读取现有表结构生成四层架构代码。

---

## 命令速查表

### 开发命令（Commands — 执行层）

| 命令 | 用途 | 使用时机 |
|------|------|---------|
| `/dev` | 完整开发新功能（含复杂度评估 + 表设计 + 代码生成） | 从零开发新功能 |
| `/crud` | 快速生成 CRUD 代码 | 表已存在，只需生成代码 |
| `/check` | 10 项代码规范检查 | 开发完成后检查 |

### 需求拆解命令（OpenSpec — 思考层）

| 命令 | 用途 | 使用时机 |
|------|------|---------|
| `/opsx:ff [名称]` | 一键生成全部制品（proposal → specs → design → tasks） | 需求已清晰，快速拆解 |
| `/opsx:new [名称]` | 交互式逐步创建变更 | 需求模糊，需要讨论 |
| `/opsx:apply [名称]` | 实现下一个未完成任务 | 按任务顺序开发 |
| `/opsx:explore` | 探索模式（只思考不写码） | 方案讨论、头脑风暴 |
| `/opsx:verify [名称]` | 验证实现与设计一致 | 所有任务完成后 |
| `/opsx:archive [名称]` | 归档已完成的变更 | 验证通过后 |

### 项目管理命令

| 命令 | 用途 | 使用时机 |
|------|------|---------|
| `/start` | 项目快速了解 | 首次接触项目、新会话开始 |
| `/progress` | 项目进度 + OpenSpec 变更状态 | 了解各模块完成情况 |
| `/next` | 下一步建议 + OpenSpec 未完成任务 | 不知道该做什么 |
| `/sync` | 同步项目状态 | 定期整理项目文档 |
| `/add-todo` | 添加待办事项 | 记录待完成任务 |
| `/update-status` | 更新项目状态文档 | 完成功能后更新 |
| `/init-docs` | 初始化项目文档 | 新项目首次配置 |

---

## OpenSpec 与 Commands 的关系

```
OpenSpec（思考层）                Commands（执行层）
─────────────────                ─────────────────

proposal.md    ─── 需求驱动 ───▶  /dev（按 task 逐个开发）
  "做什么"                         "生成代码"

specs/*.md     ─── 规格指导 ───▶  /crud（快速生成 CRUD）
  "详细需求"                       "表已有时快速生成"

design.md      ─── 设计约束 ───▶  /check（验证规范）
  "怎么实现"                       "是否符合规范"

tasks.md       ─── 进度源 ────▶  /progress（跟踪进度）
  "做了多少"                       "整体完成率"
```

**核心原则**：
- 简单功能跳过 OpenSpec，直接用 Commands
- 复杂功能先 OpenSpec 拆解，再用 Commands 逐步实现
- 两者通过 `tasks.md` 连接：OpenSpec 写任务，Commands 执行任务

> 详细流程图见 [OpenSpec与Commands融合工作流指南](./OpenSpec与Commands融合工作流指南.md)

---

## 技能系统

AI 会根据你的问题**自动评估并激活**相关技能，无需手动调用。每个技能包含该领域的最佳实践、代码模板和规范约束。

### 常见问题 → 技能映射

| 你说的话 | 自动激活技能 | 作用 |
|---------|-------------|------|
| "帮我开发用户管理模块" | `leniu-crud-development` | 四层架构 CRUD 开发规范 |
| "怎么设计这个表" | `leniu-database-ops` | 双库架构数据库设计规范 |
| "这个接口怎么设计" | `leniu-api-development` | RESTful API 设计规范 |
| "接口响应慢怎么优化" | `performance-doctor` | 性能优化指南 |
| "这个报错怎么解决" | `bug-detective` | Bug 排查方法论 |
| "怎么切换系统库" | `leniu-data-permission` | 双库架构数据源切换 |
| "怎么用 Redis 缓存" | `leniu-redis-cache` | RedisUtil 使用规范 |
| "怎么写单元测试" | `test-development` | JUnit5 + Mockito 测试规范 |
| "定时任务怎么写" | `leniu-java-task` | XXL-Job 定时任务 |
| "金额怎么处理" | `leniu-java-amount-handling` | 分转元、Long 金额规范 |
| "消息队列怎么用" | `leniu-java-mq` | MqUtil 消息队列 |
| "导出 Excel 怎么做" | `leniu-java-export` | 异步导出规范 |
| "异常怎么处理" | `leniu-error-handler` | LeException 使用规范 |
| "怎么用 BeanUtil" | `leniu-utils-toolkit` | 工具类速查 |
| "定制项目代码放哪" | `leniu-customization-location` | Dz 前缀定制规范 |
| "架构怎么设计" | `leniu-architecture-design` | 双库四层架构设计 |

### 技能完整分类

#### 后端开发类（leniu 专属）

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `leniu-crud-development` | CRUD、Business 层、LeRequest | 四层架构 CRUD 开发 |
| `leniu-api-development` | API、LeResult、LeResponse | API 接口开发规范 |
| `leniu-database-ops` | 建表、双库、crby、del_flag | 双库架构数据库规范 |
| `leniu-error-handler` | LeException、I18n | 异常处理规范 |
| `leniu-utils-toolkit` | BeanUtil、CollUtil、RedisUtil | 工具类速查 |
| `leniu-backend-annotations` | @RequiresAuthentication、@Validated | 注解使用指南 |
| `leniu-code-patterns` | 代码规范、禁止写法、delFlag | 代码规范速查 |
| `leniu-java-entity` | Entity、VO、DTO、@TableName | 数据类规范 |
| `leniu-java-mybatis` | LambdaQueryWrapper、XML 映射 | MyBatis 使用规范 |
| `leniu-java-amount-handling` | 金额、分转元、Long 金额 | 金额处理规范 |
| `leniu-java-mq` | MqUtil、@MqConsumer | 消息队列规范 |
| `leniu-java-export` | Excel 导出、异步导出 | 数据导出规范 |
| `leniu-java-task` | XXL-Job、TenantLoader | 定时任务规范 |
| `leniu-java-logging` | @Slf4j、log.info | 日志规范 |
| `leniu-java-concurrent` | CompletableFuture、线程池 | 并发处理规范 |
| `leniu-mealtime` | 餐次、早餐、午餐 | 餐次处理规范 |

#### 安全与权限类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `leniu-security-guard` | 安全认证、SM4 加密 | 安全权限控制 |
| `leniu-data-permission` | 双库隔离、Executors.doInTenant | 数据源切换规范 |

#### 报表与定制类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `leniu-report-customization` | 定制报表、report_order_info | 定制报表开发 |
| `leniu-java-report-query-param` | 报表查询入参、ReportBaseParam | 报表参数规范 |
| `leniu-java-total-line` | 合计行、totalLine | 报表合计行规范 |
| `leniu-customization-location` | 定制代码、Dz 前缀、dz_ 表 | 定制项目代码位置 |
| `leniu-marketing-price-rule-customizer` | 营销计费、RulePriceHandler | 计费规则定制 |
| `leniu-marketing-recharge-rule-customizer` | 营销充值、RuleRechargeHandler | 充值规则定制 |

#### 通用后端类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `redis-cache` | Redis、@Cacheable、分布式锁 | 缓存策略 |
| `json-serialization` | JSON、BigDecimal 精度 | JSON 处理规范 |
| `websocket-sse` | WebSocket、SSE、实时推送 | 实时通信方案 |
| `file-oss-management` | 文件上传、OSS | 文件存储管理 |
| `sms-mail` | 短信、邮件、验证码 | 消息通知集成 |
| `social-login` | 微信登录、OAuth | 第三方登录 |
| `workflow-engine` | 工作流、审批 | 工作流引擎 |
| `scheduled-jobs` | 定时任务、SnailJob | 通用定时任务 |

#### 质量与排查类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `test-development` | 单元测试、JUnit5、Mockito | 测试开发规范 |
| `bug-detective` | Bug、报错、异常排查 | Bug 排查方法论 |
| `performance-doctor` | 性能、慢查询 | 性能诊断优化 |

#### 规划与协作类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `leniu-architecture-design` | 架构设计、四层架构 | 系统架构规划 |
| `leniu-brainstorm` | 头脑风暴、方案设计 | 创意方案探索 |
| `tech-decision` | 技术选型、方案对比 | 技术决策分析 |
| `project-navigator` | 项目结构、文件在哪 | 项目导航定位 |
| `git-workflow` | Git、提交、分支 | Git 工作流规范 |
| `task-tracker` | 任务跟踪、记录进度 | 开发任务跟踪 |

#### 多模型协作类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `collaborating-with-codex` | Codex、算法分析 | 委托 OpenAI Codex 处理 |
| `collaborating-with-gemini` | Gemini、前端原型 | 委托 Google Gemini 处理 |

#### 图片生成类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `banana-image` | 生成图片、海报、4K | AI 图片生成 |

#### 前端开发类（需前端项目目录存在）

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `ui-pc` | 前端组件、Element UI | PC 端组件库指南 |
| `store-pc` | Vuex、Store | 状态管理指南 |

---

## MCP 工具

AI 助手集成了三个 MCP 工具，通过特定触发词激活：

| 触发词 | 工具 | 用途 | 使用场景 |
|-------|------|------|---------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` | 链式推理 | 复杂架构决策、多方案对比 |
| 最佳实践、官方文档、标准写法 | `context7` | 查阅文档 | 查询框架最新 API 用法 |
| 打开浏览器、截图、检查元素 | `chrome-devtools` | 浏览器调试 | 前端页面调试 |

### 使用示例

```
"仔细思考一下这个缓存方案的优缺点"
→ AI 使用 sequential-thinking 进行多步推理

"查一下 MyBatis-Plus 最新的官方文档怎么用批量插入"
→ AI 使用 context7 查阅最新文档

"帮我打开浏览器看看这个页面的布局"
→ AI 使用 chrome-devtools 进行浏览器操作
```

---

## 多模型协作

### Codex 协作（后端/算法）

```
"用 Codex 分析一下这个排序算法的复杂度"
"让 Codex 帮忙审查这段代码"
```

前置要求：`npm install -g @openai/codex` 并配置 API Key。

### Gemini 协作（前端/UI）

```
"用 Gemini 帮忙设计这个页面的布局"
"让 Gemini 写一个 Vue 组件原型"
```

前置要求：`npm install -g @google/gemini-cli` 并配置 API Key。

> 后端任务优先 Codex，前端/UI 任务优先 Gemini。

---

## 高级用法

### 任务跟踪（跨会话恢复）

```
"创建一个优惠券管理功能的任务跟踪"
```

AI 会在 `docs/tasks/active/` 下创建任务文档。下次会话恢复：

```
"继续上次的优惠券功能"
```

### OpenSpec 探索模式

不确定怎么做时，先进入探索模式讨论：

```
/opsx:explore
```

AI 会成为思维伙伴，用 ASCII 图表帮你理清思路，但**不会写代码**。讨论清楚后再创建变更。

### 技能组合

复杂任务会自动组合多个技能：

```
"帮我开发一个带数据权限的订单管理模块"
```

AI 会依次激活：
1. `leniu-database-ops` — 设计订单表结构（双库架构）
2. `leniu-crud-development` — 生成四层架构代码
3. `leniu-data-permission` — 配置数据源切换

### 定制项目开发

定制项目（一次性交付）有特殊规范：

```
"这是定制项目，帮我开发 xxx 功能"
```

AI 会激活 `leniu-customization-location`，自动使用：
- Dz 前缀类名（如 `DzOrderService`）
- dz_ 表名前缀
- `@Primary` + `@Lazy` 覆盖 core 实现
- `net.xnzn.yunshitang.*` 包名

---

## 开发流程最佳实践

### 推荐流程

```
简单功能：
1. /start          → 了解项目
2. /dev            → 开发（含复杂度评估）
3. /check          → 检查规范
4. /progress       → 查看进度

复杂功能：
1. /start          → 了解项目
2. /opsx:ff [名称] → 需求拆解
3. /opsx:apply     → 逐个实现任务
4. /check          → 检查规范
5. /opsx:verify    → 验证实现
6. /opsx:archive   → 归档变更
```

### 遇到问题时

| 问题类型 | 怎么问 | 激活技能 |
|---------|-------|---------|
| 不知道文件在哪 | "xxx 功能的代码在哪个文件" | `project-navigator` |
| 不知道怎么写 | "怎么实现 xxx 功能" | `leniu-crud-development` |
| 代码报错 | "这个报错怎么解决：[粘贴错误]" | `bug-detective` |
| 性能问题 | "这个接口响应慢" | `performance-doctor` |
| 数据源切换 | "怎么查系统库的数据" | `leniu-data-permission` |
| 金额处理 | "金额字段怎么处理" | `leniu-java-amount-handling` |
| 定制开发 | "定制代码放哪个包" | `leniu-customization-location` |

---

## 注意事项

### 推荐做法

1. **先用 `/start`** — 每次新会话先让 AI 了解项目
2. **描述清晰** — 说明功能名称、所属模块（sys-canteen/sys-kitchen/sys-drp）、具体需求
3. **复杂功能先拆解** — 用 `/opsx:ff` 或 `/opsx:new` 拆解后再逐步实现
4. **及时检查** — 开发完成后用 `/check` 检查规范
5. **善用触发词** — "仔细思考"激活深度分析，"查官方文档"获取最新 API

### 避免做法

1. **不要跳过 `/start`** — AI 需要了解项目上下文
2. **不要模糊描述** — "帮我写个功能"太模糊，应具体说明
3. **不要一次性要求太多** — 复杂功能用 OpenSpec 拆成多个小任务
4. **不要手动调用技能** — AI 会自动评估和激活

---

## 常见问题 FAQ

### Q1: `/dev` 和 `/crud` 有什么区别？

| 对比项 | `/dev` | `/crud` |
|--------|--------|---------|
| 适用场景 | 从零开始开发 | 表已存在 |
| 是否设计表 | 是 | 跳过 |
| 复杂度评估 | 是（第零步） | 跳过 |
| 产出文件 | 8 个（四层架构） | 8 个（四层架构） |

### Q2: 什么时候用 OpenSpec？什么时候直接 `/dev`？

- **单表 CRUD、简单查询** → 直接 `/dev`
- **多表联动、跨模块、复杂流程** → 先 `/opsx:ff` 拆解再逐步实现
- **不确定怎么做** → 先 `/opsx:explore` 讨论

### Q3: 技能需要手动激活吗？

不需要。AI 根据问题自动评估并激活。你只需自然地描述需求。

### Q4: 跨会话怎么恢复工作？

两种方式：
1. **OpenSpec 变更**：`/opsx:apply [变更名]`，AI 自动读取进度继续
2. **任务跟踪**："继续上次的 xxx 任务"，AI 从 `docs/tasks/active/` 恢复

### Q5: 产品开发和项目定制有什么区别？

| 对比项 | 产品开发（core 迭代） | 项目定制（一次性） |
|--------|---------------------|------------------|
| 包名 | `net.xnzn.core.*` | `net.xnzn.yunshitang.*` |
| 类名 | 标准命名 | Dz 前缀（DzXxxService） |
| 表名 | 标准命名 | dz_ 前缀 |
| 覆盖方式 | 直接修改 core 代码 | @Primary + @Lazy |
| 是否迭代 | 会有后续版本 | 一次性交付 |

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────┐
│                    AI 助手速查                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  开发命令                                           │
│  /dev ........... 完整开发新功能（含复杂度评估）     │
│  /crud .......... 快速生成 CRUD（表已存在）          │
│  /check ......... 10 项代码规范检查                  │
│                                                     │
│  OpenSpec 命令                                      │
│  /opsx:ff ....... 一键拆解需求（复杂功能）           │
│  /opsx:apply .... 实现下一个任务                     │
│  /opsx:explore .. 探索模式（只讨论不写码）           │
│  /opsx:verify ... 验证实现与设计一致                 │
│  /opsx:archive .. 归档已完成的变更                   │
│                                                     │
│  项目管理                                           │
│  /start ......... 了解项目                          │
│  /progress ...... 项目进度 + OpenSpec 状态           │
│  /next .......... 下一步建议 + 未完成任务            │
│  /add-todo ...... 添加待办事项                       │
│                                                     │
│  触发词                                             │
│  "仔细思考" ..... 激活深度分析                       │
│  "官方文档" ..... 查阅最新 API                       │
│  "打开浏览器" ... 浏览器调试                         │
│                                                     │
│  自然提问即可，技能自动激活                          │
│  "怎么加缓存" → leniu-redis-cache                   │
│  "这个Bug怎么修" → bug-detective                    │
│  "定制代码放哪" → leniu-customization-location       │
│                                                     │
└─────────────────────────────────────────────────────┘
```
