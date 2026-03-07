---
name: collaborating-with-codex
description: |
  与 OpenAI Codex CLI 协同开发。支持 MCP 原生集成和桥接脚本两种模式。
  默认模型：gpt-5.3-codex

  触发场景：
  - 需要算法实现或复杂逻辑分析
  - 需要代码审查和 Bug 分析
  - 需要生成 Unified Diff 补丁
  - 用户明确要求使用 Codex 协作
  - 复杂后端逻辑的原型设计

  触发词：Codex、协作、多模型、原型、Diff、算法分析、代码审查、codex协同

  前置要求：
  - 已安装 Codex CLI (npm install -g @openai/codex)
  - 已配置 OpenAI API Key (codex auth login)
---

# 与 Codex CLI 协同开发

> 两种调用方式：**MCP 原生集成**（推荐）和桥接脚本。默认模型 `gpt-5.3-codex`。

---

## 方式一：MCP 原生集成（推荐）

已通过 `codex-mcp-server` 注册为 Claude Code 的 MCP 工具，可直接在对话中使用。

### MCP 工具列表

| 工具 | 用途 | 示例指令 |
|------|------|---------|
| `codex` | AI 编码助手，支持会话、模型选择 | "用 codex 分析这个函数" |
| `review` | 代码审查（未提交代码、分支、提交） | "用 codex review 检查 main 分支差异" |
| `listSessions` | 查看活跃会话 | "列出 codex 会话" |
| `ping` | 测试连接 | "ping codex" |

### MCP 使用示例

**基础调用**：直接在 Claude Code 对话中说：
- "用 codex 工具分析 OrderInfoService 的业务逻辑"
- "用 codex review 检查当前未提交的代码变更"
- "用 codex 生成这个方法的单元测试，模型用 gpt-5.3-codex"

**多轮会话**：codex 工具支持 `sessionId` 参数，自动维持上下文。

**模型指定**：调用时传入 `model: "gpt-5.3-codex"` 参数（已配置为默认）。

### MCP 配置位置

```
~/.claude.json → projects → mcpServers → codex-cli
~/.codex/config.toml → profiles（review/analyze/prototype）
```

---

## 方式二：桥接脚本

适用于需要精细控制参数或后台批量执行的场景。

### 快速开始

```bash
python .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . --model gpt-5.3-codex --PROMPT "Your task"
```

### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `--PROMPT` | str | ✅ | - | 发送给 Codex 的任务指令（使用英语） |
| `--cd` | Path | ✅ | - | 工作目录根路径 |
| `--model` | str | ❌ | `gpt-5.3-codex` | 指定模型 |
| `--sandbox` | Literal | ❌ | `read-only` | 沙箱策略 |
| `--SESSION_ID` | UUID | ❌ | `None` | 会话 ID（继续之前的对话） |
| `--profile` | str | ❌ | `None` | Codex profile（review/analyze/prototype） |
| `--return-all-messages` | bool | ❌ | `False` | 返回完整推理信息 |
| `--image` | List[Path] | ❌ | `None` | 附加图片 |
| `--yolo` | bool | ❌ | `False` | 跳过审批（危险） |

### 使用示例

```bash
# 代码分析（只读）
python .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . --model gpt-5.3-codex --profile analyze \
  --PROMPT "Analyze the four-layer architecture in OrderInfoWebController"

# 代码审查
python .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . --model gpt-5.3-codex --profile review \
  --PROMPT "Review OrderWebBusiness.java for bugs. OUTPUT: Review with line numbers."

# 生成 Diff 补丁
python .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . --model gpt-5.3-codex \
  --PROMPT "Generate unified diff to add logging. OUTPUT: Unified Diff Patch ONLY."

# 多轮会话
python .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . --model gpt-5.3-codex \
  --SESSION_ID "uuid-from-previous" \
  --PROMPT "Now write unit tests for the method we discussed"
```

---

## Codex Profile 配置

已在 `~/.codex/config.toml` 中预设 3 个 profile：

| Profile | 模型 | 沙箱 | 推理强度 | 适用场景 |
|---------|------|------|---------|---------|
| `review` | gpt-5.3-codex | read-only | medium | 快速代码审查 |
| `analyze` | gpt-5.3-codex | read-only | high | 深度逻辑分析 |
| `prototype` | gpt-5.3-codex | workspace-write | high | 原型生成 |

---

## 协作分工原则

| 角色 | Claude Code 负责 | Codex 负责 |
|------|-----------------|-----------|
| **架构** | 设计、决策、审校 | 分析现有代码 |
| **开发** | 规范重构、最终代码 | 原型生成（Diff） |
| **审查** | 规范检查、最终判定 | 逐文件审查、安全扫描 |
| **调试** | 日志分析、定位 | 深度代码分析、补丁 |

### 重要约束

1. **只读优先**: 默认 `read-only`，仅原型生成用 `workspace-write`
2. **英语 Prompt**: 与 Codex 交互用英语
3. **中文强制**: 每次 PROMPT 末尾追加：
   ```
   IMPORTANT LANGUAGE RULES:
   - All SQL COMMENT values MUST be in Chinese
   - All Java/code comments MUST be in Chinese
   - Variable names and class names remain in English
   ```
4. **脏原型思维**: Codex 输出视为草稿，Claude 按项目规范重构
5. **后台运行**: 长时间任务用 subagent `run_in_background`

---

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| MCP 工具未出现 | 重启 Claude Code 会话，检查 `~/.claude.json` |
| `codex: command not found` | `npm i -g @openai/codex` 并确认 PATH |
| 模型不对 | 调用时显式传 `model: "gpt-5.3-codex"` |
| MCP 连接超时 | `npx -y codex-mcp-server` 手动测试 |
| 桥接脚本 SESSION_ID 失败 | 检查网络和 API Key |
