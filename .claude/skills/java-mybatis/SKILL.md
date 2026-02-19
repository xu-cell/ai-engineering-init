---
name: java-mybatis
description: |
  Java MyBatis使用规范。当编写MyBatis Plus代码或MyBatis XML映射文件时使用此skill。

  触发场景：
  - 编写Mapper接口（extends BaseMapper/BaseMapperPlus）
  - 使用LambdaQueryWrapper构建查询条件
  - 编写MyBatis XML映射文件（动态SQL、结果映射）
  - 使用MyBatis Plus分页查询

  触发词：MyBatis、MyBatisPlus、Mapper、LambdaQueryWrapper、LambdaQuery、XML映射、动态SQL、selectPage、BaseMapper、@Select、resultMap
---

# Java MyBatis规范

## Mapper接口模板

```java
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    List<XxxVO> listByParam(@Param("param") XxxParam param);

    @InterceptorIgnore(tenantLine = "true")
    List<XxxVO> queryWithoutTenant(@Param("param") XxxParam param);
}
```

## LambdaQuery使用

```java
// 条件查询
List<XxxEntity> list = mapper.selectList(
    Wrappers.lambdaQuery(XxxEntity.class)
        .eq(XxxEntity::getStatus, 1)
        .eq(XxxEntity::getDelFlag, LeConstants.COMMON_NO)
        .in(XxxEntity::getId, idList)
        .orderByDesc(XxxEntity::getCreateTime)
);
```

## XML编写模板

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
            t.del_flag = 0
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

## XML编写规范

### 必须遵守
- 禁止使用`SELECT *`
- 使用`<where>`自动处理AND前缀
- 使用`<if>`动态条件
- 特殊字符用`<![CDATA[ ]]>`包裹
- 使用`#{}而非`${}`防止SQL注入

### 常用标签
- `<where>`: WHERE条件
- `<if>`: 条件判断
- `<foreach>`: 集合遍历
- `<include>`: SQL片段复用

## 合计行查询

**核心原则**: 合计行SQL只返回需要合计的数值字段，不返回非数值字段。

### Mapper接口

```java
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    List<XxxVO> listByParam(@Param("param") XxxParam param);

    XxxVO getSummaryTotal(@Param("param") XxxParam param);
}
```

### XML实现

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

### 常见合计函数

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
