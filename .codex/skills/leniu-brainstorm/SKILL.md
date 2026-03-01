---
name: leniu-brainstorm
description: |
  leniu-yunshitang-core 云食堂项目头脑风暴与方案探索指南。基于双库架构、四层架构、多业务模块的方案设计框架。

  触发场景：
  - 云食堂项目功能方案设计与探索
  - 新业务模块的可行性分析
  - 跨模块功能整合方案讨论
  - 双库架构下的数据存储方案选择
  - 食堂/后场/供应链业务扩展规划

  适用项目：
  - leniu-tengyun-core：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun-core
  - leniu-yunshitang：/Users/xujiajun/Developer/gongsi_proj/leniu-api/leniu-tengyun/leniu-yunshitang

  触发词：leniu头脑风暴、云食堂方案、leniu怎么设计、云食堂讨论、leniu创意、leniu方案探索、leniu功能规划、leniu-yunshitang
---

# leniu-yunshitang-core 头脑风暴框架

## 项目技术约束（方案边界）

> **所有方案必须在以下技术栈和架构约束内思考**

### 核心架构约束

| 约束 | 说明 |
|------|------|
| **JDK** | 21（必须用 `jakarta.validation.*`） |
| **框架** | pigx-framework 3.4.7 + Spring Boot 3.x |
| **架构** | 四层：Controller → Business → Service → Mapper |
| **包名** | `net.xnzn.core.*`（禁止 `org.dromara.*`） |
| **双库** | 系统库（全局）+ 商户库（租户），无 `tenant_id` 字段 |
| **租户识别** | 请求头 `MERCHANT-ID`，`Executors.doInTenant()` 切换 |
| **ID 生成** | `Id.next()`（雪花ID） |
| **异常** | `LeException`（禁止 `ServiceException`） |
| **对象转换** | `BeanUtil.copyProperties()`（禁止 `MapstructUtils`） |
| **国际化** | `I18n.getMessage()` |
| **审计字段** | `crby/crtime/upby/uptime`，`del_flag: 1=删除, 2=正常` |

### 已有业务模块（可复用）

| 模块 | 路径 | 核心业务 |
|------|------|---------|
| **食堂模块** | `sys-canteen/` | 订单、菜单、支付、营销、设备、评价、营养、报表、超市、餐具 |
| **后场模块** | `sys-kitchen/` | 后场厨房、排班考勤 |
| **供应链模块** | `sys-drp/` | ERP、供应链管理 |
| **公共模块** | `sys-common/` | 适配器、认证、商户管理 |
| **基础模块** | `core-base/` | 公共组件、启动配置 |
| **管理模块** | `sys-admin/` | 系统管理 |
| **物流模块** | `sys-logistics/` | 物流配送 |
| **开放接口** | `sys-open/` | 第三方开放 API |

### sys-canteen 子模块清单

```
account      - 账户管理        allocation  - 分配管理
cost         - 成本管理        customer    - 客户管理
device       - 设备管理        evaluate    - 评价管理
marketing    - 营销活动        menu        - 菜单管理
menuai       - AI菜单          menuintel   - 智能菜单
notice       - 通知公告        nutrition   - 营养管理
order        - 订单管理        pay         - 支付管理
report       - 报表统计        supermarket - 超市管理
tableware    - 餐具管理        tablewarev2 - 餐具V2
```

### 已集成的基础能力

| 能力 | 实现方式 | 说明 |
|------|---------|------|
| 缓存 | Redis | `RedisUtil` 工具类 |
| 消息队列 | MQ | `MqUtil` + `@MqConsumer` |
| 定时任务 | XXL-Job | `@XxlJob` + `TenantLoader` |
| 文件存储 | OSS | 云存储服务 |
| Excel导出 | 异步导出 | `exportApi.startExcel()` |
| 认证 | `@RequiresAuthentication` | Sa-Token 变体 |
| 日志 | `@Slf4j` | Logback |

---

## 思维模式

### 发散思维 - 尽可能多的方案

1. **不评判**: 先列出所有想法，不考虑可行性
2. **模块复用**: 能否复用 sys-canteen 下已有的 18 个子模块？
3. **跨模块组合**: 食堂 + 后场 + 供应链能否组合？
4. **双库视角**: 数据放系统库还是商户库？
5. **反向思考**: 如果要让问题更糟，会怎么做？反过来就是方案

### 收敛思维 - 筛选最优方案

1. **复用优先**: 能否复用现有模块代码？
2. **双库兼容**: 数据归属是否明确（系统级 vs 租户级）？
3. **四层架构**: Business 层编排逻辑是否清晰？
4. **多端支持**: Web/Mobile/Android 端需要哪些接口？
5. **成本**: 开发时间和改动范围如何？
6. **风险**: 对现有业务有无影响？

---

## leniu 专属决策维度

### 必须考虑的 6 个维度

| 维度 | 问题 | 实现要点 |
|------|------|---------|
| **四层架构** | 如何分层？ | Controller → Business(编排) → Service(单表) → Mapper |
| **双库归属** | 数据放哪个库？ | 系统库=`Executors.doInSystem()`，商户库=默认 |
| **模块归属** | 放哪个模块？ | sys-canteen / sys-kitchen / sys-drp / sys-common / 新模块 |
| **多端路由** | 哪些端需要？ | `/api/v2/web/` `/api/v2/mobile/` `/api/v2/android/` `/api/v2/open/` |
| **Business 编排** | 跨 Service 吗？ | 涉及多个 Service → 必须走 Business 层 |
| **审计与删除** | 标准字段？ | `crby/crtime/upby/uptime` + `del_flag(1=删,2=正常)` |

### 方案评估矩阵（leniu 版）

```markdown
| 方案 | 复用度(25%) | 双库适配(20%) | 多端(15%) | 架构合理(20%) | 开发量(20%) | 总分 |
|------|-------------|---------------|-----------|---------------|-------------|------|
| 方案A | ? | ? | ? | ? | ? | ? |
| 方案B | ? | ? | ? | ? | ? | ? |

评分说明：1-10分，分数越高越好
- 复用度：能复用多少现有 sys-canteen/sys-kitchen 模块代码
- 双库适配：系统库/商户库数据归属是否清晰
- 多端：Web/Mobile/Android 端支持程度
- 架构合理：四层架构分层是否合理，Business 编排是否清晰
- 开发量：分数越高=工作量越少
```

---

## 方案探索模板

### 1. 问题定义（leniu 版）

```markdown
## 问题描述

### 基本信息
- **是什么**: [具体功能描述]
- **为什么重要**: [业务价值]
- **当前状态**: [现有系统有无类似功能]
- **期望结果**: [希望达到的效果]

### leniu 项目约束
- **模块归属**: sys-canteen / sys-kitchen / sys-drp / sys-common / 新模块
- **数据库归属**: 系统库（全局）/ 商户库（租户业务）/ 两者都需要
- **端支持**: Web 管理端 / 移动端 / 设备端 / 开放接口
- **是否跨模块**: 是否涉及多个子模块协作（需 Business 编排）
```

### 2. 可复用资源盘点

```markdown
## 现有资源

### 可复用的子模块
| 模块 | 是否可用 | 复用部分 |
|------|---------|---------|
| order（订单） | ✅/❓ | 订单流转模式、状态机 |
| menu（菜单） | ✅/❓ | 菜品数据模型 |
| marketing（营销） | ✅/❓ | 活动规则引擎 |
| pay（支付） | ✅/❓ | 支付流程 |
| report（报表） | ✅/❓ | 报表查询模式 |
| account（账户） | ✅/❓ | 账户余额操作 |

### 可参考的代码模式
| 模式 | 参考位置 | 说明 |
|------|---------|------|
| 四层 CRUD | order 模块 | Controller→Business→Service→Mapper |
| 报表查询 | report 模块 | ReportBaseParam + PageDTO + 合计行 |
| 营销规则 | marketing 模块 | 计费规则/充值规则定制 |
| 异步导出 | 各模块 export | exportApi.startExcel() |
| MQ 消费 | 各模块 mq/ | @MqConsumer 消息处理 |
| 定时任务 | 各模块 task/ | @XxlJob + TenantLoader |

### 需要新开发的部分
- [ ] [需要开发的内容]
```

### 3. 方案列举

```markdown
## 可能方案

### 方案 A: 最大复用（推荐优先考虑）
- **描述**: 基于现有模块组合实现
- **复用**: [复用的模块/代码]
- **新开发**: [必须新写的部分]
- **数据库**: 数据放商户库，使用默认租户隔离
- **架构**: [涉及的 Business/Service 层]
- **优点**: 开发快、架构一致
- **缺点**: [限制]

### 方案 B: 适度扩展
- **描述**: 在现有模块基础上新增子模块
- **复用**: [复用部分]
- **新开发**: [新写部分]
- **数据库**: [归属]
- **架构**: [分层]
- **优点**: 平衡复用与定制
- **缺点**: [限制]

### 方案 C: 独立新模块
- **描述**: 新建业务模块
- **复用**: 仅复用基础架构和工具类
- **新开发**: 完整业务逻辑
- **数据库**: [归属]
- **架构**: 完整四层架构
- **优点**: 解耦清晰
- **缺点**: 开发量大
```

### 4. 推荐方案

```markdown
## 推荐方案

**推荐**: 方案 [X]

**理由**:
1. 复用了 [xxx] 模块，减少 [xx%] 开发量
2. 数据归属清晰：[系统库/商户库]
3. 四层架构分层合理

**实施步骤**:
1. [ ] 数据库设计 → 使用 `leniu-database-ops` Skill
2. [ ] Entity/VO/DTO → 使用 `leniu-java-entity` Skill
3. [ ] 后端 CRUD → 使用 `leniu-crud-development` Skill
4. [ ] API 接口 → 使用 `leniu-api-development` Skill
5. [ ] 测试验证

**风险点**:
| 风险 | 应对策略 |
|------|---------|
| [风险1] | [策略] |
```

---

## 云食堂典型业务场景

### 场景 1：食堂业务扩展

```
需求：新增"预订餐"功能

头脑风暴：
├── 模块归属
│   ├── sys-canteen/order 扩展 ✅ 推荐（与订单强关联）
│   ├── sys-canteen 新建 reservation 子模块
│   └── 独立模块（不推荐，过度设计）
│
├── 功能拆解
│   ├── 预订配置（管理端：餐次、提前时间、名额）
│   ├── 预订下单（移动端：选餐、提交预订）
│   ├── 预订取消（自动/手动取消）
│   └── 预订统计（报表：预订率、取消率）
│
├── 数据库归属
│   ├── 预订配置表 → 商户库（各食堂独立配置）
│   ├── 预订记录表 → 商户库（租户业务数据）
│   └── 无需系统库数据
│
├── 可复用
│   ├── order 模块 → 订单状态机、支付流程
│   ├── menu 模块 → 菜品数据
│   ├── account 模块 → 余额扣减
│   ├── MqUtil → 预订到期提醒
│   └── @XxlJob → 自动取消过期预订
│
└── 四层架构
    ├── Controller: ReservationWebController / ReservationMobileController
    ├── Business: ReservationWebBusiness（编排预订+订单+支付）
    ├── Service: ReservationInfoService（单表 CRUD）
    └── Mapper: ReservationInfoMapper + XML
```

### 场景 2：跨模块数据整合

```
需求：食堂+后场联动报表

头脑风暴：
├── 数据来源
│   ├── sys-canteen/order → 订单数据
│   ├── sys-canteen/menu → 菜品数据
│   ├── sys-kitchen/kitchen → 后厨出餐数据
│   └── sys-canteen/cost → 成本数据
│
├── 方案选择
│   ├── 方案 A：报表 Service 跨模块查询 ✅
│   │   └── Business 层编排多个 Service
│   ├── 方案 B：ETL 预计算汇总表
│   │   └── @XxlJob 定时聚合
│   └── 方案 C：视图或存储过程
│       └── 不推荐（不符合项目规范）
│
├── 架构设计
│   ├── Controller: ReportWebController（/api/v2/web/report/xxx）
│   ├── Business: ReportCrossModuleBusiness（编排跨模块查询）
│   ├── Service: 各模块现有 Service
│   └── Param: ReportBaseParam（分页+时间范围+餐次）
│
└── 注意事项
    ├── 跨模块查询全部在 Business 层编排
    ├── 使用 Executors.doInTenant() 确保租户隔离
    ├── 报表入参继承 ReportBaseParam
    └── 合计行使用 ReportBaseTotalVO 模式
```

### 场景 3：设备端新功能

```
需求：智能取餐柜集成

头脑风暴：
├── 模块归属
│   ├── sys-canteen/device 扩展 ✅ 推荐
│   └── 新建 sys-canteen/cabinet 子模块
│
├── 多端接口
│   ├── Web 管理端：柜子配置、状态监控
│   │   └── /api/v2/web/cabinet/...
│   ├── 设备端：开柜、存取餐
│   │   └── /api/v2/android/cabinet/...
│   └── 移动端：取餐码、取餐通知
│       └── /api/v2/mobile/cabinet/...
│
├── 数据库
│   ├── cabinet_info（柜子信息）→ 商户库
│   ├── cabinet_cell（格口信息）→ 商户库
│   ├── cabinet_record（存取记录）→ 商户库
│   └── cabinet_config（全局配置）→ 系统库（Executors.doInSystem）
│
└── 可复用
    ├── device 模块 → 设备注册/心跳模式
    ├── order 模块 → 订单关联
    ├── MqUtil → 存餐/取餐事件通知
    └── notice 模块 → 取餐提醒推送
```

### 场景 4：营销活动扩展

```
需求：新增优惠活动类型

头脑风暴：
├── 模块归属
│   └── sys-canteen/marketing ✅（已有营销模块）
│
├── 已有营销能力
│   ├── 计费规则（price）→ 折扣、满减、限额、补贴
│   ├── 充值规则（recharge）→ 满赠、按次赠送、限额
│   └── 规则定制器 → leniu-marketing-price-rule-customizer
│
├── 扩展方式
│   ├── 方案 A：复用规则定制器，新增规则类型 ✅ 推荐
│   │   └── 参考 leniu-marketing-price-rule-customizer Skill
│   ├── 方案 B：新建活动子类型
│   │   └── 在 marketing 模块下新增 activity 包
│   └── 方案 C：独立营销引擎
│       └── 过度设计，不推荐
│
└── 注意
    └── 营销规则定制参考专用 Skill：
        - leniu-marketing-price-rule-customizer
        - leniu-marketing-recharge-rule-customizer
```

### 场景 5：供应链集成

```
需求：供应商对接与采购管理

头脑风暴：
├── 模块归属
│   └── sys-drp/erp ✅（已有供应链模块）
│
├── 功能拆解
│   ├── 供应商管理（基本信息、资质）
│   ├── 采购计划（基于菜单自动生成）
│   ├── 采购订单（下单、收货、退货）
│   └── 库存管理（入库、出库、盘点）
│
├── 跨模块联动
│   ├── menu 模块 → 菜品原料需求
│   ├── cost 模块 → 采购成本核算
│   ├── kitchen 模块 → 后厨领料
│   └── report 模块 → 采购报表
│
├── 数据库
│   ├── 供应商数据 → 商户库（各食堂独立供应商）
│   ├── 采购数据 → 商户库
│   └── 供应商公共目录 → 系统库（可选，平台级共享）
│
└── 四层架构
    ├── Controller: 按端分 web/mobile
    ├── Business: PurchaseBusiness（编排采购+库存+成本）
    ├── Service: SupplierService / PurchaseOrderService / InventoryService
    └── Mapper: 各自 Mapper + XML（同目录！）
```

---

## 创意激发技巧（leniu 版）

### 1. 模块组合法

```
问题：如何实现智能配餐推荐？

模块组合：
├── menuai（AI菜单）→ 已有 AI 菜单基础
├── menuintel（智能菜单）→ 智能推荐逻辑
├── nutrition（营养管理）→ 营养数据
├── customer（客户管理）→ 用户偏好
├── order（订单）→ 历史消费数据
└── MqUtil → 异步推荐计算

组合方案：
1. 收集用户历史订单（order）
2. 分析营养需求（nutrition）
3. 结合用户偏好（customer）
4. 生成推荐菜单（menuintel）
5. Business 层编排以上 Service
```

### 2. 现有功能类比法

```
问题：如何实现团餐预订？

类比分析：
├── 类似 order → 创建、状态流转、支付、取消
├── 类似 marketing → 团购优惠规则
└── 类似 allocation → 批量分配

复用点：
├── 订单状态机 → 预订状态流转
├── 支付流程 → 预订支付
├── 营销规则 → 团购折扣
└── MQ 通知 → 预订确认通知
```

### 3. 双库思考法

```
问题：数据应该放哪个库？

判断标准：
├── 商户库（默认）
│   ├── 租户私有数据：订单、菜品、客户、账户
│   ├── 租户配置：食堂设置、餐次配置、设备绑定
│   └── 租户业务：营销活动、报表数据
│
├── 系统库（Executors.doInSystem）
│   ├── 全局配置：商户管理、系统参数
│   ├── 公共数据：字典、行政区划
│   └── 平台级功能：平台统计、运营数据
│
└── 两个库都涉及
    ├── 商户信息：系统库存基本信息，商户库存扩展配置
    └── 公共模板：系统库存模板，商户库存实例化数据
```

### 4. 端优先思考法

```
问题：功能应该在哪个端实现？

决策树：
├── 管理操作（配置、审核、报表）→ Web 端 /api/v2/web/
├── 就餐操作（点餐、充值、查询）→ 移动端 /api/v2/mobile/
├── 设备操作（取餐、人脸识别）→ 设备端 /api/v2/android/
└── 第三方对接（供应商、支付）→ 开放接口 /api/v2/open/

注意：同一功能不同端可能有不同 Controller，但共享 Business/Service
```

---

## 讨论引导问题（leniu 版）

### 功能规划时

1. **模块视角**
   - 属于哪个已有模块（canteen/kitchen/drp）？
   - 能复用哪些子模块（order/menu/marketing...）？
   - 是否需要新建子模块？

2. **双库视角**
   - 数据是租户级还是系统级？
   - 是否需要 `Executors.doInSystem()` 切换？
   - 跨库查询如何处理？

3. **架构视角**
   - 是否涉及多个 Service 协作（需要 Business 层）？
   - Controller 按哪些端划分？
   - 是否需要 MQ 异步处理？

4. **报表视角**
   - 是否需要报表统计？
   - 入参是否需要餐次筛选（mealtimeTypes）？
   - 是否需要合计行（totalLine）？

### 方案选择时

1. **短期 vs 长期**
   - 快速上线还是可扩展优先？
   - 是否在已有模块上扩展就够？

2. **简单 vs 完整**
   - MVP 包含哪些端的接口？
   - 完整版还需要哪些功能？

3. **风险评估**
   - 对现有订单/支付流程有影响吗？
   - 数据迁移需求？
   - 性能瓶颈在哪？

---

## 常见问题快速决策

| 问题 | 推荐方案 | 原因 |
|------|---------|------|
| 新功能放哪个模块？ | 看业务关联度 | canteen=食堂、kitchen=后场、drp=供应链 |
| 需要新建子模块吗？ | 优先扩展现有模块 | sys-canteen 已有 18 个子模块覆盖大部分场景 |
| 数据放哪个库？ | 商户库（默认） | 除非是全局配置/平台级数据才用系统库 |
| 需要 Business 层吗？ | 涉及多 Service 就需要 | 单表操作直接 Service，跨表编排走 Business |
| 哪些端需要接口？ | Web + Mobile 为主 | Android 端按需，Open 端对外开放时才加 |
| 用 MQ 还是同步？ | 实时性要求不高用 MQ | 通知、统计、日志等异步处理 |
| 定时任务用什么？ | @XxlJob + TenantLoader | 多租户定时任务标准模式 |
| 报表怎么做？ | ReportBaseParam + 合计行 | 参考 leniu-java-report-query-param / leniu-java-total-line |
| 导出怎么做？ | exportApi.startExcel() | 异步导出，参考 leniu-java-export |
| 菜单/菜品相关？ | 复用 menu/menuai/menuintel | 已有完整菜单体系 |
| 支付相关？ | 复用 pay 模块 | 已有支付流程 |
| 营销活动相关？ | 复用 marketing + 规则定制器 | 已有规则引擎框架 |
| 需要金额处理？ | Long 分存储，展示转元 | 参考 leniu-java-amount-handling |
| 需要餐次筛选？ | mealtimeTypes 字段 | 参考 leniu-mealtime |

---

## 与其他 leniu Skill 联动

### 头脑风暴后的实施路径

```
leniu-brainstorm（本 Skill）
    ↓ 确定方案后
    │
    ├── 架构设计 → leniu-architecture-design
    │
    ├── 数据库设计 → leniu-database-ops
    │   └── 建表、双库归属确认
    │
    ├── Entity/VO/DTO → leniu-java-entity
    │   └── 审计字段、逻辑删除
    │
    ├── 后端 CRUD → leniu-crud-development
    │   └── 四层架构代码生成
    │
    ├── API 接口 → leniu-api-development
    │   └── 多端路由、LeRequest/LeResult
    │
    ├── 报表功能 → leniu-java-report-query-param + leniu-java-total-line
    │   └── 查询入参、合计行
    │
    ├── 营销规则 → leniu-marketing-price-rule-customizer
    │   └── 计费规则定制
    │
    ├── 导出功能 → leniu-java-export
    │   └── 异步 Excel 导出
    │
    ├── 定时任务 → leniu-java-task
    │   └── @XxlJob + TenantLoader
    │
    ├── MQ 消息 → leniu-java-mq
    │   └── MqUtil + @MqConsumer
    │
    └── 工具类 → leniu-utils-toolkit
        └── BeanUtil、CollUtil、StrUtil 等
```

### 快速触发其他 Skill

| 头脑风暴结论 | 下一步 Skill | 触发方式 |
|-------------|-------------|---------|
| 需要建表 | leniu-database-ops | "帮我设计 leniu xxx 表" |
| 需要 CRUD | leniu-crud-development | "帮我开发 leniu xxx 模块" |
| 需要 API | leniu-api-development | "帮我设计 leniu xxx 接口" |
| 需要报表 | leniu-java-report-query-param | "帮我做 leniu xxx 报表" |
| 需要导出 | leniu-java-export | "帮我实现 leniu xxx 导出" |
| 需要定时任务 | leniu-java-task | "帮我写 leniu xxx 定时任务" |

---

## 头脑风暴输出模板

### 完整输出格式

```markdown
# [功能名称] 方案设计

## 1. 问题定义
- 需求描述：[xxx]
- 业务价值：[xxx]
- 模块归属：sys-canteen / sys-kitchen / sys-drp
- 数据库归属：商户库 / 系统库
- 端支持：Web / Mobile / Android

## 2. 可复用资源
| 资源 | 类型 | 复用程度 |
|------|------|---------|
| order 模块 | 子模块 | 参考模式 |
| BeanUtil | 工具类 | 完全复用 |

## 3. 方案对比
| 维度 | 方案 A | 方案 B |
|------|-------|-------|
| 复用度 | 高 | 中 |
| 双库适配 | 清晰 | 需调整 |
| 开发量 | 小 | 中 |

## 4. 推荐方案
**方案 A** - [理由]

## 5. 实施步骤（leniu Skill 联动）
1. [ ] 数据库设计 → leniu-database-ops
2. [ ] Entity 设计 → leniu-java-entity
3. [ ] 后端 CRUD → leniu-crud-development
4. [ ] API 接口 → leniu-api-development
5. [ ] 测试验证

## 6. 风险与应对
| 风险 | 应对策略 |
|------|---------|
| [风险1] | [策略] |
```

---

## 注意

- 如果是具体的架构设计（双库、分层、模块划分），请使用 `leniu-architecture-design`
- 如果是通用的头脑风暴（非 leniu 项目），请使用 `brainstorm`
- 如果是技术选型对比，请使用 `tech-decision`
