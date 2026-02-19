---
name: java-entity
description: |
  Java实体类和数据对象规范。当创建Entity、VO、DTO、Param等数据类时使用此skill。
  
    触发场景：
    - 创建Entity实体类（@TableName、@TableField注解）
    - 创建VO视图对象（接口返回数据）
    - 创建DTO/Param数据传输对象
    - 配置时间格式化和参数校验
  
    触发词：Entity、VO、DTO、Param、实体类、@TableName、@TableField、@JsonFormat、字段映射、数据对象、@NotNull、@NotBlank
---

# Java 实体类规范

## Entity实体类模板

```java
@Data
@TableName(value = "table_name", autoResultMap = true)
public class XxxEntity {

    @TableId
    private Long id;

    @TableField("column_name")
    private String fieldName;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime crtime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @TableField(fill = FieldFill.UPDATE)
    private LocalDateTime uptime;
}
```

## VO类模板

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.experimental.Accessors;

@Data
@ApiModel("描述")
@Accessors(chain = true)
public class XxxVO {

    @ApiModelProperty("字段描述")
    private String fieldName;

    @ApiModelProperty(value = "必填字段", required = true)
    @NotBlank(message = "必填字段不能为空")
    private String requiredField;
}
```

## DTO类模板

```java
@Data
public class XxxDTO {

    private String fieldName;
    private Integer status;
}
```

## Param类模板

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import net.xnzn.core.common.page.PageDTO;

import java.io.Serializable;

@Data
@ApiModel("查询参数")
public class XxxPageParam implements Serializable {

    @ApiModelProperty(value = "分页参数", required = true)
    @NotNull(message = "分页参数不能为空")
    private PageDTO page;

    @ApiModelProperty("关键字")
    private String keyword;

    @ApiModelProperty("状态")
    private Integer status;
}
```

## 枚举类模板

```java
@Getter
@AllArgsConstructor
public enum XxxEnum {

    TYPE_ONE("CODE", "描述"),
    TYPE_TWO("CODE2", "描述2");

    private final String code;
    private final String desc;

    public static XxxEnum getByCode(String code) {
        return Arrays.stream(values())
                .filter(e -> e.getCode().equals(code))
                .findFirst()
                .orElse(null);
    }
}
```

## Entity必须包含的字段

```java
// 主键
@TableId
private Long id;

// 审计字段
@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
@TableField(fill = FieldFill.INSERT)
private LocalDateTime crtime;

@DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
@TableField(fill = FieldFill.UPDATE)
private LocalDateTime uptime;
```

## 常用注解

### MyBatis Plus
- `@TableName`: 表名映射
- `@TableId`: 主键
- `@TableField`: 字段映射
- `@TableField(fill = FieldFill.INSERT)`: 插入时自动填充
- `@TableField(fill = FieldFill.UPDATE)`: 更新时自动填充

### 参数校验 (Jakarta Validation)
**重要**: 项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

```java
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
```

- `@NotNull`: 不能为null
- `@NotBlank`: 字符串不能为空
- `@NotEmpty`: 集合不能为空

### Swagger
- `@ApiModel`: 类描述
- `@ApiModelProperty`: 字段描述

### Lombok
- `@Data`: getter/setter
- `@Accessors(chain = true)`: 链式调用
- `@Getter`: getter方法
- `@AllArgsConstructor`: 全参构造
