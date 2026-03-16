# 标准版报表基础表完整字段说明

## report_order_info（报表订单主表，仅正向订单）

> 标准版中此表**仅存正向订单**，退款数据在独立的 `report_refund` 表中。无 `consumeType` 字段。

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderId` | Long | 主键（雪花 ID） |
| `machineSn` | String | 设备 SN |
| `orgId` | Long | 组织 ID |
| `custId` | Long | 人员 ID |
| `nuClearMode` | Integer | 核身方式（1刷卡/2刷脸/3扫码） |
| `sourceType` | Integer | 来源类型 |
| `ifOnline` | Integer | 是否在线（1是/2否） |
| `canteenId/canteenName` | Long/String | 食堂 |
| `stallId/stallName` | Long/String | 档口 |
| `mealtimeType` | Integer | 餐次（1早/2午/3下午茶/4晚/5夜宵） |
| `psnType` | Integer | 人员类别 |
| `payableAmount` | BigDecimal | 应付金额（分） |
| `discountsAmount` | BigDecimal | 优惠金额（分，取负数） |
| `deliveryAmount` | BigDecimal | 配送费（分） |
| `packingAmount` | BigDecimal | 包装费（分） |
| `realAmount` | BigDecimal | 实付金额（分） |
| `accPayAmount` | BigDecimal | 账户支付金额（分） |
| `outPayAmount` | BigDecimal | 外部支付金额（分） |
| `refundAmount` | BigDecimal | 累计退款金额（分） |
| `orderTime` | LocalDateTime | 下单时间 |
| `orderDate` | LocalDate | 就餐日期 |
| `orderType` | Integer | 订单类型（1当餐/2预订/3报餐/4扫码/5餐桌/6自助/11商城/12超市/21补扣/22外部） |
| `orderRefundState` | Integer | 退款状态（1未退/2已退/3部分退） |
| `payTime` | LocalDateTime | 支付时间 |
| `payType` | Integer | 支付方式 |
| `payChannel` | Integer | 支付渠道 |
| `ageType` | Integer | 年龄段 |
| `holidayType` | Integer | 节假日类型 |
| `status` | Integer | 消费状态（0未消费/1已消费） |

## report_order_detail（订单菜品明细表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `detailId` | Long | 明细主键 |
| `orderId` | Long | 关联订单 ID |
| `goodsDishesId` | Long | 菜品 ID |
| `goodsDishesName` | String | 菜品名称 |
| `salePrice` | BigDecimal | 售卖价格（分） |
| `prefPrice` | BigDecimal | 优惠价格（分） |
| `price` | BigDecimal | 最终价格（分） |
| `weightUnit` | BigDecimal | 每份重量（g） |
| `quantity` | Integer | 数量/重量 |
| `salesMode` | Integer | 销售方式（1按份/2称重） |
| `detailType` | Integer | 类别（1菜品/2套餐/3商品/4按键/5补扣/6报餐） |
| `totalAmount` | BigDecimal | 总金额（分） |
| `realAmount` | BigDecimal | 实付金额（分） |
| `detailState` | Integer | 状态（1正常/2已退菜/3部分退菜） |
| `goodsRefundNum` | Integer | 已退数量 |
| `refundAmount` | BigDecimal | 退款金额（分） |

## report_refund（退款主表，标准版特有）

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderRefundId` | Long | 退款单主键 |
| `orderId` | Long | 原始订单 ID |
| `realRefundAmount` | BigDecimal | 退款金额（**正数**） |
| `applyTime` | LocalDateTime | 申请时间 |
| `applyType` | Integer | 申请类型（1退单/2纠错） |
| `checkTime` | LocalDateTime | 审核时间 |

## report_refund_detail（退款明细表，标准版特有）

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderRefundId` | Long | 退款单 ID |
| `detailId` | Long | 菜品详情 ID |
| `realQuantity` | Integer | 退单数量 |
| `realRefundAmount` | BigDecimal | 退款金额（**正数**） |

## report_account_flow（账户流水主表）

核心字段：`flowId`(主键), `custId`, `orgId`, `payTime`, `flowType`(AccTradeTypeEnum), `flowRealAmount`, `flowAmount`, `manageCost`, `accTotalBal`(可用余额), `accAllBal`(含冻结), `rechargeSource`, `payChannel/payType`, `status`(0未消费/1已消费)

附加字段：`rechargeOperate`(1单人/2批量/3导入/4赠送), `withdrawSource`(1小程序/2web/3openapi/4注销), `operateSource`(1手动清空/2批量/3定时/4注销)

## report_account_flow_detail（流水钱包明细）

字段：`flowId`, `walletId`(1个人/2补贴/4红包), `amount`(转出取负值), `walletBal`, `flowType`, `frozenBalance`, `allWalletBal`

## report_account_summary（用户账户日结表）

联合主键：`statisticDate` + `custId`

**期末余额公式**：
```
endAmount = beginAmount
    + rechargeAmount - rechargeRevokeAmount
    + subsidyAmount - subsidyRevokeAmount
    + luckAmount + giftAmount
    - consumeAmount - consumeRepairAmount
    + consumeRefundAmount
    - withdrawAmount - clearAmount - manageCostAmount
```

附加维度：充值渠道详分（微信/支付宝/现金/银行/第三方）、提现渠道详分、各钱包余额及冻结金额

## report_order_pay（订单支付表）

字段：`orderId`, `payType`, `payChannel`, `outTradeNo`, `payAmount`, `refundAmount`, `payableAmount`

## report_order_discount（订单优惠表）

字段：`orderId`, `changeAmount`, `changeType`(1上浮/2优惠), `changeDetailType`(1上浮/11菜品优惠/12打折/13累计减免/14固定减免)
