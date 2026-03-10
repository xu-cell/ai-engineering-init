# CLAUDE.md - [你的项目名称]

> **这是示例模板**。安装后请将 `[你的xxx]` 占位符替换为你的项目实际信息。
> 如果项目有专属技能（如 `leniu-*`），它们会覆盖同名通用技能的规范。

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Agent Team Strategy
- Use subagents liberally to keep main context window clean
- One task per subagent for focused execution
- **Parallel execution**: Launch independent agents concurrently (research + exploration + analysis in one message)
- **Background agents**: Use `run_in_background` for long-running tasks, continue other work while waiting
- **Agent type selection**: Match agent to task — `Explore` for codebase search, `Plan` for architecture, `bug-analyzer` for debugging, `general-purpose` for complex multi-step work
- **Resume capability**: Resume completed agents by ID for follow-up work instead of starting fresh
- For complex problems, decompose into parallel agents — throw more compute at it

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## 语言设置
**必须使用中文**与用户对话。

## 术语约定

> 根据你的项目实际情况填写术语表。

| 术语 | 含义 | 路径 |
|------|------|------|
| **后端** | Java 服务 | `[你的后端根目录]/` |
| **前端** | 管理端 | `[你的前端目录]/` |
| **模块A** | 核心业务 | `[你的模块A路径]/` |
| **模块B** | 辅助业务 | `[你的模块B路径]/` |
| **公共模块** | 基础公共 | `[你的公共模块路径]/` |

## 前端技术栈

> 根据你的项目前端技术栈填写。

| 技术 | 版本 | 说明 |
|------|------|------|
| [框架] | [版本] | [API 风格] |
| [UI 库] | [版本] | [组件前缀] |
| [状态管理] | [版本] | [配置说明] |
| [路由] | [版本] | [路由模式] |

## MCP 工具触发

| 触发词 | 工具 |
|-------|------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` |
| 最佳实践、官方文档、标准写法 | `context7` |
| 打开浏览器、截图、检查元素 | `chrome-devtools` |
| 代码原型、代码审查、算法分析 | `codex` (mcp__codex__codex) |

## Core Instruction for CodeX MCP

在任何时刻，你必须思考当前过程可以如何与 codex 进行协作，如何调用 Codex 为你提供的 MCP 工具作为你客观全面分析的保障。其中你**务必执行**以下几个步骤：

**1** 在你对用户需求形成初步分析后，将用户需求、初始思路告知 codex，并要求其完善需求分析和实施计划。

**2** 在实施具体编码任务前，**必须向 codex 索要代码实现原型（要求 codex 仅给出 unified diff patch，严禁对代码做任何真实修改）**。在获取代码原型后，你**只能以此为逻辑参考，再次对代码修改进行重写**，形成企业生产级别、可读性极高、可维护性极高的代码后，才能实施具体编程修改任务。

**3** 无论何时，只要完成切实编码行为后，**必须立即使用 codex review 代码改动和对应需求完成程度**。

**4** codex 只能给出参考，你**必须有自己的思考，甚至需要对 codex 的回答提出质疑**。尽信书则不如无书，你与 codex 的最终使命都是达成统一、全面、精准的意见，所以你们必须不断争辩以找到通向真理的唯一途径。

### Codex 工具调用规范

- **工具名**：`mcp__codex__codex`
- **必选参数**：`PROMPT`（指令）、`cd`（工作目录，必须存在）
- **沙箱策略**：始终使用 `sandbox="read-only"`，严禁 codex 修改真实代码
- **会话管理**：保存每次返回的 `SESSION_ID`，多轮交互时传入以保持上下文
- **输出约定**：要求 codex 仅输出 unified diff patch，不执行实际文件修改

```
标准协作流程：
需求分析 → codex 完善方案
编码前   → codex 给出 diff 原型（只读参考）
编码后   → codex review 改动质量
```

## Skills 强制评估

> UserPromptSubmit Hook 会注入评估提示，**必须严格遵循**。

1. **评估**：列出匹配的技能
2. **激活**：逐个调用 `Skill(技能名)`（串行，不能并行）
3. **实现**：所有技能激活完成后开始

**Skills 位置**：`.claude/skills/[skill-name]/SKILL.md`

---

## 核心规范速查

> 根据你的项目规范填写。

| 项目 | 规范 |
|------|------|
| **包名** | `[你的包名]` |
| **JDK** | [版本] |
| **框架** | [框架名称 + 版本] |
| **架构** | [你的分层架构] |
| **异常** | `[你的业务异常类]` |
| **对象转换** | `[你的对象转换工具]` |
| **权限** | `[你的权限注解]` |
| **ID 生成** | `[你的ID生成策略]` |
| **验证** | `jakarta.validation.*` |

## 分层架构说明

> 根据你的项目选择三层或四层架构。

| 层 | 职责 | 命名示例 |
|----|------|---------|
| Controller | 接收请求、参数校验、路由 | `OrderController` |
| Service | 业务逻辑、事务管理 | `OrderService` |
| Mapper | ORM 映射 | `OrderMapper` |

## 标准包结构

```
[你的包名].[module]/
├── controller/         # 接口层
├── service/impl/       # 服务层
├── mapper/             # 数据访问层
├── model/              # Entity
├── vo/                 # 响应对象
├── dto/                # 请求参数
├── constants/          # 枚举和常量
└── config/             # 配置类
```

## Entity 审计字段

> 根据你的项目审计字段命名填写。

| 字段 | 含义 | 填充时机 |
|------|------|---------|
| `create_by` | 创建人 | INSERT |
| `create_time` | 创建时间 | INSERT |
| `update_by` | 更新人 | INSERT_UPDATE |
| `update_time` | 更新时间 | INSERT_UPDATE |
| `deleted` | 逻辑删除（0=正常，1=删除） | 手动 |

## 工具类速查

> 根据你的项目使用的工具类填写。

| 工具 | 用途 |
|------|------|
| `[对象转换工具]` | 对象转换 |
| `[集合工具]` | 集合判空/操作 |
| `[字符串工具]` | 字符串处理 |
| `[业务异常类]` | 抛出业务异常 |
| `[分页工具]` | 分页查询 |

## 绝对禁止

```java
// ❌ 旧验证包（JDK 17+ 必须用 jakarta）
import javax.validation.constraints.*;
// ✅ 使用 jakarta
import jakarta.validation.constraints.*;

// ❌ Map 传递业务数据
Map<String, Object> result = new HashMap<>();
// ✅ 使用 VO/DTO
return new OrderVO(order);

// ❌ 在 Controller 直接操作数据库
// ✅ 通过 Service 层

// ❌ 硬编码配置值
String url = "http://localhost:8080";
// ✅ 使用配置文件
@Value("${app.url}") String url;
```

## 数据库规范

```sql
CREATE TABLE [表名] (
    id          BIGINT       NOT NULL COMMENT '主键',
    -- 业务字段...
    create_by   VARCHAR(64)  COMMENT '创建人',
    create_time DATETIME     COMMENT '创建时间',
    update_by   VARCHAR(64)  COMMENT '更新人',
    update_time DATETIME     COMMENT '更新时间',
    deleted     INT DEFAULT 0 COMMENT '逻辑删除(0-正常,1-删除)',
    PRIMARY KEY (id)
);
```

## 开发模式选择指南

根据功能复杂度和开发类型，选择合适的工作流：

### 复杂度路由表

| 复杂度 | 判断标准 | 推荐工作流 | 说明 |
|--------|---------|-----------|------|
| **轻量** | 单表 CRUD、字段增删、简单查询 | `/dev` 或 `/crud` 直接开发 | 无需需求拆解 |
| **中等** | 2-3 张表联动、跨 Service 调用、状态流转 | `/dev` 开发（可选 OpenSpec） | 建议先理清逻辑再编码 |
| **复杂** | 多模块协作、复杂业务流程、需要设计评审 | OpenSpec → `/dev` | 先用 `/opsx:ff` 生成制品，再按 tasks 逐步实现 |

### 开发类型路由

| 类型 | 特征 | 工作流 |
|------|------|--------|
| **产品开发（core 迭代）** | 改 core 代码、会有后续迭代 | 复杂功能用 OpenSpec 拆解，简单功能直接 `/dev` |
| **项目定制（一次性）** | Dz 前缀类、dz_ 表、@Primary 覆盖 | 直接 `/dev`，参考 `leniu-customization-location` 技能 |

### OpenSpec 与 Commands 的关系

```
OpenSpec（思考）          Commands（执行）
───────────────          ──────────────
proposal.md    ────→    /dev（按 task 逐个开发）
specs/*.md     ────→    /crud（快速生成 CRUD）
design.md      ────→    /check（验证规范）
tasks.md       ────→    /progress（跟踪进度）
```

> **原则**：OpenSpec 负责需求拆解和设计决策，Commands 负责代码生成和质量管控。简单任务跳过 OpenSpec，直接用 Commands。

## 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能 |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
| `/next` | 下一步建议（含 OpenSpec 变更扫描） |
| `/progress` | 项目进度（含 OpenSpec 状态） |
