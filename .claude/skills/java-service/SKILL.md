---
name: java-service
description: |
  Java Service层业务实现规范。当编写Service层代码时使用此skill，包括事务管理、分页查询和业务逻辑规范。

  触发场景：
  - 编写Service层业务逻辑（@Service、@Transactional）
  - 实现事务管理（多表操作、事务回滚）
  - 多租户处理（TenantEntity、tenantId过滤）
  - 分页查询实现（Page、PageQuery）

  触发词：Service层、@Service、@Transactional、事务管理、业务逻辑、分页查询、ServiceImpl、IService、业务实现、服务层
---

# Java Service层规范

## Service类模板

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

## 核心规范

### 1. 事务管理

**多表操作必须加事务**:
```java
@Transactional(rollbackFor = Exception.class)
public void updateOrder(OrderDTO dto) {
    orderMapper.updateById(order);
    orderDetailMapper.update(details);
}
```

**查询方法不需要事务**,避免不必要的事务开销。

**注意事务边界**:跨模块调用前需确认对方模块事务边界,避免重复包裹或遗漏。

### 2. 分页查询规范

分页查询使用 **PageHelper** 插件,核心组件:
- **PageDTO**: 分页请求参数(pageNum, pageSize)
- **PageVO**: 分页响应结果(records, total, pageNum, pageSize)

**基础分页查询**:
```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    // 1. 开启分页(必须在查询前调用)
    PageMethod.startPage(param);

    // 2. 执行查询
    List<XxxEntity> records = mapper.pageList(param);

    // 3. 实体转VO
    List<XxxVO> voList = records.stream()
            .map(entity -> {
                XxxVO vo = new XxxVO();
                BeanUtil.copyProperties(entity, vo);
                return vo;
            })
            .collect(Collectors.toList());

    // 4. 封装分页结果(自动提取total等信息)
    return PageVO.of(voList);
}
```

**带权限过滤的分页查询**:
```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    // 1. 获取用户权限信息
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dataPermission =
        reportDataPermissionService.getDataPermission(authPO);

    // 2. 开启分页
    PageMethod.startPage(param);

    // 3. 调用Mapper查询(权限过滤在Mapper XML中处理)
    List<XxxEntity> records = mapper.pageList(param, authPO, dataPermission);

    // 4. 转换为VO
    List<XxxVO> voList = BeanUtil.copyToList(records, XxxVO.class);

    // 5. 封装分页结果
    return PageVO.of(voList);
}
```

**带合计行的分页(报表场景)**:
```java
public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    return Executors.readInSystem(() -> {
        ReportBaseTotalVO<XxxVO> result = new ReportBaseTotalVO<>();

        // 1. 导出时不查询合计行
        if (CollUtil.isEmpty(param.getExportCols())) {
            XxxVO totalLine = mapper.getSummaryTotal(param);
            result.setTotalLine(totalLine);
        }

        // 2. 开启分页
        PageMethod.startPage(param);

        // 3. 查询数据
        List<XxxVO> list = mapper.getSummaryList(param);

        // 4. 封装分页结果
        result.setResultPage(PageVO.of(list));
        return result;
    });
}
```

**分页关键点**:
1. `PageMethod.startPage()` 必须在查询前调用
2. 中间不能插入其他查询,否则分页失效
3. `PageVO.of()` 自动从 Page 对象提取分页信息
4. Mapper 方法返回 List 即可,PageHelper 自动转换

### 3. 权限过滤规范

**获取用户权限信息**:
```java
// 获取用户认证信息
MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();

// 获取数据权限
ReportDataPermissionParam dataPermission =
    reportDataPermissionService.getDataPermission(authPO);
```

**在Mapper XML中应用权限过滤**:
```xml
<select id="pageList" resultType="XxxVO">
    SELECT * FROM xxx_table
    WHERE del_flag = 0
    <!-- 权限过滤:食堂范围 -->
    <if test="dataPermission.canteenIds != null and dataPermission.canteenIds.size() > 0">
        AND canteen_id IN
        <foreach collection="dataPermission.canteenIds" item="canteenId"
                 open="(" separator="," close=")">
            #{canteenId}
        </foreach>
    </if>
    <!-- 权限过滤:租户范围 -->
    <if test="dataPermission.tenantIds != null and dataPermission.tenantIds.size() > 0">
        AND tenant_id IN
        <foreach collection="dataPermission.tenantIds" item="tenantId"
                 open="(" separator="," close=")">
            #{tenantId}
        </foreach>
    </if>
</select>
```

**越权访问防护**:
```java
@Transactional(rollbackFor = Exception.class)
public void delete(Long id) {
    XxxEntity entity = mapper.selectById(id);
    Assert.notNull(entity, () -> new LeException("数据不存在"));

    // 校验数据归属(系统已通过拦截器统一控制权限时可省略)
    Long currentTenantId = TenantContextHolder.getTenantId();
    Assert.isTrue(entity.getTenantId().equals(currentTenantId),
        () -> new LeException("无权操作该数据"));

    mapper.deleteById(id);
}
```

### 4. 多租户处理

```java
// 跨租户读取数据(监管平台查询汇总数据)
return Executors.readInSystem(() -> mapper.selectList(...));

// 跨租户写入数据
Executors.doInSystem(() -> mapper.insert(...));

// 指定租户执行
Executors.readInTenant(tenantId, () -> service.getData());

// 获取当前租户ID
Long tenantId = TenantContextHolder.getTenantId();
```

### 5. 异常处理

```java
// 业务异常
throw new LeException("错误信息");

// 带检查的业务异常
throw new LeCheckedException("错误信息");

// 断言式异常(推荐)
Assert.notNull(obj, () -> new LeException("对象不能为空"));
Assert.isTrue(condition, () -> new LeException("条件不满足"));

// 条件判断抛异常
if (CollUtil.isEmpty(list)) {
    throw new LeException("列表不能为空");
}
```

### 6. 日志规范

```java
@Slf4j
public class XxxService {

    public void doSomething() {
        // 信息日志 - 关键业务节点
        log.info("【模块名】开始处理xxx,参数:{}", param);

        // 警告日志 - 非预期但可处理的情况
        log.warn("处理失败,未找到记录: id={}", id);

        // 错误日志 - 异常情况
        log.error("以下{}个货品在系统中不存在: {}", missingNames.size(), missingNames);

        // 调试日志 - 开发调试用
        log.debug("详细数据: {}", JacksonUtil.writeValueAsString(data));
    }
}
```

### 7. 集合操作

```java
// 判空(使用 Hutool CollUtil)
if (CollUtil.isEmpty(list)) {
    return Collections.emptyList();
}

// Stream 转换
List<Long> ids = list.stream()
        .map(XxxVO::getId)
        .distinct()
        .toList();  // Java 21+ 使用 toList()

// Stream 转 Map
Map<Long, XxxVO> map = list.stream()
        .collect(Collectors.toMap(XxxVO::getId, Function.identity()));

// Stream 分组
Map<Long, List<XxxVO>> grouped = list.stream()
        .collect(Collectors.groupingBy(XxxVO::getTenantId));

// Stream 过滤
List<XxxVO> filtered = list.stream()
        .filter(e -> e.getStatus() == 1)
        .toList();
```

### 8. 对象操作

```java
// 判空(使用 Hutool ObjectUtil)
if (ObjectUtil.isNull(obj)) {
    return null;
}

// 相等判断
if (ObjectUtil.equal(a, b)) {
    // ...
}

// 对象拷贝(使用 Hutool BeanUtil)
TargetVO target = BeanUtil.copyProperties(source, TargetVO.class);

// 列表拷贝
List<TargetVO> targets = BeanUtil.copyToList(sources, TargetVO.class);

// Optional 使用
Long tenantId = Optional.ofNullable(content.getTenantId())
        .orElse(TenantContextHolder.getTenantId());

// 空值默认值
BigDecimal num = Optional.ofNullable(item.getNum())
        .orElse(BigDecimal.ZERO);
```

### 9. 并发处理

```java
// 并行查询(使用 CompletableFuture)
CompletableFuture<List<TypeA>> futureA = CompletableFuture
        .supplyAsync(() -> mapperA.selectList(param));

CompletableFuture<List<TypeB>> futureB = CompletableFuture
        .supplyAsync(() -> mapperB.selectList(param));

// 等待所有完成
CompletableFuture.allOf(futureA, futureB).join();

// 获取结果
List<TypeA> resultA = futureA.join();
List<TypeB> resultB = futureB.join();

// 异步执行(不等待结果)
CompletableFuture.runAsync(() -> {
    // 异步操作
}, asyncTaskExecutor);
```

## 常用业务模式

### 导出模式

```java
@ApiOperation(value = "xxx导出")
@PostMapping("/export")
public void export(@RequestBody LeRequest<MonitorPageParam> param) {
    MonitorPageParam content = param.getContent();
    XxxVO totalLine = service.getSummaryTotal(content);
    exportApi.startExcelExportTaskByPage(
        I18n.getMessage("school.report-name"),    // 文件名
        I18n.getMessage("report.title.details"),  // 工作表名
        XxxVO.class,                              // 数据类型
        content.getExportCols(),                  // 导出列
        content.getPage(),                        // 分页参数
        totalLine,                                // 合计行
        () -> service.getSummary(content).getResultPage()  // 数据提供者
    );
}
```

### 消息队列模式

```java
// 发送消息
MqUtil.send(dto, LeMqConstant.Topic.TOPIC_NAME);

// 延迟消息
MqUtil.sendDelay(dto, LeMqConstant.Topic.TOPIC_NAME, delayDuration);

// 消费消息(监听器在 mq 包下)
@MqConsumer(topic = LeMqConstant.Topic.TOPIC_NAME)
public void handleMessage(MessageDTO dto) {
    // ...
}
```

### 定时任务模式

```java
@XxlJob(value = "jobHandlerName")
public void executeJob() {
    log.info("[模块名] 定时任务开始执行");
    // 业务逻辑
    log.info("[模块名] 定时任务执行完成");
}
```

## 代码质量要点

### 空指针防护

```java
// ❌ 错误:selectOne 返回值未判空
XxxEntity entity = mapper.selectOne(query);
entity.getName();  // 可能 NPE

// ✅ 正确:判空处理
XxxEntity entity = mapper.selectOne(query);
if (ObjectUtil.isNull(entity)) {
    throw new LeException("数据不存在");
}
// 或使用 Optional
Optional.ofNullable(mapper.selectOne(query))
    .orElseThrow(() -> new LeException("数据不存在"));
```

**免检白名单**(以下API已在拦截器层统一处理,保证非空或返回空集合):
- `allocCanteenApi.*` - 食堂信息查询
- `allocAreaApi.*` - 区域相关API
- `mgrAuthApi.*` - 权限相关API
- `TokenManager.getSubjectId().get()` / `SecurityUtils.getUser()` - 需上层有 `@RequiresAuthentication`

### 返回值兜底

```java
// ❌ 错误:返回 null
public List<XxxVO> listByParam(XxxParam param) {
    List<XxxVO> list = mapper.selectList(param);
    return list;  // 可能返回 null
}

// ✅ 正确:空集合兜底
public List<XxxVO> listByParam(XxxParam param) {
    List<XxxVO> list = mapper.selectList(param);
    return CollUtil.isEmpty(list) ? Collections.emptyList() : list;
}
```

### 集合参数防御

```java
// ❌ 错误:空集合导致 SQL 异常
// WHERE id IN ()  -- 语法错误
mapper.selectByIds(emptyList);

// ✅ 正确:集合判空
public List<XxxVO> selectByIds(List<Long> ids) {
    if (CollUtil.isEmpty(ids)) {
        return Collections.emptyList();
    }
    return mapper.selectByIds(ids);
}
```

## 详细参考

更多详细规范请参考:
- [pagination-guide.md](references/pagination-guide.md) - 分页查询完整指南
- [permission-guide.md](references/permission-guide.md) - 权限过滤完整指南
