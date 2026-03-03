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

## ⚠️ 版本识别（必读）

**本 skill 仅适用于标准版（core-report 独立模块）**。开始前必须确认项目版本。

### 如何判断当前项目版本

**方法一：查看目录结构**
```bash
# 若存在独立的 core-report 模块 → 标准版（使用本 skill）
ls leniu-tengyun-core/core-report/

# 若报表代码在 sys-canteen 内 → v5.29 版本（使用 leniu-report-customization）
ls leniu-tengyun-core/sys-canteen/src/main/java/.../report/statistics/
```

**方法二：查看 git tag**
```bash
git tag --sort=-v:refname | head -5
# 标准版 tag 格式示例：v6.x.x、standard-xxx、core-report-xxx
# v5.29 tag 格式示例：v5.29.x
```

**方法三：检查 report_order_info 表字段**
- 有 `consume_type` 字段 → v5.29 版本，使用 `leniu-report-customization`
- 无 `consume_type`，有独立 `report_refund` 表 → 标准版，使用本 skill

### 两版本核心差异速查

| 特性 | 标准版（本指南） | v5.29 版本 |
|------|--------------|-----------|
| 模块位置 | `core-report` 独立模块 | `sys-canteen` 内嵌 |
| 退款存储 | 独立 `report_refund` / `report_refund_detail` 表 | 合并入 `report_order_info`，`consumeType=2` |
| 退款金额 | **正数**存储，需手动减退 | **负数**存储，直接 SUM 即净额 |
| 第二阶段消费 | 用 `fix()` 按日重算 | 用 `batchConsume()` 增量累加 |
| report_order_info.consumeType | **无此字段** | 1=消费，2=退款 |
| 分析模块 | 完整引擎（6 大分析维度） | 无独立分析模块 |

> **v5.29 报表开发**请使用 `leniu-report-customization` skill。
> **钱包枚举（AccWalletIdEnum）、交易类型枚举（AccTradeTypeEnum）**与 v5.29 相同，参见 `leniu-report-customization`。

---

## 概述

本指南适用于 **标准版**（`core-report` 独立模块）的报表系统。

---

## 一、报表系统架构

### 1.1 模块总览

```
core-report/src/main/java/net/xnzn/core/report/statistics/
├── config/mq/          # 3 大 MQ 监听器 + 消费调度 + 线程池
├── constants/          # 枚举常量
├── order/              # 订单报表（basic/summary/fix/analysis）
├── account/            # 账户流水报表
├── merchant/           # 商户维度报表
├── common/             # 金额范围设置/错误日志/定时任务
├── param/              # 公共参数类
└── vo/                 # 公共 VO
```

### 1.2 三大 MQ 监听器

| 监听器 | Topic/Tag | 说明 |
|-------|-----------|------|
| `ReportOrderMQListener` | `order / order-v3-placed` | 下单消费 |
| `ReportOrderRefundMQListener` | `order / order-v3-refunded` | 退款消费 |
| `ReportAccountMQListener` | `acc / acc-trade-report-queue` | 账户流水 |

### 1.3 两阶段消费模型

```
MQ 消息到达
    ↓
第一阶段（ORDER < 10，同步写基础表）
    ├── ORDER=1  ReportOrderInfoService        → report_order_info
    ├── ORDER=2  ReportOrderDiscountService     → report_order_discount
    ├── ORDER=3  ReportOrderDetailService       → report_order_detail
    ├── ORDER=4  ReportOrderPayService          → report_order_pay
    ├── ORDER=5  ReportRefundService            → report_refund
    ├── ORDER=6  ReportRefundDetailService      → report_refund_detail
    └── ORDER=11 ReportOrderInfoSnapshotService → report_order_info_snapshot
    ↓
第二阶段（ORDER >= 10，按日重算汇总表，由 Redis 计数触发）
    ├── ORDER=13 ReportSumMealtimeService       → 分餐次汇总
    ├── ORDER=16 ReportSumPayService            → 支付渠道汇总
    ├── ORDER=17 ReportSumPayMerService         → 商户支付汇总
    ├── ORDER=18 ReportSumDishesService         → 菜品销售汇总
    ├── ORDER=50 ReportAnalysisCustService      → 用户分析汇总
    └── ORDER=51 ReportAnalysisDishesSaleService→ 菜品销售分析
```

### 1.4 第二阶段核心逻辑（fix 重算模式）

**关键区别**：标准版第二阶段使用 `fix()` 方法按日重算，而非 v5.29 的 `batchConsume()` 增量模式。

```java
// ReportConsumerService.consumeOrderReport()
void consumeOrderReport() {
    for (TenantInfo tenant : allTenants) {
        Executors.doInTenant(tenant.getId(), () -> {
            RLock lock = RedisUtil.getLock(REPORT_ORDER_LOCK);
            try {
                lock.lock(120, TimeUnit.MINUTES);
                List<ReportNotConsumeDTO> list =
                    reportOrderInfoService.queryNotConsumeData();

                // 菜品统计：按就餐日期(orderDate)分组
                list.stream().collect(groupingBy(e -> e.getOrderDate()))
                    .forEach((date, items) -> reportSumDishesService.fix(buildParam(date)));

                // 其他报表：按支付日期(statisticDate)分组
                list.stream().collect(groupingBy(e -> e.getStatisticDate()))
                    .forEach((date, items) -> {
                        for (ReportOrderConsumeService svc : orderConsumeServices) {
                            if (svc.getOrder() >= 10) svc.fix(buildParam(date));
                        }
                    });

                reportOrderInfoService.updateOrderMsg(list); // 标记已消费
            } finally { lock.unlock(); }
        });
    }
}
```

### 1.5 触发机制

**Redis 计数触发**：每条 MQ 消息递减 `yst:%s:order:report:count:key`，达阈值（默认 100）时异步触发消费。

**XxlJob 定时兜底**：`orderReportMsgTask` / `accountReportMsgTask`

**线程池**：单线程 + `DiscardPolicy`，保证顺序性。

---

## 二、核心基础表字段说明

### 2.1 report_order_info（报表订单主表）

> **关键**：标准版中此表**仅存正向订单**，退款数据存在独立的 `report_refund` 表中。无 `consumeType` 字段。

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderId` | Long | 主键（雪花 ID） |
| `machineSn` | String | 设备 SN |
| `orgId/custId` | Long | 组织/人员 ID |
| `nuClearMode` | Integer | 核身方式（1刷卡/2刷脸/3扫码） |
| `sourceType/ifOnline` | Integer | 来源类型/是否在线（1是/2否） |
| `canteenId/stallId` | Long | 食堂/档口 ID |
| `mealtimeType` | Integer | 餐次（1早/2午/3下午茶/4晚/5夜宵） |
| `psnType` | Integer | 人员类别 |
| `payableAmount` | BigDecimal | 应付金额（分） |
| `discountsAmount` | BigDecimal | 优惠金额（分，取负数） |
| `deliveryAmount/packingAmount` | BigDecimal | 配送费/包装费（分） |
| `realAmount` | BigDecimal | 实付金额（分） |
| `accPayAmount/outPayAmount` | BigDecimal | 账户支付/外部支付金额（分） |
| `refundAmount` | BigDecimal | 累计退款金额（分） |
| `orderTime` | LocalDateTime | 下单时间 |
| `orderDate` | LocalDate | 就餐日期 |
| `orderType` | Integer | 订单类型（1当餐/2预订/3报餐/4扫码/5餐桌/6自助/11商城/12超市/21补扣/22外部） |
| `orderRefundState` | Integer | 退款状态（1未退/2已退/3部分退） |
| `payTime` | LocalDateTime | 支付时间 |
| `payType/payChannel` | Integer | 支付方式/渠道 |
| `ageType/holidayType` | Integer | 年龄段/节假日类型 |
| `status` | Integer | 消费状态（0未消费/1已消费） |

### 2.2 report_order_detail（订单菜品明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `detailId` | Long | 明细主键 |
| `orderId` | Long | 关联订单 ID |
| `goodsDishesId/goodsDishesName` | Long/String | 菜品信息 |
| `salePrice/prefPrice/price` | BigDecimal | 售卖价/优惠价/最终价（分） |
| `weightUnit` | BigDecimal | 每份重量（g） |
| `quantity` | Integer | 数量/重量 |
| `salesMode` | Integer | 销售方式（1按份/2称重） |
| `detailType` | Integer | 类别（1菜品/2套餐/3商品/4按键/5补扣/6报餐） |
| `totalAmount/realAmount` | BigDecimal | 总金额/实付（分） |
| `detailState` | Integer | 状态（**1正常/2已退菜/3部分退菜**） |
| `goodsRefundNum` | Integer | 已退数量 |
| `refundAmount` | BigDecimal | 退款金额（分） |

### 2.3 report_refund / report_refund_detail（退款表，标准版特有）

**report_refund**：`orderRefundId`(主键), `orderId`(原始订单), `realRefundAmount`(退款金额，**正数**), `applyTime`, `applyType`(1退单/2纠错), `checkTime`

**report_refund_detail**：`orderRefundId`, `detailId`(菜品详情), `realQuantity`(退单数量), `realRefundAmount`(**正数**)

### 2.4 其他基础表

- **report_order_pay**：`orderId`, `payType`, `payChannel`, `outTradeNo`, `payAmount`, `refundAmount`, `payableAmount`
- **report_order_discount**：`orderId`, `changeAmount`, `changeType`(1上浮/2优惠), `changeDetailType`(1上浮/11菜品优惠/12打折/13累计减免/14固定减免)
- **report_order_info_snapshot**：订单交易快照，字段同 report_order_info 的维度字段子集

---

## 三、退款数据处理（核心重点）

### 3.1 标准版退款存储模型

```
正向订单：orderId → report_order_info (realAmount 为正)
退款记录：orderRefundId → report_refund (realRefundAmount 为正)
                        → report_refund_detail (realRefundAmount 为正)
同时更新：report_order_info.orderRefundState = 2(全退) 或 3(部分退)
         report_order_info.refundAmount = 累计退款金额
         report_order_detail.detailState = 2 或 3
```

### 3.2 退款 MQ 消费

```java
// ReportRefundService.consume() - 仅处理 REFUND 类型
if (!OrderChangeTypeEnum.REFUND.getKey().equals(payload.getChangeType())) return;
ReportRefund reportRefund = BeanUtil.copyProperties(payload.getOrderRefund(), ReportRefund.class);
baseMapper.insert(reportRefund);
// ReportRefundDetailService 同理，批量插入 refundDetailList
```

### 3.3 净消费金额计算（3种方式）

**方式一：主表 refundAmount 减退**（推荐）
```sql
SELECT SUM(real_amount) AS consumeAmount,
       SUM(real_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_info WHERE pay_time BETWEEN #{start} AND #{end}
```

**方式二：排除全退订单**
```sql
SELECT SUM(real_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_info WHERE order_refund_state IN (1, 3)
```

**方式三：关联 report_refund**
```sql
SELECT o.canteen_id, SUM(o.real_amount) AS consume, IFNULL(SUM(r.real_refund_amount), 0) AS refund
FROM report_order_info o LEFT JOIN report_refund r ON o.order_id = r.order_id
GROUP BY o.canteen_id
```

### 3.4 菜品级别退款

```sql
-- 净销量 = 数量 - 已退数量，净金额 = 总金额 - 退款
SELECT goods_dishes_name,
    SUM(quantity - IFNULL(goods_refund_num, 0)) AS netQuantity,
    SUM(total_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_detail WHERE detail_state IN (1, 3) GROUP BY goods_dishes_name
```

---

## 四、账户流水报表

### 4.1 report_account_flow（流水主表）

核心字段：`flowId`(主键), `custId`, `orgId`, `payTime`, `flowType`(AccTradeTypeEnum), `flowRealAmount`, `flowAmount`, `manageCost`, `accTotalBal`(可用余额), `accAllBal`(含冻结), `rechargeSource`, `payChannel/payType`, `status`(0未消费/1已消费)

附加字段：`rechargeOperate`(1单人/2批量/3导入/4赠送), `withdrawSource`(1小程序/2web/3openapi/4注销), `operateSource`(1手动清空/2批量/3定时/4注销)

### 4.2 report_account_flow_detail（流水钱包明细）

字段：`flowId`, `walletId`(1个人/2补贴/4红包), `amount`(转出取负值), `walletBal`, `flowType`, `frozenBalance`, `allWalletBal`

### 4.3 report_account_summary（用户账户日结表，核心）

联合主键：`statisticDate` + `custId`

**期末余额公式**：
```
endAmount = beginAmount
    + rechargeAmount - rechargeRevokeAmount
    + subsidyAmount - subsidyRevokeAmount
    + luckAmount + giftAmount
    - consumeAmount - consumeRepairAmount
    + consumeRefundAmount           ← 退款加回
    - withdrawAmount - clearAmount - manageCostAmount
```

附加维度：充值渠道详分（微信/支付宝/现金/银行/第三方）、提现渠道详分、各钱包余额及冻结金额

### 4.4 AccountConsumeService 实现类

| ORDER | 类名 | 汇总表 |
|-------|-----|-------|
| 1 | ReportAccountFlowService | report_account_flow（基础） |
| 2 | ReportAccountFlowDetailService | report_account_flow_detail（基础） |
| 13 | ReportAccountSummaryService | report_account_summary（日结） |
| 14 | ReportAccountOperatorService | report_account_operator（操作员） |
| 15 | ReportAccountConsumeSummaryService | report_account_consume（消费-个人） |
| 16 | ReportAccountConsumeSumOrgService | 消费-组织 |
| 17 | ReportAccountConsumeSumTypeService | 消费-用户类别 |
| 18 | ReportAccountWalletConsumeService | report_account_wallet_consume（钱包） |
| 19 | ReportSumRechargeMerService | report_sum_recharge_mer（商户充值） |

---

## 五、汇总表开发标准模式

### 5.1 接口与实现模板

```java
public interface ReportOrderConsumeService extends Ordered {
    void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo);
    void fix(ReportBaseParam param);
}

@Service @Slf4j
public class ReportSumXxxService implements ReportOrderConsumeService {
    @Override public int getOrder() { return 15; } // 10-29普通，30+菜品，50+分析

    @Override public void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo) {
        // 标准版：汇总表留空，由 fix() 统一处理
    }

    @Override public void fix(ReportBaseParam param) {
        LocalDateTime start = param.getStartPayTime(), end = param.getEndPayTime();
        // 1. 删除旧数据
        mapper.delete(Wrappers.<ReportSumXxx>lambdaQuery()
            .between(ReportSumXxx::getStatisticDate, start.toLocalDate(), end.toLocalDate()));
        // 2. 从基础表聚合写入
        mapper.initFix(start, end);
    }
}
```

### 5.2 fix SQL 模板（MyBatis XML）

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

### 5.3 查询接口标准模式

```java
public ReportBaseTotalVO<XxxVO> pageSummary(XxxParam param) {
    MgrUserAuthPO authPO = MgrUserAuthApi.getUserAuthPO();
    CompletableFuture<List<XxxVO>> listF = supplyAsync(() -> mapper.listSummary(param, authPO));
    CompletableFuture<XxxVO> totalF = supplyAsync(() -> mapper.getSummaryTotal(param, authPO));
    CompletableFuture.allOf(listF, totalF).join();
    return new ReportBaseTotalVO<>(PageVO.of(listF.join(), param.getPage()), totalF.join());
}
```

**权限控制 SQL**：
```xml
<if test="'-1'.toString() != authPO.roleType.toString()">
    AND EXISTS (SELECT null FROM mgr_role_org it1
        WHERE a.org_id = it1.org_id AND it1.role_id = #{authPO.roleId})
</if>
```

### 5.4 数据修复

```java
// ReportFixController - POST /summary/fix/order
// 限制: 日期范围不超过 31 天
// Redisson 分布式锁 (120 分钟)
// 按 ORDER 排序依次调用所有 Service.fix()
```

---

## 六、汇总模型实体

### 6.1 report_sum_mealtime（分餐次收入汇总）

维度：`statisticDate`, `canteenId/stallId`, `orgId`, `ageType`, `mealtimeType`, `psnType`, `machineSn`, `sourceType`
金额：`custNum`, `consumeNum`, `realAmount`, `refundAmount`, `totalAmount`, `payableAmount`, `discountAmount`

### 6.2 report_sum_pay（按支付渠道收入汇总）

维度：`statisticDate`, `mealtimeType`, `canteenId/stallId`, `orgId`, `ageType`, `payChannel`, `payType`
金额：`payNum`, `realAmount`, `refundAmount`, `totalAmount`, `payableAmount`

### 6.3 report_sum_dishes（菜品/商品汇总表）

维度：`statisticDate`, `areaId`, `canteenId`, `stallId`, `reportOrderType`(101线下/103商超/12自助), `mealtimeType`, `cookId`, `deviceSn`, `goodsDishesId`, `salesMode`, `detailType`
金额：`quantity`, `realAmount`

---

## 七、经营分析模块

### 7.1 分析类型总览

| 分析类型 | Service | 接口数 | 路由前缀 |
|---------|---------|-------|---------|
| 营业额 | ReportAnalysisTurnoverService | 6 | `/summary/analysis/turnover/` |
| 用户 | ReportAnalysisCustService (ORDER=50) | 8 | `/summary/analysis/cust/` |
| 菜品 | ReportAnalysisDishesSaleService (ORDER=51) | 10 | `/summary/analysis/dishes/` |
| 满意度 | ReportAnalysisEvaluateService | 2 | `/summary/analysis/evaluate/` |
| 充值 | ReportAnalysisTurnoverService | 4 | `/summary/analysis/recharge/` |
| 设备 | ReportAnalysisTurnoverService | 2 | `/summary/analysis/device/` |

### 7.2 用户活跃度分析

分段枚举：`AnalysisConsumeTimesEnum`(次数：1-10/10-20/.../≥50)、`AnalysisConsumeAmountEnum`(金额：<200/200-400/.../≥1000元)、`AnalysisConsumeSlienceEnum`(沉默时长)

```java
// ReportAnalysisActiveVO
activeNumber/activePercent   // 活跃用户
keepNumber/keepPercent       // 保留用户
lossNumber/lossPercent       // 流失用户
newNumber/newPercent         // 新增用户
```

---

## 八、商户报表

**report_sum_pay_mer**：`tenantId`(商家ID), `statisticDate`, `payChannel`, `payType`, `custNum`, `payNum`, `realAmount`, `refundAmount`, `totalAmount`

**API**：`POST /report/merchant/summary/consume` (消费汇总) + `/recharge` (充值汇总)

---

## 九、公共模块

### 9.1 报表错误日志（report_error_log）

`reportErrorType`(1账户/2订单), `reportErrorState`(1已创建/2已处理)。异常修复定时任务 `@XxlJob("reportExceptionHandle")` 自动查询未处理记录并调用对应 FixService 修复。

### 9.2 金额范围设置（report_alloc_amount）

`POST /report/alloc/amount-scope/save` 保存金额统计分段范围（不允许重叠）。

### 9.3 核心枚举

| 枚举 | 说明 |
|------|------|
| `ReportClassifyEnum` | 报表分类：1组织/2用户类别/3食堂档口/4设备/5营业收入/6支付渠道/7餐次 |
| `ReportPayTypeEnum` | 支付方式：1微信/2支付宝/3系统账户/4-8银行/9现金/10收钱吧/20其他 |
| `ReportSumTypeEnum` | 汇总类型：1按时段/2按日期 |
| `ReportMsgStatusEnum` | 消费状态：0未消费/1已消费 |

---

## 十、公共参数类

```java
// ReportBaseParam（所有查询参数基类）
PageDTO page; LocalDate startDate/endDate; LocalDate startOrderDate/endOrderDate;
Integer sumType; Integer sumDimension; List<Integer> ageTypes; List<Integer> holidayTypeList;
List<String> exportCols; LocalDateTime startPayTime/endPayTime;

// ReportNotConsumeDTO（未消费数据）
String statisticDate;   // 统计日期（支付日期）
String orderDate;       // 就餐日期（菜品统计专用）
Long relationId;

// 支付信息编码: "支付方式-支付渠道-支付金额" 如 "1-1-1200;2-4-1200"
// 优惠信息编码: "变动类型,详情类型,金额" 如 "1,1,100;2,11,200"
```

---

## 十一、API 路由总览

| 模块 | 前缀 | 核心接口 |
|------|------|---------|
| 营业收入明细 | `/summary/basic/` | flow/page, cust/page, remote/detail/page, remote/summary/page |
| 订单汇总 | `/summary/order/` | organization/pay/type/classify/mealtime/dishes |
| 账户流水 | `/summary/account/` | flow/cust/psn/organization/operator/consume/recharge/wallet/data |
| 经营分析 | `/summary/analysis/` | turnover(6)/cust(8)/dishes(10)/recharge(4)/device(2)/evaluate(2) |
| 数据修复 | `/summary/fix/` | order, account (限31天) |
| 商户 | `/report/merchant/summary/` | consume, recharge |

---

## 十二、开发检查清单

### 建表
- [ ] 分组维度字段（statisticDate、canteenId、stallId 等）+ 金额汇总字段
- [ ] 审计字段（crby/crtime/upby/uptime/del_flag），无 tenant_id

### 实现
- [ ] 实现 `ReportOrderConsumeService`（或 Account 版本），设置 `getOrder()`
- [ ] `fix()` — 先删后插，从基础表聚合（**标准版核心模式**）
- [ ] `consume()` 可留空（汇总表由 fix 重算）

### 退款处理（标准版特有）
- [ ] 退款在独立 `report_refund` 表（**正数金额**）
- [ ] 净消费 = `real_amount - IFNULL(refund_amount, 0)`
- [ ] **不要使用 consumeType 字段**（标准版无此字段）

### 查询接口
- [ ] ReportBaseTotalVO + CompletableFuture 并行 + MgrUserAuthPO 权限

---

## 十三、关键代码位置

| 类型 | 路径 |
|------|------|
| MQ 监听器 | `config/mq/ReportOrderMQListener.java` / `ReportAccountMQListener.java` |
| 消费调度 | `config/mq/service/ReportConsumerService.java` |
| ConsumeService 接口 | `config/mq/ReportOrderConsumeService.java` |
| 线程池/定时任务 | `config/mq/threads/ThreadPoolConfig.java` / `config/mq/job/ReportMsgJob.java` |
| 订单基础表 | `order/basic/model/ReportOrderInfo.java` / `ReportRefund.java` / `ReportOrderDetail.java` |
| 营业收入 Service | `order/basic/service/ReportOrderInfoService.java` |
| Fix | `order/fix/controller/ReportFixController.java` / `service/ReportFixService.java` |
| 汇总 Service | `order/summary/service/ReportSumMealtimeService.java` / `ReportSumPayService.java` / `ReportSumDishesService.java` |
| 分析 Service | `order/analysis/service/ReportAnalysisTurnoverService.java` / `ReportAnalysisCustService.java` |
| 账户 | `account/service/ReportAccountFlowService.java` / `ReportAccountSummaryService.java` |
| 商户 | `merchant/service/ReportSumPayMerService.java` |
| 公共 | `common/model/ReportErrorLog.java` / `common/task/ReportTask.java` / `constants/ReportConstant.java` |

> 路径前缀均为 `core-report/.../statistics/`

---

## 注意

- 本指南适用于**标准版**（core-report），v5.29 版本请使用 `leniu-report-customization`
- 标准版退款为独立表（正数金额），**不要使用 consumeType 字段**
- 标准版第二阶段用 `fix()` 按日重算，**不要使用 batchConsume() 增量模式**
- CRUD 开发用 `leniu-crud-development`，MyBatis 用 `leniu-java-mybatis`，入参设计用 `leniu-java-report-query-param`，合计行用 `leniu-java-total-line`，餐次用 `leniu-mealtime`
