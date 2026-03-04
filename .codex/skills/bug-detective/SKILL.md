---
name: bug-detective
description: |
  leniu 后端 Bug 排查指南。包含错误诊断决策树、日志分析、分层定位、本项目特有错误模式库。

  触发场景：
  - 接口返回 4xx/5xx 错误需要排查
  - NullPointerException、SQLException 等异常定位
  - 数据查不到、对象转换失败、租户隔离问题
  - 日志文件分析（./logs/sys-console.log）
  - 前端页面不显示、API 调用异常

  触发词：Bug、报错、异常、不工作、500错误、NullPointerException、SQLException、数据查不到、日志分析、排查、调试、debug、错误排查、精度丢失
---

# Bug 排查指南（leniu 四层架构）

> 本项目四层架构：Controller -> Business -> Service -> Mapper，包名 `net.xnzn.core.*`
> 详细错误案例库见 `references/error-patterns.md`

## 错误关键词索引

| 关键词 | 原因 | 解决 |
|--------|------|------|
| `NullPointerException` | 对象为空 | selectById 判空，用 Optional |
| `SQLException` | SQL 语法/字段名 | 检查表名、字段、类型 |
| `401/403` | Token/权限 | 检查 `@RequiresAuthentication`、角色配置 |
| `404` | URL 路径错误 | 检查 `@RequestMapping` |
| `500` | 后端异常 | 读日志 `./logs/sys-console.log` |
| `data 为 null, msg 有值` | **LeResponse 返回陷阱** | 见下方特有问题 #1 |
| `精度丢失/ID 不对` | 雪花 ID 大数 | Long -> String 或 `@JsonSerialize(using = ToStringSerializer.class)` |
| `like 报错` | 非 String 类型 | Long/Date 用 eq/in/between |
| `查询无结果` | 租户/del_flag/条件 | 检查双库切换、del_flag=2 |
| `BeanUtil 转换 null` | 源对象为空 | 转换前判空 |

---

## 诊断决策树

```
接口返回错误
+-- 4xx
|   +-- 400 -> 参数格式/类型错误（@RequestBody、LeRequest<T>）
|   +-- 401 -> Token 过期（检查 Admin-Token）
|   +-- 403 -> 无权限（检查 @RequiresAuthentication）
|   +-- 404 -> 路径错误（检查 /api/v2/web|mobile|android/{module}）
|
+-- 500
|   +-- 有堆栈 -> 按异常类型定位
|   |   +-- NullPointerException -> 查询返回 null 未判空
|   |   +-- SQLException -> SQL 语法/字段错误
|   |   +-- LeException -> 业务逻辑主动抛出
|   +-- 无堆栈 -> 全局异常处理器吞掉了异常
|
+-- 200 但数据不对
    +-- data=null, msg有值 -> LeResponse 返回陷阱（见特有问题 #1）
    +-- data=null, msg=null -> 查询条件错误/del_flag/双库切换
    +-- 字段缺失 -> BeanUtil.copyProperties 字段名不匹配
    +-- ID 精度丢失 -> 雪花 ID 大数问题
```

---

## 分层定位

```
步骤 1：Postman/curl 直接调接口
+-- 返回正确 -> 问题在前端
+-- 返回错误 -> 问题在后端

步骤 2（后端）：读日志 ./logs/sys-console.log
+-- 有 ERROR -> 定位异常类和行号
+-- 无 ERROR -> 打断点逐层排查

步骤 3：按调用链向下
Controller -> Business -> Service -> Mapper -> 数据库
```

| 层级 | 常见问题 | 排查重点 |
|------|---------|---------|
| Controller | 参数绑定、路径 404 | `@RequestMapping`、`LeRequest<T>`、`@Validated` |
| Business | 业务编排错误、跨 Service 协调 | 方法调用顺序、数据组装 |
| Service | 查询条件、事务回滚 | `buildWrapper`、`@Transactional`、判空 |
| Mapper | SQL 语法、字段映射 | `@TableName`、`@TableField`、XML SQL |

---

## 日志分析

### 日志文件位置

| 环境 | 文件 | 说明 |
|------|------|------|
| 开发 | `./logs/sys-console.log` | 本次启动完整日志（INFO/WARN/ERROR + SQL） |
| 生产 | `./logs/sys-info.log` | INFO 日志（60 天） |
| 生产 | `./logs/sys-error.log` | ERROR 日志（60 天） |
| 生产 | `./logs/sys-sql.log` | SQL 日志（7 天） |

### AI 自动读取流程

**触发条件**（任一）：用户报告问题无堆栈、需分析 SQL、需查看流程、用户说"看日志"

```
1. Read ./logs/sys-console.log
2. 搜索 ERROR/WARN -> 定位异常堆栈
3. 搜索 p6spy -> 分析 SQL 执行和耗时
4. 结合代码给出诊断和修复方案
```

### 日志格式

```
2026-01-08 22:12:10 [xxx] [http-nio-8080-exec-1] INFO  p6spy - Execute SQL: SELECT ... | Cost: 5 ms
2026-01-08 22:12:10 [xxx] [http-nio-8080-exec-1] ERROR net.xnzn.core.xxx - 错误信息
```

**SQL 耗时阈值**：<50ms 正常 | 50-200ms 关注 | >200ms 需优化

---

## 本项目特有问题库

### 1. LeResponse 返回 String 的陷阱

```java
// ---- 错误：R.ok(String) 匹配到 ok(String msg) ----
return R.ok(code);  // { code: 200, msg: "ABC123", data: null }

// ---- 正确 ----
return R.ok(null, code);  // { code: 200, msg: null, data: "ABC123" }
return R.ok("成功", code); // { code: 200, msg: "成功", data: "ABC123" }
```

**原因**：当 T 是 String 时，Java 优先匹配 `ok(String msg)` 而非泛型 `ok(T data)`。

### 2. 双库架构数据查不到

```java
// leniu 是物理双库（系统库 + 商户库），无 tenant_id 字段
// 默认操作商户库，切换系统库需要：
Executors.doInSystem(() -> { /* 系统库操作 */ });
Executors.doInTenant(tenantId, () -> { /* 指定商户库 */ });

// 排查：数据在哪个库？请求头 MERCHANT-ID 是否正确？
```

### 3. del_flag 值反直觉

```java
// leniu: 1=删除, 2=正常（非通用的 0=正常, 1=删除）
wrapper.eq(XxxEntity::getDelFlag, 2); // 查正常数据
entity.setDelFlag(1); // 逻辑删除
```

### 4. 查询条件不生效

```java
// ---- 错误：无条件判断 ----
wrapper.eq(Xxx::getStatus, bo.getStatus());  // null 时报错
wrapper.like(Xxx::getName, bo.getName());    // 空串时 LIKE '%%'

// ---- 正确 ----
wrapper.eq(ObjectUtil.isNotNull(bo.getStatus()), Xxx::getStatus, bo.getStatus());
wrapper.like(StrUtil.isNotBlank(bo.getName()), Xxx::getName, bo.getName());
```

### 5. like 仅限 String 类型

| 字段类型 | 用法 |
|---------|------|
| String | `like()` |
| Long/Integer | `eq()` / `in()` |
| Date/LocalDateTime | `between()` / `ge()` / `le()` |

### 6. 雪花 ID 精度丢失

```java
// JS Number 最大安全整数 2^53-1，雪花 ID 超出
// 方案 1：VO 中 String 类型
// 方案 2：@JsonSerialize(using = ToStringSerializer.class)
// 方案 3：全局 JacksonConfig（本项目已配置，检查是否生效）
```

### 7. Self 自注入事务失效

```java
// 同类方法互调，被调用方有 @Transactional 时，必须用 self 调用
@Autowired @Lazy
private XxxBusiness self;

public void doSave(OrderDTO dto) {
    self.save(dto); // 通过代理调用，事务生效
    // this.save(dto); // 直接调用，事务不生效
}
```

### 8. BeanUtil 转换注意

```java
// leniu 用 Hutool BeanUtil，不是 MapstructUtils
XxxVO vo = BeanUtil.copyProperties(entity, XxxVO.class); // 源对象为 null 时返回 null
// 转换前务必判空
```

---

## 数据库排查

### 主动排查流程

```
1. 读取数据库配置（bootstrap.yml / application-dev.yml）
2. 连接数据库执行诊断 SQL
3. 分析结果给出方案
```

### 常用诊断 SQL

```sql
-- 数据存在性（注意 del_flag=2 是正常）
SELECT * FROM 表名 WHERE id = ? AND del_flag = 2;

-- 最近数据
SELECT * FROM 表名 ORDER BY crtime DESC LIMIT 10;

-- 表结构
DESC 表名;

-- 执行计划
EXPLAIN SELECT ...;
```

---

## 常见问题速查

| 问题 | 原因 | 解决 |
|------|------|------|
| 接口 404 | URL/未启动 | 检查路由前缀 `/api/v2/web/{module}` |
| 接口 500 | 后端异常 | 读日志 |
| data 为 null | LeResponse 陷阱 | `R.ok(null, value)` |
| 转换失败 | BeanUtil 源为 null | 转换前判空 |
| 数据查不到 | 双库/del_flag | 检查 Executors 切换、del_flag=2 |
| 事务不回滚 | 异常被吞/非 public/this 调用 | 检查 @Transactional、用 self |
| Bean 注入失败 | 包名/注解 | 必须 `net.xnzn.core.*` + `@Service` |

---

## Skill 联动

| 排查发现 | 推荐 Skill |
|---------|-----------|
| SQL 性能慢 | `performance-doctor` |
| 权限配置问题 | `security-guard` |
| BO/VO 映射错误 | `leniu-crud-development` |
| 前端组件用法 | `ui-pc` |
