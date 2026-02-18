# CLAUDE.md - RuoYi-Vue-Plus 项目

## 语言设置
**必须使用中文**与用户对话。

## 术语约定
| 术语 | 含义 | 对应目录 |
|------|------|---------|
| **后端** | Java 服务 | `ruoyi-modules/` |
| **前端** | PC 管理端 | `plus-ui/`（Vue 3）或独立前端项目 |
| **系统模块** | 系统管理功能 | `ruoyi-modules/ruoyi-system/` |
| **业务模块** | 自定义业务 | `ruoyi-modules/ruoyi-xxx/` |

> **前端代码检测**：
> - 如果存在 `plus-ui/` 目录 → 包含 PC 端前端代码（Vue 3 + Element Plus）
> - 如果不存在 `plus-ui/` 目录 → 纯后端项目，前端需单独获取

## 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 2.7+ 或 3.x | 根据项目选择 |
| Element UI / Element Plus | 2.15 / 2.x | UI 组件库 |
| Vuex / Pinia | 3.x / 2.x | 状态管理 |
| Vue Router | 3.x / 4.x | 路由管理 |

> **前端开发技能**：`ui-pc`（组件库）、`store-pc`（状态管理）

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
| **BO/VO映射** | `@AutoMappers` 注解 |
| **主键策略** | 雪花ID（不用 AUTO_INCREMENT） |
| **Controller基类** | `extends BaseController` |

### 模块与表前缀对应

| 模块 | 表前缀 | 包路径 | 示例 |
|------|--------|--------|------|
| system | `sys_` | `org.dromara.system` | `sys_user`, `sys_menu` |
| demo | `test_` | `org.dromara.demo` | `test_demo`, `test_tree` |
| workflow | `flow_` | `org.dromara.workflow` | `flow_category`, `flow_spel` |
| 自定义 | 自定义 | `org.dromara.xxx` | 按业务定义 |

---

## 绝对禁止的写法

### 后端禁止项

```java
// ❌ 禁止1: 错误包名
package com.ruoyi.xxx;  // 必须是 org.dromara.xxx

// ❌ 禁止2: 使用 Map 传递业务数据
public Map<String, Object> getXxx(Long id) { ... }  // 禁止！必须用 VO

// ❌ 禁止3: 使用完整类型引用
public org.dromara.common.core.domain.R<XxxVo> getXxx()  // ❌ 禁止！
// ✅ 正确：先 import，再使用短类名
import org.dromara.common.core.domain.R;
public R<XxxVo> getXxx()

// ❌ 禁止4: 使用 BeanUtil
BeanUtil.copyProperties(bo, entity);  // 禁止！用 MapstructUtils.convert()

// ❌ 禁止5: 数据库使用自增ID
id BIGINT(20) AUTO_INCREMENT  // 禁止！本项目用雪花ID
```

---

## API 路径规范

| 操作 | HTTP方法 | 路径格式 | 示例 |
|------|---------|---------|------|
| 分页查询 | GET | `/list` | `@GetMapping("/list")` |
| 获取详情 | GET | `/{id}` | `@GetMapping("/{id}")` |
| 新增 | POST | `/` (空) | `@PostMapping` |
| 修改 | PUT | `/` (空) | `@PutMapping` |
| 删除 | DELETE | `/{ids}` | `@DeleteMapping("/{ids}")` |
| 导出 | POST | `/export` | `@PostMapping("/export")` |

---

## 后端代码结构

### 三层架构（无 DAO 层）

```
Controller → Service → Mapper
     ↓           ↓         ↓
  接收请求    业务逻辑    数据访问
  参数校验    查询构建    MyBatis
```

### 标准模块结构

```
ruoyi-modules/ruoyi-xxx/src/main/java/org/dromara/xxx/
├── controller/
│   └── XxxController.java          # 控制器（extends BaseController）
├── service/
│   ├── IXxxService.java            # 服务接口
│   └── impl/
│       └── XxxServiceImpl.java     # 服务实现（不继承基类）
├── mapper/
│   └── XxxMapper.java              # Mapper 接口（extends BaseMapperPlus）
└── domain/
    ├── Xxx.java                    # 实体类（extends TenantEntity）
    ├── bo/
    │   └── XxxBo.java              # 业务对象（@AutoMapper）
    └── vo/
        └── XxxVo.java              # 视图对象
```

---

## 数据库设计规范

```sql
CREATE TABLE xxx_table (
    id           BIGINT(20)   NOT NULL COMMENT '主键ID',
    tenant_id    VARCHAR(20)  DEFAULT '000000' COMMENT '租户ID',
    xxx_name     VARCHAR(100) NOT NULL COMMENT '名称',
    status       CHAR(1)      DEFAULT '0' COMMENT '状态(0正常 1停用)',
    create_dept  BIGINT(20)   DEFAULT NULL COMMENT '创建部门',
    create_by    BIGINT(20)   DEFAULT NULL COMMENT '创建人',
    create_time  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    update_by    BIGINT(20)   DEFAULT NULL COMMENT '更新人',
    update_time  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    del_flag     CHAR(1)      DEFAULT '0' COMMENT '删除标志',
    PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='xxx表';
```

---

## 后端工具类速查

| 工具类 | 用途 | 常用方法 |
|--------|------|---------|
| `MapstructUtils` | 对象转换 | `convert(source, Target.class)` |
| `StringUtils` | 字符串处理 | `isBlank()`, `isNotBlank()` |
| `ServiceException` | 业务异常 | `throw new ServiceException("msg")` |

---

## 参考代码位置

| 类型 | 位置 |
|------|------|
| Controller 示例 | `ruoyi-system/.../controller/system/SysNoticeController.java` |
| Service 示例 | `ruoyi-system/.../service/impl/SysNoticeServiceImpl.java` |
| Entity 示例 | `ruoyi-system/.../domain/SysNotice.java` |

---

## 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能 |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
