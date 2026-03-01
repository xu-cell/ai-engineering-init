# AGENTS.md - RuoYi-Vue-Plus 项目开发规范

## 对话语言设置

**重要**: 在此代码库中工作时，必须始终使用**中文**与用户对话。

> **项目说明**: 本项目是 **RuoYi-Vue-Plus** 后端框架。
>
> **前端代码检测**：
> - 如果存在 `plus-ui/` 目录 → 包含 PC 端前端代码（Vue 3 + Element Plus）
> - 如果不存在 `plus-ui/` 目录 → 纯后端项目，前端需单独获取
>
> 💡 **提示**：首次使用时请检查 `plus-ui/` 目录是否存在，若不存在可从官方仓库克隆。

---

## 术语约定

| 术语 | 含义 | 对应目录 |
|------|------|---------|
| **后端** | Java 服务 | `ruoyi-modules/` |
| **前端** | PC 管理端 | `plus-ui/`（如存在） |
| **系统模块** | 系统管理功能 | `ruoyi-modules/ruoyi-system/` |
| **业务模块** | 自定义业务 | `ruoyi-modules/ruoyi-xxx/` |
| **通用模块** | 公共工具 | `ruoyi-common/` |

---

## MCP 工具触发

| 触发词 | 工具 | 用途 |
|-------|------|------|
| 深度分析、仔细思考、全面评估 | `sequential-thinking` | 链式推理，多步骤分析 |
| 最佳实践、官方文档、标准写法 | `context7` | MyBatis-Plus/Sa-Token/Spring Boot 等 |
| 打开浏览器、截图、检查元素 | `chrome-devtools` | 浏览器调试 |

---

## 🔴 Skills 技能系统（最高优先级）

> **技能系统确保 AI 在编码前加载领域专业知识，保证代码风格一致**

### 技能系统工作原理

技能文件存储在 `.claude/skills/[skill-name]/SKILL.md` 中。

**启动时**：自动加载所有技能的 `name` 和 `description`
**任务匹配时**：读取匹配技能的完整 SKILL.md 内容
**需要时**：可进一步读取技能目录下的 `references/`、`scripts/` 等文件

---

## 技能清单与触发条件

以下是本项目的技能列表，根据 `description` 自动判断何时使用：

### 后端开发技能

| 技能名称 | 触发条件 |
|---------|---------|
| `crud-development` | CRUD 开发、业务模块、Entity/Service/Mapper 创建 |
| `database-ops` | 数据库操作、SQL、建表、字典、菜单配置 |
| `utils-toolkit` | 工具类、StringUtils、MapstructUtils |
| `error-handler` | 异常处理、ServiceException、错误处理 |
| `security-guard` | 安全、Sa-Token、认证授权、加密 |
| `data-permission` | 数据权限、@DataPermission、行级权限 |
| `tenant-management` | 多租户、租户隔离、TenantEntity |
| `workflow-engine` | 工作流、审批流、WarmFlow |
| `scheduled-jobs` | 定时任务、SnailJob、@Scheduled |
| `redis-cache` | Redis、缓存、@Cacheable、分布式锁 |
| `json-serialization` | JSON 序列化、反序列化、JsonUtils |
| `file-oss-management` | 文件上传、OSS、云存储、MinIO |
| `sms-mail` | 短信、邮件、SMS、验证码 |
| `social-login` | 第三方登录、OAuth、JustAuth |
| `websocket-sse` | WebSocket、SSE、实时推送 |

### leniu-tengyun-core / leniu-yunshitang 项目专用技能

| 技能名称 | 触发条件 |
|---------|---------|
| `leniu-crud-development` | CRUD、增删改查、新建模块、Business层、Service、Mapper、Controller、分页查询、LeRequest、PageDTO |
| `leniu-api-development` | API接口、Controller、RESTful、LeResult、LeResponse、LeRequest、接口开发、路由前缀 |
| `leniu-brainstorm` | 头脑风暴、方案设计、怎么设计、创意探索、功能规划、可行性分析 |
| `leniu-architecture-design` | 架构设计、双库架构、商户库、系统库、pigx框架、四层架构、模块划分、Business层 |
| `leniu-database-ops` | 数据库、SQL、建表、双库、商户库、系统库、审计字段、crby、crtime、del_flag |
| `leniu-utils-toolkit` | 工具类、BeanUtil、StrUtil、CollUtil、ObjectUtil、RedisUtil、JacksonUtil、LeBeanUtil |
| `leniu-error-handler` | 异常处理、LeException、全局异常、参数校验、错误码、I18n、国际化 |
| `leniu-backend-annotations` | @RequiresAuthentication、@RequiresGuest、@Validated、@NotNull、@Api、分组校验、InsertGroup |
| `leniu-security-guard` | 安全认证、SQL注入防护、XSS防护、数据脱敏、SM4加密、接口安全、限流 |
| `leniu-data-permission` | 多租户、数据权限、@UseSystem、Executors.doInTenant、TenantContextHolder、MERCHANT-ID、双库隔离 |
| `leniu-redis-cache` | Redis、缓存、RedisUtil、分布式锁、RLock、getLock、setNx、ZSet、限流、缓存击穿 |
| `leniu-code-patterns` | 代码禁令、代码规范、命名规范、代码风格、Git提交规范、包结构、禁止写法、审计字段规范 |
| `leniu-java-entity` | Entity实体类、VO视图对象、DTO数据传输、Param参数类、@TableName、@TableField、字段映射 |
| `leniu-java-logging` | 日志、@Slf4j、log.info、log.error、log.debug、日志级别、logback |
| `leniu-java-mybatis` | MyBatis、MyBatisPlus、Mapper、LambdaQueryWrapper、XML映射、动态SQL、BaseMapper |
| `leniu-java-amount-handling` | 金额处理、分转元、元转分、Long金额、money、fen、BigDecimal金额 |
| `leniu-java-concurrent` | 并发、CompletableFuture、线程池、ThreadPool、并发安全、异步处理 |
| `leniu-java-export` | 导出、Excel导出、异步导出、分页导出、@ExcelProperty、exportApi |
| `leniu-java-mq` | 消息队列、MQ、MqUtil、@MqConsumer、延迟消息、消息重试、事务消息 |
| `leniu-java-task` | 定时任务、XXL-Job、@XxlJob、TenantLoader、任务调度、分布式定时 |
| `leniu-java-report-query-param` | 报表查询入参、Param类、分页参数、时间范围查询、ReportBaseParam、exportCols |
| `leniu-java-total-line` | 合计行、totalLine、报表合计、SUM合计、ReportBaseTotalVO、合计查询 |
| `leniu-mealtime` | 餐次、mealtime、mealtimeType、早餐、午餐、晚餐、下午茶、夜宵、AllocMealtimeTypeEnum |
| `leniu-marketing-price-rule-customizer` | 营销计费、计价规则、RulePriceHandler、RulePriceEnum、折扣规则、满减规则、限额规则 |
| `leniu-marketing-recharge-rule-customizer` | 营销充值、充值规则、RuleRechargeHandler、RuleRechargeEnum、满赠规则、充值赠送 |
| `leniu-report-customization` | 定制报表、汇总报表、report_order_info、report_order_detail、report_account_flow、退款汇总、消费金额统计 |

### 前端开发技能（需 plus-ui 目录存在）

| 技能名称 | 触发条件 |
|---------|---------|
| `ui-pc` | PC 端页面、Element Plus、表格、表单、弹窗 |
| `store-pc` | Pinia 状态管理、Store、useUserStore |

> 💡 **提示**：如果 `plus-ui/` 目录不存在，前端技能将不可用。

### 通用技能

| 技能名称 | 触发条件 |
|---------|---------|
| `architecture-design` | 架构设计、模块划分、重构 |
| `code-patterns` | 代码规范、命名、禁止事项、Git 提交 |
| `project-navigator` | 项目结构、文件定位 |
| `git-workflow` | Git、提交、commit、分支 |
| `tech-decision` | 技术选型、方案对比 |
| `brainstorm` | 头脑风暴、创意、方案设计 |
| `task-tracker` | 任务跟踪、进度管理 |
| `test-development` | 测试、单元测试、JUnit5、Mockito |
| `bug-detective` | Bug 排查、报错、异常 |
| `performance-doctor` | 性能优化、慢查询、缓存 |
| `add-skill` | 添加技能、创建技能文档 |

### OpenSpec 规格驱动开发技能（SDD）

> 基于 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 的规格驱动开发工作流，需安装 `openspec` CLI。
> 完整工作流：`/opsx:new` → `/opsx:ff` → `/opsx:apply` → `/opsx:archive`

| 技能名称 | 触发条件 |
|---------|---------|
| `openspec-onboard` | 新手引导、学习 OpenSpec 工作流、/opsx:onboard |
| `openspec-explore` | 探索模式、思维伙伴、探索问题设计、/opsx:explore |
| `openspec-new-change` | 新建变更、开始新功能、/opsx:new |
| `openspec-ff-change` | 快速推进所有制品、/opsx:ff、fast-forward |
| `openspec-continue-change` | 继续变更、创建下一个制品、/opsx:continue |
| `openspec-apply-change` | 实现任务、开始编码、/opsx:apply |
| `openspec-verify-change` | 验证实现、检查规格匹配、/opsx:verify |
| `openspec-sync-specs` | 同步规格到主 spec、/opsx:sync |
| `openspec-archive-change` | 归档变更、完成收尾、/opsx:archive |
| `openspec-bulk-archive-change` | 批量归档多个变更、/opsx:bulk-archive |

---

## 🚨 强制执行规则

### 规则 1：任务匹配时必须读取技能

当用户请求与上述任何技能的触发条件匹配时，**必须**：

1. 读取对应的 `SKILL.md` 文件
2. 按照技能中的指令执行
3. 如果技能目录有 `references/`，按需读取相关文件

### 规则 2：多技能组合

复杂任务可能匹配多个技能，应：

1. 识别所有相关技能
2. 按依赖顺序读取（如：先 `database-ops` 再 `crud-development`）
3. 综合所有技能的规范执行

### 规则 3：响应中标注已使用技能

在涉及代码的响应中，简要说明使用了哪些技能：

```
已参考技能：crud-development, database-ops

[实现代码...]
```

---

## 🚫 核心禁止事项

### 后端禁止项（必须遵守）

```java
// ❌ 禁止1: 错误包名
package com.ruoyi.xxx;      // 禁止！
package plus.ruoyi.xxx;    // 禁止！
// ✅ 正确: org.dromara.xxx

// ❌ 禁止2: 使用 BeanUtils
BeanUtil.copyProperties(bo, entity);  // 禁止！
// ✅ 正确: MapstructUtils.convert(bo, Xxx.class)

// ❌ 禁止3: 使用 Map 传递业务数据
public Map<String, Object> getXxx()  // 禁止！
// ✅ 正确: public XxxVo getXxx()

// ❌ 禁止4: Service 继承基类
public class XxxServiceImpl extends ServiceImpl<...>  // 禁止！
// ✅ 正确: public class XxxServiceImpl implements IXxxService

// ❌ 禁止5: 单目标映射使用 @AutoMappers（复数）
@AutoMappers({@AutoMapper(...)})  // 单目标时禁止！
// ✅ 正确: @AutoMapper(target = Xxx.class)
// 💡 例外: 多目标映射（如 SysOperLogBo）可使用 @AutoMappers

// ❌ 禁止6: 使用完整类型引用
public org.dromara.common.core.domain.R<XxxVo> getXxx()  // 禁止！
// ✅ 正确: 先 import，再使用短类名
import org.dromara.common.core.domain.R;
public R<XxxVo> getXxx()

// ❌ 禁止7: 使用自增 ID
id BIGINT(20) AUTO_INCREMENT  // 禁止！
// ✅ 正确: 使用雪花 ID（全局配置）

// ❌ 禁止8: 创建 DAO 层
private final IXxxDao xxxDao;  // 禁止！本项目无 DAO 层
// ✅ 正确: private final XxxMapper baseMapper;
```

---

## 🏗️ 核心架构（必须牢记）

### 三层架构（无 DAO 层）

```
Controller（接收请求、参数校验）
    ↓
Service（业务逻辑、buildQueryWrapper 查询构建、直接注入 Mapper）
    ↓
Mapper（extends BaseMapperPlus<Entity, Vo>）
```

**关键点**：
- ✅ Service 层直接注入 Mapper（无 DAO 层）
- ✅ `buildQueryWrapper()` 方法在 **Service 实现类**中
- ✅ Service 实现类**不继承任何基类**
- ✅ Mapper 继承 `BaseMapperPlus<Entity, Vo>`

### 模块与表前缀对应

| 模块 | 表前缀 | 包路径 |
|------|--------|--------|
| system | `sys_` | `org.dromara.system` |
| demo | `test_` | `org.dromara.demo` |
| workflow | `flow_` | `org.dromara.workflow` |
| 自定义 | 自定义 | `org.dromara.xxx` |

### 核心类继承关系

| 类型 | 基类/注解 |
|------|---------|
| Entity | `extends TenantEntity` |
| BO | `@AutoMapper(target = Xxx.class)`（单数） |
| VO | `@AutoMapper(target = Xxx.class)` |
| Mapper | `extends BaseMapperPlus<Xxx, XxxVo>` |
| Service 接口 | `interface IXxxService` |
| Service 实现 | `implements IXxxService`（不继承基类） |
| Controller | `extends BaseController` |

---

## 📡 API 路径规范

| 操作 | HTTP方法 | 路径格式 | 示例 |
|------|---------|---------|------|
| 分页查询 | GET | `/list` | `@GetMapping("/list")` |
| 获取详情 | GET | `/{id}` | `@GetMapping("/{id}")` |
| 新增 | POST | `/`（空） | `@PostMapping` |
| 修改 | PUT | `/`（空） | `@PutMapping` |
| 删除 | DELETE | `/{ids}` | `@DeleteMapping("/{ids}")` |
| 导出 | POST | `/export` | `@PostMapping("/export")` |

---

## 📋 标准代码模板

### 1. Service 实现类（核心模板）

```java
package org.dromara.demo.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.dromara.common.core.utils.MapstructUtils;
import org.dromara.common.core.utils.StringUtils;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.bo.XxxBo;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.demo.mapper.XxxMapper;
import org.dromara.demo.service.IXxxService;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class XxxServiceImpl implements IXxxService {  // ✅ 不继承任何基类

    private final XxxMapper baseMapper;  // ✅ 直接注入 Mapper（无 DAO 层）

    @Override
    public XxxVo queryById(Long id) {
        return baseMapper.selectVoById(id);
    }

    @Override
    public TableDataInfo<XxxVo> queryPageList(XxxBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<Xxx> lqw = buildQueryWrapper(bo);  // ✅ Service 层构建查询
        Page<XxxVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }

    @Override
    public Boolean insertByBo(XxxBo bo) {
        Xxx add = MapstructUtils.convert(bo, Xxx.class);  // ✅ MapstructUtils 转换
        return baseMapper.insert(add) > 0;
    }

    @Override
    public Boolean updateByBo(XxxBo bo) {
        Xxx update = MapstructUtils.convert(bo, Xxx.class);
        return baseMapper.updateById(update) > 0;
    }

    @Override
    public Boolean deleteByIds(Collection<Long> ids) {
        return baseMapper.deleteByIds(ids) > 0;
    }

    /**
     * 构建查询条件
     * ⭐ 在 Service 层构建（不是 DAO 层）
     */
    private LambdaQueryWrapper<Xxx> buildQueryWrapper(XxxBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<Xxx> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getId() != null, Xxx::getId, bo.getId());
        lqw.eq(StringUtils.isNotBlank(bo.getStatus()), Xxx::getStatus, bo.getStatus());
        lqw.like(StringUtils.isNotBlank(bo.getXxxName()), Xxx::getXxxName, bo.getXxxName());
        lqw.orderByDesc(Xxx::getCreateTime);
        return lqw;
    }
}
```

### 2. Entity 实体类

```java
package org.dromara.demo.domain;

import org.dromara.common.tenant.core.TenantEntity;
import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.io.Serial;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("test_xxx")
public class Xxx extends TenantEntity {  // ✅ 继承 TenantEntity

    @Serial
    private static final long serialVersionUID = 1L;

    @TableId(value = "id")
    private Long id;

    private String xxxName;

    private String status;
}
```

### 3. BO 业务对象

```java
package org.dromara.demo.domain.bo;

import io.github.linpeilie.annotations.AutoMapper;
import org.dromara.demo.domain.Xxx;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.mybatis.core.domain.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.*;

@Data
@EqualsAndHashCode(callSuper = true)
@AutoMapper(target = Xxx.class, reverseConvertGenerate = false)  // ✅ 单数！
public class XxxBo extends BaseEntity {

    @NotNull(message = "ID不能为空", groups = {EditGroup.class})
    private Long id;

    @NotBlank(message = "名称不能为空", groups = {AddGroup.class, EditGroup.class})
    private String xxxName;

    private String status;
}
```

### 4. VO 视图对象

```java
package org.dromara.demo.domain.vo;

import cn.idev.excel.annotation.ExcelIgnoreUnannotated;
import cn.idev.excel.annotation.ExcelProperty;
import io.github.linpeilie.annotations.AutoMapper;
import lombok.Data;
import org.dromara.demo.domain.Xxx;
import java.io.Serial;
import java.io.Serializable;
import java.util.Date;

@Data
@ExcelIgnoreUnannotated
@AutoMapper(target = Xxx.class)
public class XxxVo implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @ExcelProperty(value = "ID")
    private Long id;

    @ExcelProperty(value = "名称")
    private String xxxName;

    @ExcelProperty(value = "状态")
    private String status;

    @ExcelProperty(value = "创建时间")
    private Date createTime;
}
```

### 5. Mapper 接口

```java
package org.dromara.demo.mapper;

import org.dromara.common.mybatis.core.mapper.BaseMapperPlus;
import org.dromara.demo.domain.Xxx;
import org.dromara.demo.domain.vo.XxxVo;

public interface XxxMapper extends BaseMapperPlus<Xxx, XxxVo> {
    // ✅ 继承 BaseMapperPlus，已提供 selectVoById、selectVoPage 等方法
}
```

### 6. Controller 控制器

```java
package org.dromara.demo.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.dromara.common.core.domain.R;
import org.dromara.common.core.validate.AddGroup;
import org.dromara.common.core.validate.EditGroup;
import org.dromara.common.excel.utils.ExcelUtil;
import org.dromara.common.log.annotation.Log;
import org.dromara.common.log.enums.BusinessType;
import org.dromara.common.mybatis.core.page.PageQuery;
import org.dromara.common.mybatis.core.page.TableDataInfo;
import org.dromara.common.web.core.BaseController;
import org.dromara.demo.domain.bo.XxxBo;
import org.dromara.demo.domain.vo.XxxVo;
import org.dromara.demo.service.IXxxService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Validated
@RequiredArgsConstructor
@RestController
@RequestMapping("/demo/xxx")
public class XxxController extends BaseController {  // ✅ 继承 BaseController

    private final IXxxService xxxService;

    @SaCheckPermission("demo:xxx:list")
    @GetMapping("/list")  // ✅ 标准路径
    public TableDataInfo<XxxVo> list(XxxBo bo, PageQuery pageQuery) {
        return xxxService.queryPageList(bo, pageQuery);
    }

    @SaCheckPermission("demo:xxx:query")
    @GetMapping("/{id}")  // ✅ 标准路径
    public R<XxxVo> getInfo(@NotNull(message = "ID不能为空") @PathVariable Long id) {
        return R.ok(xxxService.queryById(id));
    }

    @SaCheckPermission("demo:xxx:add")
    @Log(title = "XXX管理", businessType = BusinessType.INSERT)
    @PostMapping  // ✅ 空路径
    public R<Void> add(@Validated(AddGroup.class) @RequestBody XxxBo bo) {
        return toAjax(xxxService.insertByBo(bo));
    }

    @SaCheckPermission("demo:xxx:edit")
    @Log(title = "XXX管理", businessType = BusinessType.UPDATE)
    @PutMapping  // ✅ 空路径
    public R<Void> edit(@Validated(EditGroup.class) @RequestBody XxxBo bo) {
        return toAjax(xxxService.updateByBo(bo));
    }

    @SaCheckPermission("demo:xxx:remove")
    @Log(title = "XXX管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{ids}")  // ✅ 标准路径
    public R<Void> remove(@NotEmpty(message = "ID不能为空") @PathVariable Long[] ids) {
        return toAjax(xxxService.deleteByIds(List.of(ids)));
    }

    @SaCheckPermission("demo:xxx:export")
    @Log(title = "XXX管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(XxxBo bo, HttpServletResponse response) {
        List<XxxVo> list = xxxService.queryList(bo);
        ExcelUtil.exportExcel(list, "XXX数据", XxxVo.class, response);
    }
}
```

---

## 🤖 AI 写代码前强制检查清单

**在输出代码给用户之前，必须确认：**

### 架构设计检查

- [ ] **包名是否是 `org.dromara.*`**？（不是 `com.ruoyi.*` 或 `plus.ruoyi.*`）
- [ ] **Service 是否不继承任何基类**？（只 implements 接口）
- [ ] **Service 是否直接注入 Mapper**？（无 DAO 层）
- [ ] **buildQueryWrapper() 是否在 Service 层**？
- [ ] **Entity 是否继承 `TenantEntity`**？
- [ ] **BO 是否使用 `@AutoMapper`（单数）**？
- [ ] **Mapper 是否继承 `BaseMapperPlus<Entity, VO>`**？
- [ ] **Controller 是否继承 `BaseController`**？

### 代码质量检查

- [ ] **是否使用了完整包名引用**？（必须先 import）
- [ ] **是否使用了 `Map<String, Object>` 传递业务数据**？（必须用 VO）
- [ ] **是否使用了 `MapstructUtils.convert()` 转换对象**？（禁止 BeanUtils）
- [ ] **API 路径是否使用标准 RESTful 格式**？（/list、/{id}）
- [ ] **主键是否使用雪花 ID**？（无 AUTO_INCREMENT）

### 🔴 如果任何一项检查失败，必须修正后再输出！

---

## 📁 项目结构

```
RuoYi-Vue-Plus/
├── plus-ui/                          # 🖥️ PC 端前端（如存在）
│   ├── src/
│   │   ├── api/                     # API 接口定义
│   │   ├── components/              # 公共组件
│   │   ├── views/                   # 页面视图
│   │   └── store/                   # Pinia 状态管理
│   └── package.json
│
├── ruoyi-admin/                      # 后端启动入口
│   └── src/main/resources/
│       ├── application.yml           # 主配置
│       └── application-dev.yml       # 开发环境配置
│
├── ruoyi-common/                     # 通用工具模块（24个子模块）
│   ├── ruoyi-common-core/           # 核心工具（MapstructUtils, StringUtils）
│   ├── ruoyi-common-mybatis/        # MyBatis-Plus 扩展（BaseMapperPlus）
│   ├── ruoyi-common-tenant/         # 多租户（TenantEntity）
│   └── ...                          # 其他模块
│
├── ruoyi-modules/                    # 业务功能模块
│   ├── ruoyi-system/                # 系统管理模块（sys_*）
│   ├── ruoyi-demo/                  # 演示模块（test_*）⭐ 参考实现
│   ├── ruoyi-generator/             # 代码生成器
│   ├── ruoyi-job/                   # 定时任务（SnailJob）
│   └── ruoyi-workflow/              # 工作流（WarmFlow）
│
├── script/sql/                      # 数据库脚本
│   └── ry_vue_5.X.sql              # 系统表初始化
│
├── .claude/                         # Claude AI 配置
│   ├── skills/                      # 技能库
│   └── docs/                        # 开发文档
│
└── pom.xml                          # Maven 项目配置
```

> 💡 **注意**：如果 `plus-ui/` 目录不存在，说明当前是纯后端项目，前端代码需从官方仓库单独获取。

---

## 📚 参考实现

开发新功能时，请参考 `ruoyi-demo` 模块的 TestDemo 实现：

| 类型 | 参考文件 |
|------|---------|
| Entity | `org.dromara.demo.domain.TestDemo` |
| BO | `org.dromara.demo.domain.bo.TestDemoBo` |
| VO | `org.dromara.demo.domain.vo.TestDemoVo` |
| Service | `org.dromara.demo.service.impl.TestDemoServiceImpl` |
| Mapper | `org.dromara.demo.mapper.TestDemoMapper` |
| Controller | `org.dromara.demo.controller.TestDemoController` |

---

## 📖 深度参考（按需查阅）

开发遇到问题时查阅对应指南：

| 文档 | 位置 | 用途 |
|------|------|------|
| 后端开发指南 | `.claude/docs/后端开发指南.md` | 架构理解、业务开发 |
| 前端开发指南 | `.claude/docs/前端开发指南.md` | 后端与前端协作规范 |
| 工作流开发指南 | `.claude/docs/工作流开发指南.md` | WarmFlow 集成 |
| 工具类使用指南 | `.claude/docs/工具类使用指南.md` | 工具类完整用法 |
| 数据库设计规范 | `.claude/docs/数据库设计规范.md` | 表设计、索引优化 |

---

## 快速命令

| 命令 | 用途 |
|------|------|
| `/dev` | 开发新功能（完整流程） |
| `/crud` | 快速生成 CRUD |
| `/check` | 代码规范检查 |
| `/start` | 项目快速了解 |
| `/progress` | 查看项目进度 |

---

## 🎯 核心原则

**三层架构**：Controller → Service → Mapper（**无 DAO 层**）

**包名规范**：`org.dromara.*`

**对象转换**：`MapstructUtils.convert()`

**BO 注解**：`@AutoMapper`（单数）

**主键策略**：雪花 ID

**RESTful 路径**：`/list`、`/{id}`、`/`、`/{ids}`

---

> **最后提醒**: 写代码前先阅读本项目的参考实现（TestDemo），严格遵循三层架构规范！
