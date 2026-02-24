# /update-status - 项目状态智能更新

日常使用的增量更新命令。自动扫描最近的代码变更，智能更新项目文档，保持文档与代码同步。

---

## 适用场景

| 场景 | 说明 | 频率 |
|------|------|------|
| **功能完成** | 完成一个功能或任务后更新状态 | 实时 |
| **日常同步** | 每天开始或结束时同步代码变更 | 每天1-2次 |
| **代码审查后** | 审查完成后更新文档 | 按需 |
| **周期回顾** | 本周末更新本周的工作成果 | 每周1次 |

---

## 与 /sync 的区别

| 对比项 | `/update-status`（增量）| `/sync`（全量）|
|--------|----------------------|----------------|
| **执行速度** | 快速 | 较慢 |
| **扫描范围** | 最近 N 条提交 | 整个项目 |
| **处理方式** | 增量更新 | 全量重建 |
| **使用频率** | 日常频繁使用 | 每周一次 |
| **风险等级** | 低（只追加） | 中（全量覆盖）|
| **何时使用** | 功能完成后立即 | 定期整理或数据不一致时 |

---

## 执行流程

### 第一步：检查和初始化文档（强制执行）

#### 1.1 验证文档存在

```bash
# 检查文档目录
Glob pattern: "docs/*.md"

# 必要的文档文件
docs/项目状态.md             # 项目进度
docs/需求文档.md             # 业务需求
docs/待办清单.md             # 待办清单
```

#### 1.2 自动创建缺失文档

```bash
# 如果缺失某个文档，使用默认模板自动创建
if not exist docs/项目状态.md:
    create 项目状态.md with default template
```

**输出**：
```markdown
📂 文档初始化
- ✅ docs/项目状态.md 存在
- ✅ docs/需求文档.md 存在
- ⚠️ docs/待办清单.md 缺失（已创建）
```

---

### 第二步：分析最近的代码变更（强制执行）

#### 2.1 获取最近的 Git 提交

```bash
# 获取最近 20 条提交
git log -20 --oneline --format="%h|%s|%aI" --all

# 筛选业务相关提交（feat/fix/update/add）
```

#### 2.2 扫描业务模块变更

```bash
# 检测新添加或修改的模块（核心业务模块）
Glob pattern: "sys-canteen/src/main/java/**/controller/*Controller.java"
Glob pattern: "sys-kitchen/src/main/java/**/controller/*Controller.java"
Glob pattern: "sys-drp/src/main/java/**/controller/*Controller.java"
Glob pattern: "sys-common/src/main/java/**/controller/*Controller.java"

# 基础设施模块不统计：core-base、core-aggregator、sys-open、sys-logistics

# 对比上次更新时的模块列表，识别新增模块
```

#### 2.3 扫描代码中的待办标记

```bash
# 扫描所有业务代码
Grep pattern: "TODO:|FIXME:|XXX:" path: sys-canteen/,sys-kitchen/,sys-drp/,sys-common/ glob: "*.java" output_mode: content -B 1

# 与上次记录对比，识别新增和已解决的待办
```

**输出**：
```markdown
🔍 代码变更分析
- 最近 N 天提交: X 条
- 业务相关提交: X 条
- 新增模块: X 个
- 新增 TODO: X 项
- 已解决 FIXME: X 项
```

---

### 第三步：更新项目进度文档（docs/项目状态.md）

#### 3.1 分析功能完整性

对每个业务模块（sys-canteen、sys-kitchen、sys-drp、sys-common）检查 **8 个必需文件**（leniu 四层架构）：

| 文件类型 | 文件 | 完整度贡献 |
|---------|------|----------|
| Entity | `common/model/XxxInfo.java` | 1/8 |
| DTO | `web/dto/XxxInfoDTO.java` | 1/8 |
| VO | `web/vo/XxxInfoVO.java` | 1/8 |
| Mapper | `common/mapper/XxxInfoMapper.java` | 1/8 |
| MapperXML | `common/mapper/XxxInfoMapper.xml` | 1/8 |
| Service | `common/service/impl/XxxInfoService.java` | 1/8 |
| Business | `web/business/impl/XxxWebBusiness.java` | 1/8 |
| Controller | `web/controller/XxxWebController.java` | 1/8 |

#### 3.2 更新"已完成"功能

```markdown
### 本次新完成的功能

| 功能名 | 完成日期 | 所属模块 | 状态 |
|--------|---------|---------|------|
| [功能1] | YYYY-MM-DD | [sys-canteen/sys-kitchen/sys-drp] | ✅ |
| [功能2] | YYYY-MM-DD | [sys-common] | ✅ |
```

**更新规则**：
- 仅从已完成的功能列表中选择（8个文件都存在的功能）
- 记录完成日期（从 Git 提交时间获取）
- 标注所属模块

#### 3.3 更新"进行中"功能

```markdown
### 进行中的功能

| 功能名 | 完成度 | 缺失文件 | 所属模块 | 预计完成 |
|--------|--------|---------|---------|---------|
| [功能] | 75% | Business, Controller | sys-canteen | 本周 |
```

**更新规则**：
- 计算完成度：`(存在文件数 / 8) × 100%`
- 列出缺失的文件
- 识别长期未更新的功能（超过 7 天）并标记 ⚠️

#### 3.4 更新统计信息

```markdown
## 进度统计

**最后更新**：YYYY-MM-DD HH:mm
**总功能数**：X
**已完成**：X（XX%）
**进行中**：X（XX%）
**待开发**：X（XX%）
```

---

### 第四步：更新待办清单文档（docs/待办清单.md）

#### 4.1 同步新完成的任务

```markdown
## ✅ 最近完成

- [x] [功能名] - 完成于 YYYY-MM-DD
```

**处理规则**：
- 从 项目状态.md 中的新完成功能提取
- 移到"最近完成"区域
- 添加完成日期

#### 4.2 添加新发现的待办

```markdown
## 🔴 高优先级（本周必做）

- [ ] [FIXME 描述] - [文件:行号] - 预计 X 小时

## 🟡 中优先级（本月完成）

- [ ] [TODO 描述] - [文件:行号] - 预计 X 小时
```

**处理规则**：
- FIXME → 高优先级
- TODO → 中优先级
- 记录来源文件和行号（便于快速定位）
- 去重：检查是否已存在相同任务
- 不移除现有待办，只追加新发现的

#### 4.3 更新统计信息

```markdown
## 统计信息

**最后更新**：YYYY-MM-DD HH:mm
- 待办总数：X 项
- 高优先级：X 项
- 中优先级：X 项
- 低优先级：X 项
- 本周完成：X 项
```

---

### 第五步：生成更新报告

```markdown
# 项目状态更新报告

**更新时间**：YYYY-MM-DD HH:mm
**扫描范围**：最近 20 条 Git 提交

---

## 文档状态

| 文档 | 操作 | 状态 |
|------|------|------|
| 项目状态.md | 已更新 | ✅ |
| 待办清单.md | 已同步 | ✅ |
| 需求文档.md | 无需更新 | ⏭️ |

---

## 本次变更统计

### 项目状态.md 更新
- ✅ 新增已完成：X 项
- 🔄 更新进行中：X 项（涉及 X 个功能）
- ℹ️ 未变更：X 项

### 待办清单.md 联动更新
- ✅ 移至已完成：X 项
- 📋 新增待办：X 项
  - 高优先级：X 项
  - 中优先级：X 项
  - 低优先级：X 项
- 📊 当前待办总数：X 项

---

## 主要完成内容

**本周完成的功能**：
1. [功能1] - 完成日期：YYYY-MM-DD
2. [功能2] - 完成日期：YYYY-MM-DD

**代码统计**：
- 业务模块：sys-canteen X 个、sys-kitchen X 个、sys-drp X 个
- 功能总数：X 个

---

## 发现的问题

### 长期未更新的功能
- 🟠 [功能名] - 上次更新于 7+ 天前 - [所属模块]
  建议：检查是否有阻塞或遗忘

### 高优先级待办
- 🔴 [FIXME 描述] - [文件:行号]
  建议：本周优先处理

### 代码质量提醒
- ⚠️ 发现 X 个新的权限注解缺失（@RequiresAuthentication）
- ⚠️ 发现 X 处 POST 接口未使用 LeRequest<T> 封装

**处理建议**：
运行 `/check` 进行完整的代码规范检查

---

## 下一步建议

### 立即处理
```bash
# 1. 检查代码规范
/check

# 2. 查看详细进度
/progress
```

### 日常操作
```bash
# 1. 继续开发新功能（含表设计）
/dev 新功能名称

# 2. 为已有表生成代码
/crud 表名

# 3. 添加新的待办
/add-todo 任务描述
```

### 定期维护
```bash
# 1. 每周末全量同步
/sync

# 2. 每月末生成项目报告
/progress
```

---

## 注意事项

### 保留用户手动编辑的内容

- ✅ 自动追加新发现的信息
- ✅ 自动更新完成度和统计数字
- ❌ 不删除用户手动添加的内容
- ❌ 不覆盖用户编写的描述

### 时间和格式规范

- 时间格式：`YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`
- 进度百分比：整数（0-100%）
- 完成度：基于 8 个必需文件的存在情况计算（leniu 四层架构）
- 优先级标记：🔴高 🟡中 🟢低

---

## 工作流程示例

### 场景：完成了一个功能

```bash
# 1. 开发完成，提交代码
git commit -m "feat(canteen): 完成订单管理功能"

# 2. 立即更新项目状态
/update-status

# 输出：
# ✅ 检测到新完成的功能：订单管理（sys-canteen）
# ✅ 更新 项目状态.md（进度：100%）
# ✅ 同步 待办清单.md（移至已完成：1 项）
# ✅ 更新报告已生成
```

### 场景：日常工作回顾

```bash
# 时间：每天下午结束时

# 1. 查看今天的完成情况
/update-status

# 2. 查看本周的进度
/progress

# 3. 获取明天的建议
/next
```

---

## 相关命令

| 命令 | 用途 | 何时使用 |
|------|------|---------|
| `/update-status` | 增量更新（当前） | 功能完成后立即使用 |
| `/sync` | 全量同步 | 每周一次定期整理 |
| `/progress` | 项目进度分析 | 了解完成情况 |
| `/check` | 代码规范检查 | 代码审查前 |
| `/add-todo` | 添加单个待办 | 临时添加任务 |
| `/init-docs` | 文档初始化 | 首次使用项目 |

---

## 最佳实践

### 推荐做法

1. **功能完成后立即更新**
   ```bash
   git commit -m "feat(canteen): 完成XXX功能"
   /update-status
   ```

2. **利用每天的开始或结束**
   - 早晨：`/update-status` 了解最新状态
   - 下午：`/update-status` 汇总今天的工作

3. **每周末进行全量同步**
   ```bash
   /sync  # 全量同步
   ```

### 避免做法

1. ❌ 忽视 FIXME 和长期 TODO
   - 定期查看并处理高优先级待办

2. ❌ 从不更新项目状态
   - 导致文档与代码不同步

3. ❌ 完全依赖自动更新
   - 定期运行 `/sync` 做全量检查

---

## 说明

- `/update-status` 是日常工作中频繁使用的命令
- 与 `/sync` 形成互补：快速更新 + 定期全量同步
- 更新内容保存到 `docs/` 目录中的相应文件
- 所有更新都有备份记录，可通过 Git 查看历史
- 建议每天使用 1-2 次，每周末运行一次 `/sync`
