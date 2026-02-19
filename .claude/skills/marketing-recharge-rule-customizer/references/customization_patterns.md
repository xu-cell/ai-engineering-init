# 充值规则定制模式详解

## 模式一：新增规则

当需要创建全新的充值规则类型时使用此模式。

### 适用场景
- 现有规则类型无法满足需求
- 需要实现全新的计算逻辑
- 需要独立的规则配置结构

### 实现步骤

#### 1. 创建规则DTO

位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype].dto`

```java
@Data
@ApiModel("充值规则详情-[规则名称]")
public class [RuleType]DTO {
    @ApiModelProperty("[字段说明]")
    private [Type] fieldName;

    @Override
    public String toString() {
        return "字段：" + fieldName;
    }
}
```

#### 2. 创建扩展接口

位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype].extension`

```java
public interface [RuleType]HandlerExtension extends RuleRechargeHandler {
    @Override
    default Integer getRuleType() {
        return RuleRechargeEnum.[RULE_TYPE_ENUM].getKey();
    }

    @Override
    default void checkRuleInfo(String ruleInfo) {
        [RuleType]DTO rule = JSON.parseObject(ruleInfo, [RuleType]DTO.class);
        // 添加必要的校验逻辑
    }
}
```

#### 3. 创建默认实现

位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype].extension.impl`

```java
@Slf4j
@Service
public class Default[RuleType]HandlerImpl implements [RuleType]HandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 1. 解析规则配置
        [RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), [RuleType]DTO.class);

        // 2. 实现规则计算逻辑
        // ...

        // 3. 更新充值金额或抛出异常
        resultDTO.setActualAmount(resultDTO.getActualAmount().add(giftAmount));
    }
}
```

#### 4. 注册规则枚举

在 `RuleRechargeEnum` 中添加新的规则类型：

```java
/** 新规则类型 */
NEW_RULE_TYPE(103, "{market_rule_recharge_new_type}");
```

### 优点
- 完全独立，不影响现有规则
- 可以自由设计DTO结构
- 易于维护和测试

### 缺点
- 需要修改核心枚举类
- 需要创建完整的接口和实现

---

## 模式二：重写规则

当需要修改现有规则的行为时使用此模式。

### 方式A：使用 @Primary 注解（推荐）

#### 适用场景
- 完全替换现有规则的默认行为
- 只需要一个实现生效
- 定制逻辑与默认逻辑差异较大

#### 实现步骤

1. **（可选）扩展DTO字段**

在定制项目中覆盖核心DTO类：

```java
package net.xnzn.core.marketing.v2.rule.recharge.handler.fullgift.dto;

@Data
@AllArgsConstructor
@ApiModel("充值规则详情-满赠")
public class RechargeGiftFullDTO {
    @ApiModelProperty("计价方式：1固定，2阶梯，3循环")
    private Integer rechargeType;

    @ApiModelProperty("阶梯信息")
    private List<RechargeGiftFullItemDTO> items;

    // 新增字段
    @ApiModelProperty("适用钱包类型列表")
    private List<Integer> walletTypes;
}
```

2. **创建定制实现**

位置：定制项目包（如 `net.xnzn.yunshitang.marketing.handler`）

```java
@Slf4j
@Service
@Primary  // 标记为主要实现，优先级高于默认实现
public class CustomRechargeFullGiftHandlerImpl extends DefaultRechargeFullGiftHandlerImpl
        implements RechargeFullGiftHandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 解析规则配置（包含扩展字段）
        RechargeGiftFullDTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), RechargeGiftFullDTO.class);

        // 实现定制逻辑
        if (CollUtil.isNotEmpty(ruleInfo.getWalletTypes())) {
            // 使用新字段的逻辑
            // ...
        } else {
            // 向后兼容：调用父类方法
            super.handle(resultDTO, rule);
        }
    }
}
```

#### 优点
- 简单直接，使用Spring的@Primary机制
- 可以继承默认实现，复用部分逻辑
- 支持DTO字段扩展

#### 缺点
- 只能有一个@Primary实现
- 完全替换默认行为

### 方式B：实现 Ordered 接口

#### 适用场景
- 需要多个实现共存
- 需要控制实现的执行顺序
- 需要根据条件选择不同的实现

#### 实现步骤

```java
@Slf4j
@Service
public class CustomRechargeFullGiftHandlerImpl implements RechargeFullGiftHandlerExtension, Ordered {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 实现定制逻辑
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;  // 最高优先级
    }
}
```

#### 优点
- 支持多个实现共存
- 可以精确控制执行顺序
- 灵活性高

#### 缺点
- 需要理解Spring的Ordered机制
- 可能导致多个实现被执行（需要额外控制）

---

## 模式三：直接修改默认实现

#### 适用场景
- 需要永久性修改核心规则
- 所有项目都需要此修改
- 修改较小且不影响向后兼容

#### 实现步骤

直接修改核心工程中的默认实现类：

```java
@Slf4j
@Service
public class DefaultRechargeFullGiftHandlerImpl implements RechargeFullGiftHandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 修改实现逻辑
    }
}
```

#### 优点
- 最简单直接
- 所有项目自动生效

#### 缺点
- 影响所有使用此规则的项目
- 可能破坏向后兼容性
- 不适合项目特定需求

---

## 模式选择指南

| 需求 | 推荐模式 |
|------|---------|
| 创建全新规则类型 | 模式一：新增规则 |
| 项目特定定制 | 模式二A：@Primary |
| 需要多个实现共存 | 模式二B：Ordered |
| 核心规则永久修改 | 模式三：直接修改 |
| 扩展DTO字段 | 模式二A：@Primary |
| 完全替换规则逻辑 | 模式二A：@Primary |

## 向后兼容性考虑

### DTO字段扩展
- 新字段应支持null值
- 新字段为null时保持原有行为
- 在toString方法中包含所有字段

### 实现类修改
- 优先使用继承而非完全重写
- 保留原有方法签名
- 添加新方法而非修改现有方法

### 测试要点
- 测试新字段为null的场景
- 测试新字段有值的场景
- 测试与其他规则的组合使用
- 测试边界条件