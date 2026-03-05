---
name: leniu-report-standard-customization
description: |
  leniu-tengyun-core 标准版（core-report 模块）定制报表开发指南。基于独立 report_order_info / report_refund / report_account_flow 等报表基础表实现汇总报表。

  触发场景：
  - 在标准版（core-report 模块）中开发定制汇总报表
  - 基于标准版退款表（report_refund）处理退款统计
  - 开发账户流水报表（日结/操作员/钱包消费/消费汇总）
  - 开发经营分析报表（营业额/用户/菜品/评价/充值/设备分析）
  - 开发商户维度的消费/充值汇总报表

  触发词：标准版报表、core-report、report_refund、report_refund_detail、经营分析、营业额分析、用户活跃度、菜品排行、操作员统计、账户日结、钱包消费汇总、商户消费汇总、ReportOrderConsumeService、ReportAccountConsumeService
---

# leniu 标准版定制报表开发指南

> 详细字段说明见 `references/table-fields.md`，经营分析详情见 `references/analysis-module.md`

## 版本识别（必读）

**本 skill 仅适用于标准版（core-report 独立模块）**。

| 判断方式 | 标准版（本指南） | v5.29 版本 |
|---------|--------------|-----------|
| 目录结构 | `core-report/` 独立模块 | `sys-canteen/` 内嵌 |
| 退款存储 | 独立 `report_refund` 表（**正数**） | 合并入 `report_order_info`（`consumeType=2`，**负数**） |
| 第二阶段 | `fix()` 按日重算 | `batchConsume()` 增量累加 |
| consumeType | **无此字段** | 1=消费，2=退款 |

> v5.29 报表请使用 `leniu-report-customization`。钱包/交易类型枚举同 v5.29，参见该 skill。

---

## 一、报表系统架构

### 1.1 模块结构

```
core-report/.../statistics/
├── config/mq/          # MQ 监听器 + 消费调度 + 线程池
├── order/              # 订单报表（basic/summary/fix/analysis）
├── account/            # 账户流水报表
├── merchant/           # 商户维度报表
├── common/             # 错误日志/定时任务
└── param/vo/constants/ # 公共类
```

### 1.2 三大 MQ 监听器

| 监听器 | Topic/Tag |
|-------|-----------|
| `ReportOrderMQListener` | `order / order-v3-placed` |
| `ReportOrderRefundMQListener` | `order / order-v3-refunded` |
| `ReportAccountMQListener` | `acc / acc-trade-report-queue` |

### 1.3 两阶段消费模型

```
第一阶段（ORDER < 10，同步写基础表）
    ├── ORDER=1  ReportOrderInfoService        → report_order_info
    ├── ORDER=2  ReportOrderDiscountService     → report_order_discount
    ├── ORDER=3  ReportOrderDetailService       → report_order_detail
    ├── ORDER=4  ReportOrderPayService          → report_order_pay
    ├── ORDER=5  ReportRefundService            → report_refund
    ├── ORDER=6  ReportRefundDetailService      → report_refund_detail
    └── ORDER=11 ReportOrderInfoSnapshotService → report_order_info_snapshot

第二阶段（ORDER >= 10，fix 按日重算汇总表，由 Redis 计数触发）
    ├── ORDER=13 ReportSumMealtimeService       → 分餐次汇总
    ├── ORDER=16 ReportSumPayService            → 支付渠道汇总
    ├── ORDER=17 ReportSumPayMerService         → 商户支付汇总
    ├── ORDER=18 ReportSumDishesService         → 菜品销售汇总
    ├── ORDER=50 ReportAnalysisCustService      → 用户分析
    └── ORDER=51 ReportAnalysisDishesSaleService→ 菜品销售分析
```

### 1.4 第二阶段核心逻辑（fix 重算模式）

```java
// ReportConsumerService.consumeOrderReport()
void consumeOrderReport() {
    for (TenantInfo tenant : allTenants) {
        Executors.doInTenant(tenant.getId(), () -> {
            RLock lock = RedisUtil.getLock(REPORT_ORDER_LOCK);
            lock.lock(120, TimeUnit.MINUTES);
            try {
                List<ReportNotConsumeDTO> list = reportOrderInfoService.queryNotConsumeData();
                // 菜品：按 orderDate 分组调 fix
                // 其他：按 statisticDate 分组，依次调所有 ORDER>=10 的 fix()
                reportOrderInfoService.updateOrderMsg(list); // 标记已消费
            } finally { lock.unlock(); }
        });
    }
}
```

**触发机制**：Redis 计数器每条消息递减，达阈值（默认100）触发 + XxlJob 定时兜底。

---

## 二、核心基础表概要

### 2.1 report_order_info（仅存正向订单，无 consumeType）

关键字段：`orderId`(主键), `canteenId/stallId`, `mealtimeType`, `orderType`, `payableAmount/realAmount/refundAmount`(分), `accPayAmount/outPayAmount`, `payTime/orderDate`, `orderRefundState`(1未退/2全退/3部分退), `status`(0未消费/1已消费), `nuClearMode`, `psnType`, `ageType/holidayType`

### 2.2 report_order_detail（菜品明细）

关键字段：`detailId`, `orderId`, `goodsDishesId/goodsDishesName`, `price/totalAmount/realAmount`(分), `quantity`, `salesMode`(1按份/2称重), `detailState`(1正常/2全退/3部分退), `goodsRefundNum`, `refundAmount`, `detailType`

### 2.3 report_refund / report_refund_detail（标准版特有，退款为正数）

**report_refund**：`orderRefundId`(主键), `orderId`(原订单), `realRefundAmount`(**正数**), `applyType`(1退单/2纠错), `checkTime`

**report_refund_detail**：`orderRefundId`, `detailId`, `realQuantity`, `realRefundAmount`(**正数**)

### 2.4 其他基础表

- **report_order_pay**：`orderId`, `payType/payChannel`, `payAmount/refundAmount`
- **report_order_discount**：`orderId`, `changeAmount`, `changeType`(1上浮/2优惠), `changeDetailType`
- **report_order_info_snapshot**：订单交易快照

---

## 三、退款数据处理（核心重点）

### 3.1 存储模型

```
正向订单 → report_order_info（realAmount 为正）
退款记录 → report_refund（realRefundAmount 为正）+ report_refund_detail
同时更新 → report_order_info.orderRefundState + refundAmount
```

### 3.2 净消费金额计算（3种方式）

**方式一：主表 refundAmount 减退（推荐）**
```sql
SELECT SUM(real_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_info WHERE pay_time BETWEEN #{start} AND #{end}
```

**方式二：排除全退**
```sql
WHERE order_refund_state IN (1, 3)
```

**方式三：关联 report_refund**
```sql
SELECT o.canteen_id, SUM(o.real_amount) AS consume, IFNULL(SUM(r.real_refund_amount), 0) AS refund
FROM report_order_info o LEFT JOIN report_refund r ON o.order_id = r.order_id
GROUP BY o.canteen_id
```

### 3.3 菜品级别退款

```sql
SELECT goods_dishes_name,
    SUM(quantity - IFNULL(goods_refund_num, 0)) AS netQuantity,
    SUM(total_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_detail WHERE detail_state IN (1, 3) GROUP BY goods_dishes_name
```

---

## 四、账户流水报表

### 4.1 report_account_flow（流水主表）

核心字段：`flowId`, `custId/orgId`, `payTime`, `flowType`(AccTradeTypeEnum), `flowRealAmount/flowAmount`, `manageCost`, `accTotalBal/accAllBal`, `status`

### 4.2 report_account_summary（用户账户日结表）

联合主键：`statisticDate` + `custId`。期末余额 = 期初 + 充值 - 撤销充值 + 补贴 - 撤销补贴 + 红包 + 赠送 - 消费 - 补扣 + 退款 - 提现 - 清空 - 管理费

### 4.3 AccountConsumeService 实现

| ORDER | 类 | 汇总表 |
|-------|---|-------|
| 1/2 | Flow/FlowDetail | 基础表 |
| 13 | AccountSummary | 日结 |
| 14 | AccountOperator | 操作员 |
| 15-17 | ConsumeSummary/Org/Type | 消费维度 |
| 18 | WalletConsume | 钱包 |
| 19 | SumRechargeMer | 商户充值 |

---

## 五、汇总表开发标准模式

### 5.1 接口与实现

```java
@Service @Slf4j
public class ReportSumXxxService implements ReportOrderConsumeService {
    @Override public int getOrder() { return 15; } // 10-29普通，30+菜品，50+分析

    @Override public void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo) {
        // 标准版：留空，由 fix() 统一处理
    }

    @Override public void fix(ReportBaseParam param) {
        LocalDateTime start = param.getStartPayTime(), end = param.getEndPayTime();
        mapper.delete(Wrappers.<ReportSumXxx>lambdaQuery()
            .between(ReportSumXxx::getStatisticDate, start.toLocalDate(), end.toLocalDate()));
        mapper.initFix(start, end);
    }
}
```

### 5.2 fix SQL 模板

```xml
<insert id="initFix">
    INSERT INTO report_sum_xxx (id, statistic_date, canteen_id, canteen_name,
        order_count, consume_amount, refund_amount, net_amount)
    SELECT #{id}, DATE(a.pay_time), a.canteen_id, a.canteen_name,
        COUNT(*), SUM(a.real_amount),
        SUM(IFNULL(a.refund_amount, 0)),
        SUM(a.real_amount - IFNULL(a.refund_amount, 0))
    FROM report_order_info a
    WHERE a.pay_time BETWEEN #{startTime} AND #{endTime}
    GROUP BY DATE(a.pay_time), a.canteen_id, a.canteen_name
</insert>
```

### 5.3 查询接口（并行 + 权限）

```java
public ReportBaseTotalVO<XxxVO> pageSummary(XxxParam param) {
    MgrUserAuthPO authPO = MgrUserAuthApi.getUserAuthPO();
    CompletableFuture<List<XxxVO>> listF = supplyAsync(() -> mapper.listSummary(param, authPO));
    CompletableFuture<XxxVO> totalF = supplyAsync(() -> mapper.getSummaryTotal(param, authPO));
    CompletableFuture.allOf(listF, totalF).join();
    return new ReportBaseTotalVO<>(PageVO.of(listF.join(), param.getPage()), totalF.join());
}
```

权限 SQL：
```xml
<if test="'-1'.toString() != authPO.roleType.toString()">
    AND EXISTS (SELECT null FROM mgr_role_org it1
        WHERE a.org_id = it1.org_id AND it1.role_id = #{authPO.roleId})
</if>
```

---

## 六、汇总模型速查

| 表 | 维度 | 金额 |
|----|------|------|
| report_sum_mealtime | date/canteen/stall/org/age/mealtime/psn/machine/source | custNum/consumeNum/realAmount/refundAmount |
| report_sum_pay | date/mealtime/canteen/stall/org/age/payChannel/payType | payNum/realAmount/refundAmount |
| report_sum_dishes | date/area/canteen/stall/reportOrderType/mealtime/cook/device/dishes/salesMode/detailType | quantity/realAmount |
| report_sum_pay_mer | tenantId/date/payChannel/payType | custNum/payNum/realAmount/refundAmount |

---

## 七、经营分析模块

| 分析 | Service | 路由前缀 |
|-----|---------|---------|
| 营业额 | ReportAnalysisTurnoverService | `/summary/analysis/turnover/` |
| 用户 | ReportAnalysisCustService (ORDER=50) | `/summary/analysis/cust/` |
| 菜品 | ReportAnalysisDishesSaleService (ORDER=51) | `/summary/analysis/dishes/` |
| 满意度 | ReportAnalysisEvaluateService | `/summary/analysis/evaluate/` |
| 充值 | ReportAnalysisTurnoverService | `/summary/analysis/recharge/` |
| 设备 | ReportAnalysisTurnoverService | `/summary/analysis/device/` |

---

## 八、公共模块

- **报表错误日志**（report_error_log）：`reportErrorType`(1账户/2订单), `reportErrorState`(1已创建/2已处理)。定时任务 `@XxlJob("reportExceptionHandle")` 自动修复。
- **金额范围设置**：`POST /report/alloc/amount-scope/save`
- **数据修复**：`POST /summary/fix/order|account`（限31天，Redisson 锁 120 分钟）

### 核心枚举

| 枚举 | 值 |
|------|---|
| ReportClassifyEnum | 1组织/2类别/3食堂/4设备/5收入/6渠道/7餐次 |
| ReportPayTypeEnum | 1微信/2支付宝/3系统账户/9现金/20其他 |

---

## 九、开发检查清单

### 建表
- [ ] 分组维度 + 金额汇总 + 审计字段（crby/crtime/upby/uptime/del_flag），无 tenant_id

### 实现
- [ ] 实现 `ReportOrderConsumeService`，设 `getOrder()`
- [ ] `fix()` 先删后插（**标准版核心模式**），`consume()` 留空

### 退款（标准版特有）
- [ ] 退款在独立 `report_refund` 表（**正数金额**）
- [ ] 净消费 = `real_amount - IFNULL(refund_amount, 0)`
- [ ] **不要使用 consumeType 字段**

### 查询
- [ ] ReportBaseTotalVO + CompletableFuture 并行 + MgrUserAuthPO 权限

---

## 十、关键代码位置

> 路径前缀均为 `core-report/.../statistics/`

| 类型 | 路径 |
|------|------|
| MQ 监听器 | `config/mq/ReportOrderMQListener.java` / `ReportAccountMQListener.java` |
| 消费调度 | `config/mq/service/ReportConsumerService.java` |
| 订单基础表 | `order/basic/model/ReportOrderInfo.java` / `ReportRefund.java` |
| 汇总 Service | `order/summary/service/ReportSumMealtimeService.java` / `ReportSumPayService.java` |
| 分析 Service | `order/analysis/service/ReportAnalysisTurnoverService.java` |
| 账户 Service | `account/service/ReportAccountSummaryService.java` |
| Fix | `order/fix/controller/ReportFixController.java` |

---

## 注意

- 标准版退款为独立表（正数金额），**不要使用 consumeType 字段**
- 标准版第二阶段用 `fix()` 按日重算，**不要使用 batchConsume() 增量模式**
- CRUD 用 `leniu-crud-development`，MyBatis 用 `leniu-java-mybatis`，入参用 `leniu-java-report-query-param`，合计行用 `leniu-java-total-line`，餐次用 `leniu-mealtime`
