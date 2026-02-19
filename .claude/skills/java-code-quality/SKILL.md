---
name: java-code-quality
description: |
  Java后端代码质量检查规范。当编写或审查Java代码和MyBatis XML时使用，进行全面质量检查。
  
    触发场景：
    - 检查Java代码的空指针风险、参数校验、并发安全、事务边界
    - 检查MyBatis XML的SQL注入风险、性能问题
    - 代码质量评分和评级
    - 识别白名单API免检项
  
    触发词：代码质量、代码检查、代码审查、质量评分、SQL注入检查、空指针检查、代码评级、质量评估
---

# Java后端代码质量检查规范

## 检查流程

1. 识别文件类型（Java/MyBatis XML）
2. 根据检查项清单逐项检查
3. 记录问题（位置、类型、严重程度）
4. 统计扣分和加分
5. 计算最终得分和评级
6. 输出详细报告

## Java代码检查

### 必检项（扣分项）

| 检查项 | 严重程度 | 扣分 | 检查要点 |
|--------|----------|------|----------|
| 空指针风险 | 高 | -10分 | selectOne/getOne返回值是否有null判断 |
| 参数校验 | 中 | -5分 | 入参是否校验非空和合法性 |
| 并发安全 | 高 | -10分 | 查询+新增组合操作是否有竞态条件 |
| 事务边界 | 高 | -10分 | 多表操作是否加了@Transactional |
| 资源关闭 | 中 | -5分 | Stream/IO流/连接是否正确关闭 |
| 集合操作 | 中 | -5分 | 遍历集合时是否有并发修改风险 |

### 代码规范项（扣分项）

| 检查项 | 严重程度 | 扣分 | 检查要点 |
|--------|----------|------|----------|
| SQL注入 | 高 | -10分 | 是否使用${}拼接参数 |
| 敏感信息 | 高 | -10分 | 日志中是否有密码/token泄露 |
| 返回值兜底 | 中 | -5分 | 异常情况下是否有默认返回值 |
| 集合参数防御 | 中 | -5分 | 集合参数是否为空判断 |
| 异常透传 | 中 | -5分 | 异常是否被吞掉或不当处理 |
| 日志追踪 | 低 | -2分 | 关键操作是否有日志 |
| 魔法值 | 低 | -2分 | 是否存在未定义常量 |
| 方法长度 | 低 | -2分 | 方法是否过长（>100行） |
| 注释完整性 | 低 | -2分 | 公共API是否有JavaDoc |
| 异常处理 | 低 | -2分 | catch块是否为空或仅打印日志 |
| 过时API | 低 | -2分 | 是否使用@Deprecated方法 |

### 白名单API（免检项）

以下API调用**不需要**进行空指针检查：

**基础配置API（保证非空）：**
- `allocCanteenApi.getAllocCanteen()` - 食堂信息查询
- `allocCanteenApi.queryIdByAreaCanteenName()` - 区域食堂查询
- `allocAreaApi.*` - 区域相关API
- `allocStallApi.*` - 档口相关API

**权限API（返回空集合或包含错误ID的集合）：**
- `mgrAuthV2Api.authOrgIdList()` - 组织权限ID列表
- `mgrAuthV2Api.authWarehouseIdList()` - 仓库权限ID列表

**注意事项：**
- `costAuthUtil.getCostAuthDTO()` **可能返回null**，需要判断
- 忽略`LeResponse`包装检查（有`RestControllerAdvice`统一处理）
- 如果上层有`@RequiresAuthentication`注解，忽略TokenManager异常分支检查

### 加分项

#### 高风险防御加分（每项+2分）

| 加分项 | 加分条件 |
|-------|---------|
| 并发安全防御 | 使用分布式锁、乐观锁、CAS等机制 |
| 事务管理优秀 | @Transactional(rollbackFor=Exception.class)，避免大事务 |
| SQL注入防护 | 全部使用#{}参数化查询 |
| 敏感信息保护 | 敏感字段脱敏，使用@JsonIgnore等注解 |
| 租户隔离完善 | 正确使用TenantContextHolder，跨租户操作有校验 |
| 越权防护完备 | 数据操作前校验数据归属 |

#### 设计模式加分（每项+2分）

| 加分项 | 加分条件 |
|-------|---------|
| 策略模式 | 使用策略模式消除if-else |
| 责任链模式 | 使用责任链处理复杂逻辑 |
| 模板方法 | 抽象公共逻辑到模板类 |
| 工具方法 | 提取公共方法/工具类，避免重复 |
| 异常处理规范 | 自定义业务异常，异常信息清晰 |

**加分说明：**
- 加分上限为**20分**
- 同一类型只计一次
- 需有明确代码证据

## MyBatis XML检查

### SQL安全项

| 检查项 | 严重程度 | 扣分 | 检查要点 |
|--------|----------|------|----------|
| SQL注入风险 | 高 | -10分 | 是否使用${}而非#{} |
| in查询防护 | 中 | -5分 | IN查询是否考虑集合为空 |
| 动态SQL | 中 | -5分 | <if>、<where>标签使用是否正确 |

### SQL性能项

| 检查项 | 严重程度 | 扣分 | 检查要点 |
|--------|----------|------|----------|
| SELECT * | 中 | -5分 | 是否使用SELECT * |
| 缺少WHERE | 高 | -10分 | UPDATE/DELETE是否缺少WHERE |
| 索引失效 | 中 | -5分 | WHERE条件是否使用函数导致索引失效 |
| JOIN优化 | 低 | -2分 | 多表JOIN是否合理 |

### 规范项

| 检查项 | 严重程度 | 扣分 | 检查要点 |
|--------|----------|------|----------|
| resultMap使用 | 低 | -2分 | 是否使用resultMap而非自动映射 |
| 命名规范 | 低 | -2分 | 字段命名是否规范 |

## 评分标准

### 评级标准

| 评级 | 分数区间 | 说明 |
|-----|---------|------|
| ⭐⭐⭐⭐⭐ S级 | 110-120分 | 卓越，可作为标杆 |
| ⭐⭐⭐⭐⭐ A级 | 95-109分 | 优秀，可直接上线 |
| ⭐⭐⭐⭐ B级 | 85-94分 | 良好，建议修复后上线 |
| ⭐⭐⭐ C级 | 70-84分 | 一般，需修复主要问题 |
| ⭐⭐ D级 | 60-69分 | 及格，必须整改 |
| ⭐ E级 | 0-59分 | 不合格 |

### 计算公式

```
最终得分 = 100 - 扣分合计 + 加分合计（上限20分）
满分 = 120分
```

## 报告格式

```
=====================================================
代码质量检查报告
=====================================================

扣分明细:
  - 高严重度问题 x 个: -xx分
  - 中严重度问题 x 个: -xx分
  - 低严重度问题 x 个: -xx分
  - 扣分小计: -xx分

加分明细:
  - 高风险防御加分 x 项: +xx分
  - 设计模式加分 x 项: +xx分
  - 加分小计: +xx分

计算过程: 100 - xx(扣分) + xx(加分) = xx
最终得分: xx/120 分
评级: ⭐⭐⭐⭐⭐ A级 (优秀)

问题清单:
1. [高] 空指针风险 - DiningSummaryService.java:50
   selectOne返回值缺少null判断

2. [中] 参数校验 - DiningSummaryController.java:48
   缺少@NotNull校验

加分项:
1. [+2] 并发安全防御 - 使用Redis分布式锁防止竞态条件
2. [+2] 策略模式 - 使用策略模式消除if-else
=====================================================
```

## 检查示例

### Java代码检查示例

```java
// 问题示例：空指针风险
public Canteen getCanteen(Long id) {
    return canteenMapper.selectById(id); // 缺少null判断
}

// 正确示例：有null判断和返回值兜底
public Canteen getCanteen(Long id) {
    Canteen canteen = canteenMapper.selectById(id);
    if (canteen == null) {
        throw new LeException("食堂不存在");
    }
    return canteen;
}

// 加分示例：事务管理
@Transactional(rollbackFor = Exception.class)
public void updateOrder(OrderDTO dto) {
    // 合理的事务边界
}
```

### MyBatis XML检查示例

```xml
<!-- 问题示例：SQL注入风险 -->
<select id="queryList">
    SELECT * FROM table WHERE name = '${name}' <!-- 使用${} -->
</select>

<!-- 正确示例：使用#{} -->
<select id="queryList">
    SELECT id, name, create_time FROM table
    WHERE name = #{name}
</select>

<!-- 加分示例：完整的动态SQL -->
<select id="queryList">
    SELECT id, name FROM table
    <where>
        <if test="name != null and name != ''">
            AND name = #{name}
        </if>
        <if test="status != null">
            AND status = #{status}
        </if>
    </where>
</select>
```
