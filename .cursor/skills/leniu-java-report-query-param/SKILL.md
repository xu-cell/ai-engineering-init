---
name: leniu-java-report-query-param
description: |
  leniu-tengyun-core / leniu-yunshitang 项目报表查询入参规范。当创建报表Controller接口的查询入参Param类时使用此skill。

  触发场景：
  - 创建报表查询入参Param类（分页、时间范围、组织筛选）
  - 设计报表接口的基类继承结构
  - 配置导出列开关（exportColumns）
  - 报表查询参数标准化

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu-报表查询、leniu-Param类、leniu-查询入参、leniu-分页参数、leniu-时间范围、leniu-ReportBaseParam、leniu-exportCols、net.xnzn、leniu-yunshitang
---

# leniu-tengyun-core 报表查询入参规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **请求封装** | `LeRequest<T>` |
| **分页参数** | `PageDTO` |
| **基类** | `ReportBaseParam` |
| **校验框架** | Jakarta Validation |

## 核心结构

### 1. Controller层接收入参

```java
import com.pig4cloud.pigx.common.core.util.LeRequest;

@PostMapping("/page")
public ReportBaseTotalVO<XxxVO> pageXxxSummary(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();
    return xxxService.pageSummary(param);
}
```

### 2. Param类基类继承

报表查询Param类**必须继承** `ReportBaseParam`：

```java
import lombok.Data;
import lombok.EqualsAndHashCode;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import net.xnzn.core.common.page.PageDTO;
import net.xnzn.core.common.param.ReportBaseParam;

import java.time.LocalDate;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "XXX查询入参")
public class XxxParam extends ReportBaseParam {

    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("状态")
    private Integer status;
}
```

### 3. ReportBaseParam 提供的通用字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `page` | `PageDTO` | 分页参数 |
| `startDate` | `LocalDate` | 开始时间 |
| `endDate` | `LocalDate` | 结束时间 |
| `exportCols` | `List<String>` | 需要导出的列 |
| `sumType` | `Integer` | 汇总类型 |
| `sumDimension` | `Integer` | 统计维度 |

## 常用查询字段模式

### 时间范围查询

```java
@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel("订单报表查询参数")
public class OrderReportParam extends ReportBaseParam {

    // 基类已有 startDate, endDate

    @ApiModelProperty("开始时间（精确到秒）")
    private LocalDateTime startTime;

    @ApiModelProperty("结束时间（精确到秒）")
    private LocalDateTime endTime;
}
```

### 组织筛选

```java
@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel("组织报表查询参数")
public class OrgReportParam extends ReportBaseParam {

    @ApiModelProperty("组织ID")
    private Long orgId;

    @ApiModelProperty("组织ID列表")
    private List<Long> orgIds;

    @ApiModelProperty("食堂ID")
    private Long canteenId;

    @ApiModelProperty("食堂ID列表")
    private List<Long> canteenIds;
}
```

### 餐次筛选

```java
@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel("餐次报表查询参数")
public class MealtimeReportParam extends ReportBaseParam {

    @ApiModelProperty("餐次类型列表")
    private List<Integer> mealtimeTypes;

    @ApiModelProperty("是否只查正餐")
    private Boolean onlyMainMeal;
}
```

### 金额范围

```java
@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel("金额报表查询参数")
public class AmountReportParam extends ReportBaseParam {

    @ApiModelProperty("最小金额（分）")
    private Long minAmount;

    @ApiModelProperty("最大金额（分）")
    private Long maxAmount;
}
```

## PageDTO 结构

```java
@Data
@ApiModel("分页参数")
public class PageDTO {

    @ApiModelProperty("当前页码")
    private Integer current = 1;

    @ApiModelProperty("每页条数")
    private Integer size = 10;

    @ApiModelProperty("是否查询总数")
    private Boolean ifCount = true;

    @ApiModelProperty("页数为0时的处理")
    private Boolean ifPageSizeZero = false;
}
```

## 完整示例

```java
@Data
@EqualsAndHashCode(callSuper = true)
@ApiModel("销售报表查询参数")
public class SalesReportParam extends ReportBaseParam {

    @ApiModelProperty(value = "关键字")
    private String keyword;

    @ApiModelProperty(value = "组织ID列表")
    private List<Long> orgIds;

    @ApiModelProperty(value = "食堂ID列表")
    private List<Long> canteenIds;

    @ApiModelProperty(value = "餐次类型列表")
    private List<Integer> mealtimeTypes;

    @ApiModelProperty(value = "支付方式列表")
    private List<Integer> payTypes;

    @ApiModelProperty(value = "最小金额（分）")
    private Long minAmount;

    @ApiModelProperty(value = "最大金额（分）")
    private Long maxAmount;

    @ApiModelProperty(value = "是否查询合计行")
    private Boolean ifQueryTotal = true;
}
```

## 两层继承结构（实际生产代码模式）

报表 Param 存在两层继承结构，以订单分析报表为例：

```
ReportAnalysisParam（大类基类：订单分析类报表通用字段）
    └── ReportAnalysisTurnoverParam（具体报表 Param，加业务字段）
```

### ReportAnalysisParam（中间基类）

```java
import lombok.Data;
import net.xnzn.core.common.page.PageDTO;

import java.time.LocalDate;
import java.util.List;

@Data
public class ReportAnalysisParam {

    /** 分页参数 */
    private PageDTO page;

    /** 开始日期 */
    private LocalDate startDate;

    /** 结束日期 */
    private LocalDate endDate;

    /** 日期维度：1=按月 2=按日 */
    private Integer dateType;

    /** 食堂摊位ID列表（多选） */
    private List<Long> canteenStallIds;
}
```

### ReportAnalysisTurnoverParam（具体 Param，继承中间基类）

```java
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class ReportAnalysisTurnoverParam extends ReportAnalysisParam {

    /** 餐次类型（单选） */
    private Integer mealtimeType;

    /** 餐次类型列表（多选） */
    private List<Integer> mealtimeTypeList;

    /** 排序类型：1=按金额降序（默认） */
    private Integer sortType = 1;

    /** 食堂ID（单选） */
    private Long canteenId;

    /** 摊位ID（单选） */
    private Long stallId;
}
```

**选择继承层级的判断依据**：
- 若报表是"订单分析"大类报表 → 继承 `ReportAnalysisParam`（含 `dateType`）
- 若是通用报表 → 直接继承 `ReportBaseParam`（含 `page/startDate/endDate/exportCols`）

## 注意事项

- 报表Param类必须继承 `ReportBaseParam` 或其子类（如 `ReportAnalysisParam`）
- 时间字段使用 `LocalDate` 或 `LocalDateTime`
- `dateType` 字段含义：1=按月汇总，2=按日汇总
- 金额查询参数类型与业务域保持一致：钱包/账户用 `Long`（分），订单用 `BigDecimal`（分）；见 leniu-java-amount-handling
- 导出时通过 `exportCols` 控制导出列
