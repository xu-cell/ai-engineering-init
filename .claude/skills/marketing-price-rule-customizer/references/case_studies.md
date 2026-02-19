# 规则定制案例

本文档包含实际的规则定制案例，展示如何应用定制模式。

## 案例1：支持自定义场景类型选择（限额累计金额规则）

### 背景
原有的限额累计金额规则存在两个极端：
- 旧实现：强制根据规则所在场景类型过滤订单，只能统计单一场景
- 新需求：需要灵活选择场景类型组合（如食堂+自助餐，排除商超）

### 解决方案
使用 **@Primary重写模式**，扩展DTO字段，支持自定义场景类型选择。

### 实现步骤

#### 1. 扩展DTO字段

文件：`leniu-tengyun-guangzhoutianlidianzi/leniu-yunshitang/src/main/java/net/xnzn/core/marketing/v2/rule/price/handler/limitsumamount/dto/PriceLimitSumAmountDTO.java`

```java
package net.xnzn.core.marketing.v2.rule.price.handler.limitsumamount.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import net.xnzn.core.marketing.util.EnumUtil;
import net.xnzn.core.marketing.v2.rule.price.constants.RulePriceLimitEnum;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Data
@ApiModel("计价规则详情-累计金额")
public class PriceLimitSumAmountDTO {

    @ApiModelProperty("累计上限金额(分)")
    private BigDecimal maxAmount;

    @ApiModelProperty("限制类型")
    private Integer limitType;

    // 新增字段：支持自定义场景类型选择
    @ApiModelProperty("适用场景类型列表（为空或null表示全部场景）")
    private List<Integer> sceneTypes;

    @Override
    public String toString() {
        return "限制类型：" + EnumUtil.getValueByKey(RulePriceLimitEnum.class, this.getLimitType())
                + "<br/>累计上限金额：" + this.getMaxAmount().divide(new BigDecimal(100), 2, RoundingMode.HALF_UP) + "<br/>";
    }
}
```

#### 2. 创建定制实现（使用@Primary）

文件：`leniu-tengyun-guangzhoutianlidianzi/leniu-yunshitang/src/main/java/net/xnzn/yunshitang/marketing/handler/CrossScenePriceLimitSumAmountHandlerImpl.java`

```java
package net.xnzn.yunshitang.marketing.handler;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.fastjson.JSON;
import com.pig4cloud.pigx.common.core.exception.LeException;
import lombok.extern.slf4j.Slf4j;
import net.xnzn.core.marketing.v2.constants.MarketRangeTypeEnum;
import net.xnzn.core.marketing.v2.constants.MarketSceneTypeEnum;
import net.xnzn.core.marketing.v2.model.MarketRuleRange;
import net.xnzn.core.marketing.v2.rule.price.dto.RulePriceLimitDTO;
import net.xnzn.core.marketing.v2.rule.price.dto.RulePriceResultOrderDTO;
import net.xnzn.core.marketing.v2.rule.price.handler.limitsumamount.dto.PriceLimitSumAmountDTO;
import net.xnzn.core.marketing.v2.rule.price.handler.limitsumamount.extension.PriceLimitSumAmountHandlerExtension;
import net.xnzn.core.marketing.v2.rule.price.handler.limitsumamount.extension.impl.DefaultPriceLimitSumAmountHandlerImpl;
import net.xnzn.core.marketing.v2.service.MarketRuleRangeService;
import net.xnzn.core.marketing.v2.util.MarketUtil;
import net.xnzn.core.marketing.v2.vo.MarketRuleVO;
import net.xnzn.core.order.api.OrderMarketingApi;
import net.xnzn.core.order.common.model.OrderInfo;
import net.xnzn.framework.config.i18n.I18n;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@Primary  // 标记为主要实现
public class CrossScenePriceLimitSumAmountHandlerImpl extends DefaultPriceLimitSumAmountHandlerImpl
        implements PriceLimitSumAmountHandlerExtension {

    @Autowired
    private MarketRuleRangeService rangeService;

    @Autowired
    private OrderMarketingApi orderMarketingApi;

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        // 解析规则配置（包含新字段sceneTypes）
        PriceLimitSumAmountDTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), PriceLimitSumAmountDTO.class);

        // 查询规则适用范围
        List<MarketRuleRange> rangeList = rangeService.listRuleRangeLatest(rule.getRuleId());
        List<Integer> mealtimeTypeList = rangeService.filterRangeDetailByType(rangeList, MarketRangeTypeEnum.RANGE_MEALTIME);

        // 使用新字段：根据场景类型配置查询历史订单
        List<OrderInfo> orders = getOrders(order, ruleInfo.getLimitType(), mealtimeTypeList, ruleInfo.getSceneTypes());

        // 查询设备范围并过滤订单
        List<String> customDeviceList = rangeService.filterRangeDetailByType(rangeList, MarketRangeTypeEnum.RANGE_DEVICE);

        // 计算历史金额
        BigDecimal oldAmount = orders.stream()
                .filter(e -> MarketUtil.isValidOrder(customDeviceList, e))
                .map(o -> o.getRealAmount().compareTo(o.getRefundAmount()) > 0
                        ? o.getRealAmount().subtract(o.getRefundAmount())
                        : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 计算本次金额
        BigDecimal nowAmount = getNowTradeCount(order, mealtimeTypeList, customDeviceList, ruleInfo.getLimitType(), orderResults);

        // 判断是否超过限额
        BigDecimal totalCount = oldAmount.add(nowAmount);
        if (totalCount.compareTo(ruleInfo.getMaxAmount()) > 0) {
            throw new LeException(I18n.getMessage("market_price_over_max_amount"));
        }
    }

    /**
     * 查询历史订单（支持自定义场景类型）
     */
    private List<OrderInfo> getOrders(RulePriceResultOrderDTO order, Integer limitType,
                                      List<Integer> mealtimeTypeList, List<Integer> sceneTypes) {
        // 构建限额时间范围
        RulePriceLimitDTO limitDTO = new RulePriceLimitDTO(order, limitType, mealtimeTypeList);

        // 根据场景类型配置转换为订单类型列表
        List<Integer> orderTypes = getOrderTypesBySceneTypes(sceneTypes);

        log.debug("【限额累计金额】查询历史订单，场景类型：{}，订单类型：{}", sceneTypes, orderTypes);

        // 查询历史订单
        return Optional.ofNullable(orderMarketingApi.listOrder(order.getCustId(), limitDTO.getBeginDate(),
                limitDTO.getEndDate(), limitDTO.getMealtimeTypeList(), orderTypes)).orElse(new ArrayList<>());
    }

    /**
     * 根据场景类型列表转换为订单类型列表
     * @param sceneTypes 场景类型列表（为空或null表示全部场景）
     * @return 订单类型列表（null表示查询所有订单类型）
     */
    private List<Integer> getOrderTypesBySceneTypes(List<Integer> sceneTypes) {
        // 向后兼容：场景类型为空或null，查询所有订单类型
        if (CollUtil.isEmpty(sceneTypes)) {
            return null;
        }

        // 将场景类型转换为订单类型列表
        return sceneTypes.stream()
                .flatMap(sceneType -> MarketSceneTypeEnum.getOrderTypeBySceneType(sceneType).stream())
                .distinct()
                .toList();
    }
}
```

### 关键点

1. **DTO扩展**：添加 `sceneTypes` 字段，支持场景类型列表配置
2. **向后兼容**：`sceneTypes` 为空或null时，查询所有场景（保持原有行为）
3. **@Primary注解**：确保定制实现优先于默认实现
4. **继承复用**：继承 `DefaultPriceLimitSumAmountHandlerImpl`，复用 `getNowTradeCount` 方法

---

## 案例2：移除订单类型过滤（限额累计金额规则）

### 背景
原有实现会根据场景类型过滤订单类型，导致只能统计单一场景的订单。业务需求变更为统计所有场景的累计消费。

### 解决方案
使用 **@Primary重写模式**，移除订单类型过滤逻辑。

### 实现步骤

#### 修改默认实现

文件：`leniu-tengyun-core/sys-canteen/src/main/java/net/xnzn/core/marketing/v2/rule/price/handler/limitsumamount/extension/impl/DefaultPriceLimitSumAmountHandlerImpl.java`

```java
@Override
public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                  List<RulePriceResultOrderDTO> orderResults) {
    PriceLimitSumAmountDTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), PriceLimitSumAmountDTO.class);
    List<MarketRuleRange> rangeList = rangeService.listRuleRangeLatest(rule.getRuleId());
    List<Integer> mealtimeTypeList = rangeService.filterRangeDetailByType(rangeList, MarketRangeTypeEnum.RANGE_MEALTIME);

    // 修改前：传递场景类型，会过滤订单类型
    // List<OrderInfo> orders = MarketUtil.getOrders(order, ruleInfo.getLimitType(), mealtimeTypeList, rule.getSceneType());

    // 修改后：不传递场景类型，查询所有订单
    List<OrderInfo> orders = MarketUtil.getOrders(order, ruleInfo.getLimitType(), mealtimeTypeList, null);

    // 其他逻辑保持不变...
}
```

### 关键点

1. **移除过滤**：将 `rule.getSceneType()` 改为 `null`，不再过滤订单类型
2. **影响范围**：所有使用该规则的营销活动都会受影响
3. **兼容性**：不兼容，已配置的规则行为会发生变化（统计范围扩大）

---

## 案例对比

| 特性 | 案例1：自定义场景类型 | 案例2：移除订单类型过滤 |
|------|---------------------|----------------------|
| 定制模式 | @Primary重写 + DTO扩展 | 直接修改默认实现 |
| 向后兼容 | 完全兼容（新字段为null时保持原行为） | 不兼容（行为变更） |
| 灵活性 | 高（可配置场景类型组合） | 低（固定查询所有场景） |
| 实现复杂度 | 中等（需扩展DTO和实现类） | 低（仅修改一行代码） |
| 适用场景 | 需要灵活配置的项目 | 所有项目统一行为变更 |

---

## 其他常见规则类型

### 优惠类规则
- **折扣规则**：`PriceDiscountHandlerExtension`
- **菜品折扣**：`PriceDishDiscountHandlerExtension`
- **商品折扣**：`PriceGoodsDiscountHandlerExtension`
- **满减规则**：`PriceReductionFixedHandlerExtension`

### 限制类规则
- **限额-单次金额**：`PriceLimitMaxAmountHandlerExtension`
- **限额-累计次数**：`PriceLimitMaxCountHandlerExtension`
- **限额-累计金额**：`PriceLimitSumAmountHandlerExtension`

### 补贴类规则
- **固定补贴**：`PriceSubsidyFixedHandlerExtension`
- **累计赠送**：`PriceSumGiveHandlerExtension`

每个规则类型都遵循相同的接口层次和定制模式。
