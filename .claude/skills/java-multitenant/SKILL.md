---
name: java-multitenant
description: |
  Java多租户架构规范。当处理多租户数据访问、跨租户查询、租户隔离等场景时使用此skill。

  触发场景：
  - 多租户数据访问（TenantEntity、TenantHelper）
  - 跨租户数据查询（忽略租户过滤）
  - 切换租户上下文执行操作
  - 配置排除租户过滤的特殊表

  触发词：多租户、租户隔离、TenantEntity、TenantHelper、tenantId、跨租户、动态租户、SaaS、@TenantIgnore、租户上下文

  注意：与 tenant-management 技能有重叠，tenant-management 侧重项目级租户管理配置，本技能侧重具体租户隔离代码规范。
---

# Java多租户架构规范

## 核心概念

系统采用多租户隔离设计,每个商户(租户)拥有独立的数据空间。租户ID通过拦截器自动注入到SQL查询条件中,实现数据隔离。

## 核心组件

- **TenantContextHolder**: 租户上下文持有者,用于获取和设置当前租户ID
- **Executors**: 跨租户执行器,用于跨租户读写数据
- **@InterceptorIgnore**: 注解,用于忽略租户拦截器

## 获取当前租户ID

```java
// 获取当前租户ID
Long tenantId = TenantContextHolder.getTenantId();

// 使用租户ID查询
XxxEntity entity = mapper.selectOne(
    Wrappers.lambdaQuery(XxxEntity.class)
        .eq(XxxEntity::getTenantId, tenantId)
        .eq(XxxEntity::getId, id)
);
```

## 跨租户读取数据

### 监管平台查询汇总数据

监管平台需要查询所有租户的数据,使用 `Executors.readInSystem()`:

```java
public List<XxxVO> listAllTenants(XxxParam param) {
    return Executors.readInSystem(() -> {
        List<XxxEntity> records = mapper.selectList(param);
        return BeanUtil.copyToList(records, XxxVO.class);
    });
}
```

### 指定租户查询

```java
public List<XxxVO> listByTenant(Long tenantId, XxxParam param) {
    return Executors.readInTenant(tenantId, () -> {
        List<XxxEntity> records = mapper.selectList(param);
        return BeanUtil.copyToList(records, XxxVO.class);
    });
}
```

## 跨租户写入数据

```java
public void saveToAllTenants(XxxDTO dto) {
    Executors.doInSystem(() -> {
        XxxEntity entity = new XxxEntity();
        BeanUtil.copyProperties(dto, entity);
        mapper.insert(entity);
    });
}
```

## 忽略租户拦截器

### Mapper方法上使用

```java
@Mapper
public interface XxxMapper extends BaseMapper<XxxEntity> {

    /**
     * 查询所有租户的数据(忽略租户拦截器)
     */
    @InterceptorIgnore(tenantLine = "true")
    List<XxxVO> queryWithoutTenant(@Param("param") XxxParam param);

    /**
     * PageHelper计数方法(自动识别)
     * 后缀 _COUNT 会被PageHelper自动识别为计数方法
     */
    @InterceptorIgnore(tenantLine = "true")
    long getXxxList_COUNT(@Param("param") XxxParam param);
}
```

### Mapper XML中使用

```xml
<!-- 忽略租户拦截器的查询 -->
<select id="queryWithoutTenant" resultType="XxxVO">
    SELECT * FROM xxx_table
    WHERE del_flag = 0
    <!-- 不会自动添加 tenant_id 条件 -->
</select>
```

## 租户隔离最佳实践

### 1. 默认使用租户隔离

大部分业务查询应该使用租户隔离,确保数据安全:

```java
// ✅ 推荐:默认使用租户隔离
public List<XxxVO> listByParam(XxxParam param) {
    List<XxxEntity> records = mapper.selectList(param);
    return BeanUtil.copyToList(records, XxxVO.class);
}
```

### 2. 明确跨租户场景

只有在明确需要跨租户查询时才使用 `Executors.readInSystem()`:

```java
// ✅ 正确:监管平台汇总查询
public List<XxxVO> getSummaryForAllTenants() {
    return Executors.readInSystem(() -> {
        List<XxxEntity> records = mapper.selectList(null);
        return BeanUtil.copyToList(records, XxxVO.class);
    });
}

// ❌ 错误:普通业务查询不应跨租户
public List<XxxVO> listByParam(XxxParam param) {
    return Executors.readInSystem(() -> {  // 不应该跨租户
        List<XxxEntity> records = mapper.selectList(param);
        return BeanUtil.copyToList(records, XxxVO.class);
    });
}
```

### 3. 租户ID校验

在删除/修改操作前,校验数据归属:

```java
@Transactional(rollbackFor = Exception.class)
public void delete(Long id) {
    XxxEntity entity = mapper.selectById(id);
    Assert.notNull(entity, () -> new LeException("数据不存在"));

    // 校验数据归属
    Long currentTenantId = TenantContextHolder.getTenantId();
    Assert.isTrue(entity.getTenantId().equals(currentTenantId),
        () -> new LeException("无权操作该数据"));

    mapper.deleteById(id);
}
```

### 4. 租户拦截器与分页结合

租户拦截器会自动在SQL中添加租户条件,与分页查询结合使用:

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    // 开启分页
    PageMethod.startPage(param);

    // 查询(自动添加租户条件)
    List<XxxEntity> records = mapper.pageList(param);

    // 转换并返回
    return PageVO.of(BeanUtil.copyToList(records, XxxVO.class));
}
```

## 常见场景

### 场景1: 普通业务查询

```java
// 自动添加租户条件
public List<XxxVO> listByParam(XxxParam param) {
    List<XxxEntity> records = mapper.selectList(param);
    return BeanUtil.copyToList(records, XxxVO.class);
}
```

### 场景2: 监管平台汇总查询

```java
// 跨租户查询所有数据
public List<XxxVO> getSummaryForAllTenants() {
    return Executors.readInSystem(() -> {
        List<XxxEntity> records = mapper.selectList(null);
        return BeanUtil.copyToList(records, XxxVO.class);
    });
}
```

### 场景3: 指定租户查询

```java
// 查询指定租户的数据
public List<XxxVO> listByTenant(Long tenantId, XxxParam param) {
    return Executors.readInTenant(tenantId, () -> {
        List<XxxEntity> records = mapper.selectList(param);
        return BeanUtil.copyToList(records, XxxVO.class);
    });
}
```

### 场景4: 系统级数据写入

```java
// 写入系统级数据(不属于任何租户)
public void saveSysData(XxxDTO dto) {
    Executors.doInSystem(() -> {
        XxxEntity entity = new XxxEntity();
        BeanUtil.copyProperties(dto, entity);
        mapper.insert(entity);
    });
}
```

## 注意事项

### 1. 租户拦截器的作用范围

租户拦截器只对 MyBatis Plus 的查询生效,对原生SQL不生效:

```java
// ✅ 会自动添加租户条件
List<XxxEntity> records = mapper.selectList(query);

// ❌ 不会自动添加租户条件(需要在XML中手动添加)
List<XxxEntity> records = mapper.selectByCustomSql(param);
```

### 2. 租户ID的来源

租户ID通常从以下来源获取:
- 用户登录信息(Token中包含租户ID)
- 请求头(Header中传递租户ID)
- 请求参数(URL参数或Body中包含租户ID)

### 3. 租户隔离与权限过滤的关系

租户隔离是第一层数据隔离,权限过滤是第二层数据隔离:

```java
public PageVO<XxxVO> pageList(XxxPageParam param) {
    // 1. 租户隔离(自动)
    // 2. 权限过滤(手动)
    MgrUserAuthPO authPO = mgrAuthApi.getUserAuthPO();
    ReportDataPermissionParam dataPermission =
        reportDataPermissionService.getDataPermission(authPO);

    PageMethod.startPage(param);
    List<XxxEntity> records = mapper.pageList(param, dataPermission);
    return PageVO.of(BeanUtil.copyToList(records, XxxVO.class));
}
```
