# /init-docs - 初始化业务文档

作为项目文档初始化助手，根据用户选择的模式初始化项目文档。

---

## 第一步：检测项目类型

### 检查前端项目路径

```bash
# 检查前端项目是否存在
Glob pattern: "/Users/xujiajun/Developer/frontProj/web/src/"
```

**如果存在前端项目**：
> 检测到前端项目 `frontProj/web`（Vue 2 + Element UI），当前初始化仅生成后端文档。
> 前端页面相关文档请在前端项目中管理。

**如果不存在**：
> 当前为纯后端项目模式。

---

## 第二步：询问用户选择模式

**向用户展示以下选项：**

```
请选择文档初始化模式：

1️⃣ **空白模板模式**（推荐新项目）
   - 创建空白的项目管理文档
   - 由你手动填写业务需求和设计方案
   - 适合：开始新业务功能开发、记录产品需求

2️⃣ **扫描现有代码模式**
   - 自动扫描代码库，生成当前实现状态报告
   - 统计已完成的模块、待办事项、技术债务
   - 适合：了解项目现状、梳理进度

请输入 1 或 2 选择模式：
```

---

## 模式一：空白模板模式

### 执行条件
用户选择 `1` 或 输入 `空白`、`模板`、`新项目` 等关键词

### 执行步骤

#### 1. 询问项目信息

向用户询问：
- **项目名称**：业务功能的中文名称
- **项目简述**：一句话描述项目目标（可选）

#### 2. 创建空白文档

基于以下模板创建三个文件到 `docs/` 目录：

##### 项目状态.md（空白模板）

```markdown
# [项目名称] - 项目状态

> 最后更新：[当前日期]

## 项目概述

**项目名称**：[项目名称]
**项目简述**：[项目简述]
**技术栈**：Spring Boot 3.x + pigx-framework + MyBatis-Plus + JDK 21
**架构**：四层架构（Controller → Business → Service → Mapper）
**双库**：系统库（全局配置）+ 商户库（租户业务数据）
**开始时间**：[当前日期]
**预计完成**：待定
**当前阶段**：需求分析

## 进度总览

| 阶段 | 状态 | 说明 |
|------|------|------|
| 需求分析 | 🟡 进行中 | |
| 技术设计 | ⚪ 未开始 | |
| 后端开发 | ⚪ 未开始 | |
| 测试验收 | ⚪ 未开始 | |

## 里程碑

- [ ] 需求文档完成
- [ ] 技术方案评审（含表设计）
- [ ] 后端接口开发完成
- [ ] 功能测试通过
- [ ] 上线发布

## 风险与问题

暂无

## 变更记录

| 日期 | 变更内容 | 负责人 |
|------|---------|--------|
| [当前日期] | 项目启动 | |
```

##### 需求文档.md（空白模板）

```markdown
# [项目名称] - 需求文档

> 版本：v1.0 | 更新时间：[当前日期]

## 1. 背景与目标

### 1.1 业务背景

[描述为什么需要这个功能，解决什么业务问题]

### 1.2 项目目标

- 目标1：
- 目标2：
- 目标3：

## 2. 用户故事

### 2.1 用户角色

| 角色 | 说明 |
|------|------|
| 管理员 | 食堂管理端用户 |
| 普通用户 | 员工/就餐人员 |

### 2.2 用户故事列表

| 编号 | 作为... | 我想要... | 以便于... | 优先级 |
|------|--------|----------|----------|--------|
| US-001 | | | | P0 |
| US-002 | | | | P1 |

## 3. 功能需求

### 3.1 功能列表

| 功能模块 | 功能点 | 说明 | 优先级 | 所属模块 |
|---------|-------|------|--------|---------|
| | | | | sys-canteen/sys-kitchen/sys-drp |

### 3.2 功能详情

#### 3.2.1 [功能名称]

**功能描述**：

**业务规则**：
1.
2.

**接口需求**：
- 路由：`/api/v2/web/[module]/[feature]`
- 端：web/mobile/android

## 4. 非功能需求

### 4.1 性能要求

- 响应时间：
- 并发量：

### 4.2 安全要求

- 权限控制：@RequiresAuthentication
- 数据安全：通过商户库物理隔离

## 5. 数据设计

### 5.1 数据模型

| 字段名 | 类型 | 说明 | 必填 |
|-------|------|------|------|
| id | BIGINT | 主键（雪花ID） | 是 |
| | | | |
| crby | VARCHAR(64) | 创建人 | 是 |
| crtime | DATETIME | 创建时间 | 是 |
| upby | VARCHAR(64) | 更新人 | 是 |
| uptime | DATETIME | 更新时间 | 是 |
| del_flag | INT | 删除标识(1-删除,2-正常) | 是 |

### 5.2 数据字典

| 字典类型 | 字典名称 | 字典项 |
|---------|---------|--------|
| | | |

## 6. 接口设计

### 6.1 接口列表

| 接口名称 | 方法 | 路径 | 说明 |
|---------|------|------|------|
| 新增 | POST | /api/v2/web/{module}/{feature}/add | |
| 修改 | POST | /api/v2/web/{module}/{feature}/update | |
| 删除 | POST | /api/v2/web/{module}/{feature}/delete | |
| 详情 | GET | /api/v2/web/{module}/{feature}/get/{id} | |
| 分页 | POST | /api/v2/web/{module}/{feature}/page | |

## 7. 附录

### 7.1 术语表

| 术语 | 说明 |
|------|------|
| 系统库 | 全局数据（商户配置、字典） |
| 商户库 | 租户业务数据（订单、菜品） |
| crby | 创建人 |
| crtime | 创建时间 |

### 7.2 参考资料

- 订单 Controller：`sys-canteen/.../order/web/controller/OrderInfoWebController.java`
- Bootstrap 配置：`core-base/src/main/resources/bootstrap.yml`
```

##### 待办清单.md（空白模板）

```markdown
# [项目名称] - 待办清单

> 最后更新：[当前日期]

## 当前迭代

### 🔴 紧急/重要

- [ ]

### 🟡 进行中

- [ ]

### 🟢 待开始

- [ ]

## 任务分解

### 1. 需求分析阶段

- [ ] 整理业务需求
- [ ] 编写需求文档
- [ ] 需求评审

### 2. 技术设计阶段

- [ ] 数据库表设计（含 crby/crtime/upby/uptime/del_flag 字段）
- [ ] 接口设计（确认端类型：web/mobile/android）
- [ ] 技术方案评审

### 3. 后端开发阶段

- [ ] 创建数据库表（商户库）
- [ ] 创建 Entity + Mapper + MapperXML
- [ ] 实现 Service 业务逻辑（单表 CRUD）
- [ ] 实现 Business 层（业务编排）
- [ ] 实现 Controller 接口
- [ ] 接口测试（/check 规范检查）

### 4. 测试上线阶段

- [ ] 功能测试
- [ ] Bug 修复
- [ ] 上线部署

## 已完成

### [日期]

- [x] 示例：完成的任务

## 问题记录

| 日期 | 问题 | 状态 | 解决方案 |
|------|------|------|---------|
| | | | |
```

#### 3. 输出结果

```
✅ 项目管理文档已创建（空白模板模式）

📁 docs/
├── 项目状态.md      # 进度追踪
├── 需求文档.md      # 业务需求
└── 待办清单.md      # 任务清单

💡 下一步：
1. 编辑 docs/需求文档.md 填写业务需求
2. 在 docs/待办清单.md 中分解任务
3. 使用 /progress 查看项目进度
4. 使用 /add-todo 快速添加待办
```

---

## 模式二：扫描现有代码模式

### 执行条件
用户选择 `2` 或 输入 `扫描`、`现有`、`分析` 等关键词

---

## 重要：只扫描业务模块，不扫描基础设施

**基础设施部分（不扫描、不统计）**:
- ❌ `core-base/` - 公共配置、工具类
- ❌ `core-aggregator/` - 聚合器
- ❌ `sys-open/` - 开放接口模块
- ❌ `sys-logistics/` - 物流模块

**业务部分（重点扫描）**:
- ✅ `sys-canteen/` - 食堂业务（订单、菜品、用户）
- ✅ `sys-kitchen/` - 后场厨房（备餐、出餐、排班）
- ✅ `sys-drp/` - 供应链（采购、库存、配送）
- ✅ `sys-common/` - 公共业务（支付、通知、对接）

## 扫描步骤：

### 1. 读取模板文件
- `.claude/templates/项目状态模板.md`（如存在）
- `.claude/templates/需求文档模板.md`（如存在）
- `.claude/templates/待办清单模板.md`（如存在）

### 2. 智能识别业务模块结构

#### 第一步：识别核心业务模块
**扫描路径**: `sys-canteen/`、`sys-kitchen/`、`sys-drp/`、`sys-common/`

**识别规则**:
1. 在每个模块下扫描 Controller 文件
   ```
   sys-canteen/src/main/java/net/xnzn/core/canteen/**/controller/*Controller.java
   sys-kitchen/src/main/java/net/xnzn/core/kitchen/**/controller/*Controller.java
   sys-drp/src/main/java/net/xnzn/core/drp/**/controller/*Controller.java
   sys-common/src/main/java/net/xnzn/core/common/**/controller/*Controller.java
   ```
2. 按业务功能领域分包（如 order、dish、user 等）
3. 统计每个功能包下的 Controller 数量

**特别注意**：
- 如果检测到 0 个 Controller → 这是全新项目，生成空的业务文档模板
- 提示用户："当前是全新框架，尚无业务代码。使用 `/dev` 或 `/crud` 开发业务功能后再次执行本命令更新文档。"

#### 第二步：分析每个业务模块的内部结构

对每个识别出的功能领域（如 canteen/order）检查四层架构：

```
sys-canteen/src/main/java/net/xnzn/core/canteen/order/
├── web/
│   ├── controller/XxxWebController.java    ← Controller 层
│   ├── business/impl/XxxWebBusiness.java   ← Business 层
│   ├── dto/XxxInfoDTO.java                 ← 请求参数
│   └── vo/XxxInfoVO.java                   ← 返回对象
└── common/
    ├── model/XxxInfo.java                  ← Entity
    ├── mapper/XxxInfoMapper.java           ← Mapper 接口
    ├── mapper/XxxInfoMapper.xml            ← XML（同目录）
    └── service/impl/XxxInfoService.java    ← Service 层
```

#### 第三步：统计功能模块完整性

对每个 Controller，检查对应的 **8 个必需文件**（leniu 四层架构）：

| 文件类型 | 文件位置 | 必须 |
|---------|---------|------|
| Entity | `common/model/XxxInfo.java` | ✅ |
| DTO | `web/dto/XxxInfoDTO.java` | ✅ |
| VO | `web/vo/XxxInfoVO.java` | ✅ |
| Mapper | `common/mapper/XxxInfoMapper.java` | ✅ |
| MapperXML | `common/mapper/XxxInfoMapper.xml` | ✅ |
| Service | `common/service/impl/XxxInfoService.java` | ✅ |
| Business | `web/business/impl/XxxWebBusiness.java` | ✅ |
| Controller | `web/controller/XxxWebController.java` | ✅ |

**完整度计算**：`存在文件数 / 8 × 100%`

### 3. 深度分析代码 TODO

**扫描范围** (只扫描业务代码):
```bash
# 核心业务模块
sys-canteen/src/main/java/**/*.java
sys-kitchen/src/main/java/**/*.java
sys-drp/src/main/java/**/*.java
sys-common/src/main/java/**/*.java
```

**提取规则**:
1. 提取 `// TODO:`、`// FIXME:`、`// HACK:` 注释
2. 记录完整的文件相对路径和精确行号
3. 提取 TODO 的完整描述文本
4. 智能分类：
   - **高优先级**: 包含 `FIXME`、`URGENT`、`CRITICAL` 关键词
   - **中优先级**: 普通 `TODO`
   - **低优先级**: 包含 `OPTIMIZE`、`ENHANCE`、`NICE_TO_HAVE` 关键词
5. 识别模块归属（根据文件路径判断属于哪个业务模块）

**输出格式**:
```markdown
- [ ] 完善查询条件逻辑
  - 截止日期: 待定
  - 描述: 在 OrderInfoService 中完善 buildWrapper 条件
  - 位置: sys-canteen/src/main/java/net/xnzn/core/canteen/order/common/service/impl/OrderInfoService.java:82
  - 模块: sys-canteen（订单领域）
  - 预计工作量: 0.5天
```

### 4. 智能分析 Git 提交

**分析最近 20-30 条提交**:
1. 提取提交信息、日期、修改的文件
2. **区分基础设施提交 vs 业务提交**：
   - 基础设施提交：修改 `core-base/`、`core-aggregator/` 或系统配置
   - 业务提交：修改 `sys-canteen/`、`sys-kitchen/`、`sys-drp/`、`sys-common/`
3. **提取业务功能的提交信息**：
   - 识别关键词：`feat`、`fix`、`update`、`add`、`implement`
   - 提取功能描述
4. **计算开发耗时**：
   - 根据同一功能的首次提交和最后提交计算
5. **识别最近开发的模块**：
   - 按提交频率排序
   - 标注最活跃的业务模块

### 5. 生成高质量文档到 `docs/` 目录

#### 项目状态文档 (`docs/项目状态.md`)

**必须包含的内容**:

##### 1. 项目概况
```markdown
## 当前状态
- 项目阶段: 开发中/测试中/已上线
- **业务进度**: X% (只统计 sys-canteen/sys-kitchen/sys-drp/sys-common)
- **技术栈**: Spring Boot 3.x + pigx-framework 3.4.7 + JDK 21
- **架构**: 四层（Controller → Business → Service → Mapper）
- **双库**: 系统库（全局配置）+ 商户库（租户业务数据）
- 下一步计划: [从待办事项中提取优先级最高的 3 项]

## 基础设施模块（已完成，不统计进度）
- ✅ core-base：公共配置、工具类、框架扩展
- ✅ core-aggregator：模块聚合器
- ✅ sys-open：开放接口（第三方对接）
- ✅ sys-logistics：物流模块

详见：CLAUDE.md
```

**如果检测到 0 个业务 Controller（全新项目）**：
```markdown
## 当前状态
- 项目阶段: 初始化
- **业务进度**: 0% (尚未开发业务功能)
- **框架状态**: ✅ 已完成
- 下一步计划: 开始第一个业务功能开发

## 这是一个全新项目
当前只有基础框架，尚未开发任何业务功能。

**框架已包含**：
- ✅ core-base 基础配置
- ✅ 双库架构（系统库 + 商户库）
- ✅ pigx-framework 3.4.7

**下一步**：
使用 `/dev` 开始设计第一个业务功能，或使用 `/crud` 基于已有表快速生成代码。
```

##### 2. 业务模块统计（按核心模块分组）
```markdown
## ✅ 已完成

### sys-canteen 模块 - 已完成 X 个 / 共 Y 个
- [x] 功能名称 (完成日期: YYYY-MM-DD)
  - 耗时: X天 (根据Git提交计算)
  - 说明: 功能描述
  - 完整度: 100% (Entity✅ DTO✅ VO✅ Mapper✅ XML✅ Service✅ Business✅ Controller✅)
```

##### 3. 进行中模块（完整度 < 100%）
```markdown
## 🚧 进行中

### sys-canteen 模块

- [ ] 功能名称 (开始: YYYY-MM-DD)
  - 进度: X%
  - 预计完成: YYYY-MM-DD
  - 缺失部分:
    - ⏳ XxxWebBusiness.java (Business 编排层未创建)
    - ⏳ XxxInfoMapper.xml (XML 映射文件未创建)
  - 位置: sys-canteen/src/main/java/net/xnzn/core/canteen/[功能包]/
```

##### 4. 待办任务
```markdown
## 📋 待办

### 高优先级
- [ ] 任务描述
  - 优先级: 高
  - 预计工作量: X天
  - 位置: 文件路径:行号
  - 模块: sys-canteen
```

##### 5. 技术债务和问题
```markdown
## ⚠️ 问题和风险

### 技术债务
- **TODO 标记**: 项目中存在 X 个 TODO 标记
  - 按模块分类列出...

### 代码规范问题
- 权限注解缺失：X 个接口缺少 @RequiresAuthentication
- 审计字段问题：X 处使用了 createBy（应为 crby）
```

#### 需求文档 (`docs/需求文档.md`)

**必须包含的内容**:

##### 1. 项目概述
```markdown
## 项目概述
- **项目名称**: leniu-tengyun-core（云食堂）
- **项目类型**: 智慧食堂云服务平台
- **技术栈**: Spring Boot 3.x + pigx-framework + MyBatis-Plus + JDK 21
- **包名规范**: net.xnzn.core.*
- **业务模块**: sys-canteen（食堂）、sys-kitchen（后厨）、sys-drp（供应链）、sys-common（公共）
```

##### 2. 功能需求（按核心模块分类）
```markdown
## 1. 功能需求

### 1.1 sys-canteen 模块（食堂业务）

#### REQ-CANTEEN-001: 功能名称
- 优先级: 高
- 预计时间: X天
- 状态: ✅ 已完成 / 🚧 进行中 / ⚪ 待开发
- 描述: 功能描述
- 技术实现:
  - 模块: sys-canteen
  - 包路径: net.xnzn.core.canteen.[功能包]
  - Controller: XxxWebController.java（路由：/api/v2/web/canteen/xxx）
  - Business: XxxWebBusiness.java
  - Service: XxxInfoService.java
  - Mapper: XxxInfoMapper.java + XxxInfoMapper.xml
```

##### 3. 技术需求
```markdown
## 2. 技术需求

### 2.1 后端技术栈
- **Java**: JDK 21
- **Spring Boot**: 3.x
- **pigx-framework**: 3.4.7
- **MyBatis-Plus**: 最新版
- **数据库**: MySQL 8.0+（双库架构）
- **缓存**: Redis + Redisson
- **容器**: Undertow（替换 Tomcat）

### 2.2 双库架构
- **系统库**: 全局数据（商户配置、字典等）
- **商户库**: 租户业务数据（订单、菜品等），通过请求头 MERCHANT-ID 路由
- **切换方式**:
  - 商户库（默认）：无需额外处理
  - 系统库：`Executors.doInSystem(() -> {...})`
  - 遍历租户：`Executors.doInAllTenant(tenantId -> {...})`
```

#### 待办清单 (`docs/待办清单.md`)

**必须包含的内容**:

##### 1. 按优先级和模块分类
```markdown
## 🔥 高优先级（紧急重要）

### sys-canteen 模块
- [ ] 任务描述
  - 截止日期: YYYY-MM-DD
  - 描述: 详细描述
  - 位置: 文件路径:行号
  - 预计工作量: X天
```

##### 2. 统计信息
```markdown
## 统计信息

### 按优先级分类
- 🔥 高优先级: X 项
- 📌 中优先级: Y 项
- 💡 低优先级: Z 项

### 按业务模块分类
- sys-canteen 模块: X 项
- sys-kitchen 模块: X 项
- sys-drp 模块: X 项
- sys-common 模块: X 项

### 工作量统计
- 预计总工作量: 约 X 天
- 高优先级工作量: Y 天
```

---

## 质量标准

### 优秀文档的特征
1. **完整度明确**: 用百分比表示，不模糊
2. **代码定位精确**: 完整的相对路径 + 行号
3. **工作量合理**: 根据 Git 提交历史估算
4. **分类清晰**: 按业务模块分类（sys-canteen/sys-kitchen/sys-drp/sys-common）
5. **信息完整**: 包含依赖、影响范围、解决方案
6. **统计准确**: 数量、百分比、工作量都有数据支撑

### 必须避免的问题
1. **不要统计基础设施代码**: 只关注业务模块（排除 core-base、core-aggregator、sys-open、sys-logistics）
2. **不要只统计文件数**: 要分析功能完整度（8 个必需文件：leniu 四层架构）
3. **不要笼统描述**: "XX 模块已完成" → "XX 模块 100% (Entity✅ DTO✅ VO✅ Mapper✅ XML✅ Service✅ Business✅ Controller✅)"
4. **不要遗漏 TODO**: 深度扫描所有业务模块代码中的 TODO 标记
5. **不要估算过于乐观**: 工作量评估要参考历史提交
6. **不要忽略技术债务**: 单独列出 FIXME 和已知问题
7. **包名必须正确**: `net.xnzn.core.*`（非 `org.dromara`、非 `com.ruoyi`）
8. **四层架构**: Controller → Business → Service → Mapper（含 Business 层！）
9. **Mapper XML 同目录**: XML 与 .java 文件在同一目录，非 `resources/mapper/`
10. **审计字段规范**: `crby/crtime/upby/uptime`（非 `createBy/createTime`）

## 注意事项

### 文档生成后
- 所有文档保存到 `docs/` 目录
- 填充真实数据，不留空模板
- 生成后提供文档摘要和主要发现
- 建议用户根据实际情况调整

### 时间和数据格式
- 时间格式: `YYYY-MM-DD HH:MM`
- 进度百分比: 0-100%，保留整数
- 工作量: X天/周，整数估算
- 完成日期: 从 Git 提交记录提取

### 智能推断
- 如果 Git 记录无法确定完成日期，标注"待确认"
- 如果工作量无法估算，根据代码复杂度给出范围（如 3-5天）
- 如果模块分类不明确，按实际目录结构组织

---

## 相关命令

| 命令 | 说明 | 用途 |
|------|------|------|
| `/start` | 快速了解项目 | 初次接触项目 |
| `/progress` | 查看项目进度 | 了解完成情况 |
| `/sync` | 全量同步报告 | 定期整理文档 |
| `/add-todo` | 添加待办任务 | 跟踪任务 |
| `/next` | 获取下一步建议 | 确定开发方向 |
