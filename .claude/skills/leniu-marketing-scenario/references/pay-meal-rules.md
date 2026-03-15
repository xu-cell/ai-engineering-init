# 扣款规则 & 就餐规则详解

## 扣款规则（RulePayEnum）

### 概述

扣款规则控制消费时钱包的扣款行为：扣款顺序、最低余额保护、消费限额。

### Handler 接口

```java
public interface RulePayHandler {
    void handle(RulePayComputeDTO computeDTO, MarketRuleVO rule, RulePayResultDTO result);
    Integer getRuleType();
    default void checkRuleInfo(String ruleInfo) {}
}
```

### 1. 扣款顺序（RULE_PAY_SEQUENCE, key=1）

控制多钱包消费时的扣款优先级。

```java
// DTO
public class PaySequence {
    private List<Integer> walletSequence;  // 钱包扣款顺序 [补贴钱包, 个人钱包]
}

// Handler 路径
rule.pay.handler.sequence.extension.impl.DefaultPaySequenceHandlerExtension

// Extension 接口
public interface PaySequenceHandlerExtension extends RulePayHandler {
    @Override
    default Integer getRuleType() {
        return RulePayEnum.RULE_PAY_SEQUENCE.getKey();
    }
}
```

### 2. 钱包最低余额（RULE_PAY_MIN_BALANCE, key=2）

钱包余额不足最低额度时禁止消费。

```java
// DTO
public class PayMinBalance {
    private BigDecimal minBalance;  // 最低余额（分）
}

// Handler 路径
rule.pay.handler.minbalance.extension.impl.DefaultPayMinBalanceHandlerExtension
```

### 3. 钱包消费限额（RULE_PAY_LIMIT_BALANCE, key=3）

限制单次或累计从某钱包扣款的金额。

```java
// DTO
public class PayLimitBalance {
    private BigDecimal limitBalance;  // 消费限额（分）
}

// Handler 路径
rule.pay.handler.limitbalance.extension.impl.DefaultPayLimitBalanceHandlerExtension
```

### RulePayComputeDTO 关键字段

| 字段 | 说明 |
|------|------|
| custId | 人员ID |
| orderId | 订单ID |
| orderAmount | 订单金额 |
| walletDetails | 钱包列表 |
| orderType | 订单类型 |

### RulePayResultDTO 关键字段

| 字段 | 说明 |
|------|------|
| walletSequence | 最终扣款顺序 |
| minBalance | 最低余额限制 |
| limitBalance | 消费限额 |

---

## 就餐规则（RuleMealEnum）

### 概述

就餐规则在消费前进行校验，不通过则直接抛异常阻止消费。

### Handler 接口

```java
public interface RuleMealHandler {
    void handle(CustPayVO custPayVO, MarketRuleVO rule);
    Integer getRuleType();
    default void checkRuleInfo(String ruleInfo) {}
}
```

### 1. 就餐时段限制（RULE_TIME_LIMIT, key=1）

限制人员只能在特定时段就餐。

```java
// DTO
public class MealTimeLimitDTO {
    private List<String> allowedTimeRanges;  // 允许时段 ["11:30~13:00", "17:00~19:00"]
}

// Handler 路径
rule.meal.handler.timelimit.extension.impl.DefaultMealTimeLimitHandlerImpl

// Extension 接口
public interface MealTimeLimitHandlerExtension extends RuleMealHandler {
    @Override
    default Integer getRuleType() {
        return RuleMealEnum.RULE_TIME_LIMIT.getKey();
    }
}
```

### 2. 菜品类别限制（RULE_DISH_LIMIT, key=2）

限制人员只能消费特定类别的菜品。

---

## 定制模式（通用）

扣款规则和就餐规则的定制模式与计价/充值规则完全一致：

### 新增规则

1. 创建 DTO → `rule.[pay|meal].handler.[ruletype].dto`
2. 创建 Extension 接口 → `rule.[pay|meal].handler.[ruletype].extension`
3. 创建默认实现 → `rule.[pay|meal].handler.[ruletype].extension.impl`
4. 注册枚举 → `RulePayEnum` 或 `RuleMealEnum`

### 重写规则（@Primary）

```java
@Slf4j
@Service
@Primary
public class CustomPaySequenceHandlerImpl
        implements PaySequenceHandlerExtension {

    @Override
    public void handle(RulePayComputeDTO computeDTO, MarketRuleVO rule, RulePayResultDTO result) {
        // 定制逻辑
    }
}
```

---

## MarketRuleCustomBusiness 扩展点

适用于计价规则的全局前/后置处理：

```java
@Service
public class MarketRuleCustomBusiness implements CustomBusiness {

    // 规则查询后的 Hook（可过滤/排序/修改规则列表）
    public List<MarketRuleVO> afterGetSuitableRules(List<MarketRuleVO> suitableRules) {
        return suitableRules;
    }

    // 规则计算前的 Hook（可按订单过滤规则）
    public List<MarketRuleVO> beforeCompute(RulePriceResultOrderDTO order, List<MarketRuleVO> suitableRules) {
        return suitableRules;
    }
}
```

定制项目中通过 `@Primary` 覆盖：

```java
@Service
@Primary
public class CustomMarketRuleCustomBusiness extends MarketRuleCustomBusiness {

    @Override
    public List<MarketRuleVO> beforeCompute(RulePriceResultOrderDTO order, List<MarketRuleVO> suitableRules) {
        // 例如：按订单类型过滤掉不适用的规则
        return suitableRules.stream()
            .filter(rule -> isApplicable(rule, order))
            .toList();
    }
}
```
