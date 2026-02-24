# /check - 后端代码规范检查

作为代码规范检查助手，自动检测项目代码是否符合 leniu-tengyun-core（云食堂）后端规范。

## 检查范围

支持三种模式：

1. **全量检查**：`/check` - 检查所有业务模块
2. **模块检查**：`/check canteen` - 检查指定模块
3. **文件检查**：`/check XxxServiceImpl.java` - 检查指定文件

---

## 检查清单总览

| 检查项 | 级别 | 说明 |
|--------|------|------|
| 包名规范 | 🔴 严重 | 必须是 `net.xnzn.core.*` |
| 禁用旧工具类 | 🔴 严重 | 禁止 MapstructUtils、ServiceException |
| 审计字段命名 | 🔴 严重 | 必须用 crby/crtime/upby/uptime |
| del_flag 语义 | 🔴 严重 | 2=正常，1=删除（不是 0=正常） |
| 不含 tenant_id | 🔴 严重 | 双库物理隔离，Entity 无需此字段 |
| 禁止 Map 传业务数据 | 🔴 严重 | 必须用 VO/DTO |
| 认证注解 | 🟡 警告 | 接口应有 @RequiresAuthentication 或 @RequiresGuest |
| 请求封装 | 🟡 警告 | POST 请求应使用 LeRequest<T> |
| 事务注解 | 🟡 警告 | 写操作应加 @Transactional(rollbackFor = Exception.class) |
| 国际化异常 | 🟢 建议 | LeException 建议配合 I18n.getMessage() |

---

## 检查详情

### 1. 包名规范 [🔴 严重]

```bash
Grep pattern: "package org\.dromara\." path: [目标目录] glob: "*.java"   # ❌ 必须为 0 个
Grep pattern: "package com\.ruoyi\." path: [目标目录] glob: "*.java"      # ❌ 必须为 0 个
Grep pattern: "package net\.xnzn\.core\." path: [目标目录] glob: "*.java" # ✅ 应有结果
```

```java
// ❌ 错误
package org.dromara.system.service;

// ✅ 正确
package net.xnzn.core.canteen.order.service;
```

### 2. 禁止使用 RuoYi 工具类 [🔴 严重]

```bash
Grep pattern: "MapstructUtils" path: [目标目录] glob: "*.java"
Grep pattern: "ServiceException" path: [目标目录] glob: "*.java"
Grep pattern: "import javax\.validation" path: [目标目录] glob: "*.java"
```

| 错误写法 | 正确写法 |
|---------|---------|
| `MapstructUtils.convert()` | `BeanUtil.copyProperties()` |
| `throw new ServiceException()` | `throw new LeException()` |
| `import javax.validation.*` | `import jakarta.validation.*` |

### 3. 审计字段命名 [🔴 严重]

```bash
Grep pattern: "private.*createBy\|private.*updateBy\|private.*createTime\|private.*updateTime" path: [目标目录] glob: "*.java"
```

| 错误写法 | 正确写法 | 填充时机 |
|---------|---------|---------|
| `createBy` | `crby` | INSERT |
| `createTime` | `crtime` | INSERT |
| `updateBy` | `upby` | INSERT_UPDATE |
| `updateTime` | `uptime` | INSERT_UPDATE |

### 4. del_flag 值语义 [🔴 严重]

```bash
Grep pattern: "delFlag.*=.*0\|del_flag.*=.*0" path: [目标目录] glob: "*.java"
Grep pattern: "DelFlag.*NORMAL.*0\|del_flag.*DEFAULT.*0" path: [目标目录]
```

- ❌ `delFlag = 0`（RuoYi 的正常值，leniu 中是错误的）
- ✅ `delFlag = 2`（leniu 的正常值，`1=删除，2=正常`）

### 5. Entity 不含 tenant_id [🔴 严重]

```bash
Grep pattern: "tenantId\|tenant_id" path: [目标目录] glob: "*.java"
```

- ❌ Entity 中有 `tenantId` 字段（双库物理隔离，无需此字段）
- ✅ 通过 `TenantContextHolder.getTenantId()` 获取当前租户

### 6. 禁止 Map 传递业务数据 [🔴 严重]

```bash
Grep pattern: "Map<String,\s*Object>" path: [目标目录] glob: "*.java"
```

- ❌ 返回 `Map<String, Object>` 封装业务数据
- ✅ 创建专属 VO 类返回

### 7. 认证注解 [🟡 警告]

```bash
Grep pattern: "@RequiresAuthentication\|@RequiresGuest" path: [目标目录] glob: "*Controller.java"
```

- Controller 中每个接口应有 `@RequiresAuthentication` 或 `@RequiresGuest` 注解

### 8. 请求封装 [🟡 警告]

```bash
Grep pattern: "@RequestBody [^L]" path: [目标目录] glob: "*Controller.java"
```

- POST/PUT 请求体建议统一用 `@RequestBody LeRequest<T>` 封装
- `request.getContent()` 获取实际参数

### 9. 事务注解 [🟡 警告]

```bash
Grep pattern: "@Transactional" path: [目标目录] glob: "*ServiceImpl.java"
```

- 写操作（insert/update/delete）应加 `@Transactional(rollbackFor = Exception.class)`
- 查询方法不需要加事务

### 10. 国际化异常 [🟢 建议]

```bash
Grep pattern: "new LeException\(\"[^\"]*[\u4e00-\u9fa5]" path: [目标目录] glob: "*.java"
```

- 建议将硬编码中文消息迁移到 `I18n.getMessage("xxx.key")` 国际化

---

## 输出格式

```markdown
# 代码审查报告

审查范围: [文件/模块]
审查时间: YYYY-MM-DD HH:mm

## 严重问题（X 项）

1. [问题类型]
   文件: path/to/file.java:行号
   问题: 描述
   修复: 代码示例

## 警告问题（X 项）
...

## 通过项
- [x] 包名规范 (net.xnzn.core.*)
- [x] 使用 LeException
- [x] 审计字段正确 (crby/crtime/upby/uptime)
- [x] del_flag 语义正确 (2=正常)
- [x] 无 tenant_id 字段
...

结论: ✅ 通过 / ⚠️ 需修复 / ❌ 不通过
```

---

## 检查优先级

### 开发完成后必查（阻塞提交）

1. 包名是否是 `net.xnzn.core.*`
2. 审计字段是否正确（crby/crtime/upby/uptime）
3. del_flag 值是否正确（2=正常，1=删除）
4. 是否有 `tenantId` 字段（不应存在）
5. 对象转换是否使用 `BeanUtil.copyProperties()`

### 代码审查建议查

1. 所有 POST 接口是否使用 `LeRequest<T>`
2. 认证注解是否完整
3. 写操作是否有 `@Transactional`
4. 是否有硬编码中文异常消息

---

## 快速修复指南

| 问题 | 修复方式 |
|------|---------|
| 包名错误 | 全局替换 `org.dromara` → `net.xnzn.core` |
| 审计字段错误 | 全局替换 createBy→crby、createTime→crtime、updateBy→upby、updateTime→uptime |
| del_flag=0 | 替换为 del_flag=2 |
| MapstructUtils | 替换为 `BeanUtil.copyProperties(source, Target.class)` |
| ServiceException | 替换为 `LeException` |
| javax.validation | 替换为 `jakarta.validation` |

---

## 参考代码

| 类型 | 路径 |
|------|------|
| Controller 示例 | `sys-canteen/.../order/web/controller/OrderInfoWebController.java` |
| Service 示例 | `sys-canteen/.../order/common/service/impl/OrderInfoService.java` |
| Entity 示例 | `sys-canteen/.../order/common/model/OrderInfo.java` |
