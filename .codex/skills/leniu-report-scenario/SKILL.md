---
name: leniu-report-scenario
description: |
  leniu-tengyun-core 报表开发场景化技能。统一覆盖报表查询、导出、合计行、金额处理、餐次、汇总表定制等全场景。
  当用户提到任何与报表、统计汇总、数据导出相关的开发需求时，都应使用此技能——即使用户没有明确说"报表"，
  只要涉及分页查询+导出、金额分转元、合计行、按日期/食堂/餐次维度汇总，就属于本技能的范畴。

  触发场景：
  - 开发报表分页查询 + 导出接口
  - 基于 report_order_info / report_account_flow 开发汇总报表
  - 报表 VO 金额字段处理（BigDecimal 分→元、CustomNumberConverter）
  - 报表合计行查询（ReportBaseTotalVO + totalLine）
  - 报表餐次筛选与转换（MealtimeTypeConverter）
  - 定制汇总表（ReportOrderConsumeService + MQ 消费 + fix 重算）
  - 用户说"做个统计页面"、"按食堂汇总消费数据"、"导出 Excel"等

  触发词：报表、报表开发、报表查询、报表导出、统计、汇总、合计行、totalLine、汇总报表、定制报表、report_order_info、report_account_flow、金额处理、分转元、餐次、mealtime、ReportBaseTotalVO、CustomNumberConverter、ExcelProperty、ReportOrderConsumeService、ExportApi、PageVO、导出Excel
---

# leniu 报表开发场景化指南

> **本技能合并了 7 个报表碎片技能的核心知识**。按需加载详细参考：
> - 汇总表定制（MQ/fix/batchConsume）→ 读 `references/customization.md`
> - report_order_info 完整字段 → 读 `references/report-tables.md`
> - 数据权限集成 → 读 `references/data-permission.md`

---

## 一、决策树（开发前先过一遍）

### Q1: 数据来源？

| 来源 | 说明 | 操作 |
|------|------|------|
| **A. 基于 report_order_info** | 订单/退款汇总报表 | 读 `references/report-tables.md` 了解字段 |
| **B. 基于 report_account_flow** | 账户流水报表 | 读 `references/report-tables.md` |
| **C. 已有业务表** | 非报表基础表的查询 | 直接用本文模板 |
| **D. 全新表** | 新建汇总表 | 读 `references/customization.md` |

### Q2: 需要哪些功能？

| 功能 | 是否必选 | 说明 |
|------|---------|------|
| 分页查询 | **必选** | PageMethod + PageVO |
| 导出 | **必选** | ExportApi / EasyExcelUtil |
| 合计行 | 可选 | ReportBaseTotalVO + totalLine |
| 餐次筛选 | 可选 | mealtimeTypes + MealtimeTypeConverter |
| 数据权限 | 默认不加 | 用户要求时读 `references/data-permission.md` |
| MQ 消费/fix | 仅汇总表 | 读 `references/customization.md` |

### Q3: 版本？

| 判断方式 | 标准版（core-report） | v5.29 版本（sys-canteen） |
|---------|---------------------|-------------------------|
| 退款存储 | 独立 `report_refund` 表（**正数**） | 合并入 `report_order_info`（`consumeType=2`，**负数**） |
| 第二阶段 | `fix()` 按日重算 | `batchConsume()` 增量累加 |
| consumeType | **无此字段** | 1=消费，2=退款 |

---

## 二、金额处理规范

### 存储模式

| 模块 | Entity 类型 | 值单位 | VO 类型 |
|------|------------|--------|---------|
| 订单/报表 | `BigDecimal` | 分 | `BigDecimal` |
| 钱包/账户 | `Long` | 分 | `BigDecimal`（元，MyBatis 自动转） |

### 为什么这样设计

金额在数据库中以**分**为单位存储（避免浮点精度问题），转换为**元**的职责交给展示层：
- 页面展示：前端 `money()` 过滤器自动除以 100
- Excel 导出：`CustomNumberConverter` 自动除以 100
- SQL 中不做除法：保证聚合计算精度不丢失

```java
// ❌ SQL 中做 /100.0 会导致聚合精度丢失，且前端会再除一次变成万分之一
SELECT order_amount / 100.0 AS order_amount

// ✅ 直接查原始值，展示层负责转换
SELECT order_amount AS order_amount

// ✅ 导出时 CustomNumberConverter 自动 ÷100
@ExcelProperty(value = "金额（元）", converter = CustomNumberConverter.class)
private BigDecimal amount;

// ❌ @NumberFormat 只做格式化，不做 ÷100 转换
@NumberFormat("#,##0.00")
```

### 合计行 SQL 只返回数值字段

合计行的目的是在表格底部显示各列的汇总值。非数值列（日期、名称、ID）在合计行中无意义，返回它们会导致前端渲染混乱或 MyBatis 映射错误。

```xml
<select id="getSummaryTotal" resultType="XxxVO">
    SELECT
        SUM(real_amount) AS realAmount,
        SUM(refund_amount) AS refundAmount,
        SUM(order_count) AS orderCount
    FROM xxx_table
    <where>...</where>
</select>
<!-- 注意：不要 SELECT statistic_date、canteen_name 等非数值字段 -->
```

---

## 三、Param 模板

```java
@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "XXX报表查询参数")
public class XxxParam extends ReportBaseParam {
    // ReportBaseParam 已有: page(PageDTO), startDate, endDate, exportCols, sumType, sumDimension

    @ApiModelProperty("食堂ID列表")
    private List<Long> canteenIds;

    @ApiModelProperty("组织ID列表")
    private List<Long> orgIds;

    @ApiModelProperty("餐次集合")           // 可选
    private List<Integer> mealtimeTypes;

    @ApiModelProperty("关键字")
    private String keyword;
}
```

**两层继承**（经营分析类报表）：
```
ReportAnalysisParam（含 dateType: 1按月/2按日, canteenStallIds）
    └── ReportAnalysisTurnoverParam（具体 Param）
```

---

## 四、VO 模板

```java
@Data
@Accessors(chain = true)
@ApiModel("XXX报表")
public class XxxVO {

    @ExcelProperty(value = "日期", order = 1)
    @ApiModelProperty("统计日期")
    private String statisticDate;

    @ExcelProperty(value = "食堂", order = 2)
    @ApiModelProperty("食堂名称")
    private String canteenName;

    // 可选：餐次字段
    @ExcelProperty(value = "餐次", order = 3, converter = MealtimeTypeConverter.class)
    @ApiModelProperty("餐次")
    private Integer mealtimeType;

    // 金额字段：必须用 CustomNumberConverter
    @ExcelProperty(value = "消费金额（元）", order = 4, converter = CustomNumberConverter.class)
    @ApiModelProperty("消费金额（分）")
    private BigDecimal consumeAmount;

    @ExcelProperty(value = "退款金额（元）", order = 5, converter = CustomNumberConverter.class)
    @ApiModelProperty("退款金额（分）")
    private BigDecimal refundAmount;

    @ExcelProperty(value = "净金额（元）", order = 6, converter = CustomNumberConverter.class)
    @ApiModelProperty("净金额（分）")
    private BigDecimal netAmount;

    @ExcelProperty(value = "订单数", order = 7)
    @ApiModelProperty("订单数")
    private Integer orderCount;
}
```

**必要 import**：
```java
import com.alibaba.excel.annotation.ExcelProperty;
import net.xnzn.core.common.export.converter.CustomNumberConverter;
import net.xnzn.core.common.export.converter.MealtimeTypeConverter;  // 可选
```

---

## 五、Controller 模板

```java
@Api(tags = "XXX报表")
@RestController
@RequestMapping("/api/v2/web/report/xxx")
@RequiresAuthentication
public class XxxReportWebController {

    @Autowired
    private XxxReportService xxxReportService;
    @Autowired
    private ExportApi exportApi;

    @PostMapping("/page")
    @ApiOperation("分页查询（带合计）")
    public ReportBaseTotalVO<XxxVO> page(@RequestBody LeRequest<XxxParam> request) {
        return xxxReportService.pageWithTotal(request.getContent());
    }

    @PostMapping("/export")
    @ApiOperation("导出")
    public void export(@RequestBody LeRequest<XxxParam> request) {
        XxxParam param = request.getContent();
        XxxVO totalLine = xxxReportService.getSummaryTotal(param);
        exportApi.startExcelExportTaskByPage(
            I18n.getMessage("report.xxx.title"),
            I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
            XxxVO.class,
            param.getExportCols(),
            param.getPage(),
            totalLine,
            () -> xxxReportService.pageWithTotal(param).getResultPage()
        );
    }
}
```

**同步导出**（数据量小时）：
```java
@PostMapping("/export")
@SneakyThrows
public void export(@RequestBody LeRequest<XxxParam> request, HttpServletResponse response) {
    XxxParam param = request.getContent();
    ReportBaseTotalVO<XxxVO> result = xxxReportService.pageWithTotal(param);
    List<XxxVO> records = result.getResultPage().getRecords();
    CollUtil.addAll(records, result.getTotalLine());
    EasyExcelUtil.writeExcelByDownLoadIncludeWrite(
        response, I18n.getMessage("report.xxx.title"),
        XxxVO.class, I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
        records, param.getExportCols()
    );
}
```

---

## 六、Service 模板

```java
@Service
@Slf4j
public class XxxReportService {

    @Autowired
    private XxxReportMapper xxxReportMapper;

    /**
     * 分页查询（带合计行）
     */
    public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxParam param) {
        ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

        // 1. 非导出时查合计行
        if (CollUtil.isEmpty(param.getExportCols())) {
            XxxVO totalLine = xxxReportMapper.getSummaryTotal(param);
            result.setTotalLine(totalLine);
        }

        // 2. 导出时不分页
        if (CollUtil.isEmpty(param.getExportCols())) {
            PageMethod.startPage(param.getPage());
        }

        // 3. 查询
        List<XxxVO> list = xxxReportMapper.getSummaryList(param);
        result.setResultPage(PageVO.of(list));
        return result;
    }

    /**
     * 单独合计行（导出用）
     */
    public XxxVO getSummaryTotal(XxxParam param) {
        return xxxReportMapper.getSummaryTotal(param);
    }
}
```

**高性能版（三并行 CompletableFuture，参考 ReportSumMealtimeService）**：
```java
@Autowired
private AsyncTaskExecutor asyncTaskExecutor;

public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxParam param) {
    CompletableFuture<Long> countF = CompletableFuture.supplyAsync(
        () -> xxxReportMapper.listSummary_COUNT(param), asyncTaskExecutor);
    CompletableFuture<List<XxxVO>> listF = CompletableFuture.supplyAsync(() -> {
        PageMethod.startPage(param.getPage());
        return xxxReportMapper.getSummaryList(param);
    }, asyncTaskExecutor);
    CompletableFuture<XxxVO> totalF = CompletableFuture.supplyAsync(
        () -> xxxReportMapper.getSummaryTotal(param), asyncTaskExecutor);
    CompletableFuture.allOf(countF, listF, totalF).join();

    PageVO<XxxVO> pageVO = PageVO.of(listF.join());
    pageVO.setTotal(countF.join());
    return new ReportBaseTotalVO<XxxVO>()
        .setResultPage(pageVO)
        .setTotalLine(totalF.join());
}
```

---

## 七、Mapper XML 模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="net.xnzn.core.xxx.mapper.XxxReportMapper">

    <!-- 公共查询条件片段 -->
    <sql id="queryParam">
        <if test="startDate != null">
            AND a.statistic_date >= #{startDate}
        </if>
        <if test="endDate != null">
            AND a.statistic_date &lt;= #{endDate}
        </if>
        <if test="canteenIds != null and canteenIds.size() > 0">
            AND a.canteen_id IN
            <foreach collection="canteenIds" item="id" open="(" separator="," close=")">
                #{id}
            </foreach>
        </if>
        <if test="mealtimeTypes != null and mealtimeTypes.size() > 0">
            AND a.mealtime_type IN
            <foreach collection="mealtimeTypes" item="type" open="(" separator="," close=")">
                #{type}
            </foreach>
        </if>
        <if test="keyword != null and keyword != ''">
            AND (a.canteen_name LIKE CONCAT('%', #{keyword}, '%')
              OR a.stall_name LIKE CONCAT('%', #{keyword}, '%'))
        </if>
    </sql>

    <!-- 分页列表 -->
    <select id="getSummaryList" resultType="net.xnzn.core.xxx.vo.XxxVO">
        SELECT
            a.statistic_date   AS statisticDate,
            a.canteen_name     AS canteenName,
            a.mealtime_type    AS mealtimeType,
            a.consume_amount   AS consumeAmount,
            a.refund_amount    AS refundAmount,
            a.net_amount       AS netAmount,
            a.order_count      AS orderCount
        FROM report_sum_xxx a
        WHERE a.del_flag = 2
        <include refid="queryParam"/>
        ORDER BY a.statistic_date DESC
    </select>

    <!-- 合计行：只返回数值字段 -->
    <select id="getSummaryTotal" resultType="net.xnzn.core.xxx.vo.XxxVO">
        SELECT
            SUM(a.consume_amount)  AS consumeAmount,
            SUM(a.refund_amount)   AS refundAmount,
            SUM(a.net_amount)      AS netAmount,
            SUM(a.order_count)     AS orderCount
        FROM report_sum_xxx a
        WHERE a.del_flag = 2
        <include refid="queryParam"/>
    </select>

</mapper>
```

---

## 八、MySQL only_full_group_by 规范

```sql
-- ❌ GROUP BY 表达式与 SELECT 不一致
SELECT DATE_FORMAT(pay_time, '%Y-%m-%d') AS statisticDate, SUM(real_amount)
GROUP BY DATE(pay_time)   -- ❌ DATE() ≠ DATE_FORMAT()

-- ✅ GROUP BY 与 SELECT 完全一致（复制粘贴，不要重写）
SELECT DATE_FORMAT(pay_time, '%Y-%m-%d') AS statisticDate, SUM(real_amount)
GROUP BY DATE_FORMAT(pay_time, '%Y-%m-%d')

-- ❌ 非聚合字段未加入 GROUP BY
SELECT canteen_id, canteen_name, SUM(real_amount)
GROUP BY canteen_id       -- ❌ canteen_name 缺失

-- ✅ 所有非聚合字段都在 GROUP BY
SELECT canteen_id, canteen_name, SUM(real_amount)
GROUP BY canteen_id, canteen_name
```

**检查项**：SELECT 非聚合字段 == GROUP BY 字段，表达式逐字一致，ORDER BY 同理。

---

## 九、退款净额速查

### v5.29（consumeType 模式，退款为负数）

```sql
-- 方式一（推荐）：直接 SUM，退款已为负数
SELECT SUM(real_amount) AS netAmount FROM report_order_info
-- 方式二：分别统计
SELECT SUM(CASE WHEN consume_type=1 THEN real_amount ELSE 0 END) AS consume,
       SUM(CASE WHEN consume_type=2 THEN ABS(real_refund_amount) ELSE 0 END) AS refund
```

### 标准版（独立 report_refund 表，退款为正数）

```sql
-- 方式一（推荐）：主表 refundAmount 减退
SELECT SUM(real_amount - IFNULL(refund_amount, 0)) AS netAmount FROM report_order_info
-- 方式二：关联退款表
SELECT SUM(o.real_amount) - IFNULL(SUM(r.real_refund_amount), 0) AS netAmount
FROM report_order_info o LEFT JOIN report_refund r ON o.order_id = r.order_id
```

### 菜品级别退款

```sql
SELECT goods_dishes_name,
    SUM(quantity - IFNULL(goods_refund_num, 0)) AS netQuantity,
    SUM(total_amount - IFNULL(refund_amount, 0)) AS netAmount
FROM report_order_detail WHERE detail_state IN (1, 3) GROUP BY goods_dishes_name
```

---

## 十、定制报表对齐陷阱

### pay_time vs order_date

report_order_info 有两个时间维度，选错会导致金额与汇总表不一致：

| 字段 | 类型 | 含义 | 退款时的值 |
|------|------|------|-----------|
| `order_date` | DATE | 就餐日期 | 原订单就餐日 |
| `pay_time` | DATETIME | 支付/退款时间 | 退款审核时间(checkTime) |

**汇总表（report_sum_canteen 等）按 `pay_time` 聚合**。定制报表如需与汇总表金额对齐，时间条件用 `pay_time`：

```sql
-- ❌ 用 order_date，会与汇总表不一致（预订餐/隔日退款场景）
WHERE o.order_date BETWEEN #{param.startDate} AND #{param.endDate}

-- ✅ 用 pay_time，与汇总表对齐
WHERE DATE(o.pay_time) BETWEEN #{param.startDate} AND #{param.endDate}
```

### order_type 覆盖范围

汇总表**不过滤 order_type**，包含全部类型（含 type=4 商超）。定制报表如排除了某些 type，金额会比汇总表少。

| order_type | 含义 |
|-----------|------|
| 1, 2, 3 | 线上点餐 |
| 4 | 商超自助结算 |
| 6, 7, 11, 13, 21, 22 | 线下消费机/手持机 |

### 上线前数据验证检查项

- [ ] 确认时间字段：与汇总表对齐用 `pay_time`，统计就餐消费用 `order_date`
- [ ] 确认 `order_type` 覆盖范围（是否包含 type=4 商超）
- [ ] 选定一个日期，对比定制报表金额与标准报表（`/classify/page`）金额
- [ ] 验证退款金额方向正确（退款记录的 wallet_amount/subsidy_amount 为负数）

---

## 十一、餐次速查

| 枚举值 | key | 名称 | 分类 |
|--------|-----|------|------|
| MEALTIME_BREAKFAST | 1 | 早餐 | 正餐 |
| MEALTIME_LUNCH | 2 | 午餐 | 正餐 |
| MEALTIME_AFTERNOON_TEA | 3 | 下午茶 | 非正餐 |
| MEALTIME_DINNER | 4 | 晚餐 | 正餐 |
| MEALTIME_MIDNIGHT_SNACK | 5 | 夜宵 | 非正餐 |

```java
AllocMealtimeTypeEnum.allTypeList();     // [1,2,3,4,5]
AllocMealtimeTypeEnum.normalTypeList();  // [1,2,4] 正餐
AllocMealtimeTypeEnum.getValueByKey(1);  // "早餐"
```

---

## 十二、边界与延伸

本技能覆盖报表开发的完整场景。以下情况请使用其他技能：

- 非报表的普通 CRUD 开发 → `leniu-crud-development`
- MyBatis XML 通用编写规范 → `leniu-java-mybatis`
- CompletableFuture 线程池高级配置 → `leniu-java-concurrent`

本技能的 references 目录按需加载：
- 新建汇总表（MQ 消费链 + fix 重算）→ 读 `references/customization.md`
- 需要数据权限过滤 → 读 `references/data-permission.md`
- 需要 report_order_info 完整字段 → 读 `references/report-tables.md`
