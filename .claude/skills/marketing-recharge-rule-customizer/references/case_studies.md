# 充值规则定制案例分析

本文档提供实际的充值规则定制案例，帮助理解如何应用定制模式。

## 案例1：满赠规则支持钱包类型选择

### 需求背景
默认的满赠规则对所有钱包类型都生效。现在需要支持指定特定的钱包类型，只对这些钱包进行满赠计算。

### 定制模式
模式二A：使用 @Primary 注解 + DTO扩展

### 实现步骤

#### 1. 扩展DTO字段

在定制项目中覆盖 `RechargeGiftFullDTO`：

```java
package net.xnzn.core.marketing.v2.rule.recharge.handler.fullgift.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
@ApiModel("充值规则详情-满赠")
public class RechargeGiftFullDTO {
    @ApiModelProperty("计价方式：1固定，2阶梯，3循环")
    private Integer rechargeType;

    @ApiModelProperty("阶梯信息")
    private List<RechargeGiftFullItemDTO> items;

    // 新增字段：适用钱包类型列表
    @ApiModelProperty("适用钱包类型列表（为空时适用所有钱包）")
    private List<Integer> walletTypes;
}
```

#### 2. 创建定制实现

位置：`net.xnzn.yunshitang.marketing.handler.CustomRechargeFullGiftHandlerImpl`

```java
package net.xnzn.yunshitang.marketing.handler;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.marketing.v2.rule.recharge.dto.RuleRechargeResultDTO;
import net.xnzn.core.marketing.v2.rule.recharge.handler.fullgift.dto.RechargeGiftFullDTO;
import net.xnzn.core.marketing.v2.rule.recharge.handler.fullgift.extension.RechargeFullGiftHandlerExtension;
import net.xnzn.core.marketing.v2.rule.recharge.handler.fullgift.extension.impl.DefaultRechargeFullGiftHandlerImpl;
import net.xnzn.core.marketing.v2.vo.MarketRuleVO;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Primary  // 标记为主要实现
public class CustomRechargeFullGiftHandlerImpl extends DefaultRechargeFullGiftHandlerImpl
        implements RechargeFullGiftHandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 解析规则配置（包含扩展字段）
        RechargeGiftFullDTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), RechargeGiftFullDTO.class);

        // 检查是否指定了钱包类型
        if (CollUtil.isNotEmpty(ruleInfo.getWalletTypes())) {
            // 获取当前充值的钱包类型
            Integer currentWalletType = resultDTO.getWalletType();

            // 如果当前钱包类型不在指定列表中，则不执行满赠
            if (!ruleInfo.getWalletTypes().contains(currentWalletType)) {
                log.info("【充值规则-满赠】当前钱包类型{}不在适用范围内，跳过", currentWalletType);
                return;
            }
        }

        // 调用父类方法执行满赠逻辑
        super.handle(resultDTO, rule);
    }
}
```

### 向后兼容性
- `walletTypes` 为null或空时，适用所有钱包类型（保持原有行为）
- `walletTypes` 有值时，只对指定钱包类型执行满赠

### 测试要点
1. 测试 `walletTypes` 为null的场景
2. 测试 `walletTypes` 为空列表的场景
3. 测试当前钱包类型在列表中的场景
4. 测试当前钱包类型不在列表中的场景

---

## 案例2：限额规则支持多维度限制

### 需求背景
默认的单次限额规则只限制充值金额。现在需要支持按用户等级、时间段等多维度进行限额控制。

### 定制模式
模式二A：使用 @Primary 注解 + DTO扩展

### 实现步骤

#### 1. 扩展DTO字段

```java
package net.xnzn.core.marketing.v2.rule.recharge.handler.maxamount.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
@ApiModel("充值规则详情-单次限额")
public class RechargeMaxAmountDTO {
    @ApiModelProperty("单次上限金额(分)")
    private BigDecimal maxAmount;

    // 新增字段：按用户等级的限额配置
    @ApiModelProperty("用户等级限额配置（key:等级，value:限额）")
    private Map<Integer, BigDecimal> levelLimits;

    // 新增字段：时间段限额配置
    @ApiModelProperty("时间段限额配置（key:时间段，value:限额）")
    private Map<String, BigDecimal> timeLimits;
}
```

#### 2. 创建定制实现

```java
package net.xnzn.yunshitang.marketing.handler;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.date.DateUtil;
import com.alibaba.fastjson.JSON;
import com.pig4cloud.pigx.common.core.exception.LeException;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.marketing.v2.rule.recharge.dto.RuleRechargeResultDTO;
import net.xnzn.core.marketing.v2.rule.recharge.handler.maxamount.dto.RechargeMaxAmountDTO;
import net.xnzn.core.marketing.v2.rule.recharge.handler.maxamount.extension.RechargeMaxAmountHandlerExtension;
import net.xnzn.core.marketing.v2.rule.recharge.handler.maxamount.extension.impl.DefaultRechargeMaxAmountHandlerImpl;
import net.xnzn.core.marketing.v2.vo.MarketRuleVO;
import net.xnzn.framework.config.i18n.I18n;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Date;

@Slf4j
@Service
@Primary
public class CustomRechargeMaxAmountHandlerImpl extends DefaultRechargeMaxAmountHandlerImpl
        implements RechargeMaxAmountHandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        RechargeMaxAmountDTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), RechargeMaxAmountDTO.class);

        // 确定适用的限额
        BigDecimal maxAmount = determineMaxAmount(resultDTO, ruleInfo);

        // 检查是否超过限额
        if (resultDTO.getAmount().compareTo(maxAmount) > 0) {
            throw new LeException(I18n.getMessage("market_recharge_max_amount_limit"));
        }
    }

    /**
     * 确定适用的限额
     */
    private BigDecimal determineMaxAmount(RuleRechargeResultDTO resultDTO, RechargeMaxAmountDTO ruleInfo) {
        // 1. 检查用户等级限额
        if (CollUtil.isNotEmpty(ruleInfo.getLevelLimits())) {
            Integer userLevel = resultDTO.getUserLevel();
            if (ruleInfo.getLevelLimits().containsKey(userLevel)) {
                return ruleInfo.getLevelLimits().get(userLevel);
            }
        }

        // 2. 检查时间段限额
        if (CollUtil.isNotEmpty(ruleInfo.getTimeLimits())) {
            String currentHour = DateUtil.format(new Date(), "HH");
            if (ruleInfo.getTimeLimits().containsKey(currentHour)) {
                return ruleInfo.getTimeLimits().get(currentHour);
            }
        }

        // 3. 使用默认限额
        return ruleInfo.getMaxAmount();
    }
}
```

### 向后兼容性
- `levelLimits` 和 `timeLimits` 为null时，使用 `maxAmount`（保持原有行为）
- 优先级：用户等级限额 > 时间段限额 > 默认限额

---

## 案例3：新增按比例赠送规则

### 需求背景
需要新增一个按比例赠送的规则类型，充值金额的一定比例作为赠送金额。

### 定制模式
模式一：新增规则

### 实现步骤

#### 1. 创建规则DTO

```java
package net.xnzn.core.marketing.v2.rule.recharge.handler.ratiogift.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
@ApiModel("充值规则详情-按比例赠送")
public class RechargeRatioGiftDTO {
    @ApiModelProperty("赠送比例（如0.1表示10%）")
    private BigDecimal ratio;

    @ApiModelProperty("最低充值金额（分）")
    private BigDecimal minAmount;

    @ApiModelProperty("最高赠送金额（分）")
    private BigDecimal maxGiftAmount;

    @ApiModelProperty("赠送钱包ID")
    private Integer walletId;

    @Override
    public String toString() {
        return "赠送比例：" + ratio.multiply(new BigDecimal(100)) + "%<br/>"
                + "最低充值金额：" + minAmount + "<br/>"
                + "最高赠送金额：" + maxGiftAmount;
    }
}
```

#### 2. 创建扩展接口

```java
package net.xnzn.core.marketing.v2.rule.recharge.handler.ratiogift.extension;

import com.alibaba.fastjson.JSON;
import com.pig4cloud.pigx.common.core.exception.LeException;
import net.xnzn.core.marketing.v2.rule.recharge.constants.RuleRechargeEnum;
import net.xnzn.core.marketing.v2.rule.recharge.handler.RuleRechargeHandler;
import net.xnzn.core.marketing.v2.rule.recharge.handler.ratiogift.dto.RechargeRatioGiftDTO;
import net.xnzn.framework.config.i18n.I18n;

import java.math.BigDecimal;

public interface RechargeRatioGiftHandlerExtension extends RuleRechargeHandler {
    @Override
    default Integer getRuleType() {
        return RuleRechargeEnum.RULE_RATIO_GIFT.getKey();
    }

    @Override
    default void checkRuleInfo(String ruleInfo) {
        RechargeRatioGiftDTO rule = JSON.parseObject(ruleInfo, RechargeRatioGiftDTO.class);
        if (rule.getRatio() == null || rule.getRatio().compareTo(BigDecimal.ZERO) <= 0) {
            throw new LeException(I18n.getMessage("market_config_error"));
        }
    }
}
```

#### 3. 创建默认实现

```java
package net.xnzn.core.marketing.v2.rule.recharge.handler.ratiogift.extension.impl;

import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.account.v3.constants.AccTradeTypeEnum;
import net.xnzn.core.marketing.v2.rule.recharge.dto.RuleRechargeResultDTO;
import net.xnzn.core.marketing.v2.rule.recharge.dto.RuleRechargeWalletDTO;
import net.xnzn.core.marketing.v2.rule.recharge.handler.ratiogift.dto.RechargeRatioGiftDTO;
import net.xnzn.core.marketing.v2.rule.recharge.handler.ratiogift.extension.RechargeRatioGiftHandlerExtension;
import net.xnzn.core.marketing.v2.vo.MarketRuleVO;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
public class DefaultRechargeRatioGiftHandlerImpl implements RechargeRatioGiftHandlerExtension {

    @Override
    public void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO rule) {
        // 解析规则配置
        RechargeRatioGiftDTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), RechargeRatioGiftDTO.class);

        // 检查最低充值金额
        if (resultDTO.getAmount().compareTo(ruleInfo.getMinAmount()) < 0) {
            log.info("【充值规则-按比例赠送】充值金额未达到最低要求");
            return;
        }

        // 计算赠送金额
        BigDecimal giftAmount = resultDTO.getAmount()
                .multiply(ruleInfo.getRatio())
                .setScale(0, RoundingMode.HALF_UP);

        // 检查最高赠送金额限制
        if (ruleInfo.getMaxGiftAmount() != null
                && giftAmount.compareTo(ruleInfo.getMaxGiftAmount()) > 0) {
            giftAmount = ruleInfo.getMaxGiftAmount();
        }

        // 更新充值结果
        if (giftAmount.compareTo(BigDecimal.ZERO) > 0) {
            resultDTO.setActualAmount(resultDTO.getActualAmount().add(giftAmount));
            resultDTO.getWalletDetails().add(new RuleRechargeWalletDTO()
                    .setWalletId(ruleInfo.getWalletId())
                    .setAmount(giftAmount)
                    .setTradeType(AccTradeTypeEnum.RECHARGE_GIFT.getKey()));

            log.info("【充值规则-按比例赠送】充值金额：{}，赠送金额：{}", resultDTO.getAmount(), giftAmount);
        }
    }
}
```

#### 4. 注册规则枚举

在 `RuleRechargeEnum` 中添加：

```java
/** 优惠-按比例赠送 */
RULE_RATIO_GIFT(3, "{market_rule_recharge_ratio_gift}");
```

并更新 `isDiscountRule` 方法：

```java
public static boolean isDiscountRule(Integer key) {
    boolean flag = false;
    RuleRechargeEnum ruleType = EnumUtil.getEnumByKey(RuleRechargeEnum.class, key);
    if (Objects.isNull(ruleType)) {
        return false;
    }
    switch (ruleType) {
        case RULE_FULL_GIFT:
        case RULE_TIMES_GIFT:
        case RULE_RATIO_GIFT:  // 新增
            flag = true;
            break;
        default:
            break;
    }
    return flag;
}
```

### 测试要点
1. 测试充值金额低于最低要求的场景
2. 测试正常赠送的场景
3. 测试赠送金额超过最高限制的场景
4. 测试与其他规则组合使用的场景

---

## 案例总结

| 案例 | 定制模式 | 关键技术点 |
|------|---------|-----------|
| 案例1：钱包类型选择 | @Primary + DTO扩展 | 继承默认实现、向后兼容 |
| 案例2：多维度限额 | @Primary + DTO扩展 | 复杂逻辑、优先级控制 |
| 案例3：按比例赠送 | 新增规则 | 完整规则创建流程 |

## 最佳实践总结

1. **优先使用继承**：继承默认实现可以复用已有逻辑
2. **保持向后兼容**：新字段为null时保持原有行为
3. **充分测试**：测试各种边界条件和组合场景
4. **日志记录**：记录关键决策点，便于调试
5. **异常处理**：合理使用异常控制流程