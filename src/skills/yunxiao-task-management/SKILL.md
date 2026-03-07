---
name: yunxiao-task-management
description: |
  阿里云云效（Yunxiao）项目协作任务管理技能。通过云效 Open API 直接操作工作项：查询任务、修改状态、编辑描述、添加评论、记录工时、创建子任务、搜索项目等。
  支持完整开发工作流：读取任务 → 查找父需求 → 读取需求详情 → 创建提测单 → 编辑提测单 → 转给测试。
  当用户提到"云效"、"任务管理"、"工作项"、"修改状态"、"添加评论"、"记录工时"、"创建子任务"、"查询任务"、"项目任务"、"提测"、"提测单"、"父需求"、"需求详情"、"SARW"、"EZML"、"IXXP"或其他云效项目编号时使用此技能。
  即使用户只是简单说"把XXX改为开发完成"、"帮我查一下我的待处理任务"、"读取EZML-1878"、"创建提测单"，也应该触发此技能。
---

# 云效任务管理 Skill

通过阿里云云效 Open API 管理项目工作项。所有操作使用 Node.js fetch 直接调用 API。

## 前置配置

从 `.claude/settings.json` 的 `mcpServers.yunxiao.env` 中读取 Token：
```
YUNXIAO_ACCESS_TOKEN: 个人访问令牌
```

**已知用户信息**：
- 组织 ID: `61dbcd725356b19beeb1dc03`
- 用户: 徐嘉骏（ID: `66286d4b06679a65daed4d28`）
- 常用项目: SARW（`4574cb1c653fe873335b6c4716`）、EZML（`6f99a4e627fa88d6f8cb541e6c`）

## API 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `https://openapi-rdc.aliyuncs.com` |
| 认证方式 | 请求头 `x-yunxiao-token: {token}` |
| 内容类型 | `application/json` |
| 成功响应 | 200（有 body）或 204（无 body） |

## 通用请求模板

```javascript
async function yunxiaoReq(path, opts = {}) {
  const TOKEN = "从settings.json读取";
  const BASE = "https://openapi-rdc.aliyuncs.com";
  const r = await fetch(BASE + path, {
    method: opts.method || "GET",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-yunxiao-token": TOKEN
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (r.status === 204) return { success: true };
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}
```

## API 操作清单

### 1. 搜索项目

```
POST /oapi/v1/projex/organizations/{orgId}/projects:search?page={page}&perPage={perPage}
Body: {} 或 { keyword: "关键词" }
```

返回数组，每个项目包含 `id`、`name`、`customCode`（如 SARW、IXXP）。

**按成员过滤项目**（仅获取用户参与的项目，大幅减少搜索范围）：
```json
{
  "conditions": "{\"conditionGroups\":[[{\"className\":\"user\",\"fieldIdentifier\":\"members\",\"format\":\"list\",\"operator\":\"CONTAINS\",\"toValue\":null,\"value\":[\"用户ID\"]}]]}"
}
```

### 2. 搜索工作项

```
POST /oapi/v1/projex/organizations/{orgId}/workitems:search
Body: {
  spaceIdentifier: "项目ID",
  spaceId: "项目ID",
  category: "Task",     // Task | Req | Bug | Risk
  page: 1,
  perPage: 200
}
```

**⚠️ 必须指定 spaceId/spaceIdentifier**，不支持跨项目搜索。

返回数组。每个工作项关键字段：
- `serialNumber`: 编号（如 SARW-87）
- `id`: 工作项 ID
- `subject`: 标题
- `status`: `{ name, id }` — 状态名和状态 ID
- `assignedTo`: `{ name, id }` — 负责人

#### conditions 高级过滤（重要！）

搜索工作项支持 `conditions` 参数进行服务端过滤，避免全量拉取再本地筛选。`conditions` 是 **JSON 字符串**，格式：

```json
{
  "conditionGroups": [[
    { "className": "类型", "fieldIdentifier": "字段", "format": "格式", "operator": "操作符", "toValue": null, "value": ["值"] }
  ]]
}
```

**按负责人过滤**（最常用）：
```json
{ "className": "user", "fieldIdentifier": "assignedTo", "format": "list", "operator": "CONTAINS", "toValue": null, "value": ["用户ID"] }
```

**排除已完成/已取消状态**（只查未完成的任务，最实用）：
```json
{ "className": "status", "fieldIdentifier": "status", "format": "list", "operator": "NOT_CONTAINS", "toValue": null, "value": ["100014", "141230"] }
```

> `statusStage` 字段在 API 返回中为 undefined，不可用于过滤。用 `status` + `NOT_CONTAINS` 排除特定状态 ID 代替。

**按创建人过滤**：
```json
{ "className": "user", "fieldIdentifier": "creator", "format": "list", "operator": "CONTAINS", "toValue": null, "value": ["用户ID"] }
```

**按优先级过滤**：
```json
{ "className": "option", "fieldIdentifier": "priority", "format": "list", "operator": "CONTAINS", "toValue": null, "value": ["优先级值"] }
```

**组合多个条件**（放在同一个数组内为 AND 关系）：
```json
{
  "conditionGroups": [[
    { "className": "user", "fieldIdentifier": "assignedTo", "format": "list", "operator": "CONTAINS", "toValue": null, "value": ["用户ID"] },
    { "className": "statusStage", "fieldIdentifier": "statusStage", "format": "list", "operator": "CONTAINS", "toValue": null, "value": ["TODO", "DOING"] }
  ]]
}
```

> **注意**：`conditions` 传给 API 时必须是 **JSON 字符串**（`JSON.stringify(obj)`），不是对象。

### 3. 获取工作项详情

```
GET /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}
```

### 4. 编辑工作项（标题/描述/状态/负责人）

```
PUT /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}
```

**修改状态**：
```json
{ "status": "100011" }
```

常见状态 ID（从项目中的工作项动态获取，以下为参考值）：

| 状态名 | 状态 ID |
|--------|---------|
| 待处理 | 100005 |
| 处理中 | 100010 |
| 开发完成 | 100011 |
| 已完成 | 100014 |
| 已取消 | 141230 |

> 不同项目的状态 ID 可能不同！先从该项目的工作项中收集已有状态，再使用对应 ID。

**修改描述**：
```json
{ "description": "新的描述内容" }
```

**修改标题**：
```json
{ "subject": "新标题" }
```

**修改负责人**：
```json
{ "assignedTo": "用户ID" }
```

可组合多个字段一次更新。成功返回 **HTTP 204**（无 body）。

### 5. 添加评论

```
POST /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}/comments
Body: { "content": "评论内容" }
```

返回 `{ id: "评论ID" }`。

**获取评论列表**：
```
GET /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}/comments?page=1&perPage=20
```

### 6. 创建子任务

```
POST /oapi/v1/projex/organizations/{orgId}/workitems
Body: {
  "spaceId": "项目ID",
  "subject": "子任务标题",
  "workitemTypeId": "任务类型ID",
  "assignedTo": "用户ID",          // 必需！
  "parentId": "父工作项ID",         // 关键：建立父子关系
  "description": "描述（可选）"
}
```

> `assignedTo` 虽然看似可选，但 API 强制要求，缺少会报错。

**获取任务类型 ID**：
```
GET /oapi/v1/projex/organizations/{orgId}/projects/{projectId}/workitemTypes?category=Task
```

### 7. 工时管理

#### 预估工时

**查看**：
```
GET /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}/estimatedEfforts
```

**创建**（单位：分钟）：
```
POST /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}/estimatedEfforts
Body: {
  "spentTime": 480,                  // 480分钟 = 8小时
  "description": "预估工时描述",
  "owner": "用户ID"
}
```

#### 实际工时

**查看**：
```
GET /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}/effortRecords
```

**创建**：
```
POST /oapi/v1/projex/organizations/{orgId}/workitems/{workitemId}/effortRecords
Body: {
  "actualTime": 240,                 // 240分钟 = 4小时
  "description": "实际工时描述",
  "gmtStart": 1772800000000,         // 开始时间（毫秒时间戳）
  "gmtEnd": 1772803000000            // 结束时间（毫秒时间戳）
}
```

### 8. 跨项目搜索用户任务（优化策略）

云效 API 的 `workitems:search` 必须指定 `spaceId`，不支持全局搜索。推荐优化流程：

**第一步：缩小项目范围** — 用 `members` conditions 只获取用户参与的项目：
```javascript
const memberConditions = JSON.stringify({
  conditionGroups: [[{
    className: "user", fieldIdentifier: "members",
    format: "list", operator: "CONTAINS", toValue: null, value: [USER_ID]
  }]]
});
// POST projects:search with body: { conditions: memberConditions }
```

**第二步：服务端过滤任务** — 用 `assignedTo` + `status NOT_CONTAINS` 只返回自己未完成的任务：
```javascript
const taskConditions = JSON.stringify({
  conditionGroups: [[
    { className: "user", fieldIdentifier: "assignedTo", format: "list", operator: "CONTAINS", toValue: null, value: [USER_ID] },
    { className: "status", fieldIdentifier: "status", format: "list", operator: "NOT_CONTAINS", toValue: null, value: ["100014", "141230"] }
  ]]
});
// POST workitems:search with body: { spaceId, category: "Task", conditions: taskConditions, ... }
```

**第三步：并发批处理**（15 个项目一批）：
```javascript
const batchSize = 15;
for (let i = 0; i < projects.length; i += batchSize) {
  const batch = projects.slice(i, i + batchSize);
  const results = await Promise.all(batch.map(p => searchWorkitems(p.id, taskConditions)));
  myTasks.push(...results.flat());
}
```

> 通过 assignedTo + status NOT_CONTAINS 服务端过滤，每个项目只返回该用户的未完成任务，大幅减少数据量。
> 注意：`members` 项目过滤在实测中未生效（仍返回全量项目），建议直接扫描所有项目但用 batchSize=20 并发处理。

## 不支持的操作

| 操作 | 原因 |
|------|------|
| 添加附件 | API 不支持（504 超时/415 不支持的类型），MCP 源码中无附件相关实现 |
| 获取用户信息 | `/oapi/v1/platform/user` 需要「用户信息（读取）」权限，项目 Token 不支持 |

## 开发工作流（核心流程）

用户日常开发工作流，会频繁使用。当用户说"读取任务"、"查看需求"、"创建提测单"、"提测"时触发。

### 流程概览

```
读取任务（Task） → 查找父需求（Req） → 读取需求详情 → 开发 → 创建提测单 → 编辑提测单 → 转给测试
```

### Step 1: 读取任务并找到父需求

通过 `serialNumber`（如 EZML-1878）找到任务，任务的 `parentId` 字段指向父需求。

```javascript
// 1. 搜索项目中的任务，找到目标任务
// 项目编号 = serialNumber 的前缀（如 EZML-1878 → EZML）
// 先搜索项目列表找到 customCode 匹配的项目

// 2. 从任务的 parentId 获取父需求
const task = items.find(i => i.serialNumber === "EZML-1878");
const parentDetail = await yunxiaoReq(`/oapi/v1/projex/organizations/${ORG}/workitems/${task.parentId}`);
// parentDetail.categoryId === "Req"
// parentDetail.serialNumber === "EZML-1877"
```

**关键字段**：
- `parentId`: 父工作项 ID（Task → Req 的关联）
- `categoryId`: 工作项类别（`Task` / `Req` / `Bug` / `Risk`）
- `workitemType`: `{ name, id }` — 如 `{ name: "产品类需求", id: "9uy29901re573f561d69jn40" }`
- `space`: `{ name, id }` — 所属项目

### Step 2: 读取父需求详情

```javascript
const parentDetail = await yunxiaoReq(`/oapi/v1/projex/organizations/${ORG}/workitems/${parentId}`);
// description 是 JSON 字符串: { "htmlValue": "<article>...</article>" }
let desc = parentDetail.description;
try { desc = JSON.parse(desc).htmlValue; } catch {}
// 去除 HTML 标签提取纯文本
const text = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
```

需求描述是 HTML 格式，包含：需求背景、原型链接、具体需求列表等。

### Step 3: 查看同级子任务

查看父需求下的所有子任务（了解分工）：

```javascript
// 搜索该项目所有 Task，筛选 parentId 匹配的
const allTasks = await searchWorkitems(projectId, "Task");
const siblings = allTasks.filter(t => t.parentId === parentReqId);
// 展示: serialNumber, subject, status.name, assignedTo.name
```

### Step 4: 创建提测单

提测单是父需求（Req）下的一个 **Task 子任务**，指定给测试人员。

```javascript
// 获取 Task 类型 ID
const types = await yunxiaoReq(`/oapi/v1/projex/organizations/${ORG}/projects/${projectId}/workitemTypes?category=Task`);
const taskTypeId = types[0].id; // 通常只有一个 Task 类型

// 创建提测单（本质是创建 Task，parentId 指向父需求）
await yunxiaoReq(`/oapi/v1/projex/organizations/${ORG}/workitems`, {
  method: "POST",
  body: {
    spaceId: projectId,
    subject: "提测-需求标题摘要",
    workitemTypeId: taskTypeId,
    assignedTo: "测试人员ID",       // 必需！
    parentId: parentReqId,          // 关键：挂在父需求下
    description: "提测单 HTML 内容"  // 见下方模板
  }
});
```

### Step 5: 提测单描述模板

根据团队实际使用的提测单格式（参考 SARW-117、SARW-28 等），提测单描述包含以下结构：

```html
<article class="4ever-article">
<p>项目名称：{项目名称}</p>
<p>项目版本：{版本号}</p>
<p>项目分支：后端分支：{后端分支}&nbsp;&nbsp;前端分支：{前端分支}&nbsp;h5分支：{h5分支}</p>
<p>项目需求：</p>
<ol>
<li><div>{需求1描述} <span data-type="mention" data-id="{开发者ID}">@{开发者名}</span></div></li>
<li><div>{需求2描述} <span data-type="mention" data-id="{开发者ID}">@{开发者名}</span></div></li>
</ol>
<p>开发人员：</p>
<ul style="list-style-type:none">
<li><div><input type="checkbox" readonly="">&nbsp;<span data-type="mention" data-id="{ID}">@{名字}</span></div></li>
</ul>
<p>自测：</p>
<p>{自测截图或说明}</p>
<p>AI扫描：</p>
<p>{AI扫描结果}</p>
<p>提测人&amp;验收人</p>
<p><span data-type="mention" data-id="{提测人ID}">@{提测人}</span>&nbsp;<span data-type="mention" data-id="{验收人ID}">@{验收人}</span></p>
</article>
```

**@提及语法**：`<span data-type="mention" data-id="{用户ID}" data-login="{用户ID}">@{用户名}</span>`

### Step 6: 转给测试

创建提测单后，将对应的开发任务状态改为"已提测"（如果项目有此状态）或"开发完成"：

```javascript
// 修改任务状态为开发完成
await yunxiaoReq(`/oapi/v1/projex/organizations/${ORG}/workitems/${taskId}`, {
  method: "PUT",
  body: { status: "100011" }  // 开发完成
});
```

### 常用工作项类型 ID（按项目动态获取）

| 类别 | 类型名 | 用途 |
|------|--------|------|
| Task | 任务 | 开发任务、提测单 |
| Req | 产品类需求 | 产品需求（父级） |
| Req | 业务类需求 | 业务需求 |
| Req | 技术类需求 | 技术需求 |
| Bug | 缺陷 | Bug 单 |

> 每个项目的类型 ID 不同，通过 `GET /workitemTypes?category={类别}` 获取。

---

## 操作流程示例

### 批量修改状态

```
用户：把 SARW-87、SARW-74 改为开发完成
```

1. 搜索 SARW 项目中的工作项，找到 serialNumber 匹配的 ID
2. 从项目已有工作项中收集状态 → 找到"开发完成"的 ID
3. 对每个工作项调用 PUT 更新状态
4. 逐个 GET 验证更新结果

### 查询个人任务

```
用户：查看我所有待处理的任务
```

1. 用 `assignedTo` + `status NOT_CONTAINS` conditions 并发搜索每个项目（服务端过滤）
2. 并发批处理（batchSize=20）扫描所有项目
3. 汇总展示

### 读取任务需求并提测

```
用户：读取 EZML-1878，看看要做什么
```

1. 从 serialNumber 前缀找到项目（EZML → 搜索 customCode 匹配）
2. 搜索项目 Task，找到 EZML-1878
3. 通过 `parentId` 获取父需求（EZML-1877）详情
4. 解析父需求 HTML 描述，提取需求内容
5. 展示给用户

```
用户：创建提测单
```

1. 获取项目 Task 类型 ID
2. 生成提测单描述（使用模板）
3. 创建子任务（parentId 指向父需求，assignedTo 指向测试人员）
4. 修改开发任务状态为"开发完成"

## Token 权限要求

| 权限 | 读取操作 | 写入操作 |
|------|---------|---------|
| 项目协作（读取） | ✅ 查询项目、搜索工作项、获取详情 | - |
| 项目协作（读写） | ✅ 全部读取 | ✅ 修改状态、编辑、评论、创建、工时 |
