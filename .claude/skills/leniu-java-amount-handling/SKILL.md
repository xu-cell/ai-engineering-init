---
name: leniu-java-amount-handling
description: |
  leniu-tengyun-core 项目金额处理规范。金融系统中金额以分（Long 类型）存储，展示时转换为元。

  触发场景：
  - VO/Entity 类含金额字段（amountFen/amountYuan）
  - MyBatis XML 查询含金额字段
  - Excel 导出含金额列，需分转元
  - 报表合计查询含金额汇总

  触发词：金额、分转元、元转分、Long 金额、money、fen、cents、金额字段、金额处理、AmountConverter、AmountUtil
---

# leniu-tengyun-core 金额处理规范

## 两种金额存储模式

项目中存在两种金额存储模式，根据业务模块选择：

### 模式 A：Long（分）→ BigDecimal（元）[钱包/账户模块]

适用于余额、充值、补贴等精度要求高的模块：

- **数据库**：存储为 Long（分）
- **Entity**：使用 Long 类型
- **VO**：使用 BigDecimal 类型（MyBatis 自动转换分→元）
- **Excel 导出**：使用 `CustomNumberConverter` 转换器

### 模式 B：BigDecimal（分）[订单/报表模块]

适用于订单金额、报表汇总等复杂计算模块：

- **数据库**：存储为 BigDecimal（值为分，如 10000 = 100.00元）
- **Entity**：直接使用 BigDecimal 类型（以分为单位）
- **VO**：同样使用 BigDecimal（字段注释需标注单位）
- **SQL SUM**：直接 `SUM(amount)`，不需要 /100

> 参考：`OrderInfo.payableAmount`（BigDecimal，以分为单位）

## 金额类型速查

| 类型 | 用途 | 示例 |
|------|------|------|
| `Long` | 钱包/账户存储（分） | `private Long orderAmount; // 10000 = 100.00元` |
| `BigDecimal` | 订单/报表存储（分） | `private BigDecimal payableAmount; // 10000 = 100.00元` |
| `BigDecimal` | VO 展示（元，模式A） | `private BigDecimal amount; // 100.00` |

## Entity（模式A：Long存储）

```java
import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@TableName(value = "wallet_table", autoResultMap = true)
public class WalletEntity {

    @TableId
    @ApiModelProperty(value = "钱包ID")
    private Long id;

    @ApiModelProperty(value = "余额（分）")
    private Long balance;

    @ApiModelProperty(value = "充值金额（分）")
    private Long rechargeAmount;
}
```

**要点**：
- Entity 使用 `Long` 类型存储金额（分）
- 字段注释明确标注"（分）"

## Entity（模式B：BigDecimal存储，适用订单模块）

```java
@Data
@TableName("order_info")
public class OrderInfo {

    @ApiModelProperty(value = "应付金额（分）")
    private BigDecimal payableAmount;

    @ApiModelProperty(value = "实付金额（分）")
    private BigDecimal realAmount;

    @ApiModelProperty(value = "优惠金额（分）")
    private BigDecimal discountsAmount;
}
```

**要点**：
- 字段类型为 BigDecimal，但值以分为单位存储
- 不需要 MyBatis 类型转换

## VO（响应层）

```java
import com.alibaba.excel.annotation.ExcelProperty;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;
import net.xnzn.core.common.export.converter.CustomNumberConverter;

import java.math.BigDecimal;

@Data
@Accessors(chain = true)
@ApiModel("订单信息")
public class OrderVO {

    @ApiModelProperty("订单ID")
    private Long id;

    @ApiModelProperty("订单金额（元）")
    @ExcelProperty(value = "订单金额（元）", converter = CustomNumberConverter.class)
    private BigDecimal orderAmount;

    @ApiModelProperty("优惠金额（元）")
    @ExcelProperty(value = "优惠金额（元）", converter = CustomNumberConverter.class)
    private BigDecimal discountAmount;

    @ApiModelProperty("实付金额（元）")
    @ExcelProperty(value = "实付金额（元）", converter = CustomNumberConverter.class)
    private BigDecimal payAmount;
}
```

**要点**：
- VO 使用 `BigDecimal` 类型（元）
- Excel 导出必须使用 `converter = CustomNumberConverter.class`
- MyBatis 会自动将 Long 分转换为 BigDecimal 元

## MyBatis XML 查询

### 列表查询

```xml
<select id="listOrders" resultType="OrderVO">
    SELECT
        order_id,
        order_amount,      -- ❌ 不要 /100.0
        discount_amount,    -- ❌ 不要 /100.0
        pay_amount          -- ❌ 不要 /100.0
    FROM order_table
    <where>...</where>
    ORDER BY crtime DESC
</select>
```

### 合计查询

```xml
<select id="getOrderTotal" resultType="OrderVO">
    SELECT
        SUM(order_amount) AS order_amount,    -- ❌ 不要 /100.0
        SUM(discount_amount) AS discount_amount,-- ❌ 不要 /100.0
        SUM(pay_amount) AS pay_amount       -- ❌ 不要 /100.0
    FROM order_table
    <where>...</where>
</select>
```

**重要**：
- 永远不要在 SQL 中使用 `/100.0`
- 合计查询只返回数值字段，不返回非数值字段（如日期、名称）

## 金额工具类

### AmountUtil（分转元）

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 分与元金额转换
 */
public class AmountUtil {

    /**
     * 分转元（String）
     */
    public static String fen2YuanStr(Integer fen) {
        if (fen == null) {
            return "0.00";
        }
        BigDecimal amountFen = new BigDecimal(fen);
        BigDecimal amountYuan = amountFen.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        return amountYuan.toPlainString();
    }

    /**
     * 分转元（String 重载）
     */
    public static String fen2YuanStr(String fen) {
        if (fen == null || fen.isEmpty()) {
            return "0.00";
        }
        BigDecimal amountFen = new BigDecimal(fen);
        BigDecimal amountYuan = amountFen.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        return amountYuan.toPlainString();
    }

    /**
     * 分转元（BigDecimal）
     */
    public static BigDecimal fen2Yuan(Integer fen) {
        if (fen == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal amountFen = new BigDecimal(fen);
        return amountFen.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }

    /**
     * 分转元（Long）
     */
    public static BigDecimal fen2Yuan(Long fen) {
        if (fen == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal amountFen = new BigDecimal(fen);
        return amountFen.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }

    /**
     * 元转分
     */
    public static Integer yuan2Fen(String yuan) {
        if (yuan == null || yuan.isEmpty()) {
            return 0;
        }
        BigDecimal balance = new BigDecimal(yuan);
        return Integer.parseInt(balance.multiply(new BigDecimal("100"))
                                         .setScale(0, RoundingMode.HALF_UP)
                                         .toPlainString());
    }

    /**
     * 元转分（BigDecimal）
     */
    public static Integer yuan2Fen(BigDecimal yuan) {
        if (yuan == null) {
            return 0;
        }
        return yuan.multiply(new BigDecimal("100"))
                  .setScale(0, RoundingMode.HALF_UP)
                  .intValue();
    }
}
```

### 使用示例

```java
// 分转元
Integer fenAmount = 10000;  // 10000分
BigDecimal yuanAmount = AmountUtil.fen2Yuan(fenAmount);  // 100.00元

// 元转分
BigDecimal yuan = new BigDecimal("99.99");
Integer fenAmount = AmountUtil.yuan2Fen(yuan);  // 9999分
```

## 常见场景

### 场景1：订单报表 VO

```java
@Data
@Accessors(chain = true)
@ApiModel("订单报表")
public class OrderReportVO {

    @ExcelProperty(value = "月度", order = 1)
    @ApiModelProperty("月度")
    private String dateMonth;

    @ExcelProperty(value = "订单总额（元）", order = 2, converter = CustomNumberConverter.class)
    @ApiModelProperty("订单总额（元）")
    private BigDecimal totalAmount;

    @ExcelProperty(value = "订单数量", order = 3)
    @ApiModelProperty("订单数量")
    private Integer totalCount;

    @ExcelProperty(value = "平均金额（元）", order = 4, converter = CustomNumberConverter.class)
    @ApiModelProperty("平均金额（元）")
    private BigDecimal avgAmount;
}
```

### 场景2：工资汇总 VO

```java
@Data
@Accessors(chain = true)
@ApiModel("工资汇总")
public class SalarySummaryVO {

    @ExcelProperty(value = "月度", order = 1)
    @ApiModelProperty("月度")
    private String dateMonth;

    @ExcelProperty(value = "基本工资（元）", order = 2, converter = CustomNumberConverter.class)
    @ApiModelProperty("基本工资（元）")
    private BigDecimal basicSalary;

    @ExcelProperty(value = "绩效工资（元）", order = 3, converter = CustomNumberConverter.class)
    @ApiModelProperty("绩效工资（元）")
    private BigDecimal performanceSalary;

    @ExcelProperty(value = "应发工资（元）", order = 4, converter = CustomNumberConverter.class)
    @ApiModelProperty("应发工资（元）")
    private BigDecimal totalSalary;
}
```

### 场景3：合计行 SQL

```xml
<!-- 列表查询 -->
<select id="pageSalary" resultType="SalarySummaryVO">
    SELECT
        date_month,
        staff_count,
        basic_salary,
        performance_salary,
        total_salary
    FROM salary_summary
    <where>...</where>
    ORDER BY date_month DESC
</select>

<!-- 合计查询：只返回数值字段 -->
<select id="getSalaryTotal" resultType="SalarySummaryVO">
    SELECT
        SUM(staff_count) AS staff_count,
        SUM(basic_salary) AS basic_salary,
        SUM(performance_salary) AS performance_salary,
        SUM(total_salary) AS total_salary
    FROM salary_summary
    <where>...</where>
</select>
```

### 场景4：平均值计算

```xml
<!-- 平均值计算（除零处理） -->
CASE
    WHEN SUM(staff_count) = 0 THEN 0
    ELSE SUM(total_salary) / SUM(staff_count)
END AS avgSalary

<!-- 按维度平均 -->
CASE
    WHEN SUM(staff_count) = 0 THEN 0
    ELSE SUM(total_salary) / COUNT(DISTINCT tenant_id)
END AS avgSalary
```

## 数据流

```
数据库（Long/分） → MyBatis → VO（BigDecimal/元） → 前端（自动 /100）
                                               ↓
                                          Excel（converter /100）
```

## Excel 导出

### 转换器

```java
@ExcelProperty(value = "订单金额（元）", converter = CustomNumberConverter.class)
private BigDecimal orderAmount;
```

### 必要的导入

```java
import com.alibaba.excel.annotation.ExcelProperty;
import net.xnzn.core.common.export.converter.CustomNumberConverter;
```

## 常见错误

### 错误1：在 SQL 中使用 /100.0

```xml
<!-- ❌ 错误：在 SQL 中除以 100 -->
SELECT
    order_amount / 100.0 AS order_amount
FROM order_table

<!-- ✅ 正确：不进行除法，MyBatis 自动转换 -->
SELECT
    order_amount AS order_amount
FROM order_table
```

### 错误2：钱包模块 Entity 使用 BigDecimal（模式A适用）

```java
// ❌ 错误：钱包/账户模块 Entity 使用 BigDecimal（应用 Long）
@Data
public class WalletEntity {
    @ApiModelProperty("余额（元）")
    private BigDecimal balance;
}

// ✅ 正确：钱包/账户模块 Entity 使用 Long（分）
@Data
public class WalletEntity {
    @ApiModelProperty("余额（分）")
    private Long balance;
}
```

> **注意**：订单模块（OrderInfo）使用 BigDecimal 存储金额（以分为单位），这是模式B，属于正确用法，不是错误。

### 错误3：VO 不使用转换器

```java
// ❌ 错误：Excel 导出不使用转换器
@ExcelProperty(value = "订单金额（元）")
private BigDecimal orderAmount;

// ✅ 正确：使用 CustomNumberConverter
@ExcelProperty(value = "订单金额（元）", converter = CustomNumberConverter.class)
private BigDecimal orderAmount;
```

### 错误4：合计查询返回非数值字段

```xml
<!-- ❌ 错误：合计查询返回非数值字段 -->
<select id="getOrderTotal" resultType="OrderVO">
    SELECT
        SUM(order_amount) AS order_amount,
        order_date           -- ❌ 非数值字段
    FROM order_table
</select>

<!-- ✅ 正确：只返回数值字段 -->
<select id="getOrderTotal" resultType="OrderVO">
    SELECT
        SUM(order_amount) AS order_amount
    FROM order_table
</select>
```

## 参考文档

详见：[leniu-tengyun-core 源码](/Users/xujiajun/Developer/gongsi_proj/core/leniu-tengyun-core)
