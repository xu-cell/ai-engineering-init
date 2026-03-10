# ============================================
# 科目明细表 - 查询条件完整覆盖
# SubjectDetailVO 字段: voucherDate, areaName, canteenName, voucherNo,
#   summary, costNo, costTypeName, debitAmount(BigDecimal元),
#   creditAmount(BigDecimal元), direction, auxiliaryAccounting
# 前置: 创建凭证以确保有明细数据
# ============================================

# 0a. 获取真实食堂 ID 及所属区域 ID
POST {{base_url}}/api/v2/alloc/canteen/page-canteen
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 2
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
[Captures]
voucher_type_id: jsonpath "$.data.records[0].id"


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
[Captures]
voucher_word_id: jsonpath "$.data.records[0].id"


# 0d. 创建测试凭证（确保科目明细表有数据）
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
    "voucherTypeId": {{voucher_type_id}},
    "voucherWordId": {{voucher_word_id}},
    "voucherNo": "SD-TEST-001",
    "summary": "auto-test科目明细数据，可删除",
    "entries": [
      {
        "costNo": "2222",
        "summary": "科目明细测试-借方",
        "auxiliaryAccounting": "部门:测试部",
        "debitAmount": 30000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "科目明细测试-贷方",
        "auxiliaryAccounting": "部门:测试部",
        "debitAmount": 0,
        "creditAmount": 30000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
test_voucher_id: jsonpath "$.data"


# 0e. 提交凭证（科目明细表可能仅展示已提交凭证数据）
POST {{base_url}}/report/finance/voucher/submit
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{test_voucher_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 1. 科目明细表 - 分页查询（含合计行 + VO 字段完整覆盖）
POST {{base_url}}/report/finance/subject-detail/page
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
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
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
# 合计行字段覆盖（验证 SubjectDetailVO 字段结构，即使无数据也返回完整键名）
jsonpath "$.data.totalLine" exists
jsonpath "$.data.totalLine.voucherDate" exists
jsonpath "$.data.totalLine.areaName" exists
jsonpath "$.data.totalLine.canteenName" exists
jsonpath "$.data.totalLine.voucherNo" exists
jsonpath "$.data.totalLine.summary" exists
jsonpath "$.data.totalLine.costNo" exists
jsonpath "$.data.totalLine.costTypeName" exists
jsonpath "$.data.totalLine.debitAmount" exists
jsonpath "$.data.totalLine.creditAmount" exists
jsonpath "$.data.totalLine.direction" exists


# 2. 科目明细表 - 关键字搜索（keyword 匹配科目编码/名称 - "收入"类科目）
POST {{base_url}}/report/finance/subject-detail/page
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
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "keyword": "2222"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 3. 科目明细表 - 科目名称搜索（keyword 匹配 "2001" 科目编码）
POST {{base_url}}/report/finance/subject-detail/page
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
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "keyword": "11"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 4. 科目明细表 - 区域+食堂查询条件（不同区域档口的数据）
POST {{base_url}}/report/finance/subject-detail/page
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
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}}
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 5. 科目明细表 - 时间范围（单日查询）
POST {{base_url}}/report/finance/subject-detail/page
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


# 6. 科目明细表 - 时间范围（无数据区间，验证空结果）
POST {{base_url}}/report/finance/subject-detail/page
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


# 7. 科目明细表 - 第二页
POST {{base_url}}/report/finance/subject-detail/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 2,
      "size": 5
    },
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 8. 科目明细表 - 导出（异步导出，返回 void → code=10000）
POST {{base_url}}/report/finance/subject-detail/export
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
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 9. 科目明细表 - 未授权（不带X-Token）
POST {{base_url}}/report/finance/subject-detail/page
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


# 10. 清理 - 尝试删除测试凭证（已提交凭证可能无法删除，仅验证接口不报500）
POST {{base_url}}/report/finance/voucher/delete
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{test_voucher_id}}
}

HTTP 200
