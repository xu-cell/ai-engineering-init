# 任务：leniu-dev v2.0 CLI 重构

**状态**: 🔵 已完成
**创建时间**: 2026-03-21 20:50:00
**更新时间**: 2026-03-21 20:50:00
**Git 分支**: main

---

## 📋 需求描述

将 `ai-engineering-init` 重构为 `leniu-dev`，简化命令结构，只保留用户级安装，
增加交互式安装向导（角色选择：后端/前端/产品），配置向导集成，牛马吃草动画，
自动更新提示等功能。

---

## 🎯 实现步骤

### Phase 1：基础重构
- [x] 1.1 npm 改名 leniu-dev，更新 package.json
- [x] 1.2 CLI 入口重构：install/update/syncback/help/doctor/uninstall
- [x] 1.3 删除项目级安装逻辑（init），统一为用户级
- [x] 1.4 删除 global 命令，将其逻辑作为 install 默认行为
- [x] 1.5 重写 help 命令输出
- [x] 1.6 添加安装元数据文件

### Phase 2：交互式安装向导
- [x] 2.1 原生 readline 实现交互式菜单
- [x] 2.2 角色选择页面（后端/前端/产品/全部）
- [x] 2.3 技能分组映射表（role → skill-set）
- [x] 2.4 AI 工具选择（Claude/Cursor/Codex 多选）
- [x] 2.5 按角色过滤安装 skills
- [x] 2.6 安装完成后展示摘要

### Phase 3：配置向导集成
- [x] 3.1 服务配置选择页面
- [x] 3.2 MySQL/Loki 配置交互合并到安装向导
- [x] 3.3 MCP 服务器推荐一键安装
- [x] 3.4 5 步向导流程（角色→工具→配置→MCP→确认）

### Phase 4：体验打磨
- [x] 4.1 ASCII 牛马吃草动画
- [x] 4.2 doctor 命令（诊断安装+配置+MCP）
- [x] 4.3 uninstall 命令（基于安装记录清洁卸载）
- [x] 4.4 版本更新检测（npm 24h 缓存）
- [x] 4.5 update 智能增量（自动检测用户级安装）
- [x] 4.6 syncback 向后兼容
- [ ] ~~4.7 团队配置模板支持~~（延后到 v2.1）

### Phase 5：文档 + 发布
- [x] 5.1 README 全面重写
- [x] 5.2 CHANGELOG 记录 breaking changes
- [x] 5.3 迁移指南（v1→v2，写入 README）
- [ ] 5.4 npm publish leniu-dev
- [ ] 5.5 旧包 deprecation 通知

---

## 📝 关键决策

- **新包名**: leniu-dev
- **交互库**: 原生 readline（零依赖）
- **安装模式**: 仅用户级（~/.claude/ 等）
- **动画**: setInterval + ANSI 清屏

---

## 🔄 当前进度

**已完成**: 6 / 28 步骤 (21%)

**下一步操作**:
1. Phase 2: 交互式安装向导（角色选择 + 技能映射）
2. 原生 readline 实现多选菜单

---

## 💬 变更记录

### 2026-03-21 20:50
- 创建任务跟踪文档
- 确认迭代计划 5 个 Phase

### 2026-03-21 21:10
- Phase 1 全部完成
- package.json: name→leniu-dev, version→2.0.0, bin→leniu-dev
- CLI 命令重构: install/update/syncback/help/doctor/uninstall
- 向后兼容: init→install, global→install, sync-back→syncback
- 新增 doctor 命令: 诊断安装状态（技能数/配置/MCP）
- 新增 uninstall 命令: 基于安装记录清洁卸载
- 安装元数据: ~/.claude/.leniu-install-meta.json
- Banner 更新: 🐂 leniu-dev v2.0.0
- update 命令: 自动检测用户级安装并使用全局安装逻辑更新
