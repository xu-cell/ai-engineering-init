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

## 初始化后使用

### Claude Code

1. 按需修改 `CLAUDE.md` 中的项目信息
2. 输入 `/start` 快速了解项目，`/dev` 开发新功能，`/crud` 生成 CRUD，`/check` 检查规范

### Cursor

1. 在 Chat 中输入 `/` 查看可用 Skills，或 `@技能名` 手动调用
2. 在 Settings → MCP 中确认 MCP 服务器已连接

### OpenAI Codex

1. 按需修改 `AGENTS.md`，使用 `.codex/skills/` 下的技能辅助开发

## 更多信息

[参考文档](./docs/reference.md) — Skills 列表（69个）、包含内容、命令详情、其他安装方式、全部选项

[更新日志](./CHANGELOG.md) — 完整版本变更记录

## License

MIT
