---
name: marketing-recharge-rule-customizer
description: |
  营销充值（recharge）规则定制指南。当需要定制营销充值规则时使用，支持新增充值规则类型、重写规则逻辑、扩展 DTO 字段。

  触发场景：
  - 新增营销充值规则类型（满赠、按次赠送、限额、管理费等）
  - 重写现有充值规则逻辑（@Primary 模式）
  - 扩展充值规则 DTO 字段（向后兼容）
  - 定制充值规则计算行为（handle 方法实现）
  - 注册充值规则枚举（RuleRechargeEnum）

  触发词：营销充值、recharge规则、充值规则、RuleRechargeHandler、RuleRechargeEnum、满赠规则、充值赠送、充值限额、管理费规则、充值规则定制
---

# 营销充值规则定制

## 概述

本skill提供营销充值（recharge）规则功能定制的完整指南，帮助开发者在Spring Boot项目中定制充值规则。

营销充值规则是营销系统的核心组件，负责计算充值的优惠金额、限制充值行为、收取管理费等功能。系统采用扩展点设计，支持灵活的规则定制。

## 何时使用此Skill

- 需要新增一个充值规则类型
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
- 参考：[customization_patterns.md](references/customization_patterns.md#模式一新增规则)

**模式B：重写规则（@Primary）**
- 适用场景：完全替换现有规则行为
- 需要创建：定制实现类（使用@Primary注解）
- 可选：扩展DTO字段
- 参考：[customization_patterns.md](references/customization_patterns.md#方式a使用-primary-注解推荐)

**模式C：重写规则（Ordered）**
- 适用场景：多个实现共存
- 需要创建：定制实现类（实现Ordered接口）
- 参考：[customization_patterns.md](references/customization_patterns.md#方式b实现-ordered-接口)

### 步骤2：理解规则结构

阅读 [rule_structure.md](references/rule_structure.md) 了解：
- 规则接口层次（RuleRechargeHandler → Extension → Implementation）
- 规则DTO结构
- 规则计算入参（RuleRechargeResultDTO、MarketRuleVO）
- 规则计算流程
- 常用工具类

### 步骤3：参考实际案例

查看 [case_studies.md](references/case_studies.md) 中的实际案例，了解如何实现具体的定制需求。

### 步骤4：实现规则定制

根据选择的模式实现规则定制：

#### 新增规则的实现步骤

1. **创建规则DTO**
   - 位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype].dto`
   - 包含规则配置字段
   - 实现 `toString()` 方法返回可读描述

2. **创建扩展接口**
   - 位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype].extension`
   - 继承 `RuleRechargeHandler`
   - 实现 `getRuleType()` 和 `checkRuleInfo()` 方法

3. **创建默认实现**
   - 位置：`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype].extension.impl`
   - 实现扩展接口
   - 添加 `@Service` 注解
   - 实现 `handle()` 方法

4. **注册规则枚举**
   - 在 `RuleRechargeEnum` 中添加新的规则类型

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
   - 更新充值金额或抛出限制异常

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
@ApiModel("充值规则详情-[规则名称]")
public class [RuleType]DTO {
    @ApiModelProperty("[字段说明]")
    private [Type] fieldName;

    @Override
    public String toString() {
        return "字段：" + fieldName;
    }
}

// 2. 扩展接口
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

// 3. 默认实现
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

### 重写规则模板（@Primary）

```java
@Slf4j
@Service
@Primary  // 标记为主要实现
public class Custom[RuleType]HandlerImpl extends Default[RuleType]HandlerImpl
        implements [RuleType]HandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 解析规则配置（可能包含扩展字段）
        [RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), [RuleType]DTO.class);

        // 实现定制逻辑
        // 可以调用父类方法：super.handle(resultDTO, rule);
        // 或完全自定义实现
    }
}
```

## 常见规则类型

### 优惠类规则
- 满赠规则：`RechargeFullGiftHandlerExtension`
- 按次数赠送：`RechargeTimesGiftHandlerExtension`

### 限制类规则
- 限额-单次金额：`RechargeMaxAmountHandlerExtension`
- 限额-累计金额：`RechargeSumAmountHandlerExtension`

### 其他费用规则
- 管理费：`RechargeCostHandlerExtension`

## 最佳实践

### 包名规范
- 覆盖核心类：使用核心工程的包名（`net.xnzn.core.marketing.v2.rule.recharge.handler.[ruletype]`）
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

## 参考文档

- [rule_structure.md](references/rule_structure.md) - 规则结构详解
- [customization_patterns.md](references/customization_patterns.md) - 定制模式详解
- [case_studies.md](references/case_studies.md) - 实际案例分析

## 快速开始示例

假设需要为满赠规则添加钱包类型选择功能：

1. **扩展DTO**：在 `RechargeGiftFullDTO` 中添加 `walletTypes` 字段
2. **创建定制实现**：创建 `CustomRechargeFullGiftHandlerImpl`，使用 `@Primary` 注解
3. **实现逻辑**：在 `handle()` 方法中使用 `walletTypes` 字段过滤钱包
4. **向后兼容**：`walletTypes` 为null时适用所有钱包

完整代码参考 [case_studies.md](references/case_studies.md)。
