---
name: utils-toolkit
description: |
  后端工具类使用指南。包含 MapstructUtils、StringUtils、StreamUtils、TreeBuildUtils、DateUtils、RedisUtils 等核心工具类。

  触发场景：
  - 对象转换（BO/VO/Entity）
  - 字符串处理
  - 集合流操作
  - 树结构构建
  - 日期时间处理
  - Redis 缓存操作
  - Excel 导入导出
  - JSON 序列化

  触发词：工具类、MapstructUtils、StringUtils、StreamUtils、TreeBuildUtils、DateUtils、RedisUtils、ExcelUtil、JsonUtils、LoginHelper、CollUtil、ObjectUtil、IdUtil、convert、对象转换、集合操作、树结构、缓存

  注意：
  - 对象转换必须使用 MapstructUtils.convert()，禁止使用 BeanUtils。
  - 本项目是纯后端项目，无前端工具类。
---

# 后端工具类大全

> 本项目是纯后端项目，本文档专注于 Java 后端工具类。

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
| Hutool集合 | `CollUtil` | `cn.hutool.core.collection` | `isEmpty()`, `newArrayList()` |
| Hutool对象 | `ObjectUtil` | `cn.hutool.core.util` | `isNull()`, `isEmpty()` |
| ID生成 | `IdUtil` | `cn.hutool.core.util` | `getSnowflakeNextId()` |

> **包路径说明**: `o.d` = `org.dromara`

---

## 1. 对象转换 - MapstructUtils（必须使用！）

> ⚠️ **强制规范**: 禁止使用 `BeanUtils.copyProperties()`，必须使用 `MapstructUtils.convert()`

```java
import org.dromara.common.core.utils.MapstructUtils;

// ✅ 单个对象转换
XxxVo vo = MapstructUtils.convert(entity, XxxVo.class);
Xxx entity = MapstructUtils.convert(bo, Xxx.class);

// ✅ 集合转换
List<XxxVo> voList = MapstructUtils.convert(entityList, XxxVo.class);

// ✅ 转换到已有对象（合并属性）
XxxVo vo = MapstructUtils.convert(source, existingVo);

// ✅ Map 转 Bean
Xxx entity = MapstructUtils.convert(map, Xxx.class);

// ❌ 禁止使用 BeanUtils
// BeanUtils.copyProperties(source, target);  // 禁止！
```

**配合 @AutoMapper 注解**:

```java
// 在 BO 类上声明映射关系
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)
public class XxxBo extends BaseEntity {
    // ...
}

// 在 VO 类上声明映射关系
@AutoMapper(target = Xxx.class)
public class XxxVo implements Serializable {
    // ...
}
```

---

## 2. 字符串操作 - StringUtils

```java
import org.dromara.common.core.utils.StringUtils;

// 判空（推荐）
StringUtils.isBlank(str);      // null / "" / 空白 都返回 true
StringUtils.isNotBlank(str);
StringUtils.isEmpty(str);      // null / "" 返回 true
StringUtils.isNotEmpty(str);

// 格式化（占位符 {}）
StringUtils.format("用户 {} 不存在", userId);
// 输出: "用户 123 不存在"

// 字符串分割
List<String> list = StringUtils.splitList("1,2,3");           // ["1", "2", "3"]
List<String> list = StringUtils.splitList("1|2|3", "|");      // 自定义分隔符
List<Long> ids = StringUtils.splitTo("1,2,3", Convert::toLong); // 转换类型

// 字符串拼接
String str = StringUtils.joinComma(list);       // "1,2,3"
String str = StringUtils.joinComma(array);      // 数组版本

// 驼峰转换
StringUtils.toCamelCase("user_name");           // "userName"
StringUtils.toUnderScoreCase("userName");       // "user_name"
StringUtils.convertToCamelCase("user_name");    // "UserName" (首字母大写)

// 截取
StringUtils.substring(str, 0, 10);

// 路径匹配（Ant 风格）
StringUtils.isMatch("/api/**", "/api/user/list");  // true
StringUtils.matches("/api/user", Arrays.asList("/api/**", "/admin/**"));

// 左补零
StringUtils.padl(5, 3);     // "005"
StringUtils.padl("ab", 5, '0');  // "000ab"
```

---

## 3. 集合与流操作 - StreamUtils

```java
import org.dromara.common.core.utils.StreamUtils;

// 过滤
List<User> activeUsers = StreamUtils.filter(users, u -> "1".equals(u.getStatus()));

// 查找第一个
Optional<User> user = StreamUtils.findFirst(users, u -> u.getId().equals(id));
User user = StreamUtils.findFirstValue(users, u -> u.getId().equals(id));  // 返回 null 而非 Optional

// 提取属性为 List
List<Long> ids = StreamUtils.toList(users, User::getId);

// 提取属性为 Set
Set<Long> deptIds = StreamUtils.toSet(users, User::getDeptId);

// 转为 Map（value 是元素本身）
Map<Long, User> userMap = StreamUtils.toIdentityMap(users, User::getId);

// 转为 Map（自定义 key 和 value）
Map<Long, String> nameMap = StreamUtils.toMap(users, User::getId, User::getName);

// 分组
Map<Long, List<User>> deptUserMap = StreamUtils.groupByKey(users, User::getDeptId);

// 双层分组
Map<Long, Map<String, List<User>>> map = StreamUtils.groupBy2Key(
    users, User::getDeptId, User::getStatus
);

// 拼接字符串
String names = StreamUtils.join(users, User::getName);           // "张三,李四,王五"
String names = StreamUtils.join(users, User::getName, "|");      // "张三|李四|王五"

// 排序
List<User> sorted = StreamUtils.sorted(users, Comparator.comparing(User::getCreateTime));

// 合并两个 Map
Map<Long, String> merged = StreamUtils.merge(map1, map2, (v1, v2) -> v1 + v2);
```

---

## 4. 树结构构建 - TreeBuildUtils

```java
import org.dromara.common.core.utils.TreeBuildUtils;
import cn.hutool.core.lang.tree.Tree;

// 构建树（自动检测根节点）
List<Tree<Long>> tree = TreeBuildUtils.build(list, (node, item) -> {
    node.setId(item.getId());
    node.setParentId(item.getParentId());
    node.setName(item.getName());
    node.setWeight(item.getOrderNum());  // 排序
    // 扩展属性
    node.putExtra("icon", item.getIcon());
    node.putExtra("path", item.getPath());
});

// 指定根节点 ID
List<Tree<Long>> tree = TreeBuildUtils.build(list, 0L, (node, item) -> {
    // ...
});

// 多根节点树
List<Tree<Long>> tree = TreeBuildUtils.buildMultiRoot(
    list,
    Item::getId,
    Item::getParentId,
    (node, item) -> {
        node.setId(item.getId());
        node.setParentId(item.getParentId());
        node.setName(item.getName());
    }
);

// 获取叶子节点
List<Tree<Long>> leaves = TreeBuildUtils.getLeafNodes(tree);
```

---

## 5. 日期时间 - DateUtils

```java
import org.dromara.common.core.utils.DateUtils;
import org.dromara.common.core.enums.FormatsType;

// 获取当前时间
Date now = DateUtils.getNowDate();
String date = DateUtils.getDate();      // "2026-01-24"
String time = DateUtils.getTime();      // "2026-01-24 15:30:00"

// 格式化
DateUtils.formatDate(date);             // "2026-01-24"
DateUtils.formatDateTime(date);         // "2026-01-24 15:30:00"
DateUtils.parseDateToStr(FormatsType.YYYY_MM_DD_HH_MM, date);

// 解析
Date date = DateUtils.parseDate("2026-01-24");
Date date = DateUtils.parseDateTime(FormatsType.YYYY_MM_DD_HH_MM_SS, "2026-01-24 15:30:00");

// 时间差
long days = DateUtils.difference(start, end, TimeUnit.DAYS);
String diff = DateUtils.getDatePoor(endDate, startDate);  // "3天 2小时 30分钟"
String diff = DateUtils.getTimeDifference(endDate, startDate);  // 智能省略0值

// 日期范围校验
DateUtils.validateDateRange(startDate, endDate, 30, TimeUnit.DAYS);  // 最大30天

// 友好时间（仿微信）
DateUtils.formatFriendlyTime(date);  // "刚刚" / "5分钟前" / "昨天 14:30" / "周三 10:00"

// 时间段
DateUtils.getTodayHour(date);  // "凌晨" / "上午" / "中午" / "下午" / "晚上"

// 类型转换
Date date = DateUtils.toDate(localDateTime);
Date date = DateUtils.toDate(localDate);

// 路径格式
DateUtils.datePath();  // "2026/01/24"
```

**FormatsType 枚举**:

| 枚举值 | 格式 |
|-------|------|
| `YYYY_MM_DD` | yyyy-MM-dd |
| `YYYY_MM_DD_HH_MM_SS` | yyyy-MM-dd HH:mm:ss |
| `YYYY_MM_DD_HH_MM` | yyyy-MM-dd HH:mm |
| `YYYYMMDD` | yyyyMMdd |
| `YYYYMMDDHHMMSS` | yyyyMMddHHmmss |
| `HH_MM_SS` | HH:mm:ss |

---

## 6. 参数校验 - ValidatorUtils

```java
import org.dromara.common.core.utils.ValidatorUtils;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;

// 手动校验（在 Service 层使用）
ValidatorUtils.validate(bo, AddGroup.class);
ValidatorUtils.validate(bo, EditGroup.class);

// Controller 层使用 @Validated（推荐）
@PostMapping
public R<Void> add(@Validated(AddGroup.class) @RequestBody XxxBo bo) {
    // ...
}

@PutMapping
public R<Void> edit(@Validated(EditGroup.class) @RequestBody XxxBo bo) {
    // ...
}
```

**BO 类校验注解**:

```java
public class XxxBo extends BaseEntity {

    @NotNull(message = "ID不能为空", groups = { EditGroup.class })
    private Long id;

    @NotBlank(message = "名称不能为空", groups = { AddGroup.class, EditGroup.class })
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Min(value = 0, message = "数量不能小于0")
    @Max(value = 9999, message = "数量不能大于9999")
    private Integer count;
}
```

---

## 7. Redis 缓存 - RedisUtils

```java
import org.dromara.common.redis.utils.RedisUtils;
import java.time.Duration;

// 基本操作
RedisUtils.setCacheObject("key", value);                        // 永久
RedisUtils.setCacheObject("key", value, Duration.ofMinutes(30)); // 30分钟过期
RedisUtils.getCacheObject("key");
RedisUtils.deleteObject("key");
RedisUtils.hasKey("key");
RedisUtils.expire("key", 3600);  // 设置过期时间（秒）

// 条件设置
RedisUtils.setObjectIfAbsent("key", value, Duration.ofMinutes(5));  // 不存在才设置
RedisUtils.setObjectIfExists("key", value, Duration.ofMinutes(5));  // 存在才设置

// List 操作
RedisUtils.setCacheList("listKey", dataList);
RedisUtils.addCacheList("listKey", item);
List<T> list = RedisUtils.getCacheList("listKey");
List<T> range = RedisUtils.getCacheListRange("listKey", 0, 10);

// Set 操作
RedisUtils.setCacheSet("setKey", dataSet);
RedisUtils.addCacheSet("setKey", item);
Set<T> set = RedisUtils.getCacheSet("setKey");

// Map/Hash 操作
RedisUtils.setCacheMap("mapKey", dataMap);
RedisUtils.setCacheMapValue("mapKey", "field", value);
T value = RedisUtils.getCacheMapValue("mapKey", "field");
Map<String, T> map = RedisUtils.getCacheMap("mapKey");
RedisUtils.delCacheMapValue("mapKey", "field");

// 原子操作
RedisUtils.setAtomicValue("counter", 0);
long val = RedisUtils.incrAtomicValue("counter");  // +1
long val = RedisUtils.decrAtomicValue("counter");  // -1
long val = RedisUtils.getAtomicValue("counter");

// 批量操作
Collection<String> keys = RedisUtils.keys("user:*");
RedisUtils.deleteKeys("temp:*");

// 发布订阅
RedisUtils.publish("channel", message);
RedisUtils.subscribe("channel", Message.class, msg -> {
    // 处理消息
});

// 限流
long remaining = RedisUtils.rateLimiter("api:user:list", RateType.OVERALL, 100, 60);
// 每60秒最多100次，返回剩余次数，-1表示被限流
```

---

## 8. 登录用户 - LoginHelper

```java
import org.dromara.common.satoken.utils.LoginHelper;

// 获取当前登录用户信息
Long userId = LoginHelper.getUserId();
String username = LoginHelper.getUsername();
Long deptId = LoginHelper.getDeptId();
String tenantId = LoginHelper.getTenantId();
LoginUser loginUser = LoginHelper.getLoginUser();

// 判断登录状态
boolean isLogin = LoginHelper.isLogin();

// 判断是否超级管理员
boolean isSuperAdmin = LoginHelper.isSuperAdmin();
boolean isSuperAdmin = LoginHelper.isSuperAdmin(userId);

// 判断是否租户管理员
boolean isTenantAdmin = LoginHelper.isTenantAdmin();
boolean isTenantAdmin = LoginHelper.isTenantAdmin(rolePermission);
```

---

## 9. 业务异常 - ServiceException

```java
import org.dromara.common.core.exception.ServiceException;

// 抛出业务异常
throw new ServiceException("用户不存在");
throw new ServiceException("用户 {} 不存在", userId);

// 条件判断
if (user == null) {
    throw new ServiceException("用户不存在");
}

// 带错误码
throw new ServiceException("用户不存在", 500);
```

---

## 10. Excel 导出 - ExcelUtil

```java
import org.dromara.common.excel.utils.ExcelUtil;

// Controller 中导出
@PostMapping("/export")
public void export(XxxBo bo, HttpServletResponse response) {
    List<XxxVo> list = xxxService.queryList(bo);
    ExcelUtil.exportExcel(list, "数据导出", XxxVo.class, response);
}

// 导入
@PostMapping("/import")
public R<Void> importData(@RequestPart("file") MultipartFile file) throws Exception {
    List<XxxVo> list = ExcelUtil.importExcel(file.getInputStream(), XxxVo.class);
    // 处理导入数据
    return R.ok();
}
```

**VO 类 Excel 注解**:

```java
public class XxxVo implements Serializable {

    @ExcelProperty(value = "ID")
    private Long id;

    @ExcelProperty(value = "名称")
    private String name;

    @ExcelProperty(value = "状态", converter = ExcelDictConvert.class)
    @ExcelDictFormat(dictType = "sys_normal_disable")
    private String status;

    @ExcelProperty(value = "创建时间")
    private Date createTime;
}
```

---

## 11. JSON 操作 - JsonUtils

```java
import org.dromara.common.json.utils.JsonUtils;

// 对象转 JSON
String json = JsonUtils.toJsonString(obj);

// JSON 转对象
User user = JsonUtils.parseObject(json, User.class);

// JSON 转 List
List<User> list = JsonUtils.parseArray(json, User.class);

// JSON 转 Map
Map<String, Object> map = JsonUtils.parseMap(json);
```

---

## 12. Hutool 常用工具

```java
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.crypto.SecureUtil;

// 集合判空
CollUtil.isEmpty(list);
CollUtil.isNotEmpty(list);
CollUtil.newArrayList(1, 2, 3);
CollUtil.newHashSet("a", "b");

// 对象判空
ObjectUtil.isNull(obj);
ObjectUtil.isNotNull(obj);
ObjectUtil.isEmpty(obj);      // null / 空字符串 / 空集合
ObjectUtil.defaultIfNull(obj, defaultValue);

// ID 生成
long snowflakeId = IdUtil.getSnowflakeNextId();  // 雪花ID（推荐）
String uuid = IdUtil.simpleUUID();    // 无横线 UUID
String uuid = IdUtil.randomUUID();    // 标准 UUID
String nanoId = IdUtil.nanoId();      // NanoID

// 加密
String md5 = SecureUtil.md5("password");
String sha256 = SecureUtil.sha256("password");

// Base64
import cn.hutool.core.codec.Base64;
String encoded = Base64.encode("data");
String decoded = Base64.decodeStr(encoded);
```

---

## 常用正则表达式

```java
// 手机号
String phoneReg = "^1[3-9]\\d{9}$";

// 邮箱
String emailReg = "^[\\w-]+(\\.[\\w-]+)*@[\\w-]+(\\.[\\w-]+)+$";

// 身份证
String idCardReg = "^[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$";

// URL
String urlReg = "^https?://.+";

// 中文
String chineseReg = "^[\\u4e00-\\u9fa5]+$";
```

---

## 工具类选择速查

| 需求 | 推荐工具 | 说明 |
|------|---------|------|
| BO ↔ Entity ↔ VO 转换 | `MapstructUtils.convert()` | **必须使用** |
| 字符串判空 | `StringUtils.isBlank()` | 推荐项目工具类 |
| 集合判空 | `CollUtil.isEmpty()` | Hutool |
| 对象判空 | `ObjectUtil.isNull()` | Hutool |
| 提取集合属性 | `StreamUtils.toList()` | 项目工具类 |
| 集合转 Map | `StreamUtils.toIdentityMap()` | 项目工具类 |
| 分组 | `StreamUtils.groupByKey()` | 项目工具类 |
| 构建树 | `TreeBuildUtils.build()` | 项目工具类 |
| 日期格式化 | `DateUtils.formatDateTime()` | 项目工具类 |
| 抛业务异常 | `throw new ServiceException()` | 项目异常类 |
| 获取登录用户 | `LoginHelper.getUserId()` | 项目工具类 |
| Redis 缓存 | `RedisUtils.setCacheObject()` | 项目工具类 |
| Excel 导出 | `ExcelUtil.exportExcel()` | 项目工具类 |
| 生成 ID | `IdUtil.getSnowflakeNextId()` | Hutool |
| MD5/SHA | `SecureUtil.md5()` | Hutool |

---

## 禁止事项

```java
// ❌ 禁止使用 BeanUtils
BeanUtils.copyProperties(source, target);  // 禁止！

// ❌ 禁止使用 Map 传递业务数据
public Map<String, Object> getXxx() { ... }  // 禁止！

// ❌ 禁止手写 stream 转换（应使用 StreamUtils）
list.stream().map(User::getId).collect(Collectors.toList());  // 不推荐
StreamUtils.toList(list, User::getId);  // ✅ 推荐

// ❌ 禁止使用完整类型引用
public org.dromara.common.core.domain.R<XxxVo> getXxx()  // 禁止！
// ✅ 正确：先 import，再使用短类名
import org.dromara.common.core.domain.R;
public R<XxxVo> getXxx()
```

---

## 工具类选择速查

| 需求 | 推荐工具 | 说明 |
|------|---------|------|
| BO ↔ Entity ↔ VO 转换 | `MapstructUtils.convert()` | **必须使用** |
| 字符串判空 | `StringUtils.isBlank()` | 推荐项目工具类 |
| 集合判空 | `CollUtil.isEmpty()` | Hutool |
| 对象判空 | `ObjectUtil.isNull()` | Hutool |
| 提取集合属性 | `StreamUtils.toList()` | 项目工具类 |
| 集合转 Map | `StreamUtils.toIdentityMap()` | 项目工具类 |
| 分组 | `StreamUtils.groupByKey()` | 项目工具类 |
| 构建树 | `TreeBuildUtils.build()` | 项目工具类 |
| 日期格式化 | `DateUtils.formatDateTime()` | 项目工具类 |
| 抛业务异常 | `throw new ServiceException()` | 项目异常类 |
| 获取登录用户 | `LoginHelper.getUserId()` | 项目工具类 |
| Redis 缓存 | `RedisUtils.setCacheObject()` | 项目工具类 |
| Excel 导出 | `ExcelUtil.exportExcel()` | 项目工具类 |
| 生成 ID | `IdUtil.getSnowflakeNextId()` | Hutool |
| MD5/SHA | `SecureUtil.md5()` | Hutool |
