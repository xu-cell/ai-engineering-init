---
name: leniu-marketing-price-rule-customizer
description: |
  leniu-tengyun-core 项目营销计费（price）规则定制指南。当需要定制营销计费规则时使用，支持新增规则类型、重写规则逻辑、扩展 DTO 字段。

  触发场景：
  - 新增营销计费规则类型（折扣、满减、限额、补贴等）
  - 重写现有计费规则逻辑（@Primary 模式）
  - 扩展规则 DTO 字段（向后兼容）
  - 定制规则计算行为（handle 方法实现）
  - 注册规则枚举（RulePriceEnum）

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：营销计费、price规则、计价规则、RulePriceHandler、RulePriceEnum、折扣规则、满减规则、限额规则、补贴规则、营销规则定制、leniu营销、leniu-yunshitang、net.xnzn
---

# leniu-tengyun-core 营销计费规则定制

## 概述

leniu-tengyun-core 项目的营销计费（price）规则功能采用扩展点设计，支持灵活的规则定制。

营销计费规则是营销系统的核心组件，负责计算订单的优惠金额、限制消费行为、提供补贴等功能。

## 何时使用此 Skill

- 需要新增一个计价规则类型
- 需要修改现有规则的计算逻辑
- 需要为规则添加新的配置字段
- 需要针对特定项目定制规则行为
- 参考现有规则实现新的定制需求

## 规则定制工作流

### 步骤1：确定定制模式

根据需求选择合适的定制模式：

**模式A：新增规则**
- 适用场景：创建全新的规则类型
- 需要创建：DTO、扩展接口、默认实现

**模式B：重写规则（@Primary）**
- 适用场景：完全替换现有规则行为
- 需要创建：定制实现类（使用@Primary注解）
- 可选：扩展DTO字段

**模式C：重写规则（Ordered）**
- 适用场景：多个实现共存
- 需要创建：定制实现类（实现Ordered接口）

### 步骤2：理解规则结构

了解：
- 规则接口层次（RulePriceHandler → Extension → Implementation）
- 规则DTO结构
- 规则计算入参（RulePriceResultOrderDTO、MarketRuleVO、orderResults）
- 规则计算流程
- 常用工具类（MarketUtil、MarketRuleRangeService）

### 步骤3：参考实际案例

查看实际案例，了解如何实现具体的定制需求：
- **案例1**：支持自定义场景类型选择（@Primary + DTO扩展）
- **案例2**：移除订单类型过滤（直接修改）

### 步骤4：实现规则定制

#### 新增规则的实现步骤

1. **创建规则DTO**
   - 位置：`net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].dto`
   - 包含规则配置字段
   - 实现 `toString()` 方法返回可读描述

2. **创建扩展接口**
   - 位置：`net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].extension`
   - 继承 `RulePriceHandler`
   - 实现 `getRuleType()` 和 `checkRuleInfo()` 方法

3. **创建默认实现**
   - 位置：`net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].extension.impl`
   - 实现扩展接口
   - 添加 `@Service` 注解
   - 实现 `handle()` 方法

4. **注册规则枚举**
   - 在 `RulePriceEnum` 中添加新的规则类型

#### 重写规则的实现步骤（@Primary模式）

1. **（可选）扩展DTO字段**
   - 在定制项目中覆盖核心DTO类
   - 添加新字段并保持向后兼容

2. **创建定制实现**
   - 位置：定制项目包（如 `net.xnzn.yunshitang.marketing.handler`）
   - 继承默认实现类（可选，用于复用逻辑）
   - 实现扩展接口
   - 添加 `@Service` 和 `@Primary` 注解
   - 重写 `handle()` 方法

3. **实现定制逻辑**
   - 解析规则配置（包含新字段）
   - 实现自定义计算逻辑
   - 更新订单优惠金额或抛出限制异常

### 步骤5：测试规则

1. 测试向后兼容性（新字段为null的场景）
2. 测试新功能（新字段有值的场景）
3. 测试边界条件
4. 测试与其他规则的组合使用

## 代码模板

### 新增规则模板

```java
// 1. DTO
@Data
@ApiModel("计价规则详情-[规则名称]")
public class [RuleType]DTO {
    @ApiModelProperty("[字段说明]")
    private [Type] fieldName;

    @Override
    public String toString() {
        return "字段：" + fieldName;
    }
}

// 2. 扩展接口
public interface [RuleType]HandlerExtension extends RulePriceHandler {
    @Override
    default Integer getRuleType() {
        return RulePriceEnum.[RULE_TYPE_ENUM].getKey();
    }

    @Override
    default String checkRuleInfo(String ruleInfo) {
        [RuleType]DTO rule = JSON.parseObject(ruleInfo, [RuleType]DTO.class);
        return rule.toString();
    }
}

// 3. 默认实现
@Slf4j
@Service
public class Default[RuleType]HandlerImpl implements [RuleType]HandlerExtension {

    @Autowired
    private MarketRuleRangeService rangeService;

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        // 1. 解析规则配置
        [RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), [RuleType]DTO.class);

        // 2. 查询规则适用范围
        List<MarketRuleRange> rangeList = rangeService.listRuleRangeLatest(rule.getRuleId());

        // 3. 实现规则计算逻辑
        // ...

        // 4. 更新订单优惠金额或抛出异常
        order.setDiscountsAmount(order.getDiscountsAmount().add(discountAmount));
    }
}
```

### 重写规则模板（@Primary）

```java
@Slf4j
@Service
@Primary  // 标记为主要实现
public class Custom[RuleType]HandlerImpl extends Default[RuleType]HandlerImpl
        implements [RuleType]HandlerExtension {

    @Autowired
    private MarketRuleRangeService rangeService;

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        // 解析规则配置（可能包含扩展字段）
        [RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), [RuleType]DTO.class);

        // 实现定制逻辑
        // 可以调用父类方法：super.handle(order, rule, orderResults);
        // 或完全自定义实现
    }
}
```

## 常见规则类型

### 优惠类规则
- 折扣规则：`PriceDiscountHandlerExtension`
- 菜品折扣：`PriceDishDiscountHandlerExtension`
- 商品折扣：`PriceGoodsDiscountHandlerExtension`
- 满减规则：`PriceReductionFixedHandlerExtension`

### 限制类规则
- 限额-单次金额：`PriceLimitMaxAmountHandlerExtension`
- 限额-累计次数：`PriceLimitMaxCountHandlerExtension`
- 限额-累计金额：`PriceLimitSumAmountHandlerExtension`

### 补贴类规则
- 固定补贴：`PriceSubsidyFixedHandlerExtension`
- 累计赠送：`PriceSumGiveHandlerExtension`

## 最佳实践

### 包名规范
- 覆盖核心类：使用核心工程的包名（`net.xnzn.core.marketing.v2.rule.price.handler.[ruletype]`）
- 定制实现：使用项目特定包名（如 `net.xnzn.yunshitang.marketing.handler`）

### 类名规范
- 扩展接口：`[RuleType]HandlerExtension`
- 默认实现：`Default[RuleType]HandlerImpl`
- 定制实现：`Custom[RuleType]HandlerImpl` 或描述性名称

### 注解使用
- 所有实现类必须添加 `@Service` 注解
- 重写规则使用 `@Primary` 注解（推荐）
- 日志记录使用 `@Slf4j` 注解

### 向后兼容
- 扩展DTO字段时，新字段应支持null值
- 新字段为null时应保持原有行为
- 在toString方法中包含所有字段

## 快速开始示例

假设需要为限额累计金额规则（`PriceLimitSumAmountHandlerExtension`）添加场景类型选择功能：

1. **扩展DTO**：在 `PriceLimitSumAmountDTO` 中添加 `sceneTypes` 字段
2. **创建定制实现**：创建 `CrossScenePriceLimitSumAmountHandlerImpl`，位于 `net.xnzn.yunshitang.marketing.handler`，使用 `@Primary` 注解
3. **实现逻辑**：在 `handle()` 方法中使用 `sceneTypes` 字段过滤订单
4. **向后兼容**：`sceneTypes` 为null时查询所有场景

```java
// 1. 扩展DTO（在核心工程包名下覆盖）
// 位置：net.xnzn.core.marketing.v2.rule.price.handler.limitsum.dto.PriceLimitSumAmountDTO
@Data
@ApiModel("限额-累计金额规则详情")
public class PriceLimitSumAmountDTO {
    @ApiModelProperty("累计金额限额（分）")
    private BigDecimal limitAmount;

    // 扩展字段：场景类型列表，null时表示所有场景
    @ApiModelProperty("适用场景类型（null=所有）")
    private List<Integer> sceneTypes;

    @Override
    public String toString() {
        return "limitAmount=" + limitAmount + ", sceneTypes=" + sceneTypes;
    }
}

// 2. 定制实现（在yunshitang项目包下）
// 位置：net.xnzn.yunshitang.marketing.handler
@Slf4j
@Service
@Primary
public class CrossScenePriceLimitSumAmountHandlerImpl
        implements PriceLimitSumAmountHandlerExtension {

    @Autowired
    private MarketRuleRangeService rangeService;

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        PriceLimitSumAmountDTO ruleInfo = JSON.parseObject(
            rule.getRuleInfo(), PriceLimitSumAmountDTO.class);

        // 场景过滤（向后兼容：null时不过滤）
        if (CollUtil.isNotEmpty(ruleInfo.getSceneTypes())
                && !ruleInfo.getSceneTypes().contains(order.getSceneType())) {
            return; // 不在适用场景内，跳过
        }

        // 原有累计金额限额逻辑...
        BigDecimal sumAmount = calcSumAmount(order, orderResults);
        if (sumAmount.compareTo(ruleInfo.getLimitAmount()) >= 0) {
            throw new LeException("已超出累计消费限额");
        }
    }
}
```

## 参考文档

详见：[leniu-tengyun-core 源码](/Users/xujiajun/Developer/gongsi_proj/core/leniu-tengyun-core)
