---
name: init-docs
description: |
  当需要为项目初始化文档体系、创建项目文档时自动使用此 Skill。

  触发场景：
  - 新项目第一次初始化文档体系
  - 现有文档丢失或需要重新组织
  - 新成员加入，需要统一文档格式
  - 根据最新代码重新生成文档

  触发词：初始化文档、init-docs、文档初始化、创建文档、项目文档、文档体系
---

# /init-docs - 项目文档初始化

为纯后端 RuoYi-Vue-Plus 项目初始化完整的项目文档体系。支持空白模板或基于现有代码智能生成。

---

## 🎯 适用场景

| 场景 | 说明 |
|------|------|
| **项目启动** | 新项目第一次初始化文档体系 |
| **文档重建** | 现有文档丢失或需要重新组织 |
| **团队协作** | 新成员加入，需要统一文档格式 |
| **定期整理** | 根据最新代码重新生成文档 |

---

## 📋 执行模式

### 模式 1：空白模板（默认）

```bash
/init-docs
```

创建空白文档结构，适合新项目或想从零开始规划的项目。

### 模式 2：智能扫描

```bash
/init-docs --scan
```

扫描现有代码并智能生成文档，自动分析项目结构和代码完整度。

---

## 🚀 执行流程

### 第一步：确认初始化模式

```
请选择初始化方式：
1. 空白模板（推荐新项目）
2. 扫描现有代码（推荐已有代码）
```

### 第二步：创建目录结构

```bash
mkdir -p docs
```

**生成的目录结构**：
```
项目根目录/
└── docs/
    ├── README.md                 # 项目简介
    ├── ARCHITECTURE.md           # 架构说明
    ├── PROJECT_STATUS.md         # 项目进度
    ├── TODO.md                   # 待办清单
    └── CHANGELOG.md              # 变更日志
```

### 第三步：扫描代码（仅在 --scan 模式）

```bash
# 查找所有业务模块
Glob pattern: "ruoyi-modules/ruoyi-*/src/main/java/**/controller/*Controller.java"
```

### 第四步：生成文档内容

根据扫描或手动输入的信息生成文档。

---

## 生成的文档模板

### docs/README.md

```markdown
# 项目名称

## 📋 项目简介

**项目名**：RuoYi-Vue-Plus 纯后端版
**技术栈**：
- **后端框架**：Spring Boot 3.x
- **ORM框架**：MyBatis-Plus 3.x
- **权限框架**：Sa-Token
- **数据库**：MySQL 8.0+

## 🚀 快速开始

1. 克隆项目
2. 导入数据库
3. 修改数据库配置
4. 运行后端服务

## 📖 文档导航

- [📊 项目进度](./PROJECT_STATUS.md)
- [🏗️ 架构说明](./ARCHITECTURE.md)
- [📝 待办清单](./TODO.md)
- [📝 变更日志](./CHANGELOG.md)
```

### docs/PROJECT_STATUS.md

```markdown
# 📊 项目进度报告

**报告生成时间**：YYYY-MM-DD
**项目状态**：🟢 开发中

## 概览

| 指标 | 值 | 说明 |
|------|-----|------|
| 总功能数 | X | 规划的功能总数 |
| 已完成 | X | 100% 完成的功能 |
| 进行中 | X | 50-99% 的功能 |
| 待开发 | X | 0% 的功能 |
```

### docs/TODO.md

```markdown
# 📝 待办清单

**最后更新**：YYYY-MM-DD

## 🔴 高优先级（本周必做）

- [ ] [任务描述]

## 🟡 中优先级（本月完成）

- [ ] [任务描述]

## 🟢 低优先级（有时间做）

- [ ] [任务描述]

## ✅ 已完成

- [x] [任务描述] - 完成于 YYYY-MM-DD
```

---

## 第五步：输出初始化报告

```markdown
# ✅ 项目文档初始化完成！

**初始化时间**：YYYY-MM-DD HH:mm

## 📂 已创建的文件

| 文件 | 说明 | 位置 |
|------|------|------|
| README.md | 项目简介 | docs/README.md |
| PROJECT_STATUS.md | 项目进度 | docs/PROJECT_STATUS.md |
| ARCHITECTURE.md | 架构说明 | docs/ARCHITECTURE.md |
| TODO.md | 待办清单 | docs/TODO.md |
| CHANGELOG.md | 变更日志 | docs/CHANGELOG.md |

## 🎯 下一步建议

### 1️⃣ 快速了解项目
\`/start\`

### 2️⃣ 查看详细进度
\`/progress\`

### 3️⃣ 检查代码规范
\`/check\`
```
