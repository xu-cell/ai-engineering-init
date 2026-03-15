---
name: leniu-java-mybatis
description: |
  leniu-tengyun-core 项目 MyBatis/MyBatis-Plus 使用规范。当编写 Mapper、XML 映射、分页查询时使用此 skill。

  触发场景：
  - 编写 Mapper 接口（extends BaseMapper）
  - 编写 MyBatis XML 映射文件（动态 SQL）
  - 使用 LambdaQueryWrapper 构建查询
  - 分页查询（PageHelper + PageVO）
  - 租户隔离控制（@InterceptorIgnore）

  触发词：MyBatis、MyBatisPlus、Mapper、LambdaQueryWrapper、XML映射、动态SQL、BaseMapper、分页查询、租户隔离、报表Mapper、PageHelper
---

# leniu MyBatis 规范

## 项目特征速查

| 项 | 值 |
|---|---|
| XML 位置 | **与 Mapper 接口同目录**（非 `resources/mapper/`） |
| 分页 | PageHelper → `PageMethod.startPage(PageDTO)` → `PageVO.of(list)` |
| 逻辑删除 | **1=删除，2=正常**（与 RuoYi 相反） |
| Service | **两种模式并存**：简单 CRUD 继承 `ServiceImpl`（`this.baseMapper`）；业务聚合直接 `@Service`（`@Autowired XxxMapper xxxMapper`） |
| 循环依赖 | 跨模块依赖用 `@Autowired @Lazy` |

## Mapper 接口模板

### 基础 Mapper

```java
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    List<XxxVO> listByParam(@Param("param") XxxParam param);
}
```

### 忽略租户隔离（方法级）

```java
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    @InterceptorIgnore(tenantLine = "true")
    List<XxxVO> queryWithoutTenant(@Param("param") XxxParam param);
}
```

### 全量忽略拦截器（类级别）

```java
@Mapper
@InterceptorIgnore  // 无参数，跳过所有拦截器（租户、数据权限等）
public interface XxxMapper extends BaseMapper<XxxEntity>, BaseExistsMapper<XxxEntity> {

    List<XxxVO> listVoByIds(@Param("orderIds") List<Long> ids, @Param("tenantId") String tenantId);

    @QueryExtension
    List<XxxIdDateVO> queryXxx(@Param("param") XxxSearchParam param,
                               @Param("permission") XxxUserPermissionDTO permission);
}
```

- `BaseExistsMapper` 提供 `existsOne(Wrapper)` 方法（比 `selectCount > 0` 高效）
- 适用于数据量大、需跨租户查询的核心表

## XML 模板

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

### XML 编写规则

| 规则 | 说明 |
|------|------|
| 禁止 `SELECT *` | 必须明确指定字段 |
| `del_flag = 2` | 正常数据条件 |
| `#{}` 占位符 | 禁止 `${}`（SQL 注入） |
| `<where>` 标签 | 自动处理 AND 前缀 |
| 特殊字符 | `&lt;` / `&gt;` 或 `<![CDATA[ ]]>` |

### 常用动态 SQL 片段

```xml
<!-- IN 查询 -->
<if test="param.ids != null and param.ids.size() > 0">
    AND t.id IN
    <foreach collection="param.ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</if>

<!-- 多条件 OR -->
<if test="param.keyword != null and param.keyword != ''">
    AND (t.name LIKE CONCAT('%', #{param.keyword}, '%')
         OR t.code LIKE CONCAT('%', #{param.keyword}, '%'))
</if>

<!-- 时间范围 -->
<if test="param.startDate != null">
    AND t.crtime >= #{param.startDate}
</if>
<if test="param.endDate != null">
    AND t.crtime &lt;= #{param.endDate}
</if>
```

## LambdaQuery 使用

```java
List<XxxEntity> list = mapper.selectList(
    Wrappers.lambdaQuery(XxxEntity.class)
        .eq(XxxEntity::getStatus, 1)
        .eq(XxxEntity::getDelFlag, 2)  // 2=正常
        .in(CollUtil.isNotEmpty(idList), XxxEntity::getId, idList)
        .like(StrUtil.isNotBlank(name), XxxEntity::getName, name)
        .ge(startDate != null, XxxEntity::getCrtime, startDate)
        .le(endDate != null, XxxEntity::getCrtime, endDate)
        .orderByDesc(XxxEntity::getCrtime)
);
```

## Service 注入规范

项目中 Service 有两种模式，Mapper 字段名也不统一——参考周围已有代码的风格即可。

**模式 A：继承 ServiceImpl（简单 CRUD）**
```java
@Service
public class XxxServiceImpl extends ServiceImpl<XxxMapper, XxxEntity> implements XxxService {
    // 通过 this.baseMapper 访问 Mapper（父类自动注入）
    public boolean exists(String macOrderId) {
        return this.baseMapper.existsOne(
            Wrappers.lambdaQuery(XxxEntity.class)
                .eq(XxxEntity::getMacOrderId, macOrderId)
                .eq(XxxEntity::getDelFlag, 2)
        );
    }
}
```

**模式 B：直接 @Service（业务聚合）**
```java
@Slf4j
@Service
public class XxxService {
    @Autowired
    private XxxMapper xxxMapper;  // 字段名跟随 Mapper 类名

    @Autowired @Lazy
    private YyyService yyyService;  // 跨模块用 @Lazy

    public XxxEntity getOne(Long id) {
        return xxxMapper.selectById(id);
    }
}
```

## 分页查询

```java
public PageVO<XxxVO> pageList(XxxParam param) {
    // ✅ 传入 PageDTO 对象（不要拆 pageNum/pageSize）
    if (Objects.nonNull(param.getPage())) {
        PageMethod.startPage(param.getPage());
    }

    List<XxxVO> records = xxxMapper.listByParam(param);

    return PageVO.of(records);  // 自动提取 total 等信息
}
```

Mapper 方法返回 `List<XxxVO>` 即可，PageHelper 拦截器自动处理分页。

## 报表 Mapper（无 BaseMapper）

```java
@Mapper
public interface ReportXxxMapper {  // ✅ 不继承 BaseMapper

    List<XxxVO> listSummary(
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );

    XxxVO getSummaryTotal(  // 合计行
        @Param("param") XxxParam param,
        @Param("authPO") MgrUserAuthPO authPO,
        @Param("dataPermission") ReportDataPermissionParam dataPermission
    );
}
```

**命名规律**：`listXxx()` 分页数据 / `listXxx_COUNT()` 计数 / `getSummaryTotal()` 合计行 / `listXxxByDay()` 按维度

## 合计行查询

```xml
<!-- 列表查询 -->
<select id="listByParam" resultType="XxxVO">
    SELECT id, name, amount, count
    FROM table_name
    <where>...</where>
    ORDER BY id DESC
</select>

<!-- 合计查询：只返回数值字段 -->
<select id="getSummaryTotal" resultType="XxxVO">
    SELECT SUM(amount) AS amount, SUM(count) AS count
    FROM table_name
    <where>...</where>
</select>
```

除零处理：
```xml
CASE WHEN SUM(count) = 0 THEN 0 ELSE SUM(amount) / SUM(count) END AS avgAmount
```

## 禁止项

```java
// ❌ 继承 RuoYi TenantEntity
import org.dromara.common.mybatis.core.domain.TenantEntity;

// ❌ delFlag: 0=正常（leniu 是 2=正常）
wrapper.eq(XxxEntity::getDelFlag, 0);

// ❌ XML 放 resources/mapper/（必须与 Mapper 接口同目录）

// ❌ MapstructUtils（用 BeanUtil.copyProperties）
MapstructUtils.convert(source, Target.class);

// ❌ 业务聚合 Service 不要继承 IService / ServiceImpl（简单 CRUD Service 可以继承）
// 错误：在报表/业务编排 Service 中继承 ServiceImpl
// 正确：简单单表 CRUD 可以继承 ServiceImpl，复杂业务直接 @Service
```

## XML 文件位置

```
net.xnzn.core.xxx.mapper/
├── XxxMapper.java      # 接口
└── XxxMapper.xml       # XML（同目录！）
```

## 参考文档

- 报表 Mapper 完整示例：详见 `references/report-mapper.md`
