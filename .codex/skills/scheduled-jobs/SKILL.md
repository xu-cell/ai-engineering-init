---
name: scheduled-jobs
description: |
  定时任务开发指南。涵盖 @Scheduled、SnailJob 两种方案，支持分布式任务调度、失败重试、工作流编排。

  触发场景：
  - 每日数据汇总、定期清理等周期性任务（@Scheduled）
  - 分布式复杂业务、失败重试、可视化管理（SnailJob）
  - 任务分片、Map/MapReduce 分布式计算
  - 广播任务（所有节点执行）

  触发词：定时任务、SnailJob、任务调度、重试机制、工作流、@JobExecutor、@Scheduled、分布式任务、广播任务、分片任务、MapReduce

  核心特性：
  - 方案 1：@Scheduled（简单周期任务、框架内置）
  - 方案 2：SnailJob（分布式集群、可视化管理、失败重试、工作流编排）
---

# 定时任务开发指南

> 模块位置：`ruoyi-modules/ruoyi-job`

## 快速索引

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 简单周期任务（日报、清理） | `@Scheduled` | 框架内置、无依赖 |
| 分布式任务、失败重试 | **SnailJob** | 可视化管理、完整重试 |
| 广播任务（所有节点执行） | **SnailJob** | 支持广播模式 |
| 任务分片（海量数据） | **SnailJob** | 支持静态分片/Map/MapReduce |

---

## 一、@Scheduled 方案（简单场景）

### 1.1 快速开始

```java
import org.springframework.scheduling.annotation.Scheduled;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class SimpleScheduledTask {

    // ✅ 每天凌晨 2 点执行
    @Scheduled(cron = "0 0 2 * * ?")
    public void dailyCleanup() {
        log.info("开始清理过期数据");
        // 业务逻辑
    }

    // ✅ 固定频率：每隔 60 秒执行
    @Scheduled(fixedRate = 60000)
    public void syncData() {
        log.info("同步数据");
    }

    // ✅ 固定延迟：上次执行结束后延迟 30 秒
    @Scheduled(fixedDelay = 30000)
    public void checkStatus() {
        log.info("检查状态");
    }

    // ✅ 初始延迟：启动 10 秒后才开始
    @Scheduled(initialDelay = 10000, fixedRate = 60000)
    public void reportStats() {
        log.info("生成统计");
    }
}
```

### 1.2 CRON 表达式

```
┌───────────── 秒 (0-59)
│ ┌───────────── 分钟 (0-59)
│ │ ┌───────────── 小时 (0-23)
│ │ │ ┌───────────── 日期 (1-31)
│ │ │ │ ┌───────────── 月份 (1-12)
│ │ │ │ │ ┌───────────── 星期 (0-7, 0和7都是周日)
* * * * * *
```

| 表达式 | 说明 |
|--------|------|
| `0 0 2 * * ?` | 每天 2:00 |
| `0 */5 * * * ?` | 每 5 分钟 |
| `0 0 */6 * * ?` | 每 6 小时 |
| `0 0 0 * * MON` | 每周一 0:00 |
| `0 0 0 1 * ?` | 每月 1 号 0:00 |

### 1.3 适用场景

- ✅ 任务数 < 100
- ✅ 简单逻辑、无需重试
- ✅ 单机执行即可
- ❌ 不适合：需要可视化管理、失败重试、分布式

---

## 二、SnailJob 方案（分布式场景）

> 源码位置：`ruoyi-modules/ruoyi-job/src/main/java/org/dromara/job/`

### 2.1 核心特性

| 特性 | 说明 |
|------|------|
| 可视化管理 | Web 界面管理任务 |
| 失败重试 | 多策略：指数退避、固定间隔 |
| 执行模式 | 集群、广播、静态分片、Map、MapReduce |
| 任务监控 | 实时日志、告警通知 |
| 工作流编排 | 可视化流程、决策节点 |

### 2.2 配置

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

### 2.3 启用配置

```java
// 位置：ruoyi-common/ruoyi-common-job/.../config/SnailJobConfig.java
@AutoConfiguration
@ConditionalOnProperty(prefix = "snail-job", name = "enabled", havingValue = "true")
@EnableScheduling
@EnableSnailJob
public class SnailJobConfig {
}
```

---

## 三、SnailJob 任务类型

### 3.1 基础任务（注解方式）

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

    /**
     * 任务执行方法
     *
     * @param jobArgs 任务参数（包含 jobParams、executorInfo 等）
     * @return ExecuteResult 执行结果
     */
    public ExecuteResult jobExecute(JobArgs jobArgs) {
        // 本地日志（输出到控制台）
        SnailJobLog.LOCAL.info("任务执行，参数: {}", JsonUtil.toJsonString(jobArgs));

        // 远程日志（上报到 SnailJob 控制台）
        SnailJobLog.REMOTE.info("任务执行，参数: {}", JsonUtil.toJsonString(jobArgs));

        // 获取任务参数
        String jobParams = jobArgs.getJobParams();

        // 业务逻辑...

        return ExecuteResult.success("执行成功");
    }
}
```

### 3.2 基础任务（类方式）

> 源码：`ruoyi-job/.../snailjob/TestClassJobExecutor.java`

```java
import com.aizuda.snailjob.client.job.core.executor.AbstractJobExecutor;
import com.aizuda.snailjob.client.job.core.annotation.JobExecutor;
import com.aizuda.snailjob.client.job.core.dto.JobArgs;
import com.aizuda.snailjob.model.dto.ExecuteResult;
import com.aizuda.snailjob.common.log.SnailJobLog;

@Component
public class TestClassJobExecutor extends AbstractJobExecutor {

    @Override
    protected ExecuteResult doJobExecute(JobArgs jobArgs) {
        SnailJobLog.REMOTE.info("类方式执行器，参数: {}", jobArgs.getJobParams());
        return ExecuteResult.success("类方式执行成功");
    }
}
```

### 3.3 广播任务

> 源码：`ruoyi-job/.../snailjob/TestBroadcastJob.java`

广播任务会在**所有节点**上执行，适用于清理本地缓存等场景。

```java
import cn.hutool.core.util.RandomUtil;
import com.aizuda.snailjob.client.job.core.annotation.JobExecutor;
import com.aizuda.snailjob.client.job.core.dto.JobArgs;
import com.aizuda.snailjob.model.dto.ExecuteResult;
import com.aizuda.snailjob.common.log.SnailJobLog;
import org.springframework.beans.factory.annotation.Value;

@Slf4j
@Component
@JobExecutor(name = "testBroadcastJob")
public class TestBroadcastJob {

    @Value("${snail-job.port}")
    private int clientPort;

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        int randomInt = RandomUtil.randomInt(100);
        SnailJobLog.REMOTE.info("广播任务执行，客户端端口: {}, 随机数: {}", clientPort, randomInt);

        if (randomInt < 50) {
            // 抛出异常会触发重试
            throw new RuntimeException("随机数小于50，任务失败");
        }

        return ExecuteResult.success("广播任务执行成功");
    }
}
```

### 3.4 静态分片任务

> 源码：`ruoyi-job/.../snailjob/TestStaticShardingJob.java`

静态分片将任务按固定数量分成多个分片，每个节点执行不同分片。

```java
import cn.hutool.core.convert.Convert;
import com.aizuda.snailjob.client.job.core.annotation.JobExecutor;
import com.aizuda.snailjob.client.job.core.dto.JobArgs;
import com.aizuda.snailjob.model.dto.ExecuteResult;
import com.aizuda.snailjob.common.log.SnailJobLog;

@Component
@JobExecutor(name = "testStaticShardingJob")
public class TestStaticShardingJob {

    /**
     * 静态分片任务
     * jobParams 格式：起始ID,结束ID（如：1,100000）
     */
    public ExecuteResult jobExecute(JobArgs jobArgs) {
        String jobParams = Convert.toStr(jobArgs.getJobParams());
        SnailJobLog.LOCAL.info("开始执行分片任务，参数: {}", jobParams);

        // 解析分片参数
        String[] split = jobParams.split(",");
        Long fromId = Long.parseLong(split[0]);
        Long toId = Long.parseLong(split[1]);

        SnailJobLog.REMOTE.info("处理 ID 范围: {} - {}", fromId, toId);

        // 业务逻辑：处理该范围的数据
        // processDataRange(fromId, toId);

        return ExecuteResult.success("分片任务完成");
    }
}
```

**控制台配置分片**：
1. 任务类型选择"静态分片"
2. 分片参数设置多组（每组对应一个分片）：
   - 分片 0：`1,100000`
   - 分片 1：`100001,200000`
   - 分片 2：`200001,300000`

### 3.5 Map 任务（动态分片）

> 源码：`ruoyi-job/.../snailjob/TestMapJobAnnotation.java`

Map 任务适用于需要动态拆分数据的场景，先 Map 分片，然后并行执行。

```java
import com.aizuda.snailjob.client.job.core.annotation.JobExecutor;
import com.aizuda.snailjob.client.job.core.annotation.MapExecutor;
import com.aizuda.snailjob.client.job.core.dto.MapArgs;
import com.aizuda.snailjob.client.job.core.MapHandler;
import com.aizuda.snailjob.model.dto.ExecuteResult;
import com.aizuda.snailjob.common.log.SnailJobLog;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Component
@JobExecutor(name = "testMapJobAnnotation")
public class TestMapJobAnnotation {

    /**
     * Map 入口：拆分数据
     * 无 taskName 的 @MapExecutor 是入口方法
     */
    @MapExecutor
    public ExecuteResult doJobMapExecute(MapArgs mapArgs, MapHandler mapHandler) {
        SnailJobLog.REMOTE.info("Map 入口执行");

        // 将 1-200 按每组 50 个分成 4 组
        List<List<Integer>> partition = IntStream.rangeClosed(1, 200)
            .boxed()
            .collect(Collectors.groupingBy(i -> (i - 1) / 50))
            .values()
            .stream()
            .toList();

        // 分发到子任务 doCalc
        return mapHandler.doMap(partition, "doCalc");
    }

    /**
     * Map 子任务：处理每个分片
     */
    @MapExecutor(taskName = "doCalc")
    public ExecuteResult doCalc(MapArgs mapArgs) {
        // 获取当前分片的数据
        List<Integer> sourceList = (List<Integer>) mapArgs.getMapResult();

        SnailJobLog.REMOTE.info("处理分片数据，数量: {}", sourceList.size());

        // 计算当前分片的总和
        int partitionTotal = sourceList.stream().mapToInt(i -> i).sum();

        return ExecuteResult.success(partitionTotal);
    }
}
```

### 3.6 MapReduce 任务（分片 + 汇总）

> 源码：`ruoyi-job/.../snailjob/TestMapReduceAnnotation1.java`

MapReduce 在 Map 基础上增加了 Reduce 汇总阶段。

```java
import com.aizuda.snailjob.client.job.core.annotation.JobExecutor;
import com.aizuda.snailjob.client.job.core.annotation.MapExecutor;
import com.aizuda.snailjob.client.job.core.annotation.ReduceExecutor;
import com.aizuda.snailjob.client.job.core.dto.MapArgs;
import com.aizuda.snailjob.client.job.core.dto.ReduceArgs;
import com.aizuda.snailjob.client.job.core.MapHandler;
import com.aizuda.snailjob.model.dto.ExecuteResult;
import com.aizuda.snailjob.common.log.SnailJobLog;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Component
@JobExecutor(name = "testMapReduceAnnotation1")
public class TestMapReduceAnnotation1 {

    /**
     * Map 入口：拆分数据
     */
    @MapExecutor
    public ExecuteResult rootMapExecute(MapArgs mapArgs, MapHandler mapHandler) {
        SnailJobLog.REMOTE.info("MapReduce 入口执行");

        // 将 1-200 按每组 50 个分成 4 组
        List<List<Integer>> partition = IntStream.rangeClosed(1, 200)
            .boxed()
            .collect(Collectors.groupingBy(i -> (i - 1) / 50))
            .values()
            .stream()
            .toList();

        return mapHandler.doMap(partition, "doCalc");
    }

    /**
     * Map 子任务：计算每个分片的总和
     */
    @MapExecutor(taskName = "doCalc")
    public ExecuteResult doCalc(MapArgs mapArgs) {
        List<Integer> sourceList = (List<Integer>) mapArgs.getMapResult();

        int partitionTotal = sourceList.stream().mapToInt(i -> i).sum();

        SnailJobLog.REMOTE.info("分片计算完成，总和: {}", partitionTotal);

        return ExecuteResult.success(partitionTotal);
    }

    /**
     * Reduce 汇总：合并所有分片结果
     */
    @ReduceExecutor
    public ExecuteResult reduceExecute(ReduceArgs reduceArgs) {
        // 获取所有 Map 子任务的结果
        List<?> mapResults = reduceArgs.getMapResult();

        int reduceTotal = mapResults.stream()
            .mapToInt(i -> Integer.parseInt((String) i))
            .sum();

        SnailJobLog.REMOTE.info("Reduce 汇总完成，最终总和: {}", reduceTotal);

        return ExecuteResult.success(reduceTotal);
    }
}
```

---

## 四、SnailJob 日志工具

### 4.1 日志类型

```java
import com.aizuda.snailjob.common.log.SnailJobLog;

// 本地日志（输出到控制台/日志文件）
SnailJobLog.LOCAL.info("本地日志: {}", message);
SnailJobLog.LOCAL.warn("警告: {}", message);
SnailJobLog.LOCAL.error("错误: {}", message, exception);

// 远程日志（上报到 SnailJob 控制台，可在 Web 界面查看）
SnailJobLog.REMOTE.info("远程日志: {}", message);
SnailJobLog.REMOTE.warn("警告: {}", message);
SnailJobLog.REMOTE.error("错误: {}", message, exception);
```

### 4.2 日志最佳实践

```java
@Component
@JobExecutor(name = "orderProcessJob")
public class OrderProcessJob {

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        String jobParams = jobArgs.getJobParams();

        // 1. 记录任务开始
        SnailJobLog.REMOTE.info("开始处理订单，参数: {}", jobParams);

        try {
            // 2. 业务逻辑
            int count = processOrders(jobParams);

            // 3. 记录成功
            SnailJobLog.REMOTE.info("订单处理完成，处理数量: {}", count);
            return ExecuteResult.success("处理 " + count + " 条订单");

        } catch (Exception e) {
            // 4. 记录失败（同时记录本地和远程）
            SnailJobLog.LOCAL.error("订单处理失败", e);
            SnailJobLog.REMOTE.error("订单处理失败: {}", e.getMessage());

            // 抛出异常触发重试
            throw e;
        }
    }
}
```

---

## 五、执行模式对比

| 模式 | 特点 | 适用场景 |
|------|------|---------|
| **集群** | 多节点竞争，只有一个执行 | 订单处理、数据汇总 |
| **广播** | 所有节点都执行 | 清理缓存、刷新配置 |
| **静态分片** | 按固定规则分片 | 已知数据范围的批处理 |
| **Map** | 动态分片 | 需要运行时确定分片的场景 |
| **MapReduce** | 动态分片 + 结果汇总 | 分布式计算（求和、统计） |

---

## 六、控制台配置

### 6.1 创建任务

1. 访问 SnailJob 控制台
2. **任务管理** → **新增任务**
3. 配置项：
   - 任务名称：`testJobExecutor`（与 `@JobExecutor(name)` 一致）
   - 任务类型：集群/广播/静态分片/Map/MapReduce
   - 触发类型：CRON / 固定频率
   - CRON 表达式：`0 0 2 * * ?`

### 6.2 重试策略

| 策略 | 说明 | 使用场景 |
|------|------|---------|
| 固定间隔 | 每次间隔相同 | 网络抖动 |
| 指数退避 | 间隔逐倍增加 | 服务恢复中 |
| CRON | 按表达式重试 | 定点重试 |

---

## 七、最佳实践

### 7.1 任务实现规范

```java
@Component
@JobExecutor(name = "orderCleanupJob")
public class OrderCleanupJob {

    @Autowired
    private IOrderService orderService;

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        SnailJobLog.REMOTE.info("开始清理过期订单");

        try {
            // 1. 解析参数
            String params = jobArgs.getJobParams();
            int days = StringUtils.isBlank(params) ? 30 : Integer.parseInt(params);

            // 2. 执行业务
            int count = orderService.cleanupExpiredOrders(days);

            // 3. 返回成功
            SnailJobLog.REMOTE.info("清理完成，删除 {} 条订单", count);
            return ExecuteResult.success("清理 " + count + " 条");

        } catch (Exception e) {
            SnailJobLog.REMOTE.error("清理失败: {}", e.getMessage());
            throw e;  // 抛出异常触发重试
        }
    }
}
```

### 7.2 幂等性保证

```java
@Component
@JobExecutor(name = "paymentSyncJob")
public class PaymentSyncJob {

    public ExecuteResult jobExecute(JobArgs jobArgs) {
        String orderId = jobArgs.getJobParams();

        // 1. 幂等检查
        if (paymentService.isSynced(orderId)) {
            SnailJobLog.REMOTE.info("订单 {} 已同步，跳过", orderId);
            return ExecuteResult.success("已同步");
        }

        // 2. 执行同步
        paymentService.sync(orderId);

        return ExecuteResult.success("同步成功");
    }
}
```

### 7.3 错误处理

```java
// ✅ 正确：抛出异常触发重试
public ExecuteResult jobExecute(JobArgs jobArgs) {
    try {
        // 业务逻辑
    } catch (Exception e) {
        SnailJobLog.REMOTE.error("执行失败", e);
        throw e;  // ✅ 抛出异常，SnailJob 会自动重试
    }
}

// ❌ 错误：吞掉异常，不会触发重试
public ExecuteResult jobExecute(JobArgs jobArgs) {
    try {
        // 业务逻辑
    } catch (Exception e) {
        SnailJobLog.REMOTE.error("执行失败", e);
        return ExecuteResult.failure("失败");  // ❌ 不会触发重试
    }
}
```

---

## 八、常见问题

### Q1：任务不执行？

1. 检查 `snail-job.enabled: true`
2. 检查 `@JobExecutor(name)` 与控制台配置一致
3. 检查 SnailJob 服务是否启动
4. 查看日志是否有连接错误

### Q2：@Scheduled vs SnailJob 怎么选？

| 条件 | 选择 |
|------|------|
| 任务 < 100，简单逻辑 | `@Scheduled` |
| 需要重试、监控 | SnailJob |
| 分布式部署 | SnailJob |
| 需要 Web 管理 | SnailJob |

### Q3：如何查看任务日志？

- **本地日志**：查看应用日志文件
- **远程日志**：SnailJob 控制台 → 任务实例 → 查看日志

---

## 九、核心文件位置

| 文件 | 路径 |
|------|------|
| 注解方式示例 | `ruoyi-modules/ruoyi-job/.../snailjob/TestAnnoJobExecutor.java` |
| 类方式示例 | `ruoyi-modules/ruoyi-job/.../snailjob/TestClassJobExecutor.java` |
| 广播任务示例 | `ruoyi-modules/ruoyi-job/.../snailjob/TestBroadcastJob.java` |
| 静态分片示例 | `ruoyi-modules/ruoyi-job/.../snailjob/TestStaticShardingJob.java` |
| Map 任务示例 | `ruoyi-modules/ruoyi-job/.../snailjob/TestMapJobAnnotation.java` |
| MapReduce 示例 | `ruoyi-modules/ruoyi-job/.../snailjob/TestMapReduceAnnotation1.java` |
