---
name: redis-cache
description: |
  当需要使用Redis缓存、分布式锁、限流等功能时自动使用此Skill。包含 Redisson API、Spring Cache 注解使用规范、分布式锁实现、缓存key命名规范等。

  触发场景：
  - 使用Redis缓存数据
  - 配置Spring Cache缓存注解
  - 实现分布式锁
  - 实现接口限流
  - Redis发布订阅
  - 缓存key设计和命名
  - 缓存清理和刷新

  触发词：Redis、缓存、Cache、@Cacheable、@CacheEvict、@CachePut、Redisson、分布式锁、RLock、限流、RateLimiter、发布订阅、缓存key、缓存过期

  核心警告：
  - @Cacheable返回值不能使用不可变集合（List.of()、Set.of()、Map.of()）
  - 分布式锁必须在finally中释放，且需注入RedissonClient
---

# Redis 缓存开发指南

## 快速索引

| 功能 | 工具类/注解 | 说明 |
|------|-------------|------|
| 对象缓存 | `RedissonClient` / `[你的RedisUtils]` | 基于 Redisson |
| Spring Cache | `@Cacheable/@CachePut/@CacheEvict` | 声明式缓存 |
| 分布式锁 | `redissonClient.getLock()` | 需注入 RedissonClient |
| 限流控制 | Redisson `RRateLimiter` | 基于 Redisson |
| 原子操作 | Redisson `RAtomicLong` | 原子递增/递减 |
| 发布订阅 | Redisson `RTopic` | 消息通信 |

---

## 一、Redisson 基础操作

### 1.1 基础缓存操作

```java
import org.redisson.api.RedissonClient;
import org.redisson.api.RBucket;

@Service
@RequiredArgsConstructor
public class CacheService {

    private final RedissonClient redissonClient;

    // 设置缓存
    public void set(String key, Object value, Duration ttl) {
        RBucket<Object> bucket = redissonClient.getBucket(key);
        bucket.set(value, ttl);
    }

    // 获取缓存
    public <T> T get(String key) {
        RBucket<T> bucket = redissonClient.getBucket(key);
        return bucket.get();
    }

    // 删除缓存
    public boolean delete(String key) {
        return redissonClient.getBucket(key).delete();
    }

    // 判断是否存在
    public boolean exists(String key) {
        return redissonClient.getBucket(key).isExists();
    }

    // 不存在时设置（原子操作）
    public boolean setIfAbsent(String key, Object value, Duration ttl) {
        RBucket<Object> bucket = redissonClient.getBucket(key);
        return bucket.trySet(value, ttl);
    }
}
```

### 1.2 集合操作

```java
// List
RList<String> list = redissonClient.getList("myList");
list.addAll(dataList);
List<String> result = list.readAll();

// Set
RSet<String> set = redissonClient.getSet("mySet");
set.addAll(dataSet);
Set<String> result = set.readAll();

// Map
RMap<String, Object> map = redissonClient.getMap("myMap");
map.putAll(dataMap);
map.put("key3", "value3");
Object value = map.get("key1");
```

### 1.3 发布订阅

```java
// 发布消息
RTopic topic = redissonClient.getTopic("notification:channel");
topic.publish(messageObj);

// 订阅消息
RTopic topic = redissonClient.getTopic("notification:channel");
topic.addListener(MessageDTO.class, (channel, msg) -> {
    // 处理消息
});
```

### 1.4 限流控制

```java
import org.redisson.api.RRateLimiter;
import org.redisson.api.RateType;
import org.redisson.api.RateIntervalUnit;

RRateLimiter limiter = redissonClient.getRateLimiter("api:limit:user:" + userId);
// 每10秒最多100个请求
limiter.trySetRate(RateType.OVERALL, 100, 10, RateIntervalUnit.SECONDS);

if (!limiter.tryAcquire()) {
    throw new [你的异常类]("请求过于频繁");
}
```

### 1.5 原子操作

```java
RAtomicLong counter = redissonClient.getAtomicLong("counter:view");
counter.set(0L);
long value = counter.get();
long newVal = counter.incrementAndGet();
long newVal = counter.decrementAndGet();
```

---

## 二、Spring Cache 注解使用规范

### @Cacheable - 查询缓存

```java
@Cacheable(value = "dictData", key = "#dictType")
@Override
public List<DictDataVo> listDictDataByType(String dictType) {
    if (dictType == null || dictType.isBlank()) {
        return Collections.emptyList();
    }
    List<DictData> dictDataList = dictDataMapper.selectByType(dictType);
    if (dictDataList.isEmpty()) {
        return Collections.emptyList();  // 返回空列表防止缓存穿透
    }
    return dictDataList.stream()
        .map(d -> BeanUtil.copyProperties(d, DictDataVo.class))
        .toList();
}
```

### @CachePut / @CacheEvict

```java
@CachePut(value = "dictData", key = "#bo.dictType")
public List<DictDataVo> insertDictType(DictTypeBo bo) { ... }

@CacheEvict(value = "dictData", key = "#dictType")
public void deleteDictType(String dictType) { ... }

@CacheEvict(value = "dictData", allEntries = true)
public void clearAllDictCache() { ... }
```

### 返回值禁止使用不可变集合

```java
// ❌ 禁止! @Cacheable 返回值序列化失败
return List.of(data1, data2);
return Set.of("admin", "user");
return Map.of("key1", "value1");

// ✅ 正确：使用可变集合
List<DictDataVo> result = new ArrayList<>();
result.add(data1);
return result;
```

---

## 三、CacheNames 命名规范

### 推荐格式

```
cacheNames#ttl#maxIdleTime#maxSize
- ttl: 过期时间（0=不过期，默认0）
- maxIdleTime: 最大空闲时间（0=不检测，默认0）
- maxSize: 最大条数（0=无限，默认0）
```

```java
"test#60s"                // 60秒过期
"test#0#60s"              // 不过期，60秒空闲清理
"test#0#1m#1000"          // 不过期，1分钟空闲，最大1000条
"test#1h#0#500"           // 1小时过期，最大500条
```

### 常量定义示例

```java
public interface CacheNames {
    String SYS_CONFIG = "sys_config";
    String SYS_DICT = "sys_dict";
    String SYS_USER_NAME = "sys_user_name#30d";
    String SYS_DEPT = "sys_dept#30d";
}
```

---

## 四、分布式锁

> 直接注入 `RedissonClient` 使用。

```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl {

    private final RedissonClient redissonClient;

    public void submitOrder(OrderBo orderBo) {
        String lockKey = "lock:submit:order:" + orderBo.getUserId();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            boolean locked = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (!locked) {
                throw new [你的异常类]("请勿重复提交订单");
            }
            try {
                orderMapper.insert(orderBo);
            } finally {
                if (lock.isLocked() && lock.isHeldByCurrentThread()) {
                    lock.unlock();  // 必须在 finally 中释放
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new [你的异常类]("订单提交被中断");
        }
    }
}
```

---

## 五、缓存 Key 命名规范

```
格式：{业务模块}:{功能}:{具体标识}

示例：
user:info:123              user:roles:123            user:permissions:123
dict:data:sys_user_sex     order:info:20240101001    order:status:20240101001
lock:order:20240101001     lock:stock:123            lock:submit:order:456
limit:api:user:123         limit:sms:18888888888
```

---

## 六、注意事项速查

1. **@Cacheable 返回值不能使用不可变集合**（List.of()、Set.of()、Map.of()）
2. **分布式锁必须在 finally 中释放**
3. **返回空列表而不是 null**，防止缓存穿透
4. **设置随机过期时间偏移**，避免缓存雪崩
5. **热点数据用分布式锁 + 双重检查**，防止缓存击穿
6. **keys() 模式匹配要谨慎**，生产环境避免大范围扫描
