# 汇总表定制开发指南

> 本文件按需加载：当需要新建汇总表（实现 MQ 消费 + fix 重算）时读取。

---

## 一、报表系统架构

### 两阶段消费模型

```
MQ 消息到达（下单/退款）
    ↓
第一阶段（ORDER < 10，同步写基础表）
    ├── ORDER=1  ReportOrderInfoService     → report_order_info
    ├── ORDER=3  ReportOrderDetailService   → report_order_detail
    └── ORDER=5  ReportRefundService        → report_refund / report_refund_detail
    ↓
第二阶段（ORDER >= 10，汇总表处理）
    ├── ORDER=10 ReportSumOrganizationService → 组织汇总
    ├── ORDER=11 ReportSumCanteenService      → 食堂汇总
    ├── ORDER=12 ReportSumTypeService         → 用户类别汇总
    ├── ORDER=13 ReportSumPayService          → 支付汇总
    ├── ORDER=14 ReportSumMealtimeService     → 餐次汇总
    ├── ORDER=30 ReportSumDishesService       → 菜品销售汇总
    ├── ORDER=50 ReportAnalysisCustService    → 用户分析
    └── ORDER=51 ReportAnalysisDishesSaleService → 菜品销售分析
```

### v5.29 vs 标准版的第二阶段差异

| 版本 | 第二阶段模式 | 核心方法 |
|------|-------------|---------|
| v5.29 | `batchConsume()` 增量累加 | 分组 → 查存量 → 累加/新建 |
| 标准版 | `fix()` 按日重算 | 先删后插，从基础表重新聚合 |

---

## 二、ReportOrderConsumeService 接口

```java
public interface ReportOrderConsumeService extends Ordered {

    // 单笔消费（第一阶段基础表使用）
    void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo);

    // 批量消费（第二阶段汇总表使用）
    default void batchConsume(List<ReportOrderConsumeDTO> consumeList) { }

    // 批量菜品消费
    default void batchDishesConsume(List<ReportOrderDishesConsumeDTO> consumeList) { }

    // 数据修复：删除时间段内数据并重新聚合
    void fix(ReportBaseParam param);
}
```

---

## 三、实现汇总 Service（v5.29 batchConsume 模式）

```java
@Service
@Slf4j
public class ReportSumXxxService implements ReportOrderConsumeService {

    @Autowired
    private ReportSumXxxMapper reportSumXxxMapper;

    @Override
    public int getOrder() { return 15; } // 10-29普通, 30+菜品, 50+分析

    @Override
    public void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo) {
        // 汇总表通常留空
    }

    @Override
    public void batchConsume(List<ReportOrderConsumeDTO> list) {
        // 1. 按维度分组（使用 KEY_SPLIT = "~~~~"）
        Map<String, List<ReportOrderConsumeDTO>> grouped = list.stream()
            .collect(Collectors.groupingBy(o ->
                o.getPayTime().toLocalDate() + CommonConstants.KEY_SPLIT +
                o.getCanteenId() + CommonConstants.KEY_SPLIT +
                o.getStallId() + CommonConstants.KEY_SPLIT +
                o.getMealtimeType()
            ));

        List<ReportSumXxx> insertList = new ArrayList<>();
        List<ReportSumXxx> updateList = new ArrayList<>();

        for (Map.Entry<String, List<ReportOrderConsumeDTO>> entry : grouped.entrySet()) {
            String[] keys = entry.getKey().split(CommonConstants.KEY_SPLIT, -1);
            LocalDate statisticDate = SafeTypeConvertUtil.parseLocalDateSafe(keys[0]);
            Long canteenId = SafeTypeConvertUtil.parseLongSafe(keys[1]);
            Long stallId = SafeTypeConvertUtil.parseLongSafe(keys[2]);
            Integer mealtimeType = SafeTypeConvertUtil.parseIntSafe(keys[3]);

            // 2. 查询是否存在
            ReportSumXxx existing = reportSumXxxMapper.selectOne(
                Wrappers.<ReportSumXxx>lambdaQuery()
                    .eq(ReportSumXxx::getStatisticDate, statisticDate)
                    .eq(ReportSumXxx::getCanteenId, canteenId)
                    .eq(ReportSumXxx::getStallId, stallId)
                    .eq(ReportSumXxx::getMealtimeType, mealtimeType)
            );

            ReportSumXxx record;
            if (existing == null) {
                record = new ReportSumXxx();
                record.setId(Id.next());
                record.setStatisticDate(statisticDate);
                record.setCanteenId(canteenId);
                record.setStallId(stallId);
                record.setMealtimeType(mealtimeType);
                insertList.add(record);
            } else {
                record = existing;
                updateList.add(record);
            }

            // 3. 累加金额（参考 ReportSumCanteen.generateSummary）
            for (ReportOrderConsumeDTO dto : entry.getValue()) {
                record.setConsumeNum(dto.getCancelFlag() == 1
                    ? record.getConsumeNum() - 1
                    : record.getConsumeNum() + 1);
                record.setRealAmount(record.getRealAmount().add(dto.getRealAmount()));
                record.setRefundAmount(record.getRefundAmount().add(dto.getRealRefundAmount()));
            }
        }

        // 4. 批量写入
        if (CollUtil.isNotEmpty(insertList)) {
            reportSumXxxMapper.insert(insertList);
        }
        if (CollUtil.isNotEmpty(updateList)) {
            reportSumXxxMapper.updateById(updateList);
        }
    }

    @Override
    public void fix(ReportBaseParam param) {
        // 先删后插
        reportSumXxxMapper.delete(Wrappers.<ReportSumXxx>lambdaQuery()
            .between(ReportSumXxx::getStatisticDate,
                param.getStartDate(), param.getEndDate()));
        reportSumXxxMapper.initFix(param.getStartDate(), param.getEndDate());
    }
}
```

---

## 四、实现汇总 Service（标准版 fix 模式）

```java
@Service
@Slf4j
public class ReportSumXxxService implements ReportOrderConsumeService {

    @Override
    public int getOrder() { return 15; }

    @Override
    public void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo) {
        // 标准版留空，由 fix() 统一处理
    }

    @Override
    public void fix(ReportBaseParam param) {
        LocalDateTime start = param.getStartPayTime();
        LocalDateTime end = param.getEndPayTime();
        reportSumXxxMapper.delete(Wrappers.<ReportSumXxx>lambdaQuery()
            .between(ReportSumXxx::getStatisticDate,
                start.toLocalDate(), end.toLocalDate()));
        reportSumXxxMapper.initFix(start, end);
    }
}
```

---

## 五、fix SQL 模板（initFix）

```xml
<insert id="initFix">
    INSERT INTO report_sum_xxx (id, statistic_date, canteen_id, canteen_name,
        stall_id, stall_name, order_count, consume_amount, refund_amount, net_amount,
        crby, crtime, upby, uptime, del_flag)
    SELECT
        #{id},
        DATE(a.pay_time),
        a.canteen_id,
        a.canteen_name,
        a.stall_id,
        a.stall_name,
        COUNT(*),
        SUM(CASE WHEN a.consume_type = 1 THEN a.real_amount ELSE 0 END),
        SUM(CASE WHEN a.consume_type = 2 THEN ABS(a.real_refund_amount) ELSE 0 END),
        SUM(a.real_amount) + SUM(IFNULL(a.real_refund_amount, 0)),
        'system', NOW(), 'system', NOW(), 2
    FROM report_order_info a
    WHERE a.pay_time BETWEEN #{startTime} AND #{endTime}
    GROUP BY DATE(a.pay_time), a.canteen_id, a.canteen_name, a.stall_id, a.stall_name
</insert>
```

**标准版 initFix**（无 consumeType，退款用 refundAmount）：
```xml
<insert id="initFix">
    INSERT INTO report_sum_xxx (...)
    SELECT
        #{id}, DATE(a.pay_time), a.canteen_id, a.canteen_name,
        COUNT(*),
        SUM(a.real_amount),
        SUM(IFNULL(a.refund_amount, 0)),
        SUM(a.real_amount - IFNULL(a.refund_amount, 0))
    FROM report_order_info a
    WHERE a.pay_time BETWEEN #{startTime} AND #{endTime}
    GROUP BY DATE(a.pay_time), a.canteen_id, a.canteen_name
</insert>
```

---

## 六、消费调度器（ReportConsumerService）

```
POST /summary/fix/order → ReportFixController
  ├─ 校验日期范围（≤31天）
  └─ Executors.doInTenant(tenantId, () → ReportFixService.fix(param))
      → 遍历所有 ReportOrderConsumeService 实现类
      → 按 ORDER 排序，逐个调用 fix()

MQ 消费触发 → ReportConsumerService.consumeOrderReport()
  ├─ 获取所有正常商户
  ├─ 对每个商户获取 Redisson 分布式锁
  ├─ 分片查询待消费数据（每批 1000 条）
  └─ 按 ORDER 排序，调用 batchConsume()
```

---

## 七、汇总 Entity 模板

```java
@Data
@TableName("report_sum_xxx")
@ApiModel("XXX汇总表")
public class ReportSumXxx {

    @TableId
    private Long id;

    // 维度字段
    private LocalDate statisticDate;
    private Long areaId, canteenId, stallId, orgId;
    private String areaName, canteenName, stallName, orgFullId, orgFullName;
    private Integer mealtimeType;

    // 统计字段（单位：分，初始值 ZERO）
    private Integer custNum = 0;
    private Integer consumeNum = 0;
    private BigDecimal payableAmount = BigDecimal.ZERO;
    private BigDecimal realAmount = BigDecimal.ZERO;
    private BigDecimal refundAmount = BigDecimal.ZERO;
    private BigDecimal totalAmount = BigDecimal.ZERO;

    // 审计字段
    private String crby, upby;
    private LocalDateTime crtime, uptime;
    private Integer delFlag;
}
```

---

## 八、建表模板

```sql
CREATE TABLE report_sum_xxx (
    id               BIGINT       NOT NULL COMMENT '主键（雪花ID）',
    statistic_date   DATE                  COMMENT '统计日期',
    area_id          BIGINT                COMMENT '区域ID',
    area_name        VARCHAR(128)          COMMENT '区域名称',
    canteen_id       BIGINT                COMMENT '食堂ID',
    canteen_name     VARCHAR(128)          COMMENT '食堂名称',
    stall_id         BIGINT                COMMENT '档口ID',
    stall_name       VARCHAR(128)          COMMENT '档口名称',
    org_id           BIGINT                COMMENT '组织ID',
    org_full_name    VARCHAR(512)          COMMENT '组织全名',
    mealtime_type    INT                   COMMENT '餐次类型',
    cust_num         INT         DEFAULT 0 COMMENT '消费人数',
    consume_num      INT         DEFAULT 0 COMMENT '消费次数',
    payable_amount   DECIMAL(18,2) DEFAULT 0 COMMENT '应付金额（分）',
    real_amount      DECIMAL(18,2) DEFAULT 0 COMMENT '实付金额（分）',
    refund_amount    DECIMAL(18,2) DEFAULT 0 COMMENT '退款金额（分）',
    total_amount     DECIMAL(18,2) DEFAULT 0 COMMENT '合计金额（分）',
    crby             VARCHAR(64)           COMMENT '创建人',
    crtime           DATETIME              COMMENT '创建时间',
    upby             VARCHAR(64)           COMMENT '更新人',
    uptime           DATETIME              COMMENT '更新时间',
    del_flag         INT         DEFAULT 2 COMMENT '删除标识(1-删除,2-正常)',
    PRIMARY KEY (id),
    INDEX idx_statistic_date (statistic_date),
    INDEX idx_canteen (canteen_id, stall_id)
) COMMENT='XXX汇总表';
```

---

## 九、账户流水汇总

实现 `ReportAccountConsumeService` 接口（类似订单版），数据源为 `report_account_flow`。

```sql
SELECT d.wallet_id,
    SUM(CASE WHEN d.flow_type = 110 THEN ABS(d.amount) ELSE 0 END) AS consumeAmount,
    SUM(CASE WHEN d.flow_type = 130 THEN d.amount ELSE 0 END) AS refundAmount
FROM report_account_flow f
JOIN report_account_flow_detail d ON f.flow_id = d.flow_id
WHERE f.pay_time BETWEEN #{startTime} AND #{endTime}
GROUP BY d.wallet_id
```

---

## 十、开发检查清单

### 建表
- [ ] 维度字段 + 金额汇总字段 + 审计字段（crby/crtime/upby/uptime/del_flag），无 tenant_id

### 实现
- [ ] 实现 `ReportOrderConsumeService`，设置 `getOrder()` 值
- [ ] v5.29：实现 `batchConsume()`（分组 → 查存量 → 累加/新建）
- [ ] 标准版：实现 `fix()`（先删后插）
- [ ] 两个版本都实现 `fix()` 方法

### 退款
- [ ] v5.29：`consumeType=2` 退款金额为负数，直接 SUM
- [ ] 标准版：`report_refund` 独立表，退款金额为正数

### SQL 合规（only_full_group_by）
- [ ] SELECT 非聚合字段全部在 GROUP BY 中
- [ ] GROUP BY 表达式与 SELECT 完全一致

### 关键代码位置（标准版 core-report）

| 类型 | 路径前缀 `core-report/.../statistics/` |
|------|------|
| MQ 监听器 | `config/mq/ReportOrderMQListener.java` |
| 消费调度 | `config/mq/service/ReportConsumerService.java` |
| ConsumeService 接口 | `config/mq/ReportOrderConsumeService.java` |
| 食堂汇总 | `order/summary/service/ReportSumCanteenService.java` |
| 餐次汇总 | `order/summary/service/ReportSumMealtimeService.java` |
| Fix Controller | `order/fix/controller/ReportFixController.java` |
