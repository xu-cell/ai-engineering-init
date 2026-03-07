# 贡献指南 — 团队协作维护 Skills

> 本文档说明团队成员如何参与维护和更新 Skills 技能库。

---

## 快速上手

### 方式一：修改本地已安装的 Skills（推荐）

适合：已在项目中用了一段时间，发现某个 Skill 需要更新/修正。

```bash
# 1. 找到并修改对应的 Skill 文件
# Claude Code 用户：
.claude/skills/<skill-name>/SKILL.md

# Cursor 用户：
.cursor/skills/<skill-name>/SKILL.md

# Codex 用户：
.codex/skills/<skill-name>/SKILL.md

# 2. 生成你的修改与官方版本的 diff，并提交 Issue
npx ai-engineering-init sync-back

# 3. 只提交指定技能的 diff
npx ai-engineering-init sync-back --skill <skill-name>

# 4. 自动提交 GitHub Issue（需要先安装 gh CLI）
npx ai-engineering-init sync-back --skill <skill-name> --submit
```

**sync-back 完整流程**：

```
你修改了本地 .claude/skills/crud-development/SKILL.md
    ↓
npx ai-engineering-init sync-back --skill crud-development --submit
    ↓
自动生成 unified diff，创建 GitHub Issue
    ↓
维护者审核、合并、发布新版本
    ↓
你运行 npx ai-engineering-init@latest update 获取更新
```

---

### 方式二：直接在源仓库开发（适合维护者）

适合：需要添加全新 Skill、重构多个 Skills、修改框架本身。

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/xu-cell/ai-engineering-init.git
cd ai-engineering-init

# 2. 创建功能分支
git checkout -b feat/skill-xxx

# 3. 在 src/skills/ 中开发（唯一事实源）
# 添加新技能：
mkdir src/skills/my-new-skill
# 创建 SKILL.md（参考下方模板）

# 4. 构建：将 src/skills/ 同步到三个平台目录
npm run build:skills

# 5. 验证构建结果
npm run check:skills

# 6. 提交（注意只提交 src/ 和构建产物，不提交个人配置）
git add src/skills/my-new-skill/
git add .claude/skills/my-new-skill/
git add .cursor/skills/my-new-skill/
git add .codex/skills/my-new-skill/
git commit -m "feat(skill): 新增 my-new-skill 技能"

# 7. 提交 PR 到 main 分支
git push origin feat/skill-xxx
# 然后在 GitHub 上创建 Pull Request
```

---

## 通用技能 vs 项目专属技能

### 判断标准

| 特征 | 通用技能 | 项目专属技能 |
|------|---------|-------------|
| **包名** | 使用占位符 `[你的包名]` | 硬编码如 `net.xnzn.core` |
| **框架** | 讲概念和模式 | 绑定特定框架 API |
| **异常类** | 使用占位符 `[你的业务异常类]` | 硬编码如 `LeException` |
| **审计字段** | 使用通用名 `create_by`/`create_time` | 使用项目名 `crby`/`crtime` |
| **命名前缀** | 无前缀（如 `crud-development`） | 有项目前缀（如 `leniu-crud-development`） |
| **适用范围** | 任何 Spring Boot 项目 | 特定项目 |

### 何时创建项目专属技能

- 你的项目有独特的架构模式（如四层架构、双库架构）
- 你的项目使用了非标准的命名约定
- 你的项目有特定的工具类封装
- 通用技能的代码示例需要大量修改才能使用

### 何时修改通用技能

- 通用技能中混入了特定项目的内容（应提取到专属技能）
- 通用技能缺少某个常见模式的说明
- 通用技能的代码示例有错误

---

## 新建 Skill 规范

### 目录结构

```
src/skills/<skill-name>/
├── SKILL.md              # 技能主文件（必须）
└── references/           # 可选：参考文档
    └── examples.md
```

### SKILL.md 模板

```markdown
---
name: skill-name
description: |
  一句话说明这个技能的用途。

  触发场景：
  - 场景1
  - 场景2

  触发词：关键词1、关键词2、关键词3
---

# 技能标题

## 核心规范

[在此写规范内容...]

## 代码示例

[在此写示例代码...]

## 常见错误

[在此写常见错误和正确做法...]
```

### 命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 通用技能 | `<功能>` | `crud-development` |
| 项目专属技能 | `<项目前缀>-<功能>` | `leniu-crud-development` |
| 协作技能 | `collaborating-with-<工具>` | `collaborating-with-codex` |

---

## 技能质量检查清单

提交 PR 前，请确认以下事项：

### 通用技能检查

- [ ] **无硬编码包名**：不包含 `org.dromara`、`net.xnzn` 等具体包名
- [ ] **无硬编码异常类**：不包含 `ServiceException`、`LeException` 等具体类名
- [ ] **无硬编码工具类**：不包含 `MapstructUtils`、`LoginHelper` 等框架工具
- [ ] **无硬编码路径**：不包含 `ruoyi-common`、`sys-canteen` 等模块路径
- [ ] **占位符规范**：使用 `[你的xxx]` 格式的占位符
- [ ] **有通用提示**：包含"如果项目有专属技能，优先使用"的提示
- [ ] **代码可运行**：示例代码基于标准 Spring Boot / JDK API

### 项目专属技能检查

- [ ] **有项目前缀**：技能名以项目前缀开头（如 `leniu-`）
- [ ] **有对应通用技能**：存在同名的通用版本
- [ ] **标注项目信息**：明确标注适用的项目和框架

### 占位符规范

在通用技能中，使用以下格式的占位符：

| 占位符 | 含义 | 示例值 |
|--------|------|--------|
| `[你的包名]` | 项目根包名 | `com.example.myapp` |
| `[你的业务异常类]` | 自定义业务异常 | `BusinessException` |
| `[你的对象转换工具]` | 对象映射工具 | `MapStruct`、`BeanUtils` |
| `[你的权限注解]` | 权限校验注解 | `@PreAuthorize`、`@SaCheckPermission` |
| `[你的审计字段基类]` | Entity 基类 | `BaseEntity`、`AuditEntity` |
| `[你的ID生成策略]` | 主键生成方式 | `雪花ID`、`UUID`、`自增` |
| `[你的分页工具]` | 分页查询工具 | `PageHelper`、`Page<T>` |
| `[你的缓存工具]` | 缓存操作工具 | `RedisTemplate`、`RedisUtils` |

---

## 提交规范

```bash
# 新增技能
feat(skill): 新增 xxx 技能

# 更新技能
docs(skill): 更新 crud-development 技能规范

# 修复技能
fix(skill): 修复 git-workflow 技能中的路径错误

# 重构技能
refactor(skill): 重构 brainstorm 技能结构

# 清理技能（移除框架耦合）
refactor(skill): 清除 security-guard 技能中的 RuoYi 耦合
```

---

## 平台分发规则

Skills 会根据 `src/platform-map.json` 分发到三个平台：

| 平台 | 目录 | 配置工具 |
|------|------|---------|
| Claude Code | `.claude/skills/` | Claude Code CLI |
| Cursor | `.cursor/skills/` | Cursor IDE |
| OpenAI Codex | `.codex/skills/` | Codex CLI |

大多数技能会分发到所有平台。如果某个技能只适合特定平台（如需要特定 MCP 工具），在 `platform-map.json` 中配置。

---

## 本地测试

```bash
# 1. 构建技能
npm run build:skills

# 2. 检查构建一致性（验证三平台文件是否同步）
npm run check:skills

# 3. 验证无 RuoYi 残留（通用技能）
grep -ri "org\.dromara\|ruoyi-modules\|ServiceException\|MapstructUtils\|TenantEntity\|BaseMapperPlus" src/skills/!(leniu-)*/SKILL.md

# 4. 验证占位符一致性
grep -r "\[你的" src/skills/!(leniu-)*/SKILL.md | head -20

# 5. 在你的项目中手动测试
# 将修改的 SKILL.md 复制到你的项目 .claude/skills/ 中测试效果
```

---

## 常见问题

**Q: 我改了 `.claude/skills/` 下的文件，怎么同步到 Cursor 和 Codex？**

A: `.claude/`、`.cursor/`、`.codex/` 是构建产物，源头在 `src/skills/`。
- 如果你在本地改了 `.claude/skills/`，用 `sync-back` 提交给维护者
- 维护者会在 `src/skills/` 中更新，重新构建后发布

**Q: 新增的技能如何让团队所有人都用上？**

A: 维护者发布新版本后，团队成员运行：
```bash
npx ai-engineering-init@latest update
```

**Q: 技能改坏了怎么恢复？**

A: 运行以下命令恢复到最新发布版本：
```bash
npx ai-engineering-init@latest update --force
```

**Q: 通用技能和专属技能都匹配了，用哪个？**

A: 项目专属技能优先。通用技能的 description 中会标注"如果项目有专属技能，优先使用"。

---

## 联系维护者

- 提交 Issue：[GitHub Issues](https://github.com/xu-cell/ai-engineering-init/issues)
- 提交 PR：fork 仓库 → 修改 `src/skills/` → 提交 Pull Request
