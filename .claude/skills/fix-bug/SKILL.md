---
name: fix-bug
description: |
  Bug 修复全流程编排。强制使用并行 Agent 模式进行排查，修复后走 git-workflow 提交。

  触发场景：
  - 修复 Bug（含日志/traceId/数据库信息）
  - 线上问题排查与修复
  - 报表数据不正确需排查修复
  - 接口返回异常需定位修复

  触发词：修复bug、fix bug、修复、排查修复、线上修复、bug修复
---

# Bug 修复全流程

## 核心原则

**先判断复杂度，简单 Bug 直接修，复杂 Bug 走并行 Agent。修复后必须走 git-workflow 提交。**

## 步骤 0：复杂度判断（必须先做）

```
用户提供 Bug 线索
  │
  ├─ 简单 Bug？ ──→ 快速路径（直接读代码修复）
  │   - 明显的代码错误（NPE、空判断遗漏、拼写错误）
  │   - 用户已明确指出问题和修改方案
  │   - 单文件改动，逻辑清晰
  │   - 不需要查数据库/日志验证
  │
  └─ 复杂 Bug？ ──→ Agent 路径（并行排查）
      - 需要查日志确认线上行为（提供了 traceId）
      - 需要查数据库验证数据正确性（提供了 DB 信息）
      - 问题根因不明确，需要多维度分析
      - 涉及多模块/多表关联的数据问题
```

## 快速路径（简单 Bug）

```
读代码 → 定位问题 → 修复 → 走 git-workflow 提交
```

不启动 Agent，直接在主对话中完成。

## Agent 路径（复杂 Bug）

```
步骤 1：收集信息（从用户消息中提取）
  - traceId / 错误日志
  - 数据库环境（host/port/库名）
  - Loki 日志环境
  - Bug 描述 / 期望行为

步骤 2：并行启动 Agent（必须同时启动，不串行）
  ├── bug-analyzer Agent: 读代码分析根因，给出修复方案
  ├── mysql-runner Agent: 查数据库验证数据（如提供了DB信息）
  └── loki-runner Agent: 查 Loki 日志验证线上行为（如提供了traceId）

步骤 3：汇总 Agent 结果 → 确认修复方案

步骤 4：修复代码

步骤 5：走 git-workflow 提交
```

## Agent 启动规则

### 必须并行（单条消息多个 Agent tool call）

```
# 正确：一条消息同时启动 3 个 Agent
Agent(bug-analyzer, "分析 xxx 代码的 bug...")
Agent(mysql-runner, "查询 xxx 数据库验证...")
Agent(loki-runner, "查询 traceId xxx 的日志...")

# 错误：串行启动（等一个完再启动下一个）
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

**创建 MySQL 模板**：
```json
{
  "environments": {
    "test21": {
      "name": "test21 测试环境",
      "host": "YOUR_HOST",
      "port": 3306,
      "user": "YOUR_USER",
      "password": "YOUR_PASSWORD",
      "db_prefix": "testcore_",
      "aliases": ["test21", "21"]
    }
  },
  "default": "test21",
  "mysql_path": "/opt/homebrew/opt/mysql-client/bin/mysql"
}
```

**创建 Loki 模板**：
```json
{
  "active": "test13",
  "environments": {
    "test13": {
      "name": "测试13（主测试环境）",
      "url": "https://test13.xnzn.net/grafana",
      "token": "YOUR_TOKEN",
      "aliases": ["test13", "13"]
    }
  }
}
```

**敏感信息由用户手动填写，禁止 AI 将对话中的密码/token 写入配置文件。**

### 按信息量决定启动哪些 Agent

| 用户提供的信息 | 启动的 Agent |
|---------------|-------------|
| 只有 Bug 描述 | bug-analyzer |
| Bug 描述 + traceId | bug-analyzer + loki-runner |
| Bug 描述 + DB 信息 | bug-analyzer + mysql-runner |
| Bug 描述 + traceId + DB 信息 | bug-analyzer + mysql-runner + loki-runner（全部） |

## 提交规则

修复完成后，**必须调用 `Skill(git-workflow)` 再执行 git 操作**。

禁止：
- 直接 `git commit && git push` 跳过技能
- 在 Agent 内部执行 git 操作

## 注意

- 简单 Bug 不要过度编排，直接修就行
- 如果用户没提供 DB/Loki 信息但 Bug 涉及数据问题，主动询问
- 与 `bug-detective` 技能的区别：`bug-detective` 是排查指南，`fix-bug` 是全流程编排（包含排查+修复+提交）
