# 营销充值规则结构参考

## 规则接口层次

所有充值规则都遵循以下接口层次结构：

```
RuleRechargeHandler (顶层接口)
    ↓
[RuleType]HandlerExtension (规则类型扩展接口)
    ↓
Default[RuleType]HandlerImpl (默认实现)
    ↓
Custom[RuleType]HandlerImpl (定制实现，可选)
```

## 核心接口：RuleRechargeHandler

位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.RuleRechargeHandler`

```java
public interface RuleRechargeHandler {
    /**
     * 价格计算
     * @param resultDTO 待计算交易
     * @param ruleInfo 规则的详细信息
     */
    void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO ruleInfo);

    /**
     * 获取规则类型
     */
    Integer getRuleType();

    /**
     * 校验规则信息
     */
    default void checkRuleInfo(String ruleInfo) {
    }
}
```

## 规则类型扩展接口

每个规则类型都有一个扩展接口，继承自 `RuleRechargeHandler`。

示例：`RechargeFullGiftHandlerExtension`

```java
public interface RechargeFullGiftHandlerExtension extends RuleRechargeHandler {
    @Override
    default Integer getRuleType() {
        return RuleRechargeEnum.RULE_FULL_GIFT.getKey();
    }

    @Override
    default void checkRuleInfo(String ruleInfo) {
        // 校验ruleInfo
        RechargeGiftFullDTO rule = JSON.parseObject(ruleInfo, RechargeGiftFullDTO.class);
        if (CollUtil.isEmpty(rule.getItems())) {
            throw new LeException(I18n.getMessage("market_config_error"));
        }
    }
}
```

## 规则DTO结构

每个规则类型都有对应的DTO类，用于存储规则配置信息。

DTO位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype]/dto/`

示例：`RechargeGiftFullDTO`

```java
@Data
@AllArgsConstructor
@ApiModel("充值规则详情-满赠")
public class RechargeGiftFullDTO {
    @ApiModelProperty("计价方式：1固定，2阶梯，3循环")
    private Integer rechargeType;

    @ApiModelProperty("阶梯信息")
    private List<RechargeGiftFullItemDTO> items;
}
```

## 规则计算入参

### RuleRechargeResultDTO
待计算的充值交易信息，包含：
- `amount`: 充值金额
- `actualAmount`: 实际充值金额（含赠送）
- `manageCost`: 管理费
- `walletDetails`: 钱包发生金额详情
- `ruleRecord`: 命中消费规则记录

### MarketRuleVO
规则详细信息，包含：
- `ruleId`: 规则ID
- `ruleType`: 规则类型
- `ruleInfo`: 规则配置（JSON字符串，需解析为对应DTO）
- `sceneType`: 场景类型

## 规则计算流程

1. 从 `MarketRuleVO.ruleInfo` 解析规则配置DTO
2. 根据规则类型执行不同的计算逻辑
3. 更新充值结果的金额或抛出限制异常

## 规则提供方：RuleRechargeProvider

位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.RuleRechargeProvider`

```java
@Service
public class RuleRechargeProvider {
    @Autowired
    private List<RuleRechargeHandler> ruleRechargeHandlers;

    /**
     * 根据规则类型获取计算方法
     */
    public RuleRechargeHandler getMarketRechargeHandler(Integer ruleType) {
        return ruleRechargeHandlers.stream()
                .filter(e -> Objects.equals(ruleType, e.getRuleType()))
                .findFirst()
                .orElse(null);
    }
}
```

## 规则枚举：RuleRechargeEnum

位置：`net.xnzn.core.marketing.v2.rule.recharge.constants.RuleRechargeEnum`

```java
@Getter
@AllArgsConstructor
public enum RuleRechargeEnum implements ICommonEnum {
    /** 优惠-满赠 */
    RULE_FULL_GIFT(1, "{market_rule_recharge_full_gift}"),

    /** 优惠-按次数赠送 */
    RULE_TIMES_GIFT(2, "{market_rule_recharge_times_gift}"),

    /** 限额-上限金额 */
    RULE_MAX_AMOUNT(51, "{market_rule_recharge_max_amount}"),

    /** 限额-累计上限金额 */
    RULE_SUM_AMOUNT(52, "{market_rule_recharge_sum_amount}"),

    /** 其他费用-管理费 */
    RULE_MANAGE_COST(101, "{market_rule_recharge_manage_cost}");

    private final Integer key;
    private final String value;
}
```

## 充值规则分类

### 优惠规则（isDiscountRule）
- 满赠规则（RULE_FULL_GIFT）
- 按次数赠送（RULE_TIMES_GIFT）

### 限额规则（isLimitAmountRule）
- 单次上限金额（RULE_MAX_AMOUNT）
- 累计上限金额（RULE_SUM_AMOUNT）

### 其他费用规则（isOtherFeeRule）
- 管理费（RULE_MANAGE_COST）