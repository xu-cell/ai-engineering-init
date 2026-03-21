# leniu-dev

> 🐂 AI 工程化开发工具 — 一键安装 Skills、Commands、Hooks 到 Claude Code / Cursor / Codex

[![npm version](https://img.shields.io/npm/v/leniu-dev)](https://www.npmjs.com/package/leniu-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 快速开始

```bash
# 交互式安装向导（推荐）
npx leniu-dev install

# 或直接指定工具和角色
npx leniu-dev install --tool claude --role backend
```

安装向导会引导你完成 5 个步骤：
1. **选择角色** — 后端研发 / 前端研发 / 产品经理 / 全部
2. **选择工具** — Claude Code / Cursor / Codex / 全部
3. **配置服务** — MySQL / Loki（可跳过）
4. **安装 MCP** — 推荐 MCP 服务器一键安装
5. **确认安装** — 查看摘要后开始

## 命令一览

| 命令 | 说明 |
|------|------|
| `npx leniu-dev install` | 交互式安装向导 |
| `npx leniu-dev@latest update` | 更新已安装的框架文件 |
| `npx leniu-dev syncback` | 推送本地技能修改到源仓库 |
| `npx leniu-dev config` | 环境配置（MySQL / Loki） |
| `npx leniu-dev mcp` | MCP 服务器管理 |
| `npx leniu-dev doctor` | 诊断安装状态 |
| `npx leniu-dev uninstall` | 卸载已安装文件 |
| `npx leniu-dev help` | 显示帮助 |

> 运行 `npx leniu-dev help` 查看全部选项和示例。

## 角色化安装

不同角色安装不同的技能包，通用技能（导航/Git/审查/云效等）所有角色都有：

| 角色 | 技能数 | 包含内容 |
|------|--------|---------|
| 🖥️ 后端研发 | 89 | CRUD/API/数据库/异常/日志/MQ/Redis/部署/测试... |
| 🎨 前端研发 | 41 | UI组件/Vuex/Gemini协作/Git... |
| 📋 产品经理 | 37 | 需求分析/蓝湖/图片生成/任务管理... |
| 🔧 全部 | 91 | 所有技能 |

```bash
npx leniu-dev install --tool claude --role backend   # 后端研发
npx leniu-dev install --tool claude --role frontend  # 前端研发
npx leniu-dev install --tool claude --role product   # 产品经理
```

## 3 分钟上手

```bash
# 第一步：安装
npx leniu-dev install --tool claude

# 第二步：修改配置（必做！）
# CLAUDE.md 是示例模板，把 [你的xxx] 占位符替换为项目实际信息

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

> **包含内容**：91 个 Skills 技能 + 20 个快捷命令 + 9 个多模型分层 Agent + 自动化 Hooks

## 从 v1 迁移

v2 简化了命令结构，旧命令自动兼容：

| v1 命令 | v2 命令 | 说明 |
|---------|---------|------|
| `npx ai-engineering-init` | `npx leniu-dev install` | 改为用户级安装 |
| `npx ai-engineering-init global` | `npx leniu-dev install` | 不再区分项目/全局 |
| `npx ai-engineering-init sync-back` | `npx leniu-dev syncback` | 命令简化 |
| `npx ai-engineering-init config` | `npx leniu-dev config` | 不变 |
| `npx ai-engineering-init mcp` | `npx leniu-dev mcp` | 不变 |

## 更多信息

[参考文档](./docs/reference.md) — Skills 列表、包含内容、命令详情

[更新日志](./CHANGELOG.md) — 完整版本变更记录

[贡献指南](./CONTRIBUTING.md) — 如何维护和更新 Skills，团队协作工作流

## License

MIT
