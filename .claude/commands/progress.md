# /progress - 项目进度梳理

作为项目进度分析助手，帮您快速分析后端开发进度、识别完成度和待办事项。

## 🎯 执行流程

### 第一步：扫描后端模块（强制执行）

```bash
# 查找所有业务模块
Glob pattern: "ruoyi-modules/ruoyi-*/src/main/java/**/controller/*Controller.java"

# 排除框架模块（不统计进度）
# - ruoyi-system （系统管理）
# - ruoyi-generator （代码生成器）
# - ruoyi-common （公共库）
# - ruoyi-demo （示例模块）
# - ruoyi-job （SnailJob 定时任务）
# - ruoyi-workflow （WarmFlow 工作流）
```

自动检测到的模块示例：
- 其他自定义业务模块（排除以上 6 个框架模块后的模块）

### 第二步：分析代码完整性

对每个功能检查 **7 个必需的文件**：

| 类型 | 文件 | 完整文件路径 | 必须 | 说明 |
|------|------|------------|------|------|
| Entity | `Xxx.java` | `domain/Xxx.java` | ✅ | 数据模型 |
| BO | `XxxBo.java` | `domain/bo/XxxBo.java` | ✅ | 业务对象 |
| VO | `XxxVo.java` | `domain/vo/XxxVo.java` | ✅ | 视图对象 |
| Service 接口 | `IXxxService.java` | `service/IXxxService.java` | ✅ | 服务定义 |
| Service 实现 | `XxxServiceImpl.java` | `service/impl/XxxServiceImpl.java` | ✅ | 服务实现 |
| Mapper | `XxxMapper.java` | `mapper/XxxMapper.java` | ✅ | 数据访问 |
| Controller | `XxxController.java` | `controller/XxxController.java` | ✅ | 接口层 |

### 第三步：扫描代码待办（TODO/FIXME）

```bash
# 扫描需要处理的代码注释
Grep pattern: "TODO:|FIXME:" path: ruoyi-modules/ glob: "*.java" output_mode: content -B 1
```

### 第四步：代码质量分析

```bash
# 检查代码规范性
Grep pattern: "package com\.ruoyi\." path: ruoyi-modules/ glob: "*.java" output_mode: files_with_matches
Grep pattern: "BeanUtil\.copy|BeanUtils\.copy" path: ruoyi-modules/ glob: "*.java" output_mode: files_with_matches
```

---

## 📊 输出格式

```markdown
# 📊 项目进度报告

**生成时间**：YYYY-MM-DD HH:mm
**检查范围**：全量后端代码

---

## 🎯 项目概况

- **项目名称**：RuoYi-Vue-Plus 纯后端版
- **技术栈**：Spring Boot 3 + MyBatis Plus + Sa-Token
- **数据库**：MySQL/MariaDB
- **当前阶段**：[开发中/测试中/已上线]

---

## 📈 后端模块进度汇总

| 模块 | 功能数 | 完成数 | 完成率 | 状态 |
|------|--------|--------|--------|------|
| [模块名] | X | X | XX% | [状态] |
| **合计** | **X** | **X** | **XX%** | [状态] |

---

## 📋 功能详情分析

### [模块名] 模块 (XX% 完成)

| 功能 | Entity | BO | VO | Service | Mapper | Controller | 完成度 | 备注 |
|------|--------|----|----|---------|--------|------------|--------|------|
| [功能名] | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | XX% | [备注] |

**说明**：
- ✅ 已完成
- ⚠️ 部分完成/需改进
- ❌ 待完成

---

## 🔍 代码质量分析

| 指标 | 评分 | 说明 |
|------|------|------|
| 代码规范性 | 良好 ✅ | 包名规范、类名规范 |
| 注释完整度 | 待补充 ⚠️ | 部分功能缺少业务注释 |
| 权限注解完整度 | 需改进 ⚠️ | 部分接口缺少 @SaCheckPermission |
| 对象转换规范 | 良好 ✅ | 正确使用 MapstructUtils |
| Service 查询条件 | 良好 ✅ | buildQueryWrapper 规范 |

---

## 📝 代码待办事项

### TODO 项 (X 个)

| 文件 | 行号 | 类型 | 内容 | 优先级 |
|------|------|------|------|--------|
| `[文件名].java` | [行号] | TODO | [描述] | [优先级] |

### FIXME 项 (X 个)

| 文件 | 行号 | 类型 | 内容 | 优先级 |
|------|------|------|------|--------|
| `[文件名].java` | [行号] | FIXME | [描述] | [优先级] |

---

## 💡 改进建议

### 高优先级（需立即处理）

1. **补充缺失的 BO/VO**
   - [模块名] 缺少 [功能名]Bo 和 [功能名]Vo
   - 影响：接口参数验证不完整
   - 建议：使用 `/crud [功能名]` 快速生成

2. **完善权限注解**
   - 发现 X 个接口缺少 @SaCheckPermission
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
   - [ServiceImpl 文件名] 大数据量查询需优化
   - 建议：添加分页、缓存策略

3. **完善 Service 层**
   - [模块名] buildQueryWrapper 待完善
   - 建议：参考 SysNoticeServiceImpl 实现

---

## ✅ 检查通过项

- [x] 包名规范（org.dromara.*）
- [x] 对象转换（MapstructUtils）
- [x] Entity 基类（继承 TenantEntity）
- [x] Mapper 继承（BaseMapperPlus）
- [x] Service 接口声明

---

## 📊 完成度判定标准

| 完成率 | 状态 | 说明 | 推荐行动 |
|--------|------|------|---------|
| 100% | ✅ 已完成 | 全部 7 个文件均已完成 | 可进行代码审查 |
| 71-99% | 🟢 基本完成 | 缺少 1-2 个文件 | 补充缺失文件 |
| 50-70% | 🟡 进行中 | 缺少 2-3 个文件 | 加快开发进度 |
| 1-49% | 🔴 早期阶段 | 仅有少量文件 | 继续开发 |
| 0% | ⚫ 待开发 | 无相关文件 | 使用 `/dev` 开始开发 |

---

## 🚀 快速操作

根据上面的分析结果，您可以使用以下命令快速完成开发：

```bash
# 1. 快速生成缺失功能
/crud [功能名]

# 2. 检查并修复代码规范
/check [模块名]

# 3. 继续开发新功能
/dev 新功能名称

# 4. 快速添加代办任务
/add-todo [任务描述]，[优先级]，[截止时间]
```

---

## 📌 说明

- 本报告仅统计业务模块（排除框架模块：system、generator、common、demo、job、workflow）
- 完成率基于 7 个必需文件的存在情况判定
- 代码待办基于 TODO/FIXME 注释统计
- 建议定期运行此命令以追踪项目进度
```

---

## 使用示例

```
用户：/progress
用户：/progress business （仅检查 business 模块）
用户：/progress demo （仅检查 demo 模块）

Claude：
🔍 正在扫描项目结构...
📊 分析代码完整性...
🔍 扫描代码待办事项...

[输出完整的进度报告]
```

