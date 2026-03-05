---
name: leniu-java-entity
description: |
  leniu-tengyun-core 项目 Entity/VO/DTO/Param/Enum 数据类规范。

  触发场景：
  - 创建 Entity 实体类（@TableName、审计字段 crby/crtime/upby/uptime）
  - 创建 VO/DTO/Param 数据传输对象
  - 使用 Jakarta Validation 参数校验
  - 创建枚举类（含国际化 I18n）
  - Excel 导出 VO（EasyExcel）

  触发词：Entity实体类、VO视图对象、DTO数据传输、Param参数类、@TableName、@TableField、审计字段、枚举类、Excel导出、Jakarta校验
---

# leniu Entity/VO/DTO 规范

## 项目特征速查

| 项 | 值 |
|---|---|
| 包名 | `net.xnzn.core.*` |
| JDK | 21 → `jakarta.validation.*`（禁用 javax） |
| 工具库 | Hutool（BeanUtil / CollUtil / ObjectUtil / StrUtil） |
| 金额 | `Long`（分）或 `BigDecimal`（分），前端用 `money()` 转元 |
| 审计字段 | crby / crtime / upby / uptime |
| 逻辑删除 | **1=删除，2=正常**（与 RuoYi 相反） |
| Entity 特点 | 无基类、无 Serializable |

## Entity 模板（核心）

```java
@Data
@Accessors(chain = true)
@TableName(value = "table_name", autoResultMap = true)
public class XxxEntity {

    @TableId
    @ApiModelProperty("主键ID")
    private Long id;

    // --- 业务字段 ---
    @ApiModelProperty("名称")
    private String name;

    // --- 审计字段 ---
    @ApiModelProperty("删除标识(1-删除,2-正常)")
    private Integer delFlag;

    @TableField(fill = FieldFill.INSERT)
    private String crby;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private String upby;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime uptime;

    // --- 静态工厂（预设默认值） ---
    public static XxxEntity newDefaultInstance() {
        XxxEntity e = new XxxEntity();
        e.setDelFlag(2); // 2=正常
        return e;
    }

    // --- 领域业务方法（可选） ---
}
```

**要点**：
- 无基类，审计字段直接定义
- `@TableName` 一般带 `autoResultMap = true`；报表 Model 不带（无 BaseMapper）
- 可含 `newDefaultInstance()` 工厂方法和领域业务方法

## VO 模板

```java
@Data
@Accessors(chain = true)
@ApiModel("订单信息")
public class OrderVO {

    @ApiModelProperty("订单ID")
    private Long orderId;

    @ApiModelProperty("订单金额（元）")
    private BigDecimal orderAmount;

    @ApiModelProperty("创建时间")
    private LocalDateTime crtime;
}
```

带校验的 VO：

```java
@Data
@Accessors(chain = true)
@ApiModel("订单信息")
public class OrderVO {

    @NotNull(message = "用户ID不能为空")
    @ApiModelProperty("用户ID")
    private Long userId;

    @NotNull(message = "订单金额不能为空")
    @DecimalMin(value = "0.01", message = "订单金额必须大于0")
    @ApiModelProperty("订单金额（元）")
    private BigDecimal orderAmount;
}
```

## Param 模板（分页查询）

```java
@Data
@ApiModel("订单查询参数")
public class OrderQueryParam implements Serializable {

    @NotNull(message = "分页参数不能为空")
    @ApiModelProperty(value = "分页参数", required = true)
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

## DTO 模板

```java
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

## 枚举模板

```java
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

含国际化时，`desc` 用占位符 `"{order.status.created}"`，重写 `getDesc()` 调用 `I18n.getMessage(desc)`。

## 时间格式化

```java
@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
private LocalDateTime createTime;

@DateTimeFormat(pattern = "yyyy-MM-dd")
@JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")
private LocalDate date;
```

## 对象转换

```java
// 单对象
Target t = BeanUtil.copyProperties(source, Target.class);
// 列表
List<Target> list = BeanUtil.copyToList(sources, Target.class);
```

## 禁止项

```java
// ❌ 继承 RuoYi TenantEntity / BaseEntity
import org.dromara.common.mybatis.core.domain.TenantEntity;

// ❌ javax.validation（JDK 21 必须用 jakarta）
import javax.validation.constraints.NotNull;

// ❌ MapstructUtils（用 BeanUtil.copyProperties）
MapstructUtils.convert(source, Target.class);

// ❌ delFlag: 0=正常（leniu 是 2=正常）
wrapper.eq(XxxEntity::getDelFlag, 0);

// ❌ 错误审计字段名
private String createBy;      // 必须 crby
private LocalDateTime createTime; // 必须 crtime

// ❌ Entity 加 tenant_id（双库物理隔离，不需要）
```

## 参考文档

- 完整模板示例（Excel导出VO、报表Param等）：详见 `references/templates.md`
- 生产代码参考：`sys-canteen/.../order/common/model/OrderInfo.java`
