# 营销计费规则结构参考

## 规则接口层次

所有计价规则都遵循以下接口层次结构：

```
RulePriceHandler (顶层接口)
    ↓
[RuleType]HandlerExtension (规则类型扩展接口)
    ↓
Default[RuleType]HandlerImpl (默认实现)
    ↓
Custom[RuleType]HandlerImpl (定制实现，可选)
```

## 核心接口：RulePriceHandler

位置：`net.xnzn.core.marketing.v2.rule.price.handler.RulePriceHandler`

```java
public interface RulePriceHandler {
    /**
     * 价格计算
     * @param order 当前待计算订单
     * @param rule 规则的详细信息
     * @param orderResults 全部订单
     */
    void handle(RulePriceResultOrderDTO order, MarketRuleVO rule, List<RulePriceResultOrderDTO> orderResults);

    /**
     * 获取规则类型
     */
    Integer getRuleType();

    /**
     * 校验规则信息
     */
    default String checkRuleInfo(String ruleInfo) {
        return CharSequenceUtil.EMPTY;
    }
}
```

## 规则类型扩展接口

每个规则类型都有一个扩展接口，继承自 `RulePriceHandler`。

示例：`PriceLimitSumAmountHandlerExtension`

```java
public interface PriceLimitSumAmountHandlerExtension extends RulePriceHandler {
    @Override
    default Integer getRuleType() {
        return RulePriceEnum.RULE_LIMIT_SUM_AMOUNT.getKey();
    }

    @Override
    default String checkRuleInfo(String ruleInfo) {
        // 校验ruleInfo
        PriceLimitSumAmountDTO rule = JSON.parseObject(ruleInfo, PriceLimitSumAmountDTO.class);
        return rule.toString();
    }
}
```

## 规则DTO结构

每个规则类型都有对应的DTO类，用于存储规则配置信息。

DTO位置：`net.xnzn.core.marketing.v2.rule.price.handler.[ruletype]/dto/`

示例：`PriceLimitSumAmountDTO`

```java
@Data
@ApiModel("计价规则详情-累计金额")
public class PriceLimitSumAmountDTO {
    @ApiModelProperty("累计上限金额(分)")
    private BigDecimal maxAmount;

    @ApiModelProperty("限制类型")
    private Integer limitType;

    @Override
    public String toString() {
        return "限制类型：" + EnumUtil.getValueByKey(RulePriceLimitEnum.class, this.getLimitType())
                + "<br/>累计上限金额：" + this.getMaxAmount().divide(new BigDecimal(100), 2, RoundingMode.HALF_UP) + "<br/>";
    }
}
```

## 规则计算入参

### RulePriceResultOrderDTO
当前待计算的订单信息，包含：
- `orderId`: 订单ID
- `custId`: 客户ID
- `orderType`: 订单类型
- `realAmount`: 实付金额
- `discountsAmount`: 优惠金额
- `details`: 订单明细列表
- `ruleRecord`: 规则计算记录

### MarketRuleVO
规则详细信息，包含：
- `ruleId`: 规则ID
- `ruleType`: 规则类型
- `ruleInfo`: 规则配置（JSON字符串，需解析为对应DTO）
- `sceneType`: 场景类型

### orderResults
全部订单列表，用于跨订单计算（如累计金额、累计次数等）

## 规则计算流程

1. 从 `MarketRuleVO.ruleInfo` 解析规则配置DTO
2. 查询规则适用范围（餐次、设备等）
3. 查询历史订单数据（如需要）
4. 执行规则计算逻辑
5. 更新订单的优惠金额或抛出限制异常

## 常用工具类

### MarketUtil
- `getOrders()`: 查询历史订单
- `getNowTrade()`: 获取当前交易中符合条件的订单
- `isValidOrder()`: 判断订单是否有效

### MarketRuleRangeService
- `listRuleRangeLatest()`: 查询规则适用范围
- `filterRangeDetailByType()`: 按类型过滤范围详情
