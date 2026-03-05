---
name: add-skill
description: |
  当需要为框架增加新技能、为新的模块功能编写技能文档时自动使用此 Skill。

  触发场景：
  - 需要为新模块添加技能
  - 需要为新功能编写技能文档
  - 需要扩展框架的技能系统
  - 需要将实现步骤转化为可复用技能

  触发词：添加技能、创建技能、新技能、技能开发、写技能、技能文档、skill 创建
---

# 技能创建指南

## 概述

本指南用于在 leniu-tengyun-core 项目中添加新的技能（Skill）。项目同时支持三个 AI 编码平台，技能需在所有平台保持一致。

## 核心设计原则

### 精简至上

上下文窗口是共享资源。技能与系统提示、对话历史、其他技能元数据共享窗口。

**默认假设：AI 已经很聪明。** 只添加 AI 本身不具备的知识。每段内容都应自问："AI 真的需要这个解释吗？"、"这段内容值得占用 token 吗？"

**优先用简洁的代码示例代替冗长的文字说明。**

### 自由度控制

根据任务的脆弱性和变化性，匹配不同的指定程度：

| 自由度 | 适用场景 | 形式 |
|--------|---------|------|
| **高** | 多种方案均可，依赖上下文决策 | 文字描述指导 |
| **中** | 有推荐模式但允许变通 | 伪代码/带参数脚本 |
| **低** | 操作脆弱易错，必须严格一致 | 精确脚本/步骤 |

### 渐进披露

技能使用三级加载系统管理上下文：

1. **元数据（name + description）** — 始终在上下文中（~100 词）
2. **SKILL.md 正文** — 技能触发时加载（< 500 行）
3. **捆绑资源** — 按需加载（无限制）

**SKILL.md 正文控制在 500 行以内。** 接近上限时拆分到独立文件。拆分后必须在 SKILL.md 中引用并说明何时读取。

**大技能拆分模式**：

```
技能名/
├── SKILL.md              # 核心流程 + 导航（< 500 行）
├── references/           # 按需加载的参考文档
│   ├── patterns.md       # 设计模式详解
│   └── examples.md       # 完整代码示例
└── assets/               # 输出资源（模板、图片等）
```

当技能支持多种变体时，按变体组织 references：
```
leniu-report-xxx/
├── SKILL.md
└── references/
    ├── basic-report.md    # 基础报表模式
    ├── summary-report.md  # 汇总报表模式
    └── analysis-report.md # 分析报表模式
```

### 三平台架构

| 平台 | 技能目录 | Hook 文件 | 激活方式 |
|------|---------|-----------|---------|
| **Claude Code** | `.claude/skills/{技能名}/SKILL.md` | `.claude/hooks/skill-forced-eval.js` | `Skill(技能名)` 工具调用 |
| **Codex CLI** | `.codex/skills/{技能名}/SKILL.md` | 无独立 hook | 依赖 AGENTS.md 引导 |
| **Cursor** | `.cursor/skills/{技能名}/SKILL.md` | `.cursor/hooks/cursor-skill-eval.js` | Read 文件读取 |

### 技能系统工作原理

**Claude Code**：
```
用户提交问题
  ↓ skill-forced-eval.js Hook 触发
注入技能评估指令（列出可用技能 + 触发词）
  ↓ AI 评估匹配的技能
逐个调用 Skill(技能名)
  ↓ 读取 .claude/skills/{技能名}/SKILL.md
AI 获得领域知识后开始实现
```

**Cursor**：
```
用户提交问题
  ↓ cursor-skill-eval.js Hook 触发
扫描 skillMap 关键词匹配
  ↓ 注入读取指令
AI 读取 .cursor/skills/{技能名}/SKILL.md
  ↓ 同时 skill-activation.mdc 规则也可触发读取
AI 获得领域知识后开始实现
```

### 各平台注册位置速查

新建技能需要修改以下文件：

| # | 文件 | 作用 | 必须 |
|---|------|------|------|
| 1 | `.claude/skills/{技能名}/SKILL.md` | 技能主文件 | 是 |
| 2 | `.claude/hooks/skill-forced-eval.js` | Claude Code 触发词注册 | 是 |
| 3 | `AGENTS.md` | Codex 技能清单 | 是 |
| 4 | `.cursor/skills/{技能名}/SKILL.md` | Cursor 技能文件 | 是 |
| 5 | `.cursor/hooks/cursor-skill-eval.js` | Cursor 关键词映射 | 是 |
| 6 | `.cursor/rules/skill-activation.mdc` | Cursor 规则触发 | 是 |
| 7 | `.codex/skills/{技能名}/SKILL.md` | Codex 技能文件 | 是 |

---

## YAML 头部规范

每个 SKILL.md 文件**必须**以 YAML 头部开始：

```yaml
---
name: {技能名称}
description: |
  {第一行：简短描述（一句话说明技能用途或定位）}

  触发场景：
  - {场景1}
  - {场景2}
  - {场景3}
  （至少3个场景）

  触发词：{关键词1}、{关键词2}、{关键词3}、{关键词4}、{关键词5}
  （至少5个触发词，用中文顿号分隔）
---
```

### name 字段规范

| 规则 | 说明 | 示例 |
|------|------|------|
| **格式** | kebab-case（全小写，横线连接） | `json-serialization` |
| **禁止** | 下划线、驼峰、空格 | ~~`json_serialization`~~, ~~`jsonSerialization`~~ |
| **长度** | 1-4 个单词 | `ui-pc`, `crud-development`, `redis-cache` |
| **leniu 前缀** | leniu 专项技能加 `leniu-` 前缀 | `leniu-crud-development` |

### description 第一行风格

**风格 A：直述型**（多数技能采用）
```yaml
description: |
  后端 CRUD 开发规范。基于四层架构（Controller → Business → Service → Mapper）。
  后端安全开发规范。包含认证授权、数据脱敏。
```

**风格 B：触发型**
```yaml
description: |
  当需要进行技术选型、对比方案时自动使用此 Skill。
```

---

## 第 0 步：理解需求

> 跳过条件：技能的使用模式已经很清楚时可跳过。

创建有效技能前，先用具体示例理解技能将如何被使用：

1. **收集使用场景**：用户会说什么触发这个技能？
2. **识别可复用内容**：哪些代码/模板/参考文档在每次使用时都会重复？
3. **确定资源类型**：重复代码/技术文档 → `references/`；输出模板 → `assets/`；高频规则 → SKILL.md 正文

---

## 第 1 步：规划

### 1.1 定义技能属性

| 属性 | 说明 | 示例 |
|------|------|------|
| **名称** | kebab-case 格式 | `leniu-payment-gateway` |
| **类别** | 后端/通用/前端 | 后端 |
| **触发场景** | 至少 3 个具体场景 | 支付接入、退款处理、对账 |
| **触发词** | 至少 5 个关键词 | 支付、退款、订单、对账、Payment |
| **参考代码** | 项目中的真实代码位置 | `sys-canteen/.../order/` |

### 1.2 检查范围冲突

查看现有技能列表，确保不与已有技能重叠：

```bash
# 查看所有技能
ls .claude/skills/
```

如果新技能与现有技能有交集，在 SKILL.md 末尾用"注意"段落说明边界：
```markdown
注意：如果是认证授权（登录、Token），请使用 leniu-security-guard。
```

---

## 第 2 步：编写 SKILL.md

### 2.1 文件位置

```
.claude/skills/{技能名}/SKILL.md
```

### 2.2 推荐内容结构

```markdown
---
name: {技能名称}
description: |
  {描述、触发场景、触发词}
---

# {技能标题}

## 概述
{简明介绍，1-2 段}

## 核心工具类/API
{主要类和方法列表}

## 使用规范
{最佳实践和规则}

## 代码示例
{真实代码片段}

## 常见错误
{正确做法 vs 错误做法对比}

## 注意
{与其他技能的边界说明}
```

### 2.3 内容质量要点

- **代码示例必须来自项目实际代码**，不要虚构类名、方法名
- **包名统一 `net.xnzn.core.*`**，不要出现 `org.dromara.*` 或 `com.ruoyi.*`
- **四层架构**：Controller → Business → Service → Mapper
- **对象转换用 `BeanUtil.copyProperties()`**（Hutool），不要写 MapstructUtils
- **异常用 `LeException`**，不要写 ServiceException
- **审计字段**：`crby/crtime/upby/uptime`，不要写 createBy/createTime
- 技能不需要固定行数要求，以内容实用为准（实际范围 200-650 行）

### 2.4 不同类型技能的侧重

| 类型 | 侧重 |
|------|------|
| 后端开发类 | 代码模板、标准写法、禁止项 |
| 工具/中间件类 | API 列表、配置方法、使用示例 |
| 流程/报表类 | 步骤说明、SQL 模板、决策树 |

---

## 第 3 步：注册技能（Claude Code）

技能需要在 **两个** 位置注册，才能被 Claude Code 识别和激活。

### 3.1 在 Claude Hook 中注册

**文件**：`.claude/hooks/skill-forced-eval.js`

在 `可用技能（纯后端项目）：` 列表中添加一行：

```javascript
- {技能名}: {触发词，用/分隔}
```

**示例**：
```javascript
- leniu-payment-gateway: 支付/退款/对账/Payment/支付宝/微信支付
```

**注意**：按逻辑分组插入（leniu 专项技能放在一起），不是追加到末尾。

### 3.2 在 AGENTS.md 中注册

**文件**：`AGENTS.md` 的"技能清单与触发条件"表格

```markdown
| `{技能名}` | {触发条件简述} |
```

### 3.3 验证 Claude Code 注册

```bash
grep "{技能名}" .claude/hooks/skill-forced-eval.js
grep "{技能名}" AGENTS.md
```

---

## 第 4 步：注册技能（Cursor）

Cursor 有**三处**需要注册。

### 4.1 复制 SKILL.md 到 Cursor

```bash
mkdir -p .cursor/skills/{技能名}
cp .claude/skills/{技能名}/SKILL.md .cursor/skills/{技能名}/SKILL.md
```

### 4.2 在 Cursor Hook 中注册

**文件**：`.cursor/hooks/cursor-skill-eval.js`

在 `skillMap` 数组的对应分组中添加条目：

```javascript
// 在 skillMap 数组中找到对应分组，添加：
{
  name: '{技能名}',
  keywords: ['关键词1', '关键词2', '关键词3', '关键词4', '关键词5']
},
```

**分组说明**（按注释标记）：
- `// ========== leniu 专项技能 ==========` — leniu 前缀的技能
- `// ========== OpenSpec 工作流 ==========` — openspec 技能
- `// ========== 通用技能 ==========` — 通用技能（无 leniu 前缀）

**示例**：
```javascript
{
  name: 'leniu-payment-gateway',
  keywords: ['leniu-支付', 'leniu-退款', 'leniu-对账', '支付宝', '微信支付']
},
```

### 4.3 在 Cursor Rules 中注册

**文件**：`.cursor/rules/skill-activation.mdc`

在对应分组的表格中添加一行：

```markdown
| {触发词，用/分隔} | `.cursor/skills/{技能名}/SKILL.md` |
```

**分组说明**：
- `### leniu 专项技能` — leniu 前缀的技能
- `### OpenSpec 工作流技能` — openspec 技能
- `### 通用技能` — 通用技能

**示例**：
```markdown
| leniu-支付/leniu-退款/leniu-对账/支付宝/微信支付 | `.cursor/skills/leniu-payment-gateway/SKILL.md` |
```

### 4.4 验证 Cursor 注册

```bash
grep "{技能名}" .cursor/hooks/cursor-skill-eval.js
grep "{技能名}" .cursor/rules/skill-activation.mdc
ls .cursor/skills/{技能名}/SKILL.md
```

---

## 第 5 步：Codex 同步

```bash
# 1. 创建 Codex 目录
mkdir -p .codex/skills/{技能名}

# 2. 复制文件
cp .claude/skills/{技能名}/SKILL.md .codex/skills/{技能名}/SKILL.md

# 3. 验证一致性
diff .claude/skills/{技能名}/SKILL.md .codex/skills/{技能名}/SKILL.md
```

**注意**：
- `.codex/skills/` 中额外存放斜杠命令型技能（如 dev, crud, check 等），这些不需要在 `.claude/` 中创建
- 普通技能（非斜杠命令）需要保持三个目录一致

---

## 第 6 步：验证

### 完整检查清单

**主文件**：
- [ ] `.claude/skills/{技能名}/SKILL.md` 已创建

**Claude Code 注册**：
- [ ] `.claude/hooks/skill-forced-eval.js` 已添加技能条目
- [ ] `AGENTS.md` 已添加技能条目

**Cursor 注册**：
- [ ] `.cursor/skills/{技能名}/SKILL.md` 已同步
- [ ] `.cursor/hooks/cursor-skill-eval.js` skillMap 已添加条目
- [ ] `.cursor/rules/skill-activation.mdc` 已添加触发行

**Codex 同步**：
- [ ] `.codex/skills/{技能名}/SKILL.md` 已同步

**YAML 头部**：
- [ ] `name` 使用 kebab-case 格式
- [ ] description 包含触发场景（至少 3 个）
- [ ] description 包含触发词（至少 5 个）

**内容**：
- [ ] 代码示例来自项目实际代码，无虚构内容
- [ ] 包名使用 `net.xnzn.core.*`
- [ ] 与现有技能无范围冲突（或已说明边界）

### 一键验证命令

```bash
SKILL_NAME="{技能名}"

echo "=== Claude ===" && \
ls .claude/skills/$SKILL_NAME/SKILL.md && \
grep "$SKILL_NAME" .claude/hooks/skill-forced-eval.js && \
grep "$SKILL_NAME" AGENTS.md && \
echo "" && echo "=== Cursor ===" && \
ls .cursor/skills/$SKILL_NAME/SKILL.md && \
grep "$SKILL_NAME" .cursor/hooks/cursor-skill-eval.js && \
grep "$SKILL_NAME" .cursor/rules/skill-activation.mdc && \
echo "" && echo "=== Codex ===" && \
ls .codex/skills/$SKILL_NAME/SKILL.md && \
echo "" && echo "=== 三平台一致性 ===" && \
diff .claude/skills/$SKILL_NAME/SKILL.md .cursor/skills/$SKILL_NAME/SKILL.md && \
diff .claude/skills/$SKILL_NAME/SKILL.md .codex/skills/$SKILL_NAME/SKILL.md && \
echo "全部通过"
```

---

## 常见陷阱

### 1. 遗漏注册（最常见）

**症状**：技能文件存在但从不被激活

**原因**：只创建了 SKILL.md，没有完成注册。三平台共 **7 处**需要操作。

**解决**：对照第 6 步检查清单逐项确认

### 2. Cursor Hook 遗漏

**症状**：Claude Code 中正常，Cursor 中技能不激活

**原因**：只注册了 `.cursor/rules/skill-activation.mdc`，忘了注册 `.cursor/hooks/cursor-skill-eval.js`（或反之）

**解决**：Cursor 有两处需要注册——Hook 负责编程匹配触发，Rules 负责规则文本触发，**两处都需要**

### 3. 三平台 SKILL.md 不一致

**症状**：不同平台的 AI 给出不同的代码建议

**原因**：修改了 `.claude/` 中的 SKILL.md 后，忘记同步到 `.cursor/` 和 `.codex/`

**解决**：修改后执行同步：
```bash
SKILL_NAME="{技能名}"
cp .claude/skills/$SKILL_NAME/SKILL.md .cursor/skills/$SKILL_NAME/SKILL.md
cp .claude/skills/$SKILL_NAME/SKILL.md .codex/skills/$SKILL_NAME/SKILL.md
```

### 4-7. 其他常见问题

| # | 症状 | 原因 | 解决 |
|---|------|------|------|
| 4 | 技能频繁误触发 | 触发词太通用（如"开发"） | 用具体术语（如"CRUD开发"） |
| 5 | 生成代码引用不存在的类 | 代码示例虚构 | 编写前用 Grep/Glob 确认类和方法存在 |
| 6 | 多技能触发、指导矛盾 | 技能范围重叠 | SKILL.md 末尾添加"注意"段落说明边界 |
| 7 | 生成代码编译失败 | 写了 `org.dromara.*` | 统一使用 `net.xnzn.core.*` |

---

## 迭代优化

技能创建后持续改进：使用技能完成真实任务 → 发现不足 → 更新 SKILL.md → 同步三平台 → 重新测试。

> **提示**：不要创建多余的文档文件（README.md 等）。技能只包含 AI 执行任务所需的信息。
