---
name: java-quality
description: |
  Java代码质量必检项。当编写Java代码时使用此skill进行代码质量检查，覆盖空指针、事务、并发等核心问题。

  触发场景：
  - 代码质量检查（空指针防护、参数校验）
  - 并发安全性检查（线程安全、锁）
  - 事务边界检查（@Transactional使用）
  - 资源关闭和集合操作安全检查

  触发词：代码质量、空指针防护、参数校验、并发安全、事务边界、资源关闭、集合安全、返回值兜底、质量必检、代码检查

  注意：与 java-code-quality 技能有重叠，本技能侧重必检项清单，java-code-quality 侧重全面质量评分体系。
---

# Java代码质量必检项

## 1. 空指针风险防护

### 数据库查询结果判空

```java
// ❌ 错误:selectOne 返回值未判空
XxxEntity entity = mapper.selectOne(query);
entity.getName();  // 可能 NPE

// ✅ 正确:判空处理
XxxEntity entity = mapper.selectOne(query);
if (ObjectUtil.isNull(entity)) {
    throw new LeException("数据不存在");
}

// ✅ 或使用 Optional
Optional.ofNullable(mapper.selectOne(query))
    .orElseThrow(() -> new LeException("数据不存在"));
```

### 免检白名单

以下API已在拦截器层统一处理,保证非空或返回空集合,无需额外判空:

- `allocCanteenApi.*` - 食堂信息查询
- `allocAreaApi.*` - 区域相关API
- `allocStallApi.*` - 档口相关API
- `mgrAuthApi.*` - 权限相关API(全选返回空集合,无权限返回错误ID)
- `TokenManager.getSubjectId().get()` / `SecurityUtils.getUser()` - 需上层有 `@RequiresAuthentication`

## 2. 参数校验

入参校验逻辑应抽取为独立方法/校验器,避免在主流程中堆叠校验代码。

### VO/DTO使用Jakarta Validation注解

```java
@Data
public class XxxParam {
    @NotNull(message = "ID不能为空")
    private Long id;

    @NotBlank(message = "名称不能为空")
    private String name;

    @NotEmpty(message = "列表不能为空")
    private List<Long> ids;
}
```

### Service层使用Assert

```java
public void process(Long id) {
    // 使用 Objects.requireNonNull
    Objects.requireNonNull(id, "ID不能为空");

    // 或使用 Assert
    Assert.notNull(id, () -> new LeException("ID不能为空"));
}
```

## 3. 并发安全

### 避免竞态条件

```java
// ❌ 错误:查询+新增存在竞态条件
if (mapper.selectOne(query) == null) {
    mapper.insert(entity);  // 并发时可能重复插入
}

// ✅ 正确:使用分布式锁或唯一索引
@Transactional(rollbackFor = Exception.class)
public void safeInsert(XxxEntity entity) {
    // 方案1:数据库唯一索引 + 捕获异常
    try {
        mapper.insert(entity);
    } catch (DuplicateKeyException e) {
        // 处理重复
    }

    // 方案2:分布式锁
    String lockKey = "lock:xxx:" + entity.getKey();
    if (redisLock.tryLock(lockKey)) {
        try {
            if (mapper.selectOne(query) == null) {
                mapper.insert(entity);
            }
        } finally {
            redisLock.unlock(lockKey);
        }
    }
}
```

## 4. 事务边界

### 多表操作必须加事务

```java
// ❌ 错误:多表操作未加事务
public void updateOrder(OrderDTO dto) {
    orderMapper.updateById(order);      // 表1
    orderDetailMapper.update(details);   // 表2,如果失败表1无法回滚
}

// ✅ 正确:多表操作加事务
@Transactional(rollbackFor = Exception.class)
public void updateOrder(OrderDTO dto) {
    orderMapper.updateById(order);
    orderDetailMapper.update(details);
}
```

### 注意事务边界

跨模块调用前需要确认对方模块事务边界,避免重复包裹或遗漏;对外提供API时需在实现中明确本模块事务范围。

## 5. 资源关闭

### 使用try-with-resources

```java
// ✅ 使用 try-with-resources 自动关闭
try (InputStream is = new FileInputStream(file);
     OutputStream os = new FileOutputStream(target)) {
    // 操作
}

// ✅ Stream 在终端操作后自动关闭,但数据库 Stream 需注意
try (Stream<XxxEntity> stream = mapper.selectStream()) {
    stream.forEach(this::process);
}
```

## 6. 集合操作安全

### 避免遍历时修改集合

```java
// ❌ 错误:遍历时修改集合
for (XxxEntity entity : list) {
    if (condition) {
        list.remove(entity);  // ConcurrentModificationException
    }
}

// ✅ 正确:使用 Iterator 或 Stream 过滤
list.removeIf(entity -> condition);

// 或
List<XxxEntity> filtered = list.stream()
    .filter(entity -> !condition)
    .toList();
```

## 7. 租户隔离

### 跨租户查询必须使用Executors

```java
// ✅ 监管平台跨租户查询必须使用 Executors
return Executors.readInSystem(() -> mapper.selectList(param));

// ✅ 获取当前租户
Long tenantId = TenantContextHolder.getTenantId();
```

## 8. SQL注入防护

### 使用参数化查询

```java
// ❌ 错误:字符串拼接
String sql = "SELECT * FROM table WHERE name = '" + name + "'";

// ✅ 正确:参数化查询
mapper.selectByName(name);  // MyBatis 使用 #{name}
```

## 9. 越权访问防护

### 删除/修改前校验数据归属

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

## 10. 敏感信息保护

### 日志脱敏

```java
// ❌ 错误:日志打印敏感信息
log.info("用户登录,密码: {}", password);

// ✅ 正确:脱敏处理
log.info("用户登录,用户名: {}", username);
```

### VO中敏感字段处理

```java
@Data
public class UserVO {
    @JsonIgnore
    private String password;

    @JsonSerialize(using = MobileSerializer.class)  // 手机号脱敏
    private String mobile;
}
```

## 11. 返回值兜底

### 空集合兜底

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

## 12. 集合参数防御

### 空集合导致SQL异常

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

## 13. 日志追踪

### 关键操作记录日志

```java
public void importantOperation(Long id) {
    log.info("【模块名】开始处理,id={}", id);
    try {
        // 业务逻辑
        log.info("【模块名】处理成功,id={}", id);
    } catch (Exception e) {
        log.error("【模块名】处理失败,id={}", id, e);
        throw e;
    }
}
```

## 14. 禁用魔法值

### 使用常量或枚举

```java
// ❌ 错误:魔法值
if (status == 1) { ... }
if ("admin".equals(role)) { ... }

// ✅ 正确:使用常量或枚举
if (Objects.equals(status, StatusEnum.ACTIVE.getCode())) { ... }
if (Objects.equals(role, RoleConstants.ADMIN)) { ... }
```

## 15. 方法长度限制

- 单个方法不超过 **100 行**
- 超过时需拆分为多个私有方法
- 主流程避免堆叠大量 `set`/装配逻辑,抽取到私有方法或 Converter

## 16. 注释规范

### 公共API必须有JavaDoc

```java
/**
 * 根据ID查询用户信息
 *
 * @param id 用户ID
 * @return 用户信息,不存在返回 null
 */
public UserVO getUserById(Long id) { ... }
```

## 17. 异常处理规范

### 异常必须透传或转换

```java
// ❌ 错误:空 catch 块
try {
    doSomething();
} catch (Exception e) {
    // 什么都不做
}

// ✅ 正确:至少记录日志或重新抛出
try {
    doSomething();
} catch (Exception e) {
    log.error("处理失败", e);
    throw new LeException("处理失败");
}
```

## 18. 避免过时API

### 使用新API

```java
// ❌ 避免使用 @Deprecated 的方法
Date date = new Date();  // 过时

// ✅ 使用新 API
LocalDateTime now = LocalDateTime.now();
LocalDate today = LocalDate.now();
```

## 19. 避免循环插库和循环查询库

- 优先批量插入/批量查询(`saveBatch`、`IN` 查询、一次性拉取并按需分组)
- 复杂场景使用 Mapper 一次查询或 SQL 聚合代替 N 次循环查询

```java
// ❌ 错误:循环查询
for (Long id : ids) {
    XxxEntity entity = mapper.selectById(id);  // N次查询
    // 处理
}

// ✅ 正确:批量查询
List<XxxEntity> entities = mapper.selectBatchIds(ids);  // 1次查询
for (XxxEntity entity : entities) {
    // 处理
}
```
