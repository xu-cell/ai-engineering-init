# AGENTS.md - [项目名称] 开发规范

> ⚠️ **这是示例模板，安装后请替换为你的项目实际规范**
> 需要修改：项目名称、技术栈描述、架构规范、禁止事项、代码模板

## 对话语言设置

**重要**: 在此代码库中工作时，必须始终使用**中文**与用户对话。

> **项目说明**：[在此填写你的项目简介，例如：本项目是 XXX 后端服务]
>
> **技术栈**：[例如：Spring Boot 3.x + MyBatis-Plus + Redis + Sa-Token]
>
> **架构**：[例如：三层架构（Controller → Service → Mapper）]

---

## 术语约定

| 术语 | 含义 | 对应目录 |
|------|------|---------|
| **后端** | Java 服务 | `[你的模块目录]/` |
| **前端** | PC 管理端 | `[前端目录]/`（如存在） |
| **公共模块** | 通用工具 | `[公共模块目录]/` |

---

## MCP 工具触发

| 触发词 | 工具 | 用途 |
|-------|------|------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` | 链式推理，多步骤分析 |
| 最佳实践、官方文档、标准写法 | `context7` | 框架官方文档查询 |
| 打开浏览器、截图、检查元素 | `chrome-devtools` | 浏览器调试 |

---

## 🔴 Skills 技能系统（最高优先级）

> **技能系统确保 AI 在编码前加载领域专业知识，保证代码风格一致**

### 技能系统工作原理

技能文件存储在 `.codex/skills/[skill-name]/SKILL.md` 中。

**任务匹配时**：读取匹配技能的完整 SKILL.md 内容
**需要时**：可进一步读取技能目录下的 `references/`、`scripts/` 等文件

---

## 技能清单与触发条件

### 后端开发技能

| 技能名称 | 触发条件 |
|---------|---------|
| `crud-development` | CRUD 开发、业务模块、Entity/Service/Mapper 创建 |
| `database-ops` | 数据库操作、SQL、建表、字典、菜单配置 |
| `api-development` | API 接口设计、RESTful、接口规范 |
| `utils-toolkit` | 工具类、StringUtils 等 |
| `error-handler` | 异常处理、错误处理规范 |
| `security-guard` | 安全、认证授权、加密 |
| `data-permission` | 数据权限、行级权限 |
| `tenant-management` | 多租户、租户隔离 |
| `workflow-engine` | 工作流、审批流 |
| `scheduled-jobs` | 定时任务 |
| `redis-cache` | Redis、缓存、分布式锁 |
| `json-serialization` | JSON 序列化、反序列化 |
| `file-oss-management` | 文件上传、OSS、云存储 |
| `sms-mail` | 短信、邮件发送 |
| `social-login` | 第三方登录、OAuth |
| `websocket-sse` | WebSocket、SSE、实时推送 |
| `backend-annotations` | 注解使用规范 |

### 通用技能

| 技能名称 | 触发条件 |
|---------|---------|
| `architecture-design` | 架构设计、模块划分、重构 |
| `code-patterns` | 代码规范、命名、禁止事项 |
| `git-workflow` | Git、提交、commit、分支 |
| `tech-decision` | 技术选型、方案对比 |
| `brainstorm` | 头脑风暴、创意、方案设计 |
| `lanhu-design` | 蓝湖设计稿、原型图、蓝湖链接、设计图、切图 |
| `task-tracker` | 任务跟踪、进度管理 |
| `test-development` | 测试、单元测试 |
| `auto-test` | API 自动化测试、Hurl、接口测试、测试报告、回归测试 |
| `analyze-requirements` | 需求分析全流程编排（原型图/云效任务 → 开发任务清单） |
| `fix-bug` | 修复 Bug 全流程编排（排查+修复+提交） |
| `bug-detective` | Bug 排查、报错、异常 |
| `performance-doctor` | 性能优化、慢查询、缓存 |
| `add-skill` | 添加技能、创建技能文档 |
| `collaborating-with-codex` | 与 Codex 协同分析 |
| `collaborating-with-gemini` | 与 Gemini 协同设计 |
| `codex-code-review` | 代码审查 |
| `leniu-marketing-scenario` | 营销规则开发（折扣/满减/限额/限次/补贴/充值赠送/扣款/就餐规则） |
| `jenkins-deploy` | 打包部署（Jenkins 构建 + Portainer 更新，dev/test 环境） |

### OpenSpec 规格驱动开发技能（SDD）

> 完整工作流：`/opsx:new` → `/opsx:ff` → `/opsx:apply` → `/opsx:archive`

| 技能名称 | 触发条件 |
|---------|---------|
| `openspec-new-change` | 新建变更、/opsx:new |
| `openspec-ff-change` | 快速推进、/opsx:ff |
| `openspec-apply-change` | 实现任务、/opsx:apply |
| `openspec-verify-change` | 验证实现、/opsx:verify |
| `openspec-archive-change` | 归档变更、/opsx:archive |

---

## 多模型分层 Agent 系统

> 按思维深度分层，不同 Agent 使用不同模型，各司其职。

### Haiku 层 — 数据获取（快、省）

| Agent | 模型 | 职责 | 触发场景 |
|-------|------|------|---------|
| `code-scanner` | haiku | 代码库扫描 + 文件定位 + 代码片段收集 | 任务开始前的代码探索、模块结构了解、相似实现查找 |
| `loki-runner` | haiku | Loki 日志查询 + 格式化 | Bug 排查、线上问题、traceId 追踪 |
| `mysql-runner` | haiku | MySQL 只读查询 + 格式化 | 数据排查、验证数据状态 |
| `task-fetcher` | haiku | 云效任务获取 + 整理 | 需求同步、任务查询 |
| `image-reader` | haiku | 截图/图片/Axure原型图内容提取 | 错误截图、表格截图、架构图、Axure原型分析 |

### Sonnet + Codex 层 — 代码分析（理解、推理）

| Agent | 模型 | 职责 | 触发场景 |
|-------|------|------|---------|
| `bug-analyzer` | sonnet | Bug 根因分析 + Codex 逻辑分析 | 接收 Haiku 层数据后分析根因 |
| `code-reviewer` | sonnet | 规范检查 + Codex 逻辑审查 | /dev、/crud 完成后、代码审查 |

### Opus 层 — 需求分析 + 架构决策 + 编码

| Agent | 模型 | 职责 | 触发场景 |
|-------|------|------|---------|
| `requirements-analyzer` | opus | 需求分析，协调 Haiku 层提取数据并输出开发任务清单 | Axure 原型分析、需求转开发任务 |

主会话也使用 Opus 模型，负责：
- 接收各层 Agent 的结构化结果
- 做出架构决策
- 编写核心业务代码
- 协调各层 Agent 工作

### 协作流程示例

```
功能开发流程：
  Opus 主会话 → 启动 Haiku 层扫描
    └─ code-scanner(Haiku) → 代码扫描报告（文件清单、关键片段、依赖关系）
                   │
                   ▼ 基于扫描结果决策
  Opus 主会话 → /dev 或 /crud 编写代码（不再自己做初始扫描）
                   │
                   ▼ 代码完成
  Opus 主会话 → 启动审查
    └─ code-reviewer(Sonnet+Codex) → 审查报告

需求分析流程（analyze-requirements 技能编排）：
  Opus 主会话 → 复杂度判断
    │
    ├─ 简单需求 → 直接分析输出任务清单 → 推荐 /crud 或 /dev
    │
    └─ 复杂需求 → 启动 requirements-analyzer(Opus)
       └─ 按信息量并行调用 Haiku 层
          ├─ image-reader(Haiku) × N张 → 原型图结构（有截图时）
          ├─ task-fetcher(Haiku) → 云效任务信息（有任务号时）
          └─ 汇总分析 → 输出需求分析报告 + 开发任务清单
                      │
                      ▼ 按任务清单开发
  Opus 主会话 → code-scanner(Haiku) 扫描 → /dev 编写代码
                      │
                      ▼ 代码完成
  Opus 主会话 → 启动审查
    └─ code-reviewer(Sonnet+Codex) → 审查报告

Bug 修复流程（fix-bug 技能编排）：
  Opus 主会话 → 复杂度判断
    │
    ├─ 简单 Bug → 直接读代码修复 → git-workflow 提交
    │
    └─ 复杂 Bug → 按信息量并行启动 Agent
       ├─ bug-analyzer(Sonnet+Codex) → 根因分析（必启动）
       ├─ loki-runner(Haiku)  → 日志数据（有 traceId 时）
       ├─ mysql-runner(Haiku) → 数据库数据（有 DB 信息时）
       └─ code-scanner(Haiku) → 相关代码结构（需要时）
                      │
                      ▼ 汇总 Agent 结果
    Opus 主会话 → 确认修复方案 → 编写修复代码
                      │
                      ▼ 代码完成
    Opus 主会话 → 启动审查
      └─ code-reviewer(Sonnet+Codex) → 审查报告
                      │
                      ▼ 审查通过
    git-workflow 提交（必须通过技能，禁止直接 git commit）
```

---

## 🚨 强制执行规则

### 规则 1：任务匹配时必须读取技能

当用户请求与上述任何技能的触发条件匹配时，**必须**：

1. 读取对应的 `SKILL.md` 文件
2. 按照技能中的指令执行
3. 如果技能目录有 `references/`，按需读取相关文件

### 规则 2：多技能组合

复杂任务可能匹配多个技能，应：

1. 识别所有相关技能
2. 按依赖顺序读取（如：先 `database-ops` 再 `crud-development`）
3. 综合所有技能的规范执行

### 规则 3：响应中标注已使用技能

在涉及代码的响应中，简要说明使用了哪些技能：

```
已参考技能：crud-development, database-ops

[实现代码...]
```

---

## 🚫 核心禁止事项

> ⚠️ **请替换为你的项目实际禁止事项**

```
// ❌ [在此填写你的项目禁止写法]
// ✅ [在此填写正确写法]
```

---

## 🏗️ 核心架构

> ⚠️ **请替换为你的项目实际架构**

```
[在此描述你的项目架构，例如：]

Controller（接收请求、参数校验）
    ↓
Service（业务逻辑）
    ↓
Mapper（数据访问）
```

---

## 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能（完整流程） |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
| `/start` | 项目快速了解 |
| `/progress` | 查看项目进度 |

---

## 🤝 维护与贡献 Skills

> 团队成员可以在本地修改 Skills 并将改动贡献回框架

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)
