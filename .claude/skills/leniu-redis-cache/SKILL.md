# leniu-redis-cache

适用于 leniu-tengyun-core 项目的 Redis 缓存和分布式锁操作。

## RedisUtil 工具类

位置：`net.xnzn.core.common.redis.RedisUtil`

### String 操作

```java
import net.xnzn.core.common.redis.RedisUtil;

// 设置 String（无过期时间）
RedisUtil.setString("key", "value");

// 设置 String（带过期时间，单位秒）
RedisUtil.setString("key", "value", 3600L);

// 获取 String
String value = RedisUtil.getString("key");

// 存在则更新，不存在则设置
Boolean updated = RedisUtil.setIfPresentString("key", "new-value", 3600L);
```

### Object 操作

```java
// 设置对象（无过期时间）
RedisUtil.setObj("user:123", user);

// 设置对象（带过期时间）
RedisUtil.setObj("user:123", user, 1800L);

// 获取对象
Object user = RedisUtil.getObj("user:123");
User userObj = (User) RedisUtil.getObj("user:123");
```

### 删除操作

```java
// 删除指定 key
RedisUtil.delete("user:123");

// 批量删除（匹配模式）
RedisUtil.deleteByPattern("cache:user:*");
```

### 自增/自减

```java
// 自增（返回递增后的值）
Integer count = RedisUtil.incr("counter", 3600L);

// 自减（返回递减后的值）
Integer count = RedisUtil.decr("counter", 3600L);

// 仅获取当前值（不增减）
Integer current = RedisUtil.getRedisAtomicInteger("counter", null, null);
```

### 分布式锁

```java
import org.redisson.api.RLock;

// 获取锁对象
RLock lock = RedisUtil.getLock("lock:order:123");

// 标准用法（推荐）：lock() 直接阻塞获取
RLock lock = RedisUtil.getLock("lock:order:123");
lock.lock();
try {
    // 执行业务逻辑
    doBusiness();
} catch (Exception e) {
    log.error("业务处理异常", e);
} finally {
    // ✅ 安全释放锁：双重检查，防止重复 unlock
    try {
        if (lock.isHeldByCurrentThread() && lock.isLocked()) {
            lock.unlock();
        }
    } catch (Exception e) {
        log.error("解锁异常", e);
    }
}

// tryLock 用法（不阻塞，失败直接抛异常）
RLock lock2 = RedisUtil.getLock("lock:order:123");
if (!lock2.tryLock()) {
    throw new LeException("订单正在处理中，请稍后重试");
}
try {
    doBusiness();
} finally {
    try {
        if (lock2.isHeldByCurrentThread() && lock2.isLocked()) {
            lock2.unlock();
        }
    } catch (Exception e) {
        log.error("解锁异常", e);
    }
}

// 检查锁状态
boolean locked = RedisUtil.isLock("lock:order:123");
```

**已弃用的方法**（避免代码扫描问题，请使用 `getLock` + `lock/unlock`）：

```java
// 不推荐使用（已弃用）
RedisUtil.tryLock("lock:key", 10, 30);
RedisUtil.lock("lock:key");
RedisUtil.unLock("lock:key");
```

### ZSet 操作

```java
// 添加到有序集合
RedisUtil.zAdd("ranking:weekly", "user123", 95.5);
RedisUtil.zAdd("ranking:weekly", "user456", 88.3);

// 获取排名数据（带分数）
Set<ZSetOperations.TypedTuple<Object>> ranking = RedisUtil.zGetList("ranking:weekly", 0, 9);

// 从有序集合中删除
RedisUtil.zRemove("ranking:weekly", "user123");
```

### 批量操作

```java
// 批量保存
Map<String, Object> map = new HashMap<>();
map.put("key1", "value1");
map.put("key2", "value2");
RedisUtil.multiSet(map);

// 批量获取
List keys = Arrays.asList("key1", "key2", "key3");
List values = RedisUtil.multiGet(keys);
```

### Key 查询

```java
// 匹配 key
List<String> keys = RedisUtil.keysByPattern("cache:*");

// 检查锁是否锁定
boolean isLocked = RedisUtil.isLock("lock:order:123");
```

## 缓存配置

### 最大缓存时间

可以通过配置限制缓存的最大过期时间：

```yaml
spring:
  redis:
    # 自定义最大缓存时间（秒）
    custom-max-expiration-second: 86400  # 24小时
```

## 缓存 Key 命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 用户信息 | `user:{id}` | `user:12345` |
| 用户列表缓存 | `user:list:{params_hash}` | `user:list:abc123` |
| 权限缓存 | `permissions:subject_id:{id}` | `permissions:subject_id:123` |
| 角色缓存 | `roles:subject_id:{id}` | `roles:subject_id:123` |
| 租户配置 | `tenant:config:{id}` | `tenant:config:123` |
| 字典缓存 | `dict:{type}:{key}` | `dict:sys_yes_no:1` |
| 分布式锁 | `lock:{module}:{id}` | `lock:order:123` |
| 限流器 | `rate:{user_id}:{api}` | `rate:123:/api/order/create` |

## 典型场景

### 缓存击穿保护

```java
public User getUserById(Long userId) {
    String key = "user:" + userId;

    // 先查缓存
    Object cached = RedisUtil.getObj(key);
    if (cached != null) {
        return (User) cached;
    }

    // 使用分布式锁防止缓存击穿
    RLock lock = RedisUtil.getLock("lock:user:" + userId);
    try {
        if (lock.tryLock(5, 30, TimeUnit.SECONDS)) {
            try {
                // 双重检查
                cached = RedisUtil.getObj(key);
                if (cached != null) {
                    return (User) cached;
                }

                // 查询数据库
                User user = userMapper.selectById(userId);
                if (user != null) {
                    RedisUtil.setObj(key, user, 3600L);
                }
                return user;
            } finally {
                lock.unlock();
            }
        }
        return userMapper.selectById(userId);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return userMapper.selectById(userId);
    }
}
```

### 限流器

```java
public boolean checkRateLimit(Long userId, String api, int limit, int seconds) {
    String key = String.format("rate:%d:%s", userId, api);
    Integer count = RedisUtil.incr(key, (long) seconds);

    // 首次请求设置过期时间
    if (count == 1) {
        RedisUtil.setString(key, count.toString(), (long) seconds);
    }

    return count <= limit;
}
```

### 分布式任务去重

```java
public void executeTask(String taskId) {
    String key = "task:executing:" + taskId;

    // setNx 防止重复执行
    boolean acquired = RedisUtil.setNx(key, "1", 300);
    if (!acquired) {
        log.warn("任务正在执行中: {}", taskId);
        return;
    }

    try {
        // 执行任务
        doTask(taskId);
    } finally {
        RedisUtil.delete(key);
    }
}
```

### 排行榜

```java
// 添加分数
public void addScore(Long userId, Double score) {
    RedisUtil.zAdd("ranking:daily", String.valueOf(userId), score);
}

// 获取 TOP 10
public List<RankingItem> getTop10() {
    Set<ZSetOperations.TypedTuple<Object>> ranking =
        RedisUtil.zGetList("ranking:daily", 0, 9);

    return ranking.stream()
        .map(tuple -> new RankingItem(
            Long.parseLong(tuple.getValue().toString()),
            tuple.getScore()
        ))
        .sorted(Comparator.comparing(RankingItem::getScore).reversed())
        .collect(Collectors.toList());
}

// 获取用户排名
public Long getUserRank(Long userId) {
    // 需要 RedisUtil 扩展，或使用 RedisTemplate
    Long rank = redisTemplate.opsForZSet().rank("ranking:daily", String.valueOf(userId));
    return rank != null ? rank + 1 : null;
}
```

## 与 RuoYi-Plus 的区别

| 特性 | RuoYi-Plus | leniu-tengyun-core |
|------|-----------|-------------------|
| 工具类 | `RedisUtils` | `RedisUtil` |
| 分布式锁 | `RedisUtils.lock()` | `RedisUtil.getLock()` |
| 设置对象 | `RedisUtils.setCacheObject()` | `RedisUtil.setObj()` |
| 获取对象 | `RedisUtils.getCacheObject()` | `RedisUtil.getObj()` |
| 删除 | `RedisUtils.deleteObject()` | `RedisUtil.delete()` |
| ZSet 操作 | `RedisUtils.getCacheZSetRank()` | `RedisUtil.zAdd/zGetList()` |
| 缓存注解 | `@Cacheable` | 未使用注解方式 |
| 锁释放 | `RedisUtils.unlock()` | `RLock.unlock()` |

## 注意事项

1. `setNx` 用于防止重复执行，返回 `true` 表示设置成功
2. 分布式锁必须使用 `try-finally` 确保 unlock 执行
3. 自增/自减操作可指定过期时间，首次自增时设置
4. 过期时间单位统一为秒
5. 批量删除使用 `deleteByPattern` 会扫描所有匹配 key，生产环境慎用
6. `RedisUtil` 底层使用 `RedisTemplate` 和 `RedissonClient`
