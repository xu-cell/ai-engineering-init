---
name: sync
description: |
  当需要全量同步项目代码状态、生成综合报告时自动使用此 Skill。

  触发场景：
  - 每周末整理项目代码状态和文档
  - 手动修改过代码或文档后需要重新同步
  - 新成员加入或项目交接时全量检查
  - 生成完整的项目状态报告

  触发词：同步、sync、全量同步、状态同步、项目同步、代码同步、定期整理
---

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

---

## 🚀 执行流程

### 第一步：扫描后端代码状态（强制执行）

#### 1.1 扫描业务模块和功能完整性

```bash
# 查找所有业务模块的 Controller
Glob pattern: "ruoyi-modules/ruoyi-*/src/main/java/**/controller/*Controller.java"
```

对每个功能检查 **7 个必需的文件**。

#### 1.2 扫描代码规范问题

```bash
Grep pattern: "package com\.ruoyi\." path: ruoyi-modules/ output_mode: files_with_matches
Grep pattern: "BeanUtil\.copy|BeanUtils\.copy" path: ruoyi-modules/ output_mode: files_with_matches
Grep pattern: "@SaCheckPermission" path: ruoyi-modules/ glob: "*Controller.java" output_mode: files_with_matches
```

#### 1.3 扫描 Git 提交记录

```bash
git log -30 --oneline --format="%h %s %ad" --date=short
```

#### 1.4 扫描 TODO/FIXME 标记

```bash
Grep pattern: "TODO:|FIXME:|XXX:" path: ruoyi-modules/ glob: "*.java" output_mode: content -B 1
```

---

### 第二步：分析 Git 提交历史

```bash
git log -5 --oneline
```

**分析内容**：
- 最近在做什么功能
- 是否有 FIXME/BUG 相关的提交
- 代码活跃度

---

### 第三步：整合检查结果

#### 3.1 与 `/check` 命令同步

提取检查结果中的：
- 严重问题数量
- 警告问题数量
- 需要修复的问题清单

#### 3.2 与 `/progress` 命令同步

提取数据：
- 各模块完成率
- 待完成功能列表
- 代码质量评分

---

### 第四步：生成项目同步报告

```markdown
# 🔄 项目代码状态同步报告

**同步时间**：YYYY-MM-DD HH:mm

---

## 📈 最新进展

### Git 提交摘要
- **最新提交**：[commit message] ([hash])
- **最近 7 天**：X 次提交，涉及 X 个功能模块
- **提交活跃度**：[活跃/正常/低活跃]

### 代码完成度
| 模块 | 功能数 | 完成 | 进行中 | 待开发 | 完成率 |
|------|--------|------|--------|--------|---------|
| demo | 3 | 3 | 0 | 0 | 100% ✅ |
| business | 5 | 3 | 2 | 0 | 60% 🔄 |

---

## ⚠️ 紧急问题（必须立即处理）

### 高优先级 FIXME
| 文件 | 行号 | 问题 | 影响 |
|------|------|------|------|
| PaymentService.java | 156 | 退款金额计算错误 | 财务准确性 |

---

## 🔍 代码规范检查结果

### 总体评分
| 维度 | 评分 | 说明 |
|------|------|------|
| 包名规范 | ✅ | 所有包名符合 org.dromara.* 规范 |
| 权限注解 | ⚠️ | 3 个接口缺少 @SaCheckPermission |

---

## 🔗 相关命令

| 命令 | 用途 | 何时使用 |
|------|------|---------|
| `/update-status` | 增量更新 | 功能完成后立即使用 |
| `/sync` | 全量同步 | 每周一次定期整理 |
| `/progress` | 项目进度分析 | 了解完成情况 |
| `/check` | 代码规范检查 | 代码审查前 |
```
