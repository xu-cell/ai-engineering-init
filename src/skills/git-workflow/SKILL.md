---
name: git-workflow
description: |
  通用 Git 工作流指南。涵盖分支策略、提交规范、PR 流程、冲突解决等。
  触发场景：Git 操作、分支管理、提交规范、代码合并。
  触发词：Git、分支、提交、合并、rebase、PR。
  注意：如果项目有专属技能（如 `leniu-git-workflow`），优先使用专属版本。
---

# Git 工作流指南

> 通用模板。如果项目有专属技能（如 `leniu-git-workflow`），优先使用。

## 核心规范

### 分支策略（Git Flow）

```
main (production)
│
├── hotfix/fix-payment-bug     ← 紧急修复，从 main 拉出
│
develop (integration)
│
├── feature/order-export       ← 功能开发，从 develop 拉出
├── feature/user-profile       ← 并行开发
│
└── release/v1.2.0             ← 发布准备，从 develop 拉出
```

| 分支类型 | 来源 | 合并目标 | 命名 |
|---------|------|---------|------|
| `main` | - | - | `main` |
| `develop` | `main` | `main` | `develop` |
| `feature/*` | `develop` | `develop` | `feature/功能描述` |
| `release/*` | `develop` | `main` + `develop` | `release/v1.x.x` |
| `hotfix/*` | `main` | `main` + `develop` | `hotfix/问题描述` |

### 简化策略（GitHub Flow，适合小团队）

```
main
├── feature/order-export
├── fix/login-error
└── chore/upgrade-deps
```

- 只有 `main` 一个长期分支
- 所有开发从 `main` 拉分支，完成后通过 PR 合并回 `main`

### 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>
```

| type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(order): 新增订单导出` |
| `fix` | 修复 Bug | `fix(auth): 修复 token 过期未刷新` |
| `docs` | 文档 | `docs: 更新 API 文档` |
| `style` | 格式 | `style: 统一缩进为 4 空格` |
| `refactor` | 重构 | `refactor(user): 拆分用户服务` |
| `perf` | 性能 | `perf(query): 优化列表查询 N+1` |
| `test` | 测试 | `test(order): 补充订单创建单测` |
| `chore` | 构建/工具 | `chore: 升级 Spring Boot 3.2` |
| `ci` | CI/CD | `ci: 添加 GitHub Actions 流水线` |

**规则**：
- subject 使用中文或英文，但全项目统一
- 不超过 72 字符
- 不以句号结尾
- 使用祈使语气（"添加"而非"添加了"）

### 提交行为规范

1. **只提交当前会话的改动**：精确 `git add` 修改的文件，不要 `git add .`
2. **不提交配置文件**：排除 `.env*`、`application-*.yml` 等环境配置
3. **默认只提交到本地**：执行 `git add` + `git commit`，不自动 push
4. **明确指定才推送**：只有用户明确说"推送"、"push"时才执行 `git push`

## 代码示例

### 常用 Git 操作

```bash
# 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/order-export

# 开发完成，合并前更新
git fetch origin
git rebase origin/develop

# 解决冲突后继续
git add .
git rebase --continue

# 推送并创建 PR
git push -u origin feature/order-export
gh pr create --base develop --title "feat(order): 新增订单导出功能"
```

### 常用 Git 修复操作

```bash
# 修改最后一次提交信息
git commit --amend -m "fix(order): 修复订单金额计算"

# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 暂存当前修改
git stash
git stash pop

# 挑选某个提交到当前分支
git cherry-pick <commit-hash>

# 查看某个文件的修改历史
git log --oneline -20 -- path/to/file
```

### PR / Code Review 规范

1. **PR 大小**：单个 PR 不超过 400 行变更（不含自动生成代码）
2. **PR 描述**：说明改了什么、为什么改、如何测试
3. **自查清单**：
   - [ ] 代码能编译通过
   - [ ] 新功能有对应测试
   - [ ] 没有遗留 TODO / 调试代码
   - [ ] 数据库变更有迁移脚本
4. **Review 要点**：
   - 逻辑正确性 > 代码风格
   - 关注边界条件和异常处理
   - 检查安全隐患（SQL 注入、XSS 等）

### .gitignore 推荐配置

```gitignore
# IDE
.idea/
*.iml
.vscode/
*.swp

# Build
target/
build/
dist/
node_modules/

# Environment
.env
.env.local
*.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 直接在 main 上开发 | 创建功能分支 |
| 提交信息写"update"、"fix bug" | 按 Conventional Commits 规范 |
| 一个 PR 包含多个不相关改动 | 拆分为多个 PR |
| `git push --force` 到公共分支 | 只对个人分支 force push |
| 提交 .env、密钥文件 | 加入 .gitignore |
| merge 前不更新目标分支 | 先 rebase/merge 最新代码 |
| 忽略 CI 失败直接合并 | 修复 CI 后再合并 |
| `git add .` 一把梭 | 精确添加修改的业务文件 |
