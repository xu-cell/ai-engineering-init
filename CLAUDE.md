# CLAUDE.md - RuoYi-Vue-Plus 项目

## 语言设置
**必须使用中文**与用户对话。

## 术语约定
| 术语 | 含义 | 对应目录 |
|------|------|---------|
| **后端** | Java 服务 | `ruoyi-modules/` |
| **前端** | PC 管理端 | `/Users/xujiajun/Developer/frontProj/web`（Vue 2 独立项目） |
| **系统模块** | 系统管理功能 | `ruoyi-modules/ruoyi-system/` |
| **业务模块** | 自定义业务 | `ruoyi-modules/ruoyi-xxx/` |

## 前端技术栈
> **前端项目路径**：`/Users/xujiajun/Developer/frontProj/web`（独立项目）

| 技术 | 版本 | 关键点 |
|------|------|--------|
| Vue | 2.7.16 | Options API，非 Composition API |
| Element UI | 2.15.9 | `el-` 前缀组件 |
| Vuex | 3.4.0 | 28个模块，namespaced:true |
| Vue Router | 3.2.0 | Hash 路由，动态权限路由 |
| vue-i18n | 7.3.2 | 中英文，`$t('key')` |

**前端关键机制**：Token=`Admin-Token`（localStorage）、租户=`MERCHANT-ID`（请求头）、成功码=`10000`、金额=分（`money()` 转元）、权限=`v-hasPerm`、加密=SM4国密

**前端 src 结构**：`api/`(65个接口) | `leniuview/`(35个业务模块) | `leniu-components/`(业务组件) | `components/`(公共组件~87) | `store/`(30个模块) | `utils/request.js`(请求封装) | `permission.js`(路由守卫)

> **前端开发技能**：`ui-pc`（组件/API/权限）、`store-pc`（Vuex状态管理）

## MCP 工具触发

| 触发词 | 工具 | 用途 |
|-------|------|------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` | 链式推理，多步骤分析 |
| 最佳实践、官方文档、标准写法 | `context7` | MyBatis-Plus/Sa-Token/Spring Boot 等 |
| 打开浏览器、截图、检查元素 | `chrome-devtools` | 浏览器调试 |

## Skills 强制评估（必须遵守）

> **每次用户提问时，UserPromptSubmit Hook 会注入技能评估提示。必须严格遵循！**

**流程**：
1. **评估**：根据注入的技能列表，列出匹配的技能及理由
2. **激活**：对每个匹配的技能调用 `Skill(技能名)`
3. **实现**：激活完成后开始实现

**Skills 位置**：`.claude/skills/[skill-name]/SKILL.md`

> **前端开发技能**（`ui-pc`、`store-pc`）可用于前端开发场景。

---

## 核心架构（必须牢记）

| 项目 | 规范 |
|------|------|
| **包名** | `org.dromara.*` |
| **三层架构** | Controller → Service（buildQueryWrapper）→ Mapper |
| **对象转换** | `MapstructUtils.convert()` |
| **Entity基类** | `TenantEntity`（多租户版本） |
| **BO/VO映射** | `@AutoMapper` 注解 |
| **主键策略** | 雪花ID（不用 AUTO_INCREMENT） |
| **Controller基类** | `extends BaseController` |

### 模块与表前缀对应

| 模块 | 表前缀 | 包路径 |
|------|--------|--------|
| system | `sys_` | `org.dromara.system` |
| demo | `test_` | `org.dromara.demo` |
| workflow | `flow_` | `org.dromara.workflow` |
| 自定义 | 自定义 | `org.dromara.xxx` |

---

## 绝对禁止的写法

```java
// ❌ 禁止1: 错误包名
package com.ruoyi.xxx;  // 必须是 org.dromara.xxx

// ❌ 禁止2: 使用 Map 传递业务数据（必须用 VO）

// ❌ 禁止3: 使用完整类型引用（先 import 再用短类名）

// ❌ 禁止4: 使用 BeanUtil（用 MapstructUtils.convert()）

// ❌ 禁止5: 数据库使用自增ID（用雪花ID）
```

---

## API 路径规范

| 操作 | HTTP方法 | 路径 |
|------|---------|------|
| 分页查询 | GET | `/list` |
| 获取详情 | GET | `/{id}` |
| 新增 | POST | `/` |
| 修改 | PUT | `/` |
| 删除 | DELETE | `/{ids}` |
| 导出 | POST | `/export` |

---

## 后端标准模块结构

```
ruoyi-modules/ruoyi-xxx/src/main/java/org/dromara/xxx/
├── controller/XxxController.java     # extends BaseController
├── service/IXxxService.java + impl/  # 含 buildQueryWrapper()
├── mapper/XxxMapper.java             # extends BaseMapperPlus
└── domain/Xxx.java + bo/ + vo/       # extends TenantEntity
```

## 数据库设计规范

```sql
-- 必须字段：id(雪花) + tenant_id + 业务字段 + 审计字段 + del_flag
id BIGINT(20) NOT NULL,  tenant_id VARCHAR(20) DEFAULT '000000',
create_dept/create_by/create_time/update_by/update_time, del_flag CHAR(1)
```

---

## 后端工具类速查

| 工具类 | 用途 | 常用方法 |
|--------|------|---------|
| `MapstructUtils` | 对象转换 | `convert(source, Target.class)` |
| `StringUtils` | 字符串处理 | `isBlank()`, `isNotBlank()` |
| `ServiceException` | 业务异常 | `throw new ServiceException("msg")` |

## 参考代码位置

| 类型 | 位置 |
|------|------|
| Controller 示例 | `ruoyi-system/.../controller/system/SysNoticeController.java` |
| Service 示例 | `ruoyi-system/.../service/impl/SysNoticeServiceImpl.java` |
| Entity 示例 | `ruoyi-system/.../domain/SysNotice.java` |

## 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能 |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
