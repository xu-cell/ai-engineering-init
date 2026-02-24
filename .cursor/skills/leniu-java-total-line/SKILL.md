---
name: leniu-java-total-line
description: |
  leniu-tengyun-core / leniu-yunshitang 项目合计行查询规范。当实现报表分页查询需要合计行功能时使用此skill。

  触发场景：
  - 实现报表分页查询合计行（Service层合计查询）
  - 编写Mapper XML合计SQL（只返回数值字段）
  - Controller层合计行数据组装
  - 合计查询开关控制

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-合计行、leniu-totalLine、leniu-报表合计、leniu-合计查询、leniu-SUM合计、leniu-ReportBaseTotalVO、net.xnzn、leniu-yunshitang
---

# leniu-tengyun-core 合计行(Total Line)规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **跨租户工具** | `Executors.readInSystem()` |
| **分页工具** | `PageMethod.startPage()` |
| **结果封装** | `ReportBaseTotalVO<T>` |
| **分页封装** | `PageVO.of()` |

## 核心原则

**合计行SQL只返回需要合计的数值字段**，不返回非数值字段（如日期、名称、ID等）。

## Service层实现

### 带合计行的分页查询

```java
import net.xnzn.framework.data.executor.Executors;
import net.xnzn.core.common.page.PageMethod;
import net.xnzn.core.common.page.PageVO;
import net.xnzn.core.common.vo.ReportBaseTotalVO;
import cn.hutool.core.collection.CollUtil;

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

### 错误示例：返回非数值字段

```xml
<!-- ❌ 不要这样做 -->
<select id="getSummaryTotal" resultType="XxxVO">
    SELECT
        '合计' AS dateMonth,        <!-- ❌ 不要返回字符串 -->
        NULL AS schoolId,            <!-- ❌ 不要返回ID -->
        NULL AS schoolName,          <!-- ❌ 不要返回名称 -->
        SUM(staffCount) AS staffCount,
        SUM(amount) AS amount
    FROM xxx_table
</select>
```

### 正确示例：只返回数值字段

```xml
<!-- ✅ 正确做法 -->
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
    <where>
        del_flag = 2
        <if test="startDate != null">
            AND crtime >= #{startDate}
        </if>
        <if test="endDate != null">
            AND crtime &lt;= #{endDate}
        </if>
    </where>
</select>
```

## 常见合计字段类型

| 字段类型 | 示例 | 合计方式 |
|---------|------|---------|
| 数量 | `staff_count`, `order_count` | `SUM()` |
| 金额 | `amount`, `salary` | `SUM()` |
| 百分比 | `discount_rate` | `AVG()` 或 `SUM() / COUNT()` |
| 计数 | `COUNT(DISTINCT id)` | 直接使用 |

## 特殊处理：平均值

```xml
<!-- 简单平均值 -->
SELECT AVG(amount) AS avgAmount

<!-- 加权平均值 -->
SELECT
    CASE
        WHEN SUM(count) = 0 THEN 0
        ELSE SUM(amount * count) / SUM(count)
    END AS weightedAvgAmount

<!-- 按维度平均 -->
SELECT
    CASE
        WHEN COUNT(DISTINCT tenant_id) = 0 THEN 0
        ELSE SUM(total_amount) / COUNT(DISTINCT tenant_id)
    END AS avgByTenant
```

## Controller层实现

```java
@PostMapping("/page")
@ApiOperation("分页查询（带合计）")
@RequiresAuthentication
public ReportBaseTotalVO<XxxVO> page(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();
    return xxxService.pageWithTotal(param);
}

@GetMapping("/total")
@ApiOperation("单独查询合计行")
@RequiresAuthentication
public XxxVO getTotal(XxxParam param) {
    return xxxService.getSummaryTotal(param);
}
```

## 导出时合计行处理

```java
public void exportExcel(XxxParam param, HttpServletResponse response) {
    // 导出时需要查询合计行
    XxxVO totalLine = mapper.getSummaryTotal(param);

    // 分页查询所有数据（不分页）
    param.getPage().setSize(Integer.MAX_VALUE);
    List<XxxVO> list = mapper.getSummaryList(param);

    // 将合计行添加到列表末尾
    list.add(totalLine);

    // 导出
    exportService.export(list, response);
}
```

## 注意事项

- 合计SQL只返回数值字段，不返回字符串、ID、名称等
- 使用 `Executors.readInSystem()` 跨租户查询
- 导出时通过 `exportCols` 判断是否需要合计行
- 金额字段类型与 Entity 保持一致：订单模块用 `BigDecimal`，钱包模块用 `Long`（详见 leniu-java-amount-handling）
