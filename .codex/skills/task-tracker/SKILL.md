---
name: task-tracker
description: |
  开发任务进度跟踪系统。当用户需要记录复杂开发任务的需求、步骤、进度时自动使用此 Skill。
  创建 Markdown 文档实现任务上下文持久化，支持中断后快速恢复。

  触发场景：
  - 多步骤功能开发（需要跨会话）
  - 复杂需求的步骤分解与跟踪
  - 任务进度记录与更新
  - 中断后的任务恢复
  - 历史任务查询与归档

  触发词：创建任务、跟踪任务、记录进度、任务跟踪、继续任务、恢复任务、查看任务、归档任务、任务列表
---

# 任务跟踪技能

## 何时使用

✅ 用户明确要求跟踪任务（"创建任务跟踪"、"记录进度"、"跟踪这个任务"）
✅ 复杂的多步骤开发任务
✅ 需要跨会话恢复的工作

❌ 简单的单步操作
❌ 纯咨询性对话

## 目录结构

```
{项目根目录}/
└── docs/
    └── tasks/
        ├── README.md          # 使用说明（首次自动生成）
        ├── active/            # 进行中的任务
        │   └── task-20260121-153045-用户反馈.md
        └── archive/           # 已完成的任务
            └── 2026-01/
                └── task-20260120-优惠券系统.md
```

## 文档模板

```markdown
# 任务：{任务标题}

**状态**: 🟢 进行中 | 🔵 已完成 | 🔴 已暂停
**创建时间**: {YYYY-MM-DD HH:MM:SS}
**更新时间**: {YYYY-MM-DD HH:MM:SS}
**Git 分支**: {branch_name}

---

## 📋 需求描述

{用户原始需求的详细描述，包括背景、目标、约束条件}

---

## 🎯 实现步骤

- [ ] 1. {步骤1简述}
  - **文件**: `path/to/file.ext`
  - **说明**: {详细说明}

- [x] 2. {步骤2简述}
  - **文件**: `another/file.ext`
  - **说明**: {详细说明}
  - **完成时间**: {YYYY-MM-DD HH:MM}

- [ ] 3. {步骤3简述}

---

## 📝 关键决策

- **模块归属**: {模块名称}
- **数据库表**: {表名前缀}
- **主键策略**: {ID生成方式}
- **技术选型**: {框架/库版本}

---

## 🔄 当前进度

**已完成**: {X} / {总数} 步骤 ({百分比}%)

**下一步操作**:
1. {下一步具体要做的事情}
2. {再下一步}

---

## 📁 相关文件

- `{文件路径}` - {文件用途}

---

## ⚠️ 注意事项

- {需要特别注意的点}
- {已知问题或风险}

---

## 💬 变更记录

### {YYYY-MM-DD HH:MM}
- {本次更新内容}
```

## 核心操作

### 1. 创建任务

**触发**：用户说"创建任务跟踪"、"记录这个任务"

**步骤**：
```bash
# 1. 确保目录存在
mkdir -p docs/tasks/active docs/tasks/archive

# 2. 生成文件名
# 格式: task-{YYYYMMdd-HHMMSS}-{任务简称}.md
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SLUG="{任务标题简化版，截断30字符}"
FILENAME="task-${TIMESTAMP}-${SLUG}.md"

# 3. 创建文档
# 填充上述模板内容到 docs/tasks/active/$FILENAME

# 4. 首次使用时创建 README.md（如不存在）
```

**README.md 内容**：
```markdown
# 任务跟踪中心

## 目录说明
- `active/` - 进行中的任务
- `archive/` - 已完成的任务（按月归档）

## 使用方法
1. Claude 自动创建任务跟踪文档
2. 手动编辑文档更新进度（修改复选框）
3. 任务完成后移动到 archive/{年-月}/

## 快速恢复
```bash
# 查看活跃任务
ls -1 active/

# 恢复任务
cat active/task-20260121-*.md
```

### 2. 更新进度

**触发**：用户说"更新进度"、"标记步骤X完成"

**步骤**：
```bash
# 1. 找到当前任务文档（最新的那个）
TASK_FILE=$(ls -t docs/tasks/active/*.md | head -1)

# 2. 更新复选框: - [ ] → - [x]
sed -i "s/^- \[ \] ${STEP_NUMBER}\./- [x] ${STEP_NUMBER}./" "$TASK_FILE"

# 3. 更新时间戳
CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
sed -i "s/^\*\*更新时间\*\*:.*/\*\*更新时间\*\*: $CURRENT_TIME/" "$TASK_FILE"

# 4. 添加变更记录
echo -e "### $CURRENT_TIME\n- 完成步骤 $STEP_NUMBER: $DESCRIPTION" >> "$TASK_FILE"

# 5. 重新计算进度百分比
TOTAL=$(grep -c "^- \[.\]" "$TASK_FILE")
DONE=$(grep -c "^- \[x\]" "$TASK_FILE")
PERCENT=$((DONE * 100 / TOTAL))
```

### 3. 列出活跃任务

**触发**：用户说"有哪些任务"、"列出任务"

**步骤**：
```bash
for file in docs/tasks/active/*.md; do
  TITLE=$(grep "^# 任务：" "$file" | sed 's/^# 任务：//')
  STATUS=$(grep "^\*\*状态\*\*:" "$file" | sed 's/.*: //')
  PROGRESS=$(grep "^\*\*已完成\*\*:" "$file" | sed 's/.*: //')
  
  echo "📄 $TITLE"
  echo "   状态: $STATUS | 进度: $PROGRESS"
  echo "   文件: $file"
  echo ""
done
```

### 4. 恢复任务

**触发**：用户说"继续上次的任务"、"恢复任务"

**步骤**：
```bash
# 1. 确定要恢复的任务
if [ 用户指定了任务名 ]; then
  TASK_FILE=$(find docs/tasks/active -name "*{用户指定的关键词}*.md" | head -1)
else
  TASK_FILE=$(ls -t docs/tasks/active/*.md | head -1)  # 最新的
fi

# 2. 读取文档内容
cat "$TASK_FILE"

# 3. 提取关键信息并向用户确认
TITLE=$(grep "^# 任务：" "$TASK_FILE" | sed 's/^# 任务：//')
NEXT_STEPS=$(提取 "下一步操作" 部分)

# 4. 输出恢复信息
echo "正在恢复任务：$TITLE"
echo "下一步操作："
echo "$NEXT_STEPS"
```

### 5. 归档任务

**触发**：用户说"任务完成"、"归档任务"

**步骤**：
```bash
# 1. 更新状态
sed -i "s/^\*\*状态\*\*:.*/\*\*状态\*\*: 🔵 已完成/" "$TASK_FILE"

# 2. 移动到归档目录
YEAR_MONTH=$(date +%Y-%m)
mkdir -p "docs/tasks/archive/$YEAR_MONTH"
mv "$TASK_FILE" "docs/tasks/archive/$YEAR_MONTH/"

echo "✅ 已归档到: docs/tasks/archive/$YEAR_MONTH/"
```

## 使用示例

**场景1：创建任务**
```
用户: "创建一个用户反馈功能的任务跟踪"

Claude:
✅ 创建文档: docs/tasks/active/task-20260121-153045-用户反馈.md
📋 已记录需求描述
🎯 列出5个实现步骤
💡 开始第一步：设计数据库表结构
```

**场景2：更新进度**
```
用户: "标记步骤1和2完成"

Claude:
✅ 已更新进度: 2/5 (40%)
⏰ 更新时间: 2026-01-21 16:45:30
📌 下一步: 实现 Service 层
```

**场景3：恢复任务**
```
[用户重新打开窗口]
用户: "继续上次的用户反馈功能"

Claude:
📄 正在恢复任务：用户反馈管理功能
✅ 已完成: 数据库设计、实体类创建 (2/5)
📌 下一步: 实现 Service 层
🔗 文件: docs/tasks/active/task-20260121-153045-用户反馈.md
```

## 最佳实践

**应该做**：
- ✅ 一个任务 = 一个完整功能开发
- ✅ 及时更新进度（完成一步更新一次）
- ✅ 详细记录关键决策
- ✅ 保留原始需求描述

**不应该做**：
- ❌ 为每个小改动创建任务
- ❌ 删除旧任务（归档即可）
- ❌ 自动归档（由用户决定）

## 错误处理

**目录不存在** → 自动创建 `docs/tasks/active` 和 `archive`

**没有活跃任务** → 提示用户：创建新任务 | 恢复归档任务 | 查看历史

**文档格式错误** → 尽量解析，提示用户保持格式：
- 保持 `##` 标题层级
- 复选框格式：`- [ ]` 或 `- [x]`
- 不删除 `**字段**` 标记

## 功能边界

**适用于**：单人开发、本地存储、快速恢复上下文

**不适用于**：多人协作、实时同步、复杂依赖管理（请使用专业项目管理工具）
