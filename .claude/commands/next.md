# /next - 下一步建议

作为项目开发顾问，根据当前项目状态，为您建议下一步应该做什么。

## 执行流程

### 第一步：快速扫描项目状态

```bash
# 查看最近 Git 提交记录
git log -5 --oneline

# 扫描所有业务模块中的 TODO/FIXME
Grep pattern: "TODO:|FIXME:" path: sys-canteen/,sys-kitchen/,sys-drp/,sys-common/ glob: "*.java" output_mode: content -B 2

# 检查代码规范问题
Grep pattern: "package org\.dromara\.|package com\.ruoyi\." path: sys-canteen/,sys-kitchen/,sys-drp/ glob: "*.java" output_mode: files_with_matches
Grep pattern: "MapstructUtils|ServiceException" path: sys-canteen/,sys-kitchen/,sys-drp/ glob: "*.java" output_mode: files_with_matches
```

### 第二步：分析开发阶段

根据代码完整性和功能数量判断：

| 阶段 | 特征 | 功能完成率 |
|------|------|----------|
| 🟢 初期 | 基础框架搭建，功能模块较少 | < 30% |
| 🟡 中期 | 核心功能开发中，模块逐步完善 | 30-70% |
| 🔴 后期 | 功能基本完成，处于优化阶段 | > 70% |

### 第三步：分类问题和建议

- **紧急问题**：安全漏洞、严重 Bug、编译错误
- **重要问题**：功能缺陷、设计问题、规范问题
- **优化建议**：性能优化、代码重构、文档完善

---

## 输出格式

```markdown
# 下一步建议

**分析时间**：YYYY-MM-DD HH:mm
**分析范围**：全量后端代码

---

## 当前状态

### Git 提交分析
- **最近一次提交**：[commit message] ([commit hash])
- **最近在做**：[根据提交记录推断]
- **提交频率**：[活跃/不活跃]

### 代码状态
- **开发阶段**：🟡 中期（核心功能开发中）
- **代码质量**：良好（包名符合 net.xnzn.core.*）
- **规范问题**：3 个接口缺少 @RequiresAuthentication 注解

### 代码待办统计
- **TODO 项**：X 个
- **FIXME 项**：X 个
- **编译/运行错误**：无

---

## 建议优先级

### 🔴 高优先级（必须立即处理）

1. **修复 FIXME 问题**
   - 位置：sys-canteen/.../service/impl/XxxService.java:156
   - 问题：业务逻辑存在已知错误
   - 原因：影响核心业务正确性
   - 影响：可能导致数据异常
   - **快速修复**：`/check` 找出所有 FIXME 并逐一解决

2. **补充缺失的权限注解**
   - 位置：sys-canteen 模块 3 个接口
   - 问题：缺少 @RequiresAuthentication 或 @RequiresGuest 注解
   - 原因：权限控制不完整
   - 影响：系统存在未授权访问风险
   - **快速修复**：`/check canteen` 查出所有问题接口

3. **完善代码规范**
   - 问题：部分接口 POST 请求未使用 LeRequest<T> 封装
   - 原因：请求封装规范不一致
   - 影响：后续维护成本高
   - **快速修复**：`/check` 全量检查

### 🟡 中优先级（近期应该做）

1. **补充缺失功能模块**
   - 建议模块：[根据扫描结果列出未完成的业务模块]
   - 完成率：目前 X%，建议提升到 80%
   - **快速开发**：`/crud [表名]` 快速生成 CRUD 代码

2. **优化 Service 查询层**
   - 建议模块：[根据扫描结果列出查询不完善的模块]
   - 问题：buildWrapper 查询条件需要完善
   - 价值：提升查询效率，支持更复杂的搜索
   - **参考代码**：`sys-canteen/.../order/common/service/impl/OrderInfoService.java`

3. **补充接口文档注释**
   - 建议范围：所有 Controller 接口
   - 目标：添加 @Api、@ApiOperation Swagger 文档注解、JavaDoc 方法注释
   - 价值：便于接口文档自动生成

### 🟢 低优先级（可以考虑）

1. **性能优化**
   - 建议项：添加查询缓存、分页优化
   - 触发条件：数据量大时

2. **代码重构**
   - 建议项：提取通用工具类、统一错误处理

3. **单元测试**
   - 建议项：为核心 Service 添加单元测试
   - 触发条件：功能稳定后

---

## 具体行动建议

### 如果您想继续开发新功能：

**推荐 1：完善业务模块**
- 建议实现：[根据扫描结果列出未完成的功能]
- 所属模块：[sys-canteen / sys-kitchen / sys-drp / sys-common]
- **快速开始**：
  ```bash
  /crud [表名]          # 快速生成 CRUD 代码
  /check [模块名]       # 检查并修复规范问题
  ```

**推荐 2：开发新的业务功能**
- 建议实现：[根据项目进展推荐下一个业务功能]
- **快速开始**：
  ```bash
  /dev 功能名称   # 使用向导开发新功能（含表设计）
  ```

### 如果您想优化代码质量：

**推荐 1：规范检查和修复**
- 建议优化：修复所有代码规范问题
- **快速检查**：
  ```bash
  /check               # 全量检查
  /check canteen       # 按模块检查
  ```

**推荐 2：Service 层优化**
- 建议优化：完善 buildWrapper 实现，支持更复杂的查询
- **参考代码**：`sys-canteen/.../order/common/service/impl/OrderInfoService.java`

**推荐 3：注释和文档**
- 建议优化：添加 JavaDoc 注释
- 位置：所有 Controller 接口和关键 Service 方法

### 如果您想修复现存问题：

**按严重程度排序的问题列表**：

#### 🔴 严重问题（立即修复）
- **FIXME 问题**：[根据扫描结果列出 FIXME 位置和内容]
- **权限注解缺失**：[根据扫描结果列出缺少 @RequiresAuthentication 的接口]
- **命令**：`/check [模块名]`

#### 🟡 重要问题（本周修复）
- **LeRequest 封装缺失**：[根据扫描结果列出未使用 LeRequest<T> 的 POST 接口]
- **del_flag 值错误**：[扫描是否有 delFlag=0 的设置]
- **命令**：`/check [模块名]`

#### 🟢 建议问题（择机修复）
- **缺少接口文档**：所有 Controller
- **缺少业务注释**：部分 Service 方法
- **命令**：逐一完善

---

## 开发建议

### 开发流程建议

1. **明确需求**：使用 `/start` 快速了解项目结构
2. **检查规范**：使用 `/check` 检查代码质量
3. **分析进度**：使用 `/progress` 了解完成情况
4. **开始开发**：使用 `/dev` 或 `/crud` 快速生成代码
5. **添加待办**：使用 `/add-todo` 跟踪任务
6. **获取建议**：使用 `/next` 确定下一步方向

### 最佳实践

| 实践 | 说明 |
|------|------|
| 四层职责清晰 | Controller 路由 → Business 编排 → Service 单表 → Mapper ORM |
| 查询构建 | 在 Service 层用 LambdaQueryWrapper 构建，禁止在 Controller 层 |
| 对象转换 | 使用 BeanUtil.copyProperties()，禁止 MapstructUtils |
| 权限管理 | 所有接口必须有 @RequiresAuthentication 或 @RequiresGuest |
| 请求封装 | POST 请求体统一使用 LeRequest<T>，通过 request.getContent() 获取参数 |
| 注释完整 | 关键方法必须有 JavaDoc 注释 |
| 定期检查 | 每周至少一次运行 `/check` 和 `/progress` |

### 技术选型建议

| 场景 | 推荐方案 | 理由 |
|------|--------|------|
| 快速生成 CRUD | `/crud` 命令 | 已有表结构时最快 |
| 从零开发功能 | `/dev` 命令 | 包含数据库设计和代码生成 |
| 代码规范检查 | `/check` 命令 | 及时发现问题 |
| 项目进度追踪 | `/progress` 命令 | 定期了解完成情况 |

---

## 需要确认的问题

### 如果不确定下一步方向，请回答：

- [ ] **您更希望继续开发功能，还是优化现有代码？**
  - 选项 A：继续开发新功能（推荐 `/crud` 或 `/dev` 命令）
  - 选项 B：优化现有代码（推荐 `/check` 和 `/progress` 命令）

- [ ] **是否需要为新开发的功能添加到待办列表中？**
  - 可使用 `/add-todo` 快速添加

---

## 相关命令

| 命令 | 用途 | 何时使用 |
|------|------|---------|
| `/start` | 快速了解项目 | 初次接触项目 |
| `/check` | 代码规范检查 | 开发完成后、定期检查 |
| `/progress` | 查看项目进度 | 了解完成情况 |
| `/next` | 获取建议 | 不知道下一步做什么 |
| `/dev` | 开发新功能 | 从零开始开发 |
| `/crud` | 快速生成代码 | 表已存在时 |
| `/add-todo` | 添加待办任务 | 跟踪任务 |

---

## 说明

- 本建议基于对当前项目代码的分析生成
- 建议具体且可执行，不空泛
- 会考虑开发的连贯性和代码质量
- 如发现紧急问题会明确标注
- 如不确定用户意图会主动询问
