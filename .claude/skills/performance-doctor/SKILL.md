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

> ⚠️ **本项目规范**：本文档基于项目实际代码编写，所有 API 和类名均已验证。标记 `🔴 本项目规范` 的部分必须严格遵守。

## 目录

- [性能问题诊断流程](#性能问题诊断流程)
- [MyBatis-Plus 查询优化](#1-mybatis-plus-查询优化)
- [SQL 优化](#2-sql-优化)
- [缓存优化](#3-缓存优化)
- [多租户优化](#4-多租户优化)
- [批量操作优化](#5-批量操作优化)
- [接口优化](#6-接口优化)
- [性能日志分析](#7-性能日志分析)
- [性能指标与监控工具](#8-性能指标与监控工具)
- [常见性能问题速查](#常见性能问题速查)

---

## 性能问题诊断流程

```
1. 定位问题
   ├─ 接口层面?→ 检查响应时间、调用链路
   ├─ SQL 层面?→ 检查慢查询、执行计划
   └─ 缓存层面?→ 检查命中率、过期策略

2. 分析原因
   ├─ 使用工具测量（p6spy/Arthas/日志分析）
   └─ 找出瓶颈点

3. 实施优化
   └─ 针对性优化（索引/缓存/批量处理）

4. 验证效果
   └─ 对比优化前后（响应时间/SQL 耗时）
```

---

## 1. MyBatis-Plus 查询优化

> **实际代码位置**：`ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/service/impl/TestDemoServiceImpl.java:62-73`

本项目使用 **MyBatis-Plus 原生的 LambdaQueryWrapper 和 LambdaUpdateWrapper**，没有自定义封装类。

### 🔴 查询构建规范（本项目规范）

```java
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;

// ✅ 正确：本项目标准写法
private LambdaQueryWrapper<TestDemo> buildQueryWrapper(TestDemoBo bo) {
    Map<String, Object> params = bo.getParams();
    LambdaQueryWrapper<TestDemo> lqw = Wrappers.lambdaQuery();

    // 条件判断+查询条件
    lqw.eq(bo.getDeptId() != null, TestDemo::getDeptId, bo.getDeptId());
    lqw.eq(bo.getUserId() != null, TestDemo::getUserId, bo.getUserId());
    lqw.like(StringUtils.isNotBlank(bo.getTestKey()), TestDemo::getTestKey, bo.getTestKey());
    lqw.between(params.get("beginCreateTime") != null && params.get("endCreateTime") != null,
        TestDemo::getCreateTime, params.get("beginCreateTime"), params.get("endCreateTime"));

    return lqw;
}

// 使用
@Override
public TableDataInfo<TestDemoVo> queryPageList(TestDemoBo bo, PageQuery pageQuery) {
    LambdaQueryWrapper<TestDemo> lqw = buildQueryWrapper(bo);
    Page<TestDemoVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
    return TableDataInfo.build(result);
}
```

### 🔴 更新构建规范（本项目规范）

> **实际代码位置**：`ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/impl/SysUserServiceImpl.java:383-404`

```java
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;

// ✅ 正确：使用 LambdaUpdateWrapper
@Override
public int updateUserStatus(Long userId, String status) {
    return baseMapper.update(null,
        new LambdaUpdateWrapper<SysUser>()
            .set(SysUser::getStatus, status)
            .eq(SysUser::getUserId, userId));
}

// ✅ 正确：带条件的更新（只有非null值才设置）
@Override
public int updateUserProfile(SysUserBo user) {
    return baseMapper.update(null,
        new LambdaUpdateWrapper<SysUser>()
            .set(ObjectUtil.isNotNull(user.getNickName()), SysUser::getNickName, user.getNickName())
            .set(SysUser::getPhonenumber, user.getPhonenumber())
            .set(SysUser::getEmail, user.getEmail())
            .set(SysUser::getSex, user.getSex())
            .eq(SysUser::getUserId, user.getUserId()));
}
```

### 智能条件的性能优势

MyBatis-Plus 的条件构造器支持条件判断，自动忽略不满足的条件：

```java
// ❌ 传统写法（每个条件都要判断，代码冗长）
LambdaQueryWrapper<Xxx> wrapper = new LambdaQueryWrapper<>();
if (bo.getId() != null) {
    wrapper.eq(Xxx::getId, bo.getId());
}
if (StringUtils.isNotBlank(bo.getName())) {
    wrapper.like(Xxx::getName, bo.getName());
}

// ✅ MyBatis-Plus 条件构造（自动处理 null 和空字符串）
LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
lqw.eq(bo.getId() != null, Xxx::getId, bo.getId());                           // null 自动跳过
lqw.like(StringUtils.isNotBlank(bo.getName()), Xxx::getName, bo.getName());  // 空字符串自动跳过
```

### 批量更新优化

```java
// ✅ 推荐：使用 Db 工具类批量更新
import com.baomidou.mybatisplus.extension.toolkit.Db;

public void batchUpdateStatus(List<Long> ids, String status) {
    List<Xxx> list = ids.stream()
        .map(id -> {
            Xxx entity = new Xxx();
            entity.setId(id);
            entity.setStatus(status);
            return entity;
        })
        .toList();
    Db.updateBatchById(list);
}

// ❌ 避免：循环单个更新（N次数据库访问）
for (Long id : ids) {
    baseMapper.update(null,
        new LambdaUpdateWrapper<Xxx>()
            .set(Xxx::getStatus, status)
            .eq(Xxx::getId, id));
}
```

---

## 2. SQL 优化

### 慢查询分析

```sql
-- 开启慢查询日志（MySQL 层面）
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 超过1秒记录

-- 查看慢查询配置
SHOW VARIABLES LIKE '%slow_query%';

-- 本项目使用 p6spy 进行 SQL 监控（非 Druid）
-- 开发环境默认开启：spring.datasource.dynamic.p6spy: true
-- 生产环境默认关闭：spring.datasource.dynamic.p6spy: false
-- SQL 日志输出在 ./logs/console.log 中，格式包含 Consume Time
```

### 执行计划分析

```sql
-- 使用 EXPLAIN 分析
EXPLAIN SELECT * FROM sys_user WHERE dept_id = 100;

-- 关注字段
-- type: ALL(全表扫描) < index < range < ref < const
-- rows: 扫描行数，越少越好
-- Extra: Using filesort(需优化)、Using temporary(需优化)
```

### 索引优化

```sql
-- ✅ 好的索引设计
CREATE INDEX idx_dept_status ON sys_user(dept_id, status);

-- 索引使用原则
-- 1. 最左前缀原则
-- 2. 避免在索引列上使用函数
-- 3. 避免 != 和 NOT IN
-- 4. 注意索引选择性
```

### N+1 查询优化

```java
// ❌ 不好：N+1 查询
for (Order order : orders) {
    User user = userMapper.selectById(order.getUserId());  // 每次循环都查询
}

// ✅ 好的：批量查询 + Map 映射
List<Long> userIds = orders.stream()
    .map(Order::getUserId)
    .distinct()
    .toList();
Map<Long, User> userMap = userMapper.selectBatchIds(userIds).stream()
    .collect(Collectors.toMap(User::getUserId, Function.identity()));

for (Order order : orders) {
    User user = userMap.get(order.getUserId());  // O(1) 查找
}
```

---

## 3. 缓存优化

> **实际代码位置**：`ruoyi-common/ruoyi-common-redis/src/main/java/org/dromara/common/redis/utils/RedisUtils.java`

本项目封装了 `RedisUtils`，基于 Redisson 实现。

### 基础缓存操作

```java
import org.dromara.common.redis.utils.RedisUtils;
import java.time.Duration;

// 设置缓存（带过期时间）
RedisUtils.setCacheObject("user:" + id, userVo, Duration.ofMinutes(30));

// 获取缓存
UserVo cached = RedisUtils.getCacheObject("user:" + id);

// 删除缓存
RedisUtils.deleteObject("user:" + id);

// 检查是否存在
boolean exists = RedisUtils.isExistsObject("user:" + id);

// 设置过期时间
RedisUtils.expire("user:" + id, Duration.ofHours(1));
```

### Spring Cache 注解（推荐）

```java
// 使用 Spring Cache 注解（更简洁）
@Cacheable(value = "user", key = "#id")
public UserVo getById(Long id) {
    return MapstructUtils.convert(baseMapper.selectById(id), UserVo.class);
}

@CacheEvict(value = "user", key = "#bo.id")
public int update(UserBo bo) {
    return baseMapper.updateById(MapstructUtils.convert(bo, User.class));
}

// 缓存穿透防护（缓存 null 值）
@Cacheable(value = "user", key = "#id", unless = "#result == null")
public UserVo getById(Long id) {
    // ...
}
```

> ⚠️ **重要警告**：`@Cacheable` 方法**禁止返回不可变集合**（`List.of()`、`Set.of()`、`Map.of()`），会导致 Redis 反序列化失败！必须使用可变集合：
> ```java
> // ❌ 错误
> return List.of("1", "2");
> // ✅ 正确
> return new ArrayList<>(List.of("1", "2"));
> ```

### 分布式锁（Lock4j）

> **实际代码位置**：`ruoyi-modules/ruoyi-demo/src/main/java/org/dromara/demo/controller/RedisLockController.java:47-67`

本项目使用 **Lock4j + Redisson** 实现分布式锁。

```java
import com.baomidou.lock.LockInfo;
import com.baomidou.lock.LockTemplate;
import com.baomidou.lock.annotation.Lock4j;
import com.baomidou.lock.executor.RedissonLockExecutor;

// 方式1：注解方式（推荐）
@Lock4j(keys = {"#key"}, expire = 60000, acquireTimeout = 3000)
public void doSomething(String key) {
    // 业务逻辑
}

// 方式2：编程方式
@Autowired
private LockTemplate lockTemplate;

public void doSomething(String key) {
    final LockInfo lockInfo = lockTemplate.lock(key, 30000L, 5000L, RedissonLockExecutor.class);
    if (null == lockInfo) {
        throw new ServiceException("业务处理中，请稍后再试");
    }
    try {
        // 业务逻辑
    } finally {
        lockTemplate.releaseLock(lockInfo);
    }
}
```

### 限流控制

```java
import org.redisson.api.RateType;

// 限流：每分钟最多 100 次请求
long remaining = RedisUtils.rateLimiter(
    "api:rate:" + userId,
    RateType.OVERALL,  // 全局限流
    100,               // 允许的请求数
    60                 // 时间窗口（秒）
);

if (remaining < 0) {
    throw new ServiceException("请求过于频繁，请稍后再试");
}
```

### 本地缓存（Caffeine）

```java
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

// 对于热点数据，可以使用本地缓存减少 Redis 访问
private final Cache<Long, UserVo> localCache = Caffeine.newBuilder()
    .maximumSize(1000)                      // 最大缓存数量
    .expireAfterWrite(5, TimeUnit.MINUTES)  // 写入后5分钟过期
    .build();

public UserVo getUserWithLocalCache(Long id) {
    return localCache.get(id, key -> {
        // 本地缓存未命中，从 Redis 或数据库获取
        UserVo cached = RedisUtils.getCacheObject("user:" + id);
        if (cached != null) {
            return cached;
        }
        return MapstructUtils.convert(baseMapper.selectById(id), UserVo.class);
    });
}
```

---

## 4. 多租户优化

本项目使用 `TenantEntity` 实现多租户，需要注意索引设计。

```sql
-- ✅ 必须为 tenant_id 建立索引
CREATE INDEX idx_tenant_id ON xxx_table(tenant_id);

-- ✅ 复合索引：租户 + 常用查询条件
CREATE INDEX idx_tenant_status ON xxx_table(tenant_id, status);
CREATE INDEX idx_tenant_create_time ON xxx_table(tenant_id, create_time);
CREATE INDEX idx_tenant_user ON xxx_table(tenant_id, create_by);

-- ⚠️ 注意：多租户查询会自动添加 tenant_id 条件
-- 确保复合索引的第一列是 tenant_id
```

---

## 5. 批量操作优化

```java
// ✅ 推荐：分批插入（每批500条）
public void batchInsert(List<Xxx> list) {
    int batchSize = 500;
    for (int i = 0; i < list.size(); i += batchSize) {
        int end = Math.min(i + batchSize, list.size());
        baseMapper.insertBatch(list.subList(i, end));
    }
}

// ❌ 避免：一次性插入大量数据
baseMapper.insertBatch(hugeList);  // 可能超时或内存溢出

// ✅ 批量更新优化
@Transactional(rollbackFor = Exception.class)
public void batchUpdate(List<XxxBo> list) {
    int batchSize = 500;
    for (int i = 0; i < list.size(); i += batchSize) {
        int end = Math.min(i + batchSize, list.size());
        List<Xxx> batch = list.subList(i, end).stream()
            .map(bo -> MapstructUtils.convert(bo, Xxx.class))
            .toList();
        Db.updateBatchById(batch);
    }
}
```

---

## 6. 接口优化

```java
// ❌ 不好：返回所有字段
public List<Order> listOrders() {
    return baseMapper.selectList(null);
}

// ✅ 好的：只返回需要的字段（使用 VO）
public List<OrderSimpleVo> listOrders() {
    return baseMapper.selectList(null).stream()
        .map(o -> MapstructUtils.convert(o, OrderSimpleVo.class))
        .toList();
}

// ✅ 好的：分页查询（本项目标准写法）
public TableDataInfo<OrderVo> pageOrders(OrderBo bo, PageQuery pageQuery) {
    LambdaQueryWrapper<Order> lqw = buildQueryWrapper(bo);
    Page<OrderVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
    return TableDataInfo.build(result);
}
```

---

## 7. 性能日志分析

> **实际代码位置**：`ruoyi-admin/src/main/resources/logback-plus.xml:52-72`

### 日志文件位置

| 环境 | 日志文件 | 说明 |
|------|---------|------|
| **开发环境** | `./logs/console.log` | 每次启动清空，包含所有日志和 SQL 日志 |
| 生产环境 | `./logs/sys-*.log` | 分级别按天滚动，保留60天 |

> ⚠️ **AI 应优先分析开发环境日志**（`./logs/console.log`），因为：
> - 只包含当前启动的日志，范围小，易分析
> - 包含完整的 SQL 执行时间和性能数据
> - 启动时自动清空，避免历史日志干扰

### AI 自动读取触发条件

当用户描述以下性能问题时，**AI 必须主动 Read ./logs/console.log**：

| 触发场景 | 关键词 | 日志分析重点 |
|---------|--------|-------------|
| 1. 接口响应慢 | "接口慢"、"响应时间长"、"超时" | SQL 执行时间、慢查询(>200ms)、N+1 查询 |
| 2. SQL 性能问题 | "SQL慢"、"查询慢"、"数据库慢" | p6spy 日志中的 Consume Time、SQL 语句 |
| 3. 内存或 CPU 高 | "内存占用"、"CPU高"、"卡顿" | OutOfMemoryError、GC 日志、线程池满 |
| 4. 频繁报错 | "一直报错"、"很多错误" | ERROR 级别日志、异常堆栈、出现频率 |
| 5. 启动慢 | "启动慢"、"启动时间长" | 应用启动时间、Bean 初始化耗时 |

### 日志格式识别规则

```
日期时间 [请求ID] [线程] 级别 日志记录器 - 消息内容

示例1（普通日志）：
2026-01-08 22:12:10 [req-123] [http-nio-8080-exec-1] INFO  o.d.system.controller.SysUserController - 查询用户列表

示例2（SQL 日志 - p6spy）：
2026-01-08 22:12:10 [req-123] [http-nio-8080-exec-1] INFO  p6spy - Consume Time:245 ms 2026-01-08 22:12:10
Execute SQL:SELECT * FROM sys_user WHERE tenant_id = '000000' AND del_flag = '0'
```

### 常见性能分析场景

#### 场景 1：分析慢 SQL（最常用）

```bash
# 找出所有执行时间 > 200ms 的 SQL
grep "Consume Time" ./logs/console.log | grep -E "Consume Time:[2-9][0-9]{2,}|[0-9]{4,}" | head -20
```

**分析要点**：
- 执行时间是否合理（一般 < 200ms）
- 是否有索引缺失（WHERE 条件的字段）
- 是否存在 N+1 查询（循环中重复相同 SQL）
- 是否查询了不必要的字段（SELECT *）

#### 场景 2：统计 SQL 执行次数（发现 N+1）

```bash
# 统计每种 SQL 的执行次数
grep "Execute SQL" ./logs/console.log | sed 's/WHERE.*/WHERE .../' | sort | uniq -c | sort -rn | head -20
```

**N+1 特征**：
- 同一个 SELECT 语句重复出现多次
- 通常在循环中执行
- 例如：`SELECT * FROM sys_user WHERE user_id = ?` 出现 100 次

#### 场景 3：查找异常和错误

```bash
# 查找所有 ERROR 日志
grep "ERROR" ./logs/console.log | tail -50

# 查找超时错误
grep -i "timeout\|timed out" ./logs/console.log

# 查找内存溢出
grep -i "OutOfMemoryError\|heap space" ./logs/console.log
```

### 完整分析示例

**用户问题**："接口调用很慢，查询用户列表需要 3 秒"

**AI 分析流程**：

```bash
# 1. 读取日志文件
Read ./logs/console.log

# 2. 搜索用户相关的 SQL
grep "sys_user" ./logs/console.log | grep "Consume Time"

# 3. 找到慢查询
# 输出：Consume Time:2845 ms ... Execute SQL:SELECT * FROM sys_user WHERE status = '0'

# 4. 分析问题
# - 执行时间 2845ms（远超 200ms 阈值）
# - SELECT * 查询所有字段
# - WHERE status = '0' 可能缺少索引

# 5. 给出优化建议
```

**AI 输出**：
```
性能分析结果：

1. 慢查询定位
   - SQL: SELECT * FROM sys_user WHERE status = '0'
   - 执行时间: 2845ms（严重超标，应 < 200ms）

2. 问题原因
   - status 字段缺少索引，导致全表扫描
   - 查询所有字段（SELECT *），增加数据传输量
   - 未使用缓存

3. 优化方案（按优先级）
   ✅ 立即执行：
      - 添加索引: CREATE INDEX idx_status ON sys_user(status);
      - 只查询需要的字段

   ✅ 短期优化：
      - 添加 Redis 缓存（过期时间 5 分钟）
      - 使用 @Cacheable 注解

4. 预期效果
   - 添加索引后: 2845ms → 50ms（预计提升 98%）
```

---

## 8. 性能指标与监控工具

### 后端性能指标

| 指标 | 良好 | 需优化 | 测量工具 |
|------|------|--------|---------|
| 接口响应时间 | < 200ms | > 500ms | p6spy/SkyWalking |
| 数据库查询 | < 50ms | > 200ms | p6spy SQL 日志 |
| 内存使用 | < 70% | > 85% | Arthas/JVM监控 |
| CPU 使用 | < 60% | > 80% | 系统监控 |

### 后端监控工具

| 工具 | 用途 | 使用方式 |
|------|------|---------|
| **p6spy** | SQL 监控、执行时间 | 开发环境自动开启（`p6spy: true`） |
| **Arthas** | JVM 诊断、火焰图 | `java -jar arthas-boot.jar` |
| **SkyWalking** | 分布式链路追踪 | 需单独部署 |
| **JProfiler** | 内存分析、CPU分析 | IDE 插件 |

### 日志分析命令速查

| 命令 | 用途 | 示例 |
|------|------|------|
| `wc -l` | 统计行数 | `wc -l console.log` |
| `grep` | 搜索关键词 | `grep "ERROR" console.log` |
| `tail -n 100` | 查看最后 100 行 | `tail -n 100 console.log` |
| `grep -A 5 -B 5` | 显示匹配行的前后 5 行 | `grep -A 5 -B 5 "ERROR" console.log` |
| `sort \| uniq -c` | 统计重复次数 | `grep "Execute SQL" console.log \| sort \| uniq -c` |

---

## 常见性能问题速查

| 问题现象 | 可能原因 | 解决方案 |
|----------|----------|----------|
| 接口响应慢 | SQL 无索引 | 添加合适索引，使用 EXPLAIN 分析 |
| 接口响应慢 | N+1 查询 | 改为批量查询 + Map 映射 |
| 接口响应慢 | 未使用缓存 | 使用 RedisUtils 或 @Cacheable |
| 分页查询慢 | 深分页问题 | 使用游标分页或限制页码范围 |
| 批量操作超时 | 一次操作太多数据 | 分批处理，每批 500 条 |
| 多租户查询慢 | tenant_id 无索引 | 添加 tenant_id 复合索引 |
| 频繁请求 | 无防抖/缓存 | 添加缓存或接口限流 |
| 内存溢出 | 大数据量一次加载 | 分批处理、流式处理 |
