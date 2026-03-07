---
name: codex-code-review
description: |
  代码审查工作流。分两阶段：先执行本地规范检查（Grep 即时完成）+ 代码逻辑审查（Read 逐文件），再可选调用 Codex CLI 深度审查。

  触发场景：
  - /dev 或 /crud 命令完成代码生成后
  - Bug 修复完成后
  - 用户说"审查代码"、"review"、"代码审查"、"检查代码"
  - 用户说"检查一下刚写的代码"
  - Stop Hook 提示后用户输入"review"

  触发词：代码审查、review、审查代码、检查代码、code review、代码质量、codex审查、codex review
---

# 代码审查工作流

> 两阶段审查：**本地检查**（规范 + 逻辑） + **Codex 深度审查**（可选）。

## Phase 1: 收集变更范围

```bash
git diff --name-only HEAD
git diff --cached --name-only
```

如果没有变更文件，提示"没有检测到代码变更"并终止。

将变更文件按类型分组：
- **Java 文件**：Controller / Business / Service / Mapper / Entity / VO / DTO
- **XML 文件**：Mapper XML
- **SQL 文件**：建表/变更脚本
- **其他**：配置文件等

---

## Phase 2: 本地检查（必做）

分两步执行：**Step A** 用 Grep 批量扫描规范问题（秒级），**Step B** 用 Read 逐文件审查代码逻辑。

### Step A: 项目规范扫描（Grep 批量检查）

#### 🔴 A1. 包名规范
```bash
Grep pattern: "package org\.dromara\." path: [目标目录] glob: "*.java"
```
- ❌ `package org.dromara.xxx` → ✅ `package net.xnzn.core.xxx`

#### 🔴 A2. 禁止 RuoYi 工具类
```bash
Grep pattern: "MapstructUtils" path: [目标目录] glob: "*.java"
Grep pattern: "ServiceException" path: [目标目录] glob: "*.java"
Grep pattern: "import javax\.validation" path: [目标目录] glob: "*.java"
```
- ❌ `MapstructUtils` → ✅ `BeanUtil.copyProperties()`
- ❌ `ServiceException` → ✅ `LeException`
- ❌ `javax.validation.*` → ✅ `jakarta.validation.*`（JDK 21）

#### 🔴 A3. 审计字段名称
```bash
Grep pattern: "private.*createBy|private.*updateBy|private.*createTime|private.*updateTime" path: [目标目录] glob: "*.java"
```
- ❌ `createBy/updateBy/createTime/updateTime` → ✅ `crby/upby/crtime/uptime`

#### 🔴 A4. del_flag 值语义
```bash
Grep pattern: "delFlag.*=.*0|del_flag.*=.*0" path: [目标目录] glob: "*.java"
```
- ❌ `delFlag = 0`（RuoYi 正常值） → ✅ `delFlag = 2`（leniu 正常值，1=删除）

#### 🔴 A5. Entity 不含 tenant_id
```bash
Grep pattern: "tenantId|tenant_id" path: [目标目录] glob: "*.java"
```
- ❌ 双库物理隔离，无需 `tenant_id` 字段

#### 🔴 A6. 禁止 Map 传递业务数据
```bash
Grep pattern: "Map<String,\s*Object>" path: [目标目录] glob: "*.java"
```
- ❌ `Map<String, Object>` → ✅ 使用 VO/DTO 类

#### 🟡 A7. 事务注解缺少 rollbackFor
```bash
Grep pattern: "@Transactional\b" path: [目标目录] glob: "*.java"
# 对命中文件二次检查：是否缺少 rollbackFor
Grep pattern: "@Transactional\((?!.*rollbackFor)" path: [命中文件]
```
- ❌ `@Transactional` → ✅ `@Transactional(rollbackFor = Exception.class)`

#### 🟡 A8. 请求体封装
```bash
Grep pattern: "@RequestBody [^L]" path: [目标目录] glob: "*Controller.java"
```
- 建议 POST 请求使用 `@RequestBody LeRequest<T>` 封装

#### 🟡 A9. 金额类型错误
```bash
Grep pattern: "Double|Float|double|float" path: [目标目录] glob: "*.java"
# 在命中行中检查是否涉及金额字段（amount/price/money/fee/cost）
```
- ❌ `Double/Float` 处理金额 → ✅ `Long`（分）或 `BigDecimal`

#### 🟡 A10. BigDecimal 比较错误
```bash
Grep pattern: "BigDecimal.*==|==.*BigDecimal" path: [目标目录] glob: "*.java"
```
- ❌ `bigDecimal1 == bigDecimal2` → ✅ `bigDecimal1.compareTo(bigDecimal2) == 0`

#### 🟡 A11. SELECT * 查询
```bash
Grep pattern: "SELECT \*|select \*" path: [目标目录] glob: "*.xml"
```
- ❌ `SELECT *` → ✅ 明确列出需要的字段

#### 🟡 A12. SQL 注入风险
```bash
Grep pattern: '\$\{' path: [目标目录] glob: "*.xml"
```
- ❌ `${}` 拼接参数 → ✅ `#{}` 参数化查询（ORDER BY 等特殊场景除外）

#### 🟡 A13. 国际化异常
```bash
Grep pattern: 'new LeException\("[^"]*[\u4e00-\u9fa5]' path: [目标目录] glob: "*.java"
```
- 建议使用 `I18n.getMessage()` 替代硬编码中文

---

### Step B: 代码逻辑审查（Read 逐文件检查）

对每个变更的 Java 文件执行 Read，按以下清单逐项审查。

#### Java 必检项（所有 Java 文件）

| # | 检查项 | 检查要点 | 严重级 |
|---|--------|---------|--------|
| B1 | **空指针风险** | `selectOne`/`getOne`/`selectById` 返回值是否有 null 判断；Optional 是否正确处理 | 🔴 |
| B2 | **参数校验** | 入参是否校验非空和合法性（`@NotNull`/`@NotEmpty`/`Objects.requireNonNull`/手动 if 判断） | 🔴 |
| B3 | **并发安全** | 查询+新增/查询+更新的组合操作是否有竞态条件；是否需要分布式锁 | 🔴 |
| B4 | **事务边界** | 多表写操作是否加了 `@Transactional(rollbackFor = Exception.class)` | 🔴 |
| B5 | **资源关闭** | Stream/IO流/数据库连接是否用 try-with-resources 或 finally 关闭 | 🔴 |
| B6 | **集合并发修改** | `forEach` 内是否有 remove/add 操作；应使用 `Iterator` 或 `removeIf` | 🔴 |
| B7 | **分页泄漏** | `PageMethod.startPage()` 是否紧贴查询语句，中间不能有其他 SQL 查询 | 🔴 |

#### Java 安全项

| # | 检查项 | 检查要点 | 严重级 |
|---|--------|---------|--------|
| B8 | **租户隔离（仅定时任务）** | 定时任务中是否使用 `Executors.doInTenant()`/`doInAllTenant()` 切换到商户库；普通接口默认在商户库，无需额外处理 | 🔴 |
| B9 | **SQL 注入** | 动态 SQL 是否使用参数化查询；拼接 SQL 是否转义 | 🔴 |
| B10 | **越权访问** | 删除/修改操作是否校验数据归属（检查 where 条件是否包含归属字段） | 🔴 |
| B11 | **敏感信息** | 日志中是否打印了密码、token、身份证、银行卡等敏感信息 | 🔴 |
| B12 | **批量操作限制** | 批量删除/更新是否限制了最大数量，防止误操作全表 | 🟡 |

#### Java 跨模块调用项

| # | 检查项 | 检查要点 | 严重级 |
|---|--------|---------|--------|
| B13 | **返回值兜底** | 返回 `List`/`Map` 时是否有空集合兜底（`Collections.emptyList()`），避免调用方 NPE | 🟡 |
| B14 | **集合参数防御** | 集合入参(`List`/`Set`)是否判空，空集合的 `IN()` 会导致 SQL 异常 | 🔴 |
| B15 | **异常透传** | 是否吞掉异常不抛出（空 catch 块）；跨模块调用需要明确的异常传递 | 🔴 |
| B16 | **日志追踪** | 关键操作或异常分支是否有日志（`log.info`/`log.error`），便于跨模块问题排查 | 🟡 |

#### Java 代码规范项

| # | 检查项 | 检查要点 | 严重级 |
|---|--------|---------|--------|
| B17 | **魔法值** | 是否存在未定义的常量（状态码 1/2/3 必须用枚举，字符串必须定义常量） | 🟡 |
| B18 | **方法长度** | 方法是否过长（>50 行），需要拆分为子方法 | 🔵 |
| B19 | **注释完整性** | 公共 API（Controller/Business 方法）是否有 JavaDoc 注释 | 🔵 |
| B20 | **空 catch 块** | catch 块是否为空或仅打印日志而不处理/不抛出 | 🟡 |
| B21 | **过时 API** | 是否使用了 `@Deprecated` 的方法或类 | 🔵 |
| B22 | **返回值一致性** | Controller 层是否统一返回 `LeResponse<T>`，不能裸返回 | 🟡 |

---

#### MyBatis XML 检查（仅 XML 文件）

| # | 检查项 | 检查要点 | 严重级 |
|---|--------|---------|--------|
| X1 | **SQL 注入** | 使用 `${}` 而非 `#{}` 进行参数拼接（ORDER BY 等场景需白名单校验） | 🔴 |
| X2 | **IN 查询防护** | IN 查询是否用 `<foreach>` 且考虑集合为空的情况（空 IN 会 SQL 异常） | 🔴 |
| X3 | **动态 SQL 语法** | `<if>`/`<where>`/`<choose>` 标签使用是否正确，是否会产生多余的 AND/OR | 🟡 |
| X4 | **SELECT *** | 是否使用 `SELECT *`，应明确列出需要的字段 | 🟡 |
| X5 | **缺少 WHERE** | UPDATE/DELETE 是否缺少 WHERE 条件（全表操作风险） | 🔴 |
| X6 | **索引失效** | WHERE 条件是否对索引字段使用了函数（`DATE(crtime)`）或隐式类型转换 | 🟡 |
| X7 | **LIKE 前模糊** | `LIKE '%xxx%'` 或 `LIKE CONCAT('%', #{}, '%')` 前模糊导致全表扫描 | 🟡 |
| X8 | **大表无分页** | 大表查询是否遗漏分页，可能造成 OOM | 🟡 |
| X9 | **namespace 匹配** | namespace 是否与 Mapper 接口全限定名完全匹配 | 🔴 |
| X10 | **resultMap 映射** | 是否正确定义 resultMap，字段名和属性名是否对应 | 🟡 |

---

### 本地检查结果展示

```
# 代码审查报告

审查范围: [变更文件列表]

## 🔴 严重问题（X 项）
1. [B1 空指针风险]
   文件: OrderServiceImpl.java:42
   问题: selectById 返回值未做 null 判断
   修复: if (ObjectUtil.isNull(entity)) throw new LeException("数据不存在");

2. [A2 禁止 RuoYi 工具类]
   文件: UserServiceImpl.java:15
   问题: 使用了 MapstructUtils
   修复: 替换为 BeanUtil.copyProperties()

## 🟡 警告问题（X 项）
...

## 🔵 建议（X 项）
...

## ✅ 通过项
- [x] A1 包名规范 (net.xnzn.core.*)
- [x] A3 审计字段正确 (crby/crtime/upby/uptime)
- [x] A4 del_flag 语义正确 (2=正常)
- [x] B8 租户隔离正确
...

结论: ✅ 通过 / ⚠️ 需修复 X 项 / ❌ 不通过
```

如果全部通过 → 展示"本地检查通过"，询问是否需要 Codex 深度审查。
如果有问题 → 先修复严重问题，修复后再询问是否需要 Codex 深度审查。

---

## Phase 3: Codex 深度审查（可选）

> 依赖 `collaborating-with-codex` skill 的 `codex_bridge.py` 脚本。
> Codex 擅长发现本地规则难以覆盖的**逻辑 Bug、复杂并发问题、架构缺陷**。

Phase 2 完成后询问用户："是否需要 Codex 深度审查？"
- 用户同意 → 执行以下流程
- 用户拒绝 → 跳到 Phase 5

```bash
python3 .claude/skills/collaborating-with-codex/scripts/codex_bridge.py \
  --cd . \
  --sandbox read-only \
  --PROMPT "Review the following changed files for code quality issues:

FILES TO REVIEW:
{变更文件列表，含相对路径}

REVIEW FOCUS (beyond basic lint):
1. Logic bugs: race conditions, off-by-one, incorrect state transitions, edge cases
2. Security: privilege escalation, data leakage across tenants, missing auth checks
3. Architecture: Controller calling Mapper directly, Business layer bypassed, circular dependencies
4. Performance: N+1 queries, missing pagination on large tables, unnecessary DB calls in loops
5. Concurrency: check-then-act without locking, shared mutable state, CompletableFuture error handling

PROJECT CONTEXT:
- Package: net.xnzn.core.* (NOT org.dromara.*)
- 4-layer: Controller → Business → Service → Mapper
- Dual-database: tenant DB is default (by MERCHANT-ID header); only scheduled tasks need Executors.doInTenant()/doInAllTenant() to switch; Executors.doInSystem() for system DB access
- Audit fields: crby/crtime/upby/uptime
- del_flag: 1=deleted, 2=normal
- Exception: LeException (NOT ServiceException)
- Object copy: BeanUtil.copyProperties() (NOT MapstructUtils)
- Amount: stored as Long (fen/cents), NOT Double/Float
- Pagination: PageMethod.startPage() must be immediately before query

OUTPUT FORMAT:
For each issue:
- [SEVERITY] CRITICAL / WARNING / SUGGESTION
- [FILE] filepath:line_number
- [ISSUE] Description
- [FIX] Recommended fix

If no issues: ALL CLEAR

IMPORTANT: All comments in Chinese, code/paths in English."
```

**关键约束**：
- 始终使用 `--sandbox read-only`，Codex 不直接修改文件
- 变更文件过多时（>10 个），按模块分批审查
- 使用 `run_in_background` 避免阻塞

---

## Phase 4: 用户确认后修复

合并 Phase 2 和 Phase 3 的所有问题，等待用户确认：
- **全部修复**："修复所有问题" → 逐个修复所有 🔴 + 🟡
- **选择性修复**："只修复严重问题" → 仅修复 🔴
- **跳过**："不需要修复" → 终止

修复时：
1. 按文件逐个修复，使用 Edit 工具
2. 每修复一个文件，简要说明改动
3. 🔵 建议级别默认跳过，除非用户明确要求
4. 修复完成后运行 `git diff` 展示所有变更

---

## Phase 5: 最终确认

修复完成后询问："是否需要再次审查确认？"
- 如果用户同意 → 回到 Phase 2 重新审查
- 如果用户拒绝 → 输出最终结论并终止

```
结论: ✅ 通过 / ⚠️ 需修复 / ❌ 不通过
```

---

## 前端审查（如涉及前端文件变更）

前端项目路径：`/Users/xujiajun/Developer/frontProj/web`

| # | 检查项 | 检查要点 |
|---|--------|---------|
| F1 | 响应码 | 成功码是 `10000`（不是 200） |
| F2 | Token | `Admin-Token`（localStorage） |
| F3 | 租户头 | `MERCHANT-ID`（请求头） |
| F4 | 金额显示 | 后端返回分，前端用 `money()` 转元 |
| F5 | 权限指令 | 按钮权限使用 `v-hasPerm` |
| F6 | 加密 | 敏感字段使用 SM4 加密 |
