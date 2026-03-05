---
name: workflow-engine
description: |
  工作流引擎开发、流程管理、任务办理。基于 WarmFlow 实现审批流、业务流程集成。

  触发场景：
  - 启动工作流程（发起审批、提交申请）
  - 办理任务（审批通过、驳回、转办、委派）
  - 流程定义管理（设计流程、配置节点）
  - 业务模块集成工作流（订单审批、请假申请）
  - 监听工作流事件（流程状态变更通知）
  - 配置办理人（用户、角色、部门、岗位、SpEL表达式）

  触发词：工作流、流程、审批、WarmFlow、FlowEngine、任务、办理、驳回、转办、委派、加签、减签、抄送、流程实例、流程定义、办理人、GlobalListener、ProcessEvent
---

# 工作流引擎开发规范（WarmFlow）

> 基于 **WarmFlow** 实现，架构层次：Controller → Service → WarmFlow Core (FlowEngine) → Mapper → Listener/Handler

## 一、FlowEngine 核心服务

```java
import org.dromara.warm.flow.core.FlowEngine;

FlowEngine.taskService()      // 任务服务
FlowEngine.insService()       // 实例服务
FlowEngine.defService()       // 流程定义服务
FlowEngine.nodeService()      // 节点服务
FlowEngine.hisTaskService()   // 历史任务服务
FlowEngine.userService()      // 用户服务
```

## 二、关键枚举

### 任务状态 TaskStatusEnum

```java
package org.dromara.workflow.common.enums;

public enum TaskStatusEnum {
    CANCEL("cancel", "撤销"),    PASS("pass", "通过"),
    WAITING("waiting", "待审核"), INVALID("invalid", "作废"),
    BACK("back", "退回"),        TERMINATION("termination", "终止"),
    TRANSFER("transfer", "转办"), DEPUTE("depute", "委托"),
    COPY("copy", "抄送"),        SIGN("sign", "加签"),
    SIGN_OFF("sign_off", "减签"), TIMEOUT("timeout", "超时");

    // 判断是否为通过或退回
    public static boolean isPassOrBack(String status) { ... }
}
```

### 办理人类型 TaskAssigneeEnum

> **注意**：USER 和 SPEL 类型没有前缀！

```java
public enum TaskAssigneeEnum {
    USER("用户", ""),           // 无前缀
    ROLE("角色", "role:"),
    DEPT("部门", "dept:"),
    POST("岗位", "post:"),
    SPEL("SpEL表达式", "");     // 无前缀，通过 $ 或 # 开头判断

    public static boolean isSpelExpression(String value) {
        return StringUtils.startsWith(value, "$") || StringUtils.startsWith(value, "#");
    }
}
```

**storageId 格式**：`123`(用户) | `role:456` | `dept:789` | `post:101` | `#{expr}` | `${var}`

---

## 三、常用操作

### 3.1 启动流程

```java
@Autowired
private IFlwTaskService flwTaskService;

StartProcessBo bo = new StartProcessBo();
bo.setFlowCode("leave_apply");
bo.setBusinessId("order_123");
bo.setVariables(Map.of("amount", 1000));
StartProcessReturnDTO result = flwTaskService.startWorkFlow(bo);
```

```java
// 供其他模块调用
@Autowired
private WorkflowService workflowService;

StartProcessDTO dto = new StartProcessDTO();
dto.setFlowCode("leave_apply");
dto.setBusinessId("order_123");
StartProcessReturnDTO result = workflowService.startWorkFlow(dto);
```

### 3.2 办理任务

```java
CompleteTaskBo bo = new CompleteTaskBo();
bo.setTaskId(taskId);
bo.setMessage("同意");
bo.setVariables(Map.of("approved", true));
bo.setAssigneeMap(Map.of("pass:nodeCode", "user:1,user:2")); // 可选：指定下一节点办理人
flwTaskService.completeTask(bo);
```

### 3.3 驳回

```java
BackProcessBo bo = new BackProcessBo();
bo.setTaskId(taskId);
bo.setNodeCode("apply_node");
bo.setMessage("资料不完整");
flwTaskService.backProcess(bo);
```

### 3.4 转办 / 委派 / 加签 / 减签

```java
TaskOperationBo bo = new TaskOperationBo();
bo.setTaskId(taskId);
bo.setUserId("targetUserId");
bo.setMessage("转交处理");

// 转办（转给他人，自己不再参与）
flwTaskService.taskOperation(bo, FlowConstant.TRANSFER_TASK);

// 委派（委托代办，最终还需自己确认）
flwTaskService.taskOperation(bo, FlowConstant.DELEGATE_TASK);

// 加签 / 减签
bo.setUserIds(List.of("user1", "user2"));
flwTaskService.taskOperation(bo, FlowConstant.ADD_SIGNATURE);
flwTaskService.taskOperation(bo, FlowConstant.REDUCTION_SIGNATURE);
```

### 3.5 查询任务

```java
flwTaskService.pageByTaskWait(bo, pageQuery);      // 当前用户待办
flwTaskService.pageByTaskFinish(bo, pageQuery);     // 当前用户已办
flwTaskService.pageByAllTaskWait(bo, pageQuery);    // 所有待办（管理员）
flwTaskService.pageByAllTaskFinish(bo, pageQuery);  // 所有已办（管理员）
flwTaskService.pageByTaskCopy(bo, pageQuery);       // 抄送任务
```

---

## 四、业务集成 - 事件监听

> 事件类位于 `org.dromara.common.core.domain.event` 包

| 事件类 | 触发时机 | 主要字段 |
|-------|---------|---------|
| `ProcessEvent` | 流程状态变更 | flowCode, businessId, status, submit |
| `ProcessTaskEvent` | 任务创建 | flowCode, businessId, taskId, nodeCode |
| `ProcessDeleteEvent` | 流程删除 | flowCode, businessId |

```java
@Component
public class OrderWorkflowListener {

    @EventListener(condition = "#event.flowCode == 'order_approve'")
    public void onProcessEvent(ProcessEvent event) {
        String businessId = event.getBusinessId();
        if (event.isSubmit()) {
            orderService.updateStatus(businessId, "PENDING");
            return;
        }
        switch (event.getStatus()) {
            case "finish" -> orderService.updateStatus(businessId, "APPROVED");
            case "back" -> orderService.updateStatus(businessId, "REJECTED");
            case "cancel" -> orderService.updateStatus(businessId, "CANCELLED");
            case "termination" -> orderService.updateStatus(businessId, "TERMINATED");
            case "invalid" -> orderService.updateStatus(businessId, "INVALID");
        }
    }

    @EventListener(condition = "#event.flowCode == 'order_approve'")
    public void onTaskCreated(ProcessTaskEvent event) {
        sendNotification(event.getTaskId());
    }
}
```

---

## 五、全局监听器 WorkflowGlobalListener

实现 `GlobalListener` 接口，在任务生命周期关键节点执行：

```java
@Component
public class WorkflowGlobalListener implements GlobalListener {
    @Override
    public void create(ListenerVariable var) { /* 任务创建 */ }

    @Override
    public void start(ListenerVariable var) {
        // 任务开始办理：处理抄送、自定义变量
        String ext = var.getNode().getExt();
        Map<String, Object> variable = var.getVariable();
    }

    @Override
    public void assignment(ListenerVariable var) {
        // 分派：动态修改待办任务的办理人
        List<Task> nextTasks = var.getNextTasks();
        FlowParams flowParams = var.getFlowParams();
    }

    @Override
    public void finish(ListenerVariable var) {
        // 完成：状态更新、消息通知、事件发布
        Instance instance = var.getInstance();
        Definition definition = var.getDefinition();
    }
}
```

---

## 六、流程常量 FlowConstant

```java
package org.dromara.workflow.common.constant;

public interface FlowConstant {
    String INITIATOR = "initiator";               // 发起人
    String INITIATOR_DEPT_ID = "initiatorDeptId"; // 发起人部门
    String BUSINESS_ID = "businessId";
    String SUBMIT = "submit";                     // 提交标识

    String DELEGATE_TASK = "delegateTask";        // 委托
    String TRANSFER_TASK = "transferTask";        // 转办
    String ADD_SIGNATURE = "addSignature";        // 加签
    String REDUCTION_SIGNATURE = "reductionSignature"; // 减签

    String FLOW_COPY_LIST = "flowCopyList";       // 抄送人列表
    String MESSAGE_TYPE = "messageType";
    String MESSAGE_NOTICE = "messageNotice";
    String AUTO_PASS = "autoPass";                // 自动通过

    String VAR_IGNORE = "ignore";                 // 忽略办理权限校验
    String VAR_IGNORE_DEPUTE = "ignoreDepute";
    String VAR_IGNORE_COOPERATE = "ignoreCooperate";
}
```

### 消息通知

```java
// MessageTypeEnum: "1"=站内信, "2"=邮箱, "3"=短信
Map<String, Object> variable = new HashMap<>();
variable.put(FlowConstant.MESSAGE_TYPE, List.of("1", "2"));
variable.put(FlowConstant.MESSAGE_NOTICE, "您有新的审批任务");
```

---

## 七、API 接口速查

### 任务 /workflow/task

| 接口 | 方法 | 说明 |
|------|------|------|
| `/startWorkFlow` | POST | 启动流程 |
| `/completeTask` | POST | 办理任务 |
| `/backProcess` | POST | 驳回 |
| `/pageByTaskWait` | GET | 当前用户待办 |
| `/pageByTaskFinish` | GET | 当前用户已办 |
| `/pageByTaskCopy` | GET | 抄送任务 |
| `/getNextNodeList` | POST | 下一节点信息 |
| `/terminationTask` | POST | 终止流程 |
| `/{taskOperation}` | POST | 委派/转办/加签/减签 |
| `/urgeTask` | POST | 催办 |

### 实例 /workflow/instance

| 接口 | 方法 | 说明 |
|------|------|------|
| `/pageByRunning` | GET | 运行中实例 |
| `/pageByFinish` | GET | 已完成实例 |
| `/pageByCurrent` | GET | 当前用户发起 |
| `/cancelProcessApply` | PUT | 撤销申请 |
| `/invalid` | POST | 作废 |
| `/flowHisTaskList/{businessId}` | GET | 流程图+审批记录 |

### 定义 /workflow/definition

| 接口 | 方法 | 说明 |
|------|------|------|
| `/list` | GET | 已发布定义 |
| `/publish/{id}` | PUT | 发布 |
| `/unPublish/{id}` | PUT | 取消发布 |
| `/copy/{id}` | POST | 复制 |
| `/importDef` | POST | 导入 |
| `/exportDef/{id}` | POST | 导出 |

---

## 八、核心文件位置

```
ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/
├── controller/          # FlwTaskController, FlwInstanceController, FlwDefinitionController
├── service/impl/        # FlwTaskServiceImpl, WorkflowServiceImpl
├── mapper/              # FlwTaskMapper, FlwInstanceMapper
├── listener/            # WorkflowGlobalListener
├── handler/             # FlowProcessEventHandler, WorkflowPermissionHandler
├── domain/bo/           # StartProcessBo, CompleteTaskBo, BackProcessBo, TaskOperationBo
├── domain/vo/           # FlowTaskVo, FlowHisTaskVo, FlowInstanceVo
├── common/constant/     # FlowConstant
└── common/enums/        # TaskStatusEnum, TaskAssigneeEnum, MessageTypeEnum
```
