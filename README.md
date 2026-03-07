# AI Engineering Init

> 一键初始化 AI 工程化配置，支持 Claude Code、Cursor、OpenAI Codex 等主流 AI 开发工具。

[![npm version](https://img.shields.io/npm/v/ai-engineering-init)](https://www.npmjs.com/package/ai-engineering-init)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 快速开始

```bash
npx ai-engineering-init
```

交互式选择工具，或直接指定：

```bash
npx ai-engineering-init --tool claude   # Claude Code
npx ai-engineering-init --tool cursor   # Cursor
npx ai-engineering-init --tool codex    # OpenAI Codex
npx ai-engineering-init --tool all      # 全部
```

## 命令一览

| 命令 | 说明 |
|------|------|
| `npx ai-engineering-init` | 交互式初始化到当前项目 |
| `npx ai-engineering-init@latest update` | 更新已安装的框架文件 |
| `npx ai-engineering-init@latest global` | 全局安装到 `~/.claude` 等，所有项目生效 |
| `npx ai-engineering-init sync-back` | 对比本地技能修改，反馈回源仓库 |

> 所有命令均支持 `--tool <claude|cursor|codex|all>` 指定工具。运行 `--help` 查看全部选项。

## 3 分钟上手

```bash
# 第一步：安装
npx ai-engineering-init --tool claude

# 第二步：修改配置（⚠️ 必做！）
# CLAUDE.md 和 AGENTS.md 是示例模板，包含 [你的xxx] 占位符
# 把它们替换为你的项目实际信息（包名、技术栈、架构规范等）

# 第三步：验证
# 在 Claude Code 中输入 /start，AI 会扫描并介绍你的项目
```

**核心命令**（第一天用这 3 个就够了）：

| 命令 | 作用 |
|------|------|
| `/start` | AI 扫描项目，给出概览 |
| `/dev` | 从需求到代码的完整开发流程 |
| `/check` | 检查代码是否符合规范 |

**更多命令**：`/crud`（生成增删改查）、`/progress`（项目进度）、`/sync`（代码状态同步）

> **包含内容**：88 个 Skills 技能 + 10 个快捷命令 + 自动化 Hooks。详见 [参考文档](./docs/reference.md)。

## 初始化后使用

### Claude Code

1. **必做**：修改 `CLAUDE.md` — 将 `[你的xxx]` 占位符替换为项目实际信息
2. 输入 `/start` 验证 AI 是否正确理解你的项目
3. MCP 工具已自动配置（`sequential-thinking`、`context7`），无需额外设置

### Cursor

1. **必做**：检查 `.cursor/mcp.json` 中的 MCP 服务器配置
2. 在 Chat 中输入 `/` 查看可用 Skills，或 `@技能名` 手动调用
3. 在 Settings → MCP 中确认 MCP 服务器已连接

### OpenAI Codex

1. **必做**：修改 `AGENTS.md` — 将模板内容替换为你的项目规范
2. 使用 `.codex/skills/` 下的技能辅助开发

## 更多信息

[参考文档](./docs/reference.md) — Skills 列表、包含内容、命令详情、其他安装方式、全部选项

[更新日志](./CHANGELOG.md) — 完整版本变更记录

[贡献指南](./CONTRIBUTING.md) — 如何维护和更新 Skills，团队协作工作流

## License

MIT
