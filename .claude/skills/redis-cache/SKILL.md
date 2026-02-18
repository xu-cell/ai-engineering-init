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
  - 缓存穿透/雪崩/击穿问题
  - 缓存key设计和命名
  - 缓存过期时间设置
  - 缓存清理和刷新

  触发词：Redis、缓存、Cache、@Cacheable、@CacheEvict、@CachePut、RedisUtils、CacheUtils、分布式锁、RLock、限流、RateLimiter、发布订阅、缓存穿透、缓存雪崩、缓存击穿、缓存key、缓存过期、缓存清理

  核心警告：
  - @Cacheable返回值不能使用不可变集合（List.of()、Set.of()、Map.of()）
  - 分布式锁必须在finally中释放
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
| 分布式锁 | Redisson 原生 | 需自行注入 RedissonClient |
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
// 永不过期
RedisUtils.setCacheObject("user:123", userObj);

// 设置过期时间
RedisUtils.setCacheObject("user:123", userObj, Duration.ofMinutes(30));

// 保留原有TTL（需要Redis 6.0+）
RedisUtils.setCacheObject("user:123", userObj, true);

// 仅当key不存在时设置
boolean success = RedisUtils.setObjectIfAbsent("user:123", userObj, Duration.ofMinutes(30));

// 仅当key存在时设置
boolean success = RedisUtils.setObjectIfExists("user:123", userObj, Duration.ofMinutes(30));

// 获取缓存
User user = RedisUtils.getCacheObject("user:123");

// 获取剩余存活时间（毫秒）
long ttl = RedisUtils.getTimeToLive("user:123");
// 返回值：-1表示永不过期，-2表示key不存在

// 删除单个缓存
boolean deleted = RedisUtils.deleteObject("user:123");

// 批量删除
RedisUtils.deleteObject(Arrays.asList("user:123", "user:456"));

// 检查缓存是否存在
boolean exists = RedisUtils.isExistsObject("user:123");

// 设置过期时间
RedisUtils.expire("user:123", Duration.ofMinutes(30));
```

### 1.2 集合操作

#### List 操作

```java
// 缓存List数据
List<String> dataList = new ArrayList<>();
dataList.add("item1");
dataList.add("item2");
RedisUtils.setCacheList("myList", dataList);

// 向List追加单个数据
RedisUtils.addCacheList("myList", "item3");

// 获取完整List
List<String> result = RedisUtils.getCacheList("myList");

// 获取指定范围数据
List<String> range = RedisUtils.getCacheListRange("myList", 0, 10);
```

#### Set 操作

```java
// 缓存Set数据
Set<String> dataSet = new HashSet<>();
dataSet.add("value1");
dataSet.add("value2");
RedisUtils.setCacheSet("mySet", dataSet);

// 向Set追加单个数据
boolean added = RedisUtils.addCacheSet("mySet", "value3");

// 获取Set数据
Set<String> result = RedisUtils.getCacheSet("mySet");
```

#### Map 操作

```java
// 缓存Map数据
Map<String, Object> dataMap = new HashMap<>();
dataMap.put("key1", "value1");
dataMap.put("key2", "value2");
RedisUtils.setCacheMap("myMap", dataMap);

// 设置Map中的单个值
RedisUtils.setCacheMapValue("myMap", "key3", "value3");

// 获取Map中的单个值
String value = RedisUtils.getCacheMapValue("myMap", "key1");

// 获取完整Map
Map<String, Object> result = RedisUtils.getCacheMap("myMap");

// 获取Map的所有key
Set<String> keys = RedisUtils.getCacheMapKeySet("myMap");

// 删除Map中的单个值
Object deleted = RedisUtils.delCacheMapValue("myMap", "key1");

// 批量删除Map中的多个值
RedisUtils.delMultiCacheMapValue("myMap", new HashSet<>(Arrays.asList("key1", "key2")));

// 获取Map中的多个值
Map<String, Object> values = RedisUtils.getMultiCacheMapValue("myMap",
    new HashSet<>(Arrays.asList("key1", "key2")));
```

### 1.3 发布订阅

```java
// 发布消息到指定频道
RedisUtils.publish("notification:channel", messageObj);

// 发布消息并自定义处理
RedisUtils.publish("notification:channel", messageObj, msg -> {
    log.info("消息已发布: {}", msg);
});

// 订阅频道接收消息
RedisUtils.subscribe("notification:channel", MessageDTO.class, msg -> {
    log.info("收到消息: {}", msg);
    // 处理消息逻辑
});
```

### 1.4 限流控制

```java
import org.redisson.api.RateType;

// 限流控制（默认无超时）
// 允许每10秒内最多100个请求
long remaining = RedisUtils.rateLimiter("api:limit:user:123",
    RateType.OVERALL, 100, 10);
if (remaining == -1) {
    throw new ServiceException("请求过于频繁，请稍后再试");
}

// 限流控制（带超时）
// 允许每10秒内最多100个请求，超时时间5秒
long remaining = RedisUtils.rateLimiter("api:limit:user:123",
    RateType.OVERALL, 100, 10, 5);
```

### 1.5 原子操作

```java
// 设置原子长整型值
RedisUtils.setAtomicValue("counter:view", 0L);

// 获取原子长整型值
long value = RedisUtils.getAtomicValue("counter:view");

// 原子递增
long newValue = RedisUtils.incrAtomicValue("counter:view");

// 原子递减
long newValue = RedisUtils.decrAtomicValue("counter:view");
```

### 1.6 Key 操作

```java
// 获取匹配模式的所有key（注意：会忽略租户隔离）
Collection<String> keys = RedisUtils.keys("user:*");

// 通过扫描参数获取key列表
KeysScanOptions options = KeysScanOptions.defaults()
    .pattern("user:*")
    .chunkSize(1000)
    .limit(100);
Collection<String> keys = RedisUtils.keys(options);

// 按模式批量删除key（注意：会忽略租户隔离）
RedisUtils.deleteKeys("temp:*");

// 检查key是否存在
Boolean exists = RedisUtils.hasKey("user:123");
```

### 1.7 分布式锁（需自行注入 RedissonClient）

> ⚠️ **注意**：`RedisUtils` 不提供 `getLock()` 方法，需要直接注入 `RedissonClient` 使用。

```java
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final RedissonClient redissonClient;  // 直接注入

    public void processOrder(Long orderId) {
        // 获取锁对象
        RLock lock = redissonClient.getLock("lock:order:" + orderId);

        try {
            // 尝试加锁，最多等待10秒，锁定30秒后自动释放
            boolean locked = lock.tryLock(10, 30, TimeUnit.SECONDS);
            if (locked) {
                try {
                    // 执行业务逻辑
                    doProcess(orderId);
                } finally {
                    // 释放锁（必须在finally中！）
                    lock.unlock();
                }
            } else {
                throw new ServiceException("获取锁失败，请稍后重试");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceException("获取锁被中断");
        }
    }
}
```

### 1.8 监听机制

```java
import org.redisson.api.listener.ExpiredObjectListener;
import org.redisson.api.listener.DeletedObjectListener;

// 注册过期监听器（需要开启Redis的notify-keyspace-events配置）
RedisUtils.addObjectListener("user:123", (ExpiredObjectListener) name -> {
    log.info("缓存已过期: {}", name);
});

// 注册删除监听器
RedisUtils.addObjectListener("user:123", (DeletedObjectListener) name -> {
    log.info("缓存已删除: {}", name);
});

// 注册List/Set/Map监听器（同样使用具体子接口）
RedisUtils.addListListener("myList", (ExpiredObjectListener) name -> { ... });
RedisUtils.addSetListener("mySet", (DeletedObjectListener) name -> { ... });
RedisUtils.addMapListener("myMap", (ExpiredObjectListener) name -> { ... });
```

---

## 二、CacheUtils 工具类

CacheUtils 提供了统一的 Spring Cache 操作接口。

```java
import org.dromara.common.redis.utils.CacheUtils;
```

### 2.1 基本操作

```java
// 保存缓存值
CacheUtils.put("userCache", "user:123", userObj);

// 获取缓存值
User user = CacheUtils.get("userCache", "user:123");

// 删除指定缓存项
CacheUtils.evict("userCache", "user:123");

// 清空指定缓存组的所有数据
CacheUtils.clear("userCache");
```

### 2.2 使用场景

```java
@Service
public class UserServiceImpl implements IUserService {

    public User getUserById(Long userId) {
        // 先从缓存获取
        User user = CacheUtils.get(CacheNames.SYS_USER_NAME, userId);
        if (user != null) {
            return user;
        }

        // 缓存未命中，从数据库查询
        user = userMapper.selectById(userId);

        // 存入缓存
        if (user != null) {
            CacheUtils.put(CacheNames.SYS_USER_NAME, userId, user);
        }

        return user;
    }

    public void updateUser(User user) {
        // 更新数据库
        userMapper.updateById(user);

        // 清除缓存
        CacheUtils.evict(CacheNames.SYS_USER_NAME, user.getUserId());
    }
}
```

---

## 三、CacheNames 缓存名称常量

> 位置：`ruoyi-common/ruoyi-common-core/src/main/java/org/dromara/common/core/constant/CacheNames.java`

### 3.1 命名格式

```
cacheNames#ttl#maxIdleTime#maxSize#local

- ttl: 过期时间（0表示不过期，默认0）
- maxIdleTime: 最大空闲时间（LRU清理，0表示不检测，默认0）
- maxSize: 最大长度（LRU清理，0表示无限，默认0）
- local: 本地缓存（1开启，0关闭，默认1）
```

### 3.2 格式示例

```java
// 60秒过期
"test#60s"

// 不过期，60秒空闲清理
"test#0#60s"

// 不过期，1分钟空闲清理，最大1000条
"test#0#1m#1000"

// 1小时过期，不检测空闲，最大500条
"test#1h#0#500"

// 1小时过期，不检测空闲，最大500条，关闭本地缓存
"test#1h#0#500#0"
```

### 3.3 已定义常量

```java
public interface CacheNames {

    /** 演示案例：60秒过期，10分钟空闲，最大20条 */
    String DEMO_CACHE = "demo:cache#60s#10m#20";

    /** 系统配置 */
    String SYS_CONFIG = "sys_config";

    /** 数据字典 */
    String SYS_DICT = "sys_dict";

    /** 数据字典类型 */
    String SYS_DICT_TYPE = "sys_dict_type";

    /** 租户（30天过期，全局Key） */
    String SYS_TENANT = GlobalConstants.GLOBAL_REDIS_KEY + "sys_tenant#30d";

    /** 客户端（30天过期，全局Key） */
    String SYS_CLIENT = GlobalConstants.GLOBAL_REDIS_KEY + "sys_client#30d";

    /** 用户账户（30天过期） */
    String SYS_USER_NAME = "sys_user_name#30d";

    /** 用户名称（30天过期） */
    String SYS_NICKNAME = "sys_nickname#30d";

    /** 部门（30天过期） */
    String SYS_DEPT = "sys_dept#30d";

    /** OSS内容（30天过期） */
    String SYS_OSS = "sys_oss#30d";

    /** 角色自定义权限（30天过期） */
    String SYS_ROLE_CUSTOM = "sys_role_custom#30d";

    /** 部门及以下权限（30天过期） */
    String SYS_DEPT_AND_CHILD = "sys_dept_and_child#30d";

    /** OSS配置（全局Key） */
    String SYS_OSS_CONFIG = GlobalConstants.GLOBAL_REDIS_KEY + "sys_oss_config";

    /** 在线用户 */
    String ONLINE_TOKEN = "online_tokens";
}
```

---

## 四、缓存注解使用规范

### 4.1 @Cacheable - 查询缓存

```java
import org.springframework.cache.annotation.Cacheable;

/**
 * 根据字典类型查询字典数据
 */
@Cacheable(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
@Override
public List<SysDictDataVo> listDictDataByType(String dictType) {
    if (StringUtils.isBlank(dictType)) {
        return Collections.emptyList();
    }
    List<SysDictData> dictDataList = dictDataMapper.selectByType(dictType);
    if (CollUtil.isEmpty(dictDataList)) {
        return Collections.emptyList();
    }
    return MapstructUtils.convert(dictDataList, SysDictDataVo.class);
}
```

### 4.2 @CachePut - 更新缓存

```java
import org.springframework.cache.annotation.CachePut;

/**
 * 新增字典类型
 */
@CachePut(cacheNames = CacheNames.SYS_DICT, key = "#bo.dictType")
@Override
public List<SysDictDataVo> insertDictType(SysDictTypeBo bo) {
    SysDictType dictType = MapstructUtils.convert(bo, SysDictType.class);
    boolean success = dictTypeMapper.insert(dictType) > 0;
    if (success) {
        // 新增类型下无数据，返回空列表防止缓存穿透
        return Collections.emptyList();
    }
    throw new ServiceException("新增字典类型失败");
}
```

### 4.3 @CacheEvict - 清除缓存

```java
import org.springframework.cache.annotation.CacheEvict;

// 清除单个缓存
@CacheEvict(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
public void deleteDictType(String dictType) {
    dictTypeMapper.deleteByDictType(dictType);
}

// 清除整个缓存组
@CacheEvict(cacheNames = CacheNames.SYS_DICT, allEntries = true)
public void clearAllDictCache() {
    // 清空所有字典缓存
}
```

### 4.4 ⚠️ 重要：返回值不能使用不可变集合

```java
// ❌ 错误：使用 List.of() 会导致缓存序列化失败
@Cacheable(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
public List<SysDictDataVo> listDictDataByType(String dictType) {
    return List.of(data1, data2);  // ❌ 禁止！
}

// ❌ 错误：使用 Set.of()
@Cacheable(cacheNames = CacheNames.SYS_USER_NAME, key = "#userId")
public Set<String> getUserRoles(Long userId) {
    return Set.of("admin", "user");  // ❌ 禁止！
}

// ❌ 错误：使用 Map.of()
@Cacheable(cacheNames = CacheNames.SYS_CONFIG, key = "#configKey")
public Map<String, Object> getConfig(String configKey) {
    return Map.of("key1", "value1");  // ❌ 禁止！
}

// ✅ 正确：使用可变集合
@Cacheable(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
public List<SysDictDataVo> listDictDataByType(String dictType) {
    List<SysDictDataVo> result = new ArrayList<>();
    result.add(data1);
    result.add(data2);
    return result;  // ✅ 正确
}
```

---

## 五、分布式锁最佳实践

> ⚠️ **重要**：`RedisUtils` 不提供分布式锁方法，需要直接注入 `RedissonClient` 使用。

### 5.1 防止重复提交

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {

    private final RedissonClient redissonClient;  // 直接注入
    private final OrderMapper orderMapper;

    public void submitOrder(OrderBo orderBo) {
        String lockKey = "lock:submit:order:" + LoginHelper.getUserId();
        RLock lock = redissonClient.getLock(lockKey);  // ✅ 使用 redissonClient

        try {
            boolean locked = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (!locked) {
                throw new ServiceException("请勿重复提交订单");
            }

            try {
                orderMapper.insert(orderBo);
            } finally {
                lock.unlock();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceException("订单提交被中断");
        }
    }
}
```

### 5.2 库存扣减

```java
@Service
@RequiredArgsConstructor
public class GoodsServiceImpl implements IGoodsService {

    private final RedissonClient redissonClient;  // 直接注入
    private final GoodsMapper goodsMapper;

    public void deductStock(Long goodsId, Integer quantity) {
        String lockKey = "lock:stock:" + goodsId;
        RLock lock = redissonClient.getLock(lockKey);  // ✅ 使用 redissonClient

        try {
            boolean locked = lock.tryLock(5, 30, TimeUnit.SECONDS);
            if (!locked) {
                throw new ServiceException("系统繁忙，请稍后重试");
            }

            try {
                Goods goods = goodsMapper.selectById(goodsId);
                if (goods.getStock() < quantity) {
                    throw new ServiceException("库存不足");
                }
                goods.setStock(goods.getStock() - quantity);
                goodsMapper.updateById(goods);
            } finally {
                lock.unlock();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServiceException("库存扣减被中断");
        }
    }
}
```

### 5.3 分布式锁规范

1. **锁的粒度要细**：锁的范围越小越好，避免锁住不必要的代码
2. **设置合理的超时时间**：根据业务执行时间设置，避免死锁
3. **必须在 finally 中释放锁**：确保锁一定会被释放
4. **处理 InterruptedException**：正确处理中断异常
5. **锁 key 要有业务含义**：便于排查问题

---

## 六、缓存 Key 命名规范

### 6.1 命名格式

```
{业务模块}:{功能}:{具体标识}
```

### 6.2 命名示例

```java
// 用户缓存
"user:info:123"              // 用户信息
"user:roles:123"             // 用户角色
"user:permissions:123"       // 用户权限

// 字典缓存
"dict:data:sys_user_sex"     // 字典数据
"dict:type:sys_user_sex"     // 字典类型

// 订单缓存
"order:info:20240101001"     // 订单信息
"order:status:20240101001"   // 订单状态

// 分布式锁
"lock:order:20240101001"     // 订单锁
"lock:stock:123"             // 库存锁
"lock:submit:order:456"      // 提交锁

// 限流
"limit:api:user:123"         // 用户API限流
"limit:sms:18888888888"      // 短信限流
```

---

## 七、常见问题解决方案

### 7.1 缓存穿透

**问题**：查询一个不存在的数据，缓存和数据库都没有，导致每次请求都打到数据库。

```java
@Cacheable(cacheNames = CacheNames.SYS_DICT, key = "#dictType")
public List<SysDictDataVo> listDictDataByType(String dictType) {
    List<SysDictData> dictDataList = dictDataMapper.selectByType(dictType);
    if (CollUtil.isEmpty(dictDataList)) {
        // 返回空列表而不是null，防止缓存穿透
        return Collections.emptyList();
    }
    return MapstructUtils.convert(dictDataList, SysDictDataVo.class);
}
```

### 7.2 缓存雪崩

**问题**：大量缓存同时过期，导致请求全部打到数据库。

```java
// 设置随机过期时间，避免同时过期
long baseTime = 30 * 60; // 30分钟
long randomTime = ThreadLocalRandom.current().nextLong(5 * 60); // 随机0-5分钟
Duration duration = Duration.ofSeconds(baseTime + randomTime);
RedisUtils.setCacheObject("user:info:" + userId, userInfo, duration);
```

### 7.3 缓存击穿

**问题**：热点数据过期瞬间，大量请求同时打到数据库。

```java
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    private final RedissonClient redissonClient;  // 直接注入
    private final UserMapper userMapper;

    public User getUserById(Long userId) {
        String cacheKey = "user:info:" + userId;

        // 先从缓存获取
        User user = RedisUtils.getCacheObject(cacheKey);
        if (user != null) {
            return user;
        }

        // 缓存未命中，使用分布式锁
        String lockKey = "lock:user:" + userId;
        RLock lock = redissonClient.getLock(lockKey);  // ✅ 使用 redissonClient

        try {
            boolean locked = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (locked) {
                try {
                    // 双重检查
                    user = RedisUtils.getCacheObject(cacheKey);
                    if (user != null) {
                        return user;
                    }

                    // 从数据库查询
                    user = userMapper.selectById(userId);

                    // 存入缓存
                    if (user != null) {
                        RedisUtils.setCacheObject(cacheKey, user, Duration.ofMinutes(30));
                    }

                    return user;
                } finally {
                    lock.unlock();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 获取锁失败，直接查询数据库
        return userMapper.selectById(userId);
    }
}
```

### 7.4 缓存与数据库一致性

```java
// 方案1：先更新数据库，再删除缓存（推荐）
@Transactional(rollbackFor = Exception.class)
public void updateUser(UserBo userBo) {
    User user = MapstructUtils.convert(userBo, User.class);
    userMapper.updateById(user);

    // 删除缓存
    RedisUtils.deleteObject("user:info:" + user.getUserId());
}

// 方案2：使用 @CachePut 更新缓存
@CachePut(cacheNames = CacheNames.SYS_USER_NAME, key = "#result.userId")
@Transactional(rollbackFor = Exception.class)
public UserVo updateUser(UserBo userBo) {
    User user = MapstructUtils.convert(userBo, User.class);
    userMapper.updateById(user);

    User updatedUser = userMapper.selectById(user.getUserId());
    return MapstructUtils.convert(updatedUser, UserVo.class);
}
```

### 7.5 租户隔离问题

**问题**：`RedisUtils.keys()` 和 `RedisUtils.deleteKeys()` 会忽略租户隔离。

```java
// 手动拼接租户ID
String tenantId = LoginHelper.getTenantId();
String pattern = tenantId + ":user:*";
Collection<String> keys = RedisUtils.keys(pattern);

// 或者使用 CacheUtils，它会自动处理租户隔离
CacheUtils.clear(CacheNames.SYS_USER_NAME);
```

---

## 八、核心文件位置

| 文件 | 位置 |
|------|------|
| RedisUtils | `ruoyi-common/ruoyi-common-redis/src/main/java/org/dromara/common/redis/utils/RedisUtils.java` |
| CacheUtils | `ruoyi-common/ruoyi-common-redis/src/main/java/org/dromara/common/redis/utils/CacheUtils.java` |
| CacheNames | `ruoyi-common/ruoyi-common-core/src/main/java/org/dromara/common/core/constant/CacheNames.java` |
| GlobalConstants | `ruoyi-common/ruoyi-common-core/src/main/java/org/dromara/common/core/constant/GlobalConstants.java` |

---

## 九、快速参考

### 9.1 常用操作速查

```java
// 基础缓存
RedisUtils.setCacheObject(key, value);                          // 存储
RedisUtils.setCacheObject(key, value, Duration.ofMinutes(30));  // 存储并设置过期时间
Object value = RedisUtils.getCacheObject(key);                  // 获取
RedisUtils.deleteObject(key);                                   // 删除
boolean exists = RedisUtils.isExistsObject(key);                // 检查是否存在

// 分布式锁（需注入 RedissonClient，RedisUtils 不提供 getLock）
RLock lock = redissonClient.getLock(lockKey);
boolean locked = lock.tryLock(10, 30, TimeUnit.SECONDS);
lock.unlock();  // 必须在 finally 中释放

// 限流
long remaining = RedisUtils.rateLimiter(key, RateType.OVERALL, 100, 10);

// 缓存注解
@Cacheable(cacheNames = CacheNames.SYS_DICT, key = "#dictType")  // 查询缓存
@CachePut(cacheNames = CacheNames.SYS_DICT, key = "#bo.dictType") // 更新缓存
@CacheEvict(cacheNames = CacheNames.SYS_DICT, key = "#dictType")  // 清除缓存
```

### 9.2 注意事项

1. ⚠️ **@Cacheable 返回值不能使用不可变集合**（List.of()、Set.of()、Map.of()）
2. ⚠️ **分布式锁必须在 finally 中释放**
3. ⚠️ **keys() 和 deleteKeys() 会忽略租户隔离**，需要手动拼接租户ID
4. ⚠️ **缓存 key 要有业务含义**，便于排查问题
5. ⚠️ **设置合理的过期时间**，避免缓存雪崩
6. ⚠️ **返回空列表而不是 null**，防止缓存穿透
