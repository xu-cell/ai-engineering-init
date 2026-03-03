---
name: leniu-report-customization
description: |
  leniu-tengyun-core 项目定制报表开发指南。基于 report_order_info / report_order_detail / report_account_flow 等报表基础表实现汇总报表。

  触发场景：
  - 基于订单数据实现定制汇总报表
  - 基于账户流水实现定制汇总报表
  - 处理报表中的退款数据（正向/逆向/部分退）
  - 实现报表的 MQ 消费逻辑和 fix 初始化逻辑
  - 报表金额计算（消费金额减退款）

  触发词：定制报表、汇总报表、report_order_info、report_order_detail、report_account_flow、退款汇总、消费金额统计、订单报表、流水报表
---

# leniu 定制报表开发指南（v5.29 版）

## ⚠️ 版本识别（必读）

**本 skill 仅适用于 v5.29 版本（报表内嵌于 sys-canteen 模块）**。开始前必须确认项目版本。

### 如何判断当前项目版本

**方法一：查看目录结构**
```bash
# 若报表代码在 sys-canteen 内 → v5.29 版本（使用本 skill）
ls leniu-tengyun-core/sys-canteen/src/main/java/.../report/statistics/

# 若存在独立的 core-report 模块 → 标准版（使用 leniu-report-standard-customization）
ls leniu-tengyun-core/core-report/
```

**方法二：查看 git tag**
```bash
git tag --sort=-v:refname | head -5
# v5.29.x tag → v5.29 版本，使用本 skill
```

**方法三：检查 report_order_info 表字段**
- 有 `consume_type` 字段（1=消费，2=退款）→ v5.29 版本，使用本 skill
- 无 `consume_type`，有独立 `report_refund` 表 → 标准版，使用 `leniu-report-standard-customization`

### 两版本核心差异速查

| 特性 | v5.29 版本（本指南） | 标准版 |
|------|------------------|--------|
| 模块位置 | `sys-canteen` 内嵌 | `core-report` 独立模块 |
| 退款存储 | 合并入 `report_order_info`，`consumeType=2` | 独立 `report_refund` 表 |
| 退款金额 | **负数**存储，直接 SUM 即净额 | **正数**存储，需手动减退 |
| 第二阶段消费 | 用 `batchConsume()` 增量累加 | 用 `fix()` 按日重算 |
| report_order_info.consumeType | **1=消费，2=退款** | 无此字段 |
| 分析模块 | 无独立分析模块 | 完整引擎（6 大分析维度） |

> **标准版报表开发**请使用 `leniu-report-standard-customization` skill。

---

## 概述

本项目（v5.29）的定制报表基于**报表基础表**（由 MQ 消息写入）进行二次汇总。核心数据源有两类：
1. **订单类**：`report_order_info` + `report_order_detail`（消费/退款数据）
2. **账户流水类**：`report_account_flow` + `report_account_flow_detail`（钱包变动数据）

定制报表的本质是：从基础表中按维度聚合数据，写入自定义汇总表。

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

## 二、核心基础表字段说明

### 2.1 report_order_info（报表订单主表）

> **关键**：v5.29 后，正向下单和逆向退款的数据**都存在这张表中**，通过 `consumeType` 区分。

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderId` | Long | 主键。正向=订单ID，退款=退款单ID |
| `relationOrderId` | Long | 关联订单ID（退款记录指向原始订单） |
| `consumeType` | Integer | **1=消费，2=退款** |
| `orderRefundState` | Integer | **1=未退单，2=已退单（全退），3=部分退单** |
| `payableAmount` | BigDecimal | 应付金额（分） |
| `realAmount` | BigDecimal | 实付金额（分） |
| `refundAmount` | BigDecimal | 累计退款金额（分） |
| `realRefundAmount` | BigDecimal | 实际退款金额（分，退款记录为负数） |
| `walletAmount` | BigDecimal | 个人钱包支付金额（分） |
| `subsidyAmount` | BigDecimal | 补贴钱包支付金额（分） |
| `redEnvelopeAmount` | BigDecimal | 红包支付金额（分） |
| `accPayAmount` | BigDecimal | 账户支付金额（分） |
| `outPayAmount` | BigDecimal | 外部支付金额（分） |
| `payTime` | LocalDateTime | 支付时间（退款=审核时间） |
| `orderTime` | LocalDateTime | 下单时间 |
| `orderDate` | LocalDate | 就餐日期 |
| `status` | Integer | 消费状态：0=未消费，1=已消费 |
| `mealtimeType` | Integer | 餐次类型 |
| `orderType` | Integer | 订单类型（1当餐/2预订/3报餐/4扫码/5餐桌/6自助/11商城/12超市/21补扣/22外部） |
| `canteenId/canteenName` | Long/String | 食堂 |
| `stallId/stallName` | Long/String | 档口 |
| `areaId/areaName` | Long/String | 区域 |
| `custId/custName/custNum` | - | 用户信息 |
| `orgId/orgFullId/orgName/orgFullName` | - | 组织信息 |
| `payType` | Integer | 支付方式 |
| `payChannel` | Integer | 支付渠道 |
| `nuClearMode` | Integer | 核身方式（1刷卡/2刷脸/3扫码） |
| `sourceType` | Integer | 来源类型 |
| `ifOnline` | Integer | 是否在线订单（1是/2否） |
| `psnType/psnTypeName` | Integer/String | 用户类别 |
| `personType` | Integer | 人员归类（1职工/2患者/3陪护/4其他，医院版） |

### 2.2 report_order_detail（报表订单菜品明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `detailId` | Long | 明细主键 |
| `orderId` | Long | 关联订单ID |
| `goodsDishesId/goodsDishesName` | Long/String | 菜品信息 |
| `salePrice` | BigDecimal | 售卖价格（分） |
| `prefPrice` | BigDecimal | 优惠价格（分） |
| `price` | BigDecimal | 计算价格（分，最终价格） |
| `quantity` | Integer | 数量/重量 |
| `totalAmount` | BigDecimal | 订单详情总金额（分） |
| `realAmount` | BigDecimal | 实际付款金额（分） |
| `detailState` | Integer | **1=正常，2=已退菜（全退），3=部分退菜** |
| `goodsRefundNum` | Integer | 商品已退数量 |
| `refundAmount` | BigDecimal | 商品退款金额（分） |
| `detailType` | Integer | 明细类别（1菜品/2套餐/3商品/4按键/5补扣/6报餐） |
| `costPrice` | BigDecimal | 成本价格 |

### 2.3 report_account_flow（账户变动流水主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `flowId` | Long | 主键（雪花ID） |
| `custId` | Long | 人员ID |
| `flowType` | Integer | 交易类型（AccTradeTypeEnum） |
| `flowRealAmount` | BigDecimal | 实际交易金额 |
| `flowAmount` | BigDecimal | 交易金额 |
| `accTotalBal` | BigDecimal | 所有钱包可用余额之和（不含冻结） |
| `accAllBal` | BigDecimal | 所有钱包总余额（含冻结） |
| `payTime` | LocalDateTime | 支付时间 |
| `ordTime` | LocalDateTime | 订单时间 |
| `status` | Integer | 消费状态：0=未消费，1=已消费 |
| `manageCost` | BigDecimal | 管理费 |
| `rechargeSource` | Integer | 充值来源 |
| `payChannel` | Integer | 支付渠道 |
| `payType` | Integer | 支付方式 |

> 注意：`custName`、`mobile`、`mobileSuffix` 使用 SM4 加密存储。

### 2.4 report_account_flow_detail（账户流水钱包明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Long | 自增主键 |
| `flowId` | Long | 关联主流水 |
| `walletId` | Long | 钱包类型（AccWalletIdEnum） |
| `flowType` | Integer | 交易类型 |
| `amount` | BigDecimal | 本钱包支付金额（转出类型取负值） |
| `walletBal` | BigDecimal | 本钱包可用余额 |
| `allWalletBal` | BigDecimal | 本钱包总余额（含冻结） |
| `frozenBalance` | BigDecimal | 冻结余额 |
| `payTime` | LocalDateTime | 支付时间 |

---

## 三、退款数据处理（核心重点）

### 3.1 退款数据在 report_order_info 中的表现

退款记录作为**独立行**写入 `report_order_info`：

```
正向订单：orderId=订单ID, consumeType=1, orderRefundState=1
退款记录：orderId=退款单ID, consumeType=2, relationOrderId=原始订单ID
          金额字段全部为负数（realRefundAmount、walletAmount、subsidyAmount、redEnvelopeAmount 都乘以 -1）
          payTime = 退款审核时间（checkTime）
```

### 3.2 orderRefundState 的三种状态

| 值 | 含义 | 说明 |
|----|------|------|
| 1 | 未退单 | 正常消费，无退款 |
| 2 | 已退单（全退） | 整单退款 |
| 3 | 部分退单 | 部分菜品退款 |

### 3.3 汇总报表中计算"净消费金额"的标准模式

**方式一：直接利用 consumeType 和负数金额**（推荐）

因为退款记录的金额已经是负数，所以直接 SUM 即可得到净额：

```sql
-- 净消费金额 = SUM(所有记录的 realAmount)
-- 因为：consumeType=1 的 realAmount 为正，consumeType=2 的相关金额为负
SELECT
    SUM(real_amount) AS netAmount,           -- 净实付
    SUM(wallet_amount) AS netWalletAmount,   -- 净个人钱包消费
    SUM(subsidy_amount) AS netSubsidyAmount  -- 净补贴消费
FROM report_order_info
WHERE pay_time BETWEEN #{startTime} AND #{endTime}
```

**方式二：分别统计消费和退款**

```sql
-- 消费总额（仅正向订单）
SELECT SUM(real_amount) FROM report_order_info
WHERE consume_type = 1
  AND pay_time BETWEEN #{startTime} AND #{endTime}

-- 退款总额（仅退款记录，金额为负数，取绝对值）
SELECT SUM(ABS(real_refund_amount)) FROM report_order_info
WHERE consume_type = 2
  AND pay_time BETWEEN #{startTime} AND #{endTime}

-- 净额 = 消费总额 - 退款总额
```

**方式三：排除全退订单，处理部分退**

```sql
-- 排除全退订单，只统计有效消费
SELECT SUM(real_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_info
WHERE consume_type = 1
  AND order_refund_state IN (1, 3)  -- 未退单 + 部分退单
  AND pay_time BETWEEN #{startTime} AND #{endTime}
```

### 3.4 report_order_detail 的退款处理

```
detailState=1（正常）：quantity 为原始购买数量
detailState=2（已退菜全退）：该菜品已完全退款
detailState=3（部分退菜）：goodsRefundNum 为已退数量，refundAmount 为退款金额

菜品净销量 = quantity - IFNULL(goods_refund_num, 0)
菜品净金额 = total_amount - IFNULL(refund_amount, 0)
```

---

## 四、钱包与交易类型枚举

### 4.1 AccWalletIdEnum（钱包类型）

| key | 枚举 | 含义 |
|-----|------|------|
| 1 | WALLET | 个人钱包 |
| 2 | SUBSIDY | 补贴钱包 |
| 4 | LUCK_MONEY | 红包 |

### 4.2 AccTradeTypeEnum（交易类型）

| key | 枚举 | 含义 | 金额方向 |
|-----|------|------|---------|
| 10 | RECHARGE | 充值 | 正（收入） |
| 11 | RECHARGE_GIFT | 赠送 | 正（收入） |
| 12 | REVOKE_RECHARGE_GIFT | 撤销赠送 | **负** |
| 20 | SUBSIDY | 补贴 | 正（收入） |
| 30 | WITHDRAW | 提现 | **负** |
| 40 | REVOKE_RECHARGE | 撤销充值 | **负** |
| 50 | REVOKE_SUBSIDY | 撤销补贴 | **负** |
| 60 | TRANSFER_OUT | 转出 | **负** |
| 70 | TRANSFER_IN | 转入 | 正（收入） |
| 80 | FREEZE | 冻结 | **负** |
| 90 | UN_FREEZE | 解冻 | 正（收入） |
| 100 | CLEAR | 补贴清空 | **负** |
| 110 | CONSUME | 消费 | **负** |
| 120 | CONSUME_REPAIR | 消费补扣 | **负** |
| 130 | CONSUME_REFUND | 消费退款 | 正（收入） |
| 131 | CONSUME_WITHHOLD | 账户预扣 | **负** |
| 132 | CONSUME_WITHHOLD_REFUND | 账户预扣退款 | 正（收入） |
| 140 | LUCK_MONEY | 红包 | 正（收入） |
| 141 | REVOKE_LUCK_MONEY | 撤销红包 | **负** |
| 142 | CLEAR_LUCK_MONEY | 红包清空 | **负** |

> `getConvertFlag()` 方法标记了需要转为负数显示的类型。

### 4.3 账户流水报表常用过滤

```java
// 统计某钱包的消费金额
// 从 report_account_flow_detail 过滤
WHERE wallet_id = #{AccWalletIdEnum.WALLET.key}      // 个人钱包
  AND flow_type = #{AccTradeTypeEnum.CONSUME.key}     // 消费类型

// 统计消费+退款净额
WHERE wallet_id = #{walletId}
  AND flow_type IN (110, 130)  // CONSUME + CONSUME_REFUND
// amount 字段：消费为负，退款为正 → SUM 即为净消费额（负值）
```

---

## 五、汇总表开发标准模式

### 5.1 实现 ReportOrderConsumeService 接口

```java
@Service
@Slf4j
public class ReportSumXxxService implements ReportOrderConsumeService {

    @Override
    public int getOrder() {
        // < 10: 基础表（同步写入）
        // >= 10 且 < 30: 普通汇总表（批量消费）
        // >= 30: 菜品汇总表（需要 detail 数据）
        return 15; // 自定义汇总表一般用 10-29
    }

    /**
     * 单条消费（第一阶段，一般汇总表不用实现）
     */
    @Override
    public void consume(OrderChangePO payload, ReportOrderInfoDTO baseInfo) {
        // 汇总表通常留空，仅基础表实现
    }

    /**
     * 批量消费（第二阶段，核心实现）
     */
    @Override
    public void batchConsume(List<ReportOrderConsumeDTO> list) {
        // 1. 按分组维度聚合（日期+食堂+档口+...）
        // 2. 查询汇总表是否已有记录
        //    - 不存在 → INSERT
        //    - 存在 → UPDATE（累加金额）
        // 3. 批量写入
    }

    /**
     * fix 方法（数据修复/重新统计）
     */
    @Override
    public void fix(ReportBaseParam param) {
        // 1. 删除时间范围内的旧汇总数据
        // 2. 从 report_order_info 重新聚合写入
    }
}
```

### 5.2 batchConsume 标准实现模板

```java
@Override
public void batchConsume(List<ReportOrderConsumeDTO> list) {
    // 1. 构建分组 Key（按需选择维度）
    Map<String, List<ReportOrderConsumeDTO>> grouped = list.stream()
        .collect(Collectors.groupingBy(e ->
            e.getStatisticDate() + "_" + e.getCanteenId() + "_" + e.getStallId()
        ));

    List<ReportSumXxx> insertList = new ArrayList<>();
    List<ReportSumXxx> updateList = new ArrayList<>();

    for (Map.Entry<String, List<ReportOrderConsumeDTO>> entry : grouped.entrySet()) {
        List<ReportOrderConsumeDTO> items = entry.getValue();
        ReportOrderConsumeDTO first = items.get(0);

        // 2. 查询是否已存在
        ReportSumXxx existing = mapper.selectOne(Wrappers.<ReportSumXxx>lambdaQuery()
            .eq(ReportSumXxx::getStatisticDate, first.getStatisticDate())
            .eq(ReportSumXxx::getCanteenId, first.getCanteenId())
            .eq(ReportSumXxx::getStallId, first.getStallId()));

        if (existing == null) {
            ReportSumXxx record = new ReportSumXxx();
            record.setId(Id.next());
            // 设置维度字段...
            // 累加金额字段...
            insertList.add(record);
        } else {
            // 在现有记录上累加
            // existing.setXxxAmount(existing.getXxxAmount().add(deltaAmount));
            updateList.add(existing);
        }
    }

    if (CollUtil.isNotEmpty(insertList)) {
        // 批量插入
    }
    if (CollUtil.isNotEmpty(updateList)) {
        // 批量更新
    }
}
```

### 5.3 fix 方法标准模板

```java
@Override
public void fix(ReportBaseParam param) {
    LocalDateTime startTime = param.getStartTime();
    LocalDateTime endTime = param.getEndTime();

    // 1. 删除时间范围内的旧数据（先删后插）
    mapper.delete(Wrappers.<ReportSumXxx>lambdaQuery()
        .between(ReportSumXxx::getStatisticDate,
            startTime.toLocalDate(), endTime.toLocalDate()));

    // 2. 从 report_order_info 聚合初始化（推荐用 SQL 直接聚合）
    mapper.initFix(null, startTime, endTime);
}
```

### 5.4 fix SQL 模板（MyBatis XML）

```xml
<insert id="initFix">
    INSERT INTO report_sum_xxx (id, statistic_date, canteen_id, canteen_name,
        order_count, consume_amount, refund_amount, net_amount)
    SELECT
        #{id},  <!-- 或用数据库函数生成 -->
        DATE(pay_time) AS statistic_date,
        canteen_id,
        canteen_name,
        COUNT(*) AS order_count,
        SUM(CASE WHEN consume_type = 1 THEN real_amount ELSE 0 END) AS consume_amount,
        SUM(CASE WHEN consume_type = 2 THEN ABS(real_refund_amount) ELSE 0 END) AS refund_amount,
        SUM(real_amount) + SUM(IFNULL(real_refund_amount, 0)) AS net_amount
    FROM report_order_info
    WHERE pay_time BETWEEN #{startTime} AND #{endTime}
    GROUP BY DATE(pay_time), canteen_id, canteen_name
</insert>
```

---

## 六、查询接口标准模式

### 6.1 三并行 CompletableFuture 模式

```java
public PageVO<XxxVO> pageSummary(XxxParam param) {
    // 三个异步查询并行执行
    CompletableFuture<Long> countFuture = CompletableFuture.supplyAsync(() ->
        mapper.selectCount(param));

    CompletableFuture<List<XxxVO>> listFuture = CompletableFuture.supplyAsync(() ->
        mapper.selectPageList(param));

    CompletableFuture<XxxTotalVO> totalFuture = CompletableFuture.supplyAsync(() ->
        mapper.selectTotal(param));

    CompletableFuture.allOf(countFuture, listFuture, totalFuture).join();

    PageVO<XxxVO> pageVO = new PageVO<>();
    pageVO.setTotal(countFuture.join());
    pageVO.setList(listFuture.join());
    pageVO.setTotalLine(totalFuture.join()); // 合计行
    return pageVO;
}
```

---

## 七、账户流水汇总报表模式

### 7.1 基于 report_account_flow 的汇总

与订单报表模式相同，但数据源不同：

```java
// 实现 ReportAccountConsumeService 接口（类似 ReportOrderConsumeService）
// batchConsume 从 report_account_flow 查 status=0 的数据
// fix 从 report_account_flow 重新聚合
```

### 7.2 常见统计维度

```sql
-- 按钱包类型统计消费金额
SELECT
    d.wallet_id,
    SUM(CASE WHEN d.flow_type = 110 THEN ABS(d.amount) ELSE 0 END) AS consume_amount,
    SUM(CASE WHEN d.flow_type = 130 THEN d.amount ELSE 0 END) AS refund_amount
FROM report_account_flow f
JOIN report_account_flow_detail d ON f.flow_id = d.flow_id
WHERE f.pay_time BETWEEN #{startTime} AND #{endTime}
GROUP BY d.wallet_id

-- 按交易类型统计
SELECT
    f.flow_type,
    SUM(f.flow_real_amount) AS total_amount,
    COUNT(*) AS total_count
FROM report_account_flow f
WHERE f.pay_time BETWEEN #{startTime} AND #{endTime}
GROUP BY f.flow_type
```

### 7.3 退款在账户流水中的体现

```
消费：flowType=110 (CONSUME)，amount 为负
退款：flowType=130 (CONSUME_REFUND)，amount 为正

净消费 = ABS(SUM(CONSUME 的 amount)) - SUM(CONSUME_REFUND 的 amount)
或直接：ABS(SUM(flowType IN (110, 130) 的 amount))
```

---

## 八、开发检查清单

新建定制汇总报表时，逐项确认：

### 建表
- [ ] 汇总表包含分组维度字段（statisticDate、canteenId、stallId 等）
- [ ] 汇总表包含金额汇总字段（consumeAmount、refundAmount、netAmount 等）
- [ ] 审计字段（crby/crtime/upby/uptime/del_flag）
- [ ] 无 tenant_id（双库物理隔离）

### 实现
- [ ] 实现 `ReportOrderConsumeService`（或 `ReportAccountConsumeService`）接口
- [ ] 设置合理的 `getOrder()` 值（10-29 普通汇总，30+ 菜品汇总）
- [ ] 实现 `batchConsume()` — 分组 → 查存量 → 累加/新建
- [ ] 实现 `fix()` — 先删后插，从基础表重新聚合

### 退款处理
- [ ] 确认是否需要处理退款数据
- [ ] 选择退款计算方式（直接 SUM 负数 / 分别统计 / 排除全退）
- [ ] 菜品级别退款需关注 `detailState` 和 `goodsRefundNum`

### 查询接口
- [ ] 分页 + 合计行模式（PageVO + TotalVO）
- [ ] 三并行 CompletableFuture（count + list + total）
- [ ] 导出功能（如需要）

---

## 九、关键代码位置

| 类型 | 路径 |
|------|------|
| 下单 MQ 监听器 | `sys-canteen/.../report/statistics/config/mq/ReportOrderMQListener.java` |
| 退款 MQ 监听器 | `sys-canteen/.../report/statistics/config/mq/ReportOrderRefundMQListener.java` |
| 汇总消费调度 | `sys-canteen/.../report/statistics/config/mq/service/ReportConsumerService.java` |
| ConsumeService 接口 | `sys-canteen/.../report/statistics/config/mq/ReportOrderConsumeService.java` |
| 食堂汇总参考实现 | `sys-canteen/.../report/statistics/order/summary/service/ReportSumCanteenService.java` |
| Fix Controller | `sys-canteen/.../report/statistics/order/fix/controller/ReportFixController.java` |
| Fix Service | `sys-canteen/.../report/statistics/order/fix/service/ReportFixService.java` |
| ReportOrderInfo 实体 | `sys-canteen/.../report/statistics/order/basic/model/ReportOrderInfo.java` |
| ReportOrderDetail 实体 | `sys-canteen/.../report/statistics/order/basic/model/ReportOrderDetail.java` |
| ReportAccountFlow 实体 | `sys-canteen/.../report/statistics/account/model/ReportAccountFlow.java` |
| ReportAccountFlowDetail 实体 | `sys-canteen/.../report/statistics/account/model/ReportAccountFlowDetail.java` |
| AccTradeTypeEnum | `sys-canteen/.../account/v3/constants/AccTradeTypeEnum.java` |
| AccWalletIdEnum | `sys-canteen/.../account/v3/constants/AccWalletIdEnum.java` |

---

## 注意

- 如果是 CRUD 增删改查开发（非报表），请使用 `leniu-crud-development`
- 如果涉及 MyBatis XML 编写规范，请使用 `leniu-java-mybatis`
- 如果涉及报表查询入参 Param 类设计，请使用 `leniu-java-report-query-param`
- 如果涉及合计行实现，请使用 `leniu-java-total-line`
- 如果涉及餐次过滤，请使用 `leniu-mealtime`
