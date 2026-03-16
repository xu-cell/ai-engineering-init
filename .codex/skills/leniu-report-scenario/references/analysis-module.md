# 经营分析模块详情

## 分析类型总览

| 分析类型 | Service | 接口数 | 路由前缀 |
|---------|---------|-------|---------|
| 营业额 | ReportAnalysisTurnoverService | 6 | `/summary/analysis/turnover/` |
| 用户 | ReportAnalysisCustService (ORDER=50) | 8 | `/summary/analysis/cust/` |
| 菜品 | ReportAnalysisDishesSaleService (ORDER=51) | 10 | `/summary/analysis/dishes/` |
| 满意度 | ReportAnalysisEvaluateService | 2 | `/summary/analysis/evaluate/` |
| 充值 | ReportAnalysisTurnoverService | 4 | `/summary/analysis/recharge/` |
| 设备 | ReportAnalysisTurnoverService | 2 | `/summary/analysis/device/` |

## 用户活跃度分析

### 分段枚举

- `AnalysisConsumeTimesEnum`：消费次数分段（1-10/10-20/20-30/30-40/40-50/>=50）
- `AnalysisConsumeAmountEnum`：消费金额分段（<200/200-400/400-600/600-800/800-1000/>=1000元）
- `AnalysisConsumeSlienceEnum`：沉默时长分段

### 活跃度 VO

```java
// ReportAnalysisActiveVO
activeNumber/activePercent   // 活跃用户（有消费记录）
keepNumber/keepPercent       // 保留用户（持续消费）
lossNumber/lossPercent       // 流失用户（不再消费）
newNumber/newPercent         // 新增用户（首次消费）
```

## 公共参数类

```java
// ReportBaseParam（所有查询参数基类）
PageDTO page;
LocalDate startDate/endDate;
LocalDate startOrderDate/endOrderDate;
Integer sumType;           // 汇总类型（1按时段/2按日期）
Integer sumDimension;      // 汇总维度
List<Integer> ageTypes;
List<Integer> holidayTypeList;
List<String> exportCols;
LocalDateTime startPayTime/endPayTime;

// ReportNotConsumeDTO（未消费数据）
String statisticDate;   // 统计日期（支付日期）
String orderDate;       // 就餐日期（菜品统计专用）
Long relationId;

// 支付信息编码: "支付方式-支付渠道-支付金额" 如 "1-1-1200;2-4-1200"
// 优惠信息编码: "变动类型,详情类型,金额" 如 "1,1,100;2,11,200"
```

## API 路由总览

| 模块 | 前缀 | 核心接口 |
|------|------|---------|
| 营业收入明细 | `/summary/basic/` | flow/page, cust/page, remote/detail/page, remote/summary/page |
| 订单汇总 | `/summary/order/` | organization/pay/type/classify/mealtime/dishes |
| 账户流水 | `/summary/account/` | flow/cust/psn/organization/operator/consume/recharge/wallet/data |
| 经营分析 | `/summary/analysis/` | turnover(6)/cust(8)/dishes(10)/recharge(4)/device(2)/evaluate(2) |
| 数据修复 | `/summary/fix/` | order, account (限31天) |
| 商户 | `/report/merchant/summary/` | consume, recharge |
