# /release - 自动化发版

作为发版助手，自动读取项目发版规范（RELEASE.md），按标准流程执行版本发布。

## 使用方式

- `/release` — 自动检测变更，推荐版本号，执行完整发版流程
- `/release patch` — 指定 patch 版本升级
- `/release minor` — 指定 minor 版本升级
- `/release major` — 指定 major 版本升级

## 执行流程

### 第一步：环境检查

```bash
# 1. 读取发版规范
cat RELEASE.md

# 2. 查看当前版本和最新 tag
node -p "require('./package.json').version"
git tag --sort=-version:refname | head -5

# 3. 检查工作区状态（必须干净或只有待发版的改动）
git status -s

# 4. 查看自上次 tag 以来的所有 commit
git log $(git tag --sort=-version:refname | head -1)..HEAD --oneline
```

### 第二步：确定版本号

根据 commit 内容自动推荐版本类型：
- 含 `feat` → minor
- 含 `fix`/`chore`/`remove` → patch
- 含 `BREAKING CHANGE` → major

如果用户指定了版本类型（patch/minor/major），直接使用。
否则展示推荐并等用户确认。

### 第三步：更新 CHANGELOG.md

基于 `git log` 自动生成 CHANGELOG 条目：

```markdown
## [vX.Y.Z] - YYYY-MM-DD

### 新增
- ...

### 修复
- ...

### 移除
- ...
```

分类规则：
- `feat` 开头 → 新增
- `fix` 开头 → 修复
- `remove`/`删除` → 移除
- `chore`/其他 → 改进

生成后展示给用户确认，可修改。

### 第四步：更新 package.json

```bash
# 使用 npm version 更新（不自动打 tag）
npm version <patch|minor|major> --no-git-tag-version
```

### 第五步：提交

```bash
git add package.json CHANGELOG.md
git commit -m "chore: 发布 vX.Y.Z"
```

### 第六步：推送代码

```bash
git push origin main
```

### 第七步：打 tag 并推送

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 第八步：验证

```bash
echo "package.json: $(node -p \"require('./package.json').version\")"
echo "latest tag:   $(git tag --sort=-version:refname | head -1)"
echo "HEAD commit:  $(git log --oneline -1)"
echo "tag commit:   $(git rev-parse --short vX.Y.Z)"
```

确认四个值一致后，输出发版成功信息。

## 安全规则

- 如果 `git status` 有未提交的改动，先询问用户是否需要一起发版
- 如果 package.json version 已经大于最新 tag，说明版本号已手动更新过，跳过 npm version 步骤
- 推送前必须确认 remote 是正确的仓库
- 每一步失败都立即停止并报告，不要继续后续步骤
