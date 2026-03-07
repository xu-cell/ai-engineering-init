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
| `task-tracker` | 任务跟踪、进度管理 |
| `test-development` | 测试、单元测试 |
| `bug-detective` | Bug 排查、报错、异常 |
| `performance-doctor` | 性能优化、慢查询、缓存 |
| `add-skill` | 添加技能、创建技能文档 |
| `collaborating-with-codex` | 与 Codex 协同分析 |
| `collaborating-with-gemini` | 与 Gemini 协同设计 |
| `codex-code-review` | 代码审查 |

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
