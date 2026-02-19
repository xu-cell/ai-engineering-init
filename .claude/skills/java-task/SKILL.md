---
name: java-task
description: |
  Java定时任务规范。当编写定时任务时使用此skill，包括XXL-Job使用和任务调度规范。

  触发场景：
  - 使用XXL-Job实现分布式定时任务
  - 编写任务处理器（@JobHandler）
  - 配置任务调度参数和执行策略
  - 任务日志记录和监控

  触发词：定时任务、XXL-Job、任务调度、@JobHandler、任务日志、任务监控、@XxlJob、定时执行、任务处理器、cron

  注意：与 scheduled-jobs 技能有重叠，scheduled-jobs 侧重@Scheduled和SnailJob，本技能侧重XXL-Job使用规范。
---

# Java定时任务规范

## 核心组件

- **XXL-Job**: 分布式定时任务调度平台
- **@XxlJob**: 定时任务注解
- **TenantContextHolder**: 租户上下文管理器
- **TenantLoader**: 租户/商户加载器

## 基础使用

### 定时任务模板

```java
@Component
@Slf4j
public class DataSyncTask {

    @Autowired
    @Lazy
    private DataSyncService dataSyncService;

    /**
     * 数据同步任务
     */
    @XxlJob(value = "dataSyncJob")
    public void syncData() {
        log.info("【定时任务】数据同步任务开始执行");

        try {
            int count = dataSyncService.sync();
            log.info("【定时任务】数据同步任务执行完成,同步数量:{}", count);
        } catch (Exception e) {
            log.error("【定时任务】数据同步任务执行失败", e);
            throw e;  // 重新抛出,XXL-Job会记录失败
        }
    }
}
```

## 商户遍历模式

### 模式一: 直接使用 TenantLoader

最常用的商户遍历方式，适用于需要遍历所有商户的场景。

```java
@Component
@Slf4j
public class AccSubTimeTask {

    @Resource
    @Lazy
    private TenantLoader tenantLoader;

    @Autowired
    @Lazy
    private AccSubTimeService accSubTimeService;

    /**
     * 补贴定时发放任务
     */
    @XxlJob("accSubTimeSendHandle")
    public void accSubTimeSendHandle() {
        log.info("[补贴定时规则]定时任务,开始时间:{}", LocalDateTime.now());

        // 遍历所有商户
        tenantLoader.listTenant().forEach(merchantId -> {
            try {
                // 设置租户上下文
                TenantContextHolder.setTenantId(merchantId);

                // 并发控制
                this.checkTask(merchantId);

                // 执行业务逻辑
                accSubTimeService.accSubRuleTask();
            } catch (Exception e) {
                log.error("[补贴定时规则]定时任务异常,商家={}", merchantId, e);
            }
        });

        log.info("[补贴定时规则]定时任务,结束时间:{}", LocalDateTime.now());
    }

    /**
     * 并发控制检查
     */
    protected void checkTask(Long tenantId) {
        String key = "yst:task:name:" + tenantId;
        boolean ifFirst = RedisUtil.setNx(key, LeConstants.COMMON_YES, 6);
        if (!ifFirst) {
            throw new LeException(I18n.getMessage("acc_operate_exits_task"));
        }
    }
}
```

### 模式二: 使用 Executors 工具类

使用工具类简化商户遍历逻辑。

```java
@Component
@Slf4j
public class CouponTask {

    @Autowired
    @Lazy
    private CouponService couponService;

    /**
     * 餐券状态自动处理
     */
    @XxlJob("couponStateAutoHandler")
    public void couponStateAutoHandler() {
        log.info("[餐券状态]定时任务开始执行");

        // 使用工具类遍历商户
        Executors.doInAllTenant(tenantId -> {
            try {
                TenantContextHolder.setTenantId(tenantId);
                couponService.autoHandleState();
            } catch (Exception e) {
                log.error("[餐券状态]定时任务异常,商家={}", tenantId, e);
            }
        });

        log.info("[餐券状态]定时任务执行完成");
    }
}
```

### 模式三: 通过 MerchantApi 按类型查询

适用于需要按商户类型过滤的场景。

```java
@Component
@Slf4j
public class MonitorSafetyTask {

    @Autowired
    @Lazy
    private MerchantApi merchantApi;

    @Autowired
    @Lazy
    private MonitorSafetyCanteenService monitorSafetyCanteenService;

    /**
     * 拉取食堂信息
     */
    @XxlJob("pullSafetyCanteen")
    public void pullSafetyCanteen() {
        log.info("[监管平台-食堂]定时任务开始执行");

        // 按商户类型查询
        merchantApi.listMerchantByType(MerchantTypeEnum.DEFAULT.getKey())
            .forEach(tenant -> {
                try {
                    TenantContextHolder.setTenantId(tenant.getTenantId());
                    monitorSafetyCanteenService.sync(param);
                } catch (Exception e) {
                    log.error("[监管平台-食堂]定时任务异常,商家={}", tenant.getTenantId(), e);
                }
            });

        log.info("[监管平台-食堂]定时任务执行完成");
    }
}
```

### 模式四: 商户遍历 + 分布式锁

适用于需要全局并发控制的场景。

```java
@Component
@Slf4j
public class PayTask {

    @Resource
    @Lazy
    private TenantLoader tenantLoader;

    @Autowired
    @Lazy
    private TradeRecordService tradeRecordService;

    private static final String LOCK_KEY_PAYING = "pay:paying:lock";

    /**
     * 处理支付中的交易记录
     */
    @XxlJob("payingTradeRecordHandler")
    public void payingTradeRecordHandler() {
        // 获取分布式锁
        RLock lock = RedisUtil.getLock(LOCK_KEY_PAYING);
        if (!lock.tryLock()) {
            log.warn("[支付定时任务]上一个任务进行中");
            return;
        }

        try {
            log.info("[支付定时任务]处理支付中的交易开始执行");

            // 遍历所有商户
            for (Long tenantId : tenantLoader.listTenant()) {
                try {
                    TenantContextHolder.setTenantId(tenantId);

                    // 查询需要处理的交易记录
                    List<TradeRecord> tradeRecordList = tradeRecordService.listPayingTradeRecord();

                    // 处理交易记录
                    tradeRecordList.forEach(record -> {
                        try {
                            tradeRecordService.handlePayingRecord(record);
                        } catch (Exception e) {
                            log.error("[支付定时任务]处理交易失败,tradeNo={}", record.getTradeNo(), e);
                        }
                    });

                } catch (Exception e) {
                    log.error("[支付定时任务]商户处理异常,tenantId={}", tenantId, e);
                }
            }

            log.info("[支付定时任务]处理支付中的交易执行完成");
        } finally {
            // 释放锁
            if (lock.isHeldByCurrentThread() && lock.isLocked()) {
                lock.unlock();
            }
        }
    }
}
```

### 模式五: 商户遍历 + 任务参数

适用于需要接收参数的定时任务。

```java
@Component
@Slf4j
public class OrderTask {

    @Resource
    @Lazy
    private TenantLoader tenantLoader;

    @Autowired
    @Lazy
    private OrderInfoService orderInfoService;

    /**
     * 异常订单自动重新支付
     */
    @XxlJob("exceptionOrderRePay")
    public void exceptionOrderRePay() {
        log.info("[定时任务_异常订单自动重新支付]开始执行");

        // 全局并发控制
        String startTime = String.valueOf(System.currentTimeMillis());
        if (!RedisUtil.setNx("order:exception:pay:task:" + startTime, startTime, 60 * 60 * 3)) {
            log.warn("[定时任务_异常订单自动重新支付]已有任务在执行");
            return;
        }

        try {
            // 获取任务参数
            String jobParam = XxlJobHelper.getJobParam();
            ExceptionPayTaskParam taskParam = ExceptionPayTaskParam.of(jobParam);

            // 遍历所有商户
            Set<Long> tenantIds = tenantLoader.listTenant();
            for (Long tenantId : tenantIds) {
                try {
                    TenantContextHolder.setTenantId(tenantId);

                    // 查询待处理的异常订单
                    List<Long> waitOrderIds = orderInfoService.listWaitProcessExceptionOrderIds(
                        taskParam.getStartTime(),
                        taskParam.getEndTime()
                    );

                    // 自动重新支付
                    if (CollectionUtil.isNotEmpty(waitOrderIds)) {
                        orderRepairBusiness.autoExceptionPay(waitOrderIds);
                        log.info("[定时任务_异常订单自动重新支付]商家={},处理数量={}", tenantId, waitOrderIds.size());
                    }

                } catch (Exception e) {
                    log.error("[定时任务_异常订单自动重新支付]商户处理异常,tenantId={}", tenantId, e);
                }
            }

            log.info("[定时任务_异常订单自动重新支付]执行完成");
        } finally {
            RedisUtil.del("order:exception:pay:task:" + startTime);
        }
    }
}
```

### 模式六: 商户遍历 + 数据统计

适用于需要汇总各商户数据的场景。

```java
@Component
@Slf4j
public class AccStatisticTask {

    @Resource
    @Lazy
    private TenantLoader tenantLoader;

    @Autowired
    @Lazy
    private AccStatisticService accStatisticService;

    /**
     * 账户统计汇总
     */
    @XxlJob("accStatisticSummaryHandle")
    public void accStatisticSummaryHandle() {
        log.info("[账户统计汇总]定时任务开始执行");

        DateTime startTime = DateUtil.date();
        int totalCount = 0;
        int successCount = 0;
        int failCount = 0;

        // 遍历所有商户
        for (Long tenantId : tenantLoader.listTenant()) {
            try {
                TenantContextHolder.setTenantId(tenantId);

                // 执行统计汇总
                accStatisticService.summary();
                successCount++;
            } catch (Exception e) {
                log.error("[账户统计汇总]定时任务异常,商家={}", tenantId, e);
                failCount++;
            }
            totalCount++;
        }

        DateTime endTime = DateUtil.date();
        log.info("[账户统计汇总]定时任务执行完成,总数={},成功={},失败={},耗时={}ms",
                 totalCount, successCount, fail, DateUtil.between(startTime, endTime, DateUnit.MS));
    }
}
```

## 并发控制

### 方式一: Redis setNx 简单锁

```java
/**
 * 商户级别的并发控制
 */
protected void checkTask(Long tenantId) {
    String key = "yst:task:name:" + tenantId;
    boolean ifFirst = RedisUtil.setNx(key, LeConstants.COMMON_YES, 6);
    if (!ifFirst) {
        throw new LeException(I18n.getMessage("acc_operate_exits_task"));
    }
}
```

### 方式二: Redisson 分布式锁

```java
/**
 * 全局级别的并发控制
 */
@XxlJob("globalTaskJob")
public void globalTask() {
    RLock lock = RedisUtil.getLock("task:global:lock");
    if (!lock.tryLock()) {
        log.warn("[全局任务]上一个任务进行中,跳过本次执行");
        return;
    }

    try {
        // 执行任务逻辑
        doTask();
    } finally {
        if (lock.isHeldByCurrentThread() && lock.isLocked()) {
            lock.unlock();
        }
    }
}
```

### 方式三: 自定义标识位锁

```java
/**
 * 自定义标识位锁
 */
@XxlJob("customLockJob")
public void customLockJob() {
    String startTime = String.valueOf(System.currentTimeMillis());
    String lockKey = "task:custom:lock:" + startTime;

    if (!RedisUtil.setNx(lockKey, startTime, 10800)) {
        log.warn("[自定义锁任务]已有任务在执行");
        return;
    }

    try {
        // 执行任务逻辑
        doTask();
    } finally {
        RedisUtil.del(lockKey);
    }
}
```

## 任务参数

### 使用任务参数

```java
@XxlJob("dataCleanJob")
public void cleanData() {
    // 获取任务参数
    String param = XxlJobHelper.getJobParam();
    log.info("【定时任务】数据清理任务开始执行,参数:{}", param);

    try {
        // 解析参数
        DataCleanParam cleanParam = JacksonUtil.readValue(param, DataCleanParam.class);

        // 执行清理
        int count = dataService.clean(cleanParam);

        log.info("【定时任务】数据清理任务执行完成,清理数量:{}", count);
    } catch (Exception e) {
        log.error("【定时任务】数据清理任务执行失败", e);
        throw e;
    }
}
```

## 任务分片

### 分片任务处理

```java
@XxlJob("userDataSyncJob")
public void syncUserData() {
    // 获取分片参数
    int shardIndex = XxlJobHelper.getShardIndex();  // 当前分片索引
    int shardTotal = XxlJobHelper.getShardTotal();  // 总分片数

    log.info("【定时任务】用户数据同步任务开始执行,分片:{}/{}", shardIndex, shardTotal);

    try {
        // 查询当前分片的数据
        List<User> users = userService.listBySharding(shardIndex, shardTotal);
        log.info("【定时任务】当前分片用户数量:{}", users.size());

        // 处理数据
        int count = 0;
        for (User user : users) {
            try {
                userService.syncUserData(user);
                count++;
            } catch (Exception e) {
                log.error("【定时任务】同步用户数据失败,userId:{}", user.getId(), e);
            }
        }

        log.info("【定时任务】用户数据同步任务执行完成,分片:{}/{}, 成功数量:{}",
                 shardIndex, shardTotal, count);
    } catch (Exception e) {
        log.error("【定时任务】用户数据同步任务执行失败,分片:{}/{}",
                  shardIndex, shardTotal, e);
        throw e;
    }
}
```

## 任务监控

### 任务执行时间监控

```java
@XxlJob("reportGenerateJob")
public void generateReport() {
    long startTime = System.currentTimeMillis();
    log.info("【定时任务】报表生成任务开始执行");

    try {
        // 生成报表
        reportService.generate();

        long duration = System.currentTimeMillis() - startTime;
        log.info("【定时任务】报表生成任务执行完成,耗时:{}ms", duration);

        // 如果执行时间过长,发送告警
        if (duration > 60000) {  // 超过1分钟
            alertService.send("报表生成任务执行时间过长", duration);
        }
    } catch (Exception e) {
        long duration = System.currentTimeMillis() - startTime;
        log.error("【定时任务】报表生成任务执行失败,耗时:{}ms", duration, e);
        throw e;
    }
}
```

## 任务异常处理

### 部分失败继续执行

```java
@XxlJob("orderStatusSyncJob")
public void syncOrderStatus() {
    log.info("【定时任务】订单状态同步任务开始执行");

    try {
        // 查询需要同步的订单
        List<Order> orders = orderService.listNeedSync();
        log.info("【定时任务】需要同步的订单数量:{}", orders.size());

        int successCount = 0;
        int failCount = 0;
        List<Long> failedOrderIds = new ArrayList<>();

        // 逐个处理,部分失败不影响其他订单
        for (Order order : orders) {
            try {
                orderService.syncStatus(order.getId());
                successCount++;
            } catch (Exception e) {
                log.error("【定时任务】订单状态同步失败,orderId:{}", order.getId(), e);
                failCount++;
                failedOrderIds.add(order.getId());
            }
        }

        log.info("【定时任务】订单状态同步任务执行完成,成功:{}, 失败:{}",
                 successCount, failCount);

        // 如果有失败的,发送告警
        if (failCount > 0) {
            alertService.send("订单状态同步失败", failedOrderIds);
        }
    } catch (Exception e) {
        log.error("【定时任务】订单状态同步任务执行失败", e);
        throw e;
    }
}
```

## 任务重试

### 自定义重试逻辑

```java
@XxlJob("thirdPartyDataSyncJob")
public void syncThirdPartyData() {
    log.info("【定时任务】第三方数据同步任务开始执行");

    int maxRetry = 3;
    int retryCount = 0;
    boolean success = false;

    while (retryCount < maxRetry && !success) {
        try {
            // 调用第三方接口
            thirdPartyService.syncData();
            success = true;
            log.info("【定时任务】第三方数据同步成功");
        } catch (Exception e) {
            retryCount++;
            log.error("【定时任务】第三方数据同步失败,重试次数:{}/{}", retryCount, maxRetry, e);

            if (retryCount < maxRetry) {
                // 等待后重试
                try {
                    Thread.sleep(5000);  // 等待5秒
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            } else {
                // 达到最大重试次数,抛出异常
                throw new LeException("第三方数据同步失败,已重试" + maxRetry + "次");
            }
        }
    }
}
```

## 最佳实践

### 1. 依赖注入使用 @Lazy

```java
@Component
@Slf4j
public class XxxTask {

    @Autowired
    @Lazy
    private XxxService xxxService;

    @Resource
    @Lazy
    private TenantLoader tenantLoader;
}
```

### 2. 任务命名规范

```java
// ✅ 推荐:清晰的任务名称
@XxlJob("dailyDataSyncJob")        // 每日数据同步
@XxlJob("orderTimeoutCheckJob")    // 订单超时检查
@XxlJob("reportGenerateJob")       // 报表生成

// ❌ 避免:模糊的任务名称
@XxlJob("job1")
@XxlJob("task")
```

### 3. 商户遍历必须设置租户上下文

```java
tenantLoader.listTenant().forEach(merchantId -> {
    try {
        // ⚠️ 必须设置租户上下文
        TenantContextHolder.setTenantId(merchantId);

        // 执行业务逻辑
        doSomething();
    } catch (Exception e) {
        log.error("[任务名称]处理异常,商家={}", merchantId, e);
    }
});
```

### 4. 任务日志完整

```java
@XxlJob("dataSyncJob")
public void syncData() {
    // 开始日志
    log.info("[任务名称]定时任务开始执行");

    try {
        // 处理逻辑
        int count = doSync();

        // 成功日志
        log.info("[任务名称]定时任务执行完成,同步数量:{}", count);
    } catch (Exception e) {
        // 失败日志
        log.error("[任务名称]定时任务执行失败", e);
        throw e;
    }
}
```

### 5. 商户级异常处理

```java
// ✅ 推荐:单个商户失败不影响其他商户
tenantLoader.listTenant().forEach(merchantId -> {
    try {
        TenantContextHolder.setTenantId(merchantId);
        doBusiness();
    } catch (Exception e) {
        log.error("[任务名称]商户处理异常,商家={}", merchantId, e);
    }
});

// ❌ 避免:一个商户失败导致整个任务停止
for (Long merchantId : tenantLoader.listTenant()) {
    TenantContextHolder.setTenantId(merchantId);
    doBusiness();  // 如果这里抛异常,后续商户无法执行
}
```

### 6. 任务执行时间控制

```java
@XxlJob("longRunningJob")
public void longRunningTask() {
    long startTime = System.currentTimeMillis();

    try {
        // 执行任务
        doTask();

        long duration = System.currentTimeMillis() - startTime;

        // 监控执行时间
        if (duration > 300000) {  // 超过5分钟
            alertService.send("任务执行时间过长", duration);
        }
    } catch (Exception e) {
        log.error("[任务名称]任务执行失败", e);
        throw e;
    }
}
```

### 7. 并发控制选择

```java
// 场景1: 商户级别的并发控制
protected void checkTask(Long tenantId) {
    String key = "task:name:" + tenantId;
    if (!RedisUtil.setNx(key, "1", 6)) {
        throw new LeException("任务正在执行");
    }
}

// 场景2: 全局级别的并发控制
@XxlJob("globalTask")
public void globalTask() {
    RLock lock = RedisUtil.getLock("task:global:lock");
    if (!lock.tryLock()) {
        log.warn("[任务]已有任务在执行");
        return;
    }
    try {
        doTask();
    } finally {
        if (lock.isHeldByCurrentThread() && lock.isLocked()) {
            lock.unlock();
        }
    }
}
```

## 常见场景

### 场景1: 数据同步任务

```java
@XxlJob("dailyDataSyncJob")
public void syncDailyData() {
    log.info("[每日数据同步]定时任务开始执行");

    try {
        // 1. 同步用户数据
        int userCount = userService.syncFromRemote();
        log.info("[每日数据同步]用户数据同步完成,数量:{}", userCount);

        // 2. 同步订单数据
        int orderCount = orderService.syncFromRemote();
        log.info("[每日数据同步]订单数据同步完成,数量:{}", orderCount);

        // 3. 同步库存数据
        int inventoryCount = inventoryService.syncFromRemote();
        log.info("[每日数据同步]库存数据同步完成,数量:{}", inventoryCount);

        log.info("[每日数据同步]定时任务执行完成");
    } catch (Exception e) {
        log.error("[每日数据同步]定时任务执行失败", e);
        throw e;
    }
}
```

### 场景2: 数据清理任务

```java
@XxlJob("dataCleanJob")
public void cleanExpiredData() {
    log.info("[数据清理]定时任务开始执行");

    try {
        // 1. 清理过期日志
        int logCount = logService.cleanExpired(30);
        log.info("[数据清理]清理过期日志,数量:{}", logCount);

        // 2. 清理过期缓存
        int cacheCount = cacheService.cleanExpired();
        log.info("[数据清理]清理过期缓存,数量:{}", cacheCount);

        // 3. 清理临时文件
        int fileCount = fileService.cleanTemp();
        log.info("[数据清理]清理临时文件,数量:{}", fileCount);

        log.info("[数据清理]定时任务执行完成");
    } catch (Exception e) {
        log.error("[数据清理]定时任务执行失败", e);
        throw e;
    }
}
```

### 场景3: 商户遍历 + 状态更新

```java
@XxlJob("merchantStateUpdateJob")
public void updateMerchantState() {
    log.info("[商户状态更新]定时任务开始执行");

    int totalCount = 0;
    int successCount = 0;
    int failCount = 0;

    for (Long tenantId : tenantLoader.listTenant()) {
        try {
            TenantContextHolder.setTenantId(tenantId);
            merchantService.updateState();
            successCount++;
        } catch (Exception e) {
            log.error("[商户状态更新]处理异常,商家={}", tenantId, e);
            failCount++;
        }
        totalCount++;
    }

    log.info("[商户状态更新]定时任务执行完成,总数={},成功={},失败={}",
             totalCount, successCount, failCount);
}
```

### 场景4: 报表生成任务

```java
@XxlJob("dailyReportJob")
public void generateDailyReport() {
    log.info("[每日报表生成]定时任务开始执行");

    try {
        // 获取昨天的日期
        LocalDate yesterday = LocalDate.now().minusDays(1);

        // 1. 生成销售报表
        reportService.generateSalesReport(yesterday);
        log.info("[每日报表生成]销售报表生成完成,日期:{}", yesterday);

        // 2. 生成库存报表
        reportService.generateInventoryReport(yesterday);
        log.info("[每日报表生成]库存报表生成完成,日期:{}", yesterday);

        // 3. 生成财务报表
        reportService.generateFinanceReport(yesterday);
        log.info("[每日报表生成]财务报表生成完成,日期:{}", yesterday);

        log.info("[每日报表生成]定时任务执行完成");
    } catch (Exception e) {
        log.error("[每日报表生成]定时任务执行失败", e);
        throw e;
    }
}
```

### 场景5: 状态检查任务

```java
@XxlJob("orderStatusCheckJob")
public void checkOrderStatus() {
    log.info("[订单状态检查]定时任务开始执行");

    try {
        // 1. 检查超时未支付订单
        List<Order> unpaidOrders = orderService.listUnpaidTimeout();
        for (Order order : unpaidOrders) {
            orderService.cancelOrder(order.getId());
        }
        log.info("[订单状态检查]取消超时未支付订单,数量:{}", unpaidOrders.size());

        // 2. 检查超时未发货订单
        List<Order> unshippedOrders = orderService.listUnshippedTimeout();
        for (Order order : unshippedOrders) {
            alertService.send("订单超时未发货", order.getId());
        }
        log.info("[订单状态检查]超时未发货订单告警,数量:{}", unshippedOrders.size());

        log.info("[订单状态检查]定时任务执行完成");
    } catch (Exception e) {
        log.error("[订单状态检查]定时任务执行失败", e);
        throw e;
    }
}
```
