---
name: fix-bug
description: |
  Bug 修复全流程编排。两阶段 Agent 排查 + 报告确认 + git-workflow 提交。

  触发场景：
  - 修复 Bug（含日志/traceId/数据库信息）
  - 线上问题排查与修复
  - 报表数据不正确需排查修复
  - 接口返回异常需定位修复

  触发词：修复bug、fix bug、修复、排查修复、线上修复、bug修复
---

# Bug 修复全流程

## 核心原则

**先判断复杂度，简单 Bug 直接修，复杂 Bug 走两阶段 Agent 排查。搞清原因后先出报告，用户确认后再修复代码。**

## 步骤 0：复杂度判断（必须先做）

```
用户提供 Bug 线索
  │
  ├─ 简单 Bug？ ──→ 快速路径
  │   - 明显的代码错误（NPE、空判断遗漏、拼写错误）
  │   - 用户已明确指出问题和修改方案
  │   - 单文件改动，逻辑清晰
  │   - 不需要查数据库/日志验证
  │
  └─ 复杂 Bug？ ──→ Agent 路径（两阶段排查）
      - 需要查日志确认线上行为（提供了 traceId）
      - 需要查数据库验证数据正确性（提供了 DB 信息）
      - 问题根因不明确，需要多维度分析
      - 涉及多模块/多表关联的数据问题
```

## 快速路径（简单 Bug）

```
读代码 → 定位问题 → 输出排查报告 → 用户确认 → 修复 → git-workflow 提交
```

不启动 Agent，直接在主对话中完成。即使是简单 Bug，也先说明问题原因和修复方案，等用户确认再动手。

## Agent 路径（复杂 Bug）

```
步骤 1：收集信息（从用户消息中提取）
  - traceId / 错误日志
  - 数据库环境（host/port/库名）
  - Loki 日志环境
  - Bug 描述 / 期望行为

步骤 2（阶段一）：并行启动 Agent
  ├── bug-analyzer: 读代码分析根因
  ├── loki-runner: 查 Loki 日志（有 traceId 时）
  └── mysql-runner: 查数据库验证数据（有 DB 信息时）

步骤 3（阶段二）：日志驱动二次查询
  从 loki-runner 结果中提取：
  ├── 表名（INSERT/UPDATE/DELETE/FROM/JOIN 后面的表名）
  ├── 数据 ID（id=xxx、orderId=xxx 等）
  ├── 租户 ID（tenantId、MERCHANT-ID 请求头）
  └── SQL 语句片段
  如果提取到有效的表名+ID → 自动启动 mysql-runner 二次查询

步骤 4：汇总所有结果 → 输出排查报告（见下方模板）

步骤 5：⏸️ 等待用户确认修复方案

步骤 6：用户确认后 → 修复代码

步骤 7：走 git-workflow 提交
```

## 排查报告模板（必须输出）

无论简单还是复杂 Bug，修复代码前**必须先输出报告**：

```markdown
## 🔍 Bug 排查报告

### 问题描述
{用户报告的现象}

### 根因分析
{代码层面的根本原因，指出具体文件和行号}

### 数据验证（如有）
{从日志/数据库中发现的关键数据，证实根因}

### 修复方案
- 修改文件：`xxx.java` 第 N 行
- 修改内容：{具体改动描述}
- 影响范围：{改动是否影响其他功能}

### 风险评估
- 低/中/高
- {风险说明}

---
确认修复请回复"修"，需要调整方案请说明。
```

**⚠️ 禁止跳过报告直接修改代码。必须等用户明确确认后才能开始修复。**

## 阶段二：日志驱动二次查询

当阶段一的 loki-runner 返回日志后，主会话检查日志内容：

```
loki-runner 返回日志
  │
  ├─ 日志中包含 SQL/表名/数据ID？
  │   │
  │   ├─ 阶段一已启动 mysql-runner？
  │   │   → 检查是否需要追加查询（不同的表或ID）
  │   │   → 需要则启动新的 mysql-runner 查询
  │   │
  │   └─ 阶段一未启动 mysql-runner？
  │       → 从日志提取表名+ID+租户ID
  │       → 自动启动 mysql-runner 二次查询
  │
  └─ 日志中无数据库相关信息？
      → 跳过，直接汇总现有结果
```

### 日志中常见的可提取信息

| 日志模式 | 提取内容 | 查询方式 |
|---------|---------|---------|
| `INSERT INTO order_info` | 表名 order_info | `SELECT * FROM order_info WHERE id = ?` |
| `UPDATE account SET balance=` | 表名 account | `SELECT * FROM account WHERE id = ?` |
| `orderId=123456` | 数据 ID | 按 ID 查对应表 |
| `MERCHANT-ID: 100` | 租户 ID | 切换到对应租户库查询 |
| `Duplicate entry 'xxx'` | 唯一键冲突 | 查重复数据 |
| `Data truncation` | 字段溢出 | 查表结构 `DESC table_name` |

## Agent 启动规则

### 阶段一：必须并行（单条消息多个 Agent tool call）

```
# 正确：一条消息同时启动
Agent(bug-analyzer, "分析 xxx 代码的 bug...")
Agent(loki-runner, "查询 traceId xxx 的日志...")
Agent(mysql-runner, "查询 xxx 数据库验证...")

# 错误：串行启动（等一个完再启动下一个）
```

### 阶段二：按需启动（阶段一结果返回后）

```
# 从 loki-runner 结果中发现了表名和数据ID
Agent(mysql-runner, "根据日志发现涉及 order_info 表，查询 id=xxx 的数据...")
```

### 各 Agent 职责

| Agent | subagent_type | 职责 | 输入 |
|-------|---------------|------|------|
| 代码分析 | `bug-analyzer` | 读代码、分析根因、给修复方案 | Bug 描述 + 相关文件路径 |
| 数据库验证 | `mysql-runner` | 查数据验证业务逻辑 | DB 连接信息 + 验证 SQL |
| 日志查询 | `loki-runner` | 查 Loki 日志看线上行为 | Loki 环境 + traceId |

### Agent 信息来源

**配置文件优先**，不存在时自动创建模板并提示用户填写：

| 配置 | 文件路径 |
|------|---------|
| MySQL | `.claude/mysql-config.json` |
| Loki | `.claude/skills/loki-log-query/environments.json` |

**配置获取流程**：
```
需要连 MySQL/Loki？
  │
  ├─ 配置文件存在且有有效凭证？ → 直接使用
  │
  ├─ 配置文件存在但是占位符？ → 提示用户填写敏感信息，等用户确认后继续
  │
  └─ 配置文件不存在？ → 创建模板文件（占位符） → 提示用户填写 → 等确认后继续
```

**敏感信息由用户手动填写，禁止 AI 将对话中的密码/token 写入配置文件。**

### 按信息量决定启动哪些 Agent

| 用户提供的信息 | 阶段一启动 | 阶段二（日志驱动） |
|---------------|-----------|-----------------|
| 只有 Bug 描述 | bug-analyzer | — |
| Bug 描述 + traceId | bug-analyzer + loki-runner | 日志中有表名/ID → mysql-runner |
| Bug 描述 + DB 信息 | bug-analyzer + mysql-runner | — |
| Bug 描述 + traceId + DB 信息 | 全部 | 日志中有新表/ID → mysql-runner 追加查询 |

## 提交规则

修复完成后，**必须调用 `Skill(git-workflow)` 再执行 git 操作**。

禁止：
- 直接 `git commit && git push` 跳过技能
- 在 Agent 内部执行 git 操作

## 注意

- 简单 Bug 不要过度编排，直接修就行（但仍需先报告再修复）
- 如果用户没提供 DB/Loki 信息但 Bug 涉及数据问题，主动询问
- 与 `bug-detective` 技能的区别：`bug-detective` 是排查指南，`fix-bug` 是全流程编排（包含排查+修复+提交）
