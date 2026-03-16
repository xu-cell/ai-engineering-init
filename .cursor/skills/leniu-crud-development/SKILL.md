---
name: leniu-crud-development
description: |
  leniu 项目 CRUD 开发规范。基于 pigx-framework 四层架构（Controller -> Business -> Service -> Mapper）。
  涵盖命名规范、代码模板、分页模式、事务管理、并发处理、代码质量要点。

  触发场景：
  - 新建 leniu 业务模块的 CRUD 功能
  - 创建 Entity、DTO、VO、Service、Mapper、Controller
  - 分页查询（PageHelper / MyBatis-Plus）
  - 事务管理（多表操作、self 自注入）
  - 报表 Service 模式（含数据权限、并发查询）

  适用项目：
  - leniu-tengyun-core（云食堂核心服务）
  - leniu-yunshitang（云食堂业务服务）

  触发词：CRUD、增删改查、新建模块、Business层、Service、Mapper、Controller、分页查询、LeRequest、PageDTO、PageVO、事务管理、报表Service
---

# leniu CRUD 开发规范

> 完整代码模板见 `references/templates.md`

## 项目路径

| 项目 | 路径 |
|------|------|
| leniu-tengyun-core | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core` |
| leniu-yunshitang | `/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang` |
| 包名前缀 | `net.xnzn.core.*` |

---

## 架构概览

| 项 | 规范 |
|----|------|
| 架构 | Controller -> Business -> Service -> Mapper（四层） |
| 无 DAO 层 | Service 直接注入 Mapper |
| 对象转换 | `BeanUtil.copyProperties()` (Hutool) |
| Entity 基类 | 无基类，自定义审计字段 |
| 请求封装 | `LeRequest<T>` |
| 响应封装 | `Page<T>` / `LeResponse<T>` / `void` |
| 分组校验 | `InsertGroup` / `UpdateGroup` |
| 认证注解 | `@RequiresAuthentication` / `@RequiresGuest` |
| 异常类 | `LeException` |
| 审计字段 | crby/crtime/upby/uptime |
| 逻辑删除 | del_flag（1=删除, 2=正常） |
| 主键 | 雪花ID `Id.next()` 或自增 |
| Mapper XML | 与 Java 同目录（非 resources/mapper） |
| 验证包 | `jakarta.validation.*`（JDK 21） |

---

## 标准包结构

```
net.xnzn.core.[module]/
+-- controller/         # 按端分：web/mobile/android
+-- business/impl/      # 业务编排（跨 Service 协调）
+-- service/impl/       # 单表 CRUD、事务
+-- mapper/             # Mapper + XML（同目录）
+-- model/              # Entity
+-- vo/                 # 响应对象
+-- dto/                # 请求参数
+-- constants/          # 枚举和常量
```

---

## 命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| Entity | `Xxx` / `XxxEntity` | `OrderInfo` |
| DTO | `XxxDTO` | `OrderInfoDTO` |
| VO | `XxxVO` | `OrderInfoVO` |
| Service 接口 | `XxxService` | `OrderInfoService` |
| Service 实现 | `XxxServiceImpl` | `OrderInfoServiceImpl` |
| Mapper | `XxxMapper` | `OrderInfoMapper` |
| Controller (Web) | `XxxWebController` | `OrderInfoWebController` |
| Business | `XxxWebBusiness` | `OrderWebBusiness` |

### Controller 路由前缀

| 端 | 前缀 |
|----|------|
| Web 管理端 | `/api/v2/web/{module}` |
| 移动端 | `/api/v2/mobile/{module}` |
| 设备端 | `/api/v2/android/{module}` |
| 开放接口 | `/api/v2/open/{module}` |

---

## 核心代码片段

### Entity 审计字段

```java
@TableField(value = "crby", fill = FieldFill.INSERT)
private String crby;
@TableField(value = "crtime", fill = FieldFill.INSERT)
private LocalDateTime crtime;
@TableField(value = "upby", fill = FieldFill.INSERT_UPDATE)
private String upby;
@TableField(value = "uptime", fill = FieldFill.INSERT_UPDATE)
private LocalDateTime uptime;
@TableField("del_flag")
private Integer delFlag;  // 1=删除, 2=正常
```

### Service 注入模式

```java
@Slf4j
@Service
public class XxxServiceImpl implements XxxService {
    @Resource
    private XxxMapper xxxMapper;  // 直接注入 Mapper，无 DAO 层

    // 不继承 ServiceImpl，只实现接口
}
```

### Controller 请求封装

```java
@PostMapping("/add")
@RequiresAuthentication
public Long add(@Validated(InsertGroup.class) @RequestBody LeRequest<XxxDTO> request) {
    return xxxService.add(request.getContent());
}

@GetMapping("/get/{id}")
@RequiresGuest
public XxxVO getById(@PathVariable Long id) {
    return xxxService.getById(id);
}
```

### 查询条件构建

```java
private LambdaQueryWrapper<XxxEntity> buildWrapper(XxxDTO dto) {
    LambdaQueryWrapper<XxxEntity> wrapper = Wrappers.lambdaQuery();
    wrapper.eq(XxxEntity::getDelFlag, 2);  // 只查正常数据
    // String -> like, 非 String -> eq/in/between
    if (StrUtil.isNotBlank(dto.getName())) {
        wrapper.like(XxxEntity::getName, dto.getName());
    }
    if (ObjectUtil.isNotNull(dto.getStatus())) {
        wrapper.eq(XxxEntity::getStatus, dto.getStatus());
    }
    wrapper.orderByDesc(XxxEntity::getCrtime);
    return wrapper;
}
```

### 对象转换与空值防护

```java
// 新增
XxxEntity entity = BeanUtil.copyProperties(dto, XxxEntity.class);
entity.setDelFlag(2);
xxxMapper.insert(entity);

// 查询判空
XxxEntity entity = Optional.ofNullable(xxxMapper.selectById(id))
    .orElseThrow(() -> new LeException("记录不存在"));
return BeanUtil.copyProperties(entity, XxxVO.class);

// 列表空值兜底
List<XxxEntity> list = xxxMapper.selectList(wrapper);
if (CollUtil.isEmpty(list)) {
    return Collections.emptyList();
}
return BeanUtil.copyToList(list, XxxVO.class);
```

---

## 分页查询

### MyBatis-Plus 分页

```java
public Page<XxxVO> page(XxxDTO dto) {
    LambdaQueryWrapper<XxxEntity> wrapper = buildWrapper(dto);
    Page<XxxEntity> page = new Page<>(dto.getPageNum(), dto.getPageSize());
    Page<XxxEntity> result = xxxMapper.selectPage(page, wrapper);

    Page<XxxVO> voPage = new Page<>();
    BeanUtil.copyProperties(result, voPage, "records");
    voPage.setRecords(BeanUtil.copyToList(result.getRecords(), XxxVO.class));
    return voPage;
}
```

### PageHelper 分页（报表场景）

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    if (Objects.nonNull(param.getPage())) {
        PageMethod.startPage(param.getPage());  // 传 PageDTO，紧接查询前调用
    }
    List<XxxVO> records = xxxMapper.pageList(param);
    return PageVO.of(records);
}
```

### 带合计行的分页

```java
public ReportBaseTotalVO<XxxVO> pageWithTotal(XxxPageParam param) {
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dp = reportDataPermissionService.getDataPermission(authPO);

    if (Objects.nonNull(param.getPage())) {
        PageMethod.startPage(param.getPage());
    }
    List<XxxVO> list = xxxMapper.getSummaryList(param, authPO, dp);
    XxxVO totalLine = Optional.ofNullable(xxxMapper.getSummaryTotal(param, authPO, dp))
            .orElse(new XxxVO());
    return new ReportBaseTotalVO<XxxVO>()
            .setResultPage(PageVO.of(list))
            .setTotalLine(totalLine);
}
```

**分页关键规则**：
1. `PageMethod.startPage(param.getPage())` 传 PageDTO 对象，紧接查询前调用
2. startPage 与查询之间不能插入其他查询
3. Mapper 方法返回 List 即可，PageHelper 自动转换

---

## 事务管理

### 多表操作必须加事务

```java
@Transactional(rollbackFor = Exception.class)
public void createOrderWithStock(OrderDTO dto) {
    orderMapper.insert(order);
    orderDetailMapper.insert(details);
    stockMapper.deduct(dto.getStockId(), dto.getQuantity());
}
```

### Self 自注入（同类事务调用）

```java
@Slf4j
@Service
public class OrderPlaceBusiness {
    @Autowired @Lazy
    private OrderPlaceBusiness self;  // 自注入，触发 AOP 代理

    public void doSave(OrderSavePO po) {
        self.save(po, false, false);  // 通过 self 调用，@Transactional 生效
    }

    @Transactional(rollbackFor = Exception.class)
    public void save(OrderSavePO po, boolean orderExists, boolean removeDetails) {
        // 多表操作...
    }
}
```

**规则**：同类方法互调，被调用方有 `@Transactional` -> 必须 `self.xxx()` 而非 `this.xxx()`

---

## 报表 Service 模式

```java
@Slf4j
@Service
public class ReportXxxService {  // 无接口，直接 @Service 类
    @Autowired private ReportXxxMapper reportXxxMapper;
    @Autowired private MgrAuthV2Api mgrAuthApi;
    @Autowired private ReportDataPermissionService reportDataPermissionService;
    @Resource(name = "yunshitangTaskExecutor")
    private AsyncTaskExecutor asyncTaskExecutor;

    public ReportBaseTotalVO<XxxVO> pageXxx(XxxParam param) {
        long start = System.currentTimeMillis();
        MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
        ReportDataPermissionParam dp = reportDataPermissionService.getDataPermission(authPO);
        // ... 查询 + 合计行
        log.info("pageXxx耗时：{}", System.currentTimeMillis() - start);
        return result;
    }
}
```

**关键点**：`mgrAuthApi.getUserAuthPO()` 获取权限、`reportDataPermissionService.getDataPermission()` 获取数据权限、线程池 `yunshitangTaskExecutor`

---

## 并发处理

### CompletableFuture 并行查询

```java
@Resource(name = "yunshitangTaskExecutor")
private AsyncTaskExecutor asyncTaskExecutor;

CompletableFuture<List<A>> futureA = CompletableFuture
    .supplyAsync(() -> mapper.getTypeA(param, authPO, dp), asyncTaskExecutor);
CompletableFuture<List<B>> futureB = CompletableFuture
    .supplyAsync(() -> mapper.getTypeB(param, authPO, dp), asyncTaskExecutor);
CompletableFuture.allOf(futureA, futureB).join();
```

### Redisson 分布式锁

```java
RLock lock = redissonClient.getLock("import:lock:" + TenantContextHolder.getTenantId());
if (!lock.tryLock(5, 60, TimeUnit.SECONDS)) {
    throw new LeException("正在处理中，请稍后再试");
}
try {
    doImport(file);
} finally {
    if (lock.isLocked() && lock.isHeldByCurrentThread()) {
        lock.unlock();
    }
}
```

---

## 建表 SQL 模板

```sql
CREATE TABLE `xxx_table` (
    `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `name` VARCHAR(100) NOT NULL COMMENT '名称',
    `status` TINYINT(1) DEFAULT 1 COMMENT '状态(0停用 1启用)',
    `del_flag` TINYINT(1) DEFAULT 2 COMMENT '删除标识(1删除 2正常)',
    `revision` INT DEFAULT 0 COMMENT '乐观锁版本号',
    `crby` VARCHAR(64) DEFAULT NULL COMMENT '创建人',
    `crtime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `upby` VARCHAR(64) DEFAULT NULL COMMENT '更新人',
    `uptime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    KEY `idx_status` (`status`),
    KEY `idx_crtime` (`crtime`),
    KEY `idx_del_flag` (`del_flag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='XXX表';
-- 无需 tenant_id（双库物理隔离）
```

---

## 禁止项速查

```java
// ---- 错误 ---- | ---- 正确 ----
package org.dromara.xxx;                  // -> net.xnzn.core.xxx
import javax.validation.Valid;            // -> jakarta.validation.Valid
@Validated(AddGroup.class)                // -> InsertGroup.class
private String createBy;                  // -> crby
entity.setDelFlag(0);                     // -> setDelFlag(2) 表示正常
throw new ServiceException("...");        // -> throw new LeException("...")
MapstructUtils.convert(src, Dst.class);   // -> BeanUtil.copyProperties(src, Dst.class)
extends ServiceImpl<XxxMapper, Xxx>       // -> implements XxxService（不继承）
@Resource private XxxDao xxxDao;          // -> @Resource private XxxMapper xxxMapper
// XML 放 resources/mapper/              // -> 与 Java 同目录
return null;                              // -> return Collections.emptyList()
```

---

## 生成前检查清单

- [ ] 包名 `net.xnzn.core.*`
- [ ] Service 只实现接口，不继承基类
- [ ] Service 直接注入 Mapper（无 DAO）
- [ ] 审计字段 crby/crtime/upby/uptime
- [ ] delFlag: 1=删除, 2=正常
- [ ] `BeanUtil.copyProperties()` 转换对象
- [ ] `jakarta.validation.*` 校验
- [ ] `InsertGroup` / `UpdateGroup` 分组
- [ ] Mapper XML 与 Java 同目录
- [ ] `LeException` 抛异常
- [ ] `@RequiresAuthentication` / `@RequiresGuest` 认证
- [ ] `LeRequest<T>` 请求封装
- [ ] 多表操作加 `@Transactional(rollbackFor = Exception.class)`
- [ ] 返回 List 有空集合兜底
- [ ] selectOne/selectById 结果判空

---

## 参考代码

| 类型 | 路径 |
|------|------|
| Controller | `core-attendance/.../controller/AttendanceLeaveInfoController.java` |
| Service | `core-attendance/.../service/impl/AttendanceLeaveInfoServiceImpl.java` |
| Mapper | `core-attendance/.../mapper/AttendanceLeaveInfoMapper.java` |
| Entity | `core-attendance/.../model/AttendanceLeaveInfo.java` |
