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

本指南用于在 RuoYi-Vue-Plus 框架中添加新的技能（Skill）。技能通过 UserPromptSubmit Hook 自动评估和激活，确保 AI 在编码前加载领域专业知识。

**技能系统工作原理**：

```
用户提交问题
  ↓ skill-forced-eval.js Hook 触发
注入技能评估指令
  ↓ AI 评估匹配的技能
逐个调用 Skill(技能名)
  ↓ 读取 .claude/skills/{技能名}/SKILL.md
AI 获得领域知识后开始实现
```

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

### description 第一行风格

第一行没有强制格式，参考现有技能的两种常见风格：

**风格 A：直述型**（多数技能采用）
```yaml
description: |
  后端 CRUD 开发规范。基于 RuoYi-Vue-Plus 三层架构。
  后端安全开发规范。包含 Sa-Token 认证授权、数据脱敏。
  后端工具类使用指南。包含 MapstructUtils、StringUtils 等。
```

**风格 B：触发型**
```yaml
description: |
  当需要进行技术选型、对比方案时自动使用此 Skill。
  当需要为框架增加新技能时自动使用此 Skill。
```

### 实际技能 YAML 头部示例

```yaml
---
name: crud-development
description: |
  后端 CRUD 开发规范。基于 RuoYi-Vue-Plus 三层架构（Controller → Service → Mapper），无独立 DAO 层。

  触发场景：
  - 新建业务模块的 CRUD 功能
  - 创建 Entity、BO、VO、Service、Mapper、Controller
  - 分页查询、新增、修改、删除、导出
  - 查询条件构建（buildQueryWrapper）

  触发词：CRUD、增删改查、新建模块、Entity、BO、VO、Service、Mapper、Controller、分页查询、buildQueryWrapper、@AutoMapper、BaseMapperPlus、TenantEntity
---
```

```yaml
---
name: redis-cache
description: |
  当需要使用Redis缓存、分布式锁、限流等功能时自动使用此Skill。

  触发场景：
  - 使用Redis缓存数据
  - 配置Spring Cache缓存注解
  - 实现分布式锁
  - 实现接口限流

  触发词：Redis、缓存、Cache、@Cacheable、@CacheEvict、@CachePut、RedisUtils、CacheUtils、分布式锁、RLock、限流、RateLimiter
---
```

---

## 第 1 步：规划

### 1.1 定义技能属性

创建前先明确：

| 属性 | 说明 | 示例 |
|------|------|------|
| **名称** | kebab-case 格式 | `payment-gateway` |
| **类别** | 后端/通用/前端（需 plus-ui） | 后端 |
| **触发场景** | 至少 3 个具体场景 | 支付接入、退款处理、对账 |
| **触发词** | 至少 5 个关键词 | 支付、退款、订单、对账、Payment |
| **参考代码** | 项目中的真实代码位置 | `ruoyi-modules/ruoyi-system/` |

### 1.2 检查范围冲突

查看现有技能列表，确保不与已有技能重叠：

**当前已有技能**（`.claude/skills/` 下 33 个）：

| 分类 | 技能 |
|------|------|
| 后端开发 | crud-development, api-development, database-ops, backend-annotations, utils-toolkit, error-handler |
| 安全权限 | security-guard, data-permission, tenant-management |
| 中间件 | redis-cache, json-serialization, scheduled-jobs, file-oss-management |
| 通信集成 | websocket-sse, sms-mail, social-login, workflow-engine |
| 质量保障 | test-development, bug-detective, performance-doctor, code-patterns |
| 架构决策 | architecture-design, tech-decision, brainstorm, project-navigator |
| 工具流程 | git-workflow, task-tracker, add-skill |
| 前端（需 plus-ui） | ui-pc, store-pc |
| 特殊功能 | banana-image, collaborating-with-codex, collaborating-with-gemini |

如果新技能与现有技能有交集，在 SKILL.md 中用"注意"段落说明边界：
```markdown
注意：如果是认证授权（登录、Token、Sa-Token），请使用 security-guard。
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
- **包名统一 `org.dromara.*`**，不要出现 `com.ruoyi.*`
- **三层架构**：Controller → Service → Mapper，无 DAO 层
- **对象转换用 `MapstructUtils.convert()`**，不要写 BeanUtils
- 技能不需要固定行数要求，以内容实用为准（实际范围 200-650 行）

### 2.4 不同类型技能的侧重

| 类型 | 侧重 | 示例 |
|------|------|------|
| 后端开发类 | 代码模板、标准写法、禁止项 | crud-development |
| 工具类 | API 列表、使用示例、返回值 | utils-toolkit |
| 中间件类 | 配置方法、集成步骤、注意事项 | redis-cache |
| 流程类 | 步骤说明、决策树、检查清单 | brainstorm |

---

## 第 3 步：注册技能

技能需要在两个位置注册，才能被系统识别和激活。

### 3.1 在 Hook 中注册

**文件**：`.claude/hooks/skill-forced-eval.js`

在 `可用技能（纯后端项目）：` 列表中添加一行：

```javascript
- {技能名}: {触发词，用/分隔}
```

**示例**：
```javascript
- payment-gateway: 支付/退款/对账/Payment/支付宝/微信支付
```

**注意**：按逻辑分组插入，不是追加到末尾。

### 3.2 在 AGENTS.md 中注册

**文件**：`AGENTS.md` 的"技能清单与触发条件"表格

在对应分类下添加一行：

```markdown
| `{技能名}` | {触发条件简述} |
```

**示例**：
```markdown
| `payment-gateway` | 支付接入、退款、对账、支付宝/微信支付 |
```

### 3.3 验证注册

```bash
# 检查 hook 文件
grep "payment-gateway" .claude/hooks/skill-forced-eval.js

# 检查 AGENTS.md
grep "payment-gateway" AGENTS.md
```

---

## 第 4 步：Codex 同步

项目同时支持 Claude Code（`.claude/`）和 Codex CLI（`.codex/`）两个系统。

### 同步步骤

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
- 普通技能（非斜杠命令）需要保持两个目录一致

---

## 第 5 步：验证

### 完整检查清单

**文件**：
- [ ] `.claude/skills/{技能名}/SKILL.md` 已创建
- [ ] `.codex/skills/{技能名}/SKILL.md` 已同步

**YAML 头部**：
- [ ] `name` 使用 kebab-case 格式
- [ ] description 包含触发场景（至少 3 个）
- [ ] description 包含触发词（至少 5 个）
- [ ] 各部分之间有空行

**注册**：
- [ ] `.claude/hooks/skill-forced-eval.js` 已添加技能条目
- [ ] `AGENTS.md` 已添加技能条目

**内容**：
- [ ] 代码示例来自项目实际代码，无虚构内容
- [ ] 包名使用 `org.dromara.*`
- [ ] 与现有技能无范围冲突（或已说明边界）

---

## 常见陷阱

### 1. 遗漏注册

**症状**：技能文件存在但从不被激活

**原因**：只创建了 SKILL.md，没有在 Hook 和 AGENTS.md 中注册

**解决**：完成第 3 步的两处注册

### 2. 触发词过于宽泛

**症状**：技能在不相关场景被频繁误触发

**原因**：触发词太通用（如"开发"、"功能"）

**解决**：使用具体术语（如"CRUD开发"、"支付接入"）

### 3. 代码示例虚构

**症状**：AI 参考技能生成的代码使用了不存在的类或方法

**原因**：编写技能时没有验证引用的类名、方法名在项目中真实存在

**解决**：编写前用 Grep/Glob 搜索确认引用的类和方法确实存在

### 4. 忘记同步到 Codex

**症状**：Claude Code 中正常，Codex CLI 中找不到技能

**原因**：只在 `.claude/skills/` 创建，未复制到 `.codex/skills/`

**解决**：`cp .claude/skills/{技能名}/SKILL.md .codex/skills/{技能名}/SKILL.md`

### 5. 技能范围与现有技能重叠

**症状**：同一个问题触发多个技能，指导矛盾

**解决**：在 SKILL.md 末尾添加"注意"段落说明边界，例如：
```
注意：如果是行级数据权限（@DataPermission），请使用 data-permission。
```
