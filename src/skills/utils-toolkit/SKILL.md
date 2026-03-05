---
name: utils-toolkit
description: |
  后端工具类使用指南。包含 MapstructUtils、StringUtils、StreamUtils、TreeBuildUtils、DateUtils、RedisUtils 等核心工具类。

  触发场景：
  - 对象转换（BO/VO/Entity）
  - 字符串处理、集合流操作
  - 树结构构建
  - Redis 缓存操作
  - Excel 导入导出

  触发词：工具类、MapstructUtils、StringUtils、StreamUtils、TreeBuildUtils、DateUtils、RedisUtils、ExcelUtil、JsonUtils、LoginHelper、convert、对象转换、集合操作、树结构、缓存

  注意：
  - 对象转换必须使用 MapstructUtils.convert()，禁止使用 BeanUtils。
  - 本项目是纯后端项目，无前端工具类。
---

# 后端工具类大全

## 快速索引

| 功能 | 工具类 | 包路径 | 常用方法 |
|------|--------|--------|---------|
| **对象转换** | `MapstructUtils` | `o.d.common.core.utils` | `convert()` |
| 字符串 | `StringUtils` | `o.d.common.core.utils` | `isBlank()`, `format()` |
| 集合/流 | `StreamUtils` | `o.d.common.core.utils` | `filter()`, `toList()`, `toMap()` |
| 树结构 | `TreeBuildUtils` | `o.d.common.core.utils` | `build()` |
| 日期时间 | `DateUtils` | `o.d.common.core.utils` | `getTime()`, `formatDateTime()` |
| 参数校验 | `ValidatorUtils` | `o.d.common.core.utils` | `validate()` |
| Redis缓存 | `RedisUtils` | `o.d.common.redis.utils` | `setCacheObject()`, `getCacheObject()` |
| Excel导出 | `ExcelUtil` | `o.d.common.excel.utils` | `exportExcel()` |
| JSON | `JsonUtils` | `o.d.common.json.utils` | `toJsonString()`, `parseObject()` |
| 登录用户 | `LoginHelper` | `o.d.common.satoken.utils` | `getUserId()`, `getUsername()` |
| 业务异常 | `ServiceException` | `o.d.common.core.exception` | `throw new ServiceException()` |
| Spring容器 | `SpringUtils` | `o.d.common.core.utils` | `getBean()` |

> **包路径说明**: `o.d` = `org.dromara`

---

## 1. 对象转换 - MapstructUtils（必须使用！）

> **强制规范**: 禁止使用 `BeanUtils.copyProperties()`，必须使用 `MapstructUtils.convert()`

```java
import org.dromara.common.core.utils.MapstructUtils;

// 单个对象转换
XxxVo vo = MapstructUtils.convert(entity, XxxVo.class);

// 集合转换
List<XxxVo> voList = MapstructUtils.convert(entityList, XxxVo.class);

// 转换到已有对象（合并属性）
XxxVo vo = MapstructUtils.convert(source, existingVo);
```

**配合 @AutoMapper 注解**:

```java
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)
public class XxxBo extends BaseEntity { }

@AutoMapper(target = Xxx.class)
public class XxxVo implements Serializable { }
```

---

## 2. 字符串操作 - StringUtils

```java
import org.dromara.common.core.utils.StringUtils;

// 格式化（占位符 {}）—— 项目特有
StringUtils.format("用户 {} 不存在", userId);

// 字符串分割/拼接 —— 项目特有
List<String> list = StringUtils.splitList("1,2,3");
List<Long> ids = StringUtils.splitTo("1,2,3", Convert::toLong);
String str = StringUtils.joinComma(list);

// 驼峰转换
StringUtils.toCamelCase("user_name");           // "userName"
StringUtils.toUnderScoreCase("userName");       // "user_name"

// Ant 风格路径匹配
StringUtils.isMatch("/api/**", "/api/user/list");
StringUtils.matches("/api/user", Arrays.asList("/api/**", "/admin/**"));

// 左补零
StringUtils.padl(5, 3);  // "005"
```

---

## 3. 集合与流操作 - StreamUtils

```java
import org.dromara.common.core.utils.StreamUtils;

// 过滤
List<User> active = StreamUtils.filter(users, u -> "1".equals(u.getStatus()));

// 查找
User user = StreamUtils.findFirstValue(users, u -> u.getId().equals(id));

// 提取属性
List<Long> ids = StreamUtils.toList(users, User::getId);
Set<Long> deptIds = StreamUtils.toSet(users, User::getDeptId);

// 转 Map
Map<Long, User> userMap = StreamUtils.toIdentityMap(users, User::getId);
Map<Long, String> nameMap = StreamUtils.toMap(users, User::getId, User::getName);

// 分组
Map<Long, List<User>> grouped = StreamUtils.groupByKey(users, User::getDeptId);

// 拼接字符串
String names = StreamUtils.join(users, User::getName);        // "张三,李四,王五"
String names = StreamUtils.join(users, User::getName, "|");   // 自定义分隔符

// 排序 / 合并 Map
List<User> sorted = StreamUtils.sorted(users, Comparator.comparing(User::getCreateTime));
Map<Long, String> merged = StreamUtils.merge(map1, map2, (v1, v2) -> v1 + v2);
```

---

## 4. 树结构构建 - TreeBuildUtils

```java
import org.dromara.common.core.utils.TreeBuildUtils;
import cn.hutool.core.lang.tree.Tree;

List<Tree<Long>> tree = TreeBuildUtils.build(list, (node, item) -> {
    node.setId(item.getId());
    node.setParentId(item.getParentId());
    node.setName(item.getName());
    node.setWeight(item.getOrderNum());
    node.putExtra("icon", item.getIcon());
});

// 指定根节点 ID
List<Tree<Long>> tree = TreeBuildUtils.build(list, 0L, (node, item) -> { ... });
```

---

## 5. 日期时间 - DateUtils

```java
import org.dromara.common.core.utils.DateUtils;
import org.dromara.common.core.enums.FormatsType;

// 获取当前时间
String date = DateUtils.getDate();   // "2026-01-24"
String time = DateUtils.getTime();   // "2026-01-24 15:30:00"

// 格式化 / 解析
DateUtils.formatDateTime(date);
DateUtils.parseDateToStr(FormatsType.YYYY_MM_DD_HH_MM, date);
Date date = DateUtils.parseDateTime(FormatsType.YYYY_MM_DD_HH_MM_SS, "2026-01-24 15:30:00");

// 时间差
long days = DateUtils.difference(start, end, TimeUnit.DAYS);
String diff = DateUtils.getDatePoor(endDate, startDate);  // "3天 2小时 30分钟"

// 日期范围校验
DateUtils.validateDateRange(startDate, endDate, 30, TimeUnit.DAYS);

// 友好时间（仿微信）
DateUtils.formatFriendlyTime(date);  // "刚刚" / "5分钟前" / "昨天 14:30"

// 类型转换
Date date = DateUtils.toDate(localDateTime);
```

**FormatsType 枚举**: `YYYY_MM_DD` | `YYYY_MM_DD_HH_MM_SS` | `YYYY_MM_DD_HH_MM` | `YYYYMMDD` | `YYYYMMDDHHMMSS` | `HH_MM_SS`

---

## 6. 参数校验 - ValidatorUtils

```java
import org.dromara.common.core.utils.ValidatorUtils;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;

// Service 层手动校验
ValidatorUtils.validate(bo, AddGroup.class);

// Controller 层（推荐）
@PostMapping
public R<Void> add(@Validated(AddGroup.class) @RequestBody XxxBo bo) { }

@PutMapping
public R<Void> edit(@Validated(EditGroup.class) @RequestBody XxxBo bo) { }
```

**BO 类校验注解**:

```java
public class XxxBo extends BaseEntity {
    @NotNull(message = "ID不能为空", groups = { EditGroup.class })
    private Long id;

    @NotBlank(message = "名称不能为空", groups = { AddGroup.class, EditGroup.class })
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;
}
```

---

## 7. Redis 缓存 - RedisUtils

> 详细 API 见 `references/redis-utils-api.md`

```java
import org.dromara.common.redis.utils.RedisUtils;

// 基本操作
RedisUtils.setCacheObject("key", value);
RedisUtils.setCacheObject("key", value, Duration.ofMinutes(30));
RedisUtils.getCacheObject("key");
RedisUtils.deleteObject("key");
RedisUtils.hasKey("key");

// 条件设置
RedisUtils.setObjectIfAbsent("key", value, Duration.ofMinutes(5));

// List / Set / Map 操作
RedisUtils.setCacheList("listKey", dataList);
RedisUtils.setCacheMap("mapKey", dataMap);
RedisUtils.setCacheMapValue("mapKey", "field", value);

// 原子操作
long val = RedisUtils.incrAtomicValue("counter");

// 发布订阅
RedisUtils.publish("channel", message);
RedisUtils.subscribe("channel", Message.class, msg -> { });

// 限流
long remaining = RedisUtils.rateLimiter("api:user:list", RateType.OVERALL, 100, 60);
```

---

## 8. 登录用户 - LoginHelper

```java
import org.dromara.common.satoken.utils.LoginHelper;

Long userId = LoginHelper.getUserId();
String username = LoginHelper.getUsername();
Long deptId = LoginHelper.getDeptId();
String tenantId = LoginHelper.getTenantId();
LoginUser loginUser = LoginHelper.getLoginUser();
boolean isLogin = LoginHelper.isLogin();
boolean isSuperAdmin = LoginHelper.isSuperAdmin();
boolean isTenantAdmin = LoginHelper.isTenantAdmin();
```

---

## 9. 业务异常 - ServiceException

```java
import org.dromara.common.core.exception.ServiceException;

throw new ServiceException("用户不存在");
throw new ServiceException("用户 {} 不存在", userId);
throw new ServiceException("用户不存在", 500);  // 带错误码
```

---

## 10. Excel 导出 - ExcelUtil

```java
import org.dromara.common.excel.utils.ExcelUtil;

// 导出
@PostMapping("/export")
public void export(XxxBo bo, HttpServletResponse response) {
    List<XxxVo> list = xxxService.queryList(bo);
    ExcelUtil.exportExcel(list, "数据导出", XxxVo.class, response);
}

// 导入
@PostMapping("/import")
public R<Void> importData(@RequestPart("file") MultipartFile file) throws Exception {
    List<XxxVo> list = ExcelUtil.importExcel(file.getInputStream(), XxxVo.class);
    return R.ok();
}
```

**VO 类 Excel 注解**:

```java
public class XxxVo implements Serializable {
    @ExcelProperty(value = "ID")
    private Long id;

    @ExcelProperty(value = "状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_normal_disable")
    private String status;
}
```

---

## 11. JSON 操作 - JsonUtils

```java
import org.dromara.common.json.utils.JsonUtils;

String json = JsonUtils.toJsonString(obj);
User user = JsonUtils.parseObject(json, User.class);
List<User> list = JsonUtils.parseArray(json, User.class);
Map<String, Object> map = JsonUtils.parseMap(json);
```

---

## 工具类选择速查

| 需求 | 推荐工具 | 说明 |
|------|---------|------|
| BO/Entity/VO 转换 | `MapstructUtils.convert()` | **必须使用** |
| 字符串判空 | `StringUtils.isBlank()` | 项目工具类 |
| 集合判空 | `CollUtil.isEmpty()` | Hutool |
| 对象判空 | `ObjectUtil.isNull()` | Hutool |
| 提取集合属性 | `StreamUtils.toList()` | 项目工具类 |
| 集合转 Map | `StreamUtils.toIdentityMap()` | 项目工具类 |
| 构建树 | `TreeBuildUtils.build()` | 项目工具类 |
| 日期格式化 | `DateUtils.formatDateTime()` | 项目工具类 |
| 抛业务异常 | `throw new ServiceException()` | 项目异常类 |
| 获取登录用户 | `LoginHelper.getUserId()` | 项目工具类 |
| Redis 缓存 | `RedisUtils.setCacheObject()` | 项目工具类 |
| Excel 导出 | `ExcelUtil.exportExcel()` | 项目工具类 |
| 生成 ID | `IdUtil.getSnowflakeNextId()` | Hutool |

---

## 禁止事项

```java
// ❌ 禁止使用 BeanUtils
BeanUtils.copyProperties(source, target);

// ❌ 禁止使用 Map 传递业务数据
public Map<String, Object> getXxx() { ... }

// ❌ 禁止手写 stream 转换（应使用 StreamUtils）
list.stream().map(User::getId).collect(Collectors.toList());  // 不推荐
StreamUtils.toList(list, User::getId);  // ✅ 推荐
```
