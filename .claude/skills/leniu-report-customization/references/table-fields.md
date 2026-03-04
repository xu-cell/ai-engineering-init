# 报表基础表完整字段说明

## report_order_info（报表订单主表）

> v5.29 后，正向下单和逆向退款**都存在这张表中**，通过 `consumeType` 区分。

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

## report_order_detail（报表订单菜品明细表）

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

## report_account_flow（账户变动流水主表）

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

## report_account_flow_detail（账户流水钱包明细表）

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
