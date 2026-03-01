# 更新日志

> 所有版本变更记录，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [v1.2.1] - 2026-03-01

### 新增
- **`update` 命令**：一键更新已安装的框架文件（Skills/Commands/Agents/Hooks），自动跳过用户自定义文件（`settings.json`、`CLAUDE.md`、`AGENTS.md`、`mcp.json`）
  - `npx ai-engineering-init update` — 自动检测已安装工具并更新
  - `npx ai-engineering-init update --tool claude` — 只更新指定工具
  - `npx ai-engineering-init update --force` — 强制更新，包括保留文件
- **Codex MCP Server 集成**：将 OpenAI Codex CLI 以 MCP Server 方式接入 `.claude/settings.json`，Claude 可直接通过 `codex` / `codex-reply` 工具调用 Codex 进行代码审查与协同开发，无需 Python 桥接脚本
- **CHANGELOG.md**：从 README.md 拆分独立更新日志文件

### 优化
- CLI 版本号从 `package.json` 动态读取，Banner 自动同步

---

## [v1.2.0] - 2026-03-01

### 新增
- **Cursor Hooks 支持**（`.cursor/hooks.json` + `.cursor/hooks/`）
  - `beforeSubmitPrompt`：检测用户意图，自动注入相关技能文档路径引导 Agent 阅读（对应 Claude 的 `UserPromptSubmit`）
  - `preToolUse`：拦截危险 Shell 命令（`rm -rf /`、`drop database` 等），兼容 Cursor `Shell` 工具名
  - `stop`：复用 Claude 的 `stop.js`，支持 nul 文件清理和完成音效
- **leniu-brainstorm** 云食堂头脑风暴技能

### 修复
- **leniu-java-export** 技能示例代码：移除错误的 `Executors.readInSystem()` 包装（业务查询默认在商户库执行）
- **leniu-java-total-line** 技能：同步修正双库架构说明，`Executors.doInSystem()` 仅用于访问系统库

---

## [v1.1.1] - 2026-02-24

### 优化
- **npm 发布流程**
  - 预发布版本（含 `-`）自动发布到 `test` 标签
  - 正式版本自动发布到 `latest` 标签
  - GitHub Release 自动标记预发布版本（`prerelease: true`）

---

## [v1.1.0] - 2026-02-24

### 新增
- **Cursor 工具支持**（`.cursor/` 目录）
  - 同步 68 个 Skills 到 `.cursor/skills/`
  - 新增 Subagents 配置（`code-reviewer`、`project-manager`）
  - 新增 MCP 服务器配置（`sequential-thinking`、`context7`、`github`）
- **25 个 leniu 云食堂专项技能**
  - 覆盖金额处理、并发、MQ、定时任务、报表、餐次、营销规则等场景

---

## [v1.0.0]

### 新增
- 初始版本，支持 Claude Code 和 OpenAI Codex
- 内置通用后端技能、OpenSpec 工作流技能
- 自动化 Hooks（技能强制评估、代码规范检查）
