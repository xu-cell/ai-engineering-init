# 充值规则详解（RuleRechargeEnum）

## 规则执行顺序

```
限额规则 → 赠送规则 → 管理费规则
```

由 `RuleRechargeTypeDTO` 自动分类，`RuleRechargeResultDTO` 链式调用：
```java
recharge.calcLimitAmountRules(ruleRechargeType.getLimitAmountRules(), recordDTO, this::handle)
        .calcDiscountRules(ruleRechargeType.getDiscountRules(), recordDTO, this::handle)
        .calcOtherFeeRules(ruleRechargeType.getOtherFeeRules(), recordDTO, this::handle);
```

## 分类判断方法

```java
RuleRechargeEnum.isDiscountRule(key);     // 赠送类（满赠/按次赠送）
RuleRechargeEnum.isLimitAmountRule(key);  // 限额类
RuleRechargeEnum.isOtherFeeRule(key);     // 其他费用类（管理费）
```

---

## 赠送类规则

### 1. 满赠（RULE_FULL_GIFT, key=1）

充值金额达到门槛后赠送。支持多档梯度。

```java
// DTO
public class RechargeGiftFullDTO {
    private List<RechargeGiftFullItemDTO> items;
}
public class RechargeGiftFullItemDTO {
    private BigDecimal fullAmount;    // 满足门槛金额
    private BigDecimal giftAmount;    // 赠送金额
}

// Handler 路径
rule.recharge.handler.fullgift.extension.impl.DefaultRechargeFullGiftHandlerImpl
```

### 2. 按次数赠送（RULE_TIMES_GIFT, key=2）

按充值次数梯度赠送不同金额。

```java
// DTO
public class RechargeTimesGiftDTO {
    private List<RechargeTimesGiftItemDTO> items;
}
public class RechargeTimesGiftItemDTO {
    private Integer times;           // 第 N 次充值
    private BigDecimal giftAmount;   // 赠送金额
}

// Handler 路径
rule.recharge.handler.timesgift.extension.impl.DefaultRechargeTimesGiftHandlerImpl
```

---

## 限额类规则

### 3. 单笔上限金额（RULE_MAX_AMOUNT, key=51）

单次充值金额不得超过上限。

```java
// DTO
public class RechargeMaxAmountDTO {
    private BigDecimal maxAmount;    // 单笔上限
}

// Handler 路径
rule.recharge.handler.maxamount.extension.impl.DefaultRechargeMaxAmountHandlerImpl
```

### 4. 累计上限金额（RULE_SUM_AMOUNT, key=52）

一定周期内累计充值不得超过上限。

```java
// DTO
public class RechargeSumAmountDTO {
    private Integer limitType;          // 限制周期（同 RulePriceLimitEnum）
    private BigDecimal limitAmount;     // 累计上限
}

// Handler 路径
rule.recharge.handler.sumamount.extension.impl.DefaultRechargeSumAmountHandlerImpl
```

---

## 费用类规则

### 5. 管理费（RULE_MANAGE_COST, key=101）

充值时按比例或固定金额收取管理费。

```java
// DTO
public class RechargeCostDTO {
    private List<RechargeCostItemDTO> items;
}
public class RechargeCostItemDTO {
    private Integer costType;         // 1=固定金额, 2=比例
    private BigDecimal costValue;     // 金额或比例值
}

// Handler 路径
rule.recharge.handler.managecost.extension.impl.DefaultRechargeCostHandlerImpl
```

---

## 充值规则 Handler 接口

```java
public interface RuleRechargeHandler {
    void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO ruleInfo);
    Integer getRuleType();
    default void checkRuleInfo(String ruleInfo) {}
}
```

### RuleRechargeResultDTO 关键字段

| 字段 | 说明 |
|------|------|
| rechargeAmount | 充值金额 |
| actualAmount | 实际到账金额（含赠送） |
| giftAmount | 赠送金额 |
| costAmount | 管理费金额 |
| walletDetails | 钱包明细 |
| ruleRecord | 规则计算记录 |

### RuleRechargeComputeDTO 关键字段

| 字段 | 说明 |
|------|------|
| custId | 人员ID |
| rechargeAmount | 充值金额 |
| walletType | 钱包类型 |
| tryFlag | 试算标志（1=试算，不记录） |

---

## 充值规则定制示例

### 为满赠规则添加钱包类型过滤

```java
// 1. 扩展 DTO（核心包名下覆盖）
@Data
public class RechargeGiftFullDTO {
    private List<RechargeGiftFullItemDTO> items;
    // 扩展字段
    @ApiModelProperty("适用钱包类型（null=所有钱包）")
    private List<Integer> walletTypes;
}

// 2. 定制实现（定制项目包名）
@Slf4j
@Service
@Primary
public class CustomRechargeFullGiftHandlerImpl
        implements RechargeFullGiftHandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        RechargeGiftFullDTO ruleInfo = JSON.parseObject(
            rule.getRuleInfo(), RechargeGiftFullDTO.class);

        // 向后兼容：null 时不过滤
        if (CollUtil.isNotEmpty(ruleInfo.getWalletTypes())
                && !ruleInfo.getWalletTypes().contains(resultDTO.getWalletType())) {
            return;
        }

        // 满赠逻辑...
    }
}
```
