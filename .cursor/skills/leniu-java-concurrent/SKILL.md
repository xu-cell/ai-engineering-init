---
name: leniu-java-concurrent
description: |
  leniu-tengyun-core / leniu-yunshitang 项目并发处理规范。当编写并发代码时使用此skill，包括线程安全、异步处理、分布式锁规范。

  触发场景：
  - 使用CompletableFuture进行异步处理
  - 配置和使用线程池（ThreadPoolExecutor）
  - 处理并发安全问题（Redis分布式锁、数据库唯一索引）
  - 实现异步通知或异步日志（不等待结果）

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：并发、CompletableFuture、线程池、ThreadPool、并发安全、锁、synchronized、volatile、原子类、异步处理、leniu并发、leniu-yunshitang并发、net.xnzn并发
---

# leniu-tengyun-core 并发处理规范

## 项目特征

| 特征 | 说明 |
|------|------|
| 包名 | `net.xnzn.*` |
| 异常类 | `LeException`（禁止使用 ServiceException） |
| 工具类 | Hutool（CollUtil、StrUtil 等） |
| 分布式锁 | `RedisUtil.getLock()` / `RedisUtil.setNx()` |
| JDK | 21（支持虚拟线程，推荐使用标准线程池） |

## 并行查询

### 使用CompletableFuture

```java
// 并行查询多个数据源
public XxxVO getData(Long id) {
    // 创建异步任务
    CompletableFuture<TypeA> futureA = CompletableFuture
            .supplyAsync(() -> mapperA.selectById(id));

    CompletableFuture<TypeB> futureB = CompletableFuture
            .supplyAsync(() -> mapperB.selectById(id));

    CompletableFuture<TypeC> futureC = CompletableFuture
            .supplyAsync(() -> mapperC.selectById(id));

    // 等待所有任务完成
    CompletableFuture.allOf(futureA, futureB, futureC).join();

    // 获取结果
    TypeA resultA = futureA.join();
    TypeB resultB = futureB.join();
    TypeC resultC = futureC.join();

    // 组装结果（使用 BeanUtil.copyProperties）
    XxxVO vo = new XxxVO();
    BeanUtil.copyProperties(resultA, vo);
    vo.setDataB(resultB);
    vo.setDataC(resultC);

    return vo;
}
```

### 指定线程池

```java
@Autowired
private Executor asyncTaskExecutor;

public XxxVO getData(Long id) {
    // 使用指定的线程池
    CompletableFuture<TypeA> futureA = CompletableFuture
            .supplyAsync(() -> mapperA.selectById(id), asyncTaskExecutor);

    CompletableFuture<TypeB> futureB = CompletableFuture
            .supplyAsync(() -> mapperB.selectById(id), asyncTaskExecutor);

    // 等待并获取结果
    CompletableFuture.allOf(futureA, futureB).join();

    TypeA resultA = futureA.join();
    TypeB resultB = futureB.join();

    return buildVO(resultA, resultB);
}
```

### 报表模块专用线程池（yunshitangTaskExecutor）

云食堂报表模块使用专项线程池，通过 `@Resource(name=...)` 按名称注入：

```java
@Service
@Slf4j
public class ReportSumXxxService {

    // ✅ 按名称注入报表专用线程池
    @Resource(name = "yunshitangTaskExecutor")
    private AsyncTaskExecutor asyncTaskExecutor;

    // ✅ 报表查询标准三并发模式：COUNT + LIST + TOTAL
    public ReportBaseTotalVO<XxxVO> pageSummary(XxxParam param) {
        // 1. 获取认证信息和数据权限
        MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
        ReportDataPermissionParam dataPermission =
            reportDataPermissionService.getDataPermission(authPO);

        // 2. 三并发：count、list、total 同时执行
        CompletableFuture<Long> countFuture = CompletableFuture.supplyAsync(
            () -> reportMapper.listSummary_COUNT(param, authPO, dataPermission),
            asyncTaskExecutor
        );
        CompletableFuture<List<XxxVO>> listFuture = CompletableFuture.supplyAsync(() -> {
            PageMethod.startPage(param.getPage());
            return reportMapper.listSummary(param, authPO, dataPermission);
        }, asyncTaskExecutor);
        CompletableFuture<XxxVO> totalFuture = CompletableFuture.supplyAsync(
            () -> reportMapper.getSummaryTotal(param, authPO, dataPermission),
            asyncTaskExecutor
        );

        // 3. 等待所有任务完成
        CompletableFuture.allOf(countFuture, listFuture, totalFuture).join();

        // 4. 组装结果
        PageVO<XxxVO> pageVO = PageVO.of(listFuture.join());
        return new ReportBaseTotalVO<XxxVO>()
            .setResultPage(pageVO)
            .setTotalLine(totalFuture.join());
    }
}
```

**注意**：
- `listSummary_COUNT` 为 Mapper 中专门的 COUNT 方法（命名规范：`listXxx_COUNT`）
- `PageMethod.startPage()` 必须在 LIST Future 内部调用（同线程）
- COUNT Future 使用 Mapper 的 COUNT 方法，不走 PageHelper
- TOTAL Future 查询合计行，只返回数值字段

## 异步执行

### 不等待结果

```java
// 异步执行，不等待结果
CompletableFuture.runAsync(() -> {
    // 异步操作
    logService.saveLog(log);
}, asyncTaskExecutor);

// 主线程继续执行
return result;
```

### 异步执行并处理异常

```java
CompletableFuture.runAsync(() -> {
    try {
        // 异步操作
        notificationService.send(message);
    } catch (Exception e) {
        log.error("异步发送通知失败", e);
    }
}, asyncTaskExecutor);
```

## 线程池配置

### 自定义线程池

```java
@Configuration
public class ThreadPoolConfig {

    @Bean("asyncTaskExecutor")
    public Executor asyncTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 核心线程数
        executor.setCorePoolSize(10);
        // 最大线程数
        executor.setMaxPoolSize(20);
        // 队列容量
        executor.setQueueCapacity(200);
        // 线程名称前缀
        executor.setThreadNamePrefix("async-task-");
        // 拒绝策略
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // 等待所有任务完成后关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        // 等待时间
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}
```

## 并发安全

### 使用分布式锁（Redisson）

```java
public void processOrder(Long orderId) {
    String lockKey = "order:process:" + orderId;

    // 获取Redisson分布式锁
    RLock lock = RedisUtil.getLock(lockKey);
    if (!lock.tryLock()) {
        throw new LeException("订单正在处理中，请稍后重试");
    }

    try {
        // 业务处理
        doProcess(orderId);
    } finally {
        // 安全释放锁
        if (lock.isHeldByCurrentThread() && lock.isLocked()) {
            lock.unlock();
        }
    }
}
```

### 使用Redis setNx 轻量锁

```java
public void processOnce(Long tenantId) {
    String key = "task:process:" + tenantId;
    // setNx：设置成功才继续执行，防重入
    boolean ifFirst = RedisUtil.setNx(key, "1", 6);
    if (!ifFirst) {
        throw new LeException("任务正在执行中");
    }

    try {
        doBusiness();
    } finally {
        RedisUtil.del(key);
    }
}
```

### 使用数据库唯一索引

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    try {
        // 插入订单（依赖唯一索引防止重复）
        Order order = buildOrder(param);
        orderMapper.insert(order);
    } catch (DuplicateKeyException e) {
        throw new LeException("订单已存在");
    }
}
```

## 常见场景

### 场景1：并行查询多个接口

```java
public DashboardVO getDashboard(Long userId) {
    // 并行查询多个数据
    CompletableFuture<OrderSummary> orderFuture = CompletableFuture
            .supplyAsync(() -> orderService.getSummary(userId), asyncTaskExecutor);

    CompletableFuture<PaymentSummary> paymentFuture = CompletableFuture
            .supplyAsync(() -> paymentService.getSummary(userId), asyncTaskExecutor);

    CompletableFuture<InventorySummary> inventoryFuture = CompletableFuture
            .supplyAsync(() -> inventoryService.getSummary(userId), asyncTaskExecutor);

    // 等待所有查询完成
    CompletableFuture.allOf(orderFuture, paymentFuture, inventoryFuture).join();

    // 组装结果
    DashboardVO dashboard = new DashboardVO();
    dashboard.setOrderSummary(orderFuture.join());
    dashboard.setPaymentSummary(paymentFuture.join());
    dashboard.setInventorySummary(inventoryFuture.join());

    return dashboard;
}
```

### 场景2：批量并行处理

```java
public void batchProcess(List<Long> ids) {
    // 分批处理，每批100个（使用 Hutool CollUtil）
    int batchSize = 100;
    List<List<Long>> batches = CollUtil.split(ids, batchSize);

    // 并行处理每批数据
    List<CompletableFuture<Void>> futures = batches.stream()
            .map(batch -> CompletableFuture.runAsync(() -> {
                processBatch(batch);
            }, asyncTaskExecutor))
            .collect(Collectors.toList());

    // 等待所有批次完成
    CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

    log.info("批量处理完成，总数:{}", ids.size());
}

private void processBatch(List<Long> batch) {
    for (Long id : batch) {
        try {
            processOne(id);
        } catch (Exception e) {
            log.error("处理失败，id:{}", id, e);
        }
    }
}
```

### 场景3：异步通知（不影响主流程）

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    // 创建订单
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 异步发送通知（不影响主流程）
    CompletableFuture.runAsync(() -> {
        try {
            // 发送短信
            smsService.sendOrderCreated(order);
            // 发送邮件
            emailService.sendOrderCreated(order);
        } catch (Exception e) {
            log.error("发送通知失败，orderId:{}", order.getId(), e);
        }
    }, asyncTaskExecutor);

    log.info("订单创建成功，orderId:{}", order.getId());
}
```

## 最佳实践

### 1. 指定线程池

```java
// ✅ 推荐：使用自定义线程池
CompletableFuture.supplyAsync(() -> doSomething(), asyncTaskExecutor);

// ❌ 避免：使用默认ForkJoinPool（可能影响其他业务）
CompletableFuture.supplyAsync(() -> doSomething());
```

### 2. 异常处理

```java
CompletableFuture<Result> future = CompletableFuture
        .supplyAsync(() -> {
            try {
                return doSomething();
            } catch (Exception e) {
                log.error("异步任务执行失败", e);
                throw new CompletionException(e);
            }
        }, asyncTaskExecutor);

// 处理异常（leniu 项目使用 LeException）
try {
    Result result = future.join();
} catch (CompletionException e) {
    log.error("获取异步结果失败", e);
    throw new LeException("处理失败");
}
```

### 3. 超时控制

```java
try {
    // 设置超时时间
    Result result = future.get(5, TimeUnit.SECONDS);
} catch (TimeoutException e) {
    log.error("异步任务超时", e);
    throw new LeException("处理超时");
}
```

## 常见错误

| 错误写法 | 正确写法 | 说明 |
|---------|---------|------|
| `throw new ServiceException("msg")` | `throw new LeException("msg")` | leniu 项目异常类不同 |
| `Lists.partition(ids, batchSize)` | `CollUtil.split(ids, batchSize)` | 使用 Hutool 工具类 |
| `MapstructUtils.convert(a, B.class)` | `BeanUtil.copyProperties(a, b)` | leniu 使用 Hutool 转换 |
| `import org.dromara.*` | `import net.xnzn.*` | 包名不同 |
