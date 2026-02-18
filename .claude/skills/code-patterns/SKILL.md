---
name: code-patterns
description: |
  后端代码禁令和编码规范速查。本项目是纯后端项目，前端代码在分离的项目中开发。

  触发场景：
  - 查看项目禁止事项（后端代码）
  - 命名规范速查
  - Git 提交规范
  - 避免过度工程
  - 代码风格检查

  触发词：规范、禁止、命名、Git提交、代码风格、不能用、不允许、包名、架构

  注意：后端 CRUD 开发规范请激活 crud-development，API 开发规范请激活 api-development，数据库设计规范请激活 database-ops。
---

# 代码规范速查

## 🚫 后端禁令速查表

> **快速查表**：一眼定位所有后端代码禁止写法

| 禁止项 | ❌ 禁止写法 | ✅ 正确写法 | 原因 |
|--------|-----------|-----------|------|
| 包名规范 | `com.ruoyi.*` 或 `plus.ruoyi.*` | `org.dromara.*` | 包名统一标准 |
| 完整引用 | `org.dromara.xxx.Xxx` (内联全限定名) | `import` + 短类名 | 代码整洁 |
| 数据返回 | `Map<String, Object>` 返回业务数据 | 创建 VO 类 | 类型安全 |
| Service设计 | `extends ServiceImpl<>` | `implements IXxxService` | 三层架构 |
| 查询构建 | 在 Controller 层构建 | **Service 层** `buildQueryWrapper()` | 职责分离 |
| 接口路径 | `/pageXxxs`, `/getXxx/{id}` | `/list`, `/{id}`, `/` | RESTful 规范 |
| 对象转换 | `BeanUtil.copyProperties()` | `MapstructUtils.convert()` | 项目统一规范 |
| 主键策略 | `AUTO_INCREMENT` | 雪花ID（不指定type） | 主键策略规范 |
| 返回String陷阱 | `R.ok(stringValue)` 返回字符串到data | `R.ok(null, stringValue)` | 方法重载陷阱 |
| Entity基类 | 无基类继承 | `extends TenantEntity`（业务表）或 `extends BaseEntity`（系统表） | 多租户支持 |
| Redis缓存 | `@Cacheable` 返回 `List.of()`/`Set.of()` | `new ArrayList<>(List.of())` | Redis 反序列化失败 |
| Mapper注解 | 单目标用 `@AutoMappers`（复数） | 单目标用 `@AutoMapper`（单数） | 多目标时可用复数 |
| Bash命令 | `> nul` | `> /dev/null 2>&1` | Windows 会创建 nul 文件 |
| 注释语言 | 英文注释 `// get user name` | 中文注释 `// 获取用户名` | 项目统一中文 |
| SQL COMMENT | `COMMENT 'user name'` | `COMMENT '用户名'` | 项目统一中文 |

---

## 🚫 后端禁令（14 条）

### 1. 包名必须是 `org.dromara.*`

```java
// ✅ 正确
package org.dromara.system.service;
package org.dromara.demo.controller;

// ❌ 错误
package com.ruoyi.system.service;
package plus.ruoyi.business.service;
```

### 2. 禁止使用完整类型引用

```java
// ✅ 正确：先 import 再使用
import org.dromara.common.core.domain.R;
public R<XxxVo> getXxx(Long id) { ... }

// ❌ 错误：直接使用完整包名
public org.dromara.common.core.domain.R<XxxVo> getXxx(Long id) { ... }
```

### 3. 禁止使用 Map 封装业务数据

```java
// ✅ 正确：创建 VO 类
public XxxVo getXxx(Long id) {
    return MapstructUtils.convert(entity, XxxVo.class);
}

// ❌ 错误：使用 Map
public Map<String, Object> getXxx(Long id) {
    Map<String, Object> result = new HashMap<>();
    result.put("id", entity.getId());
    return result;
}
```

### 4. Service 禁止继承 ServiceImpl 基类

```java
// ✅ 正确：不继承任何基类，直接注入 Mapper
@Service
public class XxxServiceImpl implements IXxxService {
    private final XxxMapper baseMapper;  // 直接注入 Mapper
}

// ❌ 错误：继承 ServiceImpl
public class XxxServiceImpl extends ServiceImpl<XxxMapper, Xxx> {
}
```

### 5. 查询条件必须在 Service 层构建

> **本项目是三层架构（无 DAO 层）**，`buildQueryWrapper()` 在 **Service 实现类**中。

```java
// ✅ 正确：在 Service 层构建查询条件
@Service
public class XxxServiceImpl implements IXxxService {

    private final XxxMapper baseMapper;

    private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
        LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getStatus() != null, Xxx::getStatus, bo.getStatus());
        lqw.like(StringUtils.isNotBlank(bo.getName()), Xxx::getName, bo.getName());
        return lqw;
    }

    @Override
    public TableDataInfo<XxxVo> queryPageList(XxxBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<Xxx> lqw = buildQueryWrapper(bo);
        Page<XxxVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }
}

// ❌ 错误：在 Controller 层构建查询条件
@RestController
public class XxxController {
    @GetMapping("/list")
    public R<List<XxxVo>> list(XxxBo bo) {
        LambdaQueryWrapper<Xxx> wrapper = new LambdaQueryWrapper<>();  // 禁止！
        wrapper.eq(Xxx::getStatus, bo.getStatus());
    }
}
```

### 6. 接口路径必须使用标准 RESTful 格式

```java
// ✅ 正确：标准 RESTful 路径
@GetMapping("/list")              // 分页/列表查询
@GetMapping("/{id}")              // 获取详情
@PostMapping                      // 新增（空路径）
@PutMapping                       // 修改（空路径）
@DeleteMapping("/{ids}")          // 删除
@PostMapping("/export")           // 导出

// ❌ 错误：包含动词或实体名
@GetMapping("/pageAds")
@GetMapping("/getAd/{id}")
@PostMapping("/addAd")
@PutMapping("/updateAd")
```

### 7. 禁止使用 BeanUtil 进行对象转换

```java
// ✅ 正确：使用 MapstructUtils
XxxVo vo = MapstructUtils.convert(entity, XxxVo.class);
List<XxxVo> voList = MapstructUtils.convert(entityList, XxxVo.class);

// ❌ 错误：使用 BeanUtil
BeanUtil.copyProperties(entity, vo);  // 禁止！
BeanUtils.copyProperties(entity, vo); // 禁止！
```

### 8. 禁止使用 AUTO_INCREMENT

```sql
-- ✅ 正确：不指定自增，使用雪花ID（MyBatis-Plus 全局配置）
id BIGINT(20) NOT NULL COMMENT '主键ID'

-- ❌ 错误：使用自增
id BIGINT(20) AUTO_INCREMENT  -- 禁止！
```

### 9. R.ok() 返回 String 类型的陷阱

```java
// 场景：Controller 返回 R<String>，想把字符串放到 data 中

// ❌ 错误：会匹配 R.ok(String msg)，字符串进入 msg 而非 data
return R.ok(token);  // 结果：{code:200, msg:"xxx", data:null}

// ✅ 正确：明确指定 msg 和 data
return R.ok(null, token);           // data 有值，msg 为 null
return R.ok("获取成功", token);     // msg 和 data 都有值
```

### 10. Entity 必须继承合适的基类

```java
// ✅ 正确：业务表（需要多租户隔离）继承 TenantEntity
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("xxx_table")
public class Xxx extends TenantEntity {  // ✅ 业务表推荐
    @TableId(value = "id")
    private Long id;
}

// ✅ 正确：系统级/工具级表（不需要多租户）继承 BaseEntity
// 例如：SysClient（OAuth2客户端）、GenTable（代码生成）
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_client")
public class SysClient extends BaseEntity {  // ✅ 系统表可用
    @TableId(value = "id")
    private Long id;
}

// ❌ 错误：不继承任何基类
public class Xxx {  // 禁止！缺少审计字段
}
```

### 11. @Cacheable 禁止返回不可变集合

```java
// ❌ 错误：List.of()/Set.of()/Map.of() 返回不可变集合
// 会导致 Redis 反序列化失败（Jackson DefaultTyping 无法正确处理）
@Cacheable(value = "xxx")
public List<String> listXxx() {
    return List.of("1", "2");  // 禁止！第二次请求会报错
    return Set.of("a", "b");   // 禁止！
    return Map.of("k", "v");   // 禁止！
}

// ✅ 正确：使用可变集合包装
@Cacheable(value = "xxx")
public List<String> listXxx() {
    return new ArrayList<>(List.of("1", "2"));  // ✅
}

@Cacheable(value = "xxx")
public Set<String> setXxx() {
    return new HashSet<>(Set.of("a", "b"));  // ✅
}

@Cacheable(value = "xxx")
public Map<String, String> mapXxx() {
    return new HashMap<>(Map.of("k", "v"));  // ✅
}
```

**原因**：本项目 Redis 使用 `Jackson DefaultTyping.NON_FINAL`，会为非 final 类添加类型信息。`List.of()` 返回的 `ImmutableCollections$List12` 是非 final 类，序列化后反序列化时会将内层元素误判为类型数组，导致 `ClassNotFoundException`。

### 12. BO 映射注解规范

```java
// ✅ 正确：单目标映射使用 @AutoMapper（单数）
@Data
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)
public class XxxBo {
    // ...
}

// ✅ 正确：多目标映射使用 @AutoMappers（复数）
// 例如 SysOperLogBo 需要映射到 SysOperLog 和 OperLogEvent 两个目标
@AutoMappers({
    @AutoMapper(target = SysOperLog.class, reverseConvertGenerate = false),
    @AutoMapper(target = OperLogEvent.class)
})
public class SysOperLogBo {
    // ...
}

// ❌ 错误：单目标时使用 @AutoMappers 包装（冗余）
@AutoMappers({
    @AutoMapper(target = Xxx.class)
})
public class XxxBo {
    // ...
}
```

### 13. 代码注释必须使用中文

> **⚠️ 高频问题**：Codex/Gemini 协作时经常输出英文注释，必须检查并修正。

```java
// ✅ 正确：中文注释
/**
 * 根据 ID 查询用户信息
 *
 * @param id 用户 ID
 * @return 用户视图对象
 */
public SysUserVo queryById(Long id) {
    // 查询用户基本信息
    return baseMapper.selectVoById(id);
}

// ❌ 错误：英文注释
/**
 * Query user info by ID
 *
 * @param id user ID
 * @return user view object
 */
public SysUserVo queryById(Long id) {
    // query user basic info
    return baseMapper.selectVoById(id);
}
```

**适用范围**：
- Javadoc 注释（`/** */`）
- 行内注释（`//`）
- 块注释（`/* */`）
- `@param`、`@return`、`@throws` 的描述文本
- SQL 注释（`--`）

**不适用**（保持英文）：
- 变量名、方法名、类名（遵循 Java 命名规范）
- 注解属性值（如 `@TableName("sys_user")`）
- 日志中的英文关键词（如 `log.error("Failed to...")`，但建议也用中文）

### 14. SQL COMMENT 必须使用中文

```sql
-- ✅ 正确：中文 COMMENT
`user_name` VARCHAR(50) NOT NULL COMMENT '用户名',
`status` CHAR(1) DEFAULT '0' COMMENT '状态(0正常 1停用)',
) ENGINE=InnoDB COMMENT='用户信息表';

-- ❌ 错误：英文 COMMENT（⚠️ Codex 高频错误）
`user_name` VARCHAR(50) NOT NULL COMMENT 'user name',
`status` CHAR(1) DEFAULT '0' COMMENT 'status(0=normal 1=disabled)',
) ENGINE=InnoDB COMMENT='user info table';
```

---

## 📝 命名规范速查

### 后端命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 包名 | 小写，点分隔 | `org.dromara.system` |
| 类名 | 大驼峰 | `SysUserServiceImpl` |
| 方法名 | 小驼峰 | `queryPageList`, `selectById` |
| 变量名 | 小驼峰 | `userName`, `createTime` |
| 常量 | 全大写下划线 | `MAX_PAGE_SIZE` |
| 表名 | 小写下划线 | `sys_user`, `test_demo` |
| 字段名 | 小写下划线 | `user_name`, `create_time` |

### 类命名后缀

| 类型 | 后缀 | 示例 |
|------|------|------|
| 实体类 | 无/Sys前缀 | `SysUser`, `TestDemo` |
| 业务对象 | Bo | `SysUserBo`, `TestDemoBo` |
| 视图对象 | Vo | `SysUserVo`, `TestDemoVo` |
| 服务接口 | IXxxService | `ISysUserService` |
| 服务实现 | XxxServiceImpl | `SysUserServiceImpl` |
| 控制器 | XxxController | `SysUserController` |
| Mapper | XxxMapper | `SysUserMapper` |

> **注意**：本项目是三层架构，没有 DAO 层。Service 直接注入 Mapper。

### 方法命名

| 操作 | Service 方法 | Controller URL |
|------|-------------|----------------|
| 分页查询 | `queryPageList(bo, pageQuery)` | `GET /list` |
| 查询单个 | `queryById(id)` | `GET /{id}` |
| 新增 | `insertByBo(bo)` | `POST /` |
| 修改 | `updateByBo(bo)` | `PUT /` |
| 删除 | `deleteWithValidByIds(ids)` | `DELETE /{ids}` |
| 导出 | `queryList(bo)` + ExcelUtil | `POST /export` |

---

## ✅ 避免过度工程

### 不要做的事

1. **不要创建不必要的抽象**
   - 只有一处使用的代码不需要抽取
   - 三处以上相同代码才考虑抽取

2. **不要添加不需要的功能**
   - 只实现当前需求
   - 不要"以防万一"添加功能

3. **不要过早优化**
   - 优先使用简单直接的方案
   - 复杂方案需要有明确理由

4. **不要添加无用注释**
   - 不要给显而易见的代码加注释
   - 只在逻辑复杂处添加注释

5. **不要保留废弃代码**
   - 删除不用的代码，不要注释保留
   - Git 有历史记录

---

## 📦 Git 提交规范

### 格式

```
<type>(<scope>): <description>
```

### 类型

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（不是新功能或修复） |
| `perf` | 性能优化 |
| `test` | 测试 |
| `chore` | 构建/工具 |

### 示例

```bash
feat(system): 新增用户反馈功能
fix(demo): 修复订单状态显示错误
docs(readme): 更新安装说明
refactor(common): 重构分页查询工具类
perf(system): 优化用户列表查询性能
```

---

## 🔗 相关 Skill

| 需要了解 | 激活 Skill |
|---------|-----------|
| 后端 CRUD 开发规范 | `crud-development` |
| API 开发规范 | `api-development` |
| 数据库设计规范 | `database-ops` |
| 系统架构设计 | `architecture-design` |
| 技术方案决策 | `tech-decision` |
