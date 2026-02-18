# AI 助手实战使用指南

> 本文档介绍如何使用 AI 编程助手的命令、技能和工具进行实战项目开发。

---

## 快速入门

### 第一步：了解项目

```
/start
```

AI 会自动扫描项目结构，识别已有模块，给出项目概览。

### 第二步：开始开发

根据需求选择合适的命令：

| 场景 | 命令 | 说明 |
|------|------|------|
| 从零开发新功能 | `/dev` | 完整流程：需求分析 → 建表 → 代码生成 |
| 表已存在，生成代码 | `/crud` | 快速生成三层架构 CRUD 代码 |
| 查看项目进度 | `/progress` | 梳理各模块完成情况 |
| 不知道下一步做什么 | `/next` | 获取开发建议 |

### 第三步：检查和收尾

```
/check          → 检查代码规范
/update-status  → 更新项目状态文档
```

---

## 实战案例：开发"优惠券管理"功能

### 场景描述

需要开发一个优惠券管理功能，包含：
- 优惠券模板管理（后台配置）
- 优惠券发放记录
- 优惠券使用统计

### Step 1：启动开发流程

```
/dev
```

AI 会引导你完成：
1. 确认功能名称和所属模块
2. 检查是否存在重复功能
3. 设计数据库表结构
4. 生成完整的三层架构代码

### Step 2：确认需求

AI 会问你：

```
请告诉我要开发的功能：
1. 功能名称？（如：优惠券管理）
2. 所属模块？（system/business/其他）
```

你回答：

```
功能名称：优惠券管理
所属模块：mall（商城模块）
```

### Step 3：AI 自动执行

AI 会自动完成：
- 设计表结构（m_coupon_template, m_coupon_record）
- 创建字典（优惠券类型、状态等）
- 生成菜单 SQL
- 生成完整三层架构代码（Entity → BO → VO → Mapper → Service → Controller）

### Step 4：对已有表快速生成代码

如果表已存在，可以跳过 `/dev` 直接使用：

```
/crud
```

AI 会生成完整的三层架构代码：
- Entity（继承 TenantEntity）
- BO（@AutoMapper 映射）
- VO（Excel 导出注解）
- Mapper（继承 BaseMapperPlus）
- Service 接口 + 实现（含 buildQueryWrapper）
- Controller（标准 RESTful API）

### Step 5：检查代码规范

```
/check
```

AI 会检查生成的代码是否符合项目规范（包名、架构、注解等）。

---

## 命令速查表

### 项目管理命令

| 命令 | 用途 | 使用时机 |
|------|------|---------|
| `/start` | 项目快速了解 | 首次接触项目、新会话开始 |
| `/progress` | 查看项目进度 | 了解各模块完成情况 |
| `/next` | 下一步建议 | 不知道该做什么 |
| `/sync` | 同步项目状态 | 定期整理项目文档 |

### 开发命令

| 命令 | 用途 | 使用时机 |
|------|------|---------|
| `/dev` | 从零开发新功能 | 表不存在，需要完整流程 |
| `/crud` | 快速生成 CRUD | 表已存在，只需生成代码 |
| `/check` | 代码规范检查 | 开发完成后检查 |
| `/add-todo` | 添加待办事项 | 记录待完成任务 |

### 文档命令

| 命令 | 用途 | 使用时机 |
|------|------|---------|
| `/init-docs` | 初始化项目文档 | 新项目首次配置 |
| `/update-status` | 更新项目状态 | 完成功能后更新 |

---

## 技能系统

AI 会根据你的问题自动激活相关技能，无需手动调用。每个技能包含该领域的最佳实践、代码模板和规范约束。

### 常见问题 → 技能映射

| 你说的话 | 自动激活技能 | 作用 |
|---------|-------------|------|
| "帮我开发用户管理模块" | `crud-development` | CRUD 开发规范和代码模板 |
| "怎么设计这个表" | `database-ops` | 数据库设计规范 |
| "这个接口怎么设计" | `api-development` | RESTful API 设计规范 |
| "接口响应慢怎么优化" | `performance-doctor` | 性能优化指南 |
| "这个报错怎么解决" | `bug-detective` | Bug 排查方法论 |
| "怎么加数据权限" | `data-permission` | 数据权限配置 |
| "怎么用 Redis 缓存" | `redis-cache` | 缓存使用规范 |
| "怎么写单元测试" | `test-development` | JUnit5 + Mockito 测试规范 |
| "怎么发短信" | `sms-mail` | 短信邮件集成 |
| "怎么接入微信登录" | `social-login` | 第三方登录 |
| "定时任务怎么写" | `scheduled-jobs` | 定时任务开发 |
| "工作流怎么集成" | `workflow-engine` | WarmFlow 工作流引擎 |
| "怎么处理多租户" | `tenant-management` | 多租户隔离方案 |
| "文件上传怎么做" | `file-oss-management` | OSS 文件存储 |
| "异常怎么处理" | `error-handler` | 全局异常处理规范 |
| "怎么用 MapstructUtils" | `utils-toolkit` | 工具类使用指南 |
| "JSON 精度丢失怎么办" | `json-serialization` | JSON 序列化规范 |
| "WebSocket 怎么用" | `websocket-sse` | 实时通信方案 |
| "权限注解怎么加" | `security-guard` | Sa-Token 认证授权 |
| "架构怎么设计" | `architecture-design` | 系统架构设计 |

### 技能完整分类（共 33 个）

#### 后端开发类（核心）

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `crud-development` | CRUD、增删改查、Entity、Service | 三层架构 CRUD 开发规范 |
| `api-development` | API、接口设计、RESTful | API 路径和响应规范 |
| `database-ops` | 建表、SQL、字典、菜单 | 数据库设计和配置 |
| `backend-annotations` | 注解、@RateLimiter、@DataScope | 框架注解使用指南 |
| `error-handler` | 异常、ServiceException、try-catch | 全局异常处理机制 |
| `utils-toolkit` | 工具类、MapstructUtils、StringUtils | 工具类方法速查 |
| `json-serialization` | JSON、序列化、BigDecimal 精度 | JSON 处理规范 |

#### 安全与权限类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `security-guard` | Sa-Token、权限、加密、脱敏 | 认证授权和数据安全 |
| `data-permission` | 数据权限、部门隔离、@DataPermission | 行级数据权限控制 |
| `tenant-management` | 多租户、TenantEntity、租户隔离 | 多租户数据隔离方案 |

#### 中间件与集成类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `redis-cache` | Redis、缓存、@Cacheable、分布式锁 | 缓存策略和 Redis 操作 |
| `scheduled-jobs` | 定时任务、SnailJob、@Scheduled | 定时任务开发 |
| `websocket-sse` | WebSocket、SSE、实时推送 | 实时通信方案 |
| `file-oss-management` | 文件上传、OSS、MinIO | 文件存储管理 |
| `sms-mail` | 短信、邮件、验证码 | 消息通知集成 |
| `social-login` | 微信登录、OAuth、JustAuth | 第三方登录集成 |
| `workflow-engine` | 工作流、审批、WarmFlow | 工作流引擎集成 |

#### 质量与排查类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `test-development` | 单元测试、JUnit5、Mockito、@Test | 测试开发规范 |
| `bug-detective` | Bug、报错、异常排查 | Bug 排查方法论 |
| `performance-doctor` | 性能、慢查询、SQL 优化 | 性能诊断和优化 |
| `code-patterns` | 代码规范、命名、禁止事项 | 编码规范速查 |

#### 规划与协作类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `architecture-design` | 架构设计、模块划分、重构 | 系统架构规划 |
| `tech-decision` | 技术选型、方案对比 | 技术决策分析 |
| `brainstorm` | 头脑风暴、方案设计、怎么做 | 创意方案探索 |
| `project-navigator` | 项目结构、文件在哪 | 项目导航和定位 |
| `git-workflow` | Git、提交、分支、合并 | Git 工作流规范 |
| `task-tracker` | 任务跟踪、记录进度 | 开发任务持久化跟踪 |
| `add-skill` | 添加技能、创建技能文档 | 扩展技能系统 |

#### 前端开发类（需 plus-ui 目录存在）

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `ui-pc` | 前端组件、Element Plus、表格表单 | PC 端组件库指南 |
| `store-pc` | Pinia、Store、状态管理 | PC 端状态管理 |

#### 多模型协作类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `collaborating-with-codex` | Codex、多模型、算法分析 | 委托 OpenAI Codex 处理任务 |
| `collaborating-with-gemini` | Gemini、前端原型、UI 设计 | 委托 Google Gemini 处理任务 |

#### 图片生成类

| 技能 | 触发词 | 说明 |
|------|-------|------|
| `banana-image` | 生成图片、海报、缩略图、4K | AI 图片生成 |

---

## Agent 系统

除了技能外，项目还配置了两个自动代理，会在特定场景下自动介入：

| Agent | 自动触发场景 | 作用 |
|-------|-------------|------|
| `code-reviewer` | 完成功能开发后 | 自动审查代码是否符合项目规范（包名、架构、注解等） |
| `project-manager` | 功能开发完成、使用 `/update-status` | 自动更新项目状态文档和待办清单 |

### code-reviewer 自动审查的内容

- 包名是否为 `org.dromara.*`
- 是否遵循三层架构（Controller → Service → Mapper，无 DAO 层）
- Service 是否直接注入 Mapper（使用 `@RequiredArgsConstructor`）
- BO 是否使用 `@AutoMapper`（单数）
- 是否使用 `MapstructUtils.convert()` 而非 BeanUtils

### project-manager 自动更新的文档

- `docs/项目状态.md` — 功能完成状态
- `docs/待办清单.md` — 待办事项变更

---

## MCP 工具

AI 助手集成了三个 MCP 工具，通过特定触发词激活：

| 触发词 | 工具 | 用途 | 使用场景 |
|-------|------|------|---------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` | 链式推理 | 复杂架构决策、多方案对比分析 |
| 最佳实践、官方文档、标准写法 | `context7` | 查阅文档 | 查询 MyBatis-Plus/Sa-Token/Spring Boot 最新用法 |
| 打开浏览器、截图、检查元素 | `chrome-devtools` | 浏览器调试 | 前端页面调试、接口测试 |

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

对于特定场景，可以让 AI 将任务委托给其他模型：

### Codex 协作（后端/算法）

```
"用 Codex 分析一下这个排序算法的复杂度"
"让 Codex 帮忙审查这段代码"
```

前置要求：已安装 `npm install -g @openai/codex` 并配置 API Key。

### Gemini 协作（前端/UI）

```
"用 Gemini 帮忙设计这个页面的布局"
"让 Gemini 写一个 Vue 组件原型"
```

前置要求：已安装 `npm install -g @google/gemini-cli` 并配置 API Key。

> 提示：后端任务优先使用 Codex，前端/UI 任务优先使用 Gemini。

---

## 高级用法

### 任务跟踪（跨会话恢复）

对于复杂的多步骤开发任务，可以使用任务跟踪功能：

```
"创建一个优惠券管理功能的任务跟踪"
```

AI 会在 `docs/tasks/active/` 下创建任务文档，记录：
- 需求描述和实现步骤
- 每步的完成状态
- 关键决策和相关文件

下次会话恢复：

```
"继续上次的优惠券功能"
```

AI 会读取任务文档，从上次中断的地方继续。

### 技能组合

复杂任务会自动组合多个技能。例如：

```
"帮我开发一个带数据权限的订单管理模块"
```

AI 会依次激活：
1. `database-ops` — 设计订单表结构
2. `crud-development` — 生成三层架构代码
3. `data-permission` — 添加数据权限配置

### 技术选型分析

```
"用 Redis 缓存还是本地缓存好？仔细分析一下"
```

AI 会激活 `tech-decision` + `sequential-thinking`，给出多维度对比分析。

### 测试开发

```
"帮这个 Service 写单元测试"
```

AI 会激活 `test-development`，基于 JUnit5 + Mockito 生成测试代码。

---

## 开发流程最佳实践

### 推荐流程

```
1. /start          → 了解项目现状
2. /dev            → 开发新功能（完整流程）
   或 /crud        → 快速生成代码（表已存在）
3. /check          → 检查代码规范
4. /update-status  → 更新项目状态
5. /progress       → 查看整体进度
```

### 遇到问题时

| 问题类型 | 怎么问 | 激活技能 |
|---------|-------|---------|
| 不知道文件在哪 | "xxx 功能的代码在哪个文件" | `project-navigator` |
| 不知道怎么写 | "怎么实现 xxx 功能" | `crud-development` |
| 代码报错 | "这个报错怎么解决：[粘贴错误]" | `bug-detective` |
| 性能问题 | "这个接口响应慢，怎么优化" | `performance-doctor` |
| 技术选型 | "用 Redis 还是本地缓存好" | `tech-decision` |
| 安全问题 | "怎么加权限控制" | `security-guard` |
| 多租户 | "怎么实现数据隔离" | `tenant-management` |

---

## 注意事项

### 推荐做法

1. **先用 `/start`** — 每次新会话先让 AI 了解项目
2. **描述清晰** — 说明功能名称、所属模块、具体需求
3. **分步开发** — 复杂功能拆分成多个小任务
4. **及时检查** — 开发完成后用 `/check` 检查规范
5. **跟踪任务** — 复杂功能使用任务跟踪，方便跨会话恢复
6. **善用触发词** — 说"仔细思考"可激活深度分析，说"查官方文档"可获取最新 API

### 避免做法

1. **不要跳过 `/start`** — AI 需要了解项目上下文
2. **不要模糊描述** — "帮我写个功能" 太模糊，应具体说明
3. **不要一次性要求太多** — 分步骤完成更可靠
4. **不要手动调用技能** — AI 会自动评估和激活

---

## 常见问题 FAQ

### Q1: `/dev` 和 `/crud` 有什么区别？

| 对比项 | `/dev` | `/crud` |
|--------|--------|---------|
| 适用场景 | 从零开始开发 | 表已存在 |
| 是否设计表 | 是 | 跳过 |
| 是否生成字典/菜单 | 是 | 跳过 |
| 执行速度 | 较慢（完整流程） | 快速 |
| 推荐场景 | 正式开发 | 快速原型、已有表结构 |

### Q2: 技能需要手动激活吗？

不需要。AI 会根据你的问题自动评估并激活相关技能。你只需要自然地描述需求即可。

### Q3: 可以同时开发多个功能吗？

建议一个一个来。完成一个功能后再开始下一个，避免上下文混乱。对于复杂任务，可以使用"任务跟踪"来记录进度。

### Q4: 生成的代码需要手动修改吗？

基础 CRUD 代码可以直接使用。复杂业务逻辑（如自定义查询、关联查询、工作流集成）需要在生成的代码基础上手动增强。

### Q5: 跨会话怎么恢复之前的工作？

两种方式：
1. **任务跟踪**：说"继续上次的 xxx 任务"，AI 会从 `docs/tasks/active/` 读取任务文档恢复
2. **直接说明**：说"上次我在开发 xxx 功能，继续"，AI 会扫描项目找到相关代码

### Q6: 怎么让 AI 查阅最新的框架文档？

在问题中加入"最佳实践"、"官方文档"、"标准写法"等触发词：

```
"MyBatis-Plus 批量插入的官方标准写法是什么"
```

AI 会通过 context7 工具查阅最新文档。

### Q7: 怎么让 AI 做更深入的分析？

在问题中加入"仔细思考"、"深度分析"、"全面评估"等触发词：

```
"仔细分析一下这个方案的优缺点和潜在风险"
```

AI 会使用 sequential-thinking 进行多步链式推理。

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────┐
│                    AI 助手速查                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🚀 核心命令                                        │
│  /start ......... 了解项目                          │
│  /dev ........... 完整开发新功能                    │
│  /crud .......... 快速生成 CRUD                     │
│  /check ......... 检查代码规范                      │
│  /progress ...... 查看项目进度                      │
│  /next .......... 下一步建议                        │
│                                                     │
│  📋 文档命令                                        │
│  /init-docs ..... 初始化项目文档                    │
│  /update-status . 更新项目状态                      │
│  /add-todo ...... 添加待办事项                      │
│  /sync .......... 同步项目状态                      │
│                                                     │
│  💡 触发词                                          │
│  "仔细思考" ..... 激活深度分析                      │
│  "官方文档" ..... 查阅最新 API                      │
│  "打开浏览器" ... 浏览器调试                        │
│                                                     │
│  🤖 自然提问即可，技能自动激活                      │
│  "怎么加缓存" → redis-cache                        │
│  "这个Bug怎么修" → bug-detective                   │
│  "帮我写测试" → test-development                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```
