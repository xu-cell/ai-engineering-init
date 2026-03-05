---
name: codex-code-review
description: |
  Codex 代码审查工作流。在代码实现或 Bug 修复完成后，调用 Codex CLI 进行代码审查，展示审查结果，用户确认后自动修复问题。

  触发场景：
  - /dev 或 /crud 命令完成代码生成后
  - Bug 修复完成后
  - 用户说"审查代码"、"review"、"代码审查"、"codex审查"
  - 用户说"检查一下刚写的代码"

  触发词：codex审查、代码审查、review代码、审查代码、codex review、代码review
---

# Codex 代码审查工作流

> 依赖 `collaborating-with-codex` skill 的 `codex_bridge.py` 脚本。

## 工作流

### Phase 1: 收集变更范围

```bash
# 获取当前未提交的变更文件
git diff --name-only HEAD
git diff --cached --name-only
```

如果没有变更文件，提示用户"没有检测到代码变更"并终止。

将变更文件按类型分组：
- **Java 文件**：Controller / Business / Service / Mapper / Entity / VO / DTO
- **XML 文件**：Mapper XML
- **SQL 文件**：建表/变更脚本
- **其他**：配置文件等

### Phase 2: 调用 Codex 审查

针对变更的 Java 文件，构造审查 PROMPT：

```bash
python .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . \
  --sandbox read-only \
  --PROMPT "Review the following changed files for code quality issues:

FILES TO REVIEW:
{变更文件列表，含相对路径}

REVIEW CHECKLIST:
1. Bug risks: null pointer, off-by-one, resource leaks, concurrency issues
2. Security: SQL injection, XSS, missing auth checks, sensitive data exposure
3. Architecture: layer violations (Controller calling Mapper directly), missing Business layer for complex logic
4. Code quality: duplicate code, overly complex methods, missing error handling
5. Project conventions: wrong package name (must be net.xnzn.core.*), wrong audit fields (must use crby/crtime/upby/uptime), javax.validation (must use jakarta.validation)

OUTPUT FORMAT:
For each issue found, output:
- [SEVERITY] CRITICAL / WARNING / SUGGESTION
- [FILE] filepath:line_number
- [ISSUE] Brief description
- [FIX] Recommended fix

If no issues found, output: ALL CLEAR - No issues detected.

IMPORTANT LANGUAGE RULES:
- All review comments MUST be in Chinese
- File paths and code snippets remain in English"
```

**关键约束**：
- 始终使用 `--sandbox read-only`，Codex 不直接修改文件
- 变更文件过多时（>10 个），按模块分批审查
- 使用 `run_in_background` 避免阻塞

### Phase 3: 展示审查结果

解析 Codex 返回的 JSON，提取 `agent_messages`，按严重程度分组展示：

```
## Codex 审查结果

### 🔴 严重问题 (CRITICAL)
- `OrderInfoService.java:42` — 未做空值检查，可能 NPE
  建议：添加 ObjectUtil.isNull() 判断

### 🟡 警告 (WARNING)
- `OrderWebController.java:15` — 缺少 @RequiresAuthentication 注解
  建议：添加认证注解

### 🔵 建议 (SUGGESTION)
- `OrderDTO.java:8` — 字段命名可优化
  建议：使用更具描述性的名称

---
是否需要修复以上问题？
```

如果结果为 `ALL CLEAR`，展示"审查通过，未发现问题"并终止。

### Phase 4: 用户确认后修复

等待用户确认。用户可能：
- **全部修复**："修复所有问题" → 逐个修复所有 CRITICAL + WARNING
- **选择性修复**："只修复严重问题" → 仅修复 CRITICAL
- **跳过**："不需要修复" → 终止

修复时：
1. 按文件逐个修复，使用 Edit 工具
2. 每修复一个文件，简要说明改动
3. SUGGESTION 级别的问题默认跳过，除非用户明确要求
4. 修复完成后运行 `git diff` 展示所有变更

### Phase 5: 可选二次审查

修复完成后询问："是否需要再次审查确认？"
- 如果用户同意 → 回到 Phase 2 重新审查
- 如果用户拒绝 → 终止

## 审查重点（leniu 项目特有）

Codex PROMPT 中追加项目特有检查项：

```
PROJECT-SPECIFIC CHECKS:
- Package must be net.xnzn.core.* (NOT org.dromara.*)
- Audit fields: crby/crtime/upby/uptime (NOT createBy/createTime)
- del_flag: 1=deleted, 2=normal (NOT 0=normal)
- Use LeException (NOT ServiceException)
- Use BeanUtil.copyProperties() (NOT MapstructUtils)
- Use jakarta.validation.* (NOT javax.validation.*)
- No tenant_id field in Entity (dual-database physical isolation)
- Architecture: Controller → Business → Service → Mapper (4-layer)
- No Map for business data transfer (use VO/DTO)
```
