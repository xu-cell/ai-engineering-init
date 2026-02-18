# /sync - 项目代码状态同步

一键同步后端代码状态、生成项目文档、确保代码与文档数据一致。适合定期整理或发现数据不一致时使用。

---

## 🎯 适用场景

| 场景 | 说明 |
|------|------|
| **定期整理** | 每周末整理项目代码状态和文档 |
| **数据不一致** | 手动修改过代码或文档后需要重新同步 |
| **项目交接** | 新成员加入或项目交接时全量检查 |
| **构建报告** | 生成完整的项目状态报告供管理者查看 |
| **代码审查** | 代码审查前同步确保信息完整准确 |

---

## 🚀 执行流程

### 第一步：扫描后端代码状态（强制执行）

#### 1.1 扫描业务模块和功能完整性

```bash
# 查找所有业务模块的 Controller
Glob pattern: "ruoyi-modules/ruoyi-*/src/main/java/**/controller/*Controller.java"

# 排除框架模块（system, generator, common, demo, job, workflow）
```

对每个功能检查 **7 个必需的文件**：

| 类型 | 文件 | 完整路径 | 必须 |
|------|------|---------|------|
| Entity | `Xxx.java` | `domain/Xxx.java` | ✅ |
| BO | `XxxBo.java` | `domain/bo/XxxBo.java` | ✅ |
| VO | `XxxVo.java` | `domain/vo/XxxVo.java` | ✅ |
| Service 接口 | `IXxxService.java` | `service/IXxxService.java` | ✅ |
| Service 实现 | `XxxServiceImpl.java` | `service/impl/XxxServiceImpl.java` | ✅ |
| Mapper | `XxxMapper.java` | `mapper/XxxMapper.java` | ✅ |
| Controller | `XxxController.java` | `controller/XxxController.java` | ✅ |

#### 1.2 扫描代码规范问题

```bash
# 检查所有后端代码问题
Grep pattern: "package com\.ruoyi\." path: ruoyi-modules/ output_mode: files_with_matches
Grep pattern: "BeanUtil\.copy|BeanUtils\.copy" path: ruoyi-modules/ output_mode: files_with_matches
Grep pattern: "@SaCheckPermission" path: ruoyi-modules/ glob: "*Controller.java" output_mode: files_with_matches
```

#### 1.3 扫描 Git 提交记录

```bash
# 获取最近 30 条提交
git log -30 --oneline --format="%h %s %ad" --date=short

# 统计业务相关提交（feat/fix/update/add/refactor）
```

#### 1.4 扫描 TODO/FIXME 标记

```bash
# 扫描所有业务代码中的待办标记
Grep pattern: "TODO:|FIXME:|XXX:" path: ruoyi-modules/ glob: "*.java" output_mode: content -B 1
```

#### 1.5 生成代码扫描结果

**输出格式**：
```markdown
## 📊 代码扫描结果

### 模块完整性分析
| 模块 | 功能数 | 完成数 | 完成率 | 状态 |
|------|--------|--------|--------|------|
| [模块名] | X | X | XX% | [状态] |

### 代码规范检查
| 检查项 | 通过 | 警告 | 错误 |
|--------|------|------|------|
| 包名规范 | ✅ | 0 | 0 |
| 对象转换 | ⚠️ | 2 | 0 |
| 权限注解 | ⚠️ | 3 | 0 |

### 待办统计
- 🔥 FIXME (高): X 项
- 📌 TODO (中): X 项
```

---

### 第二步：分析 Git 提交历史

#### 2.1 最近提交分析

```bash
# 获取最近提交的功能信息
git log -5 --oneline
```

**分析内容**：
- 最近在做什么功能
- 是否有 FIXME/BUG 相关的提交
- 代码活跃度

#### 2.2 功能交付记录

根据 Git 提交历史：
- 标记代码中完成的功能
- 识别正在进行的功能
- 统计本周/本月完成功能数

---

### 第三步：整合检查结果

#### 3.1 与 `/check` 命令同步

```bash
# 如果最近没有运行过 /check，则执行全量检查
/check

# 提取检查结果中的：
# - 严重问题数量
# - 警告问题数量
# - 需要修复的问题清单
```

#### 3.2 与 `/progress` 命令同步

```bash
# 获取项目进度信息
/progress

# 提取数据：
# - 各模块完成率
# - 待完成功能列表
# - 代码质量评分
```

#### 3.3 生成综合分析

**输出信息**：
- 与上次同步相比的变化（新增/完成/修复）
- 阻塞项（高优先级 FIXME 未修复）
- 建议（基于 /next 的分析）

---

### 第四步：生成项目同步报告

```markdown
# 🔄 项目代码状态同步报告

**同步时间**：YYYY-MM-DD HH:mm
**上次同步**：YYYY-MM-DD（距今 X 天）

---

## 📈 最新进展

### Git 提交摘要
- **最新提交**：[commit message] ([hash])
- **最近 7 天**：X 次提交，涉及 X 个功能模块
- **提交活跃度**：[活跃/正常/低活跃]

### 代码完成度
| 模块 | 功能数 | 完成 | 进行中 | 待开发 | 完成率 |
|------|--------|------|--------|--------|---------|
| [模块名] | X | X | X | X | XX% [状态] |
| **合计** | **X** | **X** | **X** | **X** | **XX%** |

---

## ⚠️ 紧急问题（必须立即处理）

### 高优先级 FIXME
| 文件 | 行号 | 问题 | 影响 |
|------|------|------|------|
| [文件名].java | [行号] | [问题描述] | [影响范围] |

**处理建议**：
```bash
/check [模块名]  # 查看详细问题
/next             # 获取修复建议
```

---

## 🔍 代码规范检查结果

### 总体评分
| 维度 | 评分 | 说明 |
|------|------|------|
| 包名规范 | ✅ | 所有包名符合 org.dromara.* 规范 |
| 权限注解 | ⚠️ | 3 个接口缺少 @SaCheckPermission |
| 对象转换 | ⚠️ | 2 处使用了 BeanUtil 代替 MapstructUtils |

### 需要修复的问题
1. **权限注解缺失**（X 项）
   - [Controller文件名].java

2. **对象转换规范**（X 项）
   - [ServiceImpl文件名].java

---

## 📝 待办事项更新

### 新增待办（本次扫描发现）
- [ ] [FIXME 描述]（高优先级）
- [ ] [TODO 描述]（中优先级）

### 本周完成的待办
- [x] [已完成功能描述]

### 当前进行中
| 任务 | 优先级 | 进度 | 预计完成 |
|------|--------|------|---------|
| [任务描述] | [优先级] | XX% | [时间] |

---

## 🎯 与其他命令的协作

### 工作流建议
1. **日常开发** → `/update-status` 增量更新
2. **每周末** → `/sync` 全量同步，生成报告
3. **遇到问题** → `/check` 检查代码规范
4. **规划工作** → `/progress` 查看进度，`/next` 获取建议
5. **交接新人** → `/start` 快速了解，`/sync` 查看最新状态

### 命令关系图
```
/start (快速了解)
   ↓
/crud or /dev (开发新功能)
   ↓
/check (检查规范)
   ↓
/sync (同步并生成报告) ← 您在这里
   ↓
/progress (查看进度)
   ↓
/next (获取建议)
```

---

## ✅ 检查通过项

- [x] 包名规范（org.dromara.*）
- [x] 对象转换基本正确（MapstructUtils）
- [x] Entity 基类正确（继承 TenantEntity）
- [x] Mapper 继承正确（BaseMapperPlus）
- [x] Service 接口声明完整

---

## 📌 同步说明

- 本报告基于当前代码扫描、Git 提交和规范检查综合生成
- 与 `/progress` 的区别：/progress 只读查看，/sync 生成综合报告
- 与 `/check` 的关系：/check 检查代码规范，/sync 整合检查结果
- 建议每周运行一次 `/sync` 命令进行定期整理
- 发现数据不一致时立即运行 `/sync` 进行全量同步
- 同步报告默认保存到 `docs/sync-report-YYYY-MM-DD.md`

---

## 🔗 相关命令

| 命令 | 说明 | 何时使用 |
|------|------|---------|
| `/start` | 快速了解项目 | 初次接触项目 |
| `/check` | 代码规范检查 | 开发完成后 |
| `/progress` | 查看项目进度 | 了解完成情况 |
| `/next` | 获取下一步建议 | 不知道做什么 |
| `/sync` | 全量同步报告 | 每周整理、发现不一致 |
| `/update-status` | 增量更新状态 | 日常使用 |
| `/dev` | 开发新功能 | 从零开始 |
| `/crud` | 快速生成代码 | 表已存在时 |
