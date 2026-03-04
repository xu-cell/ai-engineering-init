# Bug 排查详细错误案例库

> 本文件是 `bug-detective` 技能的参考文档，包含完整的错误排查案例。

## 1. NullPointerException 详细排查

```java
// 常见场景
User user = baseMapper.selectById(id);  // 可能返回 null
user.getName();  // NPE

// 修复方案
XxxEntity entity = Optional.ofNullable(xxxMapper.selectById(id))
    .orElseThrow(() -> new LeException("记录不存在"));
```

**本项目常见 NPE 位置**:
- `xxxMapper.selectById(id)` 返回 null
- `BeanUtil.copyProperties()` 源对象为 null
- 链式调用中间某环节为 null

---

## 2. SQL 异常详细排查

```sql
-- 检查表是否存在
SHOW TABLES LIKE 'xxx_table';

-- 检查字段
DESC xxx_table;

-- 直接执行验证
SELECT * FROM xxx_table WHERE id = 1;

-- 唯一键冲突检查
SELECT * FROM xxx_table WHERE unique_field = 'value';
```

---

## 3. 权限问题详细排查

```java
// 1. 检查认证注解
@RequiresAuthentication  // leniu 项目使用此注解
@RequiresGuest           // 免登录接口

// 2. 检查请求头
// Admin-Token: xxx (localStorage)
// MERCHANT-ID: xxx (租户标识)
```

---

## 4. 事务问题详细排查

```java
// 1. 是否加了事务注解
@Transactional(rollbackFor = Exception.class)

// 2. 异常是否被 try-catch 吞掉
try {
    // 操作
} catch (Exception e) {
    log.error("错误", e);
    throw e;  // 必须重新抛出，否则事务不回滚
}

// 3. 是否在非 public 方法上使用（不生效）
@Transactional  // private 方法不生效
private void doSomething() {}

// 4. 同类调用是否通过 self
@Autowired @Lazy
private XxxBusiness self;
self.transactionalMethod();  // 通过代理调用
```

---

## 5. 日志分析完整示例

### 场景：接口报 500

```
AI 执行步骤：
1. Read ./logs/sys-console.log
   -> 找到最后一个 ERROR：NullPointerException at XxxService.java:45

2. Read 对应源文件第 45 行
   -> 代码：user.getName()

3. 分析日志中的 SQL
   -> SELECT * FROM xxx WHERE id = 999 返回空

4. 数据库验证
   -> 确认 ID 999 不存在

5. 诊断：用户不存在时代码未判空
   -> 解决：添加 Optional 判空
```

### 场景：查询慢

```
1. 搜索 SQL 日志
   grep "p6spy" ./logs/sys-console.log

2. 分析 Cost 耗时
   - Cost < 50ms -> 正常
   - Cost 50-200ms -> 关注
   - Cost > 200ms -> 优化

3. 检查 N+1 查询
4. 建议添加索引或批量查询
```

### 场景：租户数据问题

```
1. 搜索 SQL 日志中的查询语句
2. 检查是否使用了正确的 Executors 切换
   - Executors.doInSystem() -> 系统库
   - 默认 -> 商户库（根据 MERCHANT-ID）
3. 对比实际数据
```

---

## 6. 前端问题排查

### 接口调用失败

| 状态码 | 含义 | 解决 |
|--------|------|------|
| 400 | 参数错误 | 检查参数类型格式 |
| 401 | 未认证 | 检查 Admin-Token (localStorage) |
| 403 | 无权限 | 检查角色权限、v-hasPerm |
| 404 | 接口不存在 | 检查 URL、后端是否启动 |
| 500 | 服务端错误 | 查后端日志 |

### 前端特有问题

```javascript
// 前端成功码是 10000（非 200）
if (res.code === 10000) { ... }

// 金额单位是分，展示需转元
money(amountInFen)

// 加密使用 SM4
```

---

## 7. 数据库排查 SQL 模板

### 数据关联检查

```sql
SELECT a.*, b.*
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id
WHERE a.id = ?;
```

### 重复数据检查

```sql
SELECT id, COUNT(*) FROM 表 GROUP BY id HAVING COUNT(*) > 1;
```

### 孤立数据检查

```sql
SELECT a.id FROM 主表 a
LEFT JOIN 子表 b ON a.id = b.主表id
WHERE b.id IS NULL;
```

### 性能检查

```sql
-- 执行计划
EXPLAIN SELECT * FROM 表 WHERE 条件;

-- type: ALL(全表扫描需优化) | index | range | ref | const(最优)

-- 检查索引
SHOW INDEX FROM 表;
```

---

## 8. 多数据库差异

| 功能 | MySQL | PostgreSQL |
|------|-------|------------|
| 分页 | `LIMIT 10` | `LIMIT 10` |
| 字符串连接 | `CONCAT()` | `||` |
| 当前时间 | `NOW()` | `NOW()` |
| 类型转换 | `CAST()` | `::` |

---

## 9. Bean 注入失败排查

```java
// NoSuchBeanDefinitionException 排查步骤：
// 1. 检查是否有 @Service/@Component
@Service
public class XxxServiceImpl implements XxxService { ... }

// 2. 检查包路径（必须 net.xnzn.core.*）
package net.xnzn.core.xxx.service.impl;

// 3. 检查循环依赖（A->B->A）
// 4. 检查接口与实现类是否匹配
```

---

## 10. 排查清单

### 后端

- [ ] 是否读取了日志文件 `./logs/sys-console.log`？
- [ ] 异常堆栈包名是否为 `net.xnzn.core.*`？
- [ ] Controller 路由前缀是否正确（`/api/v2/web|mobile|android/{module}`）？
- [ ] Service 是否直接注入 Mapper（无 DAO 层）？
- [ ] 非字符串字段是否使用了 eq/in/between 而不是 like？
- [ ] BeanUtil.copyProperties() 转换前是否判空？
- [ ] 双库切换是否正确（Executors.doInSystem/doInTenant）？
- [ ] del_flag 是否用 2=正常、1=删除？
- [ ] 数据库中是否真的存在需要的数据？

### 前端

- [ ] Network 中接口状态码和响应内容？
- [ ] 成功码是否判断 10000？
- [ ] Admin-Token 和 MERCHANT-ID 请求头是否正确？
