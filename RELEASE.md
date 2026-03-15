# 发包流程（标准操作手册）

> **核心约束**：CI 会校验 `package.json version == git tag`，顺序必须严格执行。

---

## 发版前确认清单

在执行任何 git 操作前，必须完成以下确认：

```
□ 1. 确定新版本号（遵循 semver：major.minor.patch）
□ 2. package.json version 已更新
□ 3. CHANGELOG.md 已新增版本条目
□ 4. 所有需要发版的文件已 git add
□ 5. git status 无遗漏文件
```

---

## 标准发版步骤（按顺序执行）

### 第一步：确定版本号

```bash
# 查看当前版本
node -p "require('./package.json').version"

# 查看已有 tag
git tag --sort=-version:refname | head -5
```

### 第二步：同步更新三个地方（必须同步！）

```bash
# 1. 修改 package.json version
#    "version": "x.y.z"

# 2. 新增 CHANGELOG.md 条目
#    ## [vx.y.z] - YYYY-MM-DD

# 3. 确认无其他未提交改动
git status
```

### 第三步：提交所有改动

```bash
git add package.json CHANGELOG.md [其他改动文件]
git commit -m "chore: 发布 vx.y.z"
```

### 第四步：推送代码

```bash
git push origin main
```

### 第五步：打 tag 并推送（在代码推送成功后）

```bash
git tag vx.y.z
git push origin vx.y.z
```

### 第六步：验证

```bash
# 确认 tag 指向最新 commit
git log --oneline -3
git rev-parse vx.y.z

# 确认版本一致
node -p "require('./package.json').version"
```

---

## 版本规范

| 类型 | 版本变化 | 示例 |
|------|---------|------|
| 重大不兼容变更 | major +1 | 1.3.3 → 2.0.0 |
| 新功能（向后兼容） | minor +1 | 1.3.3 → 1.4.0 |
| Bug 修复、小改动 | patch +1 | 1.3.3 → 1.3.4 |
| 测试版/预发布 | 加后缀 | 1.4.0-beta.1 |

> 测试版（含 `-` 的版本）会发布到 npm `test` tag，不影响 `latest`。

---

## 常见错误与修复

### ❌ 错误：tag 打在错误的 commit 上

```bash
# 症状：package.json version 与 tag 不匹配

# 修复：删除旧 tag，重打到正确 commit
git tag -d vx.y.z                    # 删除本地 tag
git push origin :refs/tags/vx.y.z   # 删除远程 tag
git tag vx.y.z <正确的 commit-hash>  # 重打 tag
git push origin vx.y.z              # 推送新 tag
```

### ❌ 错误：忘记更新 package.json 就打了 tag

```bash
# 正确做法：先改 package.json → 提交 → 再打 tag
# 绝对不要：先打 tag → 再改 package.json
```

### ❌ 错误：CHANGELOG 有内容但 package.json 没更新

```bash
# 三个地方必须同步：package.json + CHANGELOG + tag
```

---

## 快速命令（一键核对）

```bash
# 发版前核对：版本号 / 最新 tag / 最新 commit
echo "package.json: $(node -p \"require('./package.json').version\")" && \
echo "latest tag:   $(git tag --sort=-version:refname | head -1)" && \
echo "HEAD commit:  $(git log --oneline -1)"
q```
