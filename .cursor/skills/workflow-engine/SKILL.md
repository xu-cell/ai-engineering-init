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

# 工作流引擎开发规范

> 本项目基于 **WarmFlow** 实现工作流引擎，提供流程定义、流程实例、任务管理、办理人分配等功能。

## 架构概述

```
┌─────────────────────────────────────────────────────────────────┐
│                       Controller Layer                           │
│  FlwTaskController | FlwInstanceController | FlwDefinitionController
│  FlwCategoryController | FlwSpelController | TestLeaveController │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                        Service Layer                             │
│  FlwTaskService | FlwInstanceService | FlwDefinitionService     │
│  FlwCategoryService | FlwSpelService | TestLeaveService         │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────────┐│
│  │           WarmFlow Core (FlowEngine)                         ││
│  │   TaskService | InsService | DefService | NodeService        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                        Mapper Layer                              │
│  FlwCategoryMapper | FlwSpelMapper | TestLeaveMapper            │
│  FlwInstanceMapper | FlwTaskMapper | FlwInstanceBizExtMapper    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   Listener & Handler                             │
│  WorkflowGlobalListener (任务监听) | FlowProcessEventHandler (事件发布)
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. FlowEngine 服务访问

```java
import org.dromara.warm.flow.core.FlowEngine;

// 任务服务
FlowEngine.taskService()

// 实例服务
FlowEngine.insService()

// 流程定义服务
FlowEngine.defService()

// 节点服务
FlowEngine.nodeService()

// 历史任务服务
FlowEngine.hisTaskService()

// 用户服务
FlowEngine.userService()
```

### 2. 任务状态枚举

```java
package org.dromara.workflow.common.enums;

public enum TaskStatusEnum {
    CANCEL("cancel", "撤销"),
    PASS("pass", "通过"),
    WAITING("waiting", "待审核"),
    INVALID("invalid", "作废"),
    BACK("back", "退回"),
    TERMINATION("termination", "终止"),
    TRANSFER("transfer", "转办"),
    DEPUTE("depute", "委托"),
    COPY("copy", "抄送"),
    SIGN("sign", "加签"),
    SIGN_OFF("sign_off", "减签"),
    TIMEOUT("timeout", "超时");

    private final String status;
    private final String desc;

    // 判断状态是否为通过或退回
    public static boolean isPassOrBack(String status) {
        return PASS.getStatus().equals(status) || BACK.getStatus().equals(status);
    }
}
```

### 3. 办理人类型枚举

> ⚠️ **注意**：USER 和 SPEL 类型没有前缀！

```java
package org.dromara.workflow.common.enums;

public enum TaskAssigneeEnum {
    USER("用户", ""),           // ⚠️ 用户没有前缀
    ROLE("角色", "role:"),
    DEPT("部门", "dept:"),
    POST("岗位", "post:"),
    SPEL("SpEL表达式", "");     // ⚠️ SpEL 没有前缀，通过 $ 或 # 开头判断

    private final String desc;
    private final String code;

    // 判断是否为 SPEL 表达式（以 $ 或 # 开头）
    public static boolean isSpelExpression(String value) {
        return StringUtils.startsWith(value, "$") || StringUtils.startsWith(value, "#");
    }
}
```

**storageId 格式示例**：
```
123           → 用户ID 123（无前缀）
role:456      → 角色ID 456
dept:789      → 部门ID 789
post:101      → 岗位ID 101
#{expression} → SpEL表达式（# 开头）
${variable}   → 默认变量策略（$ 开头）
```

---

## 常用操作

### 1. 启动流程

```java
@Autowired
private IFlwTaskService flwTaskService;

// 方式一：使用 FlwTaskService
public void startProcess() {
    StartProcessBo bo = new StartProcessBo();
    bo.setFlowCode("leave_apply");           // 流程编码
    bo.setBusinessId("order_123");           // 业务ID
    bo.setVariables(Map.of("amount", 1000)); // 流程变量

    StartProcessReturnDTO result = flwTaskService.startWorkFlow(bo);
    Long instanceId = result.getProcessInstanceId();
    Long taskId = result.getTaskId();
}
```

```java
@Autowired
private WorkflowService workflowService;

// 方式二：使用 WorkflowService（供其他模块调用）
public void startProcess() {
    StartProcessDTO dto = new StartProcessDTO();
    dto.setFlowCode("leave_apply");
    dto.setBusinessId("order_123");
    dto.setVariables(Map.of("amount", 1000));

    StartProcessReturnDTO result = workflowService.startWorkFlow(dto);
}
```

### 2. 办理任务

```java
public void completeTask() {
    CompleteTaskBo bo = new CompleteTaskBo();
    bo.setTaskId(taskId);                    // 任务ID
    bo.setMessage("同意");                    // 审批意见
    bo.setVariables(Map.of("approved", true)); // 流程变量

    // 指定下一节点办理人（可选）
    bo.setAssigneeMap(Map.of(
        "pass:nodeCode", "user:1,user:2"
    ));

    flwTaskService.completeTask(bo);
}
```

### 3. 驳回任务

```java
public void rejectTask() {
    BackProcessBo bo = new BackProcessBo();
    bo.setTaskId(taskId);
    bo.setNodeCode("apply_node");    // 驳回到的节点
    bo.setMessage("资料不完整");

    flwTaskService.backProcess(bo);
}
```

### 4. 转办/委派

```java
// 转办（转给他人办理，自己不再参与）
TaskOperationBo transferBo = new TaskOperationBo();
transferBo.setTaskId(taskId);
transferBo.setUserId("targetUserId");
transferBo.setMessage("转交处理");
flwTaskService.taskOperation(transferBo, FlowConstant.TRANSFER_TASK);

// 委派（委托他人代办，最终还需自己确认）
TaskOperationBo deputeBo = new TaskOperationBo();
deputeBo.setTaskId(taskId);
deputeBo.setUserId("targetUserId");
deputeBo.setMessage("请协助处理");
flwTaskService.taskOperation(deputeBo, FlowConstant.DELEGATE_TASK);
```

### 5. 加签/减签

```java
// 加签（增加办理人）
TaskOperationBo addBo = new TaskOperationBo();
addBo.setTaskId(taskId);
addBo.setUserIds(List.of("user1", "user2"));
addBo.setMessage("增加会签人员");
flwTaskService.taskOperation(addBo, FlowConstant.ADD_SIGNATURE);

// 减签（减少办理人）
TaskOperationBo reduceBo = new TaskOperationBo();
reduceBo.setTaskId(taskId);
reduceBo.setUserIds(List.of("user1"));
reduceBo.setMessage("减少会签人员");
flwTaskService.taskOperation(reduceBo, FlowConstant.REDUCTION_SIGNATURE);
```

---

## 业务集成

### 1. 监听流程事件

> 事件类位于 `org.dromara.common.core.domain.event` 包

```java
import org.springframework.context.event.EventListener;
import org.dromara.common.core.domain.event.ProcessEvent;
import org.dromara.common.core.domain.event.ProcessTaskEvent;
import org.dromara.common.core.domain.event.ProcessDeleteEvent;

@Component
public class OrderWorkflowListener {

    /**
     * 监听流程状态变更
     */
    @EventListener(condition = "#event.flowCode == 'order_approve'")
    public void onProcessEvent(ProcessEvent event) {
        String businessId = event.getBusinessId();
        String status = event.getStatus();
        boolean isSubmit = event.isSubmit();

        // 申请人提交
        if (isSubmit) {
            orderService.updateStatus(businessId, "PENDING");
            return;
        }

        // 根据流程状态更新业务数据
        switch (status) {
            case "finish" -> orderService.updateStatus(businessId, "APPROVED");
            case "back" -> orderService.updateStatus(businessId, "REJECTED");
            case "cancel" -> orderService.updateStatus(businessId, "CANCELLED");
            case "termination" -> orderService.updateStatus(businessId, "TERMINATED");
            case "invalid" -> orderService.updateStatus(businessId, "INVALID");
        }
    }

    /**
     * 监听任务创建（发送通知）
     */
    @EventListener(condition = "#event.flowCode == 'order_approve'")
    public void onTaskCreated(ProcessTaskEvent event) {
        Long taskId = event.getTaskId();
        String businessId = event.getBusinessId();
        // 获取待办人并发送通知
        sendNotification(taskId);
    }

    /**
     * 监听流程删除
     */
    @EventListener(condition = "#event.flowCode == 'order_approve'")
    public void onProcessDeleted(ProcessDeleteEvent event) {
        String businessId = event.getBusinessId();
        // 清理业务相关数据
        orderService.cleanupWorkflowData(businessId);
    }
}
```

### 2. 事件类型说明

| 事件类 | 触发时机 | 主要字段 |
|-------|---------|---------|
| `ProcessEvent` | 流程状态变更（提交、通过、驳回、撤销、终止、作废、完成） | flowCode, businessId, status, submit |
| `ProcessTaskEvent` | 任务创建时 | flowCode, businessId, taskId, nodeCode |
| `ProcessDeleteEvent` | 流程删除时 | flowCode, businessId |

### 3. 查询待办/已办任务

```java
@Autowired
private IFlwTaskService flwTaskService;

// 查询当前用户待办任务
public TableDataInfo<FlowTaskVo> getTodoList(FlowTaskBo bo, PageQuery pageQuery) {
    return flwTaskService.pageByTaskWait(bo, pageQuery);
}

// 查询当前用户已办任务
public TableDataInfo<FlowHisTaskVo> getDoneList(FlowTaskBo bo, PageQuery pageQuery) {
    return flwTaskService.pageByTaskFinish(bo, pageQuery);
}

// 查询所有待办任务（管理员）
public TableDataInfo<FlowTaskVo> getAllTodoList(FlowTaskBo bo, PageQuery pageQuery) {
    return flwTaskService.pageByAllTaskWait(bo, pageQuery);
}

// 查询所有已办任务（管理员）
public TableDataInfo<FlowHisTaskVo> getAllDoneList(FlowTaskBo bo, PageQuery pageQuery) {
    return flwTaskService.pageByAllTaskFinish(bo, pageQuery);
}

// 查询抄送任务
public TableDataInfo<FlowTaskVo> getCopyList(FlowTaskBo bo, PageQuery pageQuery) {
    return flwTaskService.pageByTaskCopy(bo, pageQuery);
}
```

---

## 全局监听器

`WorkflowGlobalListener` 实现 `GlobalListener` 接口，在任务生命周期的关键节点执行：

```java
package org.dromara.workflow.listener;

import org.dromara.warm.flow.core.listener.GlobalListener;
import org.dromara.warm.flow.core.listener.ListenerVariable;

@Component
public class WorkflowGlobalListener implements GlobalListener {

    @Override
    public void create(ListenerVariable listenerVariable) {
        // 任务创建时执行
    }

    @Override
    public void start(ListenerVariable listenerVariable) {
        // 任务开始办理时执行
        // 可在此处理：抄送设置、自定义变量
        String ext = listenerVariable.getNode().getExt();
        Map<String, Object> variable = listenerVariable.getVariable();
        // 解析节点扩展配置...
    }

    @Override
    public void assignment(ListenerVariable listenerVariable) {
        // 分派监听器，动态修改待办任务信息
        // 可在此处理：指定办理人、申请节点办理人设置
        List<Task> nextTasks = listenerVariable.getNextTasks();
        FlowParams flowParams = listenerVariable.getFlowParams();
        // 处理办理人权限...
    }

    @Override
    public void finish(ListenerVariable listenerVariable) {
        // 任务完成后执行
        // 可在此处理：状态更新、消息通知、抄送、事件发布
        Instance instance = listenerVariable.getInstance();
        Definition definition = listenerVariable.getDefinition();
        // 发布流程事件...
    }
}
```

---

## 流程常量

```java
package org.dromara.workflow.common.constant;

public interface FlowConstant {
    // 基础常量
    String INITIATOR = "initiator";               // 流程发起人
    String INITIATOR_DEPT_ID = "initiatorDeptId"; // 发起人部门ID
    String BUSINESS_ID = "businessId";            // 业务ID
    String BUSINESS_CODE = "businessCode";        // 业务编码
    String SUBMIT = "submit";                     // 申请人提交标识

    // 任务操作类型
    String DELEGATE_TASK = "delegateTask";        // 委托任务
    String TRANSFER_TASK = "transferTask";        // 转办任务
    String ADD_SIGNATURE = "addSignature";        // 加签
    String REDUCTION_SIGNATURE = "reductionSignature"; // 减签

    // 抄送与消息
    String FLOW_COPY_LIST = "flowCopyList";       // 抄送人列表
    String MESSAGE_TYPE = "messageType";          // 消息类型
    String MESSAGE_NOTICE = "messageNotice";      // 消息内容

    // 自动化配置
    String AUTO_PASS = "autoPass";                // 自动通过标识

    // 流程分类
    String CATEGORY_ID_TO_NAME = "category_id_to_name";
    String FLOW_CATEGORY_NAME = "flow_category_name#30d";
    Long FLOW_CATEGORY_ID = 100L;                 // 默认租户OA申请分类id

    // 任务状态字典
    String WF_TASK_STATUS = "wf_task_status";

    // 忽略标识（高级配置）
    String VAR_IGNORE = "ignore";                 // 忽略办理权限校验
    String VAR_IGNORE_DEPUTE = "ignoreDepute";    // 忽略委派处理
    String VAR_IGNORE_COOPERATE = "ignoreCooperate"; // 忽略会签票签处理
}
```

---

## 消息通知

### 通知类型

```java
package org.dromara.workflow.common.enums;

public enum MessageTypeEnum {
    SYSTEM_MESSAGE("1", "站内信"),
    EMAIL_MESSAGE("2", "邮箱"),
    SMS_MESSAGE("3", "短信");

    private final String code;
    private final String desc;
}
```

### 配置消息通知

在流程变量中设置：

```java
Map<String, Object> variable = new HashMap<>();
variable.put(FlowConstant.MESSAGE_TYPE, List.of("1", "2"));  // 站内信 + 邮箱
variable.put(FlowConstant.MESSAGE_NOTICE, "您有新的审批任务");
```

---

## API 接口

### 任务管理 (/workflow/task)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/startWorkFlow` | POST | 启动流程 |
| `/completeTask` | POST | 办理任务 |
| `/backProcess` | POST | 驳回审批 |
| `/pageByTaskWait` | GET | 当前用户待办任务 |
| `/pageByTaskFinish` | GET | 当前用户已办任务 |
| `/pageByAllTaskWait` | GET | 所有待办任务 |
| `/pageByAllTaskFinish` | GET | 所有已办任务 |
| `/pageByTaskCopy` | GET | 当前用户抄送任务 |
| `/{taskId}` | GET | 根据 taskId 查询任务详情 |
| `/getNextNodeList` | POST | 获取下一节点信息 |
| `/{taskId}/{nowNodeCode}` | GET | 获取可驳回的前置节点 |
| `/terminationTask` | POST | 终止流程 |
| `/{taskOperation}` | POST | 任务操作（委派/转办/加签/减签） |
| `/{taskId}` | GET | 获取当前任务所有办理人 |
| `/updateAssignee/{userId}` | PUT | 修改任务办理人 |
| `/urgeTask` | POST | 催办任务 |

### 实例管理 (/workflow/instance)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/pageByRunning` | GET | 运行中的流程实例 |
| `/pageByFinish` | GET | 已完成的流程实例 |
| `/pageByCurrent` | GET | 当前用户发起的流程 |
| `/{businessId}` | GET | 根据业务ID查询实例 |
| `/flowHisTaskList/{businessId}` | GET | 获取流程图和审批记录 |
| `/cancelProcessApply` | PUT | 撤销流程申请 |
| `/invalid` | POST | 作废流程 |
| `/deleteByBusinessIds/{businessIds}` | DELETE | 按业务ID删除实例 |
| `/deleteByInstanceIds/{instanceIds}` | DELETE | 按实例ID删除实例 |
| `/deleteHisByInstanceIds/{instanceIds}` | DELETE | 删除已完成的实例 |
| `/instanceVariable/{instanceId}` | GET | 获取流程变量 |
| `/updateVariable` | PUT | 更新流程变量 |
| `/active/{id}` | PUT | 激活/挂起流程实例 |

### 流程定义 (/workflow/definition)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/list` | GET | 查询已发布的流程定义 |
| `/unPublishList` | GET | 查询未发布的流程定义 |
| `/{id}` | GET | 获取流程定义详情 |
| `/` | POST | 新增流程定义 |
| `/` | PUT | 修改流程定义 |
| `/publish/{id}` | PUT | 发布流程定义 |
| `/unPublish/{id}` | PUT | 取消发布流程定义 |
| `/{ids}` | DELETE | 删除流程定义 |
| `/copy/{id}` | POST | 复制流程定义 |
| `/importDef` | POST | 导入流程定义 |
| `/exportDef/{id}` | POST | 导出流程定义 |
| `/xmlString/{id}` | GET | 获取定义 JSON 字符串 |
| `/active/{id}` | PUT | 激活/挂起流程定义 |

### 流程分类 (/workflow/category)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/list` | GET | 查询流程分类列表 |
| `/export` | POST | 导出流程分类 |
| `/{categoryId}` | GET | 获取分类详情 |
| `/` | POST | 新增分类 |
| `/` | PUT | 修改分类 |
| `/{categoryId}` | DELETE | 删除分类 |
| `/categoryTree` | GET | 获取分类树列表 |

---

## 文件位置

```
ruoyi-modules/ruoyi-workflow/src/main/java/org/dromara/workflow/
├── controller/
│   ├── FlwTaskController.java         # 任务管理
│   ├── FlwInstanceController.java     # 实例管理
│   ├── FlwDefinitionController.java   # 流程定义
│   ├── FlwCategoryController.java     # 流程分类
│   ├── FlwSpelController.java         # SpEL表达式
│   └── TestLeaveController.java       # 请假示例
├── service/
│   ├── IFlwTaskService.java
│   ├── IFlwInstanceService.java
│   ├── IFlwDefinitionService.java
│   ├── IFlwCategoryService.java
│   ├── IFlwSpelService.java
│   ├── IFlwTaskAssigneeService.java
│   ├── IFlwNodeExtService.java
│   ├── IFlwCommonService.java
│   ├── ITestLeaveService.java
│   └── impl/
│       ├── FlwTaskServiceImpl.java
│       ├── FlwInstanceServiceImpl.java
│       ├── FlwDefinitionServiceImpl.java
│       ├── FlwCategoryServiceImpl.java
│       ├── FlwSpelServiceImpl.java
│       ├── FlwTaskAssigneeServiceImpl.java
│       ├── FlwNodeExtServiceImpl.java
│       ├── FlwCommonServiceImpl.java
│       ├── TestLeaveServiceImpl.java
│       └── WorkflowServiceImpl.java   # 通用工作流服务
├── mapper/                            # Mapper 层（非 DAO）
│   ├── FlwCategoryMapper.java
│   ├── FlwSpelMapper.java
│   ├── FlwTaskMapper.java
│   ├── FlwInstanceMapper.java
│   ├── FlwInstanceBizExtMapper.java
│   └── TestLeaveMapper.java
├── listener/
│   └── WorkflowGlobalListener.java    # 全局监听器
├── handler/
│   ├── FlowProcessEventHandler.java   # 事件发布
│   └── WorkflowPermissionHandler.java # 权限处理
├── rule/
│   └── SpelRuleComponent.java         # SpEL 规则组件
├── domain/
│   ├── FlowCategory.java
│   ├── FlowSpel.java
│   ├── FlowInstanceBizExt.java
│   ├── TestLeave.java
│   ├── bo/                            # 业务对象
│   │   ├── StartProcessBo.java
│   │   ├── CompleteTaskBo.java
│   │   ├── BackProcessBo.java
│   │   ├── TaskOperationBo.java
│   │   └── ...
│   └── vo/                            # 视图对象
│       ├── FlowTaskVo.java
│       ├── FlowHisTaskVo.java
│       ├── FlowInstanceVo.java
│       └── ...
├── config/
│   └── WarmFlowConfig.java            # WarmFlow 配置
└── common/
    ├── ConditionalOnEnable.java       # 条件注解
    ├── constant/
    │   └── FlowConstant.java          # 常量
    └── enums/
        ├── TaskStatusEnum.java        # 任务状态
        ├── TaskAssigneeEnum.java      # 办理人类型
        ├── TaskAssigneeType.java      # 办理人类型扩展
        ├── MessageTypeEnum.java       # 消息类型
        ├── ButtonPermissionEnum.java  # 按钮权限
        ├── CopySettingEnum.java       # 抄送设置
        ├── NodeExtEnum.java           # 节点扩展
        └── VariablesEnum.java         # 变量枚举
```

---

## 检查清单

- [ ] 是否正确使用 `FlowEngine` 访问核心服务？
- [ ] 是否使用 `ProcessEvent`/`ProcessTaskEvent` 监听流程状态变更？
- [ ] 是否正确配置办理人（注意：用户ID无前缀，角色/部门/岗位有前缀）？
- [ ] 是否在业务模块中正确集成 `WorkflowService`？
- [ ] 是否处理了流程各状态（通过、驳回、撤销、终止）的业务逻辑？
- [ ] 是否配置了消息通知（SSE/邮件/短信）？
- [ ] API 方法名是否使用 pageBy* 命名规范（如 pageByTaskWait）？

---

## 常见问题

### Q1: 用户ID和角色ID在办理人配置中的区别？

```java
// ✅ 用户ID - 无前缀
"123"           // 直接是用户ID

// ✅ 角色ID - 有 role: 前缀
"role:456"      // 角色ID

// ✅ 部门ID - 有 dept: 前缀
"dept:789"      // 部门ID

// ✅ 岗位ID - 有 post: 前缀
"post:101"      // 岗位ID
```

### Q2: 如何判断是否为 SpEL 表达式？

```java
// SpEL 表达式以 # 或 $ 开头
TaskAssigneeEnum.isSpelExpression("#{initiator}")  // true
TaskAssigneeEnum.isSpelExpression("${deptLeader}") // true
TaskAssigneeEnum.isSpelExpression("user:123")      // false
```

### Q3: 如何忽略办理权限校验？

```java
Map<String, Object> variable = new HashMap<>();
variable.put(FlowConstant.VAR_IGNORE, true);  // 忽略办理权限校验
```
