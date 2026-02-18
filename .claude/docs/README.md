# 开发文档目录

> **重要提示**: 本项目是 **RuoYi-Vue-Plus 纯后端项目**，不包含前端代码。
> 前端项目（plus-ui）独立维护。

最后更新: 2026-02-09

---

## 项目概述

RuoYi-Vue-Plus 是一个基于 Spring Boot 3 的企业级后端框架，采用**三层架构**设计。

### 核心特性

| 特性 | 说明 |
|------|------|
| **架构** | 三层架构：Controller → Service → Mapper（**无 DAO 层**） |
| **包名** | `org.dromara.*` |
| **多租户** | 基于 TenantEntity 实现数据隔离 |
| **主键策略** | 雪花 ID（不使用 AUTO_INCREMENT） |
| **对象转换** | MapstructUtils.convert()（禁止 BeanUtils） |

### 项目结构

```
RuoYi-Vue-Plus/
├── ruoyi-admin/                # 后端启动入口
├── ruoyi-common/               # 通用工具模块（24个子模块）
├── ruoyi-modules/              # 业务功能模块
│   ├── ruoyi-system/          # 系统管理模块
│   ├── ruoyi-demo/            # 演示模块（⭐ 参考实现）
│   ├── ruoyi-generator/       # 代码生成器
│   ├── ruoyi-job/             # 定时任务（SnailJob）
│   └── ruoyi-workflow/        # 工作流（WarmFlow）
└── script/sql/                 # 数据库脚本
```

---

## 文档列表

### 核心开发指南

| 文档 | 说明 | 适用场景 |
|------|------|---------|
| [后端开发指南](./后端开发指南.md) | 三层架构、代码模板、核心规范 | 后端业务开发 |
| [新功能开发流程规范](./新功能开发流程规范.md) | 完整开发流程、检查清单 | 新功能开发 |
| [工作流开发指南](./工作流开发指南.md) | WarmFlow 集成、审批流程 | 工作流业务 |

### 规范与工具

| 文档 | 说明 | 适用场景 |
|------|------|---------|
| [数据库设计规范](./数据库设计规范.md) | 建表模板、字段规范、索引设计 | 数据库设计 |
| [工具类使用指南](./工具类使用指南.md) | MapstructUtils、StringUtils 等 | 工具类使用 |
| [前端开发指南](./前端开发指南.md) | 后端与前端协作规范、API 对接 | 前后端联调 |

---

## 快速导航

### 按开发阶段

```
需求分析
    ↓
数据库设计 → 📖 数据库设计规范.md
    ↓
后端开发 → 📖 后端开发指南.md + 新功能开发流程规范.md
    ↓
前后端联调 → 📖 前端开发指南.md（API 规范部分）
```

### 按问题类型

| 遇到的问题 | 查阅文档 |
|-----------|---------|
| 不知道代码怎么写 | [后端开发指南](./后端开发指南.md) |
| 不知道表怎么设计 | [数据库设计规范](./数据库设计规范.md) |
| 不知道工具类怎么用 | [工具类使用指南](./工具类使用指南.md) |
| 需要实现审批流程 | [工作流开发指南](./工作流开发指南.md) |
| 需要给前端提供 API | [前端开发指南](./前端开发指南.md) |

---

## 核心规范速查

### 三层架构

```
Controller（接收请求、参数校验）
    ↓
Service（业务逻辑、buildQueryWrapper 查询构建）
    ↓
Mapper（extends BaseMapperPlus<Entity, Vo>）
```

**注意**：本项目**没有 DAO 层**，Service 直接注入 Mapper。

### 模块与表前缀

| 模块 | 表前缀 | 包路径 |
|------|--------|--------|
| system | `sys_` | `org.dromara.system` |
| demo | `test_` | `org.dromara.demo` |
| workflow | `flow_` | `org.dromara.workflow` |

### 禁止事项

```java
// ❌ 错误包名
package com.ruoyi.xxx;      // 禁止！
package plus.ruoyi.xxx;    // 禁止！
// ✅ 正确: org.dromara.xxx

// ❌ 使用 BeanUtils
BeanUtil.copyProperties(bo, entity);  // 禁止！
// ✅ 正确: MapstructUtils.convert(bo, Xxx.class)

// ❌ 使用 Map 传递业务数据
public Map<String, Object> getXxx()  // 禁止！
// ✅ 正确: public XxxVo getXxx()

// ❌ Service 继承基类
public class XxxServiceImpl extends ServiceImpl<...>  // 禁止！
// ✅ 正确: public class XxxServiceImpl implements IXxxService

// ❌ 使用 @AutoMappers（复数）
@AutoMappers({@AutoMapper(...)})  // 禁止！
// ✅ 正确: @AutoMapper(target = Xxx.class)
```

---

## 参考实现

开发新功能时，请参考 `ruoyi-demo` 模块的 TestDemo 实现：

| 类型 | 参考文件 |
|------|---------|
| Entity | `org.dromara.demo.domain.TestDemo` |
| BO | `org.dromara.demo.domain.bo.TestDemoBo` |
| VO | `org.dromara.demo.domain.vo.TestDemoVo` |
| Service | `org.dromara.demo.service.impl.TestDemoServiceImpl` |
| Mapper | `org.dromara.demo.mapper.TestDemoMapper` |
| Controller | `org.dromara.demo.controller.TestDemoController` |

---

## 开发前必读

1. **先读根目录的 `CLAUDE.md`**：了解项目整体架构和核心规范
2. **再读对应的开发指南**：根据开发任务查阅详细文档
3. **参考 TestDemo 实现**：遵循已有的代码模式

---

## 文档维护

- 所有文档应与项目代码保持同步
- 发现文档与实际代码不符时，请及时更新
- 文档更新后，请同步更新本 README 的"最后更新"日期
