# 计价规则详解（RulePriceEnum）

## 规则执行顺序

```
限次规则 → 优惠规则 → 限额规则 → 赠送规则
```

由 `RulePriceTypeDTO` 自动分类，`RulePriceResultOrderDTO` 链式调用：
```java
order.calcLimitTimesRules(...)
     .calcDiscountRules(...)
     .calcLimitAmountRules(...)
     .calcGiveRules(...)
     .calcCompleted();
```

## 分类判断方法

```java
RulePriceEnum.isDiscountRule(key);    // 优惠类
RulePriceEnum.isLimitTimesRule(key);  // 限次类
RulePriceEnum.isLimitAmountRule(key); // 限额类
RulePriceEnum.isGiveRule(key);        // 赠送类
RulePriceEnum.isDishRule(key);        // 菜品类
RulePriceEnum.isGoodsRule(key);       // 商品类
```

---

## 优惠类规则

### 1. 打折（RULE_DISCOUNT, key=1）

按消费次数梯度打折。第 N 次消费使用第 N 个折扣率。

```java
// DTO
public class PriceDiscountDTO {
    private List<BigDecimal> items;       // 折扣率列表 [0.9, 0.8, 0.7]（第1次9折，第2次8折...）
    private BigDecimal joinAmount;         // 参与计算上限金额（null=不限）
    private BigDecimal maxAmount;          // 单次优惠/浮动上限金额
}
// Handler 路径
rule.price.handler.discount.extension.impl.DefaultPriceDiscountHandlerImpl
```

### 2. 累计减免（RULE_REDUCTION_TOTAL, key=2）

```java
// DTO
public class PriceReductionTotalDTO {
    private BigDecimal maxAmount;    // 最大累计减免金额
}
// Handler 路径
rule.price.handler.reductiontotal.extension.impl.DefaultReductionTotalHandlerImpl
```

### 3. 固定减免（RULE_REDUCTION_FIXED, key=4）

按消费次数梯度减免固定金额。

```java
// DTO
public class PriceReductionFixedDTO {
    private List<BigDecimal> items;  // 减免金额列表 [500, 300, 100]
}
// Handler 路径
rule.price.handler.reductionfixed.extension.impl.DefaultReductionFixedHandlerImpl
```

### 4. 比例扣费（RULE_DEDUCTION_RATIO, key=5）

个人钱包扣 X%，补贴钱包扣 Y%，补贴上限 Z 元。

```java
// DTO
public class PriceDeductionRatioDTO {
    private BigDecimal personalRatio;    // 个人钱包扣费比例
    private BigDecimal subsidyRatio;     // 补贴钱包扣费比例
    private BigDecimal subsidyMaxAmount; // 补贴上限金额
}
// Handler 路径
rule.price.handler.deductionratio.extension.impl.DefaultDeductionRatioHandlerImpl
```

### 5. 固定扣费（RULE_DEDUCTION_FIXED, key=6）

按消费次数梯度固定扣费，可额外优惠。

```java
// DTO
public class PriceDeductionFixedDTO {
    private List<PriceDeductionFixedItemDTO> items;  // 含 amount + extraDiscount
}
// Handler 路径
rule.price.handler.deductionfixed.extension.impl.DefaultPriceDeDuctionFixedHandlerImpl
```

### 6. 满减满折（RULE_DEDUCTION_FULL, key=7）

满 X 元减 Y 元或打 Z 折，可限制享受次数。

```java
// DTO
public class PriceDeductionFullDTO {
    private List<PriceDeductionFullItemDTO> items;  // 含 fullAmount + discountType + discountValue + maxTimes
}
// Handler 路径
rule.price.handler.deductionfull.extension.impl.DefaultPriceDeDuctionFullHandlerImpl
```

### 7. 额外扣费（RULE_ADD_AMOUNT, key=9）

每笔消费额外扣费固定金额。

```java
// DTO
public class PriceAddAmountDTO {
    private BigDecimal addAmount;  // 额外扣费金额
}
// Handler 路径
rule.price.handler.addamount.extension.impl.DefaultPriceAddAmountHandlerImpl
```

---

## 赠送类规则

### 8. 固定补贴（RULE_SUBSIDY_FIXED, key=3）

每笔消费后补贴固定金额到指定钱包。

```java
// DTO
public class PriceSubsidyFixedDTO {
    private BigDecimal subsidyAmount;  // 补贴金额
}
// Handler 路径
rule.price.handler.subsidyfixed.extension.impl.DefaultSubsidyFixedHandlerImpl
```

### 9. 满额赠送（RULE_SUM_GIVE, key=8）

累计消费达到门槛金额后赠送。

```java
// DTO
public class PriceSumGiveDTO {
    private List<PriceSumGiveItem> items;  // 含 gateAmount + giveAmount
}
// Handler 路径
rule.price.handler.sumgive.extension.impl.DefaultSumGiveHandlerImpl
// MQ 异步处理
config.MarketSumGiveMQListener
```

---

## 限次类规则

### 10. 上限次数（RULE_LIMIT_MAX_COUNT, key=51）

日/周/月/餐次累计消费次数上限。

```java
// DTO
public class PriceLimitMaxCountDTO {
    private Integer limitType;       // 限制周期（日/周/月/季/半年/年/餐次）
    private Integer maxCount;        // 上限次数
    private List<Integer> mealtimeTypes; // 适用餐次
}
// Handler 路径
rule.price.handler.limitmaxcount.extension.impl.DefaultLimitMaxCountHandlerImpl
```

### 11. 菜品限购（RULE_DISH_LIMIT, key=201）

```java
// DTO
public class PriceDishLimitDTO {
    private Integer dishIdType;     // 按菜品/按菜品类别
    private List<Long> dishIds;     // 菜品或类别ID列表
    private Integer limitCount;     // 限购数量
}
// Handler 路径
rule.price.handler.dishlimit.extension.impl.DefaultPriceDishLimitHandlerImpl
```

### 12. 商品限购（RULE_GOODS_LIMIT, key=301）

```java
// DTO 结构同 PriceDishLimitDTO
// Handler 路径
rule.price.handler.goodslimit.extension.impl.DefaultPriceGoodsLimitHandlerImpl
```

---

## 限额类规则

### 13. 单笔上限金额（RULE_LIMIT_MAX_AMOUNT, key=101）

```java
// DTO
public class PriceLimitMaxAmountDTO {
    private BigDecimal maxAmount;  // 单笔上限
}
// Handler 路径
rule.price.handler.limitmaxamount.extension.impl.DefaultLimitMaxAmountHandlerImpl
```

### 14. 累计上限金额（RULE_LIMIT_SUM_AMOUNT, key=102）

```java
// DTO
public class PriceLimitSumAmountDTO {
    private Integer limitType;          // 限制周期
    private BigDecimal limitAmount;     // 累计上限
    private List<Integer> mealtimeTypes;
}
// Handler 路径
rule.price.handler.limitsumamount.extension.impl.DefaultPriceLimitSumAmountHandlerImpl
```

---

## 菜品/商品类规则

### 15-16. 菜品打折 / 菜品打折限购（key=151, 152）

```java
// PriceDishDiscountDTO / PriceDishDiscountLimitDTO
// 按菜品或类别维度设置折扣，可限制折扣份数
rule.price.handler.dishdiscount / dishdiscountlimit
```

### 17. 套餐优惠（RULE_DISH_PACKAGE, key=153）

按菜品套餐组合计价。

### 18-19. 商品打折 / 商品打折限购（key=251, 252）

```java
// PriceGoodsDiscountDTO / PriceGoodsDiscountLimitDTO
rule.price.handler.goodsdiscount / goodsdiscountlimit
```

---

## 限制周期枚举 RulePriceLimitEnum

| 枚举 | key | 说明 |
|------|-----|------|
| LIMIT_DAY | 1 | 按日 |
| LIMIT_WEEK | 2 | 按周 |
| LIMIT_MONTH | 3 | 按月 |
| LIMIT_QUARTER | 4 | 按季 |
| LIMIT_HALF | 5 | 按半年 |
| LIMIT_YEAR | 6 | 按年 |
| LIMIT_MEALTIME | 7 | 按餐次 |

## 菜品维度枚举 RulePriceDishIdTypeEnum

| 枚举 | key | 说明 |
|------|-----|------|
| DISH_NAME | 1 | 按菜品/商品名称 |
| DISH_TYPE | 2 | 按菜品/商品类别 |

---

## 关键工具方法（MarketUtil）

```java
// 查询历史订单（用于限次/限额/累计计算）
MarketUtil.getOrders(order, limitType, mealtimeTypeList, sceneType);

// 查询当前交易中符合规则的订单（用于批量订单场景）
MarketUtil.getNowTrade(order, mealtimeTypeList, customDeviceList, limitType, orderResults);

// 格式化设备SN（用于规则匹配）
MarketUtil.formatDeviceSn(orderType, canteenId, stallId, deviceSn);

// 统计菜品数量
MarketUtil.countDish(details, dishIds, dishFlag);
```
