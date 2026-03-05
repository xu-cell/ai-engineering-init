# RedisUtils 完整 API

```java
import org.dromara.common.redis.utils.RedisUtils;
import java.time.Duration;

// ========== 基本操作 ==========
RedisUtils.setCacheObject("key", value);                         // 永久
RedisUtils.setCacheObject("key", value, Duration.ofMinutes(30)); // 30分钟过期
RedisUtils.getCacheObject("key");
RedisUtils.deleteObject("key");
RedisUtils.hasKey("key");
RedisUtils.expire("key", 3600);  // 设置过期时间（秒）

// ========== 条件设置 ==========
RedisUtils.setObjectIfAbsent("key", value, Duration.ofMinutes(5));  // 不存在才设置
RedisUtils.setObjectIfExists("key", value, Duration.ofMinutes(5));  // 存在才设置

// ========== List 操作 ==========
RedisUtils.setCacheList("listKey", dataList);
RedisUtils.addCacheList("listKey", item);
List<T> list = RedisUtils.getCacheList("listKey");
List<T> range = RedisUtils.getCacheListRange("listKey", 0, 10);

// ========== Set 操作 ==========
RedisUtils.setCacheSet("setKey", dataSet);
RedisUtils.addCacheSet("setKey", item);
Set<T> set = RedisUtils.getCacheSet("setKey");

// ========== Map/Hash 操作 ==========
RedisUtils.setCacheMap("mapKey", dataMap);
RedisUtils.setCacheMapValue("mapKey", "field", value);
T value = RedisUtils.getCacheMapValue("mapKey", "field");
Map<String, T> map = RedisUtils.getCacheMap("mapKey");
RedisUtils.delCacheMapValue("mapKey", "field");

// ========== 原子操作 ==========
RedisUtils.setAtomicValue("counter", 0);
long val = RedisUtils.incrAtomicValue("counter");  // +1
long val = RedisUtils.decrAtomicValue("counter");  // -1
long val = RedisUtils.getAtomicValue("counter");

// ========== 批量操作 ==========
Collection<String> keys = RedisUtils.keys("user:*");
RedisUtils.deleteKeys("temp:*");

// ========== 发布订阅 ==========
RedisUtils.publish("channel", message);
RedisUtils.subscribe("channel", Message.class, msg -> {
    // 处理消息
});

// ========== 限流 ==========
long remaining = RedisUtils.rateLimiter("api:user:list", RateType.OVERALL, 100, 60);
// 每60秒最多100次，返回剩余次数，-1表示被限流
```
