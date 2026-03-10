# ============================================
# 凭证分录（明细表）修改 - delete-insert 行为验证
# 修复后预期: save with id 时先逻辑删除旧分录，再插入新分录
# 流程:
#   Setup → 新增凭证(2条分录) → 验证2条
#        → 编辑(新2条分录+auxiliaryAccounting) → 验证仅2条(旧分录已删)
#        → 再次编辑(3条分录) → 验证仅3条
#        → 编辑(1条分录) → 验证仅1条
#        → 清理(删除凭证)
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
      "size": 1
    }
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
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


# 1. 新增凭证 - 2条分录（无 auxiliaryAccounting）
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
    "summary": "auto-test分录修改测试，可删除",
    "entries": [
      {
        "costNo": "2222",
        "summary": "初始分录-借方",
        "debitAmount": 10000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "初始分录-贷方",
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
voucher_id: jsonpath "$.data"


# 2. 验证初始状态 - 2条分录 + VoucherEntryVO 字段覆盖
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.entries" count == 2
jsonpath "$.data.entries[0].id" exists
jsonpath "$.data.entries[0].costNo" isString
jsonpath "$.data.entries[0].summary" == "初始分录-借方"
jsonpath "$.data.entries[0].debitAmount" exists
jsonpath "$.data.entries[0].creditAmount" exists
jsonpath "$.data.entries[0].auxiliaryAccounting" exists
jsonpath "$.data.entries[0].images" exists
jsonpath "$.data.entries[1].summary" == "初始分录-贷方"


# 3. 编辑分录 - delete-insert 模式：新2条替换旧2条 + auxiliaryAccounting
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "id": {{voucher_id}},
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}},
    "voucherDate": "2026-03-10",
    "voucherTypeId": {{voucher_type_id}},
    "voucherWordId": {{voucher_word_id}},
    "summary": "auto-test分录修改测试-已编辑",
    "entries": [
      {
        "costNo": "2222",
        "summary": "编辑后-借方（金额翻倍）",
        "auxiliaryAccounting": "部门:财务部",
        "debitAmount": 20000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "编辑后-贷方（金额翻倍）",
        "auxiliaryAccounting": "部门:财务部",
        "debitAmount": 0,
        "creditAmount": 20000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 4. 验证编辑结果 - 仅2条（旧分录已逻辑删除）+ auxiliaryAccounting 已保存
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.summary" == "auto-test分录修改测试-已编辑"
# delete-insert 验证：仅新的2条分录
jsonpath "$.data.entries" count == 2
jsonpath "$.data.entries[0].summary" == "编辑后-借方（金额翻倍）"
jsonpath "$.data.entries[0].auxiliaryAccounting" == "部门:财务部"
jsonpath "$.data.entries[1].summary" == "编辑后-贷方（金额翻倍）"
jsonpath "$.data.entries[1].auxiliaryAccounting" == "部门:财务部"


# 5. 再次编辑 - 改为3条分录（验证数量变化）
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "id": {{voucher_id}},
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}},
    "voucherDate": "2026-03-10",
    "voucherTypeId": {{voucher_type_id}},
    "voucherWordId": {{voucher_word_id}},
    "summary": "auto-test分录修改测试-第二次编辑",
    "entries": [
      {
        "costNo": "2222",
        "summary": "三条分录-借方A",
        "auxiliaryAccounting": "部门:研发部",
        "debitAmount": 15000,
        "creditAmount": 0
      },
      {
        "costNo": "1002",
        "summary": "三条分录-借方B",
        "auxiliaryAccounting": "项目:测试项目",
        "debitAmount": 5000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "三条分录-贷方",
        "auxiliaryAccounting": "部门:研发部",
        "debitAmount": 0,
        "creditAmount": 20000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 6. 验证 - 仅3条分录（上一轮的2条已删除）
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.entries" count == 3
jsonpath "$.data.entries[0].auxiliaryAccounting" == "部门:研发部"
jsonpath "$.data.entries[1].auxiliaryAccounting" == "项目:测试项目"
jsonpath "$.data.entries[2].auxiliaryAccounting" == "部门:研发部"


# 7. 编辑 - 减少为1条分录
POST {{base_url}}/report/finance/voucher/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "id": {{voucher_id}},
    "areaId": {{area_id}},
    "canteenId": {{canteen_id}},
    "voucherDate": "2026-03-10",
    "voucherTypeId": {{voucher_type_id}},
    "voucherWordId": {{voucher_word_id}},
    "summary": "auto-test分录修改测试-减少分录",
    "entries": [
      {
        "costNo": "2222",
        "summary": "仅剩一条",
        "debitAmount": 0,
        "creditAmount": 0
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 8. 验证 - 仅1条分录
POST {{base_url}}/report/finance/voucher/detail
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.entries" count == 1
jsonpath "$.data.entries[0].summary" == "仅剩一条"


# 9. 清理 - 删除测试凭证
POST {{base_url}}/report/finance/voucher/delete
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
