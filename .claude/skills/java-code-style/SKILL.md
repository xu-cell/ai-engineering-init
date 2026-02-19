---
name: java-code-style
description: |
  Java代码风格和命名规范。当编写或生成Java代码时使用此skill，适用于所有Java类的命名和风格规范。
  
    触发场景：
    - 编写Java类时的命名规范（类名、方法名、变量名）
    - 代码风格检查（注解使用、依赖注入方式）
    - 包结构规范设计
    - Controller/Service/Entity/VO/DTO等各类型Java类规范
  
    触发词：代码风格、命名规范、类命名、方法命名、包结构、注解使用、依赖注入、驼峰命名、代码规范
---

# Java代码风格规范

## 快速参考

### 包结构
```
net.xnzn.core
├── [module]/
│   ├── controller/     # 控制器层
│   ├── service/        # 服务层
│   ├── mapper/         # 数据访问层
│   ├── model/entity/   # 实体类
│   ├── vo/             # 视图对象(返回前端)
│   ├── dto/            # 数据传输对象(服务间/MQ)
│   ├── param/          # 请求参数对象
│   ├── constants/      # 常量
│   ├── enums/          # 枚举
│   ├── api/            # 对外API接口
│   ├── config/         # 配置类
│   ├── mq/             # 消息队列监听器
│   ├── task/           # 定时任务
│   ├── handle/         # 业务处理器(策略模式)
│   └── util/           # 工具类
```

### 类命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| Controller | `XxxController` | `MonitorSafetyController` |
| Service | `XxxService` | `MonitorSafetyBackService` |
| Mapper | `XxxMapper` | `MonitorSafetyBackMapper` |
| Entity | `Xxx` 或 `XxxEntity` | `MonitorSafetyBack` |
| VO | `XxxVO` | `DiningSummaryVO` |
| DTO | `XxxDTO` | `WarningEventDTO` |
| Param | `XxxParam` / `XxxPageParam` | `MonitorPageParam` |
| Enum | `XxxEnum` | `WarningTypeEnum` |
| Converter | `XxxConverter` | `WarningReportConverter` |
| Handler | `XxxHandler/XxxProcessor` | `CallbackBusinessHandler` |
| Api | `XxxApi` | `ExportApi` |

### 方法命名规范

| 操作 | 命名 | 示例 |
|------|------|------|
| 查询单个 | `getXxx` / `queryXxx` | `getById()` |
| 查询列表 | `listXxx` | `listBackMetrics()` |
| 分页查询 | `pageXxx` | `pageWarning()` |
| 新增 | `save` / `add` / `create` | `saveOrUpdate()` |
| 更新 | `update` / `modify` | `updateStatus()` |
| 删除 | `delete` / `remove` | `deleteClientUser()` |
| 统计 | `count` / `summary` | `countMealSupervisionRecord()` |
| 导出 | `export` | `exportDining()` |
| 同步 | `sync` | `sync()` |

## Controller层模板

```java
@RequiresAuthentication
@RestController
@RequestMapping("/api/module/feature")
@Api(value = "模块/功能", tags = "模块/功能")
public class XxxController {

    @Autowired
    private XxxService xxxService;

    @ApiOperation(value = "功能描述")
    @PostMapping("/action")
    public ReturnType methodName(@RequestBody LeRequest<ParamType> request) {
        ParamType param = request.getContent();
        return xxxService.doSomething(param);
    }
}
```

**要点**:
- 统一使用`@PostMapping`
- 需要`@RequiresAuthentication`认证
- 使用`LeRequest<T>`封装请求参数
- 通过`request.getContent()`获取参数

## Service层模板

```java
@Slf4j
@Service
public class XxxService {

    @Autowired
    private XxxMapper xxxMapper;

    @Resource
    @Lazy
    private OtherService otherService;

    @Transactional(rollbackFor = Exception.class)
    public void businessMethod() {
        // 业务逻辑
    }
}
```

**要点**:
- 使用`@Slf4j`日志注解
- 循环依赖使用`@Lazy`
- 事务使用`@Transactional(rollbackFor = Exception.class)`

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

**要点**:
- 使用`@TableName`指定表名
- 主键使用`@TableId`
- 字段使用`@TableField`映射
- 审计字段crtime/uptime使用自动填充

## VO/DTO类模板

```java
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.experimental.Accessors;

@Data
@ApiModel("描述")
@Accessors(chain = true)
public class XxxVO {

    @ApiModelProperty("字段描述")
    private String fieldName;

    @ApiModelProperty(value = "必填字段", required = true)
    @NotBlank(message = "xxx不能为空")
    private String requiredField;
}
```

**要点**:
- 使用`@ApiModel`类注解
- 使用`@ApiModelProperty`字段注解
- 参数校验使用 Jakarta Validation 注解 (`jakarta.validation.constraints.*`)

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

    public static boolean isExistKey(String code) {
        return getByCode(code) != null;
    }
}
```

**要点**:
- 使用`@Getter`和`@AllArgsConstructor`
- 提供`getByCode`静态方法
- 提供`isExistKey`校验方法

## 依赖注入规范

```java
// 推荐: 字段注入
@Autowired
private XxxService xxxService;

// 解决循环依赖
@Resource
@Lazy
private OtherService otherService;
```

## 类注释规范

推荐使用JavaDoc标准格式:

```java
/**
 * 类功能描述
 *
 * @author xujiajun
 * @date YYYY-MM-DD
 */
```

**说明**:
- `@author` 使用实际作者名称（如 `xujiajun`）
- `@date` 使用代码创建日期（格式：`YYYY-MM-DD`）

## 常用注解

### Jakarta Validation
**重要**: 项目使用 JDK 21，必须使用 `jakarta.validation.constraints.*` 包

```java
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
```

- `@NotNull` - 不能为null
- `@NotBlank` - 字符串不能为空
- `@NotEmpty` - 集合不能为空
- `@Valid` - 触发参数校验

### Lombok
- `@Data` - 生成getter/setter
- `@Slf4j` - 日志
- `@Builder` - 建造者模式
- `@AllArgsConstructor` - 全参构造
- `@Accessors(chain = true)` - 链式调用

## 详细规范

详见: [naming-conventions.md](references/naming-conventions.md)
