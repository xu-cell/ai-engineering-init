---
name: java-total-line
description: |
  Java合计行查询规范。当实现报表分页查询需要合计行功能时使用此skill。

  触发场景：
  - 实现报表分页查询合计行（Service层合计查询）
  - 编写Mapper XML合计SQL（只返回数值字段）
  - Controller层合计行数据组装
  - 合计查询开关控制（needTotalLine参数）

  触发词：合计行、Total Line、报表合计、合计查询、合计SQL、SUM合计、needTotalLine、totalLine、合计数据、汇总行
---

# Java 合计行(Total Line)规范

## 核心原则

**合计行SQL只返回需要合计的数值字段**，不返回非数值字段（如日期、名称、ID等）。

## Service层实现

### 带合计行的分页查询

```java
public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    return Executors.readInSystem(() -> {
        ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

        // 1. 导出时不查询合计行(避免不必要的性能开销)
        if (CollUtil.isEmpty(param.getExportCols())) {
            XxxVO totalLine = mapper.getSummaryTotal(param);
            result.setTotalLine(totalLine);
        }

        // 2. 开启分页
        PageMethod.startPage(param.getPage());

        // 3. 查询数据
        List<XxxVO> list = mapper.getSummaryList(param);

        // 4. 封装分页结果
        result.setResultPage(PageVO.of(list));
        return result;
    });
}
```

### 单独的合计行查询方法

```java
public XxxVO getSummaryTotal(XxxPageParam param) {
    return Executors.readInSystem(() -> mapper.getSummaryTotal(param));
}
```

## Mapper XML规范

### ❌ 错误示例：返回非数值字段

```xml
<select id="getSummaryTotal" resultType="XxxVO">
    SELECT
        '合计' AS dateMonth,        -- ❌ 不要返回字符串
        NULL AS schoolId,            -- ❌ 不要返回ID
        NULL AS schoolName,          -- ❌ 不要返回名称
        SUM(staffCount) AS staffCount,
        SUM(amount) AS amount
    FROM xxx_table
</select>
```

### ✅ 正确示例：只返回数值字段

```xml
<select id="getSummaryTotal" resultType="XxxVO">
    SELECT
        SUM(staff_count) AS staffCount,
        SUM(basic_salary) AS basicSalary,
        SUM(overtime_salary) AS overtimeSalary,
        SUM(personal_actual_amount) AS personalActualAmount,
        CASE
            WHEN SUM(staff_count) = 0 THEN 0
            ELSE SUM(avg_salary) / COUNT(DISTINCT tenant_id)
        END AS avgSalary
    FROM xxx_table
    <where>...</where>
</select>
```

### 常见合计字段类型

| 字段类型 | 示例 | 合计方式 |
|---------|------|---------|
| 数量 | `staff_count`, `order_count` | `SUM()` |
| 金额 | `amount`, `salary` | `SUM()` |
| 百分比 | `discount_rate` | `AVG()` 或 `SUM() / COUNT()` |
| 计数 | `COUNT(DISTINCT id)` | 直接使用 |

### 特殊处理：平均值

```xml
<!-- 方式1: 简单平均 -->
AVG(avg_salary) AS avgSalary

<!-- 方式2: 加权平均 -->
SUM(total_amount) / SUM(count) AS avgAmount

<!-- 方式3: 按维度平均 -->
CASE
    WHEN SUM(staff_count) = 0 THEN 0
    ELSE SUM(avg_salary) / COUNT(DISTINCT tenant_id)
END AS avgSalary
```

## Controller层使用

### 分页查询返回合计行

```java
@ApiOperation(value = "xxx汇总查询")
@PostMapping("/summary")
public ReportBaseTotalVO<XxxVO> pageXxxSummary(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();
    return xxxService.pageWithTotal(param);
}
```

### 导出使用合计行

```java
@ApiOperation(value = "xxx导出")
@PostMapping("/export")
public void exportXxx(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();

    // 1. 获取合计行
    XxxVO totalLine = xxxService.getSummaryTotal(param);

    // 2. 启动导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
        XxxVO.class,
        param.getExportCols(),
        param.getPage(),
        totalLine,  // 合计行(可选)
        () -> xxxService.pageWithTotal(param).getResultPage()
    );
}
```

## 合计查询开关

### Param类添加开关

```java
@ApiModelProperty(value = "是否查询合计 true-是 false-否(默认)")
private Boolean ifQueryTotal = false;
```

### Service层使用开关

```java
public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    return Executors.readInSystem(() -> {
        ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

        // 使用开关控制是否查询合计行
        if (Boolean.TRUE.equals(param.getIfQueryTotal())) {
            XxxVO totalLine = mapper.getSummaryTotal(param);
            result.setTotalLine(totalLine);
        }

        PageMethod.startPage(param.getPage());
        List<XxxVO> list = mapper.getSummaryList(param);
        result.setResultPage(PageVO.of(list));
        return result;
    });
}
```

## 完整示例：采购订单汇总

### Service层

```java
@Service
public class PurchaseOrderService {

    public ReportBaseTotalVO<PurchaseOrderSummaryVO> getSummary(MonitorPageParam param) {
        return Executors.readInSystem(() -> {
            ReportBaseTotalVO<PurchaseOrderSummaryVO> result = new ReportBaseTotalVO<>();

            // 导出时不查询合计行
            if (CollUtil.isEmpty(param.getExportCols())) {
                PurchaseOrderSummaryVO totalLine = mapper.getSummaryTotal(param);
                result.setTotalLine(totalLine);
            }

            PageMethod.startPage(param.getPage());
            List<PurchaseOrderSummaryVO> list = Boolean.TRUE.equals(param.getDailyStatistics())
                    ? mapper.getSummaryDaily(param)
                    : mapper.getSummaryList(param);
            result.setResultPage(PageVO.of(list));
            return result;
        });
    }

    public PurchaseOrderSummaryVO getSummaryTotal(MonitorPageParam param) {
        return Executors.readInSystem(() -> mapper.getSummaryTotal(param));
    }
}
```

### Mapper XML

```xml
<!-- 列表查询 -->
<select id="getSummaryList" resultType="PurchaseOrderSummaryVO">
    SELECT
        statisticDate,
        schoolId,
        schoolName,
        purchaseCount,
        purchaseAmount
    FROM purchase_order_summary
    <where>...</where>
    ORDER BY statisticDate DESC
</select>

<!-- 合计查询：只返回数值字段 -->
<select id="getSummaryTotal" resultType="PurchaseOrderSummaryVO">
    SELECT
        SUM(purchase_count) AS purchaseCount,
        SUM(purchase_amount) AS purchaseAmount
    FROM purchase_order_summary
    <where>...</where>
</select>
```

### Controller层

```java
@RestController
public class PurchaseOrderController {

    @ApiOperation(value = "采购订单汇总")
    @PostMapping("/purchase/order/summary")
    public ReportBaseTotalVO<PurchaseOrderSummaryVO> getSummary(
            @RequestBody LeRequest<MonitorPageParam> request) {
        MonitorPageParam param = request.getContent();
        return purchaseOrderService.getSummary(param);
    }

    @PostMapping("/purchase/order/export")
    @ApiOperation(value = "采购订单汇总导出")
    public void export(@RequestBody LeRequest<MonitorPageParam> request) {
        MonitorPageParam param = request.getContent();
        PurchaseOrderSummaryVO totalLine = purchaseOrderService.getSummaryTotal(param);
        exportApi.startExcelExportTaskByPage(
            I18n.getMessage("school.purchase-order-summary"),
            I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
            PurchaseOrderSummaryVO.class,
            param.getExportCols(),
            param.getPage(),
            totalLine,
            () -> purchaseOrderService.getSummary(param).getResultPage()
        );
    }
}
```

## 注意事项

1. **性能优化**：导出时不查询合计行，避免不必要的数据库查询
2. **数值字段**：合计SQL只返回需要合计的数值字段
3. **空值处理**：使用 `CASE WHEN` 处理除零等特殊情况
4. **数据源**：使用 `Executors.readInSystem()` 确保跨租户查询
