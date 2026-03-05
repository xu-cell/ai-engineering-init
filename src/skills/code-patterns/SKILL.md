---
name: code-patterns
description: |
  后端代码禁令和编码规范速查。本项目是纯后端项目，前端代码在分离的项目中开发。

  触发场景：
  - 查看项目禁止事项（后端代码）
  - 命名规范速查
  - Git 提交规范
  - 代码风格检查
  - 避免过度工程

  触发词：规范、禁止、命名、Git提交、代码风格、不能用、不允许、包名、架构

  注意：后端 CRUD 开发规范请激活 crud-development，API 开发规范请激活 api-development，数据库设计规范请激活 database-ops。
---

# 代码规范速查

## 后端禁令速查表

| # | 禁止项 | 错误写法 | 正确写法 |
|---|--------|---------|---------|
| 1 | 包名 | `com.ruoyi.*` / `plus.ruoyi.*` | `org.dromara.*` |
| 2 | 完整引用 | `org.dromara.xxx.Xxx` 内联 | `import` + 短类名 |
| 3 | 数据返回 | `Map<String, Object>` | 创建 VO 类 |
| 4 | Service设计 | `extends ServiceImpl<>` | `implements IXxxService` |
| 5 | 查询构建 | Controller 层 | **Service 层** `buildQueryWrapper()` |
| 6 | 接口路径 | `/pageXxxs`, `/getXxx/{id}` | `/list`, `/{id}`, `/` |
| 7 | 对象转换 | `BeanUtil.copyProperties()` | `MapstructUtils.convert()` |
| 8 | 主键 | `AUTO_INCREMENT` | 雪花ID（不指定type） |
| 9 | R.ok(string) | `R.ok(token)` | `R.ok(null, token)` |
| 10 | Entity基类 | 无基类 | `extends TenantEntity` / `BaseEntity` |
| 11 | @Cacheable | 返回 `List.of()`/`Set.of()` | `new ArrayList<>(List.of())` |
| 12 | Mapper注解 | 单目标用 `@AutoMappers` | 单目标用 `@AutoMapper` |
| 13 | 注释语言 | 英文注释 | **中文注释** |
| 14 | SQL COMMENT | `COMMENT 'user name'` | `COMMENT '用户名'` |

---

## 禁令详解

### 1-2. 包名与引用

```java
// ✅
package org.dromara.system.service;
import org.dromara.common.core.domain.R;
public R<XxxVo> getXxx(Long id) { ... }

// ❌
package com.ruoyi.system.service;
public org.dromara.common.core.domain.R<XxxVo> getXxx(Long id) { ... }
```

### 3. 禁止 Map 传业务数据

```java
// ✅ 创建 VO 类
public XxxVo getXxx(Long id) {
    return MapstructUtils.convert(entity, XxxVo.class);
}

// ❌
public Map<String, Object> getXxx(Long id) { ... }
```

### 4-5. Service 架构

```java
// ✅ 三层架构：不继承 ServiceImpl，直接注入 Mapper
@Service
public class XxxServiceImpl implements IXxxService {
    private final XxxMapper baseMapper;

    private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
        LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getStatus() != null, Xxx::getStatus, bo.getStatus());
        lqw.like(StringUtils.isNotBlank(bo.getName()), Xxx::getName, bo.getName());
        return lqw;
    }
}

// ❌
public class XxxServiceImpl extends ServiceImpl<XxxMapper, Xxx> { }
```

### 6. RESTful 路径

```java
// ✅
@GetMapping("/list")     @GetMapping("/{id}")
@PostMapping             @PutMapping
@DeleteMapping("/{ids}") @PostMapping("/export")

// ❌
@GetMapping("/pageAds")  @GetMapping("/getAd/{id}")
@PostMapping("/addAd")   @PutMapping("/updateAd")
```

### 7. 对象转换

```java
// ✅ MapstructUtils
XxxVo vo = MapstructUtils.convert(entity, XxxVo.class);
List<XxxVo> voList = MapstructUtils.convert(entityList, XxxVo.class);

// ❌ BeanUtil
BeanUtil.copyProperties(entity, vo);
```

### 8. 主键策略

```sql
-- ✅ 雪花ID
id BIGINT(20) NOT NULL COMMENT '主键ID'

-- ❌
id BIGINT(20) AUTO_INCREMENT
```

### 9. R.ok() 返回 String 陷阱

```java
// ❌ 匹配 R.ok(String msg)，字符串进入 msg 而非 data
return R.ok(token);  // {code:200, msg:"xxx", data:null}

// ✅ 明确指定
return R.ok(null, token);        // data=token, msg=null
return R.ok("获取成功", token);  // 都有值
```

### 10. Entity 基类

```java
// ✅ 业务表（需多租户隔离）
public class Xxx extends TenantEntity {
    @TableId(value = "id")
    private Long id;
}

// ✅ 系统表（不需多租户）
public class SysClient extends BaseEntity { }

// ❌ 不继承基类
public class Xxx { }
```

### 11. @Cacheable 不可变集合

```java
// ❌ Redis 反序列化失败
@Cacheable(value = "xxx")
public List<String> listXxx() { return List.of("1", "2"); }

// ✅ 可变集合包装
@Cacheable(value = "xxx")
public List<String> listXxx() { return new ArrayList<>(List.of("1", "2")); }
```

> **原因**：Jackson DefaultTyping.NON_FINAL 会为 `ImmutableCollections$List12` 添加类型信息，反序列化时导致 `ClassNotFoundException`。

### 12. BO 映射注解

```java
// ✅ 单目标：@AutoMapper
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)
public class XxxBo { }

// ✅ 多目标：@AutoMappers
@AutoMappers({
    @AutoMapper(target = SysOperLog.class, reverseConvertGenerate = false),
    @AutoMapper(target = OperLogEvent.class)
})
public class SysOperLogBo { }
```

### 13-14. 中文注释与 SQL COMMENT

```java
// ✅ 中文注释
/** 根据 ID 查询用户信息 */
public SysUserVo queryById(Long id) {
    // 查询用户基本信息
    return baseMapper.selectVoById(id);
}

// ❌ 英文注释
/** Query user info by ID */
```

```sql
-- ✅
`user_name` VARCHAR(50) NOT NULL COMMENT '用户名',
) ENGINE=InnoDB COMMENT='用户信息表';

-- ❌
`user_name` VARCHAR(50) NOT NULL COMMENT 'user name',
```

---

## 命名后缀规范

| 类型 | 后缀 | 示例 |
|------|------|------|
| 实体类 | 无/Sys前缀 | `SysUser`, `TestDemo` |
| 业务对象 | Bo | `SysUserBo` |
| 视图对象 | Vo | `SysUserVo` |
| 服务接口 | IXxxService | `ISysUserService` |
| 服务实现 | XxxServiceImpl | `SysUserServiceImpl` |
| 控制器 | XxxController | `SysUserController` |
| Mapper | XxxMapper | `SysUserMapper` |

> 本项目是三层架构，没有 DAO 层。Service 直接注入 Mapper。

## 方法命名

| 操作 | Service 方法 | Controller URL |
|------|-------------|----------------|
| 分页查询 | `queryPageList(bo, pageQuery)` | `GET /list` |
| 查询单个 | `queryById(id)` | `GET /{id}` |
| 新增 | `insertByBo(bo)` | `POST /` |
| 修改 | `updateByBo(bo)` | `PUT /` |
| 删除 | `deleteWithValidByIds(ids)` | `DELETE /{ids}` |
| 导出 | `queryList(bo)` + ExcelUtil | `POST /export` |

---

## Git 提交规范

```
<type>(<scope>): <description>
```

| type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(system): 新增用户反馈功能` |
| `fix` | 修复 | `fix(demo): 修复订单状态显示错误` |
| `refactor` | 重构 | `refactor(common): 重构分页查询工具类` |
| `perf` | 性能 | `perf(system): 优化用户列表查询性能` |
| `docs` | 文档 | `docs(readme): 更新安装说明` |
| `style` | 格式 | `chore` 构建/工具 | `test` 测试 |

---

## 多项目适配

| 特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| 包名 | `org.dromara.*` | `net.xnzn.core.*` |
| JDK | 17 | 21 |
| 对象转换 | `MapstructUtils.convert()` | `BeanUtil.copyProperties()` |
| 分页 | `TableDataInfo<T>` | `Page<T>` |
| 异常 | `ServiceException` | `LeException` |
| 工具库 | 自定义工具类 | Hutool |

### leniu-tengyun-core 专用

```java
// 国际化
throw new LeException(I18n.getMessage("user.not.exists"));

// 租户上下文
Long tenantId = TenantContextHolder.getTenantId();

// 分页
PageMethod.startPage(param.getPage().getPageNum(), param.getPage().getPageSize());
```

---

## 相关 Skill

| 需要了解 | 激活 Skill |
|---------|-----------|
| 后端 CRUD 开发 | `crud-development` |
| API 开发 | `api-development` |
| 数据库设计 | `database-ops` |
| 系统架构 | `architecture-design` |
