---
name: progress
description: |
  当需要分析项目开发进度、查看模块完成情况时自动使用此 Skill。

  触发场景：
  - 需要查看项目整体开发进度
  - 需要分析各模块的完成度
  - 需要统计代码中的 TODO/FIXME
  - 需要生成项目进度报告

  触发词：项目进度、progress、进度报告、完成度、开发进度、模块进度、进度分析、进度梳理
---

# /progress - 项目进度梳理

作为项目进度分析助手，帮您快速分析后端开发进度、识别完成度和待办事项。

## 🎯 执行流程

### 第一步：扫描后端模块（强制执行）

```bash
# 查找所有业务模块
Glob pattern: "ruoyi-modules/ruoyi-*/src/main/java/**/controller/*Controller.java"

# 排除系统模块（不统计进度）
# - ruoyi-system （系统管理框架）
# - ruoyi-generator （代码生成器）
# - ruoyi-common （公共库）
```

自动检测到的模块示例：
- `ruoyi-demo`
- `ruoyi-business`
- 其他自定义业务模块

### 第二步：分析代码完整性

对每个功能检查 **7 个必需的文件**：

| 类型 | 文件 | 完整文件路径 | 必须 | 说明 |
|------|------|------------|------|------|
| Entity | `Xxx.java` | `domain/Xxx.java` | ✅ | 数据模型 |
| BO | `XxxBo.java` | `domain/bo/XxxBo.java` | ✅ | 业务对象 |
| VO | `XxxVo.java` | `domain/vo/XxxVo.java` | ✅ | 视图对象 |
| Service 接口 | `IXxxService.java` | `service/IXxxService.java` | ✅ | 服务定义 |
| Service 实现 | `XxxServiceImpl.java` | `service/impl/XxxServiceImpl.java` | ✅ | 服务实现 |
| Mapper | `XxxMapper.java` | `mapper/XxxMapper.java` | ✅ | 数据访问 |
| Controller | `XxxController.java` | `controller/XxxController.java` | ✅ | 接口层 |

### 第三步：扫描代码待办（TODO/FIXME）

```bash
# 扫描需要处理的代码注释
Grep pattern: "TODO:|FIXME:" path: ruoyi-modules/ glob: "*.java" output_mode: content -B 1
```

### 第四步：代码质量分析

```bash
# 检查代码规范性
Grep pattern: "package com\.ruoyi\." path: ruoyi-modules/ glob: "*.java" output_mode: files_with_matches
Grep pattern: "BeanUtil\.copy|BeanUtils\.copy" path: ruoyi-modules/ glob: "*.java" output_mode: files_with_matches
```

---

## 📊 输出格式

```markdown
# 📊 项目进度报告

**生成时间**：YYYY-MM-DD HH:mm
**检查范围**：全量后端代码

---

## 🎯 项目概况

- **项目名称**：RuoYi-Vue-Plus 纯后端版
- **技术栈**：Spring Boot 3 + MyBatis Plus + Sa-Token
- **数据库**：MySQL/MariaDB
- **当前阶段**：[开发中/测试中/已上线]

---

## 📈 后端模块进度汇总

| 模块 | 功能数 | 完成数 | 完成率 | 状态 |
|------|--------|--------|--------|------|
| demo | 3 | 3 | 100% | ✅ 已完成 |
| business | 5 | 3 | 60% | 🔄 进行中 |
| **合计** | **8** | **6** | **75%** | 🔄 进行中 |

---

## 📋 功能详情分析

### demo 模块 (100% 完成)

| 功能 | Entity | BO | VO | Service | Mapper | Controller | 完成度 |
|------|--------|----|----|---------|--------|------------|--------|
| Notice | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |
| Config | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |
| Test | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 100% |

---

## 🔍 代码质量分析

| 指标 | 评分 | 说明 |
|------|------|------|
| 代码规范性 | 良好 ✅ | 包名规范、类名规范 |
| 注释完整度 | 待补充 ⚠️ | 部分功能缺少业务注释 |
| 权限注解完整度 | 需改进 ⚠️ | 部分接口缺少 @SaCheckPermission |
| 对象转换规范 | 良好 ✅ | 正确使用 MapstructUtils |

---

## 📝 代码待办事项

### TODO 项 (X 个)

| 文件 | 行号 | 类型 | 内容 | 优先级 |
|------|------|------|------|--------|
| `UserServiceImpl.java` | 87 | TODO | 优化用户查询性能 | 中 |

### FIXME 项 (X 个)

| 文件 | 行号 | 类型 | 内容 | 优先级 |
|------|------|------|------|--------|
| `PaymentService.java` | 156 | FIXME | 修复退款金额计算错误 | 高 |

---

## 💡 改进建议

### 高优先级（需立即处理）

1. **补充缺失的 BO/VO**
2. **完善权限注解**
3. **修复 FIXME 问题**

### 中优先级（逐步完善）

1. **补充接口注释**
2. **优化查询性能**

---

## 📊 完成度判定标准

| 完成率 | 状态 | 说明 | 推荐行动 |
|--------|------|------|---------|
| 100% | ✅ 已完成 | 全部 7 个文件均已完成 | 可进行代码审查 |
| 71-99% | 🟢 基本完成 | 缺少 1-2 个文件 | 补充缺失文件 |
| 50-70% | 🟡 进行中 | 缺少 2-3 个文件 | 加快开发进度 |
| 1-49% | 🔴 早期阶段 | 仅有少量文件 | 继续开发 |
| 0% | ⚫ 待开发 | 无相关文件 | 使用 `/dev` 开始开发 |

---

## 🚀 快速操作

```bash
# 1. 快速生成缺失功能
/crud Payment

# 2. 检查并修复代码规范
/check business

# 3. 继续开发新功能
/dev 新功能名称
```
```

---

## 使用示例

```
用户：/progress
用户：/progress business （仅检查 business 模块）
用户：/progress demo （仅检查 demo 模块）

Claude：
🔍 正在扫描项目结构...
📊 分析代码完整性...
🔍 扫描代码待办事项...

[输出完整的进度报告]
```
