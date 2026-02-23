---
name: leniu-java-entity
description: |
  leniu-tengyun-core 项目 Entity、VO、DTO、Param 等数据类规范。当创建实体类、视图对象、数据传输对象时使用此 skill。

  触发场景：
  - 创建 Entity 实体类（@TableName、@TableField 注解）
  - 创建 VO 视图对象（接口返回数据）
  - 创建 DTO/Param 数据传输对象
  - 配置时间格式化和参数校验
  - 使用 Jakarta Validation 注解

  触发词：Entity、VO、DTO、Param、实体类、@TableName、@TableField、@JsonFormat、字段映射、数据对象、@NotNull、@NotBlank、jakarta.validation
---

# leniu-tengyun-core Entity/VO/DTO 规范

## 项目特征

| 特征 | 说明 |
|------|------|
| **包名前缀** | `net.xnzn.core.*` |
| **JDK 版本** | 21 |
| **Validation** | `jakarta.validation.*` |
| **工具库** | Hutool (CollUtil, ObjectUtil, BeanUtil) |
| **日期类型** | `LocalDateTime` / `LocalDate` |
| **金额类型** | `Long`（分）/ `BigDecimal`（元） |
| **审计字段** | crby、crtime、upby、uptime |
| **逻辑删除** | 1=删除，2=正常 |

## Model 类（生产代码参考）

`OrderInfo` 是订单模块的核心 Model，体现了 leniu 项目的真实代码风格：

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
 * 1. 无基类（不继承任何 Entity 基类）
 * 2. 无 Serializable
 * 3. @TableName 不带 autoResultMap（报表 Mapper 无 BaseMapper）
 * 4. BigDecimal 存储分为单位的金额
 * 5. 包含静态工厂方法 newDefaultInstance()
 * 6. 包含领域业务方法（计算/重置等）
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

    // 审计字段（INSERT 自动填充）
    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建人")
    private String crby;

    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建时间")
    private LocalDateTime crtime;

    // 审计字段（INSERT + UPDATE 自动填充）
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新人")
    private String upby;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新时间")
    private LocalDateTime uptime;

    // ===== 静态工厂方法 =====

    /**
     * 创建默认实例（预设默认值）
     */
    public static OrderInfo newDefaultInstance() {
        OrderInfo orderInfo = new OrderInfo();
        orderInfo.setDelFlag(2);         // 2=正常
        orderInfo.setPayableAmount(BigDecimal.ZERO);
        orderInfo.setRealAmount(BigDecimal.ZERO);
        orderInfo.setDiscountsAmount(BigDecimal.ZERO);
        return orderInfo;
    }

    // ===== 领域业务方法 =====

    /**
     * 计算需付金额 = 应付 - 优惠
     */
    public BigDecimal calcNeedPayAmount() {
        return payableAmount.subtract(discountsAmount);
    }

    /**
     * 重置所有金额为零
     */
    public void resetAmountsZero() {
        this.payableAmount = BigDecimal.ZERO;
        this.realAmount = BigDecimal.ZERO;
        this.discountsAmount = BigDecimal.ZERO;
    }
}
```

**设计要点**：
- 无基类，所有字段直接定义在类中
- 无 `implements Serializable`
- `@TableName("order_info")` 不带 `autoResultMap = true`（报表 Mapper 是 XML，无需 TypeHandler）
- 静态工厂方法 `newDefaultInstance()` 预设业务默认值
- 领域业务方法直接放在 Model 类中（非 Service），体现贫血/充血混合模式

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

### 自动填充字段 Entity

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
    private Long id;

    // 插入时自动填充
    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建人")
    private String crby;

    @TableField(fill = FieldFill.INSERT)
    @ApiModelProperty(value = "创建时间")
    private LocalDateTime crtime;

    // 插入或更新时自动填充
    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新人")
    private String upby;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    @ApiModelProperty(value = "更新时间")
    private LocalDateTime uptime;

    @ApiModelProperty(value = "删除标识(1-删除,2-正常)")
    private Integer delFlag;
}
```

### 包含业务字段的 Entity

```java
import com.baomidou.mybatisplus.annotation.*;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName(value = "order_table", autoResultMap = true)
public class OrderEntity {

    @TableId
    @ApiModelProperty(value = "订单ID")
    private Long orderId;

    @ApiModelProperty(value = "用户ID")
    private Long userId;

    @ApiModelProperty(value = "订单金额（分）")
    private Long orderAmount;

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
}
```

## VO 类模板

### 基础 VO

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
@ApiModel("订单信息")
public class OrderVO {

    @ApiModelProperty("订单ID")
    private Long orderId;

    @ApiModelProperty("用户ID")
    private Long userId;

    @ApiModelProperty("订单金额（元）")
    private BigDecimal orderAmount;

    @ApiModelProperty("订单状态")
    private Integer status;

    @ApiModelProperty("创建时间")
    private LocalDateTime crtime;
}
```

### 包含参数校验的 VO

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

@Data
@Accessors(chain = true)
@ApiModel("订单信息")
public class OrderVO {

    @ApiModelProperty("订单ID")
    private Long orderId;

    @ApiModelProperty("用户ID")
    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @ApiModelProperty("订单金额（元）")
    @NotNull(message = "订单金额不能为空")
    @DecimalMin(value = "0.01", message = "订单金额必须大于0")
    private BigDecimal orderAmount;

    @ApiModelProperty("订单状态")
    private Integer status;

    @ApiModelProperty("创建时间")
    private LocalDateTime crtime;
}
```

### Excel 导出 VO

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

## DTO 类模板

### 基础 DTO

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel("订单数据传输对象")
public class OrderDTO {

    @ApiModelProperty("订单ID")
    private Long orderId;

    @ApiModelProperty("用户ID")
    private Long userId;

    @ApiModelProperty("订单状态")
    private Integer status;
}
```

## Param 类模板

### 基础 Param

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import net.xnzn.core.common.page.PageDTO;

import java.io.Serializable;

@Data
@ApiModel("查询参数")
public class OrderQueryParam implements Serializable {

    @ApiModelProperty(value = "分页参数", required = true)
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;

    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("状态")
    private Integer status;
}
```

### 完整 Param（包含时间范围）

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import net.xnzn.core.common.page.PageDTO;

import java.io.Serializable;
import java.time.LocalDate;

@Data
@ApiModel("订单查询参数")
public class OrderQueryParam implements Serializable {

    @ApiModelProperty(value = "分页参数", required = true)
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;

    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("状态")
    private Integer status;

    @ApiModelProperty("开始日期")
    private LocalDate startDate;

    @ApiModelProperty("结束日期")
    private LocalDate endDate;
}
```

### 报表 Param

```java
import com.alibaba.excel.annotation.ExcelIgnore;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
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

## 枚举类模板

### 基础枚举

```java
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum OrderStatusEnum {

    CREATED(1, "已创建"),
    PAID(2, "已支付"),
    COMPLETED(3, "已完成"),
    CANCELLED(4, "已取消");

    private final Integer key;
    private final String desc;

    public static OrderStatusEnum getByKey(Integer key) {
        if (key == null) {
            return null;
        }
        for (OrderStatusEnum status : values()) {
            if (status.getKey().equals(key)) {
                return status;
            }
        }
        return null;
    }

    public static String getDescByKey(Integer key) {
        OrderStatusEnum status = getByKey(key);
        return status != null ? status.getDesc() : "";
    }
}
```

### 含国际化的枚举

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
        if (key == null) {
            return null;
        }
        for (OrderStatusEnum status : values()) {
            if (status.getKey().equals(key)) {
                return status;
            }
        }
        return null;
    }

    public static String getDescByKey(Integer key) {
        OrderStatusEnum status = getByKey(key);
        return status != null ? status.getDesc() : "";
    }
}
```

## 常用注解

### MyBatis-Plus 注解

| 注解 | 用途 | 示例 |
|------|------|------|
| `@TableName` | 表名映射 | `@TableName("order_table")` |
| `@TableId` | 主键标识 | `@TableId private Long id;` |
| `@TableField` | 字段映射 | `@TableField("user_name")` |
| `@TableField(fill = FieldFill.INSERT)` | 插入时填充 | `@TableField(fill = FieldFill.INSERT) private String crby;` |
| `@TableField(fill = FieldFill.INSERT_UPDATE)` | 插入或更新时填充 | `@TableField(fill = FieldFill.INSERT_UPDATE) private LocalDateTime uptime;` |
| `@TableField(exist = false)` | 非数据库字段 | `@TableField(exist = false) private String tempField;` |

### Jakarta Validation 注解

**重要**：项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

```java
import jakarta.validation.constraints.*;
```

| 注解 | 用途 | 示例 |
|------|------|------|
| `@NotNull` | 不能为null | `@NotNull(message = "用户ID不能为空")` |
| `@NotBlank` | 字符串不能为空 | `@NotBlank(message = "名称不能为空")` |
| `@NotEmpty` | 集合不能为空 | `@NotEmpty(message = "列表不能为空")` |
| `@Size` | 大小范围 | `@Size(min = 1, max = 100, message = "长度1-100")` |
| `@Min` | 最小值 | `@Min(value = 0, message = "金额不能为负数")` |
| `@Max` | 最大值 | `@Max(value = 1000, message = "数量不能超过1000")` |
| `@DecimalMin` | 小数最小值 | `@DecimalMin(value = "0.01", message = "金额必须大于0.01")` |
| `@DecimalMax` | 小数最大值 | `@DecimalMax(value = "999999.99", message = "金额不能超过999999.99")` |
| `@Email` | 邮箱格式 | `@Email(message = "邮箱格式不正确")` |
| `@Pattern` | 正则匹配 | `@Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")` |

### Swagger 注解

| 注解 | 用途 | 示例 |
|------|------|------|
| `@ApiModel` | 类描述 | `@ApiModel("订单信息")` |
| `@ApiModelProperty` | 字段描述 | `@ApiModelProperty("订单ID")` |
| `@ApiModelProperty(value = "...", required = true)` | 必填字段 | `@ApiModelProperty(value = "用户ID", required = true)` |

### Lombok 注解

| 注解 | 用途 | 示例 |
|------|------|------|
| `@Data` | getter/setter | `@Data public class Xxx {}` |
| `@Slf4j` | 日志 | `@Slf4j public class Xxx {}` |
| `@Builder` | 建造者模式 | `@Builder public class Xxx {}` |
| `@AllArgsConstructor` | 全参构造 | `@AllArgsConstructor public class Xxx {}` |
| `@NoArgsConstructor` | 无参构造 | `@NoArgsConstructor public class Xxx {}` |
| `@Accessors(chain = true)` | 链式调用 | `@Accessors(chain = true) public class Xxx {}` |
| `@Getter` | getter方法 | `@Getter public enum XxxEnum {}` |

### EasyExcel 注解

```java
import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.write.style.ColumnWidth;
import com.alibaba.excel.annotation.write.style.ContentRowHeight;
import com.alibaba.excel.annotation.ExcelIgnore;
```

| 注解 | 用途 | 示例 |
|------|------|------|
| `@ExcelProperty` | Excel列名 | `@ExcelProperty(value = "订单ID", order = 1)` |
| `@ColumnWidth` | 列宽 | `@ColumnWidth(15)` |
| `@ContentRowHeight` | 行高 | `@ContentRowHeight(20)` |
| `@ExcelIgnore` | 忽略导出 | `@ExcelIgnore private String tempField;` |

### JSON 格式化注解

```java
import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.format.annotation.DateTimeFormat;
```

```java
@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
private LocalDateTime createTime;

@DateTimeFormat(pattern = "yyyy-MM-dd")
@JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
private LocalDate date;
```

## 常用工具类

### Hutool 工具类

```java
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.bean.BeanUtil;

// 集合判空
if (CollUtil.isEmpty(list)) { }
if (CollUtil.isNotEmpty(list)) { }

// 对象判空
if (ObjectUtil.isNull(obj)) { }
if (ObjectUtil.isNotNull(obj)) { }

// 字符串判空
if (StrUtil.isBlank(str)) { }
if (StrUtil.isNotBlank(str)) { }

// 对象拷贝
Target target = BeanUtil.copyProperties(source, Target.class);
List<Target> targets = BeanUtil.copyToList(sources, Target.class);
```

## 常见错误

### 错误1：使用 RuoYi 的 TenantEntity

```java
// ❌ 错误：使用 RuoYi 的基类
import org.dromara.common.mybatis.core.domain.TenantEntity;

// ✅ 正确：leniu 项目使用自定义 Entity
@Data
@TableName("table_name")
public class XxxEntity {
    @TableId
    private Long id;
}
```

### 错误2：使用 javax.validation

```java
// ❌ 错误：使用 javax.validation（JDK 21 应该用 jakarta）
import javax.validation.constraints.NotNull;

// ✅ 正确：使用 jakarta.validation
import jakarta.validation.constraints.NotNull;
```

### 错误3：使用 MapstructUtils

```java
// ❌ 错误：使用 RuoYi 的工具类
import org.dromara.common.core.utils.MapstructUtils;
Target target = MapstructUtils.convert(source, Target.class);

// ✅ 正确：leniu 使用 Hutool
import cn.hutool.core.bean.BeanUtil;
Target target = BeanUtil.copyProperties(source, Target.class);
```

### 错误4：delFlag 判断错误

```java
// ❌ 错误：使用 RuoYi 的值
wrapper.eq(XxxEntity::getDelFlag, 0);

// ✅ 正确：leniu 使用 2 表示正常
wrapper.eq(XxxEntity::getDelFlag, 2);
```

## 参考文档

详见：[leniu-tengyun-core 源码](/Users/xujiajun/Developer/gongsi_proj/core/leniu-tengyun-core)
