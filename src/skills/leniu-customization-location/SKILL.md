---
name: leniu-customization-location
description: |
  leniu 定制项目代码位置规范。在 leniu-tengyun-wuhanxieheyiyuan（或其他定制仓库）中开发定制功能时，确定代码位置和修改方式。

  触发场景：
  - 在定制仓库中新建类，不知道放哪个目录或包名
  - 需要修改 core 仓库的 Service/Controller/Business/API
  - 新建定制报表 Service 时遇到 MQ 双重注册问题
  - 需要确认定制文件命名规范（Dz 前缀）
  - 新建数据库表，不知道表名前缀和表结构
  - Mapper XML 放错目录
  - 定制仓库如何调用原 core 类的方法（super()）
  - 实现新的接口扩展点（PayCustomBusiness 等）

  触发词：定制开发、定制代码位置、Dz 前缀、leniu-yunshitang、dz_ 表名、定制仓库、覆盖 Service、@Primary、迁移 core 文件、定制开始、定制结束、net.xnzn.yunshitang、wuhanxiehe 定制、bootstrap-ext
---

# leniu 定制项目代码位置规范

## 适用场景

当在 `leniu-tengyun-wuhanxieheyiyuan`（或其他定制仓库）中开发定制功能时，遵循以下规范确定代码位置和修改方式。

---

## 一、定制项目特征识别

| 特征 | 说明 |
|------|------|
| **仓库名** | `leniu-tengyun-wuhanxieheyiyuan` |
| **主模块** | `leniu-yunshitang` |
| **包名根路径** | `net.xnzn.yunshitang.*`（新写类）/ `net.xnzn.core.*`（迁移类） |
| **类名前缀** | `Dz`（如 `DzReportSummaryService`、`DzOrderOpenApi`） |
| **表名前缀** | `dz_`（如 `dz_subsidy_batch`、`dz_report_sum_canteen_wallet_mealtime`） |
| **注释标记** | `// 定制开始` / `// 定制结束` |

---

## 二、新写代码的位置

### 2.1 新写类的存放路径

所有新写的定制类放在：

```
leniu-yunshitang/src/main/java/net/xnzn/yunshitang/
```

**文件名前缀必须用 `Dz`**，示例：
- `DzMealOnlineService.java`
- `DzReportSummaryController.java`
- `DzMealDetailVO.java`
- `DzSubsidyBatch.java`（Entity）
- `DzCustInfoMapper.java`（Mapper）

### 2.2 标准包结构

```
net.xnzn.yunshitang/
├── account/                          # 账户/补贴模块
│   ├── controller/
│   ├── service/
│   ├── mapper/
│   ├── model/                        # Entity：DzSubsidyBatch、DzSubsidyDetail
│   ├── dto/
│   ├── vo/
│   └── enums/
├── customer/                         # 人员模块
│   ├── mapper/                       # DzCustInfoMapper（继承 CustInfoMapper）
│   └── service/
├── notice/                           # 通知模块
│   ├── business/                     # DzNoticeBurialPointBusiness
│   └── config/
├── order/
│   └── open/                         # DzOrderOpenApi
├── pay/
│   └── custom/                       # PayCustomBusinessImpl
└── report/
    └── statistics/
        └── order/
            ├── basic/                # 基础报表（直接查 report_order_info）
            │   ├── controller/
            │   ├── service/
            │   ├── mapper/           # DzXxxMapper.java + DzXxxMapper.xml（同目录）
            │   ├── param/
            │   └── vo/
            ├── analysis/             # 分析报表
            └── summary/              # 汇总报表
```

### 2.3 注释规范

在修改/新增的代码块上下方加注释：

```java
// 定制开始：计算线下订单销售额占比
if (CollUtil.isNotEmpty(list) && total != null) {
    list.forEach(item -> {
        BigDecimal proportion = item.getSalesAmount()
            .divide(total.getSalesAmount(), 4, RoundingMode.HALF_UP)
            .setScale(2, RoundingMode.HALF_UP);
        item.setSalesAmountProportion(proportion);
    });
}
// 定制结束
```

**何时使用注释**：
- 新写 `Dz` 前缀的类：类文件整体被认为是定制，注释可选
- 迁移改造的 `net.xnzn.core.*` 类：每个改动处**必须**加注释
- 在父类方法中插入逻辑时**必须**加注释

### 2.4 Mapper XML 存放位置

MyBatis XML **不能**放在 `resources/mapper/` 目录，必须与 Mapper 接口同目录：

```
net/xnzn/yunshitang/.../mapper/DzXxxMapper.java
net/xnzn/yunshitang/.../mapper/DzXxxMapper.xml   ← 同目录！
```

pom.xml 需配置资源过滤：
```xml
<build>
  <resources>
    <resource>
      <directory>src/main/java</directory>
      <includes>
        <include>**/*.xml</include>
      </includes>
    </resource>
    <resource>
      <directory>src/main/resources</directory>
    </resource>
  </resources>
</build>
```

### 2.5 新建表名前缀

定制业务新建的数据库表，表名必须以 `dz_` 开头：

```sql
CREATE TABLE dz_subsidy_batch
(
    id           BIGINT         NOT NULL COMMENT '主键（雪花ID）',
    batch_num    VARCHAR(255)   NOT NULL COMMENT '批次号',
    subsidy_date DATE           DEFAULT NULL COMMENT '补贴日期',
    total_count  INT            DEFAULT 0 COMMENT '总人数',
    -- 审计字段
    crby         VARCHAR(64)    COMMENT '创建人',
    crtime       DATETIME       COMMENT '创建时间',
    upby         VARCHAR(64)    COMMENT '更新人',
    uptime       DATETIME       COMMENT '更新时间',
    del_flag     INT            DEFAULT 2 COMMENT '删除标识(1-删除,2-正常)',
    PRIMARY KEY (id)
) COMMENT = '定制-补贴批次主表';
-- ⚠️ 无需 tenant_id（双库物理隔离）
```

---

## 三、修改 core 文件的三种方式

### 方式选择决策树

```
需要修改 core 类?
├── 是否是报表 Service（实现 ReportOrderConsumeService/含 consume/fix 方法）?
│   ├── 是 → 【方式三：迁移】将文件迁移到定制仓库的 net.xnzn.core.* 路径
│   └── 否 → 【方式一：继承 + @Primary】新建 Dz 前缀子类覆盖
│
├── 是否是新增扩展点实现（实现新接口）?
│   └── 是 → 【方式二：实现接口 + @Primary】
│
└── 是否是 Mapper 接口?
    └── 是 → 【方式四：继承 Mapper + @Primary】
```

---

### 方式一：继承 Service/Business/API + @Primary（推荐）

适用于：普通 Service、Business、Open API 等单实现场景。

```java
// 定制开始
@Primary
@Service
@Slf4j
public class DzOrderOpenApi extends OrderOpenApi {

    @Lazy
    @Autowired
    private OrderRefundMapper orderRefundMapper;

    @Override
    public PageVO<QueryRefundTradeOpenVO> queryConsumeOrderRefundFlow(OrderOpenRefundFlowQueryDTO queryDTO) {
        // 先调用父类逻辑
        PageVO<QueryRefundTradeOpenVO> pageVO = super.queryConsumeOrderRefundFlow(queryDTO);

        if (CollUtil.isEmpty(pageVO.getRecords())) {
            return pageVO;
        }

        // 定制开始：补充退款申请时间和审核时间
        List<Long> refundIds = pageVO.getRecords().stream()
            .map(QueryRefundTradeOpenVO::getRefundOrdId).toList();

        Map<Long, OrderRefund> orderRefundMap = orderRefundMapper
            .selectList(Wrappers.lambdaQuery(OrderRefund.class)
                .select(OrderRefund::getOrderRefundId, OrderRefund::getApplyTime, OrderRefund::getCheckTime)
                .in(OrderRefund::getOrderRefundId, refundIds))
            .stream()
            .collect(Collectors.toMap(OrderRefund::getOrderRefundId, Function.identity()));

        for (QueryRefundTradeOpenVO record : pageVO.getRecords()) {
            OrderRefund orderRefund = orderRefundMap.get(record.getRefundOrdId());
            if (orderRefund != null) {
                record.setApplyTime(orderRefund.getApplyTime());
                record.setCheckTime(orderRefund.getCheckTime());
            }
        }
        // 定制结束

        return pageVO;
    }
}
// 定制结束
```

**Business 层继承示例**（覆盖通知渠道）：

```java
@Service
@Slf4j
@Primary
public class DzNoticeBurialPointBusiness extends NoticeBurialPointBusiness {

    @Resource
    private NoticeSendWebServiceSMSBusiness noticeSendWebServiceSMSBusiness;

    @Override
    public NoticeSendBusiness getSpecialNoticeSendBusiness(Integer templateType) {
        if (NoticeTemplateTypeEnum.isSms(templateType)) {
            // 定制开始：使用医院本地短信服务
            return noticeSendWebServiceSMSBusiness;
            // 定制结束
        }
        return null;
    }

    @Override
    public boolean isXnSmsPlatform() {
        return false; // 定制：不使用讯牛短信，改用本地 WebService 短信
    }
}
```

**关键规则**：
- `@Primary` 确保 Spring 优先注入定制类
- `@Lazy` 防止循环依赖（注入新 Bean 时使用）
- 调用 `super.xxx()` 复用父类逻辑，再追加定制逻辑

---

### 方式二：实现新接口 + @Primary

适用于：framework 提供了扩展点接口，需要提供实现。

```java
// 定制开始
@Primary
@Service
public class PayCustomBusinessImpl implements PayCustomBusiness {

    @Override
    public AutoQuerySupportVO didSupportAutoQuery(UnifyPayDTO unifyPayDTO,
                                                  UnifyPayVO unifyPayVO,
                                                  AutoQuerySupportVO supportVO) {
        // 定制开始：微信JSAPI支付通过招商银行通道时启用自动查询
        if (PayTypeEnum.isWechatJsapiPay(unifyPayDTO.getPayType())
                && PayChannelEnum.CMB_PAY.getKey().equals(unifyPayDTO.getPayChannel())) {
            supportVO.setNeedAutoQuery(true);
            supportVO.setExpireSeconds(180L);
            supportVO.setAutoDelaySeconds(5L);
        }
        // 定制结束
        return supportVO;
    }
}
// 定制结束
```

---

### 方式三：迁移报表 Service（含 consume/fix 方法）

**⚠️ 不能用 @Primary 继承** — 会导致 MQ 消费双重注册（两个 Bean 都收到消息）。

正确做法：
1. 将原文件从 `leniu-tengyun-core` 复制到定制仓库
2. 保持**包名不变**（仍是 `net.xnzn.core.*`），但存放在定制仓库目录
3. 在修改处加 `// 定制开始` / `// 定制结束`

```
# 原位置（core 仓库）
leniu-tengyun-core/sys-canteen/src/.../service/ReportSumDishesService.java

# 迁移后（定制仓库，包名不变！）
leniu-yunshitang/src/main/java/net/xnzn/core/report/statistics/order/summary/service/ReportSumDishesService.java
```

迁移文件中的定制部分：
```java
@Override
public ReportBaseTotalVO<ReportSumDishesVO> pageDishesSalesSummary(ReportDishesParam param) {
    // ... 原有逻辑 ...

    // 定制开始：自助餐类型使用特殊 Mapper 方法
    if (param.getOrderTypeList().stream().allMatch(s -> s == 12)) {
        list = reportSumDishesMapper.listBuffetOrderDishesSum(param, authPO, dataPermission);
        total = reportSumDishesMapper.getBuffetSummaryTotal(param, authPO, dataPermission);
    }
    // 定制结束

    // ... 原有逻辑 ...
}
```

---

### 方式四：继承 Mapper 接口 + @Primary

适用于：需要扩展原 Mapper 的查询方法，或添加定制 SQL。

```java
@Mapper
@Primary
public interface DzCustInfoMapper extends CustInfoMapper {
    // 继承原有所有方法
    // 可新增定制查询方法
    List<CustInfoVO> selectByPayrollNo(@Param("payrollNo") String payrollNo);
}
```

---

## 四、核心包路径对照

| 内容 | 核心路径（core 仓库） | 定制路径（wuhanxiehe 仓库） |
|------|-------------------|-----------------------|
| **新写定制类** | — | `net.xnzn.yunshitang.*` |
| **迁移改造的 core 类** | `net.xnzn.core.*` | `net.xnzn.core.*`（同包名，放在定制仓库） |
| **定制 Mapper XML** | — | 与 Java 文件同目录（不放 resources） |
| **定制数据库表** | — | 表名前缀 `dz_` |
| **定制配置** | — | `bootstrap-ext.yml`（定制仓库 resources 下） |

---

## 五、配置文件规范

定制项目特有配置放在 `bootstrap-ext.yml`：

```yaml
# 定制项目报表配置
yunshitang:
  report:
    exclude-canteen-name: ${EXCLUDE_CANTEEN_NAME:本院营养食堂}
    headquarter:
      area:
        name: 本部食堂

# 定制第三方服务（如医院短信平台）
wuhanxiehe:
  sms:
    service-url: ${PROJECT_WUHANXIEHE_SMS_SERVICE_URL:http://...}
    username: ${PROJECT_WUHANXIEHE_SMS_USERNAME:xxx}
    timeout: ${PROJECT_WUHANXIEHE_SMS_TIMEOUT:30000}
```

---

## 六、完整定制报表功能实现步骤

新建一个完整的定制报表功能的标准步骤：

1. **创建定制查询参数** → `DzXxxParam.java`（继承 `ReportBaseParam` 或 `PageDTO`）
2. **创建定制返回 VO** → `DzXxxVO.java`（金额字段 BigDecimal，以分为单位）
3. **创建定制 Mapper** → `DzXxxMapper.java`（接口，3 参数：param + authPO + dataPermission）
4. **创建定制 Mapper XML** → `DzXxxMapper.xml`（同目录，baseWhere 引入权限片段）
5. **创建定制 Service** → `DzXxxService.java`（注入权限 Bean，pageWithTotal/getTotal/export 三个方法）
6. **注册到 Controller** → 在 `DzReportSummaryController` 中注入 Service，新增接口

---

## 七、检查清单

- [ ] 新写类文件名有 `Dz` 前缀
- [ ] 新写类放在 `net.xnzn.yunshitang.*` 包下
- [ ] 修改代码处有 `// 定制开始` / `// 定制结束` 注释
- [ ] Mapper XML 与 Java 文件同目录（非 resources）
- [ ] pom.xml 已配置 `src/main/java` 下 xml 资源过滤
- [ ] 新建表以 `dz_` 开头，审计字段用 crby/crtime/upby/uptime/del_flag
- [ ] 覆盖普通 Service/Business/API 时使用 `@Primary` 继承
- [ ] 报表 MQ Service（有 consume/fix 方法）必须迁移，不能用 @Primary
- [ ] 不直接修改 `leniu-tengyun-core` 仓库的文件
- [ ] 报表查询方法注入 `MgrAuthV2Api` + `ReportDataPermissionService`，所有 Mapper 调用传权限参数
- [ ] 继承类中调用父类逻辑时用 `super.xxx()`，只重写需要变更的部分
