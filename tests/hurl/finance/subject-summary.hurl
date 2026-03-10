# ============================================
# 科目汇总表 - 查询条件完整覆盖
# SubjectSummaryVO 字段: areaName, canteenName, costNo, costTypeName,
#   debitAmountSum(Long分), creditAmountSum(Long分), direction
# 前置: 创建凭证以确保有汇总数据
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


# 0d. 创建测试凭证（确保科目汇总表有数据）
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
    "summary": "auto-test科目汇总数据，可删除",
    "entries": [
      {
        "costNo": "2222",
        "summary": "科目汇总测试-借方",
        "debitAmount": 50000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "科目汇总测试-贷方",
        "debitAmount": 0,
        "creditAmount": 50000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
test_voucher_id: jsonpath "$.data"


# 0e. 提交凭证（科目汇总表可能仅展示已提交凭证数据）
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


# 1. 科目汇总表 - 分页查询（含合计行 + VO 字段完整覆盖）
POST {{base_url}}/report/finance/subject-summary/page
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
# 合计行字段覆盖（验证 SubjectSummaryVO 字段结构，即使无数据也返回完整键名）
jsonpath "$.data.totalLine" exists
jsonpath "$.data.totalLine.areaName" exists
jsonpath "$.data.totalLine.canteenName" exists
jsonpath "$.data.totalLine.costNo" exists
jsonpath "$.data.totalLine.costTypeName" exists
jsonpath "$.data.totalLine.debitAmountSum" exists
jsonpath "$.data.totalLine.creditAmountSum" exists
jsonpath "$.data.totalLine.direction" exists


# 2. 科目汇总表 - 关键字搜索（keyword 匹配科目编码 "1001"）
POST {{base_url}}/report/finance/subject-summary/page
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


# 3. 科目汇总表 - 科目名称搜索（keyword 匹配 "收入"）
POST {{base_url}}/report/finance/subject-summary/page
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
    "keyword": "收入"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.resultPage.records" isCollection


# 4. 科目汇总表 - 区域+食堂查询条件（不同区域档口的数据）
POST {{base_url}}/report/finance/subject-summary/page
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


# 5. 科目汇总表 - 时间范围（单日查询）
POST {{base_url}}/report/finance/subject-summary/page
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


# 6. 科目汇总表 - 时间范围（无数据区间，验证空结果）
POST {{base_url}}/report/finance/subject-summary/page
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


# 7. 科目汇总表 - 导出（异步导出，返回 void → code=10000）
POST {{base_url}}/report/finance/subject-summary/export
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


# 8. 科目汇总表 - 未授权（不带X-Token）
POST {{base_url}}/report/finance/subject-summary/page
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


# 9. 清理 - 尝试删除测试凭证（已提交凭证可能无法删除，仅验证接口不报500）
POST {{base_url}}/report/finance/voucher/delete
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{test_voucher_id}}
}

HTTP 200
