---
name: architecture-design
description: |
  通用架构设计指南。涵盖分层架构、模块划分、依赖管理等架构决策方法论。
  触发场景：系统设计、模块拆分、架构评审、技术选型。
  触发词：架构设计、分层架构、模块划分、系统设计、技术选型。
  注意：如果项目有专属技能（如 `leniu-architecture`），优先使用专属版本。
---

# 架构设计指南

> 通用模板。如果项目有专属技能（如 `leniu-architecture`），优先使用。

## 核心规范

### 分层架构对比

#### 三层架构（标准 Spring Boot）

```
Controller  ->  Service  ->  Mapper/Repository
（接口层）     （业务层）    （数据访问层）
```

- **适用场景**：中小型项目、业务逻辑相对简单
- **优点**：结构清晰、上手快、团队共识强
- **缺点**：Service 层容易膨胀为"上帝类"

#### 四层架构（增加编排层）

```
Controller  ->  Business/Facade  ->  Service  ->  Mapper/Repository
（接口层）      （业务编排层）       （领域服务）   （数据访问层）
```

- **适用场景**：大型项目、复杂业务编排、跨 Service 协调
- **优点**：职责更细粒度、Service 保持纯净
- **缺点**：层次多、小项目过度设计

#### 选择建议

| 条件 | 推荐 |
|------|------|
| 单表 CRUD 为主 | 三层架构 |
| 跨模块协调频繁 | 四层架构 |
| 团队 < 5 人 | 三层架构 |
| 微服务拆分 | 三层 + DDD |

### 模块划分原则

1. **高内聚低耦合**：模块内部紧密关联，模块间依赖最小化
2. **按业务域拆分**：而非按技术层拆分
3. **单一职责**：每个模块只负责一个业务领域
4. **接口隔离**：模块间通过接口/API 通信，不直接依赖实现

### 推荐模块结构

```
project-root/
├── project-common/          # 公共模块（工具类、通用常量）
├── project-api/             # 对外 API 定义（Feign 接口、DTO）
├── project-module-order/    # 订单模块
├── project-module-user/     # 用户模块
├── project-module-payment/  # 支付模块
└── project-gateway/         # 网关（微服务场景）
```

### 每个模块内部结构

```
[你的包名].[module]/
├── controller/       # 接口层
├── service/
│   └── impl/         # 业务实现
├── mapper/           # 数据访问
├── entity/           # 实体
├── dto/              # 请求参数
├── vo/               # 响应对象
├── enums/            # 枚举
└── config/           # 模块配置
```

## 代码示例

### 依赖方向（必须单向）

```
Controller  -->  Service  -->  Mapper
    |               |
    v               v
   DTO/VO        Entity
```

- 上层可以依赖下层，下层不能依赖上层
- 同层之间避免循环依赖
- 公共模块被所有业务模块依赖，但公共模块不依赖任何业务模块

### 模块间通信模式

```java
// 方式一：直接依赖（单体应用）
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {
    private final IUserService userService;  // 直接注入其他模块 Service
}

// 方式二：事件驱动（解耦）
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements IOrderService {
    private final ApplicationEventPublisher eventPublisher;

    public void createOrder(OrderCreateDTO dto) {
        // ... 创建订单
        eventPublisher.publishEvent(new OrderCreatedEvent(order));
    }
}

// 方式三：Feign 调用（微服务）
@FeignClient(name = "user-service")
public interface UserFeignClient {
    @GetMapping("/api/v1/users/{id}")
    UserVO getUserById(@PathVariable Long id);
}
```

### 配置分层

```yaml
# application.yml - 通用配置
spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}

# application-dev.yml - 开发环境
# application-test.yml - 测试环境
# application-prod.yml - 生产环境
```

## 常见错误

| 错误 | 正确做法 |
|------|---------|
| Controller 直接调 Mapper | 必须经过 Service 层 |
| Service 之间循环依赖 | 提取公共 Service 或事件驱动 |
| Entity 直接暴露给前端 | 用 VO 封装响应 |
| 公共模块依赖业务模块 | 公共模块必须独立，被业务模块依赖 |
| 按技术层拆分模块（all-controller、all-service） | 按业务域拆分 |
| 所有逻辑堆在 Service 一个方法里 | 拆分私有方法或引入编排层 |
| 硬编码配置值 | 使用配置文件 + `@Value` 或 `@ConfigurationProperties` |
| 跨模块直接操作其他模块的数据库表 | 通过对方 Service 接口调用 |
