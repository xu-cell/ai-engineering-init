---
name: java-concurrent
description: |
  Java并发处理规范。当编写并发代码时使用此skill，包括线程安全和异步处理规范。
  
    触发场景：
    - 使用CompletableFuture进行异步处理
    - 配置和使用线程池（ThreadPoolExecutor）
    - 处理并发安全问题（synchronized、Lock）
    - 实现分布式锁或并发控制
  
    触发词：并发、CompletableFuture、线程池、ThreadPool、并发安全、锁、synchronized、volatile、原子类、异步处理
---

# Java并发处理规范

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

    // 组装结果
    XxxVO vo = new XxxVO();
    vo.setDataA(resultA);
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

## 异步执行

### 不等待结果

```java
// 异步执行,不等待结果
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

### 使用分布式锁

```java
@Autowired
private RedisLockService redisLockService;

public void processOrder(Long orderId) {
    String lockKey = "order:process:" + orderId;

    // 尝试获取锁
    if (!redisLockService.tryLock(lockKey, 30)) {
        throw new LeException("订单正在处理中,请稍后重试");
    }

    try {
        // 业务处理
        doProcess(orderId);
    } finally {
        // 释放锁
        redisLockService.unlock(lockKey);
    }
}
```

### 使用数据库唯一索引

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    try {
        // 插入订单(依赖唯一索引防止重复)
        Order order = buildOrder(param);
        orderMapper.insert(order);
    } catch (DuplicateKeyException e) {
        throw new LeException("订单已存在");
    }
}
```

## 常见场景

### 场景1: 并行查询多个接口

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

### 场景2: 批量处理

```java
public void batchProcess(List<Long> ids) {
    // 分批处理,每批100个
    int batchSize = 100;
    List<List<Long>> batches = Lists.partition(ids, batchSize);

    // 并行处理每批数据
    List<CompletableFuture<Void>> futures = batches.stream()
            .map(batch -> CompletableFuture.runAsync(() -> {
                processBatch(batch);
            }, asyncTaskExecutor))
            .collect(Collectors.toList());

    // 等待所有批次完成
    CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

    log.info("批量处理完成,总数:{}", ids.size());
}

private void processBatch(List<Long> batch) {
    for (Long id : batch) {
        try {
            processOne(id);
        } catch (Exception e) {
            log.error("处理失败,id:{}", id, e);
        }
    }
}
```

### 场景3: 异步通知

```java
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderParam param) {
    // 创建订单
    Order order = buildOrder(param);
    orderMapper.insert(order);

    // 异步发送通知(不影响主流程)
    CompletableFuture.runAsync(() -> {
        try {
            // 发送短信
            smsService.sendOrderCreated(order);
            // 发送邮件
            emailService.sendOrderCreated(order);
        } catch (Exception e) {
            log.error("发送通知失败,orderId:{}", order.getId(), e);
        }
    }, asyncTaskExecutor);

    log.info("订单创建成功,orderId:{}", order.getId());
}
```

## 最佳实践

### 1. 指定线程池

```java
// ✅ 推荐:使用自定义线程池
CompletableFuture.supplyAsync(() -> doSomething(), asyncTaskExecutor);

// ❌ 避免:使用默认线程池(ForkJoinPool)
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

// 处理异常
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
