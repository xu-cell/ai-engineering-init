---
name: mealtime
description: |
  餐次处理规范。当编写涉及餐次（早餐/午餐/下午茶/晚餐/夜宵）的报表或查询代码时使用。

  触发场景：
  - 在 Param 查询参数类中添加餐次筛选字段（mealtimeTypes）
  - 在 VO 返回类中定义餐次字段和 MealtimeTypeConverter 转换器
  - 编写 MyBatis XML 中的餐次 IN 查询条件
  - 处理餐次枚举转换（AllocMealtimeTypeEnum）
  - 区分正餐（早/午/晚）与非正餐（下午茶/夜宵）

  触发词：餐次、mealtime、mealtimeType、早餐、午餐、晚餐、下午茶、夜宵、AllocMealtimeTypeEnum、MealtimeTypeConverter、正餐
---

# 腾云系统餐次处理规范

## 餐次枚举定义

### AllocMealtimeTypeEnum

餐次类型枚举 `AllocMealtimeTypeEnum` 定义了5种餐次：

| 枚举值 | key | 显示名称 | 说明 |
|--------|-----|----------|------|
| MEALTIME_BREAKFAST | 1 | 早餐 | {alloc_enum_mealtime_breakfast} |
| MEALTIME_LUNCH | 2 | 午餐 | {alloc_enum_mealtime_lunch} |
| MEALTIME_AFTERNOON_TEA | 3 | 下午茶 | {alloc_enum_mealtime_afternoon_tea} |
| MEALTIME_DINNER | 4 | 晚餐 | {alloc_enum_mealtime_dinner} |
| MEALTIME_MIDNIGHT_SNACK | 5 | 夜宵 | {alloc_enum_mealtime_midnight_snack} |

### 常用方法

```java
// 根据key获取枚举
AllocMealtimeTypeEnum typeEnum = AllocMealtimeTypeEnum.getTypeEnum(1);

// 根据key获取显示名称（支持国际化）
String desc = AllocMealtimeTypeEnum.getValueByKey(1); // 返回 "早餐"

// 获取所有餐次key列表
List<Integer> allTypes = AllocMealtimeTypeEnum.allTypeList(); // [1, 2, 3, 4, 5]

// 获取正餐类型列表
List<Integer> normalTypes = AllocMealtimeTypeEnum.normalTypeList(); // [1, 2, 4]
```

### 餐次分类

- **正餐**：早餐(1)、午餐(2)、晚餐(4)
- **非正餐**：下午茶(3)、夜宵(5)

## 查询参数中的餐次处理

### Param类定义

在报表查询Param类中添加餐次筛选字段：

```java
@ApiModelProperty(value = "餐次集合")
private List<Integer> mealtimeTypes;
```

### 完整示例

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ApiModel(value = "XXX查询入参")
public class XxxParam extends ReportBaseParam {

    @ApiModelProperty(value = "餐次集合")
    private List<Integer> mealtimeTypes;

    // 其他查询字段...
}
```

## 返回VO中的餐次处理

### VO字段定义

在报表返回VO类中定义餐次字段：

```java
@Data
@Accessors(chain = true)
@ApiModel(value = "XXX报表")
public class XxxVO {

    @ExcelProperty(value = "{report.meal-time}", order = 5, converter = MealtimeTypeConverter.class)
    @ApiModelProperty(value = "餐次")
    private Integer mealtimeType;

    // 其他字段...
}
```

### 必要的导入

```java
import com.alibaba.excel.annotation.ExcelProperty;
import net.xnzn.core.report.statistics.util.MealtimeTypeConverter;
```

### 字段说明

- `mealtimeType`: 存储餐次的整数key值（1-5）
- `@ExcelProperty`: 配置EasyExcel导出，使用`MealtimeTypeConverter`进行转换
- `converter = MealtimeTypeConverter.class`: 自动将整数转换为可读的餐次名称

## MyBatis XML中的餐次查询

### 基本IN查询

```xml
<!-- 餐次筛选 -->
<if test="mealtimeTypes != null and mealtimeTypes.size() > 0">
    AND mealtime_type IN
    <foreach collection="mealtimeTypes" item="type" open="(" separator="," close=")">
        #{type}
    </foreach>
</if>
```

### 正餐筛选

```xml
<!-- 仅查询正餐（早餐、午餐、晚餐） -->
AND mealtime_type IN (1, 2, 4)
```

### 完整示例

```xml
<select id="pageXxx" resultType="net.xnzn.core.report.xxx.vo.XxxVO">
    SELECT
        id,
        order_date,
        mealtime_type,
        cust_name,
        real_amount
    FROM order_table
    WHERE deleted = 0
    <if test="startDate != null">
        AND order_date >= #{startDate}
    </if>
    <if test="endDate != null">
        AND order_date &lt;= #{endDate}
    </if>
    <if test="mealtimeTypes != null and mealtimeTypes.size() > 0">
        AND mealtime_type IN
        <foreach collection="mealtimeTypes" item="type" open="(" separator="," close=")">
            #{type}
        </foreach>
    </if>
    <if test="canteenId != null">
        AND canteen_id = #{canteenId}
    </if>
    ORDER BY order_date DESC
</select>
```

## 常见使用场景

### 场景1：查询指定餐次的订单

```java
// Param定义
@ApiModelProperty(value = "餐次集合")
private List<Integer> mealtimeTypes;

// Service调用
List<Integer> mealtimeTypes = Arrays.asList(1, 2); // 查询早餐和午餐
param.setMealtimeTypes(mealtimeTypes);
```

### 场景2：仅查询正餐

```java
// 方式1：直接在XML中硬编码
AND mealtime_type IN (1, 2, 4)

// 方式2：使用枚举工具类
param.setMealtimeTypes(AllocMealtimeTypeEnum.normalTypeList());
```

### 场景3：导出时餐次列显示中文名称

```java
// VO定义
@ExcelProperty(value = "{report.meal-time}", order = 5, converter = MealtimeTypeConverter.class)
@ApiModelProperty(value = "餐次")
private Integer mealtimeType;

// 导出时自动转换：1 -> "早餐"，2 -> "午餐" 等
```

## 注意事项

1. **字段命名**：统一使用 `mealtimeType` (驼峰) 或 `mealtime_type` (下划线)
2. **类型**：数据库和Java代码中均使用 `Integer` 类型
3. **转换器**：导出时必须使用 `MealtimeTypeConverter` 进行转换
4. **国际化**：显示名称支持国际化，使用 `{alloc_enum_mealtime_xxx}` 格式
5. **正餐判断**：需要区分正餐时使用 `AllocMealtimeTypeEnum.normalTypeList()` 方法
