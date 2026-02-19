# 规则定制模式

营销计费规则定制有两种主要模式：**新增规则**和**重写规则**。

## 模式一：新增规则

当需要添加全新的规则类型时使用此模式。

### 适用场景
- 创建新的规则类型（如新的优惠方式、限制方式）
- 规则逻辑与现有规则完全不同
- 需要新的DTO字段和配置项

### 实现步骤

#### 1. 创建规则DTO
位置：定制项目中覆盖核心工程的DTO路径

```java
package net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].dto;

@Data
@ApiModel("计价规则详情-[规则名称]")
public class [RuleType]DTO {
    @ApiModelProperty("[字段说明]")
    private [Type] fieldName;

    // 其他字段...

    @Override
    public String toString() {
        // 返回规则配置的可读描述
        return "字段1：" + field1 + "<br/>字段2：" + field2;
    }
}
```

#### 2. 创建规则扩展接口
位置：定制项目中覆盖核心工程的扩展接口路径

```java
package net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].extension;

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
```

#### 3. 创建默认实现
位置：定制项目中覆盖核心工程的实现类路径

```java
package net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].extension.impl;

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

#### 4. 注册规则枚举
需要在 `RulePriceEnum` 中添加新的规则类型枚举值（通常需要核心工程支持）。

---

## 模式二：重写规则

当需要修改现有规则的行为时使用此模式。

### 适用场景
- 修改现有规则的计算逻辑
- 扩展现有规则的功能（如添加新字段）
- 针对特定项目定制规则行为

### 实现方式

#### 方式A：使用 @Primary 注解（推荐）

完全替换默认实现，适用于大幅修改规则逻辑的场景。

```java
package [定制项目包名].marketing.handler;

@Slf4j
@Service
@Primary  // 标记为主要实现，优先级最高
public class Custom[RuleType]HandlerImpl extends Default[RuleType]HandlerImpl
        implements [RuleType]HandlerExtension {

    @Autowired
    private MarketRuleRangeService rangeService;

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        // 完全重写规则逻辑
        // 可以调用父类方法：super.handle(order, rule, orderResults);
        // 或完全自定义实现
    }
}
```

**特点：**
- 使用 `@Primary` 注解标记为主要Bean
- Spring会优先注入此实现
- 可以继承默认实现类，复用部分逻辑
- 适合完全替换默认行为

**示例：** `CrossScenePriceLimitSumAmountHandlerImpl`
- 继承 `DefaultPriceLimitSumAmountHandlerImpl`
- 使用 `@Primary` 注解
- 重写 `handle` 方法，支持自定义场景类型选择

#### 方式B：实现 Ordered 接口

通过优先级控制，适用于需要保留默认实现但优先使用定制实现的场景。

```java
package [定制项目包名].marketing.handler;

@Slf4j
@Service
public class Custom[RuleType]HandlerImpl implements [RuleType]HandlerExtension, Ordered {

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;  // 最高优先级
    }

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        // 自定义规则逻辑
    }
}
```

**特点：**
- 实现 `Ordered` 接口，通过 `getOrder()` 返回优先级
- 数值越小优先级越高（`HIGHEST_PRECEDENCE = Integer.MIN_VALUE`）
- 不继承默认实现，完全独立实现
- 适合多个实现共存的场景

---

## 扩展DTO字段

当需要为现有规则添加新的配置字段时：

### 1. 在定制项目中覆盖DTO类

```java
package net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].dto;

@Data
@ApiModel("计价规则详情-[规则名称]")
public class [RuleType]DTO {
    // 保留原有字段
    @ApiModelProperty("原有字段")
    private [Type] existingField;

    // 添加新字段
    @ApiModelProperty("新增字段说明")
    private [Type] newField;

    @Override
    public String toString() {
        // 更新toString方法，包含新字段
        return "原有字段：" + existingField + "<br/>新字段：" + newField;
    }
}
```

### 2. 在定制实现中使用新字段

```java
@Override
public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                  List<RulePriceResultOrderDTO> orderResults) {
    // 解析包含新字段的DTO
    [RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), [RuleType]DTO.class);

    // 使用新字段
    if (ruleInfo.getNewField() != null) {
        // 基于新字段的逻辑
    }

    // 其他逻辑...
}
```

### 3. 向后兼容性处理

```java
// 新字段为空时使用默认行为
List<Integer> sceneTypes = ruleInfo.getSceneTypes();
if (CollUtil.isEmpty(sceneTypes)) {
    // 兼容旧配置：查询所有场景
    sceneTypes = null;
}
```

---

## 定制项目文件组织

```
leniu-tengyun-[项目名]/
├── leniu-yunshitang/
│   └── src/main/java/
│       ├── net/xnzn/core/marketing/v2/rule/price/handler/
│       │   └── [ruletype]/
│       │       ├── dto/
│       │       │   └── [RuleType]DTO.java  (覆盖核心DTO，扩展字段)
│       │       └── extension/
│       │           ├── [RuleType]HandlerExtension.java  (覆盖核心接口)
│       │           └── impl/
│       │               └── Default[RuleType]HandlerImpl.java  (覆盖核心实现)
│       └── net/xnzn/yunshitang/marketing/handler/
│           └── Custom[RuleType]HandlerImpl.java  (定制实现，使用@Primary)
```

---

## 最佳实践

### 选择定制模式的建议

1. **新增规则**：当需要全新的规则类型时
2. **@Primary重写**：当需要完全替换现有规则行为时（推荐）
3. **Ordered重写**：当需要多个实现共存时（较少使用）

### 代码规范

1. **包名规范**：
   - 覆盖核心类：使用核心工程的包名
   - 定制实现：使用项目特定包名（如 `net.xnzn.yunshitang.marketing.handler`）

2. **类名规范**：
   - 扩展接口：`[RuleType]HandlerExtension`
   - 默认实现：`Default[RuleType]HandlerImpl`
   - 定制实现：`Custom[RuleType]HandlerImpl` 或描述性名称（如 `CrossScenePriceLimitSumAmountHandlerImpl`）

3. **注解使用**：
   - 所有实现类必须添加 `@Service` 注解
   - 重写规则使用 `@Primary` 注解（推荐）
   - 日志记录使用 `@Slf4j` 注解

4. **向后兼容**：
   - 扩展DTO字段时，新字段应支持null值
   - 新字段为null时应保持原有行为
   - 在toString方法中包含所有字段

### 测试建议

1. 测试新字段为null的场景（向后兼容）
2. 测试新字段有值的场景（新功能）
3. 测试规则计算的边界条件
4. 测试与其他规则的组合使用
