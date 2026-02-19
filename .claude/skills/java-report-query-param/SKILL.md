---
name: java-report-query-param
description: |
  Java报表模块查询入参规范。当创建报表Controller接口的查询入参Param类时使用此skill。

  触发场景：
  - 创建报表查询入参Param类（分页、时间范围、组织筛选）
  - 设计报表接口的基类继承结构
  - 配置导出列开关（exportColumns）
  - 报表查询参数标准化

  触发词：报表查询、Param类、查询入参、分页参数、时间范围、组织筛选、导出列配置、报表入参、BaseReportParam、reportParam
---

# Java 报表查询入参规范

## 核心结构

### 1. Controller层接收入参

使用 `LeRequest<T>` 包装器接收请求体：

```java
@PostMapping("/page")
public ReportBaseTotalVO<XxxVO> pageXxxSummary(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();
    return xxxService.pageSummary(param);
}
```

### 2. Param类基类继承

报表查询Param类**必须继承** `ReportBaseParam`，获得通用字段：

```java
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "XXX查询入参")
public class XxxParam extends ReportBaseParam {
    // 业务特有字段...
}
```

### 3. ReportBaseParam 提供的通用字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `page` | `PageDTO` | 分页参数 |
| `startDate` | `LocalDate` | 开始时间（以订单支付时间为准）|
| `endDate` | `LocalDate` | 结束时间 |
| `exportCols` | `List<String>` | 需要导出的列 |
| `sumType` | `Integer` | 汇总类型：1-按时间段 2-按日期 |
| `ageTypes` | `List<Integer>` | 适用年龄段 |
| `sumDimension` | `Integer` | 统计维度：1-组织 2-用户类别 3-食堂档口等 |
| `custId` | `Long` | 人员id |
| `custIdList` | `List<Long>` | 人员id集合 |

## 常用查询字段模式

### 时间范围查询

**方式1：LocalDate日期范围**（继承自基类）

```java
// 基类已有 startDate, endDate
```

**方式2：LocalDateTime精确时间范围**（子类扩展）

```java
@ApiModelProperty(value = "开始时间")
private LocalDateTime startTime;

@ApiModelProperty(value = "结束时间")
private LocalDateTime endTime;

// 同步设置基类的日期字段
public void setStartTime(LocalDateTime startTime) {
    this.startDate = startTime.toLocalDate();
    this.startTime = startTime;
}

public void setEndTime(LocalDateTime endTime) {
    this.endDate = endTime.toLocalDate();
    this.endTime = endTime;
}
```

**方式3：时间类型选择器**

```java
@ApiModelProperty(value = "查询时间类型 1 订单时间 2 支付时间 3 就餐日期")
private Integer timeType = 2;
```

### 组织筛选

```java
@ApiModelProperty(value = "组织id")
private Long orgId;

@ApiModelProperty(value = "组织id集合")
private List<Long> orgIds;

@NotNull(message = "{report.org-level-not-empty}")
@ApiModelProperty(value = "组织层级")
private Integer orgLevel;
```

### 食堂/档口筛选

```java
@ApiModelProperty(value = "食堂id")
private Long canteenId;

@ApiModelProperty(value = "档口id")
private Long stallId;

@ApiModelProperty(value = "食堂档口id集合")
private List<Long> canteenStallIds;

@ApiModelProperty(value = "食堂档口类型 1-食堂 2-档口")
private Integer treeType;
```

### 区域筛选（集团版）

```java
@ApiModelProperty(value = "区域id")
private Long areaId;

@ApiModelProperty(value = "区域id集合")
private List<Long> areaIdList;
```

### 关键字搜索

```java
@ApiModelProperty(value = "关键字")
private String keyword;

// 或带说明的版本
@ApiModelProperty(value = "关键字（姓名，编号，手机号）")
private String keyword;
```

### 枚举列表筛选

```java
@ApiModelProperty(value = "餐次集合")
private List<Integer> mealtimeTypes;

@ApiModelProperty(value = "支付渠道集合")
private List<String> payChannels;

@ApiModelProperty(value = "支付方式集合")
private List<Integer> payTypes;

@ApiModelProperty(value = "人员类别集合")
private List<Integer> psnTypes;
```

### 金额范围筛选

```java
@ApiModelProperty(value = "最小消费金额")
private Integer minAmount;

@ApiModelProperty(value = "最大消费金额")
private Integer maxAmount;
```

### 合计查询开关

```java
@ApiModelProperty(value = "是否查询合计 true-是 false-否(默认)")
private Boolean ifQueryTotal = false;

// 或使用Integer
private Integer ifTotal = 2;  // 1-是 2-否
```

### 统计维度

```java
@ApiModelProperty(value = "统计维度(1-按用户，2-按组织)")
private Integer statisticsDimension;
```

## 完整示例

### 示例1：营业收入明细入参

```java
@Data
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "营业收入明细入参")
public class ReportBasicOrderParam extends ReportBaseParam {

    @ApiModelProperty(value = "查询时间类型 1 订单时间 2 支付时间 3 就餐日期")
    private Integer timeType = 2;

    @ApiModelProperty(value = "开始时间")
    private LocalDateTime startTime;

    @ApiModelProperty(value = "结束时间")
    private LocalDateTime endTime;

    @ApiModelProperty(value = "食堂id")
    private Long canteenId;

    @ApiModelProperty(value = "档口id")
    private Long stallId;

    @ApiModelProperty(value = "组织id")
    private Long orgId;

    @ApiModelProperty(value = "关键字")
    private String keyword;

    @ApiModelProperty(value = "食堂档口id集合")
    private List<Long> canteenStallIds;

    @ApiModelProperty(value = "组织id集合")
    private List<Long> orgIds;

    @NotNull(message = "{report.org-level-not-empty}")
    @ApiModelProperty(value = "组织层级")
    private Integer orgLevel;

    @ApiModelProperty(value = "餐次集合")
    private List<Integer> mealtimeTypes;

    @ApiModelProperty(value = "支付渠道集合")
    private List<String> payChannels;

    @ApiModelProperty(value = "支付方式集合")
    private List<Integer> payTypes;

    @ApiModelProperty(value = "人员类别集合")
    private List<Integer> psnTypes;

    @ApiModelProperty(value = "最小消费金额")
    private Integer minAmount;

    @ApiModelProperty(value = "最大消费金额")
    private Integer maxAmount;

    // 集团版
    @ApiModelProperty(value = "区域id")
    private Long areaId;

    @ApiModelProperty(value = "区域id集合")
    private List<Long> areaIdList;

    @ApiModelProperty(value = "是否查询合计 true-是 false-否(默认)")
    private Boolean ifQueryTotal = false;

    public void setStartTime(LocalDateTime startTime) {
        this.startDate = startTime.toLocalDate();
        this.startTime = startTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endDate = endTime.toLocalDate();
        this.endTime = endTime;
    }
}
```

### 示例2：用户消费汇总入参（简化版）

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "用户消费汇总入参")
public class ReportCustSummaryParam extends ReportBaseParam {

    @ApiModelProperty(value = "组织id集合")
    private List<Long> orgIds;

    @NotNull(message = "{report.org-level-not-empty}")
    @ApiModelProperty(value = "组织层级")
    private Integer orgLevel;

    @ApiModelProperty(value = "关键字（姓名，编号，手机号）")
    private String keyword;

    @ApiModelProperty(value = "食堂档口id集合")
    private List<Long> canteenStallIds;

    @ApiModelProperty(value = "区域id")
    private Long areaId;

    @ApiModelProperty(value = "区域id集合")
    private List<Long> areaIdList;

    private Integer ifTotal = 2;
}
```

## PageDTO 分页参数结构

```java
@Data
public class PageDTO {
    @ApiModelProperty(value = "当前页(默认1)")
    private Long current;

    @ApiModelProperty(value = "每页显示条数(默认10) -1查询全部")
    private Long size;

    @ApiModelProperty(value = "是否包含count查询 1是 2否 默认是")
    private Integer ifCount = 1;

    @ApiModelProperty(value = "size空(-1)时是否查询全部 1是 2否 默认是")
    private Integer ifPageSizeZero = 1;

    @ApiModelProperty(value = "排序，支持多个（仅支持PageHelper）")
    private List<OrderItem> orders;

    @Data
    public static class OrderItem {
        @ApiModelProperty("字段名")
        private String column;
        @ApiModelProperty("true增序 false降序")
        private Boolean asc = true;
    }
}
```

## 注解使用规范

**重要**: 项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

| 注解 | 用途 |
|------|------|
| `@Data` | Lombok生成getter/setter |
| `@Accessors(chain = true)` | 链式调用（可选）|
| `@AllArgsConstructor` | 全参构造函数 |
| `@NoArgsConstructor` | 无参构造函数 |
| `@EqualsAndHashCode(callSuper = true)` | 包含父类字段的equals/hashCode |
| `@ApiModel(value = "XXX")` | Swagger模型描述 |
| `@ApiModelProperty(value = "XXX")` | Swagger字段描述 |
| `@NotNull(message = "{xxx}")` | 非空校验（使用i18n消息，需 import jakarta.validation.constraints.NotNull） |

## MyBatis XML 使用

在 Mapper XML 中使用 Param 对象的字段进行条件查询。详见 [mybatis-usage.md](references/mybatis-usage.md)

## 导出相关

导出接口使用相同的Param，通过 `exportCols` 字段指定要导出的列：

```java
@ApiOperation(value = "异步导出")
@PostMapping("/export-async/xxx/export")
public void exportXxx(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.title.xxx"),
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
        XxxVO.class,
        param.getExportCols(),  // 使用入参中的导出列配置
        param.getPage(),
        total,
        () -> xxxService.pageXxx(param).getResultPage()
    );
}
```
