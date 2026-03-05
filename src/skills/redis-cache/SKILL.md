---
name: redis-cache
description: |
  当需要使用Redis缓存、分布式锁、限流等功能时自动使用此Skill。包含RedisUtils工具类、CacheUtils工具类、缓存注解使用规范、分布式锁实现、缓存key命名规范等。

  触发场景：
  - 使用Redis缓存数据
  - 配置Spring Cache缓存注解
  - 实现分布式锁
  - 实现接口限流
  - Redis发布订阅
  - 缓存key设计和命名
  - 缓存清理和刷新

  触发词：Redis、缓存、Cache、@Cacheable、@CacheEvict、@CachePut、RedisUtils、CacheUtils、分布式锁、RLock、限流、RateLimiter、发布订阅、缓存key、缓存过期

  核心警告：
  - @Cacheable返回值不能使用不可变集合（List.of()、Set.of()、Map.of()）
  - 分布式锁必须在finally中释放，且需注入RedissonClient（RedisUtils无getLock）
  - keys()和deleteKeys()会忽略租户隔离
---

# Redis 缓存开发指南

> 模块位置：`ruoyi-common/ruoyi-common-redis`

## 快速索引

| 功能 | 工具类/注解 | 说明 |
|------|-------------|------|
| 对象缓存 | `RedisUtils.setCacheObject()` | 基于 Redisson |
| 集合缓存 | `RedisUtils.setCacheList/Set/Map()` | List/Set/Map 操作 |
| Spring Cache | `CacheUtils.get/put/evict()` | Spring Cache 封装 |
| 缓存注解 | `@Cacheable/@CachePut/@CacheEvict` | 声明式缓存 |
| 分布式锁 | `redissonClient.getLock()` | 需注入 RedissonClient |
| 限流控制 | `RedisUtils.rateLimiter()` | 基于 Redisson |
| 原子操作 | `RedisUtils.incrAtomicValue()` | 原子递增/递减 |
| 发布订阅 | `RedisUtils.publish/subscribe()` | 消息通信 |

---

## 一、RedisUtils 工具类

```java
import org.dromara.common.redis.utils.RedisUtils;
```

### 1.1 基础缓存操作

```java
RedisUtils.setCacheObject("user:123", userObj);                              // 永不过期
RedisUtils.setCacheObject("user:123", userObj, Duration.ofMinutes(30));      // 带过期时间
RedisUtils.setCacheObject("user:123", userObj, true);                        // 保留原有TTL（Redis 6.0+）
boolean ok = RedisUtils.setObjectIfAbsent("user:123", userObj, Duration.ofMinutes(30));  // 不存在时设置
boolean ok = RedisUtils.setObjectIfExists("user:123", userObj, Duration.ofMinutes(30));  // 存在时设置

User user = RedisUtils.getCacheObject("user:123");          // 获取
long ttl = RedisUtils.getTimeToLive("user:123");            // TTL毫秒（-1永不过期，-2不存在）
boolean deleted = RedisUtils.deleteObject("user:123");      // 删除
RedisUtils.deleteObject(Arrays.asList("user:123", "user:456"));  // 批量删除
boolean exists = RedisUtils.isExistsObject("user:123");     // 是否存在
RedisUtils.expire("user:123", Duration.ofMinutes(30));      // 设置过期
```

### 1.2 集合操作

```java
// List
RedisUtils.setCacheList("myList", dataList);
RedisUtils.addCacheList("myList", "item3");
List<String> result = RedisUtils.getCacheList("myList");
List<String> range = RedisUtils.getCacheListRange("myList", 0, 10);

// Set
RedisUtils.setCacheSet("mySet", dataSet);
boolean added = RedisUtils.addCacheSet("mySet", "value3");
Set<String> result = RedisUtils.getCacheSet("mySet");

// Map
RedisUtils.setCacheMap("myMap", dataMap);
RedisUtils.setCacheMapValue("myMap", "key3", "value3");
String value = RedisUtils.getCacheMapValue("myMap", "key1");
Map<String, Object> result = RedisUtils.getCacheMap("myMap");
Set<String> keys = RedisUtils.getCacheMapKeySet("myMap");
RedisUtils.delCacheMapValue("myMap", "key1");
RedisUtils.delMultiCacheMapValue("myMap", new HashSet<>(Arrays.asList("key1", "key2")));
Map<String, Object> values = RedisUtils.getMultiCacheMapValue("myMap", keySet);
```

### 1.3 发布订阅

```java
RedisUtils.publish("notification:channel", messageObj);
RedisUtils.publish("notification:channel", messageObj, msg -> { log.info("已发布: {}", msg); });
RedisUtils.subscribe("notification:channel", MessageDTO.class, msg -> { /* 处理消息 */ });
```

### 1.4 限流控制

```java
import org.redisson.api.RateType;

// 每10秒最多100个请求
long remaining = RedisUtils.rateLimiter("api:limit:user:123", RateType.OVERALL, 100, 10);
if (remaining == -1) {
    throw new ServiceException("请求过于频繁");
}

// 带超时版本（5秒超时）
long remaining = RedisUtils.rateLimiter("api:limit:user:123", RateType.OVERALL, 100, 10, 5);
```

### 1.5 原子操作

```java
RedisUtils.setAtomicValue("counter:view", 0L);
long value = RedisUtils.getAtomicValue("counter:view");
long newVal = RedisUtils.incrAtomicValue("counter:view");
long newVal = RedisUtils.decrAtomicValue("counter:view");
```

### 1.6 Key 操作

```java
// ⚠️ keys() 和 deleteKeys() 会忽略租户隔离
Collection<String> keys = RedisUtils.keys("user:*");

KeysScanOptions options = KeysScanOptions.defaults().pattern("user:*").chunkSize(1000).limit(100);
Collection<String> keys = RedisUtils.keys(options);

RedisUtils.deleteKeys("temp:*");
Boolean exists = RedisUtils.hasKey("user:123");
```

### 1.7 监听机制

详见 [references/listeners.md](references/listeners.md)

---

## 二、CacheUtils 工具类

```java
import org.dromara.common.redis.utils.CacheUtils;

CacheUtils.put("userCache", "user:123", userObj);       // 保存
User user = CacheUtils.get("userCache", "user:123");     // 获取
CacheUtils.evict("userCache", "user:123");               // 删除
CacheUtils.clear("userCache");                           // 清空整组
```

---

## 三、CacheNames 缓存名称常量

> 位置：`ruoyi-common/ruoyi-common-core/.../constant/CacheNames.java`

### 命名格式

```
cacheNames#ttl#maxIdleTime#maxSize#local
- ttl: 过期时间（0=不过期，默认0）
- maxIdleTime: 最大空闲时间（0=不检测，默认0）
- maxSize: 最大条数（0=无限，默认0）
- local: 本地缓存（1开启，0关闭，默认1）
```

```java
"test#60s"                // 60秒过期
"test#0#60s"              // 不过期，60秒空闲清理
"test#0#1m#1000"          // 不过期，1分钟空闲，最大1000条
"test#1h#0#500#0"         // 1小时过期，最大500条，关闭本地缓存
```

### 已定义常量

```java
public interface CacheNames {
    String DEMO_CACHE = "demo:cache#60s#10m#20";
    String SYS_CONFIG = "sys_config";
    String SYS_DICT = "sys_dict";
    String SYS_DICT_TYPE = "sys_dict_type";
    String SYS_TENANT = GlobalConstants.GLOBAL_REDIS_KEY + "sys_tenant#30d";
    String SYS_CLIENT = GlobalConstants.GLOBAL_REDIS_KEY + "sys_client#30d";
    String SYS_USER_NAME = "sys_user_name#30d";
    String SYS_NICKNAME = "sys_nickname#30d";
    String SYS_DEPT = "sys_dept#30d";
    String SYS_OSS = "sys_oss#30d";
    String SYS_ROLE_CUSTOM = "sys_role_custom#30d";
    String SYS_DEPT_AND_CHILD = "sys_dept_and_child#30d";
    String SYS_OSS_CONFIG = GlobalConstants.GLOBAL_REDIS_KEY + "sys_oss_config";
    String ONLINE_TOKEN = "online_tokens";
}
```

---

## 四、缓存注解使用规范

### @Cacheable - 查询缓存

```java
@Cacheable(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
@Override
public List<SysDictDataVo> listDictDataByType(String dictType) {
    if (StringUtils.isBlank(dictType)) {
        return Collections.emptyList();
    }
    List<SysDictData> dictDataList = dictDataMapper.selectByType(dictType);
    if (CollUtil.isEmpty(dictDataList)) {
        return Collections.emptyList();  // 返回空列表防止缓存穿透
    }
    return MapstructUtils.convert(dictDataList, SysDictDataVo.class);
}
```

### @CachePut / @CacheEvict

```java
@CachePut(cacheNames = CacheNames.SYS_DICT, key = "#bo.dictType")
public List<SysDictDataVo> insertDictType(SysDictTypeBo bo) { ... }

@CacheEvict(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
public void deleteDictType(String dictType) { ... }

@CacheEvict(cacheNames = CacheNames.SYS_DICT, allEntries = true)
public void clearAllDictCache() { ... }
```

### 返回值禁止使用不可变集合

```java
// ❌ 禁止！@Cacheable 返回值序列化失败
return List.of(data1, data2);
return Set.of("admin", "user");
return Map.of("key1", "value1");

// ✅ 正确：使用可变集合
List<SysDictDataVo> result = new ArrayList<>();
result.add(data1);
return result;
```

---

## 五、分布式锁

> RedisUtils **不提供** `getLock()`，需直接注入 `RedissonClient`。

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final RedissonClient redissonClient;

    public void submitOrder(OrderBo orderBo) {
        String lockKey = "lock:submit:order:" + LoginHelper.getUserId();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            boolean locked = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (!locked) {
                throw new ServiceException("请勿重复提交订单");
            }
            try {
                orderMapper.insert(orderBo);
            } finally {
                lock.unlock();  // 必须在 finally 中释放
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceException("订单提交被中断");
        }
    }
}
```

---

## 六、缓存 Key 命名规范

```
格式：{业务模块}:{功能}:{具体标识}

示例：
user:info:123              user:roles:123            user:permissions:123
dict:data:sys_user_sex     order:info:20240101001    order:status:20240101001
lock:order:20240101001     lock:stock:123            lock:submit:order:456
limit:api:user:123         limit:sms:18888888888
```

---

## 七、租户隔离注意

```java
// ⚠️ keys() 和 deleteKeys() 会忽略租户隔离，需手动拼接
String tenantId = LoginHelper.getTenantId();
Collection<String> keys = RedisUtils.keys(tenantId + ":user:*");

// CacheUtils 会自动处理租户隔离
CacheUtils.clear(CacheNames.SYS_USER_NAME);
```

---

## 八、注意事项速查

1. **@Cacheable 返回值不能使用不可变集合**（List.of()、Set.of()、Map.of()）
2. **分布式锁必须在 finally 中释放**
3. **keys() 和 deleteKeys() 会忽略租户隔离**
4. **返回空列表而不是 null**，防止缓存穿透
5. **设置随机过期时间偏移**，避免缓存雪崩
6. **热点数据用分布式锁 + 双重检查**，防止缓存击穿

---

## 九、核心文件位置

| 文件 | 位置 |
|------|------|
| RedisUtils | `ruoyi-common/ruoyi-common-redis/.../utils/RedisUtils.java` |
| CacheUtils | `ruoyi-common/ruoyi-common-redis/.../utils/CacheUtils.java` |
| CacheNames | `ruoyi-common/ruoyi-common-core/.../constant/CacheNames.java` |
| GlobalConstants | `ruoyi-common/ruoyi-common-core/.../constant/GlobalConstants.java` |

---

## 多项目适配说明

- 如果需要 leniu-tengyun-core 项目的 Redis 开发规范，请使用 `leniu-redis-cache` skill
- leniu-tengyun-core 的 RedisUtil 工具类方法名与 RuoYi-Vue-Plus 的 RedisUtils 不同
