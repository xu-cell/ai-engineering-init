# 系统接口请求响应规范（详细参考）

> 本文件定义了 leniu 系统的标准接口契约。生成测试用例时**必须严格匹配**这些模式。
> 安装框架后可直接使用，无需额外学习。

## 统一请求格式

所有 POST 接口使用 `LeRequest<T>` 封装，业务参数放在 `content` 字段内：

```json
{
  "content": { /* 业务参数 */ }
}
```

## 统一响应格式

```json
{
  "code": 10000,       // 业务码：10000=成功，其他=失败
  "msg": "操作成功",    // 提示信息
  "data": ...          // 业务数据（类型取决于接口）
}
```

## 接口类型与响应模式速查

根据 Controller 方法返回值类型，确定 data 的结构和对应断言：

| Controller 返回类型 | data 类型 | 示例 | Hurl 断言模板 |
|---------------------|----------|------|--------------|
| `Long` | 雪花 ID | `$.data` = 1234567890 | `jsonpath "$.data" isInteger` |
| `void` | null | `$.data` = null | `jsonpath "$.code" == 10000` |
| `XxxVO` | 对象 | `$.data.id`, `$.data.name` | `jsonpath "$.data.id" exists` |
| `PageVO<XxxVO>` | 分页对象 | `$.data.records[0]` | 见「标准分页」 |
| `ReportBaseTotalVO<XxxVO>` | 分页+合计 | `$.data.resultPage` + `$.data.totalLine` | 见「报表分页」 |

## 标准分页响应（PageVO）

**适用于**：设置类 CRUD 分页查询（如凭证类型、凭证字）

```json
{
  "code": 10000,
  "data": {
    "records": [ { "id": 1, "name": "..." }, ... ],
    "current": 1,
    "size": 10,
    "total": 25
  }
}
```

**Hurl 断言模板**：

```hurl
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.records" isCollection
jsonpath "$.data.current" exists
jsonpath "$.data.size" exists
jsonpath "$.data.total" exists
# VO 字段逐一验证
jsonpath "$.data.records[0].id" exists
jsonpath "$.data.records[0].typeName" isString
```

## 报表分页响应（ReportBaseTotalVO）

**适用于**：报表类分页查询（凭证列表、科目明细、科目汇总），响应包含 `resultPage`（分页数据）+ `totalLine`（合计行）

```json
{
  "code": 10000,
  "data": {
    "resultPage": {
      "records": [ { ... }, ... ],
      "current": 1,
      "size": 10,
      "total": 25
    },
    "totalLine": {
      "debitAmount": 1285100,
      "creditAmount": 1285000
    }
  }
}
```

**Hurl 断言模板**：

```hurl
HTTP 200
[Asserts]
jsonpath "$.code" == 10000
# 分页结构
jsonpath "$.data.resultPage" exists
jsonpath "$.data.resultPage.records" isCollection
jsonpath "$.data.resultPage.current" exists
jsonpath "$.data.resultPage.size" exists
jsonpath "$.data.resultPage.total" exists
# VO 字段逐一验证（首条记录）
jsonpath "$.data.resultPage.records[0].voucherDate" isString
jsonpath "$.data.resultPage.records[0].areaName" isString
jsonpath "$.data.resultPage.records[0].costTypeName" isString  # 关联字段不能为 null
# 合计行（只有数值字段和方向字段，其余为 null 占位）
jsonpath "$.data.totalLine" exists
jsonpath "$.data.totalLine.debitAmount" exists
jsonpath "$.data.totalLine.creditAmount" exists
```

## 各操作类型的请求与响应模式

### 1. 新增（save）→ 返回 Long ID

```hurl
# Controller: Long save(LeRequest<XxxSaveParam>)
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "areaId": {{area_id}},
    "name": "auto-test数据，可删除",
    "entries": [ ... ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
created_id: jsonpath "$.data"    # 捕获返回的 ID 供后续使用
```

### 2. 编辑（save 带 id / update）→ 返回 void

```hurl
# 方式一：save 带 id（delete-insert 模式，常用于主子表）
POST {{base_url}}/report/finance/voucher/save
{ "content": { "id": {{created_id}}, "name": "修改后", ... } }

# 方式二：独立 update 接口
POST {{base_url}}/report/finance/setting/voucher-type/update
{ "content": { "id": {{type_id}}, "typeName": "修改后" } }

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
```

### 3. 查详情（detail）→ 返回 XxxVO 对象

```hurl
# Controller: XxxDetailVO detail(LeRequest<Long>)
# 注意：content 直接传 ID 值（Long），不需要包装对象
POST {{base_url}}/report/finance/voucher/detail
{ "content": {{created_id}} }

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.id" exists
jsonpath "$.data.areaName" isString
jsonpath "$.data.entries" isCollection      # 子表数据
jsonpath "$.data.entries" count == 2
jsonpath "$.data.entries[0].id" exists
```

### 4. 删除（delete）→ 返回 void

```hurl
# Controller: void delete(LeRequest<Long>)
# 注意：content 直接传 ID 值（Long）
POST {{base_url}}/report/finance/voucher/delete
{ "content": {{created_id}} }

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
```

### 5. 提交/审批等状态变更 → 返回 void

```hurl
# Controller: void submit(LeRequest<Long>)
POST {{base_url}}/report/finance/voucher/submit
{ "content": {{created_id}} }

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
```

### 6. 分页查询（page）→ 返回 PageVO 或 ReportBaseTotalVO

```hurl
# 标准分页（设置类）
POST {{base_url}}/report/finance/setting/voucher-type/page
{
  "content": {
    "page": { "current": 1, "size": 10 }
  }
}

# 报表分页（含合计行）
POST {{base_url}}/report/finance/voucher/page
{
  "content": {
    "page": { "current": 1, "size": 10 },
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}
```

### 7. 导出（export）→ 返回 void（异步）

```hurl
# Controller: void export(LeRequest<XxxPageParam>)
# 异步导出，仅验证接口不报错
POST {{base_url}}/report/finance/voucher/export
{
  "content": {
    "page": { "current": 1, "size": 10 },
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
```

### 8. 未授权测试 → 预期 HTTP 401

```hurl
# 去掉 X-Token 请求头
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{ "content": { "page": { "current": 1, "size": 10 } } }

HTTP 401
```

## content 传值类型总结

| 场景 | content 类型 | 示例 |
|------|-------------|------|
| 分页查询 | 对象（含 page + 查询条件） | `{"page":{"current":1,"size":10},"keyword":"xxx"}` |
| 新增/编辑 | 对象（业务字段） | `{"name":"xxx","entries":[...]}` |
| 查详情/删除/提交 | **裸 Long** | `{{id}}` （不是 `{"id": {{id}}}`） |

> **关键区别**：detail/delete/submit 的 content 是**直接传 ID 值**，不需要包装成对象。这是最常见的错误。
