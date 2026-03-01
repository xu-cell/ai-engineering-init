---
name: leniu-java-export
description: |
  leniu-tengyun-core / leniu-yunshitang 项目数据导出规范。当实现数据导出功能时使用此skill，包括Excel异步导出和分页导出方案。

  触发场景：
  - 实现Excel数据导出（exportApi.startExcelExportTaskByPage）
  - 实现异步导出（数据量大时）
  - 实现分页导出（防内存溢出）
  - 导出API接口设计（@PostMapping("/export")）

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：导出、Export、Excel导出、异步导出、分页导出、@ExcelProperty、exportApi、数据导出、导出接口、leniu导出、leniu-yunshitang导出、net.xnzn导出
---

# leniu-tengyun-core 数据导出规范

## 项目特征

| 特征 | 说明 |
|------|------|
| 包名 | `net.xnzn.*` |
| 异常类 | `LeException` |
| 导出工具 | `ExportApi.startExcelExportTaskByPage()` |
| 国际化 | `I18n.getMessage()` |
| 工具类 | Hutool（CollUtil、BeanUtil 等） |
| 请求包装 | `LeRequest<T>` |

## 核心组件

- **ExportApi**: 导出API接口
- **EasyExcelUtil**: 同步导出工具（报表 Controller 直接使用）
- **I18n**: 国际化工具
- **PageDTO**: 分页参数
- **ReportConstant**: 报表常量（工作表名称等）

## 两种导出模式

| 模式 | 工具 | 适用场景 |
|------|------|---------|
| **同步导出** | `EasyExcelUtil.writeExcelByDownLoadIncludeWrite()` | 报表 Controller 直接返回文件流，数据量不大 |
| **异步分页导出** | `exportApi.startExcelExportTaskByPage()` | 大数据量，任务队列方式 |
| **异步分页导出（Feign）** | `orderClients.export().startExcelExportTaskByPage()` | 跨模块导出，通过 Feign 客户端 |

## 同步导出（EasyExcelUtil）

```java
@ApiOperation(value = "流水汇总-同步导出")
@PostMapping("/export")
@SneakyThrows
public void export(@RequestBody LeRequest<ReportAnalysisTurnoverParam> request,
                   HttpServletResponse response) {
    ReportAnalysisTurnoverParam param = request.getContent();

    // 1. 查询数据
    ReportBaseTotalVO<TurnoverVO> result = reportService.pageSummary(param);

    // 2. 将列表 + 合计行合并（合计行追加到列表末尾）
    List<TurnoverVO> records = result.getResultPage().getRecords();
    CollUtil.addAll(records, result.getTotalLine());  // 合计行是单个 VO 或 List

    // 3. 直接写出文件流
    EasyExcelUtil.writeExcelByDownLoadIncludeWrite(
        response,
        I18n.getMessage("report.turnover.title"),  // 文件名（国际化）
        TurnoverVO.class,                           // VO 类型
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS), // 工作表名
        records,                                    // 数据列表（含合计行）
        param.getExportCols()                       // 导出列
    );
}
```

**注意事项**：
- 方法签名必须加 `@SneakyThrows`（`EasyExcelUtil` 抛出受检异常）
- `HttpServletResponse response` 作为方法参数接收
- 合计行用 `CollUtil.addAll(records, totalLine)` 追加到列表末尾
- 若合计行是单个 VO：`records.add(totalLine)` 即可

## 异步分页导出

### 基础导出模板

```java
@ApiOperation(value = "xxx导出")
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request) {
    XxxPageParam param = request.getContent();

    // 获取合计行（可选）
    XxxVO totalLine = xxxService.getSummaryTotal(param);

    // 启动异步导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),                          // 文件名（国际化）
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),         // 工作表名
        XxxVO.class,                                                   // 数据类型
        param.getExportCols(),                                        // 导出列
        param.getPage(),                                              // 分页参数
        totalLine,                                                    // 合计行（可为null）
        () -> xxxService.pageList(param).getResultPage()              // 数据提供者
    );
}
```

### 实际项目示例

```java
@PostMapping("/purchase/order/export")
@ApiOperation(value = "采购-采购订单汇总-导出")
public void exportPurchaseOrder(@RequestBody LeRequest<MonitorPageParam> param) {
    MonitorPageParam content = param.getContent();

    // 1. 获取合计行
    PurchaseOrderSummaryVO totalLine = monitorSafetyPurchaseService.getPurchaseOrderSummaryTotal(content);

    // 2. 启动导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("school.purchase-order-summary"),              // 文件名（国际化）
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),         // 工作表名
        PurchaseOrderSummaryVO.class,                                  // VO类型
        content.getExportCols(),                                      // 导出列
        content.getPage(),                                            // 分页参数
        totalLine,                                                    // 合计行
        () -> monitorSafetyPurchaseService.getPurchaseOrderSummary(content).getResultPage()
    );
}
```

## 异步分页导出（Feign 客户端模式）

跨模块导出时，通过 Feign 客户端调用目标模块的导出接口。订单模块导出是典型示例：

```java
/**
 * 订单导出 Controller（独立拆分，避免与主 Controller 耦合）
 */
@Slf4j
@Api(tags = "订单导出")
@RestController
@RequestMapping("/web/order/export")
public class OrderInfoExportWebController {

    // ✅ 跨模块依赖：通过 Feign 客户端调用，@Lazy 避免循环依赖
    @Autowired
    @Lazy
    private OrderClients orderClients;

    @ApiOperation(value = "订单导出")
    @PostMapping("/start")
    public void export(@RequestBody LeRequest<OrderDetailWebDTO> request) {
        OrderDetailWebDTO dto = request.getContent();

        // 转换为内部查询参数
        OrderSearchParam searchParam = dto.convertToOrderSearchParam();

        // 通过 Feign 客户端启动异步导出任务
        orderClients.export().startExcelExportTaskByPage(
            I18n.getMessage("order.export.title"),                      // 文件名
            I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),       // 工作表名
            OrderDetailVO.class,                                        // VO 类型
            dto.getExportCols(),                                        // 导出列
            dto.getPage(),                                              // 分页参数
            null,                                                       // 无合计行
            () -> orderClients.order().pageOrder(searchParam)           // Lambda 提供数据
        );
    }
}
```

**独立 Export Controller 的优点**：
- 将导出逻辑与查询逻辑解耦
- 避免单个 Controller 过于庞大
- `@Autowired @Lazy` 防止 Spring 循环依赖

## VO类导出注解

### 使用@ExcelProperty

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

    @ExcelProperty(value = "状态", index = 2)
    @ApiModelProperty("状态")
    private String statusDesc;

    @ExcelProperty(value = "金额（元）", index = 3)
    @ApiModelProperty("金额（元）")
    @NumberFormat("#,##0.00")
    private BigDecimal amount;

    @ExcelProperty(value = "创建时间", index = 4)
    @ApiModelProperty("创建时间")
    @DateTimeFormat("yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
```

## 导出参数类

### PageParam包含导出列

```java
@Data
@ApiModel("xxx分页查询参数")
public class XxxPageParam extends ReportBaseParam {

    @ApiModelProperty(value = "查询条件")
    private String keyword;

    // 其他查询条件...
    // 导出列 exportCols 和分页 page 已在 ReportBaseParam 基类中定义
}
```

## Service层导出逻辑

### 导出时不分页

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    // 导出时不分页，查询全部数据
    if (CollUtil.isNotEmpty(param.getExportCols())) {
        // 不调用 PageMethod.startPage()
        List<XxxEntity> records = mapper.selectList(param);
        List<XxxVO> voList = BeanUtil.copyToList(records, XxxVO.class);
        return PageVO.of(voList);
    }

    // 正常分页查询
    PageMethod.startPage(param);
    List<XxxEntity> records = mapper.pageList(param);
    List<XxxVO> voList = BeanUtil.copyToList(records, XxxVO.class);
    return PageVO.of(voList);
}
```

### 带合计行的导出

```java
// ⚠️ 系统默认在商户库执行，业务查询无需 Executors.readInSystem()
// Executors.readInSystem() 仅用于需要访问系统库的场景（如全局配置、商户管理）

public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

    // 1. 导出时不查询合计行（避免不必要的性能开销）
    if (CollUtil.isEmpty(param.getExportCols())) {
        XxxVO totalLine = mapper.getSummaryTotal(param);
        result.setTotalLine(totalLine);
    }

    // 2. 导出时不分页
    if (CollUtil.isNotEmpty(param.getExportCols())) {
        List<XxxVO> list = mapper.getSummaryList(param);
        result.setResultPage(PageVO.of(list));
    } else {
        // 正常分页查询
        PageMethod.startPage(param);
        List<XxxVO> list = mapper.getSummaryList(param);
        result.setResultPage(PageVO.of(list));
    }

    return result;
}
```

## 导出文件名国际化

### 使用I18n

```java
// 在 resources/message_zh.properties 中定义
report.order.title=订单报表
report.order.sheet=订单明细

// 在 resources/message_en.properties 中定义
report.order.title=Order Report
report.order.sheet=Order Details

// 在代码中使用
exportApi.startExcelExportTaskByPage(
    I18n.getMessage("report.order.title"),   // 订单报表
    I18n.getMessage("report.order.sheet"),   // 订单明细
    OrderVO.class,
    param.getExportCols(),
    param.getPage(),
    totalLine,
    () -> orderService.pageList(param).getResultPage()
);
```

## 导出列控制

### 前端传递导出列

```json
{
  "page": {
    "current": 1,
    "size": 10
  },
  "exportCols": ["id", "name", "status", "amount", "createTime"],
  "keyword": "test"
}
```

### 后端处理导出列

```java
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request) {
    XxxPageParam param = request.getContent();

    // 校验导出列
    if (CollUtil.isEmpty(param.getExportCols())) {
        throw new LeException("导出列不能为空");
    }

    // 启动导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),
        I18n.getMessage("report.xxx.sheet"),
        XxxVO.class,
        param.getExportCols(),   // 传递导出列
        param.getPage(),
        null,
        () -> xxxService.pageList(param).getResultPage()
    );
}
```

## 导出数据转换

### 状态码转换为描述（使用BeanUtil）

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    PageMethod.startPage(param);
    List<XxxEntity> records = mapper.pageList(param);

    // 转换为VO并处理状态描述（leniu 使用 BeanUtil，不用 MapstructUtils）
    List<XxxVO> voList = records.stream()
            .map(entity -> {
                XxxVO vo = new XxxVO();
                BeanUtil.copyProperties(entity, vo);

                // 状态码转换为描述
                vo.setStatusDesc(StatusEnum.getByCode(entity.getStatus()).getDesc());

                return vo;
            })
            .collect(Collectors.toList());

    return PageVO.of(voList);
}
```

## 常见场景

### 场景1：订单导出

```java
@ApiOperation(value = "订单导出")
@PostMapping("/export")
public void export(@RequestBody LeRequest<OrderPageParam> request) {
    OrderPageParam param = request.getContent();

    log.info("【导出】订单导出，条件:{}", param);

    // 获取合计行
    OrderVO totalLine = orderService.getSummaryTotal(param);

    // 启动导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.order.title"),
        I18n.getMessage("report.order.sheet"),
        OrderVO.class,
        param.getExportCols(),
        param.getPage(),
        totalLine,
        () -> orderService.pageList(param).getResultPage()
    );
}
```

### 场景2：报表导出

```java
@ApiOperation(value = "销售报表导出")
@PostMapping("/export")
public void export(@RequestBody LeRequest<SalesReportParam> request) {
    SalesReportParam param = request.getContent();

    log.info("【导出】销售报表导出，日期范围:{} - {}",
             param.getStartDate(), param.getEndDate());

    // 获取合计行
    SalesReportVO totalLine = reportService.getSummaryTotal(param);

    // 启动导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.sales.title"),
        I18n.getMessage("report.sales.sheet"),
        SalesReportVO.class,
        param.getExportCols(),
        param.getPage(),
        totalLine,
        () -> reportService.getSummary(param).getResultPage()
    );
}
```

### 场景3：带权限过滤的导出

```java
@ApiOperation(value = "数据导出")
@PostMapping("/export")
public void export(@RequestBody LeRequest<DataPageParam> request) {
    DataPageParam param = request.getContent();

    // 获取用户权限
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dataPermission =
        reportDataPermissionService.getDataPermission(authPO);

    log.info("【导出】数据导出，用户:{}, 权限范围:{}",
             authPO.getUserId(), dataPermission.getCanteenIds());

    // 启动导出任务（权限过滤在Service层处理）
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.data.title"),
        I18n.getMessage("report.data.sheet"),
        DataVO.class,
        param.getExportCols(),
        param.getPage(),
        null,
        () -> dataService.pageList(param).getResultPage()
    );
}
```

## 导出性能优化

### 1. 限制导出数量

```java
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request) {
    XxxPageParam param = request.getContent();

    // 查询总数
    long total = xxxService.count(param);

    // 限制导出数量
    if (total > 100000) {
        throw new LeException("导出数据量过大，请缩小查询范围");
    }

    // 启动导出任务
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),
        I18n.getMessage("report.xxx.sheet"),
        XxxVO.class,
        param.getExportCols(),
        param.getPage(),
        null,
        () -> xxxService.pageList(param).getResultPage()
    );
}
```

### 2. 导出数据脱敏

```java
public PageVO<UserVO> pageList(UserPageParam param) {
    PageMethod.startPage(param);
    List<User> records = mapper.pageList(param);

    List<UserVO> voList = records.stream()
            .map(user -> {
                UserVO vo = new UserVO();
                BeanUtil.copyProperties(user, vo);

                // 导出时脱敏
                if (CollUtil.isNotEmpty(param.getExportCols())) {
                    vo.setMobile(maskMobile(user.getMobile()));
                    vo.setIdCard(maskIdCard(user.getIdCard()));
                }

                return vo;
            })
            .collect(Collectors.toList());

    return PageVO.of(voList);
}
```

## 最佳实践

### 1. 导出日志

```java
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request) {
    XxxPageParam param = request.getContent();

    log.info("【导出】开始导出，文件名:{}, 条件:{}",
             I18n.getMessage("report.xxx.title"), param);

    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),
        I18n.getMessage("report.xxx.sheet"),
        XxxVO.class,
        param.getExportCols(),
        param.getPage(),
        null,
        () -> xxxService.pageList(param).getResultPage()
    );

    log.info("【导出】导出任务已启动");
}
```

### 2. 导出权限校验

```java
@PostMapping("/export")
public void export(@RequestBody LeRequest<XxxPageParam> request) {
    // 校验导出权限
    if (!hasExportPermission()) {
        throw new LeException("无导出权限");
    }

    // 启动导出任务
    exportApi.startExcelExportTaskByPage(...);
}
```

## 常见错误

| 错误写法 | 正确写法 | 说明 |
|---------|---------|------|
| `throw new ServiceException("msg")` | `throw new LeException("msg")` | leniu 项目异常类 |
| `MapstructUtils.convert(a, B.class)` | `BeanUtil.copyProperties(a, b)` | leniu 使用 Hutool |
| `@RequestParam` 接收请求 | `@RequestBody LeRequest<T>` | leniu 接口使用 LeRequest 包装 |
| `import javax.validation.*` | `import jakarta.validation.*` | JDK 21 + Spring Boot 3.x |
| 不写导出日志 | 写 log.info 记录导出参数 | 便于排查导出问题 |
