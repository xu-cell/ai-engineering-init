# 报表基础表完整字段说明

> 本文件按需加载：当报表基于 report_order_info / report_account_flow 开发时读取。

---

## report_order_info（报表订单主表）

### v5.29 版本（sys-canteen 模块）

> 正向下单和逆向退款**都存在这张表中**，通过 `consumeType` 区分。

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
| `mealtimeType` | Integer | 餐次类型（1早/2午/3下午茶/4晚/5夜宵/-1其他） |
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

### 标准版（core-report 模块）

> 仅存正向订单，**无 consumeType 字段**。退款数据在独立 `report_refund` 表。

与 v5.29 版本相比，额外字段：
- `discountsAmount`（优惠金额，取负数）
- `deliveryAmount/packingAmount`（配送费/包装费）
- `ageType/holidayType`（年龄段/节假日类型）
- `machineSn`（设备SN）

---

## report_order_detail（菜品明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `detailId` | Long | 明细主键 |
| `orderId` | Long | 关联订单ID |
| `goodsDishesId/goodsDishesName` | Long/String | 菜品信息 |
| `salePrice` | BigDecimal | 售卖价格（分） |
| `price` | BigDecimal | 最终价格（分） |
| `quantity` | Integer | 数量/重量 |
| `salesMode` | Integer | 销售方式（1按份/2称重） |
| `totalAmount` | BigDecimal | 总金额（分） |
| `realAmount` | BigDecimal | 实付金额（分） |
| `detailState` | Integer | **1=正常，2=已退菜（全退），3=部分退菜** |
| `goodsRefundNum` | Integer | 已退数量 |
| `refundAmount` | BigDecimal | 退款金额（分） |
| `detailType` | Integer | 类别（1菜品/2套餐/3商品/4按键/5补扣/6报餐） |
| `costPrice` | BigDecimal | 成本价格 |

---

## report_refund / report_refund_detail（标准版特有）

**report_refund**（退款主表，金额为**正数**）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderRefundId` | Long | 退款单主键 |
| `orderId` | Long | 原始订单ID |
| `realRefundAmount` | BigDecimal | 退款金额（**正数**） |
| `applyType` | Integer | 申请类型（1退单/2纠错） |
| `checkTime` | LocalDateTime | 审核时间 |

**report_refund_detail**：`orderRefundId`, `detailId`, `realQuantity`, `realRefundAmount`（**正数**）

---

## report_account_flow（账户流水主表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `flowId` | Long | 主键（雪花ID） |
| `custId` | Long | 人员ID |
| `flowType` | Integer | 交易类型（AccTradeTypeEnum） |
| `flowRealAmount` | BigDecimal | 实际交易金额 |
| `flowAmount` | BigDecimal | 交易金额 |
| `accTotalBal` | BigDecimal | 可用余额之和（不含冻结） |
| `accAllBal` | BigDecimal | 总余额（含冻结） |
| `payTime` | LocalDateTime | 支付时间 |
| `status` | Integer | 消费状态：0=未消费，1=已消费 |
| `manageCost` | BigDecimal | 管理费 |

> `custName`、`mobile` 使用 SM4 加密存储。

## report_account_flow_detail（流水钱包明细）

| 字段 | 类型 | 说明 |
|------|------|------|
| `flowId` | Long | 关联主流水 |
| `walletId` | Long | 钱包类型（1个人/2补贴/4红包） |
| `amount` | BigDecimal | 金额（转出取负值） |
| `walletBal` | BigDecimal | 钱包可用余额 |
| `frozenBalance` | BigDecimal | 冻结余额 |

---

## 枚举速查

### AccWalletIdEnum（钱包类型）

| key | 枚举 | 含义 |
|-----|------|------|
| 1 | WALLET | 个人钱包 |
| 2 | SUBSIDY | 补贴钱包 |
| 4 | LUCK_MONEY | 红包 |

### AccTradeTypeEnum（交易类型）

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
| 140/141/142 | 红包/撤销红包/红包清空 | 正/**负**/**负** |

### 账户流水常用过滤

```sql
-- 净消费额：消费为负，退款为正 → SUM 即为净消费额（负值）
WHERE wallet_id = #{walletId} AND flow_type IN (110, 130)
```

---

## 其他基础表

- **report_order_pay**：`orderId`, `payType/payChannel`, `payAmount/refundAmount`
- **report_order_discount**：`orderId`, `changeAmount`, `changeType`(1上浮/2优惠), `changeDetailType`
- **report_account_summary**（日结表）：联合主键 `statisticDate + custId`，期末余额 = 期初 + 充值 - 撤销 + 补贴 - 消费 + 退款 - 提现
