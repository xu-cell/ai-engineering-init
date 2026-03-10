# /auto-test - API 自动化测试

基于 Apifox MCP 读取接口文档，使用 Hurl 生成并执行真实 HTTP 测试，支持三种粒度，生成测试报告。
测试失败时自动调用 `/fix-bug` 走标准修复流程。

## 参数

```
/auto-test [模块或接口路径] [--env=dev|test|prod] [--fix] [--generate]
```

- `模块或接口路径`：指定测试范围（如 `order`、`/api/v2/web/menu`），不指定则测全部
- `--env`：环境（默认 dev）
- `--fix`：失败项自动交给 `/fix-bug` 修复（默认开启）
- `--generate`：仅生成测试用例，不执行

## 执行流程

### 第零步：环境检查

```bash
# 1. 检查 Hurl 是否安装
hurl --version

# 2. 检查环境变量文件是否存在
ls tests/hurl/env/dev.env

# 3. 检查服务是否可达
curl -s -o /dev/null -w "%{http_code}" {{base_url}}/actuator/health
```

如果 Hurl 未安装，提示：
```
Hurl CLI 未安装，请先安装：
- macOS:   brew install hurl
- Windows: winget install hurl
- Linux:   参考 https://hurl.dev/docs/installation.html
```

如果环境变量文件不存在，引导用户创建：
```
未找到 tests/hurl/env/dev.env，请提供以下信息：
1. 服务地址（如 http://localhost:8080）
2. 登录用户名
3. 登录密码
4. 商户ID（MERCHANT-ID，如有）
```

---

### 第一步：读取接口文档 + 后端源码

通过 Apifox MCP 读取指定模块的接口文档：

```
读取指定模块/路径的所有接口：
- 接口路径、HTTP 方法
- 请求参数（Header、Body、Query、Path）
- 响应结构（字段、类型、示例值）
- 是否需要认证
```

**同时读取后端源码**（关键！确保测试完整性）：

```
必须读取的源码：
1. Param 类 — 提取所有查询条件字段（每个字段都要有测试用例）
2. VO 类 — 提取所有响应字段（断言中验证存在性和类型）
3. Mapper XML — 理解 SQL 逻辑、JOIN 关系、动态条件
4. Entity 类 — 了解字段类型、审计字段、逻辑删除约定
```

如果 Apifox MCP 不可用，降级方案：
1. 扫描后端 Controller 代码，提取 `@RequestMapping`、`@PostMapping` 等注解
2. 分析 DTO/VO 类获取参数和响应结构
3. 根据代码生成测试

---

### 第二步：确认测试方案

向用户展示将要生成的测试，**必须列出所有查询条件的覆盖情况**：

```markdown
## 测试生成方案

### 模块：finance/subject-detail（科目明细表）

#### 查询条件覆盖（来自 Param 类）
| 字段 | 类型 | 测试场景 |
|------|------|---------|
| startDate + endDate | LocalDate | 月范围查询、单日查询、无数据区间 |
| areaId | Long | 指定区域筛选 |
| canteenId | Long | 指定食堂筛选 |
| keyword | String | 科目编码/名称模糊搜索 |
| page.current/size | int | 首页、翻页 |

#### 测试用例（10 个）
| # | 场景 | 预期 |
|---|------|------|
| 0a-0e | 前置数据准备（查询真实引用数据 + 创建测试凭证） | code=10000 |
| 1 | 基础分页查询 + VO 字段完整覆盖 + 合计行 | records isCollection |
| 2 | keyword 搜索（科目编码） | records isCollection |
| 3 | keyword 搜索（科目名称） | records isCollection |
| 4 | 区域+食堂筛选 | records isCollection |
| 5 | 单日查询 | records isCollection |
| 6 | 空结果区间 | records count == 0 |
| 7 | 分页翻页 | code=10000 |
| 8 | 导出 | code=10000 |
| 9 | 未授权 | HTTP 401 |
| 10 | 清理测试数据 | HTTP 200 |

**确认生成？**（回复"确认"或调整范围）
```

---

### 第三步：准备测试数据（先查后用）

**核心原则：测试数据必须从真实环境动态获取，禁止硬编码不存在的 ID 或编码。**

```
测试数据准备检查清单：
✅ 外键引用的 ID 通过查询接口动态获取（Captures）
✅ 业务编码使用数据库中已存在的真实记录
✅ 唯一键字段使用时间戳变量避免冲突（{{xxx_ts}}）
✅ 测试数据的 summary 含 "auto-test" 便于识别清理
✅ 关联表的状态字段正确（如 cost_type.state = 1）
✅ 测试结束有清理步骤
```

---

### 第四步：生成 .hurl 文件

按确认的方案，逐个生成 `.hurl` 文件到 `tests/hurl/{模块}/` 目录。

生成规则：
1. 每个文件开头加注释说明测试目标和 VO 字段列表
2. 前置步骤（步骤 0x）：动态获取真实引用数据
3. POST 请求体使用 `{"content": {...}}` 封装（LeRequest 规范）
4. 使用 `[Captures]` 在请求间传递数据（ID、Token 等）
5. 使用 `[Asserts]` 验证响应（状态码、业务码、数据结构、字段类型）
6. **验证关联字段不为 null**（如 LEFT JOIN 产生的 name 字段）
7. **验证合计行所有字段存在**（如 totalLine）
8. 最后一步清理测试数据

---

### 第五步：执行测试

```bash
# 生成时间戳变量
TS=$(date +%s)

# 执行测试
hurl --test \
  --variables-file tests/hurl/env/${env}.env \
  --variable "voucher_type_ts=$TS" \
  --variable "voucher_word_ts=$TS" \
  --report-html tests/hurl/reports \
  --report-json tests/hurl/reports/report.json \
  --continue-on-error \
  tests/hurl/{模块}/*.hurl
```

---

### 第六步：解析报告并输出摘要

读取 `tests/hurl/reports/report.json`，输出：

```markdown
## 测试报告

**环境**: dev | **时间**: 2026-03-10 15:30:00 | **耗时**: 12.3s

| 状态 | 数量 | 占比 |
|------|------|------|
| PASS | 15 | 75% |
| FAIL | 3 | 15% |
| ERROR | 2 | 10% |

### 失败详情

| # | 文件 | 接口 | 预期 | 实际 |
|---|------|------|------|------|
| 1 | order/create-order.hurl | POST /order/add | code=10000 | code=40001 |
| 2 | menu/query-menu.hurl | GET /menu/get/1 | HTTP 200 | HTTP 500 |

### 报告文件
- HTML 报告：tests/hurl/reports/index.html
- JSON 报告：tests/hurl/reports/report.json
```

---

### 第七步：失败分析与自动修复

**当测试存在失败项时，按以下流程处理：**

```
测试失败 → 分析失败原因 → 分类：

1. 测试数据问题（非代码 Bug）：
   → 修正 .hurl 文件中的测试数据
   → 重跑验证

2. 后端代码 Bug：
   → 自动调用 Skill(fix-bug) 走标准修复流程
   → 流程：排查报告 → 用户确认 → 修复代码 → 重跑测试验证

3. 接口文档与实现不一致：
   → 输出差异报告，等待用户确认以哪个为准
```

**自动触发 fix-bug 的条件**：
- HTTP 状态码非预期（如 500、403）
- 业务码非预期（如 code != 10000）
- 响应字段缺失或类型不匹配
- 关联字段为 null（如 costTypeName 为 null → JOIN 失败）
- 导出数据异常（原始字段暴露、金额未转换）

**Bug 报告格式**（传递给 fix-bug）：

```
Bug 信息：
- 接口：{METHOD} {URL}
- 请求参数：{request body}
- 预期响应：{expected}
- 实际响应：{actual}
- Hurl 文件：{file path}
- 失败断言：{assertion detail}
- 关联源码：{Controller/Service/Mapper 路径}
```

修复完成后**自动重跑**对应的 `.hurl` 文件验证。

---

## 执行规则

1. ✅ Apifox MCP 不可用时，从 Controller 代码提取接口信息（降级方案）
2. ✅ 生成前必须确认方案，不能静默生成
3. ✅ POST 请求体必须用 `{"content": {...}}` 包装（LeRequest）
4. ✅ 测试文件放 `tests/hurl/{模块}/`，报告放 `tests/hurl/reports/`
5. ✅ 环境变量不硬编码到 `.hurl` 文件中，统一用 `{{变量名}}`
6. ✅ 报告目录加入 `.gitignore`，测试文件需要 Git 管理
7. ✅ **测试数据先查后用，禁止硬编码不存在的引用数据**
8. ✅ **查询条件完整覆盖：Param 类的每个字段都要有测试用例**
9. ✅ **失败项默认自动触发 fix-bug 标准修复流程**
10. ✅ **验证数据正确性（关联字段非 null、金额合理、方向正确）**
