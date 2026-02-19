---
name: java-amount-handling
description: |
  Java金额处理规范。金融系统中金额以分（Long类型）存储，展示时转换为元。
  
    触发场景：
    - VO/Entity类含金额字段（amountFen/amountYuan）
    - MyBatis XML查询含金额字段
    - Excel导出含金额列，需分转元
    - 报表合计查询含金额汇总
  
    触发词：金额、分转元、元转分、Long金额、money、fen、cents、金额字段、金额处理、AmountConverter
---

# Java Amount Handling

## Core Principle

Amounts are stored as **Long type in cents** (分). Display conversion happens automatically:
- **Frontend display**: Framework auto-converts cents to yuan
- **Excel export**: `CustomNumberConverter.class` handles /100
- **Database/Queries**: Never do /100 in SQL

## VO/Entity Classes

### Entity (Database Layer)
```java
@Data
@TableName("order_table")
public class OrderEntity {
    @ApiModelProperty("订单金额（分）")
    private Long orderAmount;
}
```

### VO (Response Layer)
```java
@Data
public class OrderVO {
    @ApiModelProperty("订单金额")
    @ExcelProperty(value = "{school.order-amount}", converter = CustomNumberConverter.class)
    private BigDecimal orderAmount;
}
```

**Key points:**
- Entity uses `Long` (cents)
- VO uses `BigDecimal` (MyBatis auto-converts)
- Excel export requires `converter = CustomNumberConverter.class`

## MyBatis XML Queries

### List Query
```xml
<select id="listOrders" resultType="OrderVO">
    SELECT
        order_id,
        order_amount  -- NO /100.0
    FROM order_table
    <where>...</where>
</select>
```

### Total/Summary Query
```xml
<select id="getOrderTotal" resultType="OrderVO">
    SELECT
        SUM(order_amount) AS order_amount  -- NO /100.0
    FROM order_table
    <where>...</where>
</select>
```

**Important:**
- Never use `/100.0` in SQL
- Total queries should only return numeric fields
- Exclude non-numeric fields (dates, names) from totals

## Common Patterns

### Salary Summary Example
```java
@Data
public class CostSalarySumMerchantVO {
    @ApiModelProperty("月度")
    @ExcelProperty(value = "{cost.excel.month}")
    private String dateMonth;

    @ApiModelProperty("基本工资")
    @ExcelProperty(value = {"{cost.excel.salaryDetail}", "{cost.excel.basic}"}, converter = CustomNumberConverter.class)
    private BigDecimal basicSalary;

    @ApiModelProperty("平均工资")
    @ExcelProperty(value = "{cost.excel.averageSalary}", converter = CustomNumberConverter.class)
    private BigDecimal avgSalary;
}
```

### Average Calculation in SQL
```xml
<select id="getSalaryTotal" resultType="CostSalarySumMerchantVO">
    SELECT
        SUM(staff_count) AS staff_count,
        SUM(basic_salary) AS basic_salary,
        CASE
            WHEN SUM(staff_count) = 0 THEN 0
            ELSE SUM(avg_salary) / COUNT(DISTINCT tenant_id)
        END AS avg_salary
    FROM monitor_salary_summary
</select>
```

## Data Flow

```
Database (Long/cents) → MyBatis → VO (BigDecimal) → Frontend (auto /100)
                                              ↓
                                         Excel (converter /100)
```

## Required Imports

```java
import com.alibaba.excel.annotation.ExcelProperty;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import net.xnzn.core.common.export.converter.CustomNumberConverter;

import java.math.BigDecimal;
```
