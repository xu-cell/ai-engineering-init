
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


## 六、汇总模型速查

| 表 | 维度 | 金额 |
|----|------|------|
| report_sum_mealtime | date/canteen/stall/org/age/mealtime/psn/machine/source | custNum/consumeNum/realAmount/refundAmount |
| report_sum_pay | date/mealtime/canteen/stall/org/age/payChannel/payType | payNum/realAmount/refundAmount |
| report_sum_dishes | date/area/canteen/stall/reportOrderType/mealtime/cook/device/dishes/salesMode/detailType | quantity/realAmount |
| report_sum_pay_mer | tenantId/date/payChannel/payType | custNum/payNum/realAmount/refundAmount |


## 八、公共模块

- **报表错误日志**（report_error_log）：`reportErrorType`(1账户/2订单), `reportErrorState`(1已创建/2已处理)。定时任务 `@XxlJob("reportExceptionHandle")` 自动修复。
- **金额范围设置**：`POST /report/alloc/amount-scope/save`
- **数据修复**：`POST /summary/fix/order|account`（限31天，Redisson 锁 120 分钟）

### 核心枚举

| 枚举 | 值 |
|------|---|
| ReportClassifyEnum | 1组织/2类别/3食堂/4设备/5收入/6渠道/7餐次 |
| ReportPayTypeEnum | 1微信/2支付宝/3系统账户/9现金/20其他 |


## 十、开发检查清单

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
- [ ] GROUP BY / ORDER BY 表达式与 SELECT 完全一致（only_full_group_by）


## 注意

- 标准版退款为独立表（正数金额），**不要使用 consumeType 字段**
- 标准版第二阶段用 `fix()` 按日重算，**不要使用 batchConsume() 增量模式**
- CRUD 用 `leniu-crud-development`，MyBatis 用 `leniu-java-mybatis`，入参用 `leniu-java-report-query-param`，合计行用 `leniu-java-total-line`，餐次用 `leniu-mealtime`
