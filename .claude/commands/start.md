# /start - 项目快速了解

新成员快速了解 leniu-tengyun-core（云食堂）项目的必看命令。

---

## 适用场景

| 场景 | 说明 |
|------|------|
| **初次接触** | 新成员第一次接触项目 |
| **项目交接** | 接手他人的项目 |
| **重新梳理** | 距上次熟悉项目已久，需快速回顾 |
| **窗口切换** | 在新的 Claude 会话中快速了解项目 |

---

## 执行流程

### 第一步：扫描项目结构

```bash
# 扫描业务模块 Controller
Glob pattern: "sys-canteen/src/main/java/net/xnzn/core/**/controller/*Controller.java"
Glob pattern: "sys-kitchen/src/main/java/net/xnzn/core/**/controller/*Controller.java"
Glob pattern: "sys-drp/src/main/java/net/xnzn/core/**/controller/*Controller.java"

# 查看最近 3 条 Git 提交
git log -3 --oneline
```

### 第二步：识别 leniu 模块结构

**核心业务模块（统计进度）**：

| 模块 | 说明 | 包名 |
|------|------|------|
| `sys-canteen` | 食堂业务（订单、菜品、用户）| `net.xnzn.core.canteen` |
| `sys-kitchen` | 后场厨房（备餐、出餐、排班）| `net.xnzn.core.kitchen` |
| `sys-drp` | 供应链（采购、库存、配送）| `net.xnzn.core.drp` |
| `sys-common` | 公共业务（支付、通知、对接）| `net.xnzn.core.common` |

**基础设施模块（不统计进度）**：
- `core-base` - 公共配置、工具类
- `core-aggregator` - 聚合器
- `sys-open` - 开放接口模块
- `sys-logistics` - 物流模块

### 第三步：判断项目开发阶段

```
Controller 数量 = 0    → 全新项目
Controller 数量 1-20   → 初期开发
Controller 数量 21+    → 成熟项目
```

### 第四步：检查文档状态

```bash
Glob pattern: "docs/*.md"
```

---

## 输出格式

### 情况一：全新项目

```markdown
# 欢迎使用 leniu-tengyun-core（云食堂）

**技术栈**：Spring Boot 3.x + pigx-framework + MyBatis-Plus + JDK 21
**架构**：四层架构（Controller → Business → Service → Mapper）
**双库**：系统库（全局配置）+ 商户库（租户业务数据）

## 框架现状

### 核心特性
- 双库物理隔离（无 tenant_id 字段，通过请求头 MERCHANT-ID 路由）
- JDK 21 + jakarta.validation.*
- PageHelper 分页 + LeRequest<T> 请求封装
- LeException 业务异常 + I18n 国际化

## 快速开始

1. 了解规范：查看 CLAUDE.md
2. 初始化文档：/init-docs
3. 开始开发：/dev 或 /crud
```

### 情况二：开发中项目

```markdown
# 欢迎回到 leniu-tengyun-core

**项目阶段**：开发中
**技术栈**：Spring Boot 3.x + JDK 21 + pigx-framework

## 模块进度

| 模块 | Controller 数 | 说明 |
|------|--------------|------|
| sys-canteen | X | 食堂业务 |
| sys-kitchen | X | 后场厨房 |
| sys-drp | X | 供应链 |

## 最近提交

[显示最近 3 条 git commit]

## 代码质量速查

| 检查项 | 状态 |
|--------|------|
| 包名 (net.xnzn.core.*) | ✅/⚠️ |
| 审计字段 (crby/crtime) | ✅/⚠️ |
| 认证注解 (@RequiresAuthentication) | ✅/⚠️ |

## 建议操作

```bash
/progress    # 查看详细进度
/check       # 检查代码规范
/next        # 获取下一步建议
```
```

### 第五步：文档建议

若 `docs/` 目录不存在：

```markdown
## 建议

检测到业务代码，但尚未初始化项目文档。

执行 /init-docs 初始化：
- 项目状态.md - 进度追踪
- 需求文档.md - 业务需求
- 待办清单.md - 任务清单
```

---

## 新成员入门清单

- [ ] 阅读 `CLAUDE.md` 了解 leniu 开发规范
- [ ] 运行 `/start` 了解项目现状
- [ ] 运行 `/progress` 查看详细进度
- [ ] 了解双库架构（系统库 vs 商户库）
- [ ] 了解四层架构（Controller → Business → Service → Mapper）
- [ ] 根据 `/next` 建议选择任务

---

## 核心命令速览

```bash
/start          # 项目概览（当前命令）
/progress       # 详细进度
/check          # 代码规范检查
/dev            # 开发新功能（含表设计）
/crud           # 快速生成 CRUD（表已存在）
/next           # 获取建议
/sync           # 全量同步
/init-docs      # 初始化文档
/add-todo       # 添加待办
```

---

## 常见问题

### Q: leniu 架构和 RuoYi-Vue-Plus 有什么区别？

| 对比 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| 包名 | `org.dromara.*` | `net.xnzn.core.*` |
| 租户 | 单库 `tenant_id` 字段 | 双库物理隔离 |
| 审计字段 | createBy/createTime | crby/crtime |
| del_flag | 0=正常 | 2=正常 |
| 请求封装 | BO | LeRequest<T> |
| 权限注解 | @SaCheckPermission | @RequiresAuthentication |
| 异常 | ServiceException | LeException |
| 多了一层 | 三层 | 四层（多 Business 层）|

### Q: 怎么开发新功能？

```bash
/dev  # 含表结构设计的完整开发向导
/crud # 表已存在时快速生成代码
```

### Q: 怎么追踪进度？

```bash
/progress  # 查看完成情况
/sync      # 生成完整报告
```
