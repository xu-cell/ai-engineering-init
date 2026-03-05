# 更新日志

> 所有版本变更记录，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [v1.5.0] - 2026-03-05

### 新增
- **单一源架构（src/skills/）**：建立 `src/skills/` 作为唯一事实源（Single Source of Truth），彻底解决三平台同步遗忘问题
- **构建脚本（build-skills.js）**：`npm run build:skills` 从 `src/skills/` 自动生成 `.claude/`、`.codex/`、`.cursor/` 三个平台目录
- **一致性检查（check:skills）**：`npm run check:skills` 验证三平台与源文件一致性（CI 可用）
- **平台映射配置（platform-map.json）**：精确定义每个技能分发到哪些平台，支持平台独有技能

### 架构变更
- 84 个技能统一管理于 `src/skills/`，通过构建分发到三平台
- 平台分发规则：Claude 73 个、Codex 83 个、Cursor 73 个
- 以前需要手动同步三个目录，现在**改一处 → 运行 build → 三平台自动一致**

---

## [v1.4.3] - 2026-03-05

### 优化
- **leniu-java-export 技能大幅重构**：全面扩充导出规范，新增同步导出、异步分页导出（Feign 跨模块）完整模板，补充 VO 注解规范（`CustomNumberConverter` 金额转换）、Service 层导出逻辑、导出列控制、数据脱敏、性能优化等章节
- **三平台完整同步**：修复 `.codex/` 和 `.cursor/` 仅同步了局部改动的问题，全量覆盖为 `.claude/` 最新版本

---

## [v1.4.2] - 2026-03-05

### 优化
- **bug-detective 技能联动增强**：新增 `mysql-debug` 联动说明，诊断到数据问题时自动激活数据库查询验证
- **project-navigator 技能重构**：精简内容结构，提升导航效率
- **三平台同步**：`.claude/`、`.codex/`、`.cursor/` 同步更新上述技能
- **CLAUDE.md 增强**：补充工作流编排、Agent 团队策略、自我改进循环等核心工作原则

---

## [v1.4.1] - 2026-03-04

### 修复
- **cursor hooks.json 路径兼容性**：将 `$(git rev-parse --show-toplevel)` 替换为跨平台 Node.js 目录遍历逻辑，解决非 git 仓库工作区和子目录场景下 hook 执行失败的问题；同时支持 Windows/macOS/Linux
- **cursor-skill-eval.js 技能注册补全**：补充 9 个未注册技能（`add-skill`、`banana-image`、`collaborating-with-codex`、`collaborating-with-gemini`、`leniu-brainstorm`、`leniu-report-customization`、`leniu-report-standard-customization`、`mysql-debug`、`openspec-onboard`），技能注册数从 64 提升至 73，与技能目录完全对齐

---

## [v1.4.0] - 2026-03-04

### 优化
- **全量技能精简重构（72 个技能）**：按"精简至上"设计原则，将所有技能压缩至 500 行以内（平均削减 53%），移除 AI 已知内容，只保留项目特有知识
- **渐进披露架构（references/ 目录）**：为 22 个内容丰富的技能创建 `references/` 子目录，将完整模板、字段参考、详细示例拆分为按需加载的参考文档
- **YAML 头部标准化**：为全部 72 个技能补全"触发场景"（≥3 个）和"触发词"（≥5 个），修复 10 个 OpenSpec 技能及 banana-image 技能的缺失问题
- **三平台同步**：优化后的 72 个技能（含 references/ 目录）全量同步至 `.codex/skills/` 和 `.cursor/skills/`，保留各平台专有技能不受影响

---

## [v1.3.4] - 2026-03-03

### 新增
- **leniu-report-standard-customization 技能**：新增标准版（core-report 模块）定制报表开发技能，涵盖经营分析、营业额分析、用户活跃度、菜品排行、操作员统计、账户日结等场景

### 优化
- **add-skill 技能重构**：优化技能创建文档，提升技能编写指引的清晰度
- **leniu-report-customization 技能**：补充更多报表开发模板和示例
- **skill-forced-eval.js**：同步注册 `leniu-report-standard-customization` 触发词
- **skill-activation.mdc**：同步注册标准版报表技能触发词到 Cursor Rules
- **AGENTS.md**：同步更新技能注册信息

---

## [v1.3.3] - 2026-03-03

### 修复
- **Cursor beforeSubmitPrompt hook 技能注入失效**：根本原因是 `systemMessage` 字段不在 Cursor 支持范围内
  - Cursor `beforeSubmitPrompt` 只支持 `{continue, user_message}`，之前输出 `{systemMessage}` 被直接忽略
  - 改为同时输出 `prompt`（修改用户 prompt 注入指引）和 `user_message`（fallback 备注），覆盖 Cursor 可能支持的字段

### 新增
- **`.cursor/rules/skill-activation.mdc`（核心兜底）**：利用 Cursor Rules 系统实现永久技能激活
  - `alwaysApply: true` — Cursor 将其内容注入**每次对话的系统上下文**，不依赖 hook 协议
  - 包含完整的触发词 → SKILL.md 路径映射表（leniu 专项、OpenSpec 工作流、通用技能三大分类）
  - AI 识别到触发词后自动读取对应 SKILL.md，确保技能激活率接近 100%

---

## [v1.3.2] - 2026-03-03

### 修复
- **音效搜索路径升级为 4 层回退**：确保任何安装方式下音效都能正常播放
  - `.claude/hooks/stop.js`：从单一路径升级为 4 层搜索（工作区 `.claude/` → `.cursor/` → 全局 `~/.claude/` → `~/.cursor/`）
  - `.cursor/hooks/stop.js`：从 2 层搜索升级为 4 层搜索，补充全局路径回退
  - 与全局 `~/.cursor/hooks/stop.js` 的搜索策略保持一致
- **安装脚本补充 audio 目录**：`update` 和 `global` 命令现在会正确安装音效文件
  - `UPDATE_RULES` 新增 `.claude/audio` 和 `.cursor/audio` 目录
  - `GLOBAL_RULES` 新增 `audio` 目录到 `~/.claude/audio/` 和 `~/.cursor/audio/`
  - 之前只有 `init`（整个目录复制）才会包含音效，`update`/`global` 会遗漏

### 移除
- **leniu-java-code-style 技能**：移除已合并到其他技能的冗余代码风格文档

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
