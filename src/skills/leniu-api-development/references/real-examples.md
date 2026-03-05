# leniu API 真实代码示例

## 示例1：ReportAnalysisController（报表模块典型 Controller）

```java
@RestController
@RequestMapping("/summary/analysis")
@Api(value = "报表中心/经营分析", tags = "报表/经营分析-新")
public class ReportAnalysisController {

    @Autowired
    @Lazy
    protected ExportApi exportApi;             // 跨模块依赖用 @Lazy 避免循环依赖
    @Autowired
    private ReportAnalysisTurnoverService reportAnalysisTurnoverService;

    // 报表查询：返回直接 VO 对象
    @ApiOperation(value = "营业分析-总营业额")
    @PostMapping("/turnover/total")
    public ReportTurnoverPO getTurnoverTotal(@RequestBody LeRequest<ReportAnalysisTurnoverParam> request) {
        return reportAnalysisTurnoverService.getTurnoverTotal(request.getContent());
    }

    // 报表分页：返回 ReportBaseTotalVO（含合计行）
    @ApiOperation(value = "营业分析-营业额报表")
    @PostMapping("/turnover/detail")
    public ReportBaseTotalVO<ReportAnalysisTurnoverDetailVO> getTurnoverDetail(
            @RequestBody LeRequest<ReportAnalysisTurnoverParam> request) {
        return reportAnalysisTurnoverService.getTurnoverDetail(request.getContent());
    }

    // 同步导出（小数据量）
    @SneakyThrows
    @ApiOperation(value = "食堂满意度统计导出")
    @PostMapping("/evaluate/export")
    public void exportEvaluateSummary(@RequestBody LeRequest<ReportAnalysisEvaluateParam> request,
                                       HttpServletResponse response) {
        ReportAnalysisEvaluateParam param = request.getContent();
        ReportBaseTotalVO<ReportAnalysisEvaluateVO> result = reportAnalysisEvaluateService.pageSummary(param);
        List<ReportAnalysisEvaluateVO> list = (List<ReportAnalysisEvaluateVO>)
                CollUtil.addAll(result.getResultPage().getRecords(), result.getTotalLine());
        EasyExcelUtil.writeExcelByDownLoadIncludeWrite(response, "文件",
                ReportAnalysisEvaluateVO.class, ReportConstant.REPORT_TITLE_DETAILS, list, param.getExportCols());
    }

    // 异步导出（大数据量）
    @ApiOperation(value = "异步导出菜品销售排行")
    @PostMapping("/export-async/dishes/sale/export")
    public void exportDishesSaleSummary(@RequestBody LeRequest<ReportAnalysisDishesSaleParam> request) {
        ReportAnalysisDishesSaleParam param = request.getContent();
        ReportBaseTotalVO<ReportAnalysisDishesSaleVO> result = reportAnalysisDishesSaleService.pageSummary(param);
        List<ReportAnalysisDishesSaleVO> list = (List<ReportAnalysisDishesSaleVO>)
                CollUtil.addAll(result.getResultPage().getRecords(), result.getTotalLine());
        exportApi.startExcelExportTaskByPage(
                "菜品销售排行",
                I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
                ReportAnalysisDishesSaleVO.class,
                param.getExportCols(),
                param.getPage(),
                null,
                () -> PageVO.of(list));
    }
}
```

---

## 示例2：OrderInfoExportWebController（订单导出 Controller）

```java
// 导出功能独立到单独的 Controller，与查询 Controller 分离
@Slf4j
@RestController
@RequestMapping(value = "/api/v2/web/order/export")
public class OrderInfoExportWebController {

    @Autowired
    @Lazy
    protected OrderWebBusiness orderWebBusiness;
    @Autowired
    @Lazy
    protected OrderClients orderClients;

    // 使用 orderClients.export() 启动异步导出（通过 client 代理）
    @PostMapping(value = "/detail")
    public void exportOrderDetail(@RequestBody LeRequest<OrderDetailWebDTO> request) {
        OrderDetailWebDTO orderDetailDTO = request.getContent();
        orderClients.export().startExcelExportTaskByPage(
                I18n.getMessage("order.title.order-detail"),   // 文件名（国际化）
                orderSheetName(),                              // 工作表名
                OrderListWebVO.class,                          // 数据类
                orderDetailDTO.getExportCols(),                // 导出列
                orderDetailDTO,                                // 分页参数
                null,                                          // 合计行（可选）
                () -> orderWebBusiness.queryOrderInfoWebByPage(orderDetailDTO, orderDetailDTO));
    }
}
```

---

## 示例3：OrderInfoWebController（订单查询 Controller）

```java
@Validated
@RestController
@RequestMapping(value = "/api/v2/web/order")
public class OrderInfoWebController {

    @Autowired
    private OrderWebBusiness orderWebBusiness;

    // 详情查询
    @PostMapping(value = "/info")
    public OrderInfoWebVO info(@Valid @RequestBody LeRequest<OrderInfoWebDTO> request) {
        return orderWebBusiness.getOrderInfo(request.getContent().getOrderId());
    }

    // 分页查询：返回 PageVO
    @PostMapping(value = "/page/detail")
    public PageVO<OrderListWebVO> pageOrderDetail(@RequestBody LeRequest<OrderDetailWebDTO> request) {
        OrderDetailWebDTO content = request.getContent();
        return orderWebBusiness.queryOrderInfoWebByPage(PageDTO.of(content.getCurrent(), content.getSize()), content);
    }

    // 业务失败抛出 LeException
    @PostMapping(value = "/refund")
    public OrderRefundResultVO orderRefundWeb(@RequestBody LeRequest<OrderRefundSubmitWebDTO> request) throws LeCheckedException {
        OrderRefundResultVO result = orderRefundBusiness.orderRefund(
                request.getContent().convertToOrderRefundParam(), OrderRefundBizEnum.WEB);
        if (!result.ifSuccess()) {
            throw new LeException(result.getResultCode(), result.getResultMsg());
        }
        return result;
    }
}
```

---

## 示例4：AttendanceLeaveInfoController（完整 CRUD）

```java
package net.xnzn.core.attendance.leave.controller;

@Api(tags = "zjl-考勤-请假信息")
@RestController
@RequiresAuthentication
@RequestMapping("/attendance/leave-info")
public class AttendanceLeaveInfoController {

    @Autowired
    AttendanceLeaveInfoService attendanceLeaveInfoService;
    @Autowired
    RedissonClient redissonClient;

    @PostMapping("/add")
    @ApiOperation(value = "请假信息-新增")
    public void add(@RequestBody LeRequest<AddOrUpdateAttendanceLeaveInfoDTO> request) {
        attendanceLeaveInfoService.add(request.getContent());
    }

    @PutMapping("/batch/delete")
    @ApiOperation(value = "请假信息-批量删除")
    public void batchDelete(@RequestBody LeRequest<List<Long>> request) {
        attendanceLeaveInfoService.batchDelete(request.getContent());
    }

    @PutMapping("/update")
    @ApiOperation(value = "请假信息-修改")
    public void update(@RequestBody LeRequest<AddOrUpdateAttendanceLeaveInfoDTO> request) {
        attendanceLeaveInfoService.update(request.getContent());
    }

    @PostMapping("/query")
    @ApiOperation(value = "请假信息-分页查询")
    public Page<QueryAttendanceLeaveInfoVO> query(@RequestBody LeRequest<QueryAttendanceLeaveInfoDTO> request) {
        return attendanceLeaveInfoService.page(request.getContent());
    }

    @PostMapping("/import-excel")
    @ApiOperation(value = "请假信息-excel导入")
    public void importExcel(@RequestParam(value = "leaveInfoExcel") MultipartFile leaveInfoExcel) throws Exception {
        RLock lock = redissonClient.getLock("import:lock:" + TenantContextHolder.getTenantId());
        if (!lock.tryLock(5, TimeUnit.SECONDS)) {
            throw new LeException("考勤-请假数据导入中，请等待...");
        }
        try {
            attendanceLeaveInfoService.importExcel(new ImportLeaveInfoExcelDTO().setLeaveInfoExcel(leaveInfoExcel));
        } finally {
            if (lock.isLocked() && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

---

## 示例5：AllocCanteenController（食堂档口，混合认证）

```java
package net.xnzn.core.allocation.canteen.controller;

@Slf4j
@RestController
@RequestMapping("/api/v2/alloc/canteen")
@Api(tags = "lsh_食堂档口相关控制器")
public class AllocCanteenController {

    @Autowired
    @Lazy
    private AllocCanteenService allocCanteenService;

    @ApiOperation("分页查询食堂列表")
    @PostMapping("/page-canteen")
    public Page<AllocCanteenVO> pageCanteen(@RequestBody LeRequest<AllocCanteenStallPageParam> request) {
        return allocCanteenService.pageCanteen(request.getContent());
    }

    @ApiOperation("查询区域食堂档口餐线编号")
    @PostMapping("/get-canteen-num")
    public LeResponse<String> getCanteenNum(@Valid @RequestBody LeRequest<AllocCanteenNumParam> request) {
        return LeResponse.succ(allocCanteenBusiness.getCanteenNum(request.getContent()));
    }

    @ApiOperation("新增食堂")
    @PostMapping("/add-canteen")
    @RequiresGuest
    public void addCanteen(@Valid @RequestBody LeRequest<AllocCanteenModel> request) {
        allocCanteenBusiness.addCanteen(request.getContent());
    }
}
```

---

## 示例6：MgrMenuController（菜单权限，方法级认证）

```java
package net.xnzn.core.auth.menu.controller;

@RestController
@RequestMapping("/api/v1/mgrmenu")
@Api(value = "mgrmenu", tags = "菜单权限表管理")
public class MgrMenuController {

    @Autowired
    private MgrMenuService mgrMenuService;

    @ApiOperation(value = "新增菜单")
    @PostMapping("/add")
    @RequiresAuthentication
    public void saveMenu(@Valid @RequestBody LeRequest<MgrMenuVO> request) {
        mgrMenuService.saveMenu(request.getContent());
    }

    @ApiOperation(value = "更新菜单")
    @PostMapping("/update")
    @RequiresAuthentication
    public boolean updateMenu(@Valid @RequestBody LeRequest<MgrMenuVO> request) {
        return mgrMenuService.updateMenu(request.getContent());
    }

    @ApiOperation(value = "删除菜单")
    @DeleteMapping("/{id}")
    @RequiresGuest
    public boolean removeById(@PathVariable Long id) {
        return mgrMenuService.removeById(id);
    }
}
```
