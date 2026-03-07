---
name: workflow-engine
description: |
  通用工作流引擎开发指南。涵盖状态机模式、流程引擎选型（Flowable/Camunda/Activiti 对比）、业务集成模式。
  触发场景：
  - 设计审批流程（请假、报销、订单审批）
  - 选择工作流引擎
  - 实现任务办理（审批、驳回、转办、委派）
  - 业务模块集成工作流
  - 监听流程状态变更
  触发词：工作流、流程、审批、驳回、转办、委派、加签、抄送、流程引擎、Flowable、Camunda、Activiti、状态机、BPMN
  注意：如果项目有专属技能，优先使用专属版本。
---

# 工作流引擎开发指南

> 通用模板。如果项目有专属技能，优先使用。

## 设计原则

1. **流程与业务分离**：流程引擎负责流转控制，业务逻辑通过事件监听器/回调接入。
2. **状态可追溯**：每次流转记录操作人、操作时间、操作意见，形成完整审批链。
3. **灵活可配**：流程定义应支持可视化设计、动态修改，无需改代码。
4. **异常可恢复**：流程实例支持挂起、恢复、终止、撤销等操作。

---

## 流程引擎选型对比

| 维度 | Flowable | Camunda | Activiti | 轻量方案（WarmFlow 等） |
|------|----------|---------|----------|----------------------|
| 成熟度 | 高 | 高 | 高（社区版停滞） | 中 |
| 学习曲线 | 中等 | 中等 | 中等 | 低 |
| BPMN 2.0 | 完整支持 | 完整支持 | 完整支持 | 部分支持 |
| DMN 决策表 | 支持 | 支持 | 有限 | 不支持 |
| CMMN 案例 | 支持 | 支持 | 不支持 | 不支持 |
| 流程设计器 | 内置 Web | 内置 Web + Desktop | 旧版 Eclipse | 简易 Web |
| 性能 | 优秀 | 优秀 | 良好 | 轻量高效 |
| Spring Boot | 原生支持 | 原生支持 | 原生支持 | 通常支持 |
| 商业版 | 有 | 有 | N/A | 通常免费 |
| 适用场景 | 企业级复杂流程 | 企业级复杂流程 | 已有项目维护 | 简单审批流 |

### 选型决策树

```
流程复杂度？
├── 简单审批（3-5步线性流程）
│   └── 状态机模式 或 轻量流程引擎
├── 中等（分支、并行、会签）
│   └── Flowable / Camunda
└── 复杂（子流程、多实例、DMN、事件）
    └── Flowable / Camunda
```

---

## 实现模式

### 模式一：状态机（简单场景）

适用于线性或简单分支的审批流程。

```java
// 状态枚举
public enum OrderStatus {
    DRAFT,      // 草稿
    PENDING,    // 待审批
    APPROVED,   // 已通过
    REJECTED,   // 已驳回
    CANCELLED;  // 已撤销
}

// 状态流转规则
public class OrderStateMachine {

    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
        OrderStatus.DRAFT,    Set.of(OrderStatus.PENDING, OrderStatus.CANCELLED),
        OrderStatus.PENDING,  Set.of(OrderStatus.APPROVED, OrderStatus.REJECTED),
        OrderStatus.REJECTED, Set.of(OrderStatus.PENDING, OrderStatus.CANCELLED)
    );

    public void transition(Order order, OrderStatus targetStatus, String operator, String comment) {
        OrderStatus current = order.getStatus();
        if (!TRANSITIONS.getOrDefault(current, Set.of()).contains(targetStatus)) {
            throw new [你的异常类](
                String.format("不允许从 %s 流转到 %s", current, targetStatus));
        }
        order.setStatus(targetStatus);
        // 记录流转日志
        saveFlowLog(order.getId(), current, targetStatus, operator, comment);
    }
}
```

### 模式二：流程引擎集成

#### 核心概念

| 概念 | 说明 |
|------|------|
| 流程定义（Definition） | 流程模板（BPMN XML），可版本化管理 |
| 流程实例（Instance） | 基于定义创建的运行时实例 |
| 任务（Task） | 等待人工处理的节点 |
| 历史（History） | 已完成的流程/任务记录 |
| 变量（Variable） | 流程运行时数据，用于条件判断 |

#### 启动流程

```java
@Service
public class WorkflowService {

    @Autowired
    private [你的流程引擎] engine;

    // 启动流程
    public String startProcess(String processKey, String businessId, Map<String, Object> variables) {
        variables.put("businessId", businessId);
        variables.put("initiator", [你的安全工具类].getCurrentUserId());

        // 启动流程实例
        var instance = engine.startProcessByKey(processKey, businessId, variables);
        return instance.getId();
    }

    // 办理任务（审批通过）
    public void completeTask(String taskId, String comment, Map<String, Object> variables) {
        // 记录审批意见
        engine.addComment(taskId, comment);
        // 完成任务
        engine.completeTask(taskId, variables);
    }

    // 驳回
    public void rejectTask(String taskId, String targetNodeId, String comment) {
        engine.addComment(taskId, comment);
        engine.rejectToNode(taskId, targetNodeId);
    }

    // 转办
    public void transferTask(String taskId, String targetUserId, String comment) {
        engine.addComment(taskId, comment);
        engine.setAssignee(taskId, targetUserId);
    }

    // 撤销
    public void cancelProcess(String instanceId, String comment) {
        engine.deleteProcessInstance(instanceId, comment);
    }
}
```

#### 业务集成 - 事件监听

```java
@Component
public class OrderWorkflowListener {

    @Autowired
    private OrderService orderService;

    // 监听流程状态变更事件
    @EventListener(condition = "#event.processKey == 'order_approve'")
    public void onProcessEvent(ProcessStatusEvent event) {
        String businessId = event.getBusinessId();
        switch (event.getStatus()) {
            case "submitted" -> orderService.updateStatus(businessId, "PENDING");
            case "approved"  -> orderService.updateStatus(businessId, "APPROVED");
            case "rejected"  -> orderService.updateStatus(businessId, "REJECTED");
            case "cancelled" -> orderService.updateStatus(businessId, "CANCELLED");
        }
    }

    // 监听任务创建事件（发送通知）
    @EventListener(condition = "#event.processKey == 'order_approve'")
    public void onTaskCreated(TaskCreatedEvent event) {
        notificationService.sendNotice(
            event.getAssignee(),
            "您有新的审批任务：" + event.getTaskName()
        );
    }
}
```

#### 办理人类型设计

| 类型 | 标识格式 | 示例 |
|------|---------|------|
| 指定用户 | 用户ID | `1001` |
| 角色 | `role:角色编码` | `role:finance_manager` |
| 部门 | `dept:部门ID` | `dept:100` |
| 岗位 | `post:岗位编码` | `post:cfo` |
| 表达式 | SpEL / UEL | `${order.amount > 10000 ? 'role:director' : 'role:manager'}` |

---

## API 接口设计参考

### 任务相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/workflow/start` | POST | 启动流程 |
| `/workflow/task/complete` | POST | 办理任务（审批通过） |
| `/workflow/task/reject` | POST | 驳回 |
| `/workflow/task/transfer` | POST | 转办 |
| `/workflow/task/delegate` | POST | 委派 |
| `/workflow/task/todo` | GET | 当前用户待办列表 |
| `/workflow/task/done` | GET | 当前用户已办列表 |
| `/workflow/task/copy` | GET | 抄送列表 |

### 实例相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/workflow/instance/running` | GET | 运行中实例 |
| `/workflow/instance/finished` | GET | 已完成实例 |
| `/workflow/instance/cancel` | PUT | 撤销申请 |
| `/workflow/instance/history/{businessId}` | GET | 审批记录 |

---

## 常见错误

```java
// 1. 流程与业务强耦合
// 在流程引擎的 ServiceTask 中直接操作数据库
// 应通过事件监听/消息解耦

// 2. 未处理并发审批
// 多人同时审批同一任务 -> 数据不一致
// 应在 completeTask 中加锁或使用乐观锁

// 3. 流程变量存放大对象
variables.put("orderDetail", hugeObject);  // 序列化到数据库，性能差
// 应只存关键ID，通过 businessId 关联查询

// 4. 忽略流程版本管理
// 修改流程定义后，已运行的实例可能出错
// 应使用版本化部署，运行中实例按启动时版本执行

// 5. 审批意见未持久化
engine.completeTask(taskId, variables);  // 忘记 addComment
// 应在 complete 前记录审批意见

// 6. 通知不及时
// 任务创建后没有通知办理人 -> 任务积压
// 应通过事件监听器自动发送通知
```
