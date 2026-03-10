# ============================================
# 凭证管理 - 完整业务生命周期
# Controller: FinanceVoucherController
# 流程:
#   预查 → 分页查询 → 新增草稿A(删除用) → 查详情 → 删除草稿A
#        → 新增草稿B(提交用) → 提交审批B → 分页验证 → 导出 → 未授权
# 说明: 已提交凭证不可删除，故用两张草稿分别测试删除和提交
# ============================================

# 0a. 获取真实食堂 ID 及所属区域 ID（一次请求同时捕获两者）
POST {{base_url}}/api/v2/alloc/canteen/page-canteen
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 1
    }
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.records" count > 0
[Captures]
canteen_id: jsonpath "$.data.records[0].canteenId"
area_id: jsonpath "$.data.records[0].areaId"


# 0b. 获取真实凭证类型 ID
POST {{base_url}}/report/finance/setting/voucher-type/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 1
    }
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_type_id_real: jsonpath "$.data.records[0].id"


# 0c. 获取真实凭证字 ID
POST {{base_url}}/report/finance/setting/voucher-word/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 1
    }
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_word_id_real: jsonpath "$.data.records[0].id"


# 1. 凭证 - 分页查询（含合计行）
# Controller: ReportBaseTotalVO<VoucherPageVO> page(LeRequest<VoucherPageParam>)
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2026-01-01",
    "endDate": "2026-03-10"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage" exists
jsonpath "$.data.resultPage.records" isCollection
jsonpath "$.data.resultPage.current" exists
jsonpath "$.data.resultPage.size" exists
jsonpath "$.data.resultPage.total" exists
# VoucherPageVO 字段覆盖（首条记录）
jsonpath "$.data.resultPage.records[0].id" exists
jsonpath "$.data.resultPage.records[0].voucherDate" isString
jsonpath "$.data.resultPage.records[0].summary" isString
jsonpath "$.data.resultPage.records[0].debitTotal" exists
jsonpath "$.data.resultPage.records[0].creditTotal" exists
jsonpath "$.data.resultPage.records[0].voucherNo" exists
jsonpath "$.data.resultPage.records[0].submitStatus" exists
jsonpath "$.data.resultPage.records[0].submitStatusDesc" isString
jsonpath "$.data.resultPage.records[0].approveStatus" exists
jsonpath "$.data.resultPage.records[0].approveStatusDesc" isString
jsonpath "$.data.resultPage.records[0].crby" isString
jsonpath "$.data.resultPage.records[0].crtime" isString
# 合计行字段覆盖
jsonpath "$.data.totalLine" exists
jsonpath "$.data.totalLine.debitTotal" exists
jsonpath "$.data.totalLine.creditTotal" exists


# 2. 凭证 - 关键字搜索（keyword 匹配科目名称）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2026-01-01",
    "endDate": "2026-03-10",
    "keyword": "收入"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 2b. 凭证 - 凭证号查询条件（voucherNo 筛选）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2025-01-01",
    "endDate": "2026-03-10",
    "voucherNo": "001"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 2c. 凭证 - 区域+食堂查询条件（不同区域档口的数据）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2025-01-01",
    "endDate": "2026-03-10",
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}}
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 2d. 凭证 - 时间范围（单日查询）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2026-03-10",
    "endDate": "2026-03-10"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 2e. 凭证 - 时间范围（无数据区间，验证空结果）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2020-01-01",
    "endDate": "2020-01-02"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection
jsonpath "$.data.resultPage.records" count == 0


# 3. 凭证草稿A - 新增（用于测试删除）
# Controller: Long save(LeRequest<VoucherSaveParam>)
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}},
    "voucherDate": "2026-03-10",
    "voucherTypeId": {{voucher_type_id_real}},
    "voucherWordId": {{voucher_word_id_real}},
    "summary": "auto-test草稿A-删除测试，可删除",
    "entries": [
      {
        "costNo": "2222",
        "summary": "测试分录-借方",
        "debitAmount": 10000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "测试分录-贷方",
        "debitAmount": 0,
        "creditAmount": 10000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_id_a: jsonpath "$.data"


# 4. 凭证草稿A - 查详情
# Controller: VoucherDetailVO detail(LeRequest<Long>)
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id_a}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
# VoucherDetailVO 完整字段
jsonpath "$.data.id" exists
jsonpath "$.data.areaId" exists
jsonpath "$.data.areaName" isString
jsonpath "$.data.canteenId" exists
jsonpath "$.data.canteenName" isString
jsonpath "$.data.voucherDate" isString
jsonpath "$.data.voucherTypeId" exists
jsonpath "$.data.voucherTypeName" isString
jsonpath "$.data.voucherWordId" exists
jsonpath "$.data.voucherWordName" isString
jsonpath "$.data.summary" isString
jsonpath "$.data.debitTotal" exists
jsonpath "$.data.creditTotal" exists
jsonpath "$.data.submitStatus" == 1
jsonpath "$.data.approveStatus" == 0
jsonpath "$.data.crtime" isString
# VoucherEntryVO 字段（分录列表）
jsonpath "$.data.entries" isCollection
jsonpath "$.data.entries" count == 2
jsonpath "$.data.entries[0].id" exists
jsonpath "$.data.entries[0].costNo" isString
jsonpath "$.data.entries[0].summary" isString
jsonpath "$.data.entries[0].debitAmount" exists
jsonpath "$.data.entries[0].creditAmount" exists


# 4b. 凭证草稿A - 编辑（save 带 id 走 delete-insert 模式）
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "id": {{voucher_id_a}},
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}},
    "voucherDate": "2026-03-10",
    "voucherTypeId": {{voucher_type_id_real}},
    "voucherWordId": {{voucher_word_id_real}},
    "voucherNo": "AT-001",
    "summary": "auto-test草稿A-编辑后",
    "entries": [
      {
        "costNo": "2222",
        "summary": "编辑后-借方",
        "auxiliaryAccounting": "部门:测试部",
        "debitAmount": 20000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "编辑后-贷方",
        "auxiliaryAccounting": "部门:测试部",
        "debitAmount": 0,
        "creditAmount": 20000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 4c. 凭证草稿A - 编辑后查详情（验证 delete-insert + voucherNo + auxiliaryAccounting）
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id_a}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.id" exists
# 主表字段验证
jsonpath "$.data.summary" == "auto-test草稿A-编辑后"
jsonpath "$.data.debitTotal" exists
jsonpath "$.data.creditTotal" exists
# delete-insert 验证：旧2条已删，仅新2条
jsonpath "$.data.entries" count == 2
jsonpath "$.data.entries[0].summary" contains "编辑后"
jsonpath "$.data.entries[0].auxiliaryAccounting" == "部门:测试部"
jsonpath "$.data.entries[1].auxiliaryAccounting" == "部门:测试部"
# VoucherEntryVO 字段覆盖
jsonpath "$.data.entries[0].id" exists
jsonpath "$.data.entries[0].costNo" isString
jsonpath "$.data.entries[0].debitAmount" exists
jsonpath "$.data.entries[0].creditAmount" exists
jsonpath "$.data.entries[0].images" exists


# 5. 凭证草稿A - 删除（submitStatus=1 待提交，可删除）
# Controller: void delete(LeRequest<Long>)
POST {{base_url}}/report/finance/voucher/delete
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id_a}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 6. 凭证草稿B - 新增（用于测试提交审批）
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}},
    "voucherDate": "2026-03-10",
    "voucherTypeId": {{voucher_type_id_real}},
    "voucherWordId": {{voucher_word_id_real}},
    "summary": "auto-test草稿B-提交审批测试",
    "entries": [
      {
        "costNo": "2222",
        "summary": "测试分录-借方",
        "debitAmount": 10000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "测试分录-贷方",
        "debitAmount": 0,
        "creditAmount": 10000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_id_b: jsonpath "$.data"


# 7. 凭证草稿B - 提交审批
# Controller: void submit(LeRequest<Long>)
# 前置条件：需配置财务凭证审批流（FlowDefinitionEum.FINANCE_VOUCHER_APPROVAL）
POST {{base_url}}/report/finance/voucher/submit
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id_b}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 8. 凭证 - 分页查询验证（扩大时间范围确保能查到已提交凭证）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 100
    },
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 9. 凭证 - 导出（异步导出，返回 void → code=10000）
# Controller: void export(LeRequest<VoucherPageParam>)
POST {{base_url}}/report/finance/voucher/export
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    },
    "startDate": "2026-01-01",
    "endDate": "2026-03-10"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 10. 凭证 - 详情（不存在的ID，验证接口兼容性）
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": 0
}

HTTP 200
[Asserts]
jsonpath "$.code" exists


# 11. 凭证 - 未授权（不带X-Token，预期401）
POST {{base_url}}/report/finance/voucher/page
Content-Type: application/json
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 10
    }
  }
}

HTTP 401
