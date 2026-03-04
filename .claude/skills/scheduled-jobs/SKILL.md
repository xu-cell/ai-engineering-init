---
name: scheduled-jobs
description: |
  定时任务开发指南。涵盖 @Scheduled、SnailJob 两种方案，支持分布式任务调度、失败重试、工作流编排。

  触发场景：
  - 每日数据汇总、定期清理等周期性任务
  - 分布式复杂业务、失败重试、可视化管理（SnailJob）
  - 任务分片、Map/MapReduce 分布式计算
  - 广播任务（所有节点执行）

  触发词：定时任务、SnailJob、任务调度、重试机制、工作流、@JobExecutor、@Scheduled、分布式任务、广播任务、分片任务、MapReduce

  核心特性：
  - @Scheduled：简单周期任务、框架内置
  - SnailJob：分布式集群、可视化管理、失败重试、工作流编排
---

# 定时任务开发指南

> 模块位置：`ruoyi-modules/ruoyi-job`

## 方案选择

| 场景 | 推荐 | 理由 |
|------|------|------|
| 简单周期任务（日报、清理） | `@Scheduled` | 内置、无依赖 |
| 分布式/需重试/需监控 | **SnailJob** | 可视化管理、完整重试 |
| 广播（所有节点执行） | **SnailJob** | 支持广播模式 |
| 海量数据分片 | **SnailJob** | 静态分片/Map/MapReduce |

---

## SnailJob 配置

```yaml
# application-dev.yml
snail-job:
  enabled: ${SNAIL_JOB_ENABLED:false}
  group: ${app.id}
  token: ${SNAIL_JOB_TOKEN:SJ_cKqBTPzCsWA3VyuCfFoccmuIEGXjr5KT}
  server:
    host: ${SNAIL_JOB_HOST:127.0.0.1}
    port: ${SNAIL_JOB_PORT:17888}
  namespace: ${spring.profiles.active}
  port: 2${server.port}
```

```java
// ruoyi-common/ruoyi-common-job/.../config/SnailJobConfig.java
@AutoConfiguration
@ConditionalOnProperty(prefix = "snail-job", name = "enabled", havingValue = "true")
@EnableScheduling
@EnableSnailJob
public class SnailJobConfig {}
```

---

## SnailJob 任务类型

### 基础任务（注解方式，推荐）

> 源码：`ruoyi-job/.../snailjob/TestAnnoJobExecutor.java`

```java
import com.aizuda.snailjob.client.job.core.annotation.JobExecutor;
import com.aizuda.snailjob.client.job.core.dto.JobArgs;
import com.aizuda.snailjob.model.dto.ExecuteResult;
import com.aizuda.snailjob.common.log.SnailJobLog;
import com.aizuda.snailjob.common.core.util.JsonUtil;

@Component
@JobExecutor(name = "testJobExecutor")
public class TestAnnoJobExecutor {

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        SnailJobLog.REMOTE.info("任务执行，参数: {}", JsonUtil.toJsonString(jobArgs));
        String jobParams = jobArgs.getJobParams();
        // 业务逻辑...
        return ExecuteResult.success("执行成功");
    }
}
```

### 广播任务

> 源码：`ruoyi-job/.../snailjob/TestBroadcastJob.java`

所有节点都执行，适用于清理本地缓存等场景。

```java
@Component
@JobExecutor(name = "testBroadcastJob")
public class TestBroadcastJob {

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        SnailJobLog.REMOTE.info("广播任务执行");
        // 每个节点都会执行此方法
        return ExecuteResult.success("广播任务执行成功");
    }
}
```

### 静态分片任务

> 源码：`ruoyi-job/.../snailjob/TestStaticShardingJob.java`

按固定规则分片，每个节点处理不同数据范围。

```java
@Component
@JobExecutor(name = "testStaticShardingJob")
public class TestStaticShardingJob {

    // jobParams 格式：起始ID,结束ID（如：1,100000）
    public ExecuteResult jobExecute(JobArgs jobArgs) {
        String[] split = jobArgs.getJobParams().split(",");
        Long fromId = Long.parseLong(split[0]);
        Long toId = Long.parseLong(split[1]);
        SnailJobLog.REMOTE.info("处理 ID 范围: {} - {}", fromId, toId);
        // 处理该范围的数据
        return ExecuteResult.success("分片任务完成");
    }
}
```

**控制台分片配置**：分片0=`1,100000` / 分片1=`100001,200000` / 分片2=`200001,300000`

### Map 任务（动态分片）

> 源码：`ruoyi-job/.../snailjob/TestMapJobAnnotation.java`

运行时动态拆分数据，并行执行。

```java
import com.aizuda.snailjob.client.job.core.annotation.MapExecutor;
import com.aizuda.snailjob.client.job.core.dto.MapArgs;
import com.aizuda.snailjob.client.job.core.MapHandler;

@Component
@JobExecutor(name = "testMapJobAnnotation")
public class TestMapJobAnnotation {

    @MapExecutor  // 无 taskName = 入口方法
    public ExecuteResult doJobMapExecute(MapArgs mapArgs, MapHandler mapHandler) {
        List<List<Integer>> partition = IntStream.rangeClosed(1, 200)
            .boxed()
            .collect(Collectors.groupingBy(i -> (i - 1) / 50))
            .values().stream().toList();
        return mapHandler.doMap(partition, "doCalc");
    }

    @MapExecutor(taskName = "doCalc")  // 子任务
    public ExecuteResult doCalc(MapArgs mapArgs) {
        List<Integer> sourceList = (List<Integer>) mapArgs.getMapResult();
        int total = sourceList.stream().mapToInt(i -> i).sum();
        return ExecuteResult.success(total);
    }
}
```

### MapReduce 任务（分片 + 汇总）

> 源码：`ruoyi-job/.../snailjob/TestMapReduceAnnotation1.java`

在 Map 基础上增加 Reduce 汇总。

```java
import com.aizuda.snailjob.client.job.core.annotation.ReduceExecutor;
import com.aizuda.snailjob.client.job.core.dto.ReduceArgs;

@Component
@JobExecutor(name = "testMapReduceAnnotation1")
public class TestMapReduceAnnotation1 {

    @MapExecutor
    public ExecuteResult rootMapExecute(MapArgs mapArgs, MapHandler mapHandler) {
        // 拆分数据（同 Map 任务）
        return mapHandler.doMap(partition, "doCalc");
    }

    @MapExecutor(taskName = "doCalc")
    public ExecuteResult doCalc(MapArgs mapArgs) {
        List<Integer> sourceList = (List<Integer>) mapArgs.getMapResult();
        return ExecuteResult.success(sourceList.stream().mapToInt(i -> i).sum());
    }

    @ReduceExecutor
    public ExecuteResult reduceExecute(ReduceArgs reduceArgs) {
        List<?> mapResults = reduceArgs.getMapResult();
        int total = mapResults.stream()
            .mapToInt(i -> Integer.parseInt((String) i)).sum();
        SnailJobLog.REMOTE.info("Reduce 汇总，最终总和: {}", total);
        return ExecuteResult.success(total);
    }
}
```

---

## 执行模式对比

| 模式 | 特点 | 适用场景 |
|------|------|---------|
| **集群** | 多节点竞争，只有一个执行 | 订单处理、数据汇总 |
| **广播** | 所有节点都执行 | 清理缓存、刷新配置 |
| **静态分片** | 按固定规则分片 | 已知数据范围的批处理 |
| **Map** | 动态分片 | 运行时确定分片 |
| **MapReduce** | 动态分片 + 结果汇总 | 分布式计算（求和、统计） |

---

## 日志工具

```java
import com.aizuda.snailjob.common.log.SnailJobLog;

SnailJobLog.LOCAL.info("本地日志: {}", msg);   // 输出到控制台/日志文件
SnailJobLog.REMOTE.info("远程日志: {}", msg);  // 上报到 SnailJob 控制台
```

---

## 最佳实践

### 标准任务模板

```java
@Component
@JobExecutor(name = "orderCleanupJob")
public class OrderCleanupJob {

    @Autowired
    private IOrderService orderService;

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        SnailJobLog.REMOTE.info("开始清理过期订单");
        try {
            String params = jobArgs.getJobParams();
            int days = StringUtils.isBlank(params) ? 30 : Integer.parseInt(params);
            int count = orderService.cleanupExpiredOrders(days);
            SnailJobLog.REMOTE.info("清理完成，删除 {} 条", count);
            return ExecuteResult.success("清理 " + count + " 条");
        } catch (Exception e) {
            SnailJobLog.REMOTE.error("清理失败: {}", e.getMessage());
            throw e;  // 抛出异常触发重试
        }
    }
}
```

### 幂等性保证

```java
public ExecuteResult jobExecute(JobArgs jobArgs) {
    String orderId = jobArgs.getJobParams();
    if (paymentService.isSynced(orderId)) {
        return ExecuteResult.success("已同步，跳过");
    }
    paymentService.sync(orderId);
    return ExecuteResult.success("同步成功");
}
```

### 错误处理

```java
// 抛出异常 -> SnailJob 自动重试
throw e;

// 返回 failure -> 不会触发重试（慎用）
return ExecuteResult.failure("失败");
```

---

## 控制台配置

1. **任务管理** -> **新增任务**
2. 任务名称与 `@JobExecutor(name)` 一致
3. 任务类型：集群/广播/静态分片/Map/MapReduce
4. 触发类型：CRON / 固定频率

### 重试策略

| 策略 | 说明 | 场景 |
|------|------|------|
| 固定间隔 | 每次间隔相同 | 网络抖动 |
| 指数退避 | 间隔逐倍增加 | 服务恢复中 |
| CRON | 按表达式重试 | 定点重试 |

---

## 常见问题

| 问题 | 排查步骤 |
|------|---------|
| 任务不执行 | 1.检查 `snail-job.enabled: true` 2.`@JobExecutor(name)` 与控制台一致 3.SnailJob 服务是否启动 |
| @Scheduled vs SnailJob | 简单/<100个任务 -> @Scheduled；需重试/监控/分布式 -> SnailJob |
| 查看任务日志 | 本地 -> 应用日志；远程 -> SnailJob 控制台 -> 任务实例 -> 查看日志 |

---

## 核心文件位置

| 文件 | 路径 |
|------|------|
| 注解方式 | `ruoyi-modules/ruoyi-job/.../snailjob/TestAnnoJobExecutor.java` |
| 类方式 | `ruoyi-modules/ruoyi-job/.../snailjob/TestClassJobExecutor.java` |
| 广播任务 | `ruoyi-modules/ruoyi-job/.../snailjob/TestBroadcastJob.java` |
| 静态分片 | `ruoyi-modules/ruoyi-job/.../snailjob/TestStaticShardingJob.java` |
| Map 任务 | `ruoyi-modules/ruoyi-job/.../snailjob/TestMapJobAnnotation.java` |
| MapReduce | `ruoyi-modules/ruoyi-job/.../snailjob/TestMapReduceAnnotation1.java` |
