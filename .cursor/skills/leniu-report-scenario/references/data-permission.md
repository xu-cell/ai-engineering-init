# 报表数据权限集成

> 本文件按需加载：当报表需要数据权限过滤时读取。默认不加载。

---

## 一、权限模型

### ReportDataPermissionParam

```java
@Data
public class ReportDataPermissionParam {
    private List<Long> areaIdList;      // 区域权限
    private List<Long> orgIdList;       // 机构权限
    private List<Long> canteenIdList;   // 食堂权限
    private List<Long> stallIdList;     // 档口权限
    private Integer roleType;           // 权限类型
}
```

### 权限类型

| roleType | 含义 | 过滤维度 |
|----------|------|---------|
| -1 | 超级管理员 | 不过滤 |
| 1 | 区域权限 | areaIdList |
| 2 | 机构权限 | orgIdList |
| 3 | 食堂权限 | canteenIdList |
| 4 | 档口权限 | stallIdList |
| 5 | 食堂+档口权限 | canteenIdList + stallIdList |

---

## 二、Service 层集成

```java
@Service
@Slf4j
public class XxxReportService {

    @Autowired
    private MgrAuthV2Api mgrAuthApi;
    @Autowired
    private ReportDataPermissionService reportDataPermissionService;
    @Autowired
    private AsyncTaskExecutor asyncTaskExecutor;

    public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxParam param) {
        // 1. 获取用户权限
        MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
        ReportDataPermissionParam permission =
            reportDataPermissionService.getDataPermission(authPO);

        // 2. 并行查询（携带权限参数）
        CompletableFuture<Long> countF = CompletableFuture.supplyAsync(
            () -> mapper.listSummary_COUNT(param, authPO, permission), asyncTaskExecutor);
        CompletableFuture<List<XxxVO>> listF = CompletableFuture.supplyAsync(() -> {
            PageMethod.startPage(param.getPage());
            return mapper.listSummaryPage(param, authPO, permission);
        }, asyncTaskExecutor);
        CompletableFuture<XxxVO> totalF = CompletableFuture.supplyAsync(
            () -> mapper.getSummaryTotal(param, authPO, permission), asyncTaskExecutor);
        CompletableFuture.allOf(countF, listF, totalF).join();

        PageVO<XxxVO> pageVO = PageVO.of(listF.join());
        pageVO.setTotal(countF.join());
        return new ReportBaseTotalVO<XxxVO>()
            .setResultPage(pageVO)
            .setTotalLine(totalF.join());
    }
}
```

---

## 三、Mapper 签名

```java
public interface XxxReportMapper extends BaseMapper<ReportSumXxx> {

    List<XxxVO> listSummaryPage(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    XxxVO getSummaryTotal(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    Long listSummary_COUNT(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );
}
```

---

## 四、XML 权限 SQL

### 方式一：引用公共权限片段

```xml
<sql id="baseWhere">
    WHERE a.del_flag = 2
    <if test="param.startDate != null">
        AND a.statistic_date >= #{param.startDate}
    </if>
    <if test="param.endDate != null">
        AND a.statistic_date &lt;= #{param.endDate}
    </if>
    <!-- 引入数据权限 -->
    <include refid="net.xnzn.core.report.statistics.common.mapper.ReportDataPermissionMapper.dataPermission"/>
</sql>
```

### 方式二：内联权限判断

```xml
<!-- 超级管理员不过滤 -->
<if test="'-1'.toString() != authPO.roleType.toString()">
    AND EXISTS (
        SELECT null FROM mgr_role_org it1
        WHERE a.org_id = it1.org_id
        AND it1.role_id = #{authPO.roleId}
    )
</if>

<!-- 食堂权限过滤 -->
<if test="dataPermission.canteenIdList != null and dataPermission.canteenIdList.size() > 0">
    AND a.canteen_id IN
    <foreach collection="dataPermission.canteenIdList" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</if>

<!-- 档口权限过滤 -->
<if test="dataPermission.stallIdList != null and dataPermission.stallIdList.size() > 0">
    AND a.stall_id IN
    <foreach collection="dataPermission.stallIdList" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</if>
```

---

## 五、Controller 层（带权限的导出）

```java
@PostMapping("/export")
@ApiOperation("导出（含权限）")
public void export(@RequestBody LeRequest<XxxParam> request) {
    XxxParam param = request.getContent();

    // 获取权限（导出也需要权限过滤）
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam permission =
        reportDataPermissionService.getDataPermission(authPO);

    XxxVO totalLine = mapper.getSummaryTotal(param, authPO, permission);

    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("report.xxx.title"),
        I18n.getMessage(ReportConstant.REPORT_TITLE_DETAILS),
        XxxVO.class,
        param.getExportCols(),
        param.getPage(),
        totalLine,
        () -> {
            PageMethod.startPage(param.getPage());
            List<XxxVO> list = mapper.listSummaryPage(param, authPO, permission);
            return PageVO.of(list);
        }
    );
}
```
