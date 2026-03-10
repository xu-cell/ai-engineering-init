---
name: collaborating-with-codex
description: |
  与 Codex MCP 协同开发。通过 GuDaStudio/codexmcp 集成，使用 mcp__codex__codex 工具。
  默认沙箱：read-only（严禁 codex 修改真实代码）。

  触发场景：
  - 需要算法实现或复杂逻辑分析
  - 需要代码审查和 Bug 分析
  - 需要生成 Unified Diff 补丁
  - 用户明确要求使用 Codex 协作
  - 复杂后端逻辑的原型设计

  触发词：Codex、协作、多模型、原型、Diff、算法分析、代码审查、codex协同

  前置要求：
  - 已通过 `claude mcp add codex -s user --transport stdio -- uvx --from git+https://github.com/GuDaStudio/codexmcp.git codexmcp` 注册
  - ~/.claude/settings.json 的 permissions.allow 已加入 mcp__codex__codex
---

# 与 Codex MCP 协同开发

> 通过 `mcp__codex__codex` 工具直接调用，无需命令行。始终使用 `read-only` 沙箱，要求 codex 只输出 unified diff patch。

---

## MCP 工具说明

### 工具名
`mcp__codex__codex`

### 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `PROMPT` | string | ✅ | - | 发送给 Codex 的任务指令（建议用英语） |
| `cd` | Path | ✅ | - | 工作目录根路径（必须存在） |
| `sandbox` | string | ❌ | `read-only` | `read-only` / `workspace-write` / `danger-full-access` |
| `SESSION_ID` | UUID | ❌ | None | 继续之前的会话，保持上下文 |
| `return_all_messages` | bool | ❌ | False | 是否返回推理过程和工具调用详情 |
| `model` | string | ❌ | None | 指定模型（None 使用用户默认配置） |
| `image` | List[Path] | ❌ | None | 附加图片文件 |
| `yolo` | bool | ❌ | False | 跳过沙箱审批（危险，不推荐） |
| `profile` | string | ❌ | None | 从 `~/.codex/config.toml` 加载的配置名 |
| `skip_git_repo_check` | bool | ❌ | False | 允许在非 Git 仓库中运行 |

### 返回值

```json
// 成功
{
  "success": true,
  "SESSION_ID": "uuid-string",     // 必须保存，用于多轮交互
  "agent_messages": "codex回复内容"
}

// 失败
{
  "success": false,
  "error": "错误信息"
}
```

---

## 标准协作流程

```
1. 需求分析阶段
   Claude 形成初步分析 → 告知 codex → codex 完善方案

2. 编码前（原型阶段）
   调用 codex（read-only）→ 要求输出 unified diff patch
   Claude 以 diff 为逻辑参考 → 重写为生产级代码

3. 编码后（审查阶段）
   调用 codex review 改动 → 验证需求完成度和代码质量
```

---

## 调用示例

### 场景一：需求分析完善

```
PROMPT: "Here is my requirement: [需求描述]. My initial approach: [初步思路].
Please review and improve the analysis and implementation plan.
Output: structured analysis with potential risks."

cd: /path/to/project
sandbox: read-only
```

### 场景二：获取代码原型（Diff）

```
PROMPT: "Generate a unified diff patch to implement [功能描述].
File: [目标文件路径]
Requirements:
- [要求1]
- [要求2]

IMPORTANT: Output unified diff patch ONLY. Do NOT modify any real files.
IMPORTANT: All Java comments and SQL COMMENTs MUST be in Chinese."

cd: /path/to/project
sandbox: read-only
```

### 场景三：代码审查

```
PROMPT: "Review the following code changes for correctness, performance, and security.
[粘贴代码或说明文件路径]

Check:
1. Logic correctness
2. Edge cases
3. Performance issues
4. Security vulnerabilities

Output: review with line numbers and severity (CRITICAL/WARNING/INFO)."

cd: /path/to/project
sandbox: read-only
```

### 场景四：多轮交互（继续会话）

```
// 第一轮
SESSION_ID: None → 保存返回的 SESSION_ID

// 第二轮
SESSION_ID: "上一轮返回的 uuid"
PROMPT: "Now refine the diff based on the feedback: [反馈内容]"
```

---

## 协作分工原则

| 角色 | Claude Code 负责 | Codex 负责 |
|------|-----------------|-----------|
| **架构** | 设计决策、规范审校 | 分析现有代码结构 |
| **开发** | 规范重写、最终代码实施 | 输出原型 diff（只读参考） |
| **审查** | 规范检查、最终判定 | 逐文件逻辑审查 |
| **调试** | 日志分析、问题定位 | 深度代码分析、补丁建议 |

### 重要约束

1. **只读优先**：始终使用 `sandbox="read-only"`
2. **英语 Prompt**：与 codex 交互用英语，代码注释要求中文
3. **脏原型思维**：codex 输出视为草稿，Claude 按项目规范重构
4. **保存 SESSION_ID**：每次调用后记录，多轮对话时传入
5. **质疑 codex**：codex 仅供参考，必须有独立判断

---

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| 工具未出现 | 重启 Claude Code，检查 `~/.claude.json` 中 codex 配置 |
| `cd` 参数报错 | 确认目录存在，使用绝对路径 |
| 连接超时 | 检查网络，`uvx --from git+https://github.com/GuDaStudio/codexmcp.git codexmcp` 手动测试 |
| SESSION_ID 失效 | 重新开启新会话（不传 SESSION_ID） |
| codex 修改了文件 | 确认 `sandbox="read-only"` 已设置 |

## 安装验证

```bash
# 查看 MCP 配置
cat ~/.claude.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('mcpServers', {}).get('codex', 'not found'))"

# 重启后运行
claude mcp list
# 期望看到: codex: uvx ... - ✓ Connected
```
