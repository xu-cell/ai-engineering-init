# Entity/VO/DTO 完整模板参考

## 生产代码参考：OrderInfo Model

```java
import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 关键特征：
 * 1. 无基类、无 Serializable
 * 2. @TableName 不带 autoResultMap（报表 Mapper 无 BaseMapper）
 * 3. 包含静态工厂方法 newDefaultInstance()
 * 4. 包含领域业务方法（计算/重置等）
 */
@Data
@Accessors(chain = true)
@ApiModel(value = "订单信息")
@TableName("order_info")
public class OrderInfo {

    @TableId
    @ApiModelProperty(value = "订单ID")
    private Long id;

    @ApiModelProperty(value = "食堂ID")
    private Long canteenId;

    @ApiModelProperty(value = "用户ID")
    private Long userId;

    @ApiModelProperty(value = "应付金额（分）")
    private BigDecimal payableAmount;

    @ApiModelProperty(value = "实付金额（分）")
    private BigDecimal realAmount;

    @ApiModelProperty(value = "优惠金额（分）")
    private BigDecimal discountsAmount;

    @ApiModelProperty(value = "订单状态")
    private Integer status;

    @ApiModelProperty(value = "删除标识(1-删除,2-正常)")
    private Integer delFlag;

    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建人")
    private String crby;

    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建时间")
    private LocalDateTime crtime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新人")
    private String upby;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新时间")
    private LocalDateTime uptime;

    public static OrderInfo newDefaultInstance() {
        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setDelFlag(2);
        orderInfo.setPayableAmount(BigDecimal.ZERO);
        orderInfo.setRealAmount(BigDecimal.ZERO);
        orderInfo.setDiscountsAmount(BigDecimal.ZERO);
        return orderInfo;
    }

    public BigDecimal calcNeedPayAmount() {
        return payableAmount.subtract(discountsAmount);
    }

    public void resetAmountsZero() {
        this.payableAmount = BigDecimal.ZERO;
        this.realAmount = BigDecimal.ZERO;
        this.discountsAmount = BigDecimal.ZERO;
    }
}
```

## Excel 导出 VO

```java
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.write.style.ColumnWidth;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;
import net.xnzn.core.common.export.converter.CustomNumberConverter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Accessors(chain = true)
@ApiModel("订单信息")
public class OrderExportVO {

    @ExcelProperty(value = "订单ID", order = 1)
    @ColumnWidth(15)
    @ApiModelProperty("订单ID")
    private Long orderId;

    @ExcelProperty(value = "用户ID", order = 2)
    @ColumnWidth(15)
    @ApiModelProperty("用户ID")
    private Long userId;

    @ExcelProperty(value = "订单金额（元）", order = 3, converter = CustomNumberConverter.class)
    @ColumnWidth(15)
    @ApiModelProperty("订单金额（元）")
    private BigDecimal orderAmount;

    @ExcelProperty(value = "创建时间", order = 4)
    @ColumnWidth(20)
    @ApiModelProperty("创建时间")
    private LocalDateTime crtime;
}
```

## 报表 Param

```java
import com.alibaba.excel.annotation.ExcelIgnore;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

@Data
@ApiModel("订单报表查询参数")
public class OrderReportParam implements Serializable {

    @ExcelIgnore
    @ApiModelProperty(value = "分页参数", required = true)
    private PageDTO page;

    @ExcelIgnore
    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("开始日期")
    private LocalDate startDate;

    @ApiModelProperty("结束日期")
    private LocalDate endDate;

    @ApiModelProperty("食堂ID列表")
    private List<Long> canteenIds;

    @ApiModelProperty("状态")
    private Integer status;
}
```

## 含国际化的枚举

```java
import lombok.AllArgsConstructor;
import lombok.Getter;
import net.xnzn.core.common.i18n.I18n;

@Getter
@AllArgsConstructor
public enum OrderStatusEnum {

    CREATED(1, "{order.status.created}"),
    PAID(2, "{order.status.paid}"),
    COMPLETED(3, "{order.status.completed}"),
    CANCELLED(4, "{order.status.cancelled}");

    private final Integer key;
    private final String desc;

    public String getDesc() {
        return I18n.getMessage(desc);
    }

    public static OrderStatusEnum getByKey(Integer key) {
        if (key == null) return null;
        for (OrderStatusEnum e : values()) {
            if (e.getKey().equals(key)) return e;
        }
        return null;
    }

    public static String getDescByKey(Integer key) {
        OrderStatusEnum e = getByKey(key);
        return e != null ? e.getDesc() : "";
    }
}
```

## 常用注解速查

### MyBatis-Plus

| 注解 | 示例 |
|------|------|
| `@TableName` | `@TableName("order_table")` 或 `@TableName(value = "x", autoResultMap = true)` |
| `@TableId` | `@TableId private Long id;` |
| `@TableField(fill = FieldFill.INSERT)` | 插入时填充（crby, crtime） |
| `@TableField(fill = FieldFill.INSERT_UPDATE)` | 插入+更新填充（upby, uptime） |
| `@TableField(exist = false)` | 非数据库字段 |

### Jakarta Validation

| 注解 | 示例 |
|------|------|
| `@NotNull` | `@NotNull(message = "不能为空")` |
| `@NotBlank` | `@NotBlank(message = "名称不能为空")` |
| `@NotEmpty` | `@NotEmpty(message = "列表不能为空")` |
| `@Size` | `@Size(min = 1, max = 100)` |
| `@DecimalMin` | `@DecimalMin(value = "0.01")` |
| `@Pattern` | `@Pattern(regexp = "^1[3-9]\\d{9}$")` |

### EasyExcel

| 注解 | 示例 |
|------|------|
| `@ExcelProperty(value = "列名", order = 1)` | 列名和顺序 |
| `@ColumnWidth(15)` | 列宽 |
| `@ExcelIgnore` | 忽略导出 |
| `converter = CustomNumberConverter.class` | 金额转换器 |
