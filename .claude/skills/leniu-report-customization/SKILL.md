---
name: leniu-report-customization
description: |
  leniu-tengyun-core 项目（v5.29）定制报表开发指南。基于 report_order_info / report_order_detail / report_account_flow 等报表基础表实现汇总报表。

  触发场景：
  - 基于订单数据实现定制汇总报表
  - 基于账户流水实现定制汇总报表
  - 处理报表中的退款数据（正向/逆向/部分退）
  - 实现报表的 MQ 消费逻辑和 fix 初始化逻辑
  - 报表金额计算（消费金额减退款）

  触发词：定制报表、汇总报表、report_order_info、report_order_detail、report_account_flow、退款汇总、消费金额统计、订单报表、流水报表
---

# leniu 定制报表开发指南

> 详细字段说明见 `references/table-fields.md`

## 概述

定制报表基于**报表基础表**（由 MQ 消息写入）进行二次汇总：
1. **订单类**：`report_order_info` + `report_order_detail`（消费/退款数据）
2. **账户流水类**：`report_account_flow` + `report_account_flow_detail`（钱包变动数据）

---

## 一、报表系统架构

### 1.1 两阶段消费模型

```
MQ 消息到达（下单/退款）
    ↓
第一阶段（order < 10，同步写基础表）
    ├── ORDER=1  ReportOrderInfoService     → report_order_info
    ├── ORDER=3  ReportOrderDetailService   → report_order_detail
    └── ORDER=5  ReportRefundService        → report_refund / report_refund_detail
    ↓
第二阶段（order >= 10，批量写汇总表，由 Redis 计数触发）
    ├── ORDER=11 ReportSumCanteenService    → report_sum_canteen（食堂汇总）
    └── ORDER=3x ReportSumDishesService     → 菜品销售汇总
```

### 1.2 MQ 消息类型

| 消息 | Topic/Tag | 监听器 |
|------|-----------|--------|
| 下单 | `order / order-v3-placed` | `ReportOrderMQListener` |
| 退款 | `order / order-v3-refunded` | `ReportOrderRefundMQListener` |

### 1.3 触发汇总消费的机制

Redis 计数器 `ORDER_REPORT_COUNT_KEY:{merchantId}`，每来一条 MQ 消息递减，达到阈值时异步触发 `consumeOrderReport()`，从 `report_order_info` 中查出 `status=0`（未消费）的数据，批量调用所有 `order >= 10` 的 Service 的 `batchConsume()`。

---

## 二、核心基础表概要

### 2.1 report_order_info（报表订单主表）

> v5.29 后，正向下单和逆向退款**都存在这张表中**，通过 `consumeType` 区分。

关键字段：`orderId`(主键), `relationOrderId`(退款指向原始订单), `consumeType`(**1=消费,2=退款**), `orderRefundState`(1未退/2全退/3部分退), `realAmount`/`refundAmount`/`walletAmount`/`subsidyAmount`(金额，分), `payTime`, `orderDate`, `mealtimeType`, `orderType`, `canteenId/stallId`, `status`(0未消费/1已消费)

### 2.2 report_order_detail（菜品明细表）

关键字段：`detailId`, `orderId`, `goodsDishesId/goodsDishesName`, `price/totalAmount/realAmount`(分), `quantity`, `detailState`(**1正常/2已退菜/3部分退菜**), `goodsRefundNum`, `refundAmount`, `detailType`(1菜品/2套餐/3商品/4按键/5补扣/6报餐)

### 2.3 report_account_flow（账户流水主表）

关键字段：`flowId`, `custId`, `flowType`(AccTradeTypeEnum), `flowRealAmount/flowAmount`, `accTotalBal/accAllBal`, `payTime`, `status`(0未消费/1已消费)

> `custName`、`mobile` 使用 SM4 加密存储。

### 2.4 report_account_flow_detail（流水钱包明细）

关键字段：`flowId`, `walletId`(AccWalletIdEnum), `amount`(转出取负值), `walletBal`, `frozenBalance`

---

## 三、退款数据处理（核心重点）

### 3.1 退款数据在 report_order_info 中的表现

```
正向订单：orderId=订单ID, consumeType=1, orderRefundState=1
退款记录：orderId=退款单ID, consumeType=2, relationOrderId=原始订单ID
          金额字段全部为负数（realRefundAmount、walletAmount、subsidyAmount 都乘以 -1）
          payTime = 退款审核时间（checkTime）
```

### 3.2 净消费金额计算（3种方式）

**方式一：直接 SUM（推荐）** - 退款金额已为负数

```sql
SELECT SUM(real_amount) AS netAmount,
       SUM(wallet_amount) AS netWalletAmount
FROM report_order_info WHERE pay_time BETWEEN #{startTime} AND #{endTime}
```

**方式二：分别统计消费和退款**

```sql
-- 消费总额（consumeType=1）/ 退款总额（consumeType=2，取ABS）
-- 净额 = 消费总额 - 退款总额
```

**方式三：排除全退订单**

```sql
SELECT SUM(real_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_info
WHERE consume_type = 1 AND order_refund_state IN (1, 3)
```

### 3.3 菜品级别退款

```
detailState=1（正常）/ 2（全退）/ 3（部分退）
菜品净销量 = quantity - IFNULL(goods_refund_num, 0)
菜品净金额 = total_amount - IFNULL(refund_amount, 0)
```

---

## 四、钱包与交易类型枚举

### 4.1 AccWalletIdEnum

| key | 枚举 | 含义 |
|-----|------|------|
| 1 | WALLET | 个人钱包 |
| 2 | SUBSIDY | 补贴钱包 |
| 4 | LUCK_MONEY | 红包 |

### 4.2 AccTradeTypeEnum

| key | 枚举 | 金额方向 |
|-----|------|---------|
| 10/11 | RECHARGE/RECHARGE_GIFT | 正 |
| 12/40/50 | 撤销赠送/撤销充值/撤销补贴 | **负** |
| 20 | SUBSIDY 补贴 | 正 |
| 30 | WITHDRAW 提现 | **负** |
| 60/80/100 | 转出/冻结/补贴清空 | **负** |
| 70/90 | 转入/解冻 | 正 |
| 110/120 | CONSUME/CONSUME_REPAIR | **负** |
| 130 | CONSUME_REFUND 退款 | 正 |
| 131/132 | 账户预扣/预扣退款 | **负**/正 |
| 140/141/142 | 红包/撤销红包/红包清空 | 正/**负**/**负** |

### 4.3 账户流水常用过滤

```java
// 净消费额：消费为负，退款为正 → SUM 即为净消费额（负值）
WHERE wallet_id = #{walletId} AND flow_type IN (110, 130)
```

---

## 五、汇总表开发标准模式

### 5.1 实现 ReportOrderConsumeService 接口

```java
@Service @Slf4j
public class ReportSumXxxService implements ReportOrderConsumeService {
    @Override public int getOrder() { return 15; } // <10基础, 10-29汇总, 30+菜品

    @Override public void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo) {
        // 汇总表通常留空
    }

    @Override public void batchConsume(List<ReportOrderConsumeDTO> list) {
        // 分组 → 查存量 → 累加/新建（见下方模板）
    }

    @Override public void fix(ReportBaseParam param) {
        // 先删后插，从基础表重新聚合
    }
}
```

### 5.2 batchConsume 模板

```java
@Override
public void batchConsume(List<ReportOrderConsumeDTO> list) {
    Map<String, List<ReportOrderConsumeDTO>> grouped = list.stream()
        .collect(Collectors.groupingBy(e ->
            e.getStatisticDate() + "_" + e.getCanteenId() + "_" + e.getStallId()));

    List<ReportSumXxx> insertList = new ArrayList<>(), updateList = new ArrayList<>();

    for (var entry : grouped.entrySet()) {
        ReportOrderConsumeDTO first = entry.getValue().get(0);
        ReportSumXxx existing = mapper.selectOne(Wrappers.<ReportSumXxx>lambdaQuery()
            .eq(ReportSumXxx::getStatisticDate, first.getStatisticDate())
            .eq(ReportSumXxx::getCanteenId, first.getCanteenId())
            .eq(ReportSumXxx::getStallId, first.getStallId()));

        if (existing == null) {
            ReportSumXxx record = new ReportSumXxx();
            record.setId(Id.next());
            // 设置维度 + 累加金额
            insertList.add(record);
        } else {
            // existing.setXxxAmount(existing.getXxxAmount().add(delta));
            updateList.add(existing);
        }
    }
    if (CollUtil.isNotEmpty(insertList)) { /* 批量插入 */ }
    if (CollUtil.isNotEmpty(updateList)) { /* 批量更新 */ }
}
```

### 5.3 fix 方法 + SQL 模板

```java
@Override
public void fix(ReportBaseParam param) {
    mapper.delete(Wrappers.<ReportSumXxx>lambdaQuery()
        .between(ReportSumXxx::getStatisticDate,
            param.getStartTime().toLocalDate(), param.getEndTime().toLocalDate()));
    mapper.initFix(null, param.getStartTime(), param.getEndTime());
}
```

```xml
<insert id="initFix">
    INSERT INTO report_sum_xxx (id, statistic_date, canteen_id, canteen_name,
        order_count, consume_amount, refund_amount, net_amount)
    SELECT #{id}, DATE(pay_time), canteen_id, canteen_name,
        COUNT(*),
        SUM(CASE WHEN consume_type = 1 THEN real_amount ELSE 0 END),
        SUM(CASE WHEN consume_type = 2 THEN ABS(real_refund_amount) ELSE 0 END),
        SUM(real_amount) + SUM(IFNULL(real_refund_amount, 0))
    FROM report_order_info
    WHERE pay_time BETWEEN #{startTime} AND #{endTime}
    GROUP BY DATE(pay_time), canteen_id, canteen_name
</insert>
```

---

## 六、数据权限集成

- Service 注入 `MgrAuthV2Api` 和 `ReportDataPermissionService`
- 查询/导出方法首行调用 `mgrAuthApi.getUserAuthPO()` + `reportDataPermissionService.getDataPermission(authPO)`
- Mapper 签名携带 `@Param("authPO")` 和 `@Param("dataPermission")`
- XML `baseWhere` 末尾引入 `<include refid="net.xnzn.core.report.statistics.common.mapper.ReportDataPermissionMapper.dataPermission"/>`

---

## 七、查询接口标准模式（三并行 CompletableFuture）

```java
public PageVO<XxxVO> pageSummary(XxxParam param) {
    CompletableFuture<Long> countF = CompletableFuture.supplyAsync(() -> mapper.selectCount(param));
    CompletableFuture<List<XxxVO>> listF = CompletableFuture.supplyAsync(() -> mapper.selectPageList(param));
    CompletableFuture<XxxTotalVO> totalF = CompletableFuture.supplyAsync(() -> mapper.selectTotal(param));
    CompletableFuture.allOf(countF, listF, totalF).join();

    PageVO<XxxVO> pageVO = new PageVO<>();
    pageVO.setTotal(countF.join());
    pageVO.setList(listF.join());
    pageVO.setTotalLine(totalF.join());
    return pageVO;
}
```

---

## 八、账户流水汇总报表

实现 `ReportAccountConsumeService` 接口（类似 ReportOrderConsumeService），数据源为 `report_account_flow`。

```sql
-- 按钱包类型统计消费/退款
SELECT d.wallet_id,
    SUM(CASE WHEN d.flow_type = 110 THEN ABS(d.amount) ELSE 0 END) AS consume_amount,
    SUM(CASE WHEN d.flow_type = 130 THEN d.amount ELSE 0 END) AS refund_amount
FROM report_account_flow f
JOIN report_account_flow_detail d ON f.flow_id = d.flow_id
WHERE f.pay_time BETWEEN #{startTime} AND #{endTime}
GROUP BY d.wallet_id
```

流水退款：`flowType=110` amount 为负，`flowType=130` amount 为正，直接 SUM 即净额。

---

## 九、MySQL only_full_group_by 规范（必须遵守）

> 生产环境 MySQL 开启了 `sql_mode=only_full_group_by`，所有报表 SQL 必须满足此规则，否则报 `BadSqlGrammarException`。

### 核心规则

**SELECT 中所有非聚合字段，必须出现在 GROUP BY 中，且表达式必须完全一致。**

### 常见错误：GROUP BY 表达式与 SELECT 不一致

```sql
-- ❌ 错误：SELECT 用 DATE_FORMAT，GROUP BY 用 DATE
SELECT
    DATE_FORMAT(atr.trade_time, '%Y-%m-%d') AS statisticDate,
    SUM(atr.amount) AS totalAmount
FROM acc_trade atr
GROUP BY DATE(atr.trade_time)          -- ❌ 表达式不同，触发 only_full_group_by 报错
ORDER BY DATE(atr.trade_time) ASC

-- ✅ 正确：GROUP BY 与 SELECT 使用完全相同的表达式
SELECT
    DATE_FORMAT(atr.trade_time, '%Y-%m-%d') AS statisticDate,
    SUM(atr.amount) AS totalAmount
FROM acc_trade atr
GROUP BY DATE_FORMAT(atr.trade_time, '%Y-%m-%d')   -- ✅ 与 SELECT 一致
ORDER BY DATE_FORMAT(atr.trade_time, '%Y-%m-%d') ASC
```

### 常见错误：SELECT 包含非聚合字段未加入 GROUP BY

```sql
-- ❌ 错误：canteen_name 未在 GROUP BY 中
SELECT
    DATE(pay_time) AS orderDate,
    canteen_name,                          -- ❌ 非聚合字段，未在 GROUP BY
    SUM(real_amount) AS netAmount
FROM report_order_info
GROUP BY DATE(pay_time), canteen_id

-- ✅ 正确：所有非聚合字段都加入 GROUP BY
SELECT
    DATE(pay_time) AS orderDate,
    canteen_name,
    SUM(real_amount) AS netAmount
FROM report_order_info
GROUP BY DATE(pay_time), canteen_id, canteen_name  -- ✅ 包含 canteen_name
```

### fix SQL 中的正确写法

```xml
<insert id="initFix">
    INSERT INTO report_sum_xxx (id, statistic_date, canteen_id, canteen_name,
        order_count, consume_amount, net_amount)
    SELECT
        #{id},
        DATE(pay_time),              -- SELECT 用 DATE(pay_time)
        canteen_id,
        canteen_name,
        COUNT(*),
        SUM(CASE WHEN consume_type = 1 THEN real_amount ELSE 0 END),
        SUM(real_amount)
    FROM report_order_info
    WHERE pay_time BETWEEN #{startTime} AND #{endTime}
    GROUP BY DATE(pay_time), canteen_id, canteen_name  -- ✅ 与 SELECT 完全一致
</insert>
```

### 开发检查项

- [ ] SELECT 每个非聚合字段，在 GROUP BY 中都有对应
- [ ] GROUP BY 的表达式与 SELECT 中的**完全一致**（`DATE_FORMAT(x, 'Y-m-d')` ≠ `DATE(x)`）
- [ ] ORDER BY 也使用相同表达式（保持一致）

---

## 十、开发检查清单

### 建表
- [ ] 分组维度字段 + 金额汇总字段 + 审计字段（crby/crtime/upby/uptime/del_flag），无 tenant_id

### 实现
- [ ] 实现 `ReportOrderConsumeService`（或 Account 版本），设置 `getOrder()`
- [ ] `batchConsume()` — 分组 → 查存量 → 累加/新建
- [ ] `fix()` — 先删后插，从基础表重新聚合

### 退款处理
- [ ] 选择退款计算方式（直接 SUM 负数 / 分别统计 / 排除全退）
- [ ] 菜品退款关注 `detailState` 和 `goodsRefundNum`

### 查询接口
- [ ] 分页 + 合计行（PageVO + TotalVO）+ 三并行 CompletableFuture

### SQL 合规（only_full_group_by）
- [ ] SELECT 非聚合字段全部在 GROUP BY 中
- [ ] GROUP BY 表达式与 SELECT 完全一致

---

## 十一、关键代码位置

| 类型 | 路径 |
|------|------|
| 下单 MQ 监听器 | `sys-canteen/.../report/statistics/config/mq/ReportOrderMQListener.java` |
| 退款 MQ 监听器 | `sys-canteen/.../report/statistics/config/mq/ReportOrderRefundMQListener.java` |
| 汇总消费调度 | `sys-canteen/.../report/statistics/config/mq/service/ReportConsumerService.java` |
| ConsumeService 接口 | `sys-canteen/.../report/statistics/config/mq/ReportOrderConsumeService.java` |
| 食堂汇总参考实现 | `sys-canteen/.../report/statistics/order/summary/service/ReportSumCanteenService.java` |
| Fix Controller | `sys-canteen/.../report/statistics/order/fix/controller/ReportFixController.java` |
| ReportOrderInfo 实体 | `sys-canteen/.../report/statistics/order/basic/model/ReportOrderInfo.java` |
| AccTradeTypeEnum | `sys-canteen/.../account/v3/constants/AccTradeTypeEnum.java` |
| AccWalletIdEnum | `sys-canteen/.../account/v3/constants/AccWalletIdEnum.java` |

---

## 注意

- CRUD 开发（非报表）请使用 `leniu-crud-development`
- MyBatis XML 编写规范请使用 `leniu-java-mybatis`
- 报表入参设计请使用 `leniu-java-report-query-param`
- 合计行实现请使用 `leniu-java-total-line`
- 餐次过滤请使用 `leniu-mealtime`
