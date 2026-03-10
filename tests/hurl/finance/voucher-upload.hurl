# ============================================
# 凭证附件上传测试
# 发现: 附件通过 entry 级别 images 字段存储，非凭证主表
# 流程:
#   Setup → 新增凭证(分录含 images) → 查详情验证 images 字段
#        → 编辑(更换 images) → 查详情验证
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


# 1. 新增凭证 - 分录带 images 字段（OSS 图片路径）
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
    "summary": "auto-test附件上传测试，可删除",
    "entries": [
      {
        "costNo": "2222",
        "summary": "带附件-借方",
        "images": "531721026669670400/cust/09ffd81e9f8c40debef4461c719d5685.jpg",
        "debitAmount": 5000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "无附件-贷方",
        "debitAmount": 0,
        "creditAmount": 5000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_id: jsonpath "$.data"


# 2. 查详情 - 验证 images 字段
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
jsonpath "$.data.id" exists
jsonpath "$.data.summary" == "auto-test附件上传测试，可删除"
jsonpath "$.data.entries" count == 2
# VoucherEntryVO images 字段验证
jsonpath "$.data.entries[0].images" exists
jsonpath "$.data.entries[1].images" exists


# 3. 编辑凭证 - 追加带不同 images 的分录
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
    "summary": "auto-test附件上传测试-已换附件",
    "entries": [
      {
        "costNo": "2222",
        "summary": "新附件-借方",
        "images": "531721026669670400/cust/new-attachment-test.jpg",
        "debitAmount": 5000,
        "creditAmount": 0
      },
      {
        "costNo": "11",
        "summary": "新附件-贷方",
        "images": "531721026669670400/cust/another-image.jpg",
        "debitAmount": 0,
        "creditAmount": 5000
      }
    ]
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 4. 查详情 - 验证 delete-insert 后分录 images（旧分录已删，仅新2条）
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
jsonpath "$.data.summary" == "auto-test附件上传测试-已换附件"
jsonpath "$.data.entries" count == 2
jsonpath "$.data.entries[0].images" exists
jsonpath "$.data.entries[1].images" exists


# 5. 清理 - 删除测试凭证
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
