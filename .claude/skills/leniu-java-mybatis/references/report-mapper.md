# 报表 Mapper 完整示例

## Mapper 接口（来自 ReportAnalysisTurnoverMapper 真实代码）

```java
@Mapper
public interface ReportXxxMapper {

    // 分页列表查询（PageHelper 拦截，方法返回 List）
    List<XxxVO> listSummary(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // 合计行查询（不分页，返回单个汇总 VO）
    XxxVO getSummaryTotal(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // 按日/按月分组（对应 dateType 参数）
    List<XxxVO> listSummaryByDay(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );
    List<XxxVO> listSummaryByMonth(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // 汇总数据（总金额、人次等）
    ReportTurnoverPO getTurnoverTotal(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // 排行榜类（不需要 authPO 时可省略）
    List<RankVO> getXxxRank(
        @Param("param") RankParam param,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );
}
```

## 关键规则

1. `@Mapper` 注解，**不继承 BaseMapper**（报表无 CRUD）
2. 所有参数必须加 `@Param`，顺序：`param` -> `authPO` -> `dataPermission`
3. 分页列表返回 `List<VO>`，由 Service 层调用 `PageMethod.startPage()` 控制
4. 合计行返回单个 PO/VO 对象
5. COUNT 方法（`listXxx_COUNT`）配合 `CompletableFuture` 并发使用

## 命名规律

| 类型 | 命名 |
|------|------|
| 分页数据 | `listXxx()` |
| 对应 COUNT | `listXxx_COUNT()`（下划线 + COUNT） |
| 合计行 | `getSummaryTotal()` / `getSummaryXxxTotal()` |
| 按维度变体 | `listXxxByDay()` / `listXxxByDay_COUNT()` |

## 合计 SQL 常用函数

| 函数 | 用途 |
|------|------|
| `SUM()` | 求和 |
| `COUNT(*)` | 计数 |
| `AVG()` | 平均值 |
| `MAX()` / `MIN()` | 极值 |

## 除零处理

```xml
CASE
    WHEN SUM(count) = 0 THEN 0
    ELSE SUM(amount) / SUM(count)
END AS avgAmount

CASE
    WHEN SUM(staff_count) = 0 THEN 0
    ELSE SUM(avg_salary) / COUNT(DISTINCT tenant_id)
END AS avgSalary
```
