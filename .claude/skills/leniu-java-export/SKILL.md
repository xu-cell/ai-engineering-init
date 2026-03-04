---
name: leniu-java-export
description: |
  leniu-tengyun-core / leniu-yunshitang 项目数据导出规范。当实现数据导出功能时使用此skill，包括Excel异步导出和分页导出方案。

  触发场景：
  - 实现Excel数据导出（exportApi.startExcelExportTaskByPage）
  - 实现异步导出（数据量大时）
  - 实现分页导出（防内存溢出）
  - 导出API接口设计（@PostMapping("/export")）
  - 实现同步导出（EasyExcelUtil）

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：导出、Excel导出、异步导出、分页导出、@ExcelProperty、exportApi、数据导出、EasyExcelUtil、导出列
---

# leniu 数据导出规范

## 核心组件

| 组件 | 用途 |
|------|------|
| `ExportApi` | 异步分页导出 |
| `EasyExcelUtil` | 同步导出（直接返回文件流） |
| `I18n.getMessage()` | 文件名国际化 |
| `ReportBaseParam` | 基类（含 exportCols、page） |
| `ReportConstant` | 报表常量（工作表名称等） |

## 两种导出模式

| 模式 | 工具 | 适用场景 |
|------|------|---------|
| **同步导出** | `EasyExcelUtil.writeExcelByDownLoadIncludeWrite()` | 数据量不大，直接返回文件流 |
| **异步分页导出** | `exportApi.startExcelExportTaskByPage()` | 大数据量，任务队列方式 |
| **异步(Feign)** | `orderClients.export().startExcelExportTaskByPage()` | 跨模块导出 |

---

## 同步导出模板

```java
@ApiOperation(value = "流水汇总-同步导出")
@PostMapping("/export")
@SneakyThrows  // 必须加，EasyExcelUtil 抛受检异常
public void export(@RequestBody LeRequest<ReportAnalysisTurnoverParam> request,
                   HttpServletResponse response) {
    ReportAnalysisTurnoverParam param = request.getContent();
    ReportBaseTotalVO<TurnoverVO> result = reportService.pageSummary(param);

    List<TurnoverVO> records = result.getResultPage().getRecords();
    CollUtil.addAll(records, result.getTotalLine());  // 合计行追加到末尾

    EasyExcelUtil.writeExcelByDownLoadIncludeWrite(
        response,
        I18n.getMessage("report.turnover.title"),
        TurnoverVO.class,
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
        records,
        param.getExportCols()
    );
}
```

---

## 异步分页导出模板

```java
@ApiOperation(value = "xxx导出")
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request) {
    XxxPageParam param = request.getContent();

    // 合计行（可选）
    XxxVO totalLine = xxxService.getSummaryTotal(param);

    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),                  // 文件名（国际化）
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS), // 工作表名
        XxxVO.class,                                           // 数据类型
        param.getExportCols(),                                // 导出列
        param.getPage(),                                      // 分页参数
        totalLine,                                            // 合计行（可为null）
        () -> xxxService.pageList(param).getResultPage()      // 数据提供者
    );
}
```

---

## 跨模块导出（Feign 客户端）

```java
@Slf4j
@Api(tags = "订单导出")
@RestController
@RequestMapping("/web/order/export")
public class OrderInfoExportWebController {

    @Autowired @Lazy  // @Lazy 防循环依赖
    private OrderClients orderClients;

    @ApiOperation(value = "订单导出")
    @PostMapping("/start")
    public void export(@RequestBody LeRequest<OrderDetailWebDTO> request) {
        OrderDetailWebDTO dto = request.getContent();
        OrderSearchParam searchParam = dto.convertToOrderSearchParam();

        orderClients.export().startExcelExportTaskByPage(
            I18n.getMessage("order.export.title"),
            I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
            OrderDetailVO.class,
            dto.getExportCols(),
            dto.getPage(),
            null,
            () -> orderClients.order().pageOrder(searchParam)
        );
    }
}
```

---

## VO 类导出注解

```java
@Data
@ApiModel("xxx导出VO")
public class XxxVO {
    @ExcelProperty(value = "ID", index = 0)
    @ApiModelProperty("ID")
    private Long id;

    @ExcelProperty(value = "名称", index = 1)
    @ApiModelProperty("名称")
    private String name;

    @ExcelProperty(value = "金额（元）", index = 2)
    @NumberFormat("#,##0.00")
    private BigDecimal amount;

    @ExcelProperty(value = "创建时间", index = 3)
    @DateTimeFormat("yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
```

---

## Service 层：导出时不分页

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    if (CollUtil.isNotEmpty(param.getExportCols())) {
        // 导出时不分页，不调用 PageMethod.startPage()
        List<XxxEntity> records = mapper.selectList(param);
        return PageVO.of(BeanUtil.copyToList(records, XxxVO.class));
    }
    // 正常分页
    PageMethod.startPage(param);
    List<XxxEntity> records = mapper.pageList(param);
    return PageVO.of(BeanUtil.copyToList(records, XxxVO.class));
}
```

## 带合计行的导出 Service

```java
public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

    // 导出时不查合计行（避免性能开销）
    if (CollUtil.isEmpty(param.getExportCols())) {
        result.setTotalLine(mapper.getSummaryTotal(param));
    }

    if (CollUtil.isNotEmpty(param.getExportCols())) {
        result.setResultPage(PageVO.of(mapper.getSummaryList(param)));
    } else {
        PageMethod.startPage(param);
        result.setResultPage(PageVO.of(mapper.getSummaryList(param)));
    }
    return result;
}
```

---

## 导出文件名国际化

```properties
# resources/message_zh.properties
report.order.title=订单报表
# resources/message_en.properties
report.order.title=Order Report
```

```java
I18n.getMessage("report.order.title")  // 根据当前语言自动返回
```

---

## 导出列控制

前端传递：
```json
{ "exportCols": ["id", "name", "status", "amount"], "page": { "current": 1, "size": 10 } }
```

后端校验：
```java
if (CollUtil.isEmpty(param.getExportCols())) {
    throw new LeException("导出列不能为空");
}
```

---

## 带权限过滤的导出

```java
@PostMapping("/export")
public void export(@RequestBody LeRequest<DataPageParam> request) {
    DataPageParam param = request.getContent();
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dataPermission =
        reportDataPermissionService.getDataPermission(authPO);

    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.data.title"),
        I18n.getMessage("report.data.sheet"),
        DataVO.class, param.getExportCols(), param.getPage(), null,
        () -> dataService.pageList(param).getResultPage()
    );
}
```

---

## 导出数据脱敏

```java
// 在 VO 转换时处理
if (CollUtil.isNotEmpty(param.getExportCols())) {
    vo.setMobile(maskMobile(user.getMobile()));
    vo.setIdCard(maskIdCard(user.getIdCard()));
}
```

---

## 导出数量限制

```java
long total = xxxService.count(param);
if (total > 100000) {
    throw new LeException("导出数据量过大，请缩小查询范围");
}
```

---

## 常见错误

| 错误写法 | 正确写法 |
|---------|---------|
| `throw new ServiceException("msg")` | `throw new LeException("msg")` |
| `MapstructUtils.convert(a, B.class)` | `BeanUtil.copyProperties(a, b)` |
| `@RequestParam` 接收请求 | `@RequestBody LeRequest<T>` |
| `import javax.validation.*` | `import jakarta.validation.*` |
| 不写导出日志 | `log.info("【导出】开始导出...")` |
| 同步导出不加 `@SneakyThrows` | 必须加（受检异常） |
