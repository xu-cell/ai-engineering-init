# 需求迭代系统设计方案

> 版本：v2.0
> 日期：2026-02-25
> 状态：讨论中
> 更新：简化为 ai-engineering-init 内置方案，去除 Submodule，整合多项优化

---

## 一、背景与目标

### 1.1 业务背景

在云食堂项目的开发过程中，需求开发分为两种模式：

| 模式 | 说明 | 代码位置 |
|------|------|---------|
| **产品开发** | 修改 core 代码，影响所有客户 | `leniu-tengyun-core/` 仓库 |
| **项目开发** | 在 api 工程中覆盖/继承/新写定制逻辑 | 独立的项目仓库 |

### 1.2 核心痛点

1. **需求分散**：每个项目的需求信息散落在各处，难以统一管理
2. **重复开发**：相似需求在不同项目中重复开发，无法复用
3. **知识流失**：完成的需求缺乏沉淀，经验无法传承
4. **上下文缺失**：Claude 开发时缺乏历史需求参考

### 1.3 系统目标

| 目标 | 说明 |
|------|------|
| **开发参考** | Claude 读取需求上下文，辅助开发 |
| **项目管理** | 进度跟踪、版本规划、状态管理 |
| **知识积累** | 沉淀可复用的需求模式和开发模式 |

### 1.4 使用场景

| 维度 | 说明 |
|------|------|
| **使用者** | 个人使用（团队成员安装 ai-engineering-init 但不使用需求系统） |
| **分发方式** | 通过 `npx ai-engineering-init` 安装到各项目 |
| **数据源** | ai-engineering-init 仓库是唯一数据源 |

---

## 二、需求特性

### 2.1 共享关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        共享关系图                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   产品仓库 ←────×────→ 项目仓库（不共享）                        │
│                                                                  │
│   项目A ←──────────→ 项目B ←──────────→ 项目C                   │
│          需要共享           需要共享                              │
│                                                                  │
│   原因：某些需求功能是重复开发的，可以复用                       │
│        某些开发模式也可以复用                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 生命周期

- **持续迭代**：需求 v1 → v2 → v3 持续演进
- **跨项目复用**：项目A完成的需求，项目B可以参考

---

## 三、方案架构

### 3.1 架构概览

需求知识库直接内置在 **ai-engineering-init** 仓库中，通过 npx 安装时复制到各项目。

```
┌─────────────────────────────────────────────────────────────────────┐
│                     数据流向                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ai-engineering-init/              ← 唯一数据源（你维护）          │
│   └── .claude/requirements/         ← 需求知识库                    │
│                                                                      │
│           │ npx install              │ npx install                   │
│           ▼                          ▼                               │
│   ┌─────────────────┐        ┌─────────────────┐                   │
│   │   项目A仓库      │        │   项目B仓库      │                   │
│   │   .claude/       │        │   .claude/       │                   │
│   │   └─requirements/│        │   └─requirements/│                   │
│   │     (gitignore)  │        │     (gitignore)  │                   │
│   └─────────────────┘        └─────────────────┘                   │
│                                                                      │
│   Claude 可读取 ✅  |  不提交到项目仓库 ✅  |  npx 更新同步 ✅     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
ai-engineering-init/
├── .claude/
│   ├── skills/
│   │   ├── req-router/SKILL.md       # 需求路由 skill（自动加载需求上下文）
│   │   ├── req-new/SKILL.md          # /req-new 命令
│   │   ├── req-list/SKILL.md         # /req-list 命令
│   │   ├── req-search/SKILL.md       # /req-search 命令
│   │   └── req-promote/SKILL.md      # /req-promote 命令（升级为产品功能）
│   │
│   └── requirements/                  # 需求知识库
│       ├── index.yaml                 # 全局索引
│       │
│       ├── shared/                    # 可复用的需求模式
│       │   ├── face-pay/
│       │   │   ├── SKILL.md           # 最新版（历史通过 Git Tag 查看）
│       │   │   └── CHANGELOG.md       # 版本变更记录
│       │   ├── report-export/
│       │   └── sso-integration/
│       │
│       ├── projects/                  # 各项目的具体需求
│       │   ├── project-A/
│       │   │   ├── index.yaml         # 项目索引
│       │   │   ├── REQ-A-001/
│       │   │   │   └── SKILL.md
│       │   │   └── REQ-A-002/
│       │   └── project-B/
│       │       ├── index.yaml
│       │       └── REQ-B-001/
│       │
│       └── patterns/                  # 开发模式库
│           ├── crud-pattern/
│           ├── workflow-pattern/
│           └── integration-pattern/
```

### 3.3 项目 .gitignore 策略

npx 安装到项目后，需求目录应被项目仓库忽略：

```gitignore
# ai-engineering-init 安装的需求知识库（个人使用，不提交到项目仓库）
.claude/requirements/
```

> **原因**：需求数据属于 ai-engineering-init 仓库，不应污染项目仓库。
> Claude 在项目中开发时可以读取，但 `git status` 不会显示。

### 3.4 日常工作流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      日常工作流程                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   【场景1：创建新需求】                                              │
│   ─────────────────────                                             │
│   # 在 ai-engineering-init 仓库中操作                               │
│   cd /path/to/ai-engineering-init                                   │
│   /req-new 刷脸支付功能 --project project-A                         │
│                                                                      │
│   # 自动创建：                                                      │
│   # .claude/requirements/projects/project-A/REQ-A-001/SKILL.md     │
│   # 自动更新 index.yaml                                             │
│                                                                      │
│   # 提交到 ai-engineering-init 仓库                                 │
│   git add .claude/requirements/                                     │
│   git commit -m "feat: 新增刷脸支付需求 REQ-A-001"                  │
│   git push                                                          │
│                                                                      │
│   ─────────────────────────────────────────────────────────────────│
│                                                                      │
│   【场景2：在项目中使用需求上下文】                                  │
│   ─────────────────────────────────                                 │
│   # 更新项目中的 ai-engineering-init                                │
│   cd /path/to/project-A                                             │
│   npx ai-engineering-init                                           │
│                                                                      │
│   # Claude 自动读取需求上下文                                       │
│   用户: 帮我开发刷脸支付功能                                        │
│   Claude: (req-router 检测关键词，加载 REQ-A-001 上下文)            │
│                                                                      │
│   ─────────────────────────────────────────────────────────────────│
│                                                                      │
│   【场景3：跨项目复用需求】                                         │
│   ─────────────────────────                                         │
│   /req-search 刷脸支付                                              │
│   # 找到 shared/face-pay 和 project-A/REQ-A-001                    │
│                                                                      │
│   /req-clone REQ-A-001 --to project-B                               │
│   # 自动创建 REQ-B-001，关联引用 REQ-A-001                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、与 Claude Code 集成

### 4.1 req-router Skill（核心）

在 `.claude/skills/req-router/SKILL.md` 中实现需求路由，作为需求的统一入口。

**工作原理**：

```
┌─────────────────────────────────────────────────────────────────────┐
│                     req-router 工作流程                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   用户输入: "帮我开发刷脸支付功能"                                   │
│                                                                      │
│   Step 1: req-router 被 UserPromptSubmit hook 触发                  │
│           ↓                                                          │
│   Step 2: 读取 index.yaml，匹配关键词                               │
│           keywords: [刷脸, 人脸识别, 生物支付, 海康, 商汤]          │
│           ↓                                                          │
│   Step 3: 全文搜索 .claude/requirements/ 下所有 SKILL.md            │
│           (index.yaml keywords 作为加权项，全文搜索兜底)            │
│           ↓                                                          │
│   Step 4: 加载匹配的需求 SKILL.md 完整内容                         │
│           • shared/face-pay/SKILL.md                                │
│           • projects/project-A/REQ-A-001/SKILL.md                   │
│           ↓                                                          │
│   Step 5: 注入到 Claude 上下文中，辅助开发                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 渐进式加载

```
┌─────────────────────────────────────────────────────────────────────┐
│                     需求 Skill 渐进式加载                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Layer 1: 索引层 (始终加载)                                        │
│   ─────────────────────────────                                     │
│   index.yaml 中的 keywords 字段 + SKILL.md 全文搜索                │
│   用于快速匹配用户请求                                              │
│                                                                      │
│   Layer 2: 摘要层 (匹配后加载)                                      │
│   ─────────────────────────────                                     │
│   SKILL.md 的前 50 行（元数据 + 概述）                              │
│   用于确认是否需要详细内容                                          │
│                                                                      │
│   Layer 3: 完整层 (开发时加载)                                      │
│   ─────────────────────────────                                     │
│   SKILL.md 完整内容                                                 │
│   包含技术方案、代码示例、注意事项                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 搜索机制

搜索采用**双重匹配**策略：

| 层级 | 来源 | 权重 | 说明 |
|------|------|------|------|
| 索引匹配 | index.yaml 的 keywords 字段 | 高 | 精准匹配，优先展示 |
| 全文搜索 | 所有 SKILL.md 内容 | 中 | 兜底搜索，防止 keywords 遗漏 |

> **解决的问题**：避免"刷脸"和"人脸识别"因 keywords 未覆盖而搜不到。

---

## 五、核心数据结构

### 5.1 全局索引 (index.yaml)

```yaml
# 需求知识库索引
version: "2.0"
lastUpdated: 2026-02-25T00:00:00Z

# 分类定义
categories:
  product:
    name: 产品需求
    description: 修改 core 代码，影响所有客户
    path: product/
  project:
    name: 项目需求
    description: 定制开发，特定客户
    path: projects/

# 共享需求模式
sharedPatterns:
  - id: face-pay
    name: 刷脸支付
    path: shared/face-pay/
    gitTag: face-pay-v2          # 用 Git Tag 管理版本（不再用 v1/v2 目录）
    keywords: [刷脸, 人脸识别, 生物支付, 海康, 商汤]
    usedBy: [project-A, project-B]

  - id: report-export
    name: 报表导出
    path: shared/report-export/
    gitTag: report-export-v1
    keywords: [导出, Excel, 报表, 异步导出]
    usedBy: [project-A]

# 升级阈值：被 N 个项目引用时提示升级为产品功能
promotionThreshold: 3

# 项目列表
projects:
  - id: project-A
    name: 某某医院食堂
    path: projects/project-A/
    status: active
    tag: v1.2.0
    requirementCount: 5

  - id: project-B
    name: 某某学校食堂
    path: projects/project-B/
    status: active
    tag: v1.0.0
    requirementCount: 3
```

### 5.2 需求 SKILL.md 模板

```markdown
---
# 需求元数据
id: REQ-A-001
title: 刷脸支付功能
category: project           # product | project
project: project-A          # 项目ID（项目需求必填）
status: in-progress         # draft | in-progress | completed | archived
priority: high              # high | medium | low
created: 2026-02-20
completed:                  # 完成日期
tags: [支付, 生物识别, 海康]
targetTag: v1.2.0           # 目标发布版本

# 关联信息
basedOn: shared/face-pay    # 基于的共享模式（版本通过 Git Tag 追溯）
references:                 # 参考的其他需求
  - project-B/REQ-B-001
promotedTo:                 # 升级为产品功能后的 ID（如 REQ-P-005）

# 触发信息（用于 Claude 自动加载）
description: |
  【需求概述】员工刷脸支付功能，对接海康设备

  【触发场景】
  - 开发刷脸支付相关功能
  - 查询支付业务逻辑
  - 修复刷脸相关 Bug

  【关键词】刷脸、人脸、face-pay、海康、生物识别

  【快速定位】
  - 后端入口：net.xnzn.core.order.facepay
  - 数据库表：order_face_pay
---

# REQ-A-001 刷脸支付功能

## 一、业务背景

员工反馈刷卡支付效率低，需要支持刷脸支付提升体验。
客户为某某医院，已有海康门禁设备。

## 二、核心功能

1. 对接海康刷脸设备（ISAPI 协议）
2. 支付成功后推送消息通知
3. 支持刷脸失败降级到刷卡

## 三、技术方案

### 3.1 架构设计

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  海康设备   │────▶│  中间件     │────▶│  云食堂后端 │
│  (ISAPI)    │     │  (消息队列) │     │  (支付服务) │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 3.2 涉及模块

| 模块 | 文件 | 变更类型 |
|------|------|---------|
| sys-canteen | FacePayController.java | 新增 |
| sys-canteen | FacePayService.java | 新增 |
| sys-common | HaikangClient.java | 新增 |

### 3.3 数据库变更

```sql
CREATE TABLE order_face_pay (
    id          BIGINT      NOT NULL COMMENT '主键',
    order_id    BIGINT      NOT NULL COMMENT '订单ID',
    user_id     BIGINT      NOT NULL COMMENT '用户ID',
    device_id   VARCHAR(64) COMMENT '设备ID',
    face_score  DECIMAL(5,2) COMMENT '人脸评分',
    status      INT         DEFAULT 0 COMMENT '状态',
    crby        VARCHAR(64) COMMENT '创建人',
    crtime      DATETIME    COMMENT '创建时间',
    del_flag    INT         DEFAULT 2 COMMENT '删除标识',
    PRIMARY KEY (id)
);
```

## 四、实现记录

### v1.0 (2026-02-24)
- [x] 海康设备对接
- [x] 支付流程实现
- [ ] 降级逻辑（进行中）

### 定制点（相对于 shared/face-pay）
- 增加海康设备对接（商汤→海康）
- 增加降级到刷卡逻辑

## 五、验收标准

- [ ] 刷脸识别准确率 > 99%
- [ ] 支付响应时间 < 500ms
- [ ] 异常情况有降级方案

## 六、复用指南

### 适用场景
- 需要海康设备对接的项目
- 需要刷脸支付的场景

### 集成步骤
1. 配置海康设备参数
2. 部署中间件服务
3. 配置支付回调地址

### 注意事项
- 海康设备需要开通 ISAPI 权限
- 注意人脸评分阈值设置
```

### 5.3 项目索引 (projects/project-A/index.yaml)

```yaml
# 项目A需求索引
projectId: project-A
projectName: 某某医院食堂
status: active
currentTag: v1.2.0

# 需求列表
requirements:
  - id: REQ-A-001
    title: 刷脸支付功能
    status: in-progress
    priority: high
    basedOn: shared/face-pay
    tags: [支付, 生物识别]

  - id: REQ-A-002
    title: 订餐报表导出
    status: completed
    priority: medium
    basedOn: shared/report-export
    completedAt: 2026-02-20
    tags: [报表, 导出]

# 统计信息
stats:
  total: 5
  completed: 2
  inProgress: 2
  draft: 1
```

---

## 六、需求复用机制

### 6.1 复用流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                      需求复用流程                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   场景：项目B需要刷脸支付功能，项目A已经实现过                       │
│                                                                      │
│   Step 1: 搜索可复用需求                                            │
│   ─────────────────────────                                         │
│   $ /req-search 刷脸支付                                            │
│                                                                      │
│   搜索策略：                                                         │
│   1) 匹配 index.yaml keywords → shared/face-pay (高权重)           │
│   2) 全文搜索 SKILL.md → project-A/REQ-A-001 (中权重)              │
│                                                                      │
│   结果：                                                             │
│   • shared/face-pay (共享模式) ← 推荐                               │
│   • project-A/REQ-A-001 (项目A实现)                                 │
│                                                                      │
│   Step 2: 创建新需求，基于共享模式                                  │
│   ─────────────────────────────────                                 │
│   $ /req-new 刷脸支付功能 --project project-B                      │
│          --base-on shared/face-pay                                  │
│                                                                      │
│   生成：projects/project-B/REQ-B-001/                               │
│                                                                      │
│   Step 3: 记录关联关系                                              │
│   ─────────────────────                                             │
│   REQ-B-001:                                                        │
│     basedOn: shared/face-pay                                        │
│     references:                                                     │
│       - project-A/REQ-A-001  # 参考了项目A的实现                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 版本管理（Git Tag 方案）

版本通过 **Git Tag** 管理，不再使用 v1/v2 子目录：

```
┌─────────────────────────────────────────────────────────────────────┐
│                     版本管理方案                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   shared/face-pay/                                                  │
│   ├── SKILL.md              # 始终保持最新版                        │
│   └── CHANGELOG.md          # 记录版本变更摘要                      │
│                                                                      │
│   Git Tag:                                                          │
│   • face-pay-v1  →  查看: git show face-pay-v1:shared/face-pay/    │
│   • face-pay-v2  →  查看: git show face-pay-v2:shared/face-pay/    │
│                                                                      │
│   优势：                                                             │
│   ✅ 目录结构干净（无 v1/ v2/ 子目录）                              │
│   ✅ 利用 Git 原生版本控制（不双重管理）                            │
│   ✅ CHANGELOG.md 提供快速摘要，Tag 提供完整快照                    │
│                                                                      │
│   项目引用：                                                         │
│   REQ-A-001: basedOn: shared/face-pay  # 不再带 @v2 后缀           │
│              # 具体基于哪个版本，看 CHANGELOG.md 和创建时间          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 升级为产品功能

当一个 shared pattern 被多个项目引用时，应考虑升级为产品功能（写入 core 代码）。

```
┌─────────────────────────────────────────────────────────────────────┐
│                    升级为产品功能流程                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   触发条件：                                                         │
│   index.yaml 中 promotionThreshold: 3                               │
│   当 shared/face-pay 的 usedBy 达到 3 个项目时提示                  │
│                                                                      │
│   操作：                                                             │
│   $ /req-promote shared/face-pay                                    │
│                                                                      │
│   结果：                                                             │
│   1. 创建 product/REQ-P-005/SKILL.md（产品需求）                    │
│   2. shared/face-pay/SKILL.md 增加 promotedTo: REQ-P-005           │
│   3. 提醒：该功能应纳入 core 代码的产品规划                         │
│                                                                      │
│   状态变化：                                                         │
│   shared/face-pay (共享模式) → product/REQ-P-005 (产品需求)         │
│   各项目的 REQ 仍然保留，记录各自的定制点                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、CLI 命令设计

### 7.1 命令列表

| 命令 | 功能 | 优先级 |
|------|------|--------|
| `/req-new` | 创建新需求 | P0 |
| `/req-list` | 列出需求 | P0 |
| `/req-show <ID>` | 查看需求详情 | P0 |
| `/req-search <关键词>` | 搜索需求（双重匹配） | P0 |
| `/req-update <ID>` | 更新需求状态 | P1 |
| `/req-clone <ID>` | 复制需求到新项目 | P1 |
| `/req-promote <pattern>` | 升级为产品功能 | P2 |

### 7.2 命令详解

#### /req-new 创建新需求

```bash
# 基本用法
/req-new 刷脸支付功能

# 指定项目
/req-new 刷脸支付功能 --project project-A

# 基于共享模式
/req-new 刷脸支付功能 --project project-B --base-on shared/face-pay
```

#### /req-search 搜索需求

```bash
# 关键词搜索（自动双重匹配：index.yaml + 全文搜索）
/req-search 刷脸

# 按类型筛选
/req-search 支付 --type shared

# 按项目筛选
/req-search 支付 --project project-A

# 按状态筛选
/req-search 支付 --status completed
```

#### /req-clone 复制需求

```bash
# 复制项目A的需求到项目B
/req-clone REQ-A-001 --to project-B
```

#### /req-promote 升级为产品功能

```bash
# 将共享模式升级为产品需求
/req-promote shared/face-pay
```

---

## 八、实施计划

### 8.1 分阶段实施

| 阶段 | 内容 |
|------|------|
| **P0** | 目录结构 + index.yaml + SKILL.md 模板 + req-router skill |
| **P1** | CLI 命令（`/req-new`、`/req-list`、`/req-search`） |
| **P2** | 复用机制（`/req-clone`）+ 版本 Tag 管理 |
| **P3** | 升级机制（`/req-promote`）+ npx 安装集成 |

### 8.2 MVP 范围

MVP 阶段实现：
1. ⬜ 目录结构创建
2. ⬜ index.yaml 索引文件
3. ⬜ SKILL.md 模板
4. ⬜ req-router skill（核心：自动加载需求上下文）
5. ⬜ `/req-new` 命令
6. ⬜ `/req-list` 命令
7. ⬜ `/req-search` 命令（双重匹配）
8. ⬜ npx 安装时复制 requirements/ + 项目 .gitignore 配置

---

## 九、附录

### A. 文件命名规范

| 文件 | 命名规则 | 示例 |
|------|---------|------|
| 需求ID | `REQ-{项目}-{序号}` | REQ-A-001 |
| 共享模式 | 小写连字符 | face-pay |
| Git Tag | `{pattern}-v{major}` | face-pay-v2 |

### B. 状态流转

```
draft → in-progress → completed → archived
                    ↘ cancelled
```

对于 shared pattern 的额外流转：
```
shared (被 3+ 项目引用) → promoted (升级为产品功能)
```

### C. 与 v1.1 方案的变更对照

| v1.1 方案 | v2.0 方案 | 变更原因 |
|-----------|-----------|---------|
| 独立需求仓库 + Git Submodule | 内置在 ai-engineering-init | 个人使用，npx 安装即同步 |
| 多人协作流程 | 去除 | 个人使用场景 |
| v1/v2 子目录版本管理 | Git Tag + CHANGELOG.md | 避免双重版本控制 |
| index.yaml keywords 唯一搜索 | 双重匹配（keywords + 全文搜索） | 防止关键词遗漏 |
| 无升级机制 | promotionThreshold + /req-promote | 项目需求→产品功能的通道 |
| 无 Claude Code 集成方案 | req-router skill | 自动加载需求上下文 |
