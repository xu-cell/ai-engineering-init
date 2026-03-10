# ============================================
# 凭证字设置
# ============================================

# 1. 凭证字 - 初始化默认凭证字（收、支、结、转）
# Controller: void initDefaultVoucherWords() — 无参数
POST {{base_url}}/report/finance/setting/voucher-word/init-default
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 2. 凭证字 - 分页查询
# Controller: PageVO<FinanceVoucherWordVO> pageVoucherWord(LeRequest<VoucherWordPageParam>)
# FinanceVoucherWordVO 字段: id(Long), wordCode(String), wordName(String), wordDesc(String), crtime(LocalDateTime)
POST {{base_url}}/report/finance/setting/voucher-word/page
Content-Type: application/json
X-Token: {{x_token}}
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

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
jsonpath "$.data.records" isCollection
jsonpath "$.data.current" exists
jsonpath "$.data.size" exists
jsonpath "$.data.total" exists
# FinanceVoucherWordVO 字段覆盖
jsonpath "$.data.records[0].id" exists
jsonpath "$.data.records[0].wordCode" isString
jsonpath "$.data.records[0].wordName" isString
jsonpath "$.data.records[0].crtime" isString


# 3. 凭证字 - 新增
# Controller: Long saveVoucherWord(LeRequest<VoucherWordSaveParam>)
POST {{base_url}}/report/finance/setting/voucher-word/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "wordCode": "AW_HURL_{{voucher_word_ts}}",
    "wordName": "测",
    "wordDesc": "auto-test自动生成，可删除"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_word_id: jsonpath "$.data"


# 4. 凭证字 - 编辑
# Controller: void updateVoucherWord(LeRequest<VoucherWordSaveParam>)
POST {{base_url}}/report/finance/setting/voucher-word/update
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "id": {{voucher_word_id}},
    "wordCode": "AW_HURL_{{voucher_word_ts}}",
    "wordName": "测-已修改",
    "wordDesc": "auto-test自动生成-已编辑"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 5. 凭证字 - 再次查询验证
POST {{base_url}}/report/finance/setting/voucher-word/page
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "page": {
      "current": 1,
      "size": 100
    }
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 6. 凭证字 - 删除
# Controller: void deleteVoucherWord(LeRequest<Long>) — 入参是 Long 类型
POST {{base_url}}/report/finance/setting/voucher-word/delete
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_word_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 7. 凭证字 - 未授权
POST {{base_url}}/report/finance/setting/voucher-word/page
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
