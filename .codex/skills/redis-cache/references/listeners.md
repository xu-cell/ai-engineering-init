# Redis 监听机制

## 过期/删除监听器

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

// 注册List/Set/Map监听器
RedisUtils.addListListener("myList", (ExpiredObjectListener) name -> { ... });
RedisUtils.addSetListener("mySet", (DeletedObjectListener) name -> { ... });
RedisUtils.addMapListener("myMap", (ExpiredObjectListener) name -> { ... });
```
