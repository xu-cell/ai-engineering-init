---
name: leniu-utils-toolkit
description: |
  leniu-yunshitang-core 项目工具类使用指南。包含 BeanUtil、CollUtil、ObjectUtil、StrUtil、RedisUtil、JacksonUtil、LeBeanUtil 等核心工具类。

  触发场景：
  - 对象转换（DTO/VO/Entity）
  - 字符串处理
  - 集合操作
  - 日期时间处理
  - Redis 缓存操作
  - JSON 序列化
  - 模糊查询处理

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-工具类、leniu-BeanUtil、leniu-StrUtil、leniu-CollUtil、leniu-ObjectUtil、leniu-RedisUtil、leniu-JacksonUtil、leniu-LeBeanUtil、net.xnzn、leniu-yunshitang、leniu-yunshitang-core、云食堂工具类

---

# leniu-yunshitang-core 工具类大全

> 本文档专注于 leniu-tengyun-core 项目的 Java 后端工具类。

## 快速索引

| 功能 | 工具类 | 包路径 | 常用方法 |
|------|--------|--------|---------|
| **对象转换** | `BeanUtil` | `cn.hutool.core.bean` | `copyProperties()`, `copyToList()` |
| 字符串 | `StrUtil` | `cn.hutool.core.util` | `isBlank()`, `format()` |
| 集合 | `CollUtil` | `cn.hutool.core.collection` | `isEmpty()`, `newArrayList()` |
| 对象 | `ObjectUtil` | `cn.hutool.core.util` | `isNull()`, `isEmpty()` |
| Redis缓存 | `RedisUtil` | `net.xnzn.core.base.redis` | `setString()`, `getString()` |
| JSON | `JacksonUtil` | `net.xnzn.core.common.utils` | `writeValueAsString()`, `readValue()` |
| 模糊查询 | `LeBeanUtil` | `net.xnzn.core.common.utils` | `fieldLikeHandle()` |
| 租户上下文 | `TenantContextHolder` | `net.xnzn.framework.data.tenant` | `getTenantId()` |

---

## 1. 对象转换 - BeanUtil（Hutool）

> ⚠️ **强制规范**: leniu 项目使用 Hutool 的 `BeanUtil`，不是 MapstructUtils

```java
import cn.hutool.core.bean.BeanUtil;

// ✅ 单个对象转换
XxxVO vo = BeanUtil.copyProperties(entity, XxxVO.class);
XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);

// ✅ 集合转换
List<XxxVO> voList = BeanUtil.copyToList(entityList, XxxVO.class);
List<XxxEntity> entityList = BeanUtil.copyToList(dtoList, XxxEntity.class);
```

---

## 2. 字符串操作 - StrUtil（Hutool）

```java
import cn.hutool.core.util.StrUtil;

// 判空
StrUtil.isBlank(str);      // null / "" / 空白 都返回 true
StrUtil.isNotBlank(str);
StrUtil.isEmpty(str);      // null / "" 返回 true
StrUtil.isNotEmpty(str);

// 字符串拼接
String str = StrUtil.join(",", list);       // "1,2,3"

// 常量
StrUtil.COMMA  // ","
StrUtil.DOT    // "."
StrUtil.SLASH  // "/"

// 截取
String str = StrUtil.sub(s, 0, 10);

// 去除前后缀
StrUtil.removePrefix(str, "prefix_");
StrUtil.removeSuffix(str, "_suffix");

// 判断前后缀
StrUtil.startWith(str, "prefix_");
StrUtil.endWith(str, "_suffix");

// 大小写转换
StrUtil.upperCase(str);
StrUtil.lowerCase(str);
```

---

## 3. 集合操作 - CollUtil（Hutool）

```java
import cn.hutool.core.collection.CollUtil;

// 判空
CollUtil.isEmpty(list);
CollUtil.isNotEmpty(list);

// 创建集合
CollUtil.newArrayList(1, 2, 3);
CollUtil.newHashSet("a", "b");

// 集合转数组
String[] array = CollUtil.toArray(list, String.class);

// 集合转字符串
String str = CollUtil.join(list, ",");

// 分割
List<String> list = CollUtil.split("1,2,3", ",");
```

---

## 4. 对象操作 - ObjectUtil（Hutool）

```java
import cn.hutool.core.util.ObjectUtil;

// 判空
ObjectUtil.isNull(obj);
ObjectUtil.isNotNull(obj);
ObjectUtil.isEmpty(obj);      // null / 空字符串 / 空集合
ObjectUtil.isNotEmpty(obj);

// 默认值
ObjectUtil.defaultIfNull(obj, defaultValue);

// 相等比较
ObjectUtil.equal(a, b);

// 克隆
ObjectUtil.clone(obj);
```

---

## 5. Redis 缓存 - RedisUtil

```java
import net.xnzn.core.base.redis.RedisUtil;
import org.redisson.api.RLock;

// ========== String 操作 ==========
RedisUtil.setString(key, value);                    // 存字符串
RedisUtil.setString(key, value, timeout);           // 存字符串（秒）
RedisUtil.getString(key);                           // 取字符串

// ========== Object 操作 ==========
RedisUtil.setObj(key, obj);                         // 存对象
RedisUtil.setObj(key, obj, timeout);                // 存对象（秒）
RedisUtil.getObj(key);                              // 取对象
RedisUtil.getObjOrNull(key);                        // 取对象（异常返回null）

// ========== 删除操作 ==========
RedisUtil.delete(key);                              // 删除单个key
RedisUtil.delete(keys);                             // 批量删除
RedisUtil.deleteByPattern("cache:user:*");          // 模式匹配删除
RedisUtil.deleteKeysInPipeline(keys);               // 管道批量删除

// ========== 分布式锁 ==========
RLock lock = RedisUtil.getLock(key);                // 获取普通锁
RLock lock = RedisUtil.getFairLock(key);            // 获取公平锁
RedisUtil.safeUnLock(lock);                         // 安全解锁
RedisUtil.isLock(key);                              // 检查是否锁定

// ========== 其他操作 ==========
RedisUtil.setNx(key, value, expireTime);            // SETNX
RedisUtil.hasKey(key);                              // 判断key存在
RedisUtil.incr(key, liveTime);                      // 自增
RedisUtil.decr(key, liveTime);                      // 自减
```

---

## 6. JSON 操作 - JacksonUtil

```java
import net.xnzn.core.common.utils.JacksonUtil;

// 序列化
String json = JacksonUtil.writeValueAsString(obj);                // 对象->JSON字符串
String json = JacksonUtil.writeValueAsStringIgnoreNull(obj);      // 忽略null字段

// 反序列化
User user = JacksonUtil.readValue(json, User.class);           // JSON->对象
List<User> list = JacksonUtil.readList(json, User.class);     // JSON->List
Map<String, Object> map = JacksonUtil.readValue(json, Map.class);

// JsonNode 操作
JsonNode node = JacksonUtil.readTree(json);                        // JSON->JsonNode
User user = JacksonUtil.treeToValue(node, User.class);            // JsonNode->对象
String value = JacksonUtil.getByPath(node, "data.user.name");     // 路径获取
String str = JacksonUtil.getString(node, "key");                   // 取String
Integer num = JacksonUtil.getInt(node, "key");                     // 取Integer

// 节点创建
ObjectNode objectNode = JacksonUtil.objectNode();                     // 创建ObjectNode
ArrayNode arrayNode = JacksonUtil.arrayNode();                        // 创建ArrayNode
```

---

## 7. 模糊查询处理 - LeBeanUtil

```java
import net.xnzn.core.common.utils.LeBeanUtil;

// 字段模糊查询处理（自动添加 %前后缀）
param.setName(LeBeanUtil.fieldLikeHandle(param.getName()));
// 效果: "张" -> "%张%"

// 常用于 Service 层查询条件处理
param.setCanteenName(LeBeanUtil.fieldLikeHandle(param.getCanteenName()));
param.setStallName(LeBeanUtil.fieldLikeHandle(param.getStallName()));
param.setDishName(LeBeanUtil.fieldLikeHandle(param.getDishName()));
```

---

## 8. 租户上下文 - TenantContextHolder

```java
import net.xnzn.framework.data.tenant.TenantContextHolder;

// 获取当前租户ID
Long tenantId = TenantContextHolder.getTenantId();

// 常用于 Redis key 构建
String key = "cache:" + TenantContextHolder.getTenantId() + ":data";
```

---

## 9. 日期时间工具

```java
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

// 当前时间
LocalDateTime now = LocalDateTime.now();

// 格式化
String format = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

// 解析
LocalDateTime time = LocalDateTime.parse(str, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
```

---

## 10. 常用正则表达式

```java
// 手机号
String phoneReg = "^1[3-9]\\d{9}$";

// 邮箱
String emailReg = "^[\\w-]+(\\.[\\w-]+)*@[\\w-]+(\\.[\\w-]+)+$";

// 身份证
String idCardReg = "^[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$";
```

---

## 工具类选择速查

| 需求 | 推荐工具 | 说明 |
|------|---------|------|
| 对象转换 | `BeanUtil.copyProperties()` | **leniu 必用** |
| 集合判空 | `CollUtil.isEmpty()` | Hutool |
| 对象判空 | `ObjectUtil.isNull()` | Hutool |
| 字符串判空 | `StrUtil.isBlank()` | Hutool |
| JSON序列化 | `JacksonUtil.writeValueAsString()` | leniu |
| Redis缓存 | `RedisUtil.setString()` | leniu |
| 模糊查询 | `LeBeanUtil.fieldLikeHandle()` | leniu |
| 租户ID | `TenantContextHolder.getTenantId()` | leniu |
| 字符串拼接 | `StrUtil.join()` | Hutool |
| 日期格式化 | `DateTimeFormatter` | JDK 8 |
| ID 生成 | `IdUtil.getSnowflakeNextId()` | Hutool |

---

## 禁止事项

```java
// ❌ 禁止使用 MapstructUtils（leniu 使用 BeanUtil）
// MapstructUtils.convert(source, Target.class);  // 禁止！

// ❌ 禁止使用 Map 传递业务数据
public Map<String, Object> getXxx() { ... }  // 禁止！

// ❌ 禁止手写 stream 转换（应使用 BeanUtil.copyToList）
list.stream().map(item -> BeanUtil.copyProperties(item, XxxVO.class)).collect(Collectors.toList());
// ✅ 推荐
BeanUtil.copyToList(list, XxxVO.class);

// ❌ 禁止使用完整类型引用
public net.xnzn.core.common.util.LeResponse<XxxVo> getXxx()  // 禁止！
// ✅ 正确：先 import，再使用短类名
import net.xnzn.core.common.util.LeResponse;
public LeResponse<XxxVo> getXxx()
```

---

## 常见错误对比

### ❌ 错误写法

```java
// 错误 1: 使用 RuoYi 的 MapstructUtils
MapstructUtils.convert(source, Target.class);  // ❌ leniu 用 BeanUtil

// 错误 2: 使用 RuoYi 的 StringUtils
StringUtils.isBlank(str);  // ❌ leniu 用 StrUtil

// 错误 3: 使用 RuoYi 的 RedisUtils
RedisUtils.setCacheObject(key, value);  // ❌ leniu 用 RedisUtil

// 错误 4: 使用 RuoYi 的 JsonUtils
JsonUtils.toJsonString(obj);  // ❌ leniu 用 JacksonUtil

// 错误 5: 使用 RuoYi 的 TenantHelper
TenantHelper.getTenantId();  // ❌ leniu 用 TenantContextHolder
```

### ✅ 正确写法

```java
// 正确 1: 使用 leniu 的 BeanUtil
BeanUtil.copyProperties(source, Target.class);  // ✅

// 正确 2: 使用 Hutool 的 StrUtil
StrUtil.isBlank(str);  // ✅

// 正确 3: 使用 leniu 的 RedisUtil
RedisUtil.setString(key, value);  // ✅

// 正确 4: 使用 leniu 的 JacksonUtil
JacksonUtil.writeValueAsString(obj);  // ✅

// 正确 5: 使用 leniu 的 TenantContextHolder
TenantContextHolder.getTenantId();  // ✅
```

---

## 工具类选择决策

| 场景 | RuoYi-Vue-Plus | leniu-tengyun-core |
|------|----------------|-------------------|
| 对象转换 | `MapstructUtils.convert()` | `BeanUtil.copyProperties()` |
| 集合判空 | `CollUtil.isEmpty()` | `CollUtil.isEmpty()` |
| 对象判空 | `ObjectUtil.isNull()` | `ObjectUtil.isNull()` |
| 字符串判空 | `StringUtils.isBlank()` | `StrUtil.isBlank()` |
| JSON序列化 | `JsonUtils.toJsonString()` | `JacksonUtil.writeValueAsString()` |
| Redis缓存 | `RedisUtils.setCacheObject()` | `RedisUtil.setString()` |
| 模糊查询 | `"%" + keyword + "%"` | `LeBeanUtil.fieldLikeHandle()` |
| 租户ID | `LoginHelper.getTenantId()` | `TenantContextHolder.getTenantId()` |

---

## 相关技能

| 需要了解 | 激活 Skill |
|---------|-----------|
| Entity/VO/DTO 设计 | `leniu-java-entity` |
| MyBatis 使用 | `leniu-java-mybatis` |
| 异常处理 | `leniu-error-handler` |
| 数据库设计 | `leniu-database-ops` |
