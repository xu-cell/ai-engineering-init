# leniu 典型业务场景头脑风暴示例

## 场景 1：食堂业务扩展（预订餐功能）

```
需求：新增"预订餐"功能

├── 模块归属
│   ├── sys-canteen/order 扩展（与订单强关联）✅ 推荐
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

---

## 场景 2：跨模块数据整合（食堂+后场联动报表）

```
需求：食堂+后场联动报表

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

---

## 场景 3：设备端新功能（智能取餐柜）

```
需求：智能取餐柜集成

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

---

## 场景 4：营销活动扩展

```
需求：新增优惠活动类型

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
│   ├── 方案 B：新建活动子类型（marketing 模块下新增 activity 包）
│   └── 方案 C：独立营销引擎（过度设计，不推荐）
│
└── 注意
    └── 营销规则定制参考：
        - leniu-marketing-price-rule-customizer
        - leniu-marketing-recharge-rule-customizer
```

---

## 场景 5：供应链集成

```
需求：供应商对接与采购管理

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
