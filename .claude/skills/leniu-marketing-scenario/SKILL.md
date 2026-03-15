---
name: leniu-marketing-scenario
description: |
  leniu-tengyun-core 营销规则开发场景化技能。统一覆盖四大规则模块（就餐/计价/扣款/充值）的新增、定制、调试全场景。
  当用户提到任何与营销规则、消费规则、计费规则、优惠折扣、限额限次、充值赠送等相关的开发需求时，
  都应使用此技能——即使用户没有明确说"营销"，只要涉及规则 Handler、规则定制、@Primary 覆盖，就属于本技能的范畴。

  触发场景：
  - 新增营销规则类型（计价/充值/扣款/就餐）
  - 定制现有规则逻辑（@Primary 模式重写 Handler）
  - 扩展规则 DTO 字段（向后兼容）
  - 营销规则 CRUD（Controller/Service/Mapper）
  - 调试营销规则计算逻辑（MarketApi 入口排查）
  - 用户说"加个折扣规则"、"限制每日消费次数"、"充值满赠"等

  触发词：营销、营销规则、消费规则、计价规则、充值规则、扣款规则、就餐规则、折扣、满减、限额、限次、补贴、赠送、满赠、管理费、MarketApi、RulePriceHandler、RuleRechargeHandler、RulePayHandler、RuleMealHandler、RulePriceEnum、RuleRechargeEnum、MarketRule、规则定制、@Primary覆盖
---

# leniu 营销规则开发场景化指南

> **本技能合并了 2 个营销碎片技能（price-rule-customizer、recharge-rule-customizer）的核心知识，并扩展覆盖全部四大规则模块。**
> 按需加载详细参考：
> - 计价规则全部类型详解 → 读 `references/price-rules.md`
> - 充值规则全部类型详解 → 读 `references/recharge-rules.md`
> - 扣款/就餐规则详解 → 读 `references/pay-meal-rules.md`

---

## 一、决策树（开发前先过一遍）

### Q1: 涉及哪个规则模块？

| 模块 | moduleType | 说明 | Handler 接口 |
|------|-----------|------|-------------|
| **就餐规则** | 1 | 就餐时段限制、菜品类别限制 | `RuleMealHandler` |
| **计价规则** | 2 | 折扣/满减/限额/限次/补贴/菜品优惠/商品优惠 | `RulePriceHandler` |
| **扣款规则** | 3 | 扣款顺序/最低余额/消费限额 | `RulePayHandler` |
| **充值规则** | 4 | 满赠/按次赠送/限额/管理费 | `RuleRechargeHandler` |

### Q2: 什么类型的开发任务？

| 任务 | 操作 |
|------|------|
| **新增规则类型** | 创建 DTO + Extension 接口 + Default 实现 + 注册枚举 |
| **重写规则逻辑（@Primary）** | 定制项目中创建 @Primary 实现类 |
| **扩展 DTO 字段** | 在核心包名下覆盖 DTO 类，新字段支持 null |
| **营销管理 CRUD** | MarketRuleController + MarketRuleService |
| **调试规则计算** | 从 MarketApi 入口跟踪 → Provider → Handler |

### Q3: 是核心开发还是定制开发？

| 场景 | 代码位置 | 包名 |
|------|---------|------|
| **核心（标准版）** | `sys-canteen/.../marketing/v2/` | `net.xnzn.core.marketing.v2.*` |
| **定制（项目定制）** | 定制仓库对应目录 | `net.xnzn.yunshitang.marketing.*` |

---

## 二、架构总览

### 四大规则模块 + 策略模式

```
MarketApi（统一入口）
 ├── RuleMealApi    → RuleMealProvider    → RuleMealHandler（策略接口）
 ├── RulePriceApi   → RulePriceProvider   → RulePriceHandler（策略接口）
 ├── RulePayApi     → RulePayProvider     → RulePayHandler（策略接口）
 └── RuleRechargeApi→ RuleRechargeProvider→ RuleRechargeHandler（策略接口）
```

### 核心类职责

| 类 | 职责 |
|----|------|
| `MarketApi` | 统一入口，分布式锁、规则开关检查、路由到对应 Api |
| `RuleXxxApi` | 查找匹配规则、按分类排序执行、记录计算结果 |
| `RuleXxxProvider` | Spring 自动注入所有 Handler，按 ruleType 查找 |
| `RuleXxxHandler` | 策略接口：`handle()` + `getRuleType()` + `checkRuleInfo()` |
| `MarketRuleCustomBusiness` | 扩展点：规则计算前/后的 Hook（定制项目可 @Primary 覆盖） |
| `MarketRuleService` | 规则 CRUD、适用规则查询 |
| `MarketRuleRangeService` | 规则适用范围（人员/设备/餐次） |
| `MarketUtil` | 设备 SN 格式化、历史订单查询、时间周期计算 |
| `RuleCacheManager` | 规则缓存管理 |

### 计价规则执行顺序

```
限次规则 → 优惠规则 → 限额规则 → 赠送规则
```

### 充值规则执行顺序

```
限额规则 → 赠送规则 → 管理费规则
```

---

## 三、Handler 三层结构（策略模式）

每种规则类型遵循统一的三层结构：

```
RulePriceHandler（顶层接口）
  └── PriceDiscountHandlerExtension（扩展接口，定义 getRuleType + checkRuleInfo）
        └── DefaultPriceDiscountHandlerImpl（默认实现，@Service）
              └── CustomPriceDiscountHandlerImpl（定制实现，@Service @Primary）
```

### 四大 Handler 接口签名

```java
// 计价规则
void handle(RulePriceResultOrderDTO order, MarketRuleVO rule, List<RulePriceResultOrderDTO> orderResults);

// 充值规则
void handle(RuleRechargeResultDTO resultDTO, MarketRuleVO ruleInfo);

// 扣款规则
void handle(RulePayComputeDTO computeDTO, MarketRuleVO rule, RulePayResultDTO result);

// 就餐规则
void handle(CustPayVO custPayVO, MarketRuleVO rule);
```

---

## 四、规则类型速查

### 计价规则 RulePriceEnum（18 种）

| 分类 | 枚举 | key | 说明 |
|------|------|-----|------|
| **优惠** | RULE_DISCOUNT | 1 | 打折（按次数梯度） |
| | RULE_REDUCTION_TOTAL | 2 | 累计减免 |
| | RULE_REDUCTION_FIXED | 4 | 固定减免（按次数梯度） |
| | RULE_DEDUCTION_RATIO | 5 | 比例扣费 |
| | RULE_DEDUCTION_FIXED | 6 | 固定扣费（按次数梯度） |
| | RULE_DEDUCTION_FULL | 7 | 满减满折 |
| | RULE_ADD_AMOUNT | 9 | 额外扣费 |
| **赠送** | RULE_SUBSIDY_FIXED | 3 | 固定补贴 |
| | RULE_SUM_GIVE | 8 | 满额赠送（累计门槛） |
| **限次** | RULE_LIMIT_MAX_COUNT | 51 | 上限次数 |
| | RULE_DISH_LIMIT | 201 | 菜品限购 |
| | RULE_GOODS_LIMIT | 301 | 商品限购 |
| **限额** | RULE_LIMIT_MAX_AMOUNT | 101 | 单笔上限金额 |
| | RULE_LIMIT_SUM_AMOUNT | 102 | 累计上限金额 |
| **菜品** | RULE_DISH_DISCOUNT | 151 | 菜品打折 |
| | RULE_DISH_DISCOUNT_LIMIT | 152 | 菜品打折限购 |
| | RULE_DISH_PACKAGE | 153 | 套餐优惠 |
| **商品** | RULE_GOODS_DISCOUNT | 251 | 商品打折 |
| | RULE_GOODS_DISCOUNT_LIMIT | 252 | 商品打折限购 |

### 充值规则 RuleRechargeEnum（5 种）

| 分类 | 枚举 | key |
|------|------|-----|
| **赠送** | RULE_FULL_GIFT | 1（满赠） |
| | RULE_TIMES_GIFT | 2（按次赠送） |
| **限额** | RULE_MAX_AMOUNT | 51（单笔上限） |
| | RULE_SUM_AMOUNT | 52（累计上限） |
| **费用** | RULE_MANAGE_COST | 101（管理费） |

### 扣款规则 RulePayEnum（3 种）

| 枚举 | key | 说明 |
|------|-----|------|
| RULE_PAY_SEQUENCE | 1 | 扣款顺序 |
| RULE_PAY_MIN_BALANCE | 2 | 钱包最低余额 |
| RULE_PAY_LIMIT_BALANCE | 3 | 钱包消费限额 |

### 就餐规则 RuleMealEnum（2 种）

| 枚举 | key | 说明 |
|------|-----|------|
| RULE_TIME_LIMIT | 1 | 就餐时段限制 |
| RULE_DISH_LIMIT | 2 | 菜品类别限制 |

---

## 五、新增规则模板

以计价规则为例（充值/扣款/就餐同理，替换接口和 DTO）：

### 1. 创建 DTO

```java
// 位置: net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].dto
@Data
@ApiModel("计价规则详情-[规则名称]")
public class Price[RuleType]DTO {
    @ApiModelProperty("[字段说明]")
    private [Type] fieldName;

    @Override
    public String toString() {
        return "fieldName=" + fieldName;
    }
}
```

### 2. 创建扩展接口

```java
// 位置: net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].extension
public interface Price[RuleType]HandlerExtension extends RulePriceHandler {
    @Override
    default Integer getRuleType() {
        return RulePriceEnum.[RULE_TYPE].getKey();
    }

    @Override
    default String checkRuleInfo(String ruleInfo) {
        Price[RuleType]DTO rule = JSON.parseObject(ruleInfo, Price[RuleType]DTO.class);
        return rule.toString();
    }
}
```

### 3. 创建默认实现

```java
// 位置: net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].extension.impl
@Slf4j
@Service
public class DefaultPrice[RuleType]HandlerImpl implements Price[RuleType]HandlerExtension {

    @Autowired
    private MarketRuleRangeService rangeService;

    @Override
    public void handle(RulePriceResultOrderDTO order, MarketRuleVO rule,
                      List<RulePriceResultOrderDTO> orderResults) {
        // 1. 解析规则配置
        Price[RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), Price[RuleType]DTO.class);
        // 2. 查询规则适用范围
        List<MarketRuleRange> rangeList = rangeService.listRuleRangeLatest(rule.getRuleId());
        // 3. 实现计算逻辑
        // ...
        // 4. 更新订单金额
        order.setDiscountsAmount(order.getDiscountsAmount().add(discountAmount));
    }
}
```

### 4. 注册枚举

```java
// 在 RulePriceEnum 中添加
RULE_[TYPE](key, "{market_rule_price_[type]}", "描述"),
```

---

## 六、定制规则模板（@Primary 模式）

```java
// 位置: net.xnzn.yunshitang.marketing.handler（定制项目包名）
@Slf4j
@Service
@Primary
public class Custom[RuleType]HandlerImpl extends Default[RuleType]HandlerImpl
        implements [RuleType]HandlerExtension {

    @Override
    public void handle(...) {
        // 解析规则（可能包含扩展 DTO 字段）
        [RuleType]DTO ruleInfo = JSON.parseObject(rule.getRuleInfo(), [RuleType]DTO.class);

        // 扩展字段向后兼容：null 时保持原行为
        if (CollUtil.isNotEmpty(ruleInfo.getNewField())) {
            // 定制逻辑
        }

        // 可选：调用父类逻辑
        // super.handle(...);
    }
}
```

### 扩展 DTO 字段

```java
// 在核心包名下覆盖 DTO（不是定制包名！）
// 位置: net.xnzn.core.marketing.v2.rule.price.handler.[ruletype].dto
@Data
public class Price[RuleType]DTO {
    // 原有字段...
    private BigDecimal limitAmount;

    // 扩展字段（必须支持 null）
    @ApiModelProperty("新增字段（null=默认行为）")
    private List<Integer> newField;
}
```

---

## 七、MarketApi 入口速查

```java
@Autowired
private MarketApi marketApi;

// 计价规则计算（带分布式锁）
RulePriceResultDTO result = marketApi.rulePriceCompute(rulePriceDTO);

// 充值规则计算（带分布式锁）
RuleRechargeResultDTO result = marketApi.ruleRechargeCompute(computeDTO);

// 扣款规则计算
RulePayResultDTO result = marketApi.rulePayCompute(computeDTO);

// 就餐规则计算
marketApi.ruleMealCompute(rulePriceDTO);

// 取消订单清除优惠记录
marketApi.disableMarketRecord(orderIds);
```

### 规则开关机制

每个规则模块通过 `AllocGroupMetadataApi` 控制开关：
- `MetadataFiledConstants.RULE_MEAL` → 就餐规则
- `MetadataFiledConstants.RULE_PRICE` → 计价规则
- `MetadataFiledConstants.RULE_PAY` → 扣款规则
- `MetadataFiledConstants.RULE_RECHARGE` → 充值规则

---

## 八、关键数据模型

### MarketRule（规则基本信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| ruleId | Long | 规则ID（雪花ID） |
| ruleName | String | 规则名称 |
| sceneType | Integer | 场景类型 |
| moduleType | Integer | 模块类型（1就餐/2计价/3扣款/4充值） |
| ruleType | Integer | 规则类型（对应枚举 key） |
| effectTimeType | Integer | 生效时间类型（1限制/2不限） |
| effectBeginTime | LocalDate | 生效开始时间 |
| effectEndTime | LocalDate | 生效结束时间 |
| effectTimeValue | String | 时间段（逗号分隔） |
| effectPeriod | Integer | 周期（1每天/2每周/3每月/4日期） |
| ruleInfo | String | **规则配置JSON**（对应 DTO） |
| sort | Integer | 优先级 |
| version | Integer | 版本号 |

### MarketRuleRange（规则适用范围）

关联人员组、食堂、档口、设备、餐次等维度。

### MarketRuleRecord（规则计算记录）

记录每次规则计算结果，用于累计统计（限次/限额/赠送门槛等）。

---

## 九、常见开发场景

### 场景 A：新增一个计价优惠规则

1. 确定规则分类（优惠/限次/限额/赠送）
2. 在 `RulePriceEnum` 注册枚举（选择合适的 key 范围）
3. 创建 DTO → Extension → DefaultImpl（参考第五节模板）
4. 读 `references/price-rules.md` 了解现有实现

### 场景 B：定制现有规则行为

1. 确定要定制的 Handler 和 Extension 接口
2. 在定制项目中创建 @Primary 实现（参考第六节模板）
3. 可选：扩展 DTO 字段

### 场景 C：调试规则计算不生效

1. 检查规则开关：`MetadataFiledConstants.RULE_XXX` 是否启用
2. 检查规则匹配：`MarketRuleService.getSuitableRules()` 返回值
3. 检查 Handler 路由：`RulePriceProvider.getMarketPriceHandler(ruleType)`
4. 检查分布式锁：`MarketApi` 中的 RedisLock 是否超时

### 场景 D：营销规则管理页面

Controller: `MarketRuleController` → `/api/v2/market/rule/*`
- `POST /page` — 分页查询
- `POST /detail` — 规则详情
- `POST /add` — 新增
- `POST /edit` — 修改
- `POST /remove/{ruleId}` — 删除
- `POST /change` — 启用/禁用
- `GET /enums` — 规则枚举列表

---

## 十、MQ 消费

| 监听器 | 职责 |
|--------|------|
| `MarketOrderMQListener` | 订单相关事件处理 |
| `MarketAccountMQListener` | 账户相关事件处理 |
| `MarketSumGiveMQListener` | 满额赠送异步处理 |

---

## 十一、包结构速查

```
net.xnzn.core.marketing.v2/
├── api/                    # MarketApi（统一入口）
├── cache/                  # RuleCacheManager
├── config/                 # MQ Listeners
├── constants/              # 通用枚举（场景/模块/设备树/生效时间/周期）
├── controller/             # MarketRuleController
├── custom/                 # MarketRuleCustomBusiness（扩展点）
├── dto/                    # 规则编辑/记录 DTO
├── mapper/                 # Mapper + XML
├── model/                  # Entity（MarketRule/Range/Record/Ext/History）
├── param/                  # 查询参数
├── rule/
│   ├── meal/               # 就餐规则（handler/api/constants）
│   ├── price/              # 计价规则（handler/api/constants/dto）
│   │   └── handler/
│   │       ├── discount/   # 打折（dto/extension/impl）
│   │       ├── limitmaxcount/  # 限次
│   │       └── ...         # 其他 18 种规则类型
│   ├── pay/                # 扣款规则
│   └── recharge/           # 充值规则
├── service/                # Service 层
├── util/                   # MarketUtil
└── vo/                     # 返回对象
```

---

## 十二、边界与延伸

本技能覆盖营销规则开发的完整场景。以下情况请使用其他技能：

- 非营销的普通 CRUD → `leniu-crud-development`
- 报表统计（消费汇总等）→ `leniu-report-scenario`
- 定制项目代码位置规范 → `leniu-customization-location`
- MQ 消费通用规范 → `leniu-java-mq`

本技能的 references 目录按需加载：
- 计价规则 18 种类型全部详解 → 读 `references/price-rules.md`
- 充值规则 5 种类型全部详解 → 读 `references/recharge-rules.md`
- 扣款/就餐规则详解 → 读 `references/pay-meal-rules.md`
