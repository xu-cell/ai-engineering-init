---
name: leniu-java-mybatis
description: |
  leniu-tengyun-core 项目 MyBatis 使用规范。当编写 MyBatis Plus 代码或 MyBatis XML 映射文件时使用此 skill。

  触发场景：
  - 编写 Mapper 接口（extends BaseMapper）
  - 使用 LambdaQueryWrapper 构建查询条件
  - 编写 MyBatis XML 映射文件（动态 SQL、结果映射）
  - 使用 MyBatis Plus 分页查询
  - 处理租户隔离（@InterceptorIgnore）

  触发词：MyBatis、MyBatisPlus、Mapper、LambdaQueryWrapper、LambdaQuery、XML映射、动态SQL、selectPage、BaseMapper、@Select、resultMap、租户隔离、delFlag
---

# leniu-tengyun-core MyBatis 规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **ORM 框架** | MyBatis-Plus + MyBatis |
| **Mapper XML 位置** | 与 Mapper 接口同目录（非 resources/mapper/） |
| **分页组件** | PageHelper (PageMethod.startPage) |
| **租户隔离** | 租户行级隔离 |
| **逻辑删除** | 1=删除，2=正常（与 RuoYi 相反） |

## Mapper 接口模板

### 基础 Mapper

```java
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import net.xnzn.core.xxx.model.XxxEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    List<XxxVO> listByParam(@Param("param") XxxParam param);
}
```

### 租户隔离忽略（方法级）

```java
import com.baomidou.mybatisplus.core.interceptor.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    @InterceptorIgnore(tenantLine = "true")
    List<XxxVO> queryWithoutTenant(@Param("param") XxxParam param);
}
```

**说明**：`@InterceptorIgnore(tenantLine = "true")` 仅忽略特定方法的租户行级隔离。

### 全量忽略拦截器（类级别，来自 OrderInfoMapper 真实代码）

```java
import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import net.xnzn.framework.data.exists.BaseExistsMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
@InterceptorIgnore  // ✅ 无参数，类级别，跳过所有拦截器（含租户、数据权限等）
public interface XxxMapper extends BaseMapper<XxxEntity>, BaseExistsMapper<XxxEntity> {

    // 自定义 XML 查询方法
    List<XxxVO> listVoByIds(@Param("orderIds") List<Long> ids, @Param("tenantId") String tenantId);

    @QueryExtension
    List<XxxIdDateVO> queryXxx(@Param("param") XxxSearchParam param, @Param("permission") XxxUserPermissionDTO permission);
}
```

**说明**：
- `@InterceptorIgnore`（无参数）在**类级别**：整个 Mapper 的所有方法都跳过 MyBatis-Plus 所有拦截器（租户隔离、数据权限等），需要自行在 SQL 中控制
- `BaseExistsMapper<XxxEntity>` 提供 `existsOne(Wrapper)` 方法，用于检查记录是否存在，比 `selectCount > 0` 更高效
- 适用于：订单等核心表（数据量大、需要全量跨租户查询的场景）

### BaseExistsMapper 使用示例

```java
// 检查订单是否存在
boolean exists = baseMapper.existsOne(
    Wrappers.lambdaQuery(OrderInfo.class)
        .eq(OrderInfo::getMacOrderId, macOrderId)
        .eq(OrderInfo::getDelFlag, 2)
);
```

## Entity 实体类模板

### 基础 Entity

```java
import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName(value = "table_name", autoResultMap = true)
public class XxxEntity {

    @TableId
    @ApiModelProperty(value = "主键ID")
    private Long id;

    @ApiModelProperty(value = "删除标识(1-删除,2-正常)")
    private Integer delFlag;

    @ApiModelProperty(value = "创建人")
    private String crby;

    @ApiModelProperty(value = "创建时间")
    private LocalDateTime crtime;

    @ApiModelProperty(value = "更新人")
    private String upby;

    @ApiModelProperty(value = "更新时间")
    private LocalDateTime uptime;
}
```

### 自动填充字段

```java
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName(value = "table_name", autoResultMap = true)
public class XxxEntity {

    @TableId
    private Long id;

    // 插入时自动填充
    @TableField(fill = FieldFill.INSERT)
    private String crby;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    // 插入或更新时自动填充
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String upby;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;
}
```

## LambdaQuery 使用

### 条件查询

```java
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;

// 条件查询
List<XxxEntity> list = mapper.selectList(
    Wrappers.lambdaQuery(XxxEntity.class)
        .eq(XxxEntity::getStatus, 1)
        .eq(XxxEntity::getDelFlag, 2)  // 2=正常
        .in(XxxEntity::getId, idList)
        .like(StrUtil.isNotBlank(name), XxxEntity::getName, name)
        .orderByDesc(XxxEntity::getCrtime)
);
```

### 字段非空判断

```java
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;

LambdaQueryWrapper<XxxEntity> wrapper = Wrappers.lambdaQuery();

// 使用 Hutool 工具类
wrapper.eq(ObjectUtil.isNotNull(status), XxxEntity::getStatus, status);
wrapper.like(StrUtil.isNotBlank(keyword), XxxEntity::getName, keyword);
wrapper.ge(startDate != null, XxxEntity::getCrtime, startDate);
wrapper.le(endDate != null, XxxEntity::getCrtime, endDate);
```

## XML 编写模板

### 基本结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
    "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="net.xnzn.core.xxx.mapper.XxxMapper">

    <select id="listByParam" resultType="net.xnzn.core.xxx.vo.XxxVO">
        SELECT
            t.id,
            t.name,
            t.status
        FROM table_name t
        <where>
            t.del_flag = 2
            <if test="param.status != null">
                AND t.status = #{param.status}
            </if>
            <if test="param.keyword != null and param.keyword != ''">
                AND t.name LIKE CONCAT('%', #{param.keyword}, '%')
            </if>
        </where>
        ORDER BY t.crtime DESC
    </select>
</mapper>
```

### XML 编写规范

| 规则 | 说明 |
|------|------|
| 禁止 `SELECT *` | 必须明确指定字段 |
| 使用 `<where>` | 自动处理 AND 前缀 |
| 使用 `<if>` | 动态条件判断 |
| 特殊字符包裹 | `<![CDATA[ ]]>` 包含 `<`、`>` 等 |
| 参数占位符 | 使用 `#{}` 而非 `${}` 防止 SQL 注入 |
| 逻辑删除条件 | `del_flag = 2` 表示正常数据 |

### 常用 XML 标签

```xml
<!-- 条件判断 -->
<if test="param.status != null">
    AND t.status = #{param.status}
</if>

<!-- 集合遍历（IN 查询） -->
<if test="param.ids != null and param.ids.size() > 0">
    AND t.id IN
    <foreach collection="param.ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</if>

<!-- 多条件 OR -->
<if test="param.keyword != null and param.keyword != ''">
    AND (
        t.name LIKE CONCAT('%', #{param.keyword}, '%')
        OR t.code LIKE CONCAT('%', #{param.keyword}, '%')
    )
</if>

<!-- 时间范围 -->
<if test="param.startDate != null">
    AND t.crtime >= #{param.startDate}
</if>
<if test="param.endDate != null">
    AND t.crtime &lt;= #{param.endDate}
</if>

<!-- 特殊字符 -->
&lt;  <!-- 小于 < -->
&gt;  <!-- 大于 > -->
&amp; <!-- 和 & -->
```

## Mapper XML 位置

### leniu 项目规范

```
net.xnzn.core.xxx.mapper
├── XxxMapper.java          # Mapper 接口
└── XxxMapper.xml          # XML 文件（与接口同目录）
```

**注意**：leniu 项目的 Mapper XML 文件放在与 Mapper 接口同目录下，不是 `resources/mapper/`。

## Service 中 Mapper 注入规范

### 字段命名（来自 OrderInfoService 真实代码）

```java
@Slf4j
@Service
@Validated
public class XxxService {

    // ✅ 正确：Mapper 字段命名为 baseMapper
    @Autowired
    private XxxMapper baseMapper;

    // 其他跨模块依赖用 @Lazy 避免循环依赖
    @Autowired
    @Lazy
    private XxxDetailService xxxDetailService;

    public XxxEntity getOne(Long id) {
        return baseMapper.selectById(id);
    }

    public List<XxxVO> listByIds(List<Long> ids) {
        return baseMapper.listVoByIds(ids, TenantContextHolder.getTenantId());
    }

    public boolean exists(String macOrderId) {
        return baseMapper.existsOne(
            Wrappers.lambdaQuery(XxxEntity.class)
                .eq(XxxEntity::getMacOrderId, macOrderId)
                .eq(XxxEntity::getDelFlag, 2)
        );
    }
}
```

**规范要点**：
- Service **无接口**（不用 `IXxxService`），直接 `@Service` 类
- Service 类上加 `@Validated` 支持方法参数的 `@NotNull` 校验
- Mapper 注入字段名统一用 `baseMapper`（不用 `xxxMapper`）
- 跨模块依赖（其他 Service/Client）用 `@Autowired @Lazy` 防循环依赖

## 分页查询

### PageHelper 分页

```java
import com.github.pagehelper.page.PageMethod;
import net.xnzn.core.common.page.PageVO;

public PageVO<XxxVO> pageList(XxxParam param) {
    // ✅ 正确：传入 PageDTO 对象（非 pageNum/pageSize 拆分）
    if (Objects.nonNull(param.getPage())) {
        PageMethod.startPage(param.getPage());
    }

    // 执行查询，Mapper 返回 List 即可，PageHelper 自动附加分页信息
    List<XxxVO> records = xxxMapper.listByParam(param);

    // 包装为 PageVO（自动提取 total 等信息）
    return PageVO.of(records);
}
```

**注意**：
- `PageMethod.startPage(param.getPage())` 传 `PageDTO` 对象，不要拆开传 `pageNum`/`pageSize`
- Mapper 方法返回 `List<XxxVO>` 即可，PageHelper 拦截器自动处理分页
- `PageVO.of(records)` 自动从 PageHelper 的 Page 代理对象提取总数等信息

### Param 分页参数

```java
@Data
public class XxxParam implements Serializable {

    @ApiModelProperty(value = "分页参数", required = true)
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;

    @ApiModelProperty("关键字")
    private String keyword;
}
```

## 报表 Mapper 规范（来自 ReportAnalysisTurnoverMapper 真实代码）

报表模块的 Mapper **不继承 BaseMapper**（纯 SQL 查询，无 CRUD），固定三个参数：`param`、`authPO`、`dataPermission`：

```java
@Mapper
public interface ReportXxxMapper {

    // ✅ 分页列表查询（PageHelper 拦截，方法返回 List）
    List<XxxVO> listSummary(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // ✅ 合计行查询（不分页，返回单个汇总 VO）
    XxxVO getSummaryTotal(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // ✅ 按日/按月分组（对应 dateType 参数）
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

    // ✅ 汇总数据（总金额、人次等）
    ReportTurnoverPO getTurnoverTotal(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    // ✅ 排行榜类（不需要 authPO 时可省略）
    List<RankVO> getXxxRank(
        @Param("param") RankParam param,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );
}
```

**报表 Mapper 关键规则**：
1. `@Mapper` 注解，**不继承 BaseMapper**（报表无 CRUD）
2. 所有参数必须加 `@Param`，顺序：`param` → `authPO` → `dataPermission`
3. 分页列表返回 `List<VO>`，由 Service 层调用 `PageMethod.startPage()` 控制
4. 合计行返回单个 PO/VO 对象
5. COUNT 方法（`listXxx_COUNT`）配合 `CompletableFuture` 并发使用

**命名规律**：
- 分页数据方法：`listXxx()`
- 对应 COUNT 方法：`listXxx_COUNT()`（下划线 + COUNT）
- 合计行方法：`getSummaryTotal()` / `getSummaryXxxTotal()`
- 按维度变体：`listXxxByDay()` / `listXxxByDay_COUNT()`

## 合计行查询

### Mapper 接口（普通 CRUD 模块）

```java
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    List<XxxVO> listByParam(@Param("param") XxxParam param);

    XxxVO getSummaryTotal(@Param("param") XxxParam param);
}
```

### XML 实现

```xml
<!-- 列表查询 -->
<select id="listByParam" resultType="XxxVO">
    SELECT
        id,
        name,
        amount,
        count
    FROM table_name
    <where>...</where>
    ORDER BY id DESC
</select>

<!-- 合计查询：只返回数值字段 -->
<select id="getSummaryTotal" resultType="XxxVO">
    SELECT
        SUM(amount) AS amount,
        SUM(count) AS count
    FROM table_name
    <where>...</where>
</select>
```

**核心原则**：合计行 SQL 只返回需要合计的数值字段，不返回非数值字段（如名称、日期等）。

### 常用合计函数

| 函数 | 用途 | 示例 |
|------|------|------|
| `SUM()` | 求和 | `SUM(amount)` |
| `COUNT()` | 计数 | `COUNT(*)` |
| `AVG()` | 平均值 | `AVG(price)` |
| `MAX()` | 最大值 | `MAX(amount)` |
| `MIN()` | 最小值 | `MIN(amount)` |

### 特殊处理

```xml
<!-- 除零处理 -->
CASE
    WHEN SUM(count) = 0 THEN 0
    ELSE SUM(amount) / SUM(count)
END AS avgAmount

<!-- 按维度平均 -->
CASE
    WHEN SUM(staff_count) = 0 THEN 0
    ELSE SUM(avg_salary) / COUNT(DISTINCT tenant_id)
END AS avgSalary
```

## 租户隔离

### 自动隔离

默认情况下，MyBatis-Plus 会自动为查询添加租户条件：

```sql
SELECT * FROM table_name WHERE del_flag = 2 AND tenant_id = ?
```

### 忽略租户隔离

```java
@InterceptorIgnore(tenantLine = "true")
List<XxxVO> queryWithoutTenant(@Param("param") XxxParam param);
```

**使用场景**：
- 查询系统级配置数据
- 跨租户数据汇总
- 导出所有租户数据

## 逻辑删除

### 删除标识

| 值 | 含义 |
|-----|------|
| 1 | 已删除 |
| 2 | 正常 |

**注意**：与 RuoYi-Vue-Plus 相反（RuoYi: 0=正常, 2=删除）

### 查询过滤

```java
// 查询时自动过滤已删除数据
LambdaQueryWrapper<XxxEntity> wrapper = Wrappers.lambdaQuery();
wrapper.eq(XxxEntity::getDelFlag, 2);  // 2=正常

// XML 中手动添加
SELECT * FROM table_name WHERE del_flag = 2
```

## 常用工具类

### Hutool 工具类

```java
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.collection.CollUtil;

// 对象判空
if (ObjectUtil.isNull(entity)) { }
if (ObjectUtil.isNotNull(entity)) { }

// 字符串判空
if (StrUtil.isBlank(str)) { }
if (StrUtil.isNotBlank(str)) { }

// 集合判空
if (CollUtil.isEmpty(list)) { }
if (CollUtil.isNotEmpty(list)) { }
```

### MyBatis-Plus 工具类

```java
import com.baomidou.mybatisplus.core.toolkit.Wrappers;

// 创建 Lambda 查询包装器
LambdaQueryWrapper<XxxEntity> wrapper = Wrappers.lambdaQuery();
LambdaUpdateWrapper<XxxEntity> updateWrapper = Wrappers.lambdaUpdate();
```

## 常见错误

### 错误1：使用 RuoYi 的 TenantEntity

```java
// ❌ 错误：使用 RuoYi 的基类
import org.dromara.common.mybatis.core.domain.TenantEntity;

// ✅ 正确：leniu 项目使用自定义 Entity 或无基类
@Data
@TableName("table_name")
public class XxxEntity {
    @TableId
    private Long id;
}
```

### 错误2：delFlag 判断错误

```java
// ❌ 错误：使用 RuoYi 的值
wrapper.eq(XxxEntity::getDelFlag, 0);

// ✅ 正确：leniu 使用 2 表示正常
wrapper.eq(XxxEntity::getDelFlag, 2);
```

### 错误3：XML 路径错误

```
# ❌ 错误：resources/mapper/ 目录
net.xnzn.core.xxx.mapper
└── XxxMapper.java
src/main/resources/mapper/
└── XxxMapper.xml

# ✅ 正确：XML 与接口同目录
net.xnzn.core.xxx.mapper
├── XxxMapper.java
└── XxxMapper.xml
```

### 错误4：MapstructUtils 工具类

```java
// ❌ 错误：使用 RuoYi 的工具类
import org.dromara.common.core.utils.MapstructUtils;

// ✅ 正确：leniu 使用 Hutool
import cn.hutool.core.bean.BeanUtil;
Target target = BeanUtil.copyProperties(source, Target.class);
```

## 参考文档

详见：[leniu-tengyun-core 源码](/Users/xujiajun/Developer/gongsi_proj/core/leniu-tengyun-core)
