---
name: git-workflow
description: |
  当需要进行 Git 版本控制操作时自动使用此 Skill。

  触发场景：
  - 提交代码
  - 创建/合并分支
  - 查看提交历史
  - 解决冲突
  - 回滚代码

  触发词：git、提交、commit、分支、合并、push、pull、冲突、回滚、版本、历史
---

# Git 工作流指南

## ⚠️ 本项目提交规范（必须遵守）

### 核心原则

1. **只提交当前会话的改动**：只 `git add` 当前聊天中修改或新增的文件
2. **不提交配置文件**：排除 `.env*`、`application*.yml` 等配置
3. **默认只提交到本地**：执行 `git add` + `git commit`，**不自动 push**
4. **明确指定才推送**：只有用户明确说"推送"、"push"、"提交到远程"时才执行 `git push`

### 提交信息格式

```
<type>(<scope>): <subject>
```

> **注意**：本项目是纯后端项目，无需平台前缀。

### 提交示例

```bash
# 新功能
feat(system): 新增用户反馈功能

# 修复 Bug
fix(demo): 修复订单状态显示错误

# 文档更新
docs(readme): 更新安装说明

# 重构
refactor(common): 重构分页查询工具类

# 性能优化
perf(system): 优化用户列表查询性能

# 测试
test(demo): 添加单元测试
```

### 提交流程

```bash
# 1. 查看当前改动
git status

# 2. 只添加当前会话修改的业务文件（排除配置）
git add ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/xxx/
# 或者添加具体文件
git add path/to/file1.java path/to/file2.java

# 3. 提交到本地（不 push！）
git commit -m "feat(system): 新增xxx功能"

# 4. 只有用户明确要求时才推送
# git push  # ← 用户说"推送"时才执行
```

### 不要提交的文件

```bash
# ❌ 配置文件（绝对不提交）
ruoyi-admin/src/main/resources/application.yml
ruoyi-admin/src/main/resources/application-*.yml
ruoyi-common/**/resources/*.yml

# ❌ IDE 配置
.idea/
.vscode/
*.iml

# ❌ 本地临时文件
*.log
target/
logs/
```

---

## 提交类型说明

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat(system): 新增用户反馈功能` |
| fix | 修复Bug | `fix(demo): 修复订单状态显示错误` |
| docs | 文档更新 | `docs(readme): 更新安装说明` |
| style | 代码格式 | `style(system): 格式化代码` |
| refactor | 重构 | `refactor(common): 重构用户模块` |
| perf | 性能优化 | `perf(system): 优化查询性能` |
| test | 测试 | `test(demo): 添加单元测试` |
| chore | 构建/工具 | `chore: 更新依赖` |

### scope 常用范围

| scope | 说明 | 对应模块 |
|-------|------|----------|
| system | 系统管理 | `ruoyi-modules/ruoyi-system/` |
| demo | 演示模块 | `ruoyi-modules/ruoyi-demo/` |
| workflow | 工作流 | `ruoyi-modules/ruoyi-workflow/` |
| job | 定时任务 | `ruoyi-modules/ruoyi-job/` |
| generator | 代码生成 | `ruoyi-modules/ruoyi-generator/` |
| common | 通用模块 | `ruoyi-common/` |
| admin | 启动模块 | `ruoyi-admin/` |

---

## 常用命令

### 基础操作

```bash
# 查看状态
git status

# 查看改动
git diff
git diff --staged  # 已暂存的改动

# 添加文件
git add .          # 添加所有（谨慎使用！）
git add <file>     # 添加指定文件（推荐）

# 提交
git commit -m "提交信息"

# 推送（需用户明确要求）
git push
git push -u origin <branch>  # 首次推送并设置上游
```

### 分支操作

```bash
# 查看分支
git branch         # 本地分支
git branch -r      # 远程分支
git branch -a      # 所有分支

# 创建分支
git branch <name>
git checkout -b <name>  # 创建并切换

# 切换分支
git checkout <name>
git switch <name>

# 合并分支
git merge <name>

# 删除分支
git branch -d <name>     # 删除本地
git push origin -d <name>  # 删除远程
```

### 历史查看

```bash
# 查看提交历史
git log
git log --oneline
git log --oneline -10  # 最近10条

# 查看某文件历史
git log --follow <file>

# 查看某次提交的内容
git show <commit-id>
```

### 撤销操作

```bash
# 撤销工作区修改
git checkout -- <file>
git restore <file>

# 撤销暂存
git reset HEAD <file>
git restore --staged <file>

# 撤销提交（保留修改）
git reset --soft HEAD^

# 撤销提交（丢弃修改）
git reset --hard HEAD^

# 回滚到某个提交
git reset --hard <commit-id>
```

---

## 分支策略

### 主要分支

| 分支 | 用途 | 说明 |
|------|------|------|
| 5.X | 主分支 | 生产/发布代码（本项目主分支） |
| dev | 开发分支 | 日常开发代码 |
| feature/* | 功能分支 | 新功能开发 |
| fix/* | 修复分支 | Bug修复 |
| release/* | 发布分支 | 版本发布 |

### 工作流程

```bash
# 1. 从 dev 创建功能分支
git checkout dev
git pull
git checkout -b feature/user-feedback

# 2. 开发并提交（只提交当前会话改动的业务文件）
git add ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/feedback/
git commit -m "feat(system): 新增用户反馈功能"

# 3. 用户明确要求时才推送到远程
git push -u origin feature/user-feedback

# 4. 创建 Pull Request 合并到 dev

# 5. 合并后删除功能分支
git checkout dev
git pull
git branch -d feature/user-feedback
```

---

## 冲突解决

### 合并冲突

```bash
# 1. 拉取最新代码
git pull

# 2. 如果有冲突，Git 会提示
# Auto-merging xxx.java
# CONFLICT (content): Merge conflict in xxx.java

# 3. 打开冲突文件，手动解决
# <<<<<<< HEAD
# 当前分支的代码
# =======
# 要合并的代码
# >>>>>>> feature/xxx

# 4. 解决后添加并提交
git add .
git commit -m "fix: 解决合并冲突"
```

### 变基冲突

```bash
# 1. 变基
git rebase dev

# 2. 如果有冲突，解决后
git add .
git rebase --continue

# 3. 放弃变基
git rebase --abort
```

---

## 实用技巧

### 暂存修改

```bash
# 暂存当前修改
git stash

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop        # 恢复并删除
git stash apply      # 恢复但保留

# 删除暂存
git stash drop
git stash clear      # 清空所有
```

### 修改提交

```bash
# 修改最后一次提交信息
git commit --amend -m "新的提交信息"

# 追加到最后一次提交
git add .
git commit --amend --no-edit
```

### Cherry-pick

```bash
# 把某个提交应用到当前分支
git cherry-pick <commit-id>
```

### 查看某人的提交

```bash
git log --author="作者名"
```

---

## 注意事项

### 禁止操作

1. **不要强制推送到主分支**
   ```bash
   # ❌ 禁止
   git push --force origin 5.X
   ```

2. **不要在主分支直接开发**
   ```bash
   # ❌ 禁止
   git checkout 5.X
   # 直接修改代码...
   ```

3. **不要提交敏感信息和配置文件**
   ```bash
   # ❌ 禁止提交
   application.yml
   application-dev.yml
   application-prod.yml
   credentials.json
   password.txt
   ```

4. **不要自动 push（除非用户明确要求）**
   ```bash
   # ❌ 默认不执行
   git push

   # ✅ 只有用户说"推送到远程"时才执行
   git push
   ```

### 最佳实践

1. **只提交当前会话改动**：不要 `git add .`，精确添加修改的文件
2. **排除配置文件**：配置文件包含本地环境信息，不应提交
3. **清晰的提交信息**：包含类型 + 范围 + 描述
4. **默认只本地提交**：`git add` + `git commit`，不自动 push
5. **频繁小步提交**：便于追踪和回滚
6. **Code Review**：通过 PR 合并代码
