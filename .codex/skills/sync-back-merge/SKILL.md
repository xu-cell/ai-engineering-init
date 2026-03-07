---
name: sync-back-merge
description: |
  合并 sync-back Issue 到源仓库的标准流程。当维护者需要处理由 `npx ai-engineering-init sync-back --submit` 自动创建的 GitHub Issue 时使用。
  触发场景：合并 sync-back Issue、处理技能改进反馈、合并用户提交的技能修改。
---

# sync-back Issue 合并流程

将用户通过 `sync-back --submit` 提交的技能改进 Issue 合并到源仓库。

## 流程步骤

### 1. 查看待处理 Issue

```bash
gh issue list --repo xu-cell/ai-engineering-init --label "" --search "[sync-back]" --state open
```

### 2. 读取 Issue 内容

```bash
gh issue view <ISSUE_NUMBER> --repo xu-cell/ai-engineering-init
```

从 Issue 中提取：
- 修改的技能名称列表
- 每个技能的 diff 内容（`---/+++/@@ @@` 格式）

### 3. 审查 diff

逐个检查每个技能的改动：
- 内容是否合理、准确
- 是否符合项目规范
- 是否有安全风险

### 4. 应用改动到源目录

**关键**：改动必须应用到 `src/skills/<skill-name>/SKILL.md`（单一源），不要直接改 `.claude/` 或 `.cursor/`。

根据 diff 中的 `@@ @@` 行号和上下文，用 Edit 工具逐个修改对应的源文件。

### 5. 构建同步

```bash
npm run build:skills
```

自动同步到 `.claude/skills/`、`.cursor/skills/`、`.codex/skills/` 三个平台目录。

### 6. 关闭 Issue

```bash
gh issue close <ISSUE_NUMBER> --repo xu-cell/ai-engineering-init --comment "已合并到 src/skills/，将在下个版本发布。"
```

### 7. 提交代码（可选）

如用户要求提交：

```bash
git add src/skills/<skill-name>/SKILL.md .claude/skills/ .cursor/skills/ .codex/skills/
git commit -m "feat(skills): 合并 sync-back 技能改进 (#<ISSUE_NUMBER>)"
```

如用户要求发版，按 `RELEASE.md` 流程操作。
