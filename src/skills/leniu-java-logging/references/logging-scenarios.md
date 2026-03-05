# 日志场景详细示例

## Controller 层日志

```java
@Slf4j
@RequiresAuthentication
@RestController
@RequestMapping("/api/order")
@Api(value = "订单管理", tags = "订单管理")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @ApiOperation(value = "创建订单")
    @PostMapping("/create")
    public Long create(@Valid @RequestBody LeRequest<OrderParam> request) {
        OrderParam param = request.getContent();
        log.info("【订单】创建订单请求, userId:{}, productId:{}",
                 param.getUserId(), param.getProductId());

        Long orderId = orderService.create(param);

        log.info("【订单】订单创建成功, orderId:{}", orderId);
        return orderId;
    }
}
```

## 分页查询日志

```java
@Slf4j
@Service
public class OrderService {

    public Page<OrderVO> pageList(OrderQueryParam param) {
        log.info("【订单】分页查询订单, pageNum:{}, pageSize:{}, keyword:{}",
                 param.getPage().getPageNum(),
                 param.getPage().getPageSize(),
                 param.getKeyword());

        PageMethod.startPage(param.getPage().getPageNum(), param.getPage().getPageSize());
        List<OrderEntity> records = orderMapper.selectList(buildWrapper(param));
        Page<OrderVO> result = new Page<>(BeanUtil.copyToList(records, OrderVO.class));

        log.info("【订单】分页查询完成, total:{}", result.getTotal());
        return result;
    }
}
```

## 条件日志输出

```java
// 对于 debug/trace 级别，使用条件输出
if (log.isDebugEnabled()) {
    log.debug("详细数据: {}", expensiveOperation());
}

// 或使用 Lambda 形式（推荐）
log.debug("详细数据: {}", () -> expensiveOperation());
```

## Profile 环境配置示例

```yaml
spring:
  profiles:
    active: dev

---
# 开发环境
spring:
  profiles: dev
logging:
  level:
    net.xnzn.core: DEBUG

---
# 生产环境
spring:
  profiles: prod
logging:
  level:
    net.xnzn.core: INFO
  profiles:
    include: no_log_console
```

## Logback 配置示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
    <include resource="org/springframework/boot/logging/logback/file-appender.xml"/>

    <springProfile name="!no_log_console">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="!no_log_file">
        <root level="INFO">
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```
