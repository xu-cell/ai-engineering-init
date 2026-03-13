---
name: auto-test
description: |
  API 自动化测试技能。基于 Apifox MCP 读取接口文档，使用 Hurl 生成并执行真实 HTTP 测试，
  支持单接口测试、单业务组合（CRUD 生命周期）、跨业务串联（多模块流程），生成 HTML/JSON 测试报告。
  测试失败时自动调用 fix-bug 技能走标准修复流程。

  触发场景：
  - 需要对 API 接口进行自动化测试
  - 需要验证接口是否符合文档定义
  - 需要组合多个接口形成业务流程测试
  - 需要生成接口测试报告
  - 开发完成后需要回归测试验证

  触发词：自动测试、auto-test、接口测试、API测试、Hurl、测试报告、回归测试
---

# API 自动化测试（Hurl + Apifox MCP）

## 概述

通过 Apifox MCP 读取接口文档 → AI 生成 Hurl 测试文件 → 执行真实 HTTP 请求 → 生成测试报告 → 失败项**自动调用 `/fix-bug` 走标准修复流程**。

**前置依赖**：
- Hurl CLI（`brew install hurl` / `winget install hurl` / `apt install hurl`）
- Apifox MCP Server（已配置项目 ID 和 Access Token）
- 后端服务运行中

## 测试粒度

| 粒度 | 说明 | 文件命名 | 示例 |
|------|------|---------|------|
| **单接口** | 一个 API 端点的正常+异常场景 | `{接口名}.hurl` | `create-order.hurl` |
| **单业务组合** | 一个模块的 CRUD 生命周期 | `{模块}-lifecycle.hurl` | `order-lifecycle.hurl` |
| **跨业务串联** | 多模块联动的完整业务流程 | `{流程名}-flow.hurl` | `menu-order-payment-flow.hurl` |

## 文件结构

```
tests/hurl/
├── env/
│   ├── dev.env              # 开发环境变量
│   ├── test.env             # 测试环境
│   └── prod.env             # 生产环境（只读接口）
├── {模块名}/                 # 按业务模块组织
│   ├── {接口名}.hurl         # 单接口测试
│   └── {模块}-lifecycle.hurl # 单业务组合
├── flows/                   # 跨业务串联
│   └── {流程名}-flow.hurl
└── reports/                 # 测试报告（gitignore）
    ├── index.html
    └── report.json
```

## 系统接口请求响应规范

> 详细参考：`references/api-conventions.md`（首次生成测试时必须读取）

### 核心契约速查

| 项目 | 规范 |
|------|------|
| 请求封装 | `{"content": { ... }}` （LeRequest） |
| 成功码 | `code == 10000` |
| 认证头 | `X-Token` + `merchant-id` + `Merchant-Id` |
| 未授权 | 不带 X-Token → HTTP 401 |

### 返回类型 → data 结构映射

| Controller 返回类型 | data 结构 | 断言关键路径 |
|---------------------|----------|-------------|
| `Long`（save） | 雪花 ID | `$.data` isInteger |
| `void`（delete/submit/export） | null | 仅验证 `$.code == 10000` |
| `XxxVO`（detail） | 对象 | `$.data.id` exists |
| `PageVO<T>`（设置类 page） | `$.data.records[]` | `$.data.records` isCollection |
| `ReportBaseTotalVO<T>`（报表 page） | `$.data.resultPage.records[]` + `$.data.totalLine` | 分页 + 合计行 |

### content 传值类型（最易出错）

| 场景 | content 类型 | 示例 |
|------|-------------|------|
| 分页查询 | 对象 | `{"page":{"current":1,"size":10},"keyword":"xxx"}` |
| 新增/编辑 | 对象 | `{"name":"xxx","entries":[...]}` |
| 详情/删除/提交 | **裸 Long** | `{{id}}`（不是 `{"id":{{id}}}`） |

> **关键区别**：detail/delete/submit 的 content 是**直接传 ID 值**，不需要包装成对象。

## Hurl 语法速查

### 请求头规范（必须遵守）

每个需要认证的请求必须携带以下 Header：

| Header | 来源 | 用途 |
|--------|------|------|
| `X-Token` | 环境变量 `{{x_token}}`（配置文件提供） | 认证令牌 |
| `merchant-id` | 环境变量 `{{merchant_id}}` | 商户路由（数据源切换） |
| `Merchant-Id` | 环境变量 `{{merchant_id_auth}}` | 商户权限校验 |

### 基础请求 + 断言

```hurl
# 请求
POST {{base_url}}/api/v2/web/order/add
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "menuId": 1001,
    "quantity": 2
  }
}

# 响应断言
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.msg" == "操作成功"
jsonpath "$.data" isInteger
```

### 变量捕获（请求间传递数据）

```hurl
# 如果需要动态获取 Token，可以通过登录接口捕获
POST {{base_url}}/api/v2/web/auth/login
Content-Type: application/json
{
  "username": "{{username}}",
  "password": "{{password}}"
}

HTTP 200
[Captures]
x_token: jsonpath "$.data.token"
```

> 注意：X-Token 优先使用 env 文件中预配置的值，避免每次都调登录接口。
> 仅在测试登录流程本身或 Token 过期场景时，才通过登录接口动态获取。

### 常用断言

```hurl
[Asserts]
# 状态码
status == 200

# JSON 路径
jsonpath "$.code" == 10000
jsonpath "$.data" exists
jsonpath "$.data" isCollection
jsonpath "$.data.id" isInteger
jsonpath "$.data.name" isString
jsonpath "$.data.list" count > 0

# 类型检查
jsonpath "$.data.price" isFloat

# 包含
jsonpath "$.msg" contains "成功"

# 正则
jsonpath "$.data.phone" matches "^1[3-9]\\d{9}$"
```

### 环境变量文件格式

```properties
# env/dev.env
base_url=http://192.168.97.235:58300

# 认证 Token（X-Token 请求头，配置后所有请求自动携带）
x_token=你的Token值

# 商户路由（merchant-id 请求头，用于数据源切换）
merchant_id=你的商户ID

# 商户权限（Merchant-Id 请求头，用于权限校验）
merchant_id_auth=你的商户ID
```

## 执行命令

```bash
# 运行单个测试
hurl --test --variables-file tests/hurl/env/dev.env tests/hurl/order/create-order.hurl

# 运行模块所有测试
hurl --test --variables-file tests/hurl/env/dev.env tests/hurl/order/*.hurl

# 运行全部测试 + 生成报告
hurl --test \
  --variables-file tests/hurl/env/dev.env \
  --report-html tests/hurl/reports \
  --report-json tests/hurl/reports/report.json \
  tests/hurl/**/*.hurl

# 传递动态变量（如时间戳避免唯一键冲突）
TS=$(date +%s) && hurl --test \
  --variables-file tests/hurl/env/dev.env \
  --variable "voucher_type_ts=$TS" \
  --variable "voucher_word_ts=$TS" \
  tests/hurl/finance/*.hurl

# 指定超时（毫秒）
hurl --test --connect-timeout 5000 --max-time 30000 ...

# 失败时继续执行（不中断）
hurl --test --continue-on-error ...
```

## 生成测试的流程

### 第一步：读取接口文档

通过 Apifox MCP 读取指定模块的接口列表：
- 接口路径、HTTP 方法
- 请求参数（Header、Body、Query）
- 响应结构（字段名、类型、示例值）

### 第二步：读取 Param/VO 源码（关键！）

**必须读取后端源码**以确保测试完整性：

1. **Param 类**：提取所有查询条件字段，确保每个字段都有对应测试用例
2. **VO 类**：提取所有响应字段，在断言中验证字段存在性和类型
3. **Mapper XML**：理解 SQL 逻辑、JOIN 关系、动态条件

```
示例：SubjectDetailParam 有 startDate、endDate、areaId、canteenId、keyword
→ 测试用例必须覆盖：
  - 基础分页查询（startDate + endDate）
  - keyword 搜索（科目编码/名称）
  - 区域+食堂筛选（areaId + canteenId）
  - 单日查询（startDate == endDate）
  - 空结果区间（验证空数组返回）
  - 分页第二页
  - 导出接口
  - 未授权测试
```

### 第三步：准备测试数据（先查后用，禁止硬编码）

**核心原则：测试数据必须从真实环境动态获取，不能硬编码不存在的 ID 或编码。**

```hurl
# ✅ 正确：先查询获取真实数据，再用于后续请求
# 0a. 获取真实食堂 ID
POST {{base_url}}/api/v2/alloc/canteen/page-canteen
...
[Captures]
canteen_id: jsonpath "$.data.records[0].canteenId"
area_id: jsonpath "$.data.records[0].areaId"

# 0b. 获取关联表的真实记录
POST {{base_url}}/report/finance/setting/voucher-type/page
...
[Captures]
voucher_type_id: jsonpath "$.data.records[0].id"
```

```hurl
# ❌ 错误：硬编码不存在的引用数据
{
  "content": {
    "costNo": "9999",        # 可能不存在
    "voucherTypeId": 1       # 可能不存在
  }
}
```

**测试数据准备检查清单**：
- [ ] 外键引用的 ID 通过查询接口动态获取
- [ ] 业务编码（如 costNo）使用数据库中已存在的真实记录
- [ ] 唯一键字段使用时间戳变量避免冲突（`{{xxx_ts}}`）
- [ ] 创建的测试数据标记 summary 含 `auto-test` 便于识别清理
- [ ] 测试结束后有清理步骤（删除测试数据）

### 第四步：生成 .hurl 文件

#### 4.1 查询条件类型识别与测试策略

读取 Param 类后，**逐字段识别条件类型**，按下表生成对应测试用例：

| 条件类型 | 识别特征 | 示例字段 | 必须生成的测试用例 |
|---------|---------|---------|----------------|
| **日期范围** | `startDate`/`endDate` 成对 | `startDate`, `endDate` | ① 正常区间 ② 单日（start==end） ③ 跨月区间 ④ 必填时留空（预期报错/空结果） |
| **关键词搜索** | `keyword`, `name`, `code` 等 | `keyword`, `canteenName` | ① 精确匹配已知值 ② 模糊匹配前缀 ③ 无匹配的乱码（验证空数组） ④ 留空（不过滤，验证正常返回） |
| **枚举/状态** | 字段类型为枚举或 Integer 语义明确 | `status`, `type`, `mealtype` | ① 每个有效枚举值各一条请求 ② 可选时留空（验证不过滤） |
| **ID / 外键** | 字段名含 `Id`，关联其他表 | `canteenId`, `areaId` | ① 传有效 ID（有数据，验证过滤生效） ② 留空（不过滤，验证正常返回） ③ 传不存在 ID（验证空结果） |
| **布尔开关** | boolean / Integer 表示开关 | `isSubmitted`, `isEnabled` | ① `true`/`1` ② `false`/`0` ③ 留空 |
| **集合/多选** | `List<Integer>`, `List<String>` | `mealtimeTypes`, `statusList` | ① 单项 ② 多项组合 ③ 空列表或留空 |
| **分页** | `page.current`/`page.size` | `page` | ① 第1页 size=10 ② 第2页（验证翻页） ③ size=1（验证精确分页） |

#### 4.2 各条件类型 Hurl 示例

**① 日期范围**
```hurl
# TC-DATE-1 正常日期区间
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" count > 0

# TC-DATE-2 单日查询（start == end）
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-15","endDate":"2024-01-15"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000

# TC-DATE-3 空区间（故意用无数据的日期）
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2099-01-01","endDate":"2099-01-31"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" count == 0
```

**② 关键词搜索**
```hurl
# TC-KW-1 精确关键词匹配
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31","keyword":"{{known_canteen_name}}"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" count > 0

# TC-KW-2 无匹配关键词
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31","keyword":"__NO_MATCH_XYZ__"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" count == 0

# TC-KW-3 留空 keyword（不过滤）
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection
```

**③ 枚举/状态**
```hurl
# TC-ENUM-1 状态=1（已提交）
POST {{base_url}}/api/v2/web/order/page
...
{"content": {"page":{"current":1,"size":10},"status":1}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.records[0].status" == 1

# TC-ENUM-2 状态=2（已完成）
POST {{base_url}}/api/v2/web/order/page
...
{"content": {"page":{"current":1,"size":10},"status":2}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000

# TC-ENUM-3 不传 status（全部状态）
POST {{base_url}}/api/v2/web/order/page
...
{"content": {"page":{"current":1,"size":10}}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
```

**④ ID / 外键**
```hurl
# TC-ID-1 传有效 canteenId（有数据，过滤生效）
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31","canteenId":{{canteen_id}}}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" count > 0
jsonpath "$.data.resultPage.records[0].canteenId" == {{canteen_id}}

# TC-ID-2 不传 canteenId（不过滤）
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31"}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000

# TC-ID-3 传不存在 ID（空结果）
POST {{base_url}}/api/v2/web/report/subject/page
...
{"content": {"page":{"current":1,"size":10},"startDate":"2024-01-01","endDate":"2024-01-31","canteenId":999999999}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" count == 0
```

**⑤ 集合/多选**
```hurl
# TC-LIST-1 单项
POST {{base_url}}/api/v2/web/order/page
...
{"content": {"page":{"current":1,"size":10},"mealtimeTypes":[1]}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000

# TC-LIST-2 多项组合
POST {{base_url}}/api/v2/web/order/page
...
{"content": {"page":{"current":1,"size":10},"mealtimeTypes":[1,2,3]}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.records" isCollection

# TC-LIST-3 空列表（不过滤）
POST {{base_url}}/api/v2/web/order/page
...
{"content": {"page":{"current":1,"size":10},"mealtimeTypes":[]}}
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
```

#### 4.3 测试场景清单（完整版）

每个查询接口必须覆盖以下场景，按顺序在同一 `.hurl` 文件中组织：

```
必须生成（顺序执行）：
TC-BASE    基础分页查询   — 只传必填参数，验证分页结构 + VO 所有字段存在
TC-TOTAL   合计行验证     — 如返回类型含 totalLine，验证所有合计字段
TC-DATE-*  日期条件用例   — 若有 startDate/endDate（见上方策略）
TC-KW-*    关键词用例     — 若有 keyword 类字段（见上方策略）
TC-ENUM-*  枚举用例       — 若有状态/类型枚举，每个枚举值各一条
TC-ID-*    外键 ID 用例   — 若有 xxxId 过滤（见上方策略）
TC-LIST-*  集合用例       — 若有多选字段（见上方策略）
TC-PAGE    翻页验证       — current=2，验证翻页正确（total > size 时才有意义）
TC-EMPTY   空结果验证     — 使用必然无数据的条件，验证 records count == 0
TC-EXPORT  导出接口       — 验证 code=10000（若有导出接口）
TC-UNAUTH  未授权         — 不带 X-Token，预期 HTTP 401
```

> **命名规范**：在 Hurl 文件中用注释标注场景编号，便于报告定位：
> ```hurl
> # TC-DATE-1 正常日期区间
> # TC-KW-2 无匹配关键词
> ```

**数据正确性验证**（不只是结构存在，还要验证值合理）：

```hurl
# ✅ 结构验证 + 数据正确性
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection
jsonpath "$.data.resultPage.records" count > 0
# VO 字段存在性
jsonpath "$.data.resultPage.records[0].costNo" isString
jsonpath "$.data.resultPage.records[0].costTypeName" isString    # 关联字段不能为 null
jsonpath "$.data.resultPage.records[0].debitAmount" exists
# 合计行数据合理性
jsonpath "$.data.totalLine.debitAmount" exists
jsonpath "$.data.totalLine.creditAmount" exists
```

### 第五步：执行并生成报告

```bash
hurl --test \
  --variables-file tests/hurl/env/dev.env \
  --report-html tests/hurl/reports \
  --report-json tests/hurl/reports/report.json \
  --continue-on-error \
  tests/hurl/{模块}/*.hurl
```

### 第六步：解析报告

读取 `report.json`，输出摘要：

```markdown
## 测试报告摘要

| 状态 | 数量 | 占比 |
|------|------|------|
| PASS | 15   | 75%  |
| FAIL | 3    | 15%  |
| ERROR| 2    | 10%  |

### 失败详情

| 文件 | 接口 | 失败原因 |
|------|------|---------|
| order/create-order.hurl | POST /api/v2/web/order/add | 预期 code=10000，实际 code=40001 |
| menu/query-menu.hurl | GET /api/v2/web/menu/get/1 | 预期 HTTP 200，实际 HTTP 500 |
```

### 第七步：失败项自动触发 fix-bug 流程

**当测试存在失败项时，必须自动调用 `/fix-bug` 走标准修复流程：**

```
测试失败 → 分析失败原因 → 分类处理：

1. 测试数据问题（非代码 Bug）：
   - 引用数据不存在 → 修正测试用例中的数据
   - 唯一键冲突 → 添加时间戳变量
   - 权限/状态限制 → 调整测试前置条件

2. 后端代码 Bug：
   → 自动调用 Skill(fix-bug) 走标准修复流程
   → 包含：排查报告 → 用户确认 → 修复代码 → 重跑测试验证

3. 接口文档与实现不一致：
   → 输出差异报告，等待用户确认以哪个为准
```

**fix-bug 自动触发条件**：
- HTTP 状态码非预期（如 500）
- 业务码非预期（如 code != 10000）
- 响应字段缺失或类型不匹配
- 关联字段为 null（如 costTypeName 为 null 说明 JOIN 失败）
- 导出数据异常（原始字段暴露、金额未转换等）

**Bug 报告格式**（传递给 fix-bug）：

```
Bug 信息：
- 接口：{METHOD} {URL}
- 请求参数：{request body}
- 预期响应：{expected}
- 实际响应：{actual}
- Hurl 文件：{file path}
- 失败断言：{assertion detail}
- 关联源码：{Controller/Service/Mapper 文件路径}
```

## LeRequest 适配

leniu 项目的 POST 请求体使用 `LeRequest<T>` 封装：

```hurl
# ✅ 正确：使用 content 包装 + 三个必要 Header
POST {{base_url}}/api/v2/web/order/add
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "menuId": 1001,
    "quantity": 2
  }
}

# ❌ 错误：直接传业务字段 / 缺少 Header
POST {{base_url}}/api/v2/web/order/add
{
  "menuId": 1001,
  "quantity": 2
}
```

## 已知陷阱（Lessons Learned）

### 1. del_flag 约定不统一
leniu 主表用 `2=正常, 1=删除`，但某些设置表（如 `finance_voucher_type`, `finance_voucher_word`）使用 `@TableLogic` 默认值 `0=正常, 1=删除`。**不要盲目统一，要检查每张表的实际约定。**

### 2. 测试数据必须使用真实存在的引用数据
关联查询（JOIN）依赖引用数据存在且状态正确。例如：
- `cost_type` 表的 `state = 1` 才是有效记录
- `costNo` 必须在 `cost_type` 中存在且 `state = 1`
- 否则 LEFT JOIN 后关联字段（如 `costTypeName`）为 null

### 3. 导出验证要点
导出接口是异步的（返回 void → code=10000），需要额外关注：
- VO 的 `@ExcelIgnore` 是否正确标记了内部字段
- `@ExcelProperty(order=N)` 的顺序是否符合产品要求
- 金额字段是否配置了 `converter = CustomNumberConverter.class`（分→元）
- 枚举字段是否有对应的描述字段（如 submitStatus → submitStatusDesc）

### 4. 唯一键冲突
CRUD 生命周期测试中，新增记录的唯一键字段（如 typeCode）需要加时间戳变量：
```hurl
"typeCode": "AT_HURL_{{voucher_type_ts}}"
```
执行时通过 `--variable "voucher_type_ts=$(date +%s)"` 传入。

### 5. 后端未重启
修改后端代码后必须重启服务才能生效。如果测试结果不符合预期，先确认后端是否已重启。

## .gitignore 配置

```gitignore
# Hurl 测试报告
tests/hurl/reports/
```

## 注意

- 测试文件（`.hurl`）需要 Git 管理，报告目录不需要
- `env/*.env` 中的密码/Token 建议用环境变量替代，不要提交敏感信息
- 如果是 leniu 项目的 POST 接口，请求体必须用 `{"content": {...}}` 包装
- 生成测试前确保 Hurl CLI 已安装（`hurl --version`）
- 与 `test-development` 技能的区别：本技能是真实 HTTP 请求的集成测试，`test-development` 是 JUnit5 单元测试/MockMvc 测试
