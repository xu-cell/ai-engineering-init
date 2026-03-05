---
name: tech-decision
description: |
  当需要进行技术选型、对比方案时自动使用此 Skill。

  触发场景：
  - 选择用什么技术/库
  - 对比不同方案
  - 技术决策
  - 评估优缺点
  - 选择 ruoyi-common 模块

  触发词：选型、用什么、对比、哪个好、优缺点、选择、技术方案、库、框架、工具、模块
---

# 技术决策指南

## 本项目技术栈（精确版本）

### 后端核心技术

| 技术 | 版本 | 用途 | 模块位置 |
|------|------|------|---------|
| **Spring Boot** | 3.5.9 | 基础框架 | 全局 |
| **Java** | 17 | 开发语言 | 全局 |
| **MyBatis-Plus** | 3.5.16 | ORM 框架 | ruoyi-common-mybatis |
| **Sa-Token** | 1.44.0 | 权限认证 | ruoyi-common-satoken |
| **Hutool** | 5.8.43 | 工具库 | ruoyi-common-core |
| **Redisson** | 3.52.0 | Redis 客户端增强 | ruoyi-common-redis |
| **MapStruct-Plus** | 1.5.0 | 对象映射 | 全局 |
| **SpringDoc** | 2.8.15 | API 文档 | ruoyi-common-doc |
| **Lombok** | 1.18.42 | 代码简化 | 全局 |
| **FastExcel** | 1.3.0 | Excel 处理 | ruoyi-common-excel |

### 后端扩展技术

| 技术 | 版本 | 用途 | 模块位置 |
|------|------|------|---------|
| **Lock4j** | 2.2.7 | 分布式锁 | ruoyi-common-redis |
| **SnailJob** | 1.9.0 | 分布式任务调度 | ruoyi-common-job |
| **AWS SDK** | 2.28.22 | 对象存储 | ruoyi-common-oss |
| **SMS4j** | 3.3.5 | 短信服务 | ruoyi-common-sms |
| **JustAuth** | 1.16.7 | 第三方登录 | ruoyi-common-social |
| **IP2Region** | 3.3.4 | IP 地址定位 | ruoyi-common-core |
| **P6spy** | 3.9.1 | SQL 日志 | 开发环境 |
| **Dynamic-DS** | 4.3.1 | 多数据源 | ruoyi-common-mybatis |
| **Warm-Flow** | 1.8.4 | 工作流引擎 | ruoyi-workflow |
| **BouncyCastle** | 1.80 | 加密算法 | ruoyi-common-encrypt |

---

## ruoyi-common 模块速查（24个模块）

### 🔴 高频使用模块（几乎每个项目都用）

| 模块 | 说明 | 典型场景 |
|------|------|---------|
| `ruoyi-common-core` | 核心工具类 | StringUtils、MapstructUtils、异常处理 |
| `ruoyi-common-mybatis` | MyBatis 增强 | Mapper 基类（BaseMapperPlus）、分页、查询构建器、多数据源 |
| `ruoyi-common-redis` | Redis 缓存 | 缓存、分布式锁、延迟队列 |
| `ruoyi-common-satoken` | 权限认证 | 登录、权限控制、Token 管理 |
| `ruoyi-common-web` | Web 基础 | 拦截器、过滤器、跨域 |
| `ruoyi-common-json` | JSON 序列化 | Jackson 配置、Long 精度处理 |
| `ruoyi-common-log` | 日志记录 | 操作日志、登录日志 |
| `ruoyi-common-doc` | API 文档 | SpringDoc/Swagger 文档生成 |

### 🟡 按需使用模块（根据业务需求）

#### 数据处理

| 模块 | 说明 | 使用场景 |
|------|------|---------|
| `ruoyi-common-excel` | Excel 导入导出 | 数据导入、报表导出 |
| `ruoyi-common-oss` | 对象存储 | 文件上传（S3/MinIO/阿里云/腾讯云） |
| `ruoyi-common-encrypt` | 数据加密 | 数据库字段加密存储 |
| `ruoyi-common-sensitive` | 数据脱敏 | 手机号、身份证脱敏显示 |
| `ruoyi-common-translation` | 数据翻译 | ID→名称、字典→标签自动转换 |

#### 通信与消息

| 模块 | 说明 | 使用场景 |
|------|------|---------|
| `ruoyi-common-websocket` | WebSocket | 实时消息推送、在线聊天 |
| `ruoyi-common-sse` | 服务端推送 | 流式响应、单向推送 |
| `ruoyi-common-mail` | 邮件发送 | 通知邮件、验证码 |
| `ruoyi-common-sms` | 短信发送 | 短信验证码、营销短信 |

#### 系统功能

| 模块 | 说明 | 使用场景 |
|------|------|---------|
| `ruoyi-common-tenant` | 多租户 | SaaS 多租户隔离 |
| `ruoyi-common-job` | 任务调度 | 定时任务（SnailJob） |
| `ruoyi-common-idempotent` | 幂等控制 | 防重复提交 |
| `ruoyi-common-ratelimiter` | 接口限流 | 防刷、保护接口 |
| `ruoyi-common-social` | 社交登录 | 第三方平台登录（JustAuth） |
| `ruoyi-common-security` | 应用安全 | XSS 防护、SQL 注入防护 |

---

## 技术选型决策树

### 场景 1：需要实时通信？

```
需要实时双向通信？
├─ 是 → WebSocket（ruoyi-common-websocket）
│      适用：在线聊天、协同编辑、实时游戏
│
└─ 否 → 需要服务端主动推送？
         ├─ 是 → SSE（ruoyi-common-sse）
         │      适用：流式响应、通知推送、进度更新
         │
         └─ 否 → HTTP 轮询或普通请求
```

### 场景 2：需要异步处理？

```
需要异步处理？
├─ 简单异步（同一应用内）
│   └─ @Async + Spring TaskExecutor
│      适用：发送邮件、记录日志等不需要可靠性保证的任务
│
├─ 需要延迟执行？
│   └─ Redis 延迟队列（RedissonDelayedQueue）
│      适用：订单超时取消、延迟通知（ruoyi-common-redis）
│
└─ 不需要异步 → 同步调用
```

### 场景 3：需要定时任务？

```
需要定时任务？
├─ 单机简单任务（不需要分布式）
│   └─ @Scheduled（Spring 原生）
│      适用：清理临时文件、统计数据、心跳检测
│
├─ 分布式调度/复杂任务
│   └─ SnailJob（ruoyi-common-job）
│      适用：多节点任务、失败重试、任务编排、可视化管理
│
└─ 延迟任务（非周期性）
    └─ Redis 延迟队列
       适用：订单超时取消、定时发布
```

### 场景 4：需要缓存？

```
需要缓存？
├─ 简单 Key-Value 缓存
│   └─ Redis String（ruoyi-common-redis）
│      适用：用户信息、配置数据、Token
│
├─ 分布式锁
│   └─ Lock4j + Redisson（ruoyi-common-redis）
│      适用：库存扣减、防重复操作
│
├─ 排行榜/计数器
│   └─ Redis ZSet/Hash
│      适用：热门排行、点赞计数、在线人数
│
├─ 布隆过滤器（防缓存穿透）
│   └─ Redisson BloomFilter
│      适用：用户存在性检查、黑名单过滤
│
└─ 本地缓存（高频访问）
    └─ Caffeine
       适用：字典数据、菜单数据（本项目已集成）
```

### 场景 5：需要第三方登录？

```
需要第三方登录？
└─ ruoyi-common-social（基于 JustAuth）
   支持 20+ 平台：微信、QQ、微博、GitHub、企业微信、钉钉等
```

---

## 技术优先级指南

### 优先级 1：首选方案（覆盖 80% 场景）

| 需求 | 首选技术 | 模块 | 理由 |
|------|---------|------|------|
| 缓存 | Redis | ruoyi-common-redis | 功能全面、生态成熟 |
| 分布式锁 | Lock4j | ruoyi-common-redis | 注解简单、自动续期 |
| 实时通信 | WebSocket | ruoyi-common-websocket | 双向通信、广泛支持 |
| 定时任务（简单） | @Scheduled | Spring 原生 | 零配置、够用 |
| 文件上传 | OSS | ruoyi-common-oss | 统一接口、多云支持 |
| 权限认证 | Sa-Token | ruoyi-common-satoken | 功能强大、文档好 |
| 对象转换 | MapStruct | 全局 | 编译期生成、性能好 |

### 优先级 2：进阶方案（特定场景）

| 需求 | 进阶技术 | 模块 | 使用条件 |
|------|---------|------|---------|
| 定时任务（复杂） | SnailJob | ruoyi-common-job | 分布式、可视化 |
| 流式推送 | SSE | ruoyi-common-sse | 流式响应、实时推送 |
| 多数据源 | Dynamic-DS | ruoyi-common-mybatis | 多数据库切换 |
| 工作流 | Warm-Flow | ruoyi-workflow | 审批流程、流程编排 |

### 优先级 3：专用方案（特殊需求）

| 需求 | 专用技术 | 模块 | 备注 |
|------|---------|------|------|
| 短信发送 | SMS4j | ruoyi-common-sms | 多平台聚合 |
| 第三方登录 | JustAuth | ruoyi-common-social | 20+ 平台支持 |
| 数据翻译 | Translation | ruoyi-common-translation | ID→名称自动转换 |

---

## 常见选型对比

### 1. 异步处理选型

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **@Async** | 简单异步任务 | Spring 原生、零配置 | 无可靠性保证 |
| **Redis Streams** | 轻量消息、简单队列 | 无额外依赖、使用简单 | 功能有限、无事务 |
| **Redis 延迟队列** | 延迟任务 | 基于 Redisson、易用 | 不适合高吞吐 |

**本项目推荐**：
- 简单场景 → @Async
- 延迟任务 → Redis 延迟队列（ruoyi-common-redis）

### 2. 定时任务选型

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **@Scheduled** | 单机简单任务 | 零配置、Spring 原生 | 无分布式支持 |
| **SnailJob** | 分布式复杂任务 | 可视化、失败重试、工作流 | 需要额外部署 |
| **XXL-Job** | 分布式任务 | 文档丰富、社区活跃 | 本项目未集成 |
| **Quartz** | 传统定时任务 | 功能完善、历史悠久 | 配置复杂 |

**本项目推荐**：
- 简单场景 → @Scheduled
- 复杂场景 → SnailJob（ruoyi-common-job）

### 3. HTTP 客户端选型

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **RestTemplate** | 简单 HTTP 调用 | Spring 原生、简单 | 同步阻塞、功能有限 |
| **WebClient** | 响应式 HTTP | 异步非阻塞 | 学习曲线 |
| **OkHttp** | 高性能 HTTP | 连接池、拦截器 | 需要手动封装 |
| **Hutool HttpUtil** | 工具类调用 | 简单易用、已集成 | 功能相对简单 |

**本项目推荐**：
- 简单场景 → RestTemplate 或 Hutool HttpUtil
- 响应式场景 → WebClient

### 4. Excel 处理选型

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **FastExcel** | 大文件、高性能 | 内存占用低、速度快 | 功能相对简单 |
| **EasyExcel** | 通用场景 | 功能全面、文档好 | 阿里维护 |
| **Apache POI** | 复杂操作 | 功能最全 | 内存占用大 |

**本项目推荐**：FastExcel（ruoyi-common-excel）

---

## 决策记录模板

```markdown
# [决策标题]

## 背景
[为什么需要做这个决策]

## 决策内容
[选择了什么，如何实现]

## 考虑的方案
| 方案 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| 方案A | | | |
| 方案B | | | |
| 方案C | | | |

## 决策理由
1. [理由1]
2. [理由2]
3. [理由3]

## 后果
- **优点**：[带来的好处]
- **缺点**：[需要接受的代价]
- **风险**：[潜在风险及应对]

## 日期
[YYYY-MM-DD]
```

---

## 模块引入示例

### 在 pom.xml 中引入模块

```xml
<!-- 按需引入 ruoyi-common 模块 -->
<dependencies>
    <!-- 核心模块（必须） -->
    <dependency>
        <groupId>org.dromara</groupId>
        <artifactId>ruoyi-common-core</artifactId>
    </dependency>

    <!-- MyBatis（必须） -->
    <dependency>
        <groupId>org.dromara</groupId>
        <artifactId>ruoyi-common-mybatis</artifactId>
    </dependency>

    <!-- Redis 缓存（推荐） -->
    <dependency>
        <groupId>org.dromara</groupId>
        <artifactId>ruoyi-common-redis</artifactId>
    </dependency>

    <!-- WebSocket（按需） -->
    <dependency>
        <groupId>org.dromara</groupId>
        <artifactId>ruoyi-common-websocket</artifactId>
    </dependency>

    <!-- 短信服务（按需） -->
    <dependency>
        <groupId>org.dromara</groupId>
        <artifactId>ruoyi-common-sms</artifactId>
    </dependency>
</dependencies>
```

---

## 评估检查清单

### 选型前必查

- [ ] **功能满足**：是否满足当前功能需求？
- [ ] **性能满足**：是否满足性能要求？
- [ ] **社区活跃**：GitHub Stars、Issues 响应速度？
- [ ] **文档完善**：是否有中文文档？
- [ ] **兼容性**：与现有技术栈是否兼容？
- [ ] **学习成本**：团队是否熟悉？学习曲线如何？
- [ ] **维护成本**：长期维护成本如何？
- [ ] **安全漏洞**：是否有已知安全漏洞？
- [ ] **License**：是否允许商用？
- [ ] **项目已有**：ruoyi-common 是否已经集成？

### 本项目优先原则

1. **优先使用 ruoyi-common 模块**：已集成、已测试、风格统一
2. **优先使用 Hutool 工具类**：项目已依赖，无需额外引入
3. **优先使用 Spring 原生**：稳定、文档全、社区大
4. **避免重复造轮子**：先查 ruoyi-common 是否有现成实现

---

## 快速决策参考

| 我想要... | 用这个 | 模块/技术 |
|----------|--------|---------|
| 缓存数据 | Redis | ruoyi-common-redis |
| 分布式锁 | Lock4j | ruoyi-common-redis |
| 发送短信 | SMS4j | ruoyi-common-sms |
| 发送邮件 | Spring Mail | ruoyi-common-mail |
| 上传文件 | AWS S3 SDK | ruoyi-common-oss |
| 定时任务（简单） | @Scheduled | Spring 原生 |
| 定时任务（复杂） | SnailJob | ruoyi-common-job |
| 实时推送 | WebSocket | ruoyi-common-websocket |
| 流式响应 | SSE | ruoyi-common-sse |
| 数据脱敏 | @Sensitive | ruoyi-common-sensitive |
| 字段加密 | @EncryptField | ruoyi-common-encrypt |
| 数据翻译 | Translation | ruoyi-common-translation |
| 接口限流 | @RateLimiter | ruoyi-common-ratelimiter |
| 防重复提交 | @RepeatSubmit | ruoyi-common-idempotent |
| 第三方登录 | JustAuth | ruoyi-common-social |
| Excel 导出 | FastExcel | ruoyi-common-excel |
| API 文档 | SpringDoc | ruoyi-common-doc |
| HTTP 调用 | RestTemplate/Hutool | Spring 原生/Hutool |
| 多租户隔离 | Tenant | ruoyi-common-tenant |
| 多数据源 | Dynamic-DS | ruoyi-common-mybatis |
| 工作流 | Warm-Flow | ruoyi-workflow |
| 应用安全 | Security | ruoyi-common-security |
