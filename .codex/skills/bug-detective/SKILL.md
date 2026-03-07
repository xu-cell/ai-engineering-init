---
name: bug-detective
description: |
  通用 Bug 排查指南。提供分层定位方法论、日志分析技巧、HTTP 错误码诊断决策树。
  触发场景：Bug 排查、错误分析、日志诊断、线上问题定位。
  触发词：Bug、排查、报错、异常、日志分析、线上问题。
  注意：如果项目有专属技能（如 `leniu-bug-detective`），优先使用专属版本。
---

# Bug 排查指南

> 通用模板。如果项目有专属技能（如 `leniu-bug-detective`），优先使用。

## 核心规范

### 排查方法论：分层定位

```
[问题现象]
    │
    ▼
[1. 复现] ── 能否稳定复现？记录复现步骤
    │
    ▼
[2. 定位层] ── 问题出在哪一层？
    │
    ├── 前端层 ── 浏览器控制台、网络请求、渲染问题
    ├── 网关层 ── 路由、限流、认证
    ├── 接口层 ── 参数校验、序列化
    ├── 业务层 ── 业务逻辑、数据状态
    ├── 数据层 ── SQL、数据一致性
    └── 基础设施 ── 网络、配置、资源
    │
    ▼
[3. 缩小范围] ── 二分法排除
    │
    ▼
[4. 根因分析] ── 找到根本原因，而非表象
    │
    ▼
[5. 修复验证] ── 修复 + 回归测试
```

### 信息收集清单

排查前先收集：

- [ ] 错误信息 / 错误码 / 堆栈
- [ ] 发生时间、频率
- [ ] 影响范围（所有用户 / 特定用户 / 特定数据）
- [ ] 最近的代码变更（最近一次部署了什么）
- [ ] 环境信息（开发 / 测试 / 生产）
- [ ] 能否复现，复现步骤

### 前后端分离定位

```
步骤 1：Postman/curl 直接调接口
├── 返回正确 → 问题在前端（请求参数、渲染、状态管理）
└── 返回错误 → 问题在后端（继续向下排查）

步骤 2（后端）：读应用日志
├── 有 ERROR 堆栈 → 定位异常类和行号
└── 无 ERROR → 打断点或加诊断日志逐层排查

步骤 3：按调用链向下
Controller → Service → Mapper → 数据库
```

## HTTP 错误码诊断决策树

### 4xx 客户端错误

```
400 Bad Request
├── 请求参数格式错误？ → 检查 JSON 格式、字段类型
├── 参数校验失败？ → 检查 @Valid 注解和 DTO 约束
└── Content-Type 不匹配？ → 检查请求头

401 Unauthorized
├── Token 缺失？ → 检查请求头是否携带认证信息
├── Token 过期？ → 检查 Token 有效期
└── Token 无效？ → 检查签发逻辑和密钥

403 Forbidden
├── 角色/权限不足？ → 检查权限配置
├── IP 白名单？ → 检查网关或防火墙配置
└── CORS 跨域？ → 检查跨域配置

404 Not Found
├── URL 拼写错误？ → 对照 API 文档
├── 路由未注册？ → 检查 Controller 注解和包扫描路径
├── 资源确实不存在？ → 检查数据库数据
└── 网关路由未配置？ → 检查网关转发规则

405 Method Not Allowed
└── HTTP 方法不匹配？ → GET vs POST，检查 Controller 映射

409 Conflict
└── 数据冲突？ → 唯一约束、并发修改、乐观锁失败
```

### 5xx 服务端错误

```
500 Internal Server Error
├── NullPointerException → 检查空值处理
├── SQL 异常 → 检查 SQL 语法、字段类型
├── 类型转换异常 → 检查数据格式
├── 序列化异常 → 检查对象中的循环引用、日期格式
└── 第三方调用失败 → 检查外部服务状态

502 Bad Gateway
├── 后端服务未启动？ → 检查进程状态
├── 端口未监听？ → 检查端口占用
└── 反向代理配置错误？ → 检查 Nginx/网关配置

503 Service Unavailable
├── 服务过载？ → 检查 CPU/内存/线程池
├── 熔断触发？ → 检查熔断器状态
└── 正在部署？ → 检查发布状态

504 Gateway Timeout
├── 慢查询？ → 检查 SQL 执行计划
├── 外部调用超时？ → 检查第三方服务响应时间
└── 超时配置过短？ → 调整网关/代理超时设置
```

## 日志分析技巧

### 关键信息提取

```bash
# 按关键字搜索错误
grep -n "ERROR\|Exception\|WARN" app.log | tail -50

# 按时间范围过滤
sed -n '/2024-01-01 10:00/,/2024-01-01 10:30/p' app.log

# 按请求 ID 追踪（如果有链路追踪）
grep "traceId=abc123" app.log

# 统计错误类型分布
grep "Exception" app.log | awk -F: '{print $NF}' | sort | uniq -c | sort -rn

# 查看某个时间点前后的上下文
grep -n "OutOfMemoryError" app.log  # 先找到行号
sed -n '95,115p' app.log             # 查看前后各 10 行
```

### 日志级别含义

| 级别 | 用途 | 排查价值 |
|------|------|---------|
| ERROR | 系统错误，需要立即关注 | 最高，直接定位问题 |
| WARN | 潜在问题，可能导致错误 | 高，可能是问题前兆 |
| INFO | 业务关键节点 | 中，了解业务流程 |
| DEBUG | 详细调试信息 | 开发环境排查用 |
| TRACE | 最详细的跟踪信息 | 极少使用 |

### 常见日志模式识别

```
# 连接池耗尽
"Cannot get a connection, pool error Timeout waiting for idle object"
→ 检查连接池配置、是否有连接泄漏

# 内存溢出
"java.lang.OutOfMemoryError: Java heap space"
→ 检查堆内存配置、是否有内存泄漏

# 死锁
"Deadlock found when trying to get lock"
→ 检查事务范围、锁顺序

# 慢 SQL
"SlowQuery: execution time exceeds"
→ 分析 SQL 执行计划，添加索引
```

## 代码示例

### 排查辅助：添加诊断日志

```java
@Slf4j
@Service
public class OrderServiceImpl {

    public OrderVO getOrderDetail(Long id) {
        log.info("查询订单详情, id={}", id);

        Order order = orderMapper.selectById(id);
        if (order == null) {
            log.warn("订单不存在, id={}", id);
            throw new [你的业务异常类]("订单不存在");
        }

        log.debug("订单数据: status={}, amount={}", order.getStatus(), order.getAmount());
        // ... 业务逻辑
        return orderVO;
    }
}
```

### 排查辅助：请求链路追踪

```java
// 使用 MDC 添加请求上下文
@Component
public class TraceInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        String traceId = request.getHeader("X-Trace-Id");
        if (traceId == null) {
            traceId = UUID.randomUUID().toString().replace("-", "");
        }
        MDC.put("traceId", traceId);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        MDC.clear();
    }
}
```

```xml
<!-- logback 配置中包含 traceId -->
<pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] [%X{traceId}] %-5level %logger{36} - %msg%n</pattern>
```

### 常见 Bug 排查模板

```markdown
## Bug 报告

**现象**：[描述用户看到的问题]

**复现步骤**：
1. ...
2. ...
3. ...

**预期行为**：[应该发生什么]

**实际行为**：[实际发生了什么]

**环境**：[开发/测试/生产]

**日志/截图**：[关键日志片段]

---

## 排查过程

**定位层**：[前端/网关/接口/业务/数据/基础设施]

**根因**：[根本原因分析]

**修复方案**：[如何修复]

**回归验证**：[如何确认修复有效]
```

### 常见问题速查

| 问题 | 可能原因 | 排查方向 |
|------|---------|---------|
| 接口 404 | URL 错误/服务未启动 | 检查路由映射、服务状态 |
| 接口 500 | 后端异常 | 读应用日志 ERROR 堆栈 |
| 数据查不到 | 条件错误/逻辑删除/权限 | 检查 SQL、deleted 字段、数据权限 |
| 事务不回滚 | 异常被吞/非 public/this 调用 | 检查 @Transactional、代理调用 |
| Bean 注入失败 | 包扫描/注解缺失 | 检查包路径、@Service/@Component |
| 对象转换字段丢失 | 字段名不匹配 | 检查源和目标对象字段名 |
| 雪花 ID 精度丢失 | JS Number 精度限制 | Long 序列化为 String |

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| 看到错误就改代码 | 先理解根因再修复 |
| 只看最后一行异常信息 | 从 `Caused by` 往上找根因 |
| 生产环境开 DEBUG 日志 | 临时开启，问题解决后立即关闭 |
| 修复后不验证 | 修复后必须复现场景验证 |
| 只修表象不修根因 | 加 null 判断不如搞清楚为什么是 null |
| 修复时引入新 Bug | 修复范围最小化，充分回归 |
| 依赖"重启解决" | 重启只是临时手段，必须找到根因 |
| 忽略 WARN 日志 | WARN 往往是问题的前兆 |
