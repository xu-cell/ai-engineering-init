# ============================================
# 凭证类型设置
# ============================================

# 1. 凭证类型 - 分页查询
# Controller: PageVO<FinanceVoucherTypeVO> pageVoucherType(LeRequest<VoucherTypePageParam>)
# FinanceVoucherTypeVO 字段: id(Long), typeCode(String), typeName(String), typeDesc(String), crtime(LocalDateTime)
POST {{base_url}}/report/finance/setting/voucher-type/page
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
# FinanceVoucherTypeVO 字段覆盖
jsonpath "$.data.records[0].id" exists
jsonpath "$.data.records[0].typeCode" isString
jsonpath "$.data.records[0].typeName" isString
jsonpath "$.data.records[0].crtime" isString


# 2. 凭证类型 - 新增
# Controller: Long saveVoucherType(LeRequest<VoucherTypeSaveParam>)
POST {{base_url}}/report/finance/setting/voucher-type/save
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "typeCode": "AT_HURL_{{voucher_type_ts}}",
    "typeName": "自动测试凭证类型",
    "typeDesc": "auto-test自动生成，可删除"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000
[Captures]
voucher_type_id: jsonpath "$.data"


# 3. 凭证类型 - 编辑
# Controller: void updateVoucherType(LeRequest<VoucherTypeSaveParam>)
POST {{base_url}}/report/finance/setting/voucher-type/update
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {
    "id": {{voucher_type_id}},
    "typeCode": "AT_HURL_{{voucher_type_ts}}",
    "typeName": "自动测试凭证类型-已修改",
    "typeDesc": "auto-test自动生成-已编辑"
  }
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 4. 凭证类型 - 再次查询验证
POST {{base_url}}/report/finance/setting/voucher-type/page
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


# 5. 凭证类型 - 删除
# Controller: void deleteVoucherType(LeRequest<Long>) — 入参是 Long 类型
POST {{base_url}}/report/finance/setting/voucher-type/delete
Content-Type: application/json
X-Token: {{x_token}}
merchant-id: {{merchant_id}}
Merchant-Id: {{merchant_id_auth}}
{
  "content": {{voucher_type_id}}
}

HTTP 200
[Asserts]
jsonpath "$.code" == 10000


# 6. 凭证类型 - 未授权
POST {{base_url}}/report/finance/setting/voucher-type/page
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
