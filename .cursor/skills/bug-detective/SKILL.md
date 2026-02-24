---
name: bug-detective
description: |
  后端 Bug 排查指南。包含错误诊断决策树、日志分析、分层定位、数据库排查、本项目特有问题库。

  触发场景：
  - 接口返回 4xx/5xx 错误
  - NullPointerException、SQLException 等异常排查
  - 数据查不到、对象转换失败
  - R.ok() 返回值陷阱、雪花 ID 精度丢失
  - 日志文件分析（./logs/sys-console.log）

  触发词：Bug、报错、异常、不工作、500错误、NullPointerException、SQLException、数据查不到、日志分析、排查、调试、debug、错误排查
---

# Bug 排查指南（RuoYi-Vue-Plus 三层架构版）

> **⚠️ 重要声明**：本项目是 **RuoYi-Vue-Plus 纯后端项目**，采用三层架构（Controller → Service → Mapper），无独立 DAO 层！
> 本文档用于**排查已发生的问题**。如需设计异常处理机制（try-catch、全局异常、错误码），请使用 error-handler Skill。

## 问题类型速查表

| 问题类型 | 表现现象 | 排查方式 | 涉及层级 | 相关 Skill |
|---------|--------|--------|--------|----------|
| **接口 5xx 错误** | 服务端返回 500 | 读日志、打断点 | 后端全层 | bug-detective |
| **接口 4xx 错误** | 参数/路径/权限错误 | 检查请求格式、权限配置 | Controller 层 | security-guard, api-development |
| **数据查不到** | 查询条件错误、租户隔离 | 执行 SQL 验证 | Service/Mapper 层 | bug-detective, database-ops |
| **对象转换失败** | MapstructUtils 返回 null | 检查 @AutoMapper 配置 | Service 层 | code-patterns, crud-development |
| **R.ok() 返回格式错误** | data 为 null，msg 有值 | R.ok(String) 陷阱，改用 R.ok(null, value) | Controller 层 | bug-detective（本项目特有） |
| **数据精度丢失** | ID 最后几位变成 0 | 雪花 ID 大数问题，Long 改 String | 前后端交互 | bug-detective（本项目特有） |
| **权限不足** | 接口 403，用户无权限 | 检查角色权限、菜单配置 | Service 层 | security-guard, data-permission |
| **前端页面不显示** | 空白、组件未渲染、JS 错误 | 浏览器开发工具、Vue Devtools | 前端层 | ui-pc |
| **SQL 执行报错** | PostgreSQL 类型错误、语法错误 | 检查字段类型与查询方法匹配 | Mapper 层 | database-ops, code-patterns |

---

## 快速诊断入口

> **描述你的问题，根据关键词快速定位**

### 错误关键词索引

| 关键词/现象 | 可能原因 | 跳转章节 |
|------------|---------|---------|
| `NullPointerException` | 对象为空 | [#NPE 排查](#1-nullpointerexception) |
| `SQLException` / `SQL 语法` | SQL 错误 | [#SQL 异常](#2-sql-异常) |
| `401` / `未认证` | Token 问题 | [#权限问题](#3-权限问题) |
| `403` / `无权限` | 权限配置 | [#权限问题](#3-权限问题) |
| `404` / `接口不存在` | URL 路径错误 | [#接口调用失败](#1-接口调用失败) |
| `500` / `服务器错误` | 后端异常 | [#日志分析](#日志分析) |
| **`data 为 null`** / **`msg 有值 data 没值`** | **R.ok(String) 陷阱** | [#R.ok() 陷阱](#1-rok-返回-string-类型的陷阱极易踩坑) |
| `MapstructUtils 返回 null` | @AutoMappers 配置 | [#对象转换问题](#3-对象转换问题) |
| `查询无结果` / `数据查不到` | 租户/条件问题 | [#租户数据问题](#4-租户数据问题) |
| `like 报错` / `PostgreSQL 类型错误` | like 仅限 String 类型 | [#like 方法类型限制](#5-like-方法类型限制) |
| `前端取不到数据` | API 调用格式 | [#API 调用格式](#6-api-调用格式错误) |
| `页面空白` / `组件不显示` | 响应式/v-if | [#页面渲染问题](#2-页面渲染问题) |
| `样式错乱` | CSS 优先级/单位 | [#样式问题](#3-样式问题) |
| `精度丢失` / `ID 不对` | 雪花 ID 大数问题 | [#雪花 ID 精度问题](#6-雪花-id-精度丢失) |

---

## 问题诊断决策树

### 接口返回错误

```
接口返回错误
├─ 状态码 4xx
│  ├─ 400 → 请求参数格式/类型错误
│  │         检查：@RequestBody/@RequestParam、参数名称、类型
│  ├─ 401 → Token 过期/未登录
│  │         检查：Authorization 头、Token 是否有效、是否传递
│  ├─ 403 → 无权限访问
│  │         检查：@SaCheckPermission 配置、用户角色、菜单权限
│  └─ 404 → 接口路径不存在
│            检查：@RequestMapping 路径、Controller 是否扫描到
│
├─ 状态码 500
│  ├─ 控制台有堆栈 → 根据异常类型定位
│  │   ├─ NullPointerException → 对象未初始化/查询返回 null
│  │   ├─ SQLException → SQL 语法/字段名错误
│  │   ├─ ServiceException → 业务逻辑主动抛出
│  │   └─ 其他异常 → 查看具体异常信息
│  └─ 无堆栈信息 → 检查全局异常处理器是否吞掉了异常
│
└─ 状态码 200 但数据不对
   ├─ data 为 null，msg 有值
   │  └─ ⭐ R.ok(String) 陷阱！用 R.ok(null, str) 替代
   ├─ data 为 null，msg 也为 null
   │  ├─ 查询条件错误 → 检查 buildQueryWrapper
   │  ├─ 租户 ID 不匹配 → 检查 tenant_id
   │  └─ 数据被逻辑删除 → 检查 del_flag
   ├─ data 部分字段缺失
   │  └─ @AutoMappers 配置问题
   └─ data 格式不对（如 ID 精度丢失）
      └─ 雪花 ID 大数问题，需要 String 化
```

### 页面不显示/报错

```
页面问题
├─ 控制台有 JS 错误
│  ├─ TypeError → 类型错误，检查变量定义
│  ├─ ReferenceError → 引用错误，检查导入
│  └─ 组件报错 → 检查组件属性/插槽
│
├─ Network 有红色请求
│  └─ 接口问题 → 转到"接口返回错误"决策树
│
├─ 无错误但不显示
│  ├─ v-if 条件为 false → 检查条件逻辑
│  ├─ 数据未赋值 → 检查 .value 是否正确使用
│  ├─ 组件未注册 → 检查 import 和 components
│  └─ CSS display:none → 检查样式
│
└─ 样式问题
   └─ PC 端 → 检查是否误用 el-* 组件
```

---

## 分层定位指南

### 快速判断问题在哪一层

```
步骤 1：用 Postman/curl 直接调接口
├─ 返回正确数据 → 问题在【前端】
└─ 返回错误 → 问题在【后端】

步骤 2（后端问题）：打断点或加日志
├─ Controller 收到请求 → 问题在 Service/Mapper
├─ Controller 没收到 → URL 路径/扫描问题
└─ Controller 参数为空 → 请求参数传递问题

步骤 3（后端问题）：在数据库直接执行 SQL
├─ 有数据 → 查询条件构建问题（Service 层 buildQueryWrapper）
└─ 无数据 → 数据本身不存在/租户问题
```

### 各层常见问题速查

| 层级 | 常见问题 | 排查重点 |
|------|---------|---------|
| **Controller** | 参数绑定失败、路径 404 | `@RequestMapping`、`@RequestBody`、`@PathVariable` |
| **Service** | 业务逻辑错误、事务回滚、查询条件不对 | `@Transactional`、`buildQueryWrapper`、业务校验逻辑 |
| **Mapper** | SQL 语法、字段映射、类型转换 | `@TableName`、`@TableField`、XML SQL、字段类型匹配 |
| **前端 API** | 请求配置、参数格式 | `http.get/post`、Content-Type |
| **前端组件** | 响应式、生命周期 | `ref/reactive`、`onMounted` |

---

## 后端问题排查

### 常见错误类型

#### 1. NullPointerException

**原因**: 对象为 null 时调用方法或属性

**排查**:
```java
// 检查可能为 null 的位置
User user = baseMapper.selectById(id);  // 可能返回 null
user.getName();  // 如果 user 为 null 则报错

// 修复
if (user == null) {
    throw new ServiceException("用户不存在");
}
```

**本项目常见场景**:
- `baseMapper.selectById(id)` 返回 null
- `MapstructUtils.convert()` 源对象为 null
- 链式调用中间某环节为 null

#### 2. SQL 异常

**常见原因**:
- 字段名/表名错误
- SQL 语法错误
- 数据类型不匹配
- 唯一键冲突

**排查**:
```sql
-- 检查表是否存在
SHOW TABLES LIKE 'b_xxx';

-- 检查字段是否存在
DESC b_xxx;

-- 直接执行 SQL 查看错误
SELECT * FROM b_xxx WHERE id = 1;

-- 检查唯一键冲突
SELECT * FROM b_xxx WHERE unique_field = 'value';
```

#### 3. 权限问题

**表现**: 接口返回 401/403

**排查**:
```java
// 1. 检查是否添加了权限注解
@SaCheckPermission("base:ad:query")

// 2. 检查权限字符串是否正确（必须与菜单配置一致）
// 查询数据库
SELECT * FROM sys_menu WHERE perms = 'base:ad:query';

// 3. 检查用户是否有该角色
SELECT r.* FROM sys_role r
JOIN sys_user_role ur ON r.role_id = ur.role_id
WHERE ur.user_id = {userId};

// 4. 检查角色是否有该菜单权限
SELECT m.* FROM sys_menu m
JOIN sys_role_menu rm ON m.menu_id = rm.menu_id
WHERE rm.role_id = {roleId} AND m.perms = 'base:ad:query';
```

#### 4. 事务问题

**表现**: 数据不一致、部分成功

**排查**:
```java
// 1. 检查是否添加事务注解
@Transactional(rollbackFor = Exception.class)

// 2. 检查是否有嵌套事务（默认 REQUIRED 传播）
// 3. 检查异常是否被 try-catch 吞掉
try {
    // 操作
} catch (Exception e) {
    log.error("错误", e);  // ❌ 异常被吞掉，事务不回滚
    throw e;  // ✅ 需要重新抛出
}

// 4. 检查是否在非 public 方法上使用（不生效）
@Transactional  // ❌ private 方法不生效
private void doSomething() {}
```

### 日志分析

**日志位置**: 控制台输出 / 日志文件

**关键信息**:
```
1. 异常类型: NullPointerException, SQLException...
2. 异常信息: 具体错误描述
3. 堆栈信息: 定位到具体代码行（at org.dromara.xxx.XxxService:123）
4. 请求参数: 检查入参是否正确
```

**添加调试日志**:
```java
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class XxxServiceImpl implements IXxxService {
    public void doSomething(Long id) {
        log.info("开始处理, id: {}", id);
        // ...
        log.debug("中间状态: {}", state);
        log.info("处理完成, 结果: {}", result);
    }
}
```

### 日志文件分析（开发环境 - 重点！）

> **⭐ 新增能力**：开发环境现已配置日志文件，AI 可以直接读取分析！

#### 日志文件位置

**开发环境（非 prod）**：
- `./logs/sys-console.log` - 本次启动的完整日志（控制台输出）
  - 包含：INFO、WARN、ERROR 所有级别日志
  - 包含：SQL 日志（p6spy）、业务日志、系统日志
  - 格式：`日期 [线程] 级别 Logger名称 - 消息内容`

**生产环境（prod）**：
- `./logs/sys-console.log` - 控制台日志（保留 7 天）
- `./logs/sys-info.log` - INFO 日志（保留 60 天）
- `./logs/sys-error.log` - ERROR 日志（保留 60 天）
- `./logs/sys-sql.log` - SQL 日志（保留 7 天）

#### AI 自动读取日志流程（必须执行）

**触发条件**（满足任一即读取日志）：
1. 用户报告问题但未提供错误堆栈
2. 需要分析 SQL 执行情况
3. 需要查看业务流程日志
4. 需要定位异常发生的时间点
5. 用户说"看日志"、"分析日志"、"日志里有什么"

**执行步骤**：
```bash
# 步骤 1：读取最新日志（开发环境）
Read ./logs/sys-console.log

# 步骤 2：分析日志内容
# - 查找 ERROR/WARN 级别日志
# - 定位异常堆栈信息
# - 分析 SQL 执行耗时
# - 检查业务逻辑流程

# 步骤 3：给出诊断结果和解决方案
```

#### 日志内容识别规则

**日志格式**：
```
2026-01-08 22:12:10 [xxx] [http-nio-8080-exec-1] INFO  org.dromara.xxx.XxxService - 业务日志
2026-01-08 22:12:10 [xxx] [http-nio-8080-exec-1] INFO  p6spy - Execute SQL: SELECT ... | Cost: 5 ms
2026-01-08 22:12:10 [xxx] [http-nio-8080-exec-1] ERROR org.dromara.xxx.XxxService - 错误信息
```

**关键信息提取**：
| 信息类型 | 提取规则 | 用途 |
|---------|---------|------|
| **异常堆栈** | `ERROR` + 多行异常信息 | 定位错误原因 |
| **SQL 日志** | `INFO p6spy` | 分析查询性能、SQL 语法 |
| **业务流程** | `INFO/WARN` + 业务 Logger | 理解执行流程 |
| **执行耗时** | `Cost: X ms` | 性能分析 |
| **请求参数** | 日志中的参数输出 | 检查输入数据 |

#### 常见日志分析场景

**场景 1：接口报 500 错误**
```bash
# 1. 读取日志
Read ./logs/sys-console.log

# 2. 搜索 ERROR 关键字
grep "ERROR" ./logs/sys-console.log | tail -20

# 3. 定位异常类型（NullPointerException/SQLException等）
# 4. 查看堆栈信息，定位到具体代码行
# 5. 给出解决方案
```

**场景 2：查询慢/性能问题**
```bash
# 1. 读取日志
Read ./logs/sys-console.log

# 2. 查找 SQL 日志
grep "p6spy" ./logs/sys-console.log | tail -50

# 3. 分析 Cost 耗时
# - Cost < 50ms → 正常
# - Cost 50-200ms → 需要关注
# - Cost > 200ms → 需要优化

# 4. 检查是否有 N+1 查询
# 5. 给出优化建议（添加索引/使用批量查询）
```

**场景 3：功能不工作/无报错**
```bash
# 1. 读取完整日志
Read ./logs/sys-console.log

# 2. 按时间顺序查看业务流程日志
# 3. 定位哪一步没有执行或逻辑分支错误
# 4. 检查是否有 WARN 级别的警告
# 5. 分析可能的原因
```

**场景 4：租户数据问题**
```bash
# 1. 读取日志中的 SQL
grep "p6spy.*SELECT" ./logs/sys-console.log | tail -10

# 2. 检查 SQL 中的 tenant_id 条件
# 3. 对比数据库实际数据
# 4. 给出解决方案
```

#### 日志分析最佳实践

1. **优先读取日志文件**
   - ✅ 日志文件包含完整上下文（SQL + 业务逻辑）
   - ✅ 可以看到时间顺序和执行流程
   - ✅ 比用户描述更准确

2. **结合代码分析**
   - 从日志找到出错代码行号
   - Read 对应的代码文件
   - 分析代码逻辑

3. **时间线分析**
   - 按时间顺序查看日志
   - 理解请求的完整生命周期
   - 定位哪一步出现问题

4. **SQL 性能分析**
   - 关注 Cost 超过 200ms 的 SQL
   - 检查是否有重复查询
   - 建议添加索引或优化查询

#### 示例：完整的日志分析流程

```
用户问题：接口返回 500，但不知道原因

AI 执行：
1. Read ./logs/sys-console.log
   → 发现最后一个 ERROR：NullPointerException at XxxService.java:45

2. Read ruoyi-business/src/main/java/org/dromara/business/xxx/service/impl/XxxServiceImpl.java:45
   → 代码：user.getName()

3. 分析日志中的 SQL
   → 发现 SELECT * FROM sys_user WHERE id = 999 返回空

4. Bash 连接数据库验证
   → 确认 ID 999 的用户不存在

5. 给出诊断结果：
   - 原因：用户不存在时，代码未判空
   - 解决方案：添加 null 检查或改用 Optional
```

#### 日志文件维护说明

**自动清空机制**：
- 开发环境日志保留 1 天（`sys-console.log`）
- 保证日志只包含本次运行的内容
- 方便 AI 分析，无历史干扰

**如需保留历史日志**：
```bash
# 重启前备份日志
cp ./logs/sys-console.log ./logs/console-backup-$(date +%Y%m%d-%H%M%S).log
```

**日志过大处理**：
```bash
# 只查看最后 1000 行
Read ./logs/sys-console.log (offset: -1000)

# 或使用 tail 命令
tail -n 1000 ./logs/sys-console.log
```

---

## 本项目特有问题库（重点！）

### 1. R.ok() 返回 String 类型的陷阱（极易踩坑！）

当控制器返回类型为 `R<String>` 时，使用 `R.ok(stringValue)` 会导致数据放错位置！

```java
// ❌ 错误：R.ok(String) 会匹配到 ok(String msg) 方法
// 结果：stringValue 被放入 msg 字段，data 为 null
@GetMapping("/getCode")
public R<String> getCode() {
    String code = "ABC123";
    return R.ok(code);  // ❌ 前端收到 { code: 200, msg: "ABC123", data: null }
}

// ✅ 正确：使用 ok(String msg, T data) 方法，明确指定 data
@GetMapping("/getCode")
public R<String> getCode() {
    String code = "ABC123";
    return R.ok(null, code);  // ✅ 前端收到 { code: 200, msg: null, data: "ABC123" }
    // 或者
    return R.ok("获取成功", code);  // ✅ { code: 200, msg: "获取成功", data: "ABC123" }
}
```

**原因分析**：R 类有多个重载方法：
- `R.ok(T data)` - 泛型方法，将数据放入 data 字段
- `R.ok(String msg)` - 字符串方法，将字符串放入 msg 字段

当 `T` 也是 `String` 时，Java 优先匹配更具体的 `ok(String msg)` 方法，而不是泛型的 `ok(T data)`。

**排查场景**：
- 前端调用接口后 `data` 为 `null`，但响应 `msg` 中有数据
- 返回验证码、Token、URL 等字符串值时出现问题
- 接口返回 200 成功但前端取不到数据

### 2. 查询条件不生效

```java
// ❌ 错误：忘记添加条件判断（null/空字符串时也拼接条件）
private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
    LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
    lqw.eq(Xxx::getStatus, bo.getStatus());  // ❌ status 为 null 时会报错或查不到数据
    lqw.like(Xxx::getName, bo.getName());    // ❌ name 为空时会拼接 LIKE '%%'
    return lqw;
}

// ✅ 正确：在 Service 实现类的 buildQueryWrapper 中添加条件判断
@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements IXxxService {
    private final XxxMapper baseMapper;

    private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
        LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getStatus() != null, Xxx::getStatus, bo.getStatus());
        lqw.like(StringUtils.isNotBlank(bo.getName()), Xxx::getName, bo.getName());
        return lqw;
    }

    @Override
    public List<XxxVo> list(XxxBo bo) {
        LambdaQueryWrapper<Xxx> wrapper = buildQueryWrapper(bo);
        return baseMapper.selectVoList(wrapper);
    }
}
```

**排查场景**：
- 查询条件不生效（缺少条件判断）
- 分页查询结果不对（条件构建错误）
- 搜索功能不工作（like 条件处理错误）

### 3. 对象转换问题

```java
// ❌ 错误：MapstructUtils.convert() 返回 null
XxxVo vo = MapstructUtils.convert(entity, XxxVo.class);  // 返回 null

// 原因：BO/VO 类未配置 @AutoMapper 注解
// ✅ 正确：检查 XxxBo 类（使用单数 @AutoMapper）
@Data
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)
public class XxxBo extends BaseEntity {
    // 字段...
}

// ✅ XxxVo 类（通常不需要 @AutoMapper，由 BO 反向生成）
@Data
public class XxxVo implements Serializable {
    // 字段...
}
```

**排查步骤**：
1. 检查源对象是否为 null
2. 检查目标类是否有 `@AutoMappers` 注解
3. 检查 `@AutoMapper` 的 target 是否正确
4. 重新编译项目（Mapstruct 在编译时生成代码）

### 4. 租户数据问题

```sql
-- 检查数据是否在当前租户下
SELECT * FROM b_ad WHERE id = 1 AND tenant_id = '000000';

-- 检查请求头中的 tenant-id 是否正确传递
-- 前端需要在请求头中添加：
-- tenant-id: 000000
```

```java
// 检查 Entity 是否继承 TenantEntity
// ❌ 错误：继承 BaseEntity（无租户隔离）
public class Xxx extends BaseEntity { ... }

// ✅ 正确：继承 TenantEntity（有租户隔离）
public class Xxx extends TenantEntity { ... }
```

**排查场景**：
- 数据明明存在但查询不到
- 不同租户数据串了
- 新增数据没有 tenant_id

### 5. like 方法类型限制

> ⚠️ **like() 方法应仅用于 String 类型字段！非 String 类型应使用精确匹配方法。**

```java
// ❌ 错误：对非 String 类型使用 like
lqw.like(Xxx::getId, searchValue);          // ❌ Long 类型不适合模糊匹配
lqw.like(Xxx::getCreateTime, searchValue);  // ❌ Date 类型不适合模糊匹配

// ✅ 正确：like 仅用于 String 类型字段
lqw.like(StringUtils.isNotBlank(bo.getName()), Xxx::getName, bo.getName());  // ✅ String

// ✅ 非 String 类型使用 eq/in/between 等精确匹配
lqw.eq(bo.getId() != null, Xxx::getId, bo.getId());  // ✅ Long → eq
lqw.between(params.get("beginTime") != null && params.get("endTime") != null,
    Xxx::getCreateTime, params.get("beginTime"), params.get("endTime"));  // ✅ Date → between
```

**规则**：
| 字段类型 | 推荐方法 | 说明 |
|---------|---------|------|
| `String` | `like()` | 模糊匹配 |
| `Long/Integer` | `eq()`/`in()` | 精确匹配 |
| `Date/LocalDateTime` | `between()`/`ge()`/`le()` | 范围查询 |

**框架示例**（参考 `SysUserServiceImpl.java`）：
```java
.like(StringUtils.isNotBlank(user.getUserName()), SysUser::getUserName, user.getUserName())
.like(StringUtils.isNotBlank(user.getNickName()), SysUser::getNickName, user.getNickName())
.like(StringUtils.isNotBlank(user.getPhonenumber()), SysUser::getPhonenumber, user.getPhonenumber())
```

### 6. 雪花 ID 精度丢失

```java
// 问题：前端接收到的 ID 最后几位变成 0
// 后端返回：1234567890123456789
// 前端收到：1234567890123456000

// 原因：JavaScript Number 最大安全整数是 2^53-1 = 9007199254740991
// 雪花 ID 是 Long 类型，超出了 JS 精度范围

// ✅ 解决方案 1：VO 中使用 String 类型
public class XxxVo {
    private String id;  // 改为 String
}

// ✅ 解决方案 2：使用 @JsonSerialize 序列化为字符串
@JsonSerialize(using = ToStringSerializer.class)
private Long id;

// ✅ 解决方案 3：全局配置（本项目已配置）
// 检查 JacksonConfig 是否生效
```

### 7. API 调用格式错误

```typescript
// ❌ 错误：使用 try-catch
try {
  const data = await pageXxxs(params)
} catch (error) {
  console.error(error)
}

// ✅ 正确：使用 [err, data] 格式
const [err, data] = await pageXxxs(params)
if (!err) {
  dataList.value = data.records
}
```

**本项目规范**：API 调用统一使用 `[err, data]` 格式，不使用 try-catch。

### 8. Service 继承基类问题

```java
// ❌ 错误：继承 ServiceImpl（违反项目规范）
public class XxxServiceImpl extends ServiceImpl<XxxMapper, Xxx> implements IXxxService {
    // 本项目是三层架构，不使用 ServiceImpl 基类
}

// ✅ 正确：不继承任何基类，直接注入 Mapper
@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements IXxxService {
    private final XxxMapper baseMapper;  // 直接注入 Mapper（三层架构无 DAO 层）
}
```

### 9. 逻辑删除数据仍能查到

```java
// 检查 Entity 是否有 @TableLogic 注解
// 注意：逻辑删除字段在各 Entity 中自行定义，不在 BaseEntity/TenantEntity 中
@TableLogic
private Long delFlag;  // TestDemo 等用 Long 类型

// 或
@TableLogic
private String delFlag;  // SysUser 等用 String 类型

// 检查表中 del_flag 字段值
// 0 = 未删除（正常）
// 非0 = 已删除（框架使用雪花 ID 作为删除标记值）

// 如果需要查询已删除数据，使用：
// mapper.selectList(Wrappers.<Xxx>query().ne("del_flag", 0));
```

### 10. Bean 注入失败

```java
// NoSuchBeanDefinitionException: No qualifying bean of type 'xxx'

// 排查步骤：
// 1. 检查是否添加了 @Service/@Repository/@Component
@Service
public class XxxServiceImpl implements IXxxService { ... }

// 2. 检查包路径是否在扫描范围内
// 必须在 org.dromara.* 包下

// 3. 检查是否有循环依赖
// A 依赖 B，B 又依赖 A

// 4. 检查接口和实现类是否匹配
// IXxxService 接口
// XxxServiceImpl 实现
```

---

## 前端问题排查

### 常见错误类型

#### 1. 接口调用失败

**排查步骤**:
1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 查看请求状态码和响应内容

**常见状态码**:
| 状态码 | 含义 | 解决方案 |
|--------|------|---------|
| 400 | 请求参数错误 | 检查请求参数类型、格式 |
| 401 | 未认证 | 检查 Token 是否有效、是否传递 |
| 403 | 无权限 | 检查权限配置、角色分配 |
| 404 | 接口不存在 | 检查 URL 路径、后端是否启动 |
| 500 | 服务端错误 | 查看后端控制台日志 |

#### 2. 页面渲染问题

**排查**:
```typescript
// 检查数据是否正确获取
console.log('API 返回:', data)

// 检查响应式数据是否正确赋值
console.log('ref value:', someRef.value)

// 使用 Vue Devtools 查看组件状态
// Chrome 扩展：Vue.js devtools
```

#### 3. 状态不更新

**常见原因**:
- 直接修改 reactive 对象的引用
- 数组操作未触发响应式
- 深层对象属性变化未检测

**修复**:
```typescript
// ❌ 错误：直接替换引用
list = newList

// ✅ 正确：修改 .value
list.value = newList
list.value.push(item)
list.value.splice(index, 1)

// ❌ 错误：直接修改 reactive 对象属性
Object.assign(form, newData)

// ✅ 正确：逐个赋值或使用展开
Object.keys(newData).forEach(key => {
  form[key] = newData[key]
})
```

#### 4. 组件使用错误

```vue
<!-- ❌ 错误：使用原生 Element Plus 组件 -->
<el-input v-model="form.name" />
<el-dialog v-model="visible" />

<!-- ✅ 正确：使用项目封装的 A* 组件 -->
<AFormInput v-model="form.name" label="名称" prop="name" />
<AModal v-model="visible" />
```

### 调试技巧

```typescript
// 打断点
debugger

// 控制台日志
console.log('变量值:', value)
console.table(arrayData)  // 表格形式显示数组
console.dir(object)  // 展开对象结构

// Vue Devtools
// 安装 Chrome 扩展，查看组件树、状态、事件
```

---

## 数据库问题排查

### 主动排查流程（AI 自动执行）

> **重要**：当排查涉及数据问题时，AI 应主动连接数据库进行验证，而不只是给出 SQL 让用户执行。

#### 步骤 1：读取数据库配置

```bash
# 首先读取配置文件，获取数据库连接信息
Read ruoyi-admin/src/main/resources/application-dev.yml
```

从配置中解析：
- 数据库类型（MySQL/Oracle/PostgreSQL/SQL Server）
- 主机地址（`${DB_HOST:127.0.0.1}`）
- 端口（`${DB_PORT:3306}`）
- 数据库名（`${DB_NAME:xxx}`）
- 用户名/密码

#### 步骤 2：连接数据库执行查询

根据数据库类型选择连接命令：

```bash
# MySQL（最常用）
mysql -h127.0.0.1 -P3306 -uroot -p密码 数据库名 -e "SELECT * FROM b_xxx WHERE id = 1"

# PostgreSQL
PGPASSWORD=密码 psql -h 127.0.0.1 -p 5432 -U root -d 数据库名 -c "SELECT * FROM b_xxx WHERE id = 1"

# SQL Server
sqlcmd -S 127.0.0.1,1433 -U sa -P 密码 -d 数据库名 -Q "SELECT * FROM b_xxx WHERE id = 1"
```

#### 步骤 3：根据结果分析问题

```
查询结果分析决策树：
├─ 返回数据
│  ├─ 数据正确 → 问题不在数据库，转查代码
│  ├─ 数据不对 → 分析哪个字段有问题
│  └─ 数据被删除（del_flag='1'）→ 数据已逻辑删除
├─ 无数据返回
│  ├─ 检查 tenant_id → 是否租户不匹配
│  ├─ 检查 del_flag → 是否被删除
│  └─ 检查 ID 值 → 是否 ID 错误
└─ 执行报错
   ├─ 表不存在 → 检查表名/数据库
   ├─ 字段不存在 → 检查字段名
   └─ 语法错误 → 检查 SQL 语法
```

### 常用排查 SQL 模板

#### 数据存在性检查

```sql
-- 基础检查
SELECT * FROM [表名] WHERE id = [ID值];

-- 含租户和逻辑删除检查
SELECT * FROM [表名] WHERE id = [ID值] AND tenant_id = '000000' AND del_flag = '0';

-- 检查最近的数据
SELECT * FROM [表名] ORDER BY create_time DESC LIMIT 10;
```

#### 数据关联检查

```sql
-- 检查关联数据
SELECT a.*, b.*
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id
WHERE a.id = [ID值];

-- 检查外键引用
SELECT * FROM [子表] WHERE [外键字段] = [主表ID];
```

#### 权限数据检查

```sql
-- 检查用户权限
SELECT DISTINCT m.perms
FROM sys_menu m
JOIN sys_role_menu rm ON m.menu_id = rm.menu_id
JOIN sys_user_role ur ON rm.role_id = ur.role_id
WHERE ur.user_id = [用户ID] AND m.perms IS NOT NULL;

-- 检查菜单是否存在
SELECT * FROM sys_menu WHERE perms = '[权限字符串]';
```

#### 字典数据检查

```sql
-- 检查字典类型
SELECT * FROM sys_dict_type WHERE dict_type = '[字典类型]';

-- 检查字典数据
SELECT * FROM sys_dict_data WHERE dict_type = '[字典类型]' ORDER BY dict_sort;
```

#### 性能问题检查

```sql
-- 查看执行计划
EXPLAIN SELECT * FROM [表名] WHERE [条件];

-- type 字段说明：
-- ALL = 全表扫描（需要优化）
-- index = 索引扫描
-- range = 范围扫描
-- ref = 使用索引
-- const = 常量查询（最优）

-- 检查索引
SHOW INDEX FROM [表名];

-- 检查表结构
DESC [表名];
SHOW CREATE TABLE [表名];
```

### 场景化排查指南

| 问题场景 | 排查 SQL | 说明 |
|---------|---------|------|
| 数据查不到 | `SELECT * FROM 表 WHERE id=? AND tenant_id='000000' AND del_flag='0'` | 检查三要素 |
| 权限不足 | `SELECT perms FROM sys_menu WHERE menu_id IN (SELECT menu_id FROM sys_role_menu WHERE role_id=?)` | 检查角色权限 |
| 字典不显示 | `SELECT * FROM sys_dict_data WHERE dict_type=?` | 检查字典数据 |
| ID 重复 | `SELECT id, COUNT(*) FROM 表 GROUP BY id HAVING COUNT(*) > 1` | 检查重复数据 |
| 关联数据丢失 | `SELECT a.id FROM 主表 a LEFT JOIN 子表 b ON a.id=b.主表id WHERE b.id IS NULL` | 检查孤立数据 |

### 多数据库注意事项

| 功能 | MySQL | PostgreSQL | Oracle | SQL Server |
|------|-------|------------|--------|------------|
| 分页 | `LIMIT 10` | `LIMIT 10` | `ROWNUM <= 10` | `TOP 10` |
| 字符串连接 | `CONCAT()` | `||` | `||` | `+` |
| 当前时间 | `NOW()` | `NOW()` | `SYSDATE` | `GETDATE()` |
| 类型转换 | `CAST()` | `CAST()` / `::` | `TO_CHAR()` | `CONVERT()` |

> **提示**：`like()` 方法仅适用于 String 类型字段。非 String 类型（Long/Date 等）应使用 `eq()`/`in()`/`between()` 等精确匹配方法。

---

## 常见问题速查表

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 接口 404 | URL 错误 / 后端未启动 | 检查 URL，重启后端 |
| 接口 500 | 后端代码异常 | 查看后端控制台日志 |
| 数据为空 | 条件错误 / 数据不存在 | 检查 SQL 条件 |
| **R\<String\> data 为 null** | **R.ok(str) 匹配到 ok(String msg)** | **用 R.ok(null, str) 或 R.ok(msg, str)** |
| 对象转换失败 | @AutoMappers 未配置 | 检查 BO/VO 注解 |
| 租户数据查不到 | tenant_id 不匹配 | 检查请求头 tenant-id |
| like 报错 | 非 String 类型 | 改用 eq/in/between |
| ID 精度丢失 | JS 大数问题 | Long 改 String 或加序列化 |
| 页面空白 | JS 错误 / 路由错误 | 查看控制台错误 |
| 样式错乱 | CSS 冲突 / 单位问题 | 检查样式优先级 |
| 表单不提交 | 校验失败 / 方法错误 | 检查校验规则 |
| 权限不足 | 角色未配置 / Token 过期 | 检查权限配置 |
| 事务不回滚 | 异常被吞 / 非 public 方法 | 检查 @Transactional 使用 |
| Bean 注入失败 | 未加注解 / 包路径错误 | 检查 @Service 和包路径 |

---

## 调试建议

1. **保持冷静**: 不要急于修改代码
2. **复现问题**: 确保问题可以稳定复现
3. **二分法**: 逐步缩小问题范围
4. **看日志**: 日志是最重要的线索
5. **查文档**: 确认 API 用法是否正确
6. **搜索**: 错误信息通常能搜到解决方案
7. **最小复现**: 创建最小示例复现问题

---

## Skill 联动建议

| 排查发现 | 推荐激活 | 说明 |
|---------|---------|------|
| 查询性能慢 | `performance-doctor` | 需要优化索引或缓存 |
| 权限配置问题 | `security-guard` | 需要调整权限设计 |
| SQL 语法错误 | `database-ops` | 需要检查表结构或建表 |
| PC 组件使用错误 | `ui-pc` | 需要了解 A* 组件用法 |
| 对象转换失败 | `crud-development` | 需要检查 BO/VO 配置 |
| 异常处理缺失 | `error-handler` | 需要设计异常机制 |
| API 设计问题 | `api-development` | 需要了解接口规范 |

### 数据库直连排查（内置能力，无需激活其他技能）

> **配置文件位置**：`ruoyi-admin/src/main/resources/application-dev.yml`

当遇到以下情况时，**直接读取配置并连接数据库**：

| 问题类型 | 排查 SQL |
|---------|---------|
| 数据查不到 | `SELECT * FROM 表名 WHERE id = ? AND tenant_id = '000000' AND del_flag = '0'` |
| 数据不一致 | `SELECT * FROM 关联表 WHERE 外键 = ?` |
| 权限报错 | `SELECT * FROM sys_menu WHERE menu_id = ?` |
| 字典不显示 | `SELECT * FROM sys_dict_data WHERE dict_type = '?'` |
| 性能问题 | `EXPLAIN SELECT ...` |

**执行流程（3 步）**：
```
1. Read ruoyi-admin/src/main/resources/application-dev.yml → 获取连接信息
2. Bash 连接数据库 → mysql -h127.0.0.1 -P3306 -uroot -proot 数据库名
3. 执行诊断 SQL → 分析结果给出方案
```

**连接命令速查**：
```bash
# MySQL（默认）
mysql -h127.0.0.1 -P3306 -u用户名 -p密码 数据库名 -e "SQL语句"

# PostgreSQL
PGPASSWORD=密码 psql -h 127.0.0.1 -p 5432 -U 用户名 -d 数据库名 -c "SQL语句"

# SQL Server
sqlcmd -S 127.0.0.1,1433 -U 用户名 -P 密码 -d 数据库名 -Q "SQL语句"
```

---

## 排查流程决策树（完整版）

### 判断问题在哪一层

```
现象：功能不工作、数据不正确、接口返回错误
     ↓
第 1 步：用 Postman 或浏览器直接调接口
     ├─ 返回正确数据 → 问题在【前端层】
     │  └─ 检查：@RestController 路径、@Validated、参数绑定
     │
     └─ 返回错误（4xx/5xx） → 问题在【后端层】
        └─ 进入"后端问题排查流程"（见下）

后端问题排查流程：
     ↓
第 2 步：读取 ./logs/sys-console.log（开发环境）
     ├─ 有 ERROR 日志 → 查看堆栈信息
     │  ├─ NullPointerException → 对象未初始化或查询返回 null
     │  ├─ SQLException → SQL 字段/表名/语法错误
     │  ├─ ServiceException → 业务逻辑主动抛出异常
     │  └─ 其他异常 → 根据具体异常信息定位
     │
     └─ 无 ERROR 日志或日志看不出问题 → 进入"分层定位"
        └─ 第 3 步：打断点或加日志（按调用链向下）
           ├─ Controller 收到请求，参数正确 → 问题在 Service/Mapper
           ├─ Controller 没收到请求 → URL 路径/扫描问题
           └─ Controller 参数为空 → 请求参数传递问题

分层定位（从上到下）：
     Controller 层：检查 @RequestMapping、@RequestBody、参数类型
          ↓ 参数正确
     Service 层：检查业务逻辑、@Transactional、数据转换
          ↓ 逻辑正确
     Mapper 层（查询构建）：检查 buildQueryWrapper、查询条件、字段类型匹配
          ↓ 条件正确
     Mapper 层：检查 SQL 语句、字段映射、表名
          ↓ SQL 正确
     数据库：直接执行 SQL 验证数据
```

---

## 排查清单

### 后端排查清单

- [ ] **是否读取了日志文件？** (`./logs/sys-console.log`)
- [ ] **异常堆栈中的类名包名是否为 `org.dromara.*`？**
- [ ] **是否检查了 Controller 的 @RequestMapping 路径？**
- [ ] **参数绑定是否使用了 @RequestBody/@RequestParam？**
- [ ] **Service 是否继承了 ServiceImpl（不应该）？**
- [ ] **Service 的 buildQueryWrapper 中是否正确构建查询条件？**
- [ ] **非字符串字段是否使用了 eq/in/between 而不是 like？**
- [ ] **Entity 是否继承了 TenantEntity（多租户）？**
- [ ] **MapstructUtils.convert() 是否正确配置了 @AutoMapper？**
- [ ] **R.ok(String) 是否改用了 R.ok(null, value) 或 R.ok(msg, value)？**
- [ ] **返回值类型是否符合规范？（LIST→TableDataInfo, GET→R<T>, EXPORT→void）**
- [ ] **数据库中是否真的存在需要的数据？（SQL 验证）**

### 前端排查清单

- [ ] **是否打开了浏览器开发者工具 (F12)？**
- [ ] **Network 中接口状态码是多少？（400/401/403/404/500）**
- [ ] **响应数据中 code/msg/data 字段是否有值？**
- [ ] **是否使用了 [err, data] 格式而不是 try-catch？**
- [ ] **数据是否正确赋值给了响应式变量？（.value）**
- [ ] **组件是否使用了封装的 A* 组件而不是原生 Element Plus？**
- [ ] **v-if 条件是否为 true？**
- [ ] **CSS 是否隐藏了元素？（display:none）**

---

## 最佳实践

### 1. 日志优先原则

```
问题出现 → 【立即读取日志】→ 95% 的问题能在日志中找到根本原因
```

**为什么日志最重要**：
- ✅ 包含完整的执行上下文（时间、线程、SQL）
- ✅ 不依赖用户的口头描述
- ✅ 可以看到时间顺序和流程
- ✅ SQL 日志显示实际执行的 SQL 和耗时

### 2. 分层排查原则

不要一上来就改代码，要按这个顺序排查：
1. **外部因素**：数据库连接、请求参数、权限配置
2. **日志分析**：找堆栈、定位异常类型
3. **代码路径**：从 Controller 开始向下逐层检查
4. **数据库验证**：直接执行 SQL 对比实际数据

### 3. 重现问题原则

不能稳定重现的问题很难排查，所以：
- ✅ 找到稳定复现的步骤
- ✅ 记录每一步的输入和输出
- ✅ 隔离变量（先排除前端，再排除中间件）

### 4. 代码版本原则

修改代码前：
- ✅ 理解问题的根本原因
- ✅ 制定解决方案
- ✅ 再进行修改

不要：
- ❌ 盲目改代码希望能解决问题
- ❌ 加一堆 try-catch 来"压制"错误
- ❌ 重复修改同一个地方

---

## 常见误区

| 误区 | 错误做法 | 正确做法 |
|------|--------|--------|
| 日志没看 | 直接改代码 | 先读日志找原因 |
| 包名错 | 使用 `org.dromara.*` | 必须 `org.dromara.*` |
| R.ok() 陷阱 | `return R.ok(str)` 返回字符串 | `return R.ok(null, str)` |
| Service 架构 | `extends ServiceImpl<>` | `implements IXxxService` 不继承 |
| 查询构建 | new LambdaQueryWrapper 直接用 | Service 层 buildQueryWrapper 方法 |
| like 方法 | Long/Date 字段用 `.like()` | 必须用 `.eq()`/`.between()` |
| 对象转换 | `BeanUtil.copyProperties()` | `MapstructUtils.convert()` |
| 前端 API | `try-catch` 调用 API | `const [err, data] = await api()` |
| Bean 扫描 | 其他包路径 | 必须 `org.dromara.*` |

---

## 快速参考

### 常见错误速查

```
NullPointerException         → 对象为空，加 null 检查
SQLException                → SQL 错误，检查字段/表名
ClassNotFoundException       → 类未找到，检查包路径
403 Forbidden              → 权限不足，检查 @SaCheckPermission
404 Not Found              → 路径错误，检查 @RequestMapping
500 Internal Server Error  → 服务异常，读日志
data 为 null，msg 有值      → R.ok(String) 陷阱，改 R.ok(null, value)
ID 精度丢失                 → 雪花 ID 大数，Long 改 String
like 报错                  → 非字符串用 eq/in/between
```

### 排查工具速查

| 问题类型 | 使用工具 | 命令/方法 |
|---------|--------|---------|
| 后端异常 | 日志文件 | `Read ./logs/sys-console.log` |
| 前端错误 | 浏览器 DevTools | F12 → Console/Network |
| SQL 执行 | 数据库客户端 | `mysql -h... -u... -p...` |
| 代码定位 | IDE 调试器 | 打断点 → F5 单步执行 |
| 性能分析 | 日志中的 Cost | 关注 `Cost: XXms` |
| 权限问题 | 数据库查询 | `SELECT * FROM sys_menu WHERE perms='...'` |

---

## Skill 联动

| 排查发现 | 推荐激活 | 用途 |
|---------|--------|------|
| 需要优化 SQL 性能 | `performance-doctor` | SQL 索引优化、缓存策略 |
| 权限配置问题 | `security-guard` | Sa-Token、权限设计 |
| 代码规范违反 | `code-patterns` | 快速查看禁止项和规范 |
| API 设计问题 | `api-development` | RESTful 规范、注解用法 |
| 前端组件用法 | `ui-pc` | Element Plus 组件 |
| BO/VO 映射错误 | `crud-development` | @AutoMappers、对象转换 |
| 数据库表设计 | `database-ops` | 建表、字段定义、索引 |
| 需要设计异常机制 | `error-handler` | 全局异常处理、错误码系统 |
