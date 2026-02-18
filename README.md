# AI Engineering Init

> 一键初始化 AI 工程化配置，支持 Claude Code、OpenAI Codex 等主流 AI 开发工具。

## 快速开始

### 方式一：npx（推荐，无需克隆）

```bash
# 交互式选择
npx ai-engineering-init

# 直接指定工具
npx ai-engineering-init --tool claude   # 初始化 Claude Code
npx ai-engineering-init --tool codex    # 初始化 OpenAI Codex
npx ai-engineering-init --tool all      # 初始化全部
```

### 方式二：Shell 脚本（远程执行）

```bash
# 交互式
bash <(curl -fsSL https://raw.githubusercontent.com/xujiajun/ai-engineering-init/main/init.sh)

# 直接指定工具
bash <(curl -fsSL https://raw.githubusercontent.com/xujiajun/ai-engineering-init/main/init.sh) --tool claude
```

### 方式三：克隆后初始化

```bash
git clone https://github.com/xujiajun/ai-engineering-init
cd ai-engineering-init
./init.sh --tool claude
```

## 支持的工具

| 工具 | 参数 | 初始化内容 |
|------|------|-----------|
| Claude Code | `--tool claude` | `.claude/` 目录 + `CLAUDE.md` |
| OpenAI Codex | `--tool codex` | `.codex/` 目录 + `AGENTS.md` |
| 全部 | `--tool all` | 以上全部 |

## 选项

```
--tool, -t <工具>   指定工具: claude | codex | all
--dir,  -d <目录>   目标目录（默认：当前目录）
--force,-f          强制覆盖已有文件
--help, -h          显示帮助
```

## 包含内容

- **`.claude/`** — Claude Code Skills、Commands、Hooks 等配置
- **`.codex/`** — OpenAI Codex Skills 配置
- **`CLAUDE.md`** — Claude Code 项目规范说明
- **`AGENTS.md`** — AI Agent 项目规范说明

## 初始化后使用

**Claude Code：**
1. 修改 `CLAUDE.md` 中的项目信息（包名、模块名等）
2. 在 Claude Code 中输入 `/start` 快速了解项目
3. 输入 `/dev` 开始开发新功能

**Codex：**
1. 修改 `AGENTS.md` 中的项目说明
2. 使用 `.codex/skills/` 下的技能辅助开发

## License

MIT
