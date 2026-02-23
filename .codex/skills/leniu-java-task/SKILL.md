---
name: leniu-java-task
description: |
  leniu-tengyun-core / leniu-yunshitang 项目定时任务规范。当编写定时任务时使用此skill，包括XXL-Job使用和任务调度规范。

  触发场景：
  - 使用XXL-Job实现分布式定时任务
  - 编写任务处理器（@XxlJob）
  - 商户遍历任务模式
  - 任务并发控制和监控

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-定时任务、leniu-XXL-Job、leniu-@XxlJob、leniu-TenantLoader、leniu-TenantContextHolder、leniu-分布式锁、net.xnzn、leniu-yunshitang
---

# leniu-tengyun-core 定时任务规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **任务框架** | XXL-Job |
| **任务注解** | `@XxlJob` |
| **租户上下文** | `TenantContextHolder` |
| **租户加载器** | `TenantLoader` |
| **跨租户工具** | `Executors` |
| **Redis工具** | `RedisUtil` |
| **异常类** | `LeException` |
| **国际化** | `I18n` |

## 基础使用

### 定时任务模板

```java
import com.xxl.job.core.handler.annotation.XxlJob;
import net.xnzn.framework.data.tenant.TenantContextHolder;
import net.xnzn.core.common.loader.TenantLoader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import lombok.extern.slf4j.Slf4j;

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

### 模式一: 直接使用 TenantLoader（最常用）

```java
@Component
@Slf4j
public class AccSubTimeTask {

    @Autowired
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

```java
import net.xnzn.framework.data.executor.Executors;

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

### 模式三: 商户遍历 + 分布式锁

```java
import org.redisson.api.RLock;

@Component
@Slf4j
public class PayTask {

    @Autowired
    @Lazy
    private TenantLoader tenantLoader;

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

            for (Long tenantId : tenantLoader.listTenant()) {
                try {
                    TenantContextHolder.setTenantId(tenantId);
                    // 处理交易记录
                    tradeRecordService.handlePayingRecords();
                } catch (Exception e) {
                    log.error("[支付定时任务]商户处理异常,tenantId={}", tenantId, e);
                }
            }
        } finally {
            if (lock.isHeldByCurrentThread() && lock.isLocked()) {
                lock.unlock();
            }
        }
    }
}
```

## 并发控制

### 方式一: Redis setNx 简单锁（商户级）

```java
/**
 * 商户级别的并发控制
 */
protected void checkTask(Long tenantId) {
    String key = "yst:task:name:" + tenantId;
    boolean ifFirst = RedisUtil.setNx(key, "1", 6);
    if (!ifFirst) {
        throw new LeException("任务正在执行");
    }
}
```

### 方式二: Redisson 分布式锁（全局级）

```java
@XxlJob("globalTaskJob")
public void globalTask() {
    RLock lock = RedisUtil.getLock("task:global:lock");
    if (!lock.tryLock()) {
        log.warn("[全局任务]上一个任务进行中,跳过");
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

## 任务参数

### 使用任务参数

```java
import com.xxl.job.core.context.XxlJobHelper;

@XxlJob("dataCleanJob")
public void cleanData() {
    // 获取任务参数
    String param = XxlJobHelper.getJobParam();
    log.info("【定时任务】数据清理任务开始执行,参数:{}", param);

    try {
        // 解析参数
        DataCleanParam cleanParam = JacksonUtil.readValue(param, DataCleanParam.class);
        int count = dataService.clean(cleanParam);
        log.info("【定时任务】数据清理任务执行完成,清理数量:{}", count);
    } catch (Exception e) {
        log.error("【定时任务】数据清理任务执行失败", e);
        throw e;
    }
}
```

## 任务分片

```java
@XxlJob("userDataSyncJob")
public void syncUserData() {
    // 获取分片参数
    int shardIndex = XxlJobHelper.getShardIndex();  // 当前分片索引
    int shardTotal = XxlJobHelper.getShardTotal();  // 总分片数

    log.info("【定时任务】用户数据同步,分片:{}/{}", shardIndex, shardTotal);

    // 查询当前分片的数据
    List<User> users = userService.listBySharding(shardIndex, shardTotal);
    // 处理数据...
}
```

## 最佳实践

### 1. 依赖注入使用 @Autowired @Lazy

```java
@Component
@Slf4j
public class XxxTask {

    @Autowired
    @Lazy
    private XxxService xxxService;

    @Autowired
    @Lazy
    private TenantLoader tenantLoader;
}
```

### 2. 商户遍历必须设置租户上下文

```java
tenantLoader.listTenant().forEach(merchantId -> {
    try {
        // ⚠️ 必须设置租户上下文
        TenantContextHolder.setTenantId(merchantId);
        doSomething();
    } catch (Exception e) {
        log.error("[任务]处理异常,商家={}", merchantId, e);
    }
});
```

### 3. 单个商户失败不影响其他商户

```java
// ✅ 推荐
tenantLoader.listTenant().forEach(merchantId -> {
    try {
        TenantContextHolder.setTenantId(merchantId);
        doBusiness();
    } catch (Exception e) {
        log.error("[任务]商户处理异常", e);  // 捕获异常,继续执行
    }
});

// ❌ 避免
for (Long merchantId : tenantLoader.listTenant()) {
    TenantContextHolder.setTenantId(merchantId);
    doBusiness();  // 异常会导致后续商户无法执行
}
```

### 4. 任务日志完整

```java
@XxlJob("dataSyncJob")
public void syncData() {
    log.info("[任务名称]定时任务开始执行");
    try {
        int count = doSync();
        log.info("[任务名称]定时任务执行完成,数量:{}", count);
    } catch (Exception e) {
        log.error("[任务名称]定时任务执行失败", e);
        throw e;
    }
}
```

## 注意事项

- 与 `scheduled-jobs` 技能不同，本技能侧重 XXL-Job 使用规范
- 商户遍历任务必须设置 `TenantContextHolder.setTenantId()`
- 注意控制任务并发，避免重复执行
