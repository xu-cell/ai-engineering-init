---
name: performance-doctor
description: |
  后端性能问题诊断与优化。包含 SQL 优化、缓存策略、批量操作优化、接口优化、日志分析。

  触发场景:
  - 接口响应慢
  - SQL 慢查询优化
  - 缓存策略设计
  - 分页查询优化
  - N+1 查询问题
  - 批量操作超时
  - 多租户查询优化

  触发词:性能优化、慢查询、SQL优化、索引优化、缓存、Redis缓存、N+1、分页优化、EXPLAIN、响应慢、批量操作、多租户优化

  注意:如果是排查功能性 Bug(代码报错、逻辑错误),请使用 bug-detective。
---

# 后端性能优化指南

## 诊断流程

```
1. 定位 -> 接口层面(响应时间) / SQL层面(慢查询) / 缓存层面(命中率)
2. 分析 -> p6spy SQL 日志 / Arthas JVM 诊断 / 日志分析
3. 优化 -> 索引 / 缓存 / 批量处理
4. 验证 -> 对比优化前后指标
```

### 性能指标

| 指标 | 良好 | 需优化 | 工具 |
|------|------|--------|------|
| 接口响应 | < 200ms | > 500ms | p6spy/SkyWalking |
| 数据库查询 | < 50ms | > 200ms | p6spy SQL 日志 |
| 内存使用 | < 70% | > 85% | Arthas/JVM 监控 |

---

## 1. MyBatis-Plus 查询优化

> 源码：`ruoyi-modules/ruoyi-demo/.../TestDemoServiceImpl.java:62-73`

### 查询构建规范

```java
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;

private LambdaQueryWrapper<TestDemo> buildQueryWrapper(TestDemoBo bo) {
    Map<String, Object> params = bo.getParams();
    LambdaQueryWrapper<TestDemo> lqw = Wrappers.lambdaQuery();
    lqw.eq(bo.getDeptId() != null, TestDemo::getDeptId, bo.getDeptId());
    lqw.like(StringUtils.isNotBlank(bo.getTestKey()), TestDemo::getTestKey, bo.getTestKey());
    lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
        TestDemo::getCreateTime, params.get("beginCreateTime"), params.get("endCreateTime"));
    return lqw;
}
```

### 更新构建规范

> 源码：`ruoyi-modules/ruoyi-system/.../SysUserServiceImpl.java:383-404`

```java
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;

// 精确更新
baseMapper.update(null,
    new LambdaUpdateWrapper<SysUser>()
        .set(SysUser::getStatus, status)
        .eq(SysUser::getUserId, userId));

// 条件更新（非null才设置）
baseMapper.update(null,
    new LambdaUpdateWrapper<SysUser>()
        .set(ObjectUtil.isNotNull(user.getNickName()), SysUser::getNickName, user.getNickName())
        .set(SysUser::getPhonenumber, user.getPhonenumber())
        .eq(SysUser::getUserId, user.getUserId()));
```

### 批量更新

```java
import com.baomidou.mybatisplus.extension.toolkit.Db;

// 推荐：Db 工具类批量更新
Db.updateBatchById(entityList);

// 避免：循环单个更新（N次数据库访问）
```

### N+1 查询修复

```java
// 错误：循环查询
for (Order order : orders) {
    User user = userMapper.selectById(order.getUserId());
}

// 正确：批量查询 + Map 映射
List<Long> userIds = orders.stream().map(Order::getUserId).distinct().toList();
Map<Long, User> userMap = userMapper.selectBatchIds(userIds).stream()
    .collect(Collectors.toMap(User::getUserId, Function.identity()));
for (Order order : orders) {
    User user = userMap.get(order.getUserId());
}
```

---

## 2. 缓存优化

> 源码：`ruoyi-common/ruoyi-common-redis/.../RedisUtils.java`

### RedisUtils 操作

```java
import org.dromara.common.redis.utils.RedisUtils;

RedisUtils.setCacheObject("user:" + id, userVo, Duration.ofMinutes(30));
UserVo cached = RedisUtils.getCacheObject("user:" + id);
RedisUtils.deleteObject("user:" + id);
boolean exists = RedisUtils.isExistsObject("user:" + id);
```

### Spring Cache 注解

```java
@Cacheable(value = "user", key = "#id")
public UserVo getById(Long id) { ... }

@CacheEvict(value = "user", key = "#bo.id")
public int update(UserBo bo) { ... }
```

> **@Cacheable 禁止返回不可变集合**（`List.of()`、`Set.of()`），Redis 反序列化会失败。必须用 `new ArrayList<>(List.of(...))`。

### 分布式锁（Lock4j）

> 源码：`ruoyi-modules/ruoyi-demo/.../RedisLockController.java:47-67`

```java
import com.baomidou.lock.annotation.Lock4j;
import com.baomidou.lock.LockTemplate;
import com.baomidou.lock.LockInfo;
import com.baomidou.lock.executor.RedissonLockExecutor;

// 注解方式（推荐）
@Lock4j(keys = {"#key"}, expire = 60000, acquireTimeout = 3000)
public void doSomething(String key) { ... }

// 编程方式
LockInfo lockInfo = lockTemplate.lock(key, 30000L, 5000L, RedissonLockExecutor.class);
if (null == lockInfo) {
    throw new ServiceException("业务处理中，请稍后再试");
}
try {
    // 业务逻辑
} finally {
    lockTemplate.releaseLock(lockInfo);
}
```

### 限流

```java
import org.redisson.api.RateType;

long remaining = RedisUtils.rateLimiter("api:rate:" + userId, RateType.OVERALL, 100, 60);
if (remaining < 0) {
    throw new ServiceException("请求过于频繁");
}
```

### 本地缓存（Caffeine）

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

private final Cache<Long, UserVo> localCache = Caffeine.newBuilder()
    .maximumSize(1000)
    .expireAfterWrite(5, TimeUnit.MINUTES)
    .build();

public UserVo getUser(Long id) {
    return localCache.get(id, key -> {
        UserVo cached = RedisUtils.getCacheObject("user:" + id);
        return cached != null ? cached : baseMapper.selectVoById(id);
    });
}
```

---

## 3. 多租户优化

```sql
-- tenant_id 必须建索引
CREATE INDEX idx_tenant_id ON xxx_table(tenant_id);

-- 复合索引第一列放 tenant_id（多租户自动添加 tenant_id 条件）
CREATE INDEX idx_tenant_status ON xxx_table(tenant_id, status);
CREATE INDEX idx_tenant_create_time ON xxx_table(tenant_id, create_time);
```

---

## 4. 批量操作优化

```java
// 推荐：分批处理（每批500条）
public void batchInsert(List<Xxx> list) {
    int batchSize = 500;
    for (int i = 0; i < list.size(); i += batchSize) {
        int end = Math.min(i + batchSize, list.size());
        baseMapper.insertBatch(list.subList(i, end));
    }
}

// 批量更新同理
@Transactional(rollbackFor = Exception.class)
public void batchUpdate(List<XxxBo> list) {
    int batchSize = 500;
    for (int i = 0; i < list.size(); i += batchSize) {
        int end = Math.min(i + batchSize, list.size());
        List<Xxx> batch = list.subList(i, end).stream()
            .map(bo -> MapstructUtils.convert(bo, Xxx.class)).toList();
        Db.updateBatchById(batch);
    }
}
```

---

## 5. 性能日志分析

> 日志配置：`ruoyi-admin/src/main/resources/logback-plus.xml:52-72`

### 日志文件

| 环境 | 文件 | 说明 |
|------|------|------|
| **开发** | `./logs/console.log` | 每次启动清空，含 SQL 日志 |
| 生产 | `./logs/sys-*.log` | 按天滚动，保留60天 |

### SQL 监控

开发环境 p6spy 默认开启：`spring.datasource.dynamic.p6spy: true`

日志格式：
```
2026-01-08 22:12:10 [req-123] [...] INFO p6spy - Consume Time:245 ms
Execute SQL:SELECT * FROM sys_user WHERE tenant_id = '000000' AND del_flag = '0'
```

### AI 主动读日志的触发条件

| 场景 | 关键词 | 分析重点 |
|------|--------|---------|
| 接口慢 | "接口慢"、"超时" | SQL 执行时间、N+1 查询 |
| SQL 慢 | "SQL慢"、"查询慢" | p6spy Consume Time |
| 内存/CPU | "内存高"、"卡顿" | OOM、GC、线程池满 |
| 频繁报错 | "一直报错" | ERROR 日志、异常频率 |

### 分析命令

```bash
# 慢 SQL（>200ms）
grep "Consume Time" ./logs/console.log | grep -E "Consume Time:[2-9][0-9]{2,}|[0-9]{4,}"

# N+1 检测（同一 SQL 重复多次）
grep "Execute SQL" ./logs/console.log | sed 's/WHERE.*/WHERE .../' | sort | uniq -c | sort -rn | head -20

# 错误日志
grep "ERROR" ./logs/console.log | tail -50
```

---

## 常见问题速查

| 问题 | 原因 | 方案 |
|------|------|------|
| 接口响应慢 | SQL 无索引 | 添加索引，EXPLAIN 分析 |
| 接口响应慢 | N+1 查询 | 批量查询 + Map 映射 |
| 接口响应慢 | 未缓存 | RedisUtils 或 @Cacheable |
| 分页查询慢 | 深分页 | 游标分页或限制页码 |
| 批量操作超时 | 数据量太大 | 分批500条处理 |
| 多租户查询慢 | tenant_id 无索引 | 添加 tenant_id 复合索引 |
| 内存溢出 | 大数据量一次加载 | 分批/流式处理 |

---

## 监控工具

| 工具 | 用途 | 使用方式 |
|------|------|---------|
| **p6spy** | SQL 监控、执行时间 | 开发环境默认开启 |
| **Arthas** | JVM 诊断、火焰图 | `java -jar arthas-boot.jar` |
| **SkyWalking** | 分布式链路追踪 | 需单独部署 |
