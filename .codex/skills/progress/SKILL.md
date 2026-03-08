# /progress - 项目进度梳理

作为项目进度分析助手，帮您快速分析后端开发进度、识别完成度和待办事项。

## 执行流程

### 第一步：扫描业务模块（强制执行）

```bash
# 查找核心业务模块的 Controller
Glob pattern: "sys-canteen/src/main/java/**/controller/*Controller.java"
Glob pattern: "sys-kitchen/src/main/java/**/controller/*Controller.java"
Glob pattern: "sys-drp/src/main/java/**/controller/*Controller.java"
Glob pattern: "sys-common/src/main/java/**/controller/*Controller.java"

# 基础设施模块（不统计进度）：
# - core-base（公共配置、工具类）
# - core-aggregator（聚合器）
# - sys-open（开放接口模块）
# - sys-logistics（物流模块）
```

自动检测的核心业务模块：
- `sys-canteen`：食堂业务（订单、菜品、用户）
- `sys-kitchen`：后场厨房（备餐、出餐、排班）
- `sys-drp`：供应链（采购、库存、配送）
- `sys-common`：公共业务（支付、通知、对接）

### 第二步：分析代码完整性

对每个功能检查 **8 个必需的文件**（leniu 四层架构）：

| 类型 | 文件 | 完整文件路径 | 必须 | 说明 |
|------|------|------------|------|------|
| Entity | `XxxInfo.java` | `common/model/XxxInfo.java` | ✅ | 数据模型 |
| DTO | `XxxInfoDTO.java` | `web/dto/XxxInfoDTO.java` | ✅ | 请求参数 |
| VO | `XxxInfoVO.java` | `web/vo/XxxInfoVO.java` | ✅ | 返回对象 |
| Mapper | `XxxInfoMapper.java` | `common/mapper/XxxInfoMapper.java` | ✅ | Mapper 接口 |
| MapperXML | `XxxInfoMapper.xml` | `common/mapper/XxxInfoMapper.xml` | ✅ | SQL 映射（同目录） |
| Service | `XxxInfoService.java` | `common/service/impl/XxxInfoService.java` | ✅ | 单表 CRUD |
| Business | `XxxWebBusiness.java` | `web/business/impl/XxxWebBusiness.java` | ✅ | 业务编排 |
| Controller | `XxxWebController.java` | `web/controller/XxxWebController.java` | ✅ | 接口层 |

### 第三步：扫描代码待办（TODO/FIXME）

```bash
# 扫描需要处理的代码注释
Grep pattern: "TODO:|FIXME:" path: sys-canteen/,sys-kitchen/,sys-drp/,sys-common/ glob: "*.java" output_mode: content -B 1
```

### 第四步：扫描 OpenSpec 变更状态（如有）

```bash
# 检查是否有活跃的 OpenSpec 变更
Glob pattern: "openspec/changes/*/tasks.md"

# 对每个找到的变更：
# 1. 读取 proposal.md 获取变更概述
# 2. 读取 tasks.md 统计任务完成情况（[ ] 未完成 / [x] 已完成）
# 3. 检查是否有 design.md、specs/ 等制品
```

### 第五步：代码质量分析

```bash
# 检查代码规范性
Grep pattern: "package org\.dromara\." path: sys-canteen/,sys-kitchen/,sys-drp/ glob: "*.java" output_mode: files_with_matches
Grep pattern: "MapstructUtils|ServiceException" path: sys-canteen/,sys-kitchen/,sys-drp/ glob: "*.java" output_mode: files_with_matches
Grep pattern: "createBy|createTime|updateBy|updateTime" path: sys-canteen/,sys-kitchen/,sys-drp/ glob: "*.java" output_mode: files_with_matches
Grep pattern: "delFlag.*=.*0\b" path: sys-canteen/,sys-kitchen/,sys-drp/ glob: "*.java" output_mode: files_with_matches
```

---

## 输出格式

```markdown
# 项目进度报告

**生成时间**：YYYY-MM-DD HH:mm
**检查范围**：全量后端代码

---

## 项目概况

- **项目名称**：leniu-tengyun-core 云食堂
- **技术栈**：Spring Boot 3.x + pigx-framework + MyBatis-Plus + JDK 21
- **架构**：四层架构（Controller → Business → Service → Mapper）
- **双库**：系统库（全局配置）+ 商户库（租户业务数据）
- **当前阶段**：[开发中/测试中/已上线]

---

## 后端模块进度汇总

| 模块 | 功能数 | 完成数 | 完成率 | 状态 |
|------|--------|--------|--------|------|
| sys-canteen（食堂业务） | X | X | XX% | [状态] |
| sys-kitchen（后场厨房） | X | X | XX% | [状态] |
| sys-drp（供应链） | X | X | XX% | [状态] |
| sys-common（公共业务） | X | X | XX% | [状态] |
| **合计** | **X** | **X** | **XX%** | [状态] |

---

## 功能详情分析

### [模块名] 模块 (XX% 完成)

| 功能 | Entity | DTO | VO | Mapper | XML | Service | Business | Controller | 完成度 | 备注 |
|------|--------|-----|----|--------|-----|---------|----------|------------|--------|------|
| [功能名] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | XX% | [备注] |

**说明**：
- ✅ 已完成
- ⚠️ 部分完成/需改进
- ❌ 待完成

---

## OpenSpec 变更状态（如有活跃变更）

| 变更名称 | 状态 | 任务完成 | 概述 |
|---------|------|---------|------|
| `[change-name]` | 进行中 | X/Y | [proposal 概述] |

> 使用 `/opsx:apply [变更名]` 继续实现未完成的任务，或 `/opsx:verify [变更名]` 验证已完成的变更。

---

## 代码质量分析

| 指标 | 评分 | 说明 |
|------|------|------|
| 包名规范 | 良好 ✅ | 所有包名符合 net.xnzn.core.* |
| 审计字段 | 良好 ✅ | 使用 crby/crtime/upby/uptime |
| del_flag 语义 | 良好 ✅ | 正确使用 2=正常，1=删除 |
| 权限注解完整度 | 待补充 ⚠️ | 部分接口缺少 @RequiresAuthentication |
| 对象转换规范 | 良好 ✅ | 正确使用 BeanUtil.copyProperties() |
| 请求封装规范 | 待补充 ⚠️ | 部分 POST 接口未使用 LeRequest<T> |
| 事务注解完整 | 良好 ✅ | 写操作均有 @Transactional |

---

## 代码待办事项

### TODO 项 (X 个)

| 文件 | 行号 | 类型 | 内容 | 优先级 |
|------|------|------|------|--------|
| `[文件名].java` | [行号] | TODO | [描述] | [优先级] |

### FIXME 项 (X 个)

| 文件 | 行号 | 类型 | 内容 | 优先级 |
|------|------|------|------|--------|
| `[文件名].java` | [行号] | FIXME | [描述] | [优先级] |

---

## 改进建议

### 高优先级（需立即处理）

1. **补充缺失的 Business 层**
   - [模块名] 缺少 [功能名]WebBusiness 编排层
   - 影响：复杂业务逻辑无处放置
   - 建议：使用 `/crud [功能名]` 快速生成

2. **完善权限注解**
   - 发现 X 个接口缺少 @RequiresAuthentication/@RequiresGuest
   - 影响：权限控制不严格
   - 建议：使用 `/check` 进行完整检查

3. **修复 FIXME 问题**
   - [FIXME 描述]
   - 影响：[影响范围]
   - 优先级：🔴 高

### 中优先级（逐步完善）

1. **补充接口注释**
   - [模块名] 缺少业务逻辑注释
   - 建议：为关键方法添加 JavaDoc

2. **优化查询性能**
   - [Service 文件名] 大数据量查询需优化
   - 建议：添加分页、完善 buildWrapper 查询条件

3. **完善 Mapper XML**
   - [模块名] 部分复杂查询需要补充 XML SQL
   - 建议：XML 文件与 Mapper.java 放在同一目录

---

## 检查通过项

- [x] 包名规范（net.xnzn.core.*）
- [x] 对象转换（BeanUtil.copyProperties()）
- [x] 审计字段（crby/crtime/upby/uptime）
- [x] 逻辑删除（del_flag: 2=正常，1=删除）
- [x] Mapper 继承（BaseMapper<Entity>）
- [x] 无 tenant_id 字段（双库物理隔离）

---

## 完成度判定标准

| 完成率 | 状态 | 说明 | 推荐行动 |
|--------|------|------|---------|
| 100% | ✅ 已完成 | 全部 8 个文件均已完成 | 可进行代码审查 |
| 75-99% | 🟢 基本完成 | 缺少 1-2 个文件 | 补充缺失文件 |
| 50-74% | 🟡 进行中 | 缺少 2-4 个文件 | 加快开发进度 |
| 1-49% | 🔴 早期阶段 | 仅有少量文件 | 继续开发 |
| 0% | ⚫ 待开发 | 无相关文件 | 使用 `/dev` 开始开发 |

---

## 快速操作

根据上面的分析结果，您可以使用以下命令快速完成开发：

```bash
# 1. 快速生成缺失功能
/crud [功能名]

# 2. 检查并修复代码规范
/check [模块名]

# 3. 继续开发新功能（含表设计）
/dev 新功能名称

# 4. 快速添加待办任务
/add-todo [任务描述]，[优先级]
```

---

## 说明

- 本报告统计核心业务模块（sys-canteen、sys-kitchen、sys-drp、sys-common）
- 基础设施模块（core-base、core-aggregator、sys-open、sys-logistics）不统计进度
- 完成率基于 8 个必需文件的存在情况判定（leniu 四层架构）
- 代码待办基于 TODO/FIXME 注释统计
- 建议定期运行此命令以追踪项目进度
```

---

## 使用示例

```
用户：/progress
用户：/progress canteen （仅检查 sys-canteen 模块）
用户：/progress kitchen （仅检查 sys-kitchen 模块）

Claude：
🔍 正在扫描项目结构...
📊 分析代码完整性...
🔍 扫描代码待办事项...

[输出完整的进度报告]
```
