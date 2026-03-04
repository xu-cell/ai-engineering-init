---
name: leniu-brainstorm
description: |
  leniu-yunshitang-core 云食堂项目头脑风暴与方案探索指南。基于双库架构、四层架构、多业务模块的方案设计框架。

  触发场景：
  - 云食堂项目新功能方案设计
  - 新业务模块的可行性分析
  - 跨模块功能整合方案讨论
  - 双库架构下的数据存储方案选择
  - 食堂/后场/供应链业务扩展规划

  适用项目：leniu-tengyun-core（云食堂项目）

  触发词：头脑风暴、方案设计、怎么设计、功能规划、可行性分析、模块选择、架构方案
---

# leniu 头脑风暴框架

## 已有业务模块（可复用）

| 模块 | 路径 | 核心业务 |
|------|------|---------|
| **食堂** | `sys-canteen/` | 订单、菜单、支付、营销、设备、评价、营养、报表、超市、餐具 |
| **后场** | `sys-kitchen/` | 后场厨房、排班考勤 |
| **供应链** | `sys-drp/` | ERP、供应链管理 |
| **公共** | `sys-common/` | 适配器、认证、商户管理 |
| **管理** | `sys-admin/` | 系统管理 |
| **物流** | `sys-logistics/` | 物流配送 |
| **开放接口** | `sys-open/` | 第三方开放 API |

### sys-canteen 子模块（18个）

```
account(账户) allocation(分配) cost(成本) customer(客户)
device(设备) evaluate(评价) marketing(营销) menu(菜单)
menuai(AI菜单) menuintel(智能菜单) notice(通知) nutrition(营养)
order(订单) pay(支付) report(报表) supermarket(超市)
tableware(餐具) tablewarev2(餐具V2)
```

### 已集成基础能力

| 能力 | 实现 |
|------|------|
| 缓存 | Redis + `RedisUtil` |
| 消息队列 | `MqUtil` + `@MqConsumer` |
| 定时任务 | `@XxlJob` + `TenantLoader` |
| 文件存储 | OSS 云存储 |
| Excel导出 | `exportApi.startExcel()`（异步） |
| 认证 | `@RequiresAuthentication` |

---

## 6 维决策框架

**每个方案必须回答以下 6 个问题：**

| 维度 | 核心问题 | 决策要点 |
|------|---------|---------|
| **模块归属** | 放哪个模块？ | canteen/kitchen/drp/common/新模块 |
| **双库归属** | 数据放哪个库？ | 商户库=默认，系统库=`Executors.doInSystem()` |
| **四层架构** | 如何分层？ | 跨 Service → 必须 Business 编排 |
| **多端路由** | 哪些端需要？ | web/mobile/android/open |
| **复用度** | 能复用什么？ | 现有子模块、代码模式、工具类 |
| **审计与删除** | 标准字段？ | crby/crtime/upby/uptime + del_flag(1=删,2=正常) |

### 快速决策表

| 问题 | 推荐方案 | 原因 |
|------|---------|------|
| 新功能放哪个模块？ | 看业务关联度 | canteen=食堂、kitchen=后场、drp=供应链 |
| 需要新建子模块吗？ | 优先扩展现有模块 | sys-canteen 已有 18 个子模块 |
| 数据放哪个库？ | 商户库（默认） | 除非全局配置/平台级数据才用系统库 |
| 需要 Business 层吗？ | 涉及多 Service 就需要 | 单表→Service，跨表→Business |
| 哪些端需要接口？ | Web + Mobile 为主 | Android/Open 按需 |
| 用 MQ 还是同步？ | 实时性要求不高用 MQ | 通知、统计、日志异步处理 |
| 定时任务？ | @XxlJob + TenantLoader | 多租户定时任务标准模式 |
| 报表？ | ReportBaseParam + 合计行 | 参考 leniu-java-report-query-param |
| 导出？ | exportApi.startExcel() | 异步导出标准模式 |

### 双库判断标准

```
商户库（默认）
├── 租户私有数据：订单、菜品、客户、账户
├── 租户配置：食堂设置、餐次配置、设备绑定
└── 租户业务：营销活动、报表数据

系统库（Executors.doInSystem）
├── 全局配置：商户管理、系统参数
├── 公共数据：字典、行政区划
└── 平台级功能：平台统计、运营数据

两个库都涉及
├── 商户信息：系统库存基本信息，商户库存扩展配置
└── 公共模板：系统库存模板，商户库存实例化数据
```

### 端优先决策树

```
管理操作（配置、审核、报表）→ Web 端 /api/v2/web/
就餐操作（点餐、充值、查询）→ 移动端 /api/v2/mobile/
设备操作（取餐、人脸识别）  → 设备端 /api/v2/android/
第三方对接（供应商、支付）  → 开放接口 /api/v2/open/

注意：同一功能不同端有不同 Controller，共享 Business/Service
```

---

## 方案评估矩阵

```markdown
| 方案 | 复用度(25%) | 双库适配(20%) | 多端(15%) | 架构合理(20%) | 开发量(20%) | 总分 |
|------|-------------|---------------|-----------|---------------|-------------|------|
| 方案A | ? | ? | ? | ? | ? | ? |
| 方案B | ? | ? | ? | ? | ? | ? |

评分：1-10分，越高越好
- 复用度：能复用多少现有模块代码
- 双库适配：数据归属是否清晰
- 多端：Web/Mobile/Android 支持程度
- 架构合理：四层分层是否合理
- 开发量：分数越高=工作量越少
```

---

## 方案探索模板

### 问题定义

```markdown
- **是什么**: [具体功能描述]
- **为什么重要**: [业务价值]
- **当前状态**: [现有系统有无类似功能]
- **模块归属**: sys-canteen / sys-kitchen / sys-drp / sys-common / 新模块
- **数据库归属**: 商户库 / 系统库 / 两者都需要
- **端支持**: Web / Mobile / Android / Open
- **是否跨模块**: 是否涉及多个子模块（需 Business 编排）
```

### 方案列举

```markdown
### 方案 A: 最大复用（优先考虑）
- 基于现有模块组合实现
- 复用：[哪些模块/代码]，新开发：[必须新写的部分]
- 数据库：[归属]，架构：[分层设计]

### 方案 B: 适度扩展
- 在现有模块基础上新增子模块
- 复用：[部分]，新开发：[部分]

### 方案 C: 独立新模块
- 新建业务模块，完整四层架构
- 仅复用基础架构和工具类
```

### 推荐方案输出

```markdown
**推荐**: 方案 [X]
**理由**: 1. 复用了 [xxx]  2. 数据归属清晰  3. 架构合理

**实施步骤**:
1. [ ] 数据库设计 → leniu-database-ops
2. [ ] Entity/VO/DTO → leniu-java-entity
3. [ ] 后端 CRUD → leniu-crud-development
4. [ ] API 接口 → leniu-api-development
5. [ ] 测试验证

**风险**:
| 风险 | 应对策略 |
|------|---------|
| [风险1] | [策略] |
```

---

## 讨论引导问题

### 功能规划时

1. 属于哪个已有模块？能复用哪些子模块？
2. 数据是租户级还是系统级？是否需要 `Executors.doInSystem()`？
3. 涉及多个 Service 吗（需要 Business 层）？Controller 按哪些端划分？
4. 是否需要 MQ 异步、定时任务、报表统计？
5. 是否需要合计行（totalLine）或餐次筛选（mealtimeTypes）？

### 方案选择时

1. 快速上线 vs 可扩展？在已有模块扩展是否够用？
2. MVP 包含哪些端的接口？完整版还需什么？
3. 对现有订单/支付流程有影响吗？性能瓶颈在哪？

---

## 典型业务场景示例

详见 `references/business-scenarios.md`，包含：
- 食堂业务扩展（预订餐功能）
- 跨模块数据整合（食堂+后场联动报表）
- 设备端新功能（智能取餐柜）
- 营销活动扩展
- 供应链集成

---

## Skill 联动路径

```
leniu-brainstorm（本 Skill）→ 确定方案后：
├── 数据库设计 → leniu-database-ops
├── Entity/VO/DTO → leniu-java-entity
├── 后端 CRUD → leniu-crud-development
├── API 接口 → leniu-api-development
├── 报表功能 → leniu-java-report-query-param + leniu-java-total-line
├── 营销规则 → leniu-marketing-price-rule-customizer
├── 导出功能 → leniu-java-export
├── 定时任务 → leniu-java-task
├── MQ 消息 → leniu-java-mq
└── 工具类 → leniu-utils-toolkit
```

| 头脑风暴结论 | 下一步 Skill | 触发方式 |
|-------------|-------------|---------|
| 需要建表 | leniu-database-ops | "帮我设计 leniu xxx 表" |
| 需要 CRUD | leniu-crud-development | "帮我开发 leniu xxx 模块" |
| 需要 API | leniu-api-development | "帮我设计 leniu xxx 接口" |
| 需要报表 | leniu-java-report-query-param | "帮我做 leniu xxx 报表" |
| 需要导出 | leniu-java-export | "帮我实现 leniu xxx 导出" |

---

## 注意

- 具体架构设计（双库、分层、模块划分）→ 使用 `leniu-architecture-design`
- 通用头脑风暴（非 leniu 项目）→ 使用 `brainstorm`
- 技术选型对比 → 使用 `tech-decision`
