# 更新日志

> 所有版本变更记录，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [v1.3.1] - 2026-03-02

### 修复
- **全局安装 Hooks 路径重写**：全局安装时自动将 hooks 命令中的相对路径（`.claude/hooks/`、`.cursor/hooks/`）重写为绝对路径
  - Claude Code: `node .claude/hooks/xxx.js` → `node /Users/you/.claude/hooks/xxx.js`
  - Cursor: `node .cursor/hooks/xxx.js` → `node /Users/you/.cursor/hooks/xxx.js`
  - 修复全局 `~/.claude/settings.json` 和 `~/.cursor/hooks.json` 中 hooks 因相对路径无法触发的问题
  - 新增 `rewritePaths()` 递归路径重写工具函数，支持 merge 和 copy 两种模式

---

## [v1.3.0] - 2026-03-02

### 新增
- **`global` 命令：全局安装（系统级别，对所有项目生效）**
  - 新增 `npx ai-engineering-init global` 命令，将 Skills/Commands/Hooks/Agents 安装到 `~/.claude` / `~/.cursor` / `~/.codex`
  - 支持 `--tool claude|cursor|codex|all` 指定工具
  - 支持 `--force` 强制覆盖已有全局文件
  - Claude Code `settings.json` 采用**合并安装**：Hooks 配置自动注入，用户已有的 env/model/statusLine 等完整保留
  - Cursor `hooks.json` + `mcp.json` 均正确安装，MCP 采用合并策略不覆盖用户已有服务器
  - 交互菜单新增选项 5「全局安装」
  - 帮助文档同步更新，补充 `global` 命令说明与示例
  - 移除 `.claude/settings.json` 中硬编码的 codex MCP 路径，避免分发到其他机器出错

---

## [v1.2.7] - 2026-03-02

### 修复
- **Cursor beforeSubmitPrompt hook 输出格式**：修复技能注入失效问题
  - 将 `console.log(instructions)` 改为 `console.log(JSON.stringify({ systemMessage: instructions }))`
  - Cursor 的 `beforeSubmitPrompt` hook 需要 JSON 格式 `{ "systemMessage": "..." }` 才能将内容注入 AI 上下文，纯 markdown 文本输出会被忽略

---

## [v1.2.6] - 2026-03-02

### 修复
- **Cursor stop hook 自包含**：将 `stop.js` 和 `completed.wav` 内置到 `.cursor/` 目录，不再依赖 Claude Code 安装
  - 新增 `.cursor/hooks/stop.js`（原来引用 `.claude/hooks/stop.js`）
  - 新增 `.cursor/audio/completed.wav` 音效文件
  - 音效查找策略：优先 `.cursor/audio/`，兼容 `.claude/audio/`（两者都安装时自动共用）
  - `hooks.json` stop 命令改为 `node .cursor/hooks/stop.js`

---

## [v1.2.5] - 2026-03-02

### 修复
- **Cursor hooks.json 格式兼容**：修复新版 Cursor 无法加载 hooks 的问题
  - 添加顶层 `"version": 1` 字段（Cursor 新版要求为数字类型）
  - 将 `command` 从嵌套 `hooks[]` 数组内提升到每个 hook 条目的顶层
  - 移除冗余的 `"type": "command"` 字段

---

## [v1.2.4] - 2026-03-02

### 新增
- **leniu-report-customization 技能**：新增定制报表开发技能，涵盖 `report_order_info`/`report_order_detail`/`report_account_flow` 基础表结构、退款数据处理模式、汇总报表开发模板

### 优化
- **技能触发词精准化**：移除所有 leniu-* 技能触发词中的 `leniu-` 前缀，改为自然语言关键词，提升匹配精准度
- **合并冗余技能**：`leniu-java-code-style` 合并到 `leniu-code-patterns`，消除重复
- **补充 YAML 头部**：为 `leniu-data-permission` 和 `leniu-redis-cache` 补充标准 YAML 头部
- **同步注册信息**：`skill-forced-eval.js` hook、`AGENTS.md`、`.cursor/skills/` 全部同步更新

---

## [v1.2.2] - 2026-03-01

### 新增
- **Windows MCP 路径说明**：在 README 中新增 Windows 用户配置 Codex MCP Server 路径的指引
  - `mcpServers.codex.command` 需改为 Windows 实际路径（如 `C:\Users\YourName\AppData\Roaming\npm\codex.cmd`）
  - 可通过 `where codex` 命令查询实际安装路径
  - 在"包含内容"和"初始化后使用"两处均已添加说明

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
