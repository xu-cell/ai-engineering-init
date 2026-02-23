---
name: leniu-api-development
description: |
  leiu-yunshitang-core 项目 API 接口开发规范。基于 pigx-framework 三层架构的 RESTful API 开发指南。

  触发场景：
  - 设计 leniu 项目 RESTful API 接口
  - 编写 leniu Controller 层代码
  - 配置接口权限注解
  - 接口返回值类型选择
  - 数据验证和参数校验

  适用项目：leniu-tengyun-core（云食堂项目）

  触发词：leniu-API、leniu-接口、leniu-Controller、leniu-RESTful、LeResult、云食堂接口、云食堂API
---

# leiu-yunshitang-core API 接口开发规范

## 项目定位

本技能专用于 **leiu-tengyun-core 云食堂项目** 的 API 接口开发。

| 项目 | 路径 |
|------|------|
| **云食堂后端** | `/Users/xujiajun/Developer/core/leniu-tengyun-core` |
| **包名前缀** | `net.xnzn.core.*` |

---

## 核心架构差异

| 特征 | RuoYi-Vue-Plus | leniu-tengyun-core |
|-----|----------------|-------------------|
| **JDK 版本** | 17 | 21 |
| **包名前缀** | `org.dromara.*` | `net.xnzn.core.*` |
| **请求封装** | 直接使用 BO | `LeRequest<T>` 包装 |
| **响应封装** | `R<T>`, `TableDataInfo<T>` | `Page<T>`, `LeResponse<T>`, `void` |
| **分组校验** | `AddGroup`, `EditGroup` | `InsertGroup`, `UpdateGroup` |
| **认证注解** | `@SaCheckPermission` | `@RequiresAuthentication`, `@RequiresGuest` |
| **异常类** | `ServiceException` | `LeException` |
| **审计字段** | `create_by/create_time/update_by/update_time` | `crby/crtime/upby/uptime` |
| **主键策略** | 雪花ID (`IdType.ASSIGN_ID`) | 自增ID (`IdType.AUTO`) |

---

## 核心规范

### 1. 接口定义原则

| 原则 | 说明 |
|------|------|
| **统一入口** | 所有接口使用 POST 或 RESTful 风格 |
| **认证保护** | 业务接口使用 `@RequiresAuthentication`，部分使用 `@RequiresGuest` |
| **参数校验** | 使用分组校验区分新增/修改场景 |
| **统一响应** | 分页用 `Page<T>`，单数据用 `LeResponse<T>` 或直接返回 VO |
| **请求封装** | 使用 `LeRequest<T>` 包装请求参数 |

### 2. HTTP 方法规范

| 操作 | HTTP 方法 | 路径 | 说明 |
|------|---------|------|------|
| **列表查询** | POST | `/query` 或 `/page-*` | 分页查询列表 |
| **获取详情** | GET/POST | `/{id}` 或 `/get-*` | 根据 ID 查询 |
| **新增** | POST | `/add` | 创建新数据 |
| **修改** | POST/PUT | `/update` 或 `/modify-*` | 更新数据 |
| **删除** | DELETE/POST | `/delete` 或 `/batch/delete` | 删除数据 |
| **导出** | POST | `/export` | 导出数据到 Excel |
| **导入** | POST | `/import-excel` | 从 Excel 导入数据 |

---

## Controller 类模板

### 标准模板（带参数校验）

```java
@Api(tags = "模块-功能描述")
@RestController
@RequiresAuthentication
@RequestMapping("/module/feature")
public class XxxController {

    @Autowired
    private XxxService xxxService;

    @PostMapping("/add")
    @ApiOperation(value = "功能描述-新增")
    public void add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        xxxService.add(request.getContent());
    }

    @PostMapping("/update")
    @ApiOperation(value = "功能描述-修改")
    public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request) {
        xxxService.update(request.getContent());
    }

    @PostMapping("/query")
    @ApiOperation(value = "功能描述-分页查询")
    public Page<XxxVO> query(@Validated @RequestBody LeRequest<XxxQueryParam> request) {
        return xxxService.page(request.getContent());
    }

    @PostMapping("/delete")
    @ApiOperation(value = "功能描述-删除")
    public void delete(@RequestBody LeRequest<Long> request) {
        xxxService.delete(request.getContent());
    }
}
```

### 简化模板（无分组校验）

```java
@Api(tags = "模块-功能描述")
@RestController
@RequiresAuthentication
@RequestMapping("/module/feature")
public class XxxController {

    @Autowired
    private XxxService xxxService;

    @PostMapping("/add")
    @ApiOperation(value = "功能描述-新增")
    public void add(@RequestBody LeRequest<XxxDTO> request) {
        xxxService.add(request.getContent());
    }

    @PostMapping("/query")
    @ApiOperation(value = "功能描述-分页查询")
    public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
        return xxxService.page(request.getContent());
    }
}
```

---

## 请求/响应封装

### 1. 请求参数封装 `LeRequest<T>`

```java
import com.pig4cloud.pigx.common.core.util.LeRequest;

@PostMapping("/query")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    XxxQueryParam param = request.getContent();  // 获取实际参数
    return xxxService.page(param);
}
```

### 2. 响应类型

#### 分页响应（最常用）

```java
// 使用 MyBatis-Plus 的 Page 对象
@PostMapping("/query")
@ApiOperation(value = "分页查询")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) {
    return xxxService.page(request.getContent());
}
```

#### 单数据响应（LeResponse）

```java
import com.pig4cloud.pigx.common.core.util.LeResponse;

@PostMapping("/get-config")
@ApiOperation(value = "查询配置")
public LeResponse<String> getConfig(@RequestBody LeRequest<Long> request) {
    return LeResponse.succ(xxxService.getConfig(request.getContent()));
}
```

#### 直接返回 VO（用于复杂对象）

```java
@PostMapping("/get-detail")
@ApiOperation(value = "查询详情（聚合）")
public XxxDetailVO getDetail(@RequestBody LeRequest<Long> request) {
    return xxxService.getDetail(request.getContent());
}
```

#### 无返回值操作

```java
@PostMapping("/add")
@ApiOperation(value = "新增")
public void add(@RequestBody LeRequest<XxxDTO> request) {
    xxxService.add(request.getContent());
}
```

---

## 参数校验规范

### 1. JDK 21 必须使用 Jakarta Validation

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

@Data
public class XxxDTO {

    @NotNull(message = "ID不能为空", groups = {UpdateGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {InsertGroup.class, UpdateGroup.class})
    @Size(max = 100, message = "名称长度不能超过100个字符")
    private String name;

    @Min(value = 0, message = "数量不能小于0")
    @Max(value = 9999, message = "数量不能大于9999")
    private Integer count;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;
}
```

### 2. 分组校验定义

```java
// 定义校验分组
public interface InsertGroup {}
public interface UpdateGroup {}

// Controller 中应用分组
@PostMapping("/add")
public void add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request)

@PostMapping("/update")
public void update(@Validated(UpdateGroup.class) @RequestBody LeRequest<XxxDTO> request)
```

### 3. 简单校验（无分组）

```java
// 直接使用 @Valid 或在方法上加 @Validated
@PostMapping("/query")
public Page<XxxVO> query(@Validated @RequestBody LeRequest<XxxQueryParam> request)

@PostMapping("/check")
public LeResponse<Boolean> check(@Valid @RequestBody LeRequest<XxxDTO> request)
```

---

## 认证注解规范

| 注解 | 用途 | 使用场景 |
|------|------|---------|
| `@RequiresAuthentication` | 需要登录认证 | 大部分业务接口 |
| `@RequiresGuest` | 允许游客访问 | 不需要登录的接口 |

```java
// 需要登录
@RequiresAuthentication
@PostMapping("/query")
public Page<XxxVO> query(@RequestBody LeRequest<XxxQueryParam> request) { }

// 允许游客访问
@RequiresGuest
@PostMapping("/public")
public void publicApi(@RequestBody LeRequest<XxxDTO> request) { }
```

---

## 审计字段规范

leiu-tengyun-core 项目使用以下审计字段：

| 字段 | 类型 | 说明 | MyBatis-Plus 注解 |
|------|------|------|------------------|
| `crby` | String | 创建人 | `@TableField(fill = FieldFill.INSERT)` |
| `crtime` | LocalDateTime | 创建时间 | `@TableField(fill = FieldFill.INSERT)` |
| `upby` | String | 更新人 | `@TableField(fill = FieldFill.INSERT_UPDATE)` |
| `uptime` | LocalDateTime | 更新时间 | `@TableField(fill = FieldFill.INSERT_UPDATE)` |

### Entity 审计字段示例

```java
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;

@Data
@TableName("xxx_table")
public class XxxEntity implements Serializable {

    // 主键（自增）
    @ApiModelProperty("主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    // 审计字段
    @ApiModelProperty("创建人")
    @TableField(fill = FieldFill.INSERT)
    private String crby;

    @ApiModelProperty("创建时间")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    @ApiModelProperty("更新人")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String upby;

    @ApiModelProperty("更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;
}
```

---

## 常见场景示例

### 1. 带 Redisson 分布式锁的导入

```java
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import java.util.concurrent.TimeUnit;

@Autowired
private RedissonClient redissonClient;

@PostMapping("/import-excel")
@ApiOperation(value = "Excel导入")
public void importExcel(@RequestParam(value = "file") MultipartFile file) {
    RLock lock = redissonClient.getLock("import:lock:" + TenantContextHolder.getTenantId());
    if (!lock.tryLock(5, 60, TimeUnit.SECONDS)) {
        throw new LeException("正在处理中，请稍后再试");
    }
    try {
        xxxService.importExcel(file);
    } finally {
        if (lock.isLocked() && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
```

### 2. 批量删除

```java
@PutMapping("/batch/delete")
@ApiOperation(value = "批量删除")
public void batchDelete(@RequestBody LeRequest<List<Long>> request) {
    xxxService.batchDelete(request.getContent());
}
```

### 3. 树形结构查询

```java
import cn.hutool.core.lang.tree.Tree;

@PostMapping("/tree")
@ApiOperation(value = "树形结构查询")
public List<Tree<Long>> getTree(@RequestBody LeRequest<XxxQueryParam> request) {
    return xxxService.getTree(request.getContent());
}
```

### 4. 列表查询（不分页）

```java
@PostMapping("/list-all")
@ApiOperation(value = "查询所有列表")
public List<XxxVO> listAll(@RequestBody LeRequest<XxxQueryParam> request) {
    return xxxService.listAll(request.getContent());
}
```

---

## 真实代码示例（来自 order/report 模块）

### 示例0：ReportAnalysisController（报表模块典型 Controller）

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

### 示例0b：OrderInfoExportWebController（订单导出 Controller）

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
                orderDetailDTO,                                // 分页参数（Param 直接实现 PageDTO）
                null,                                          // 合计行（可选）
                () -> orderWebBusiness.queryOrderInfoWebByPage(orderDetailDTO, orderDetailDTO));
    }
}
```

### 示例0c：OrderInfoWebController（订单查询 Controller）

```java
@Validated
@RestController
@RequestMapping(value = "/api/v2/web/order")
public class OrderInfoWebController {

    @Autowired
    private OrderWebBusiness orderWebBusiness;

    // GET 详情：直接 @PostMapping 加 @Valid 校验
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

    // 抛出 LeException 明确告知失败原因
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

## 路径命名规范（基于真实代码）

| 模式 | 示例 | 说明 |
|------|------|------|
| 统一前缀 | `/api/v2/xxx` | 标准业务接口前缀 |
| 报表前缀 | `/summary/xxx` | 报表/统计类接口 |
| 查询接口 | `/page/detail`, `/page`, `/query` | 分页查询 |
| 枚举接口 | `/xxx/type-list`, `/xxx/state-list` | 枚举数据查询 |
| 导出接口 | `/export`, `/export-async/xxx` | 同步/异步导出 |
| 功能动作 | `/write/off`, `/sync-pay-state`, `/refund` | 业务操作 |

---

## 真实代码示例

### 示例1：AttendanceLeaveInfoController

```java
package net.xnzn.core.attendance.leave.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pig4cloud.pigx.common.core.exception.LeException;
import com.pig4cloud.pigx.common.core.util.LeRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

### 示例2：AllocCanteenController

```java
package net.xnzn.core.allocation.canteen.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pig4cloud.pigx.common.core.util.LeRequest;
import com.pig4cloud.pigx.common.core.util.LeResponse;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

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

    @ApiOperation("删除食堂")
    @PostMapping("/remove-canteen")
    public void removeCanteen(@Valid @RequestBody LeRequest<Long> request) {
        allocCanteenBusiness.removeCanteen(request.getContent());
    }
}
```

### 示例3：MgrMenuController

```java
package net.xnzn.core.auth.menu.controller;

import com.pig4cloud.pigx.common.core.util.LeRequest;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import net.xnzn.framework.secure.filter.annotation.RequiresAuthentication;
import net.xnzn.framework.secure.filter.annotation.RequiresGuest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

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
        MgrMenuVO mgrMenuVO = request.getContent();
        mgrMenuService.saveMenu(mgrMenuVO);
    }

    @ApiOperation(value = "更新菜单")
    @PostMapping("/update")
    @RequiresAuthentication
    public boolean updateMenu(@Valid @RequestBody LeRequest<MgrMenuVO> request) {
        MgrMenuVO mgrMenuVO = request.getContent();
        return mgrMenuService.updateMenu(mgrMenuVO);
    }

    @ApiOperation(value = "删除菜单")
    @DeleteMapping("/{id}")
    @RequiresGuest
    public boolean removeById(@PathVariable Long id) {
        return mgrMenuService.removeById(id);
    }
}
```

---

## 检查清单

生成 API 代码前必须检查：

- [ ] **认证注解是否添加**？(`@RequiresAuthentication` 或 `@RequiresGuest`)
- [ ] **API 文档注解是否添加**？(`@Api`, `@ApiOperation`)
- [ ] **参数校验是否正确**？(`@Validated` + 分组，或 `@Valid`)
- [ ] **是否使用 `LeRequest<T>` 封装请求**？
- [ ] **返回值类型是否正确**？(分页用 `Page<VO>`，单数据用 `LeResponse<T>` 或 VO)
- [ ] **HTTP 方法是否正确**？(查询 POST/GET，新增 POST，修改 POST/PUT)
- [ ] **路径命名是否规范**？(`/add`, `/update`, `/query`, `/delete`)
- [ ] **是否使用中文注释和错误提示**？
- [ ] **敏感操作是否加了分布式锁**？
- [ ] **审计字段是否正确配置**？(crby/crtime/upby/uptime)

---

## 错误对比

### ❌ 不要做

```java
// 错误 1: 缺少认证注解
@RestController
public class XxxController { }

// 错误 2: 不使用参数封装
@PostMapping("/add")
public Long add(@RequestBody XxxDTO dto) { }  // 应该用 LeRequest<XxxDTO>

// 错误 3: 不使用分组校验
@PostMapping("/add")
public Long add(@Valid @RequestBody LeRequest<XxxDTO> request) { }  // 应该用 @Validated(InsertGroup.class)

// 错误 4: 使用 javax.validation（JDK 21 应用 jakarta.validation）
import javax.validation.constraints.NotNull;  // ❌ 错误

// 错误 5: 审计字段使用 RuoYi 命名
private String createBy;  // ❌ 应该用 crby

// 错误 6: 主键策略错误
@TableId(type = IdType.ASSIGN_ID)  // ❌ leniu 使用自增
// 应该用
@TableId(value = "id", type = IdType.AUTO)
```

### ✅ 正确做法

```java
// 正确 1: 添加认证注解
@RestController
@RequiresAuthentication
public class XxxController { }

// 正确 2: 使用参数封装
@PostMapping("/add")
public void add(@RequestBody LeRequest<XxxDTO> request) {
    xxxService.add(request.getContent());
}

// 正确 3: 使用分组校验
@Validated(InsertGroup.class)

// 正确 4: 使用 Jakarta Validation
import jakarta.validation.constraints.NotNull;  // ✅ 正确

// 正确 5: 使用 leniu 审计字段
@TableField(fill = FieldFill.INSERT)
private String crby;

// 正确 6: 使用自增主键
@TableId(value = "id", type = IdType.AUTO)
private Long id;
```

---

## 相关技能

| 需要了解 | 激活 Skill |
|---------|-----------|
| Service 层规范 | `leniu-service-development` |
| Entity 实体规范 | `leniu-entity-design` |
| 数据库设计 | `leniu-database-design` |
| 原始 API 规范 | `api-development` (RuoYi-Vue-Plus) |
