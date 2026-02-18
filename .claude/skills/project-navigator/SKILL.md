---
name: project-navigator
description: |
  当需要了解项目结构、查找文件、定位代码时自动使用此 Skill。提供项目结构导航和资源索引。

  触发场景：
  - 不知道文件在哪里
  - 想了解项目结构
  - 查找某个功能的代码位置
  - 了解模块职责
  - 查看已有的工具类、组件、API、Store
  - 寻找参考代码

  触发词：项目结构、文件在哪、目录、模块、代码位置、找、定位、结构、在哪里、哪个文件、参考、已有
---

# 项目导航指南

> **说明**：本项目是纯后端项目（RuoYi-Vue-Plus），前端项目独立维护。

## 项目整体结构

```
RuoYi-Vue-Plus/
├── ruoyi-admin/                      # 后端启动入口
│   └── src/main/resources/
│       ├── application.yml           # 主配置
│       └── application-dev.yml       # 开发环境配置（数据库连接）
│
├── ruoyi-common/                     # 通用工具模块（24个子模块）
│   ├── ruoyi-common-bom/            # BOM 依赖管理
│   ├── ruoyi-common-core/           # 核心工具（StringUtils, MapstructUtils）
│   ├── ruoyi-common-mybatis/        # MyBatis 扩展（BaseMapperPlus, TableDataInfo）
│   ├── ruoyi-common-tenant/         # 多租户（TenantEntity）
│   ├── ruoyi-common-redis/          # Redis 缓存
│   ├── ruoyi-common-satoken/        # 权限认证
│   ├── ruoyi-common-excel/          # Excel 导入导出
│   ├── ruoyi-common-oss/            # 对象存储
│   ├── ruoyi-common-doc/            # 接口文档
│   ├── ruoyi-common-encrypt/        # 数据加密
│   ├── ruoyi-common-idempotent/     # 幂等性
│   ├── ruoyi-common-job/            # 定时任务
│   ├── ruoyi-common-json/           # JSON 处理
│   ├── ruoyi-common-log/            # 日志记录
│   ├── ruoyi-common-mail/           # 邮件发送
│   ├── ruoyi-common-ratelimiter/    # 限流
│   ├── ruoyi-common-security/       # 安全
│   ├── ruoyi-common-sensitive/      # 敏感数据
│   ├── ruoyi-common-sms/            # 短信
│   ├── ruoyi-common-social/         # 社交登录
│   ├── ruoyi-common-sse/            # SSE 推送
│   ├── ruoyi-common-translation/    # 翻译
│   ├── ruoyi-common-web/            # Web 通用
│   └── ruoyi-common-websocket/      # WebSocket
│
├── ruoyi-extend/                     # 扩展功能模块
│
├── ruoyi-modules/                    # 业务功能模块
│   ├── ruoyi-system/                # 系统管理模块（用户、角色、菜单等）
│   ├── ruoyi-demo/                  # 演示功能模块
│   ├── ruoyi-job/                   # 定时任务模块
│   ├── ruoyi-generator/             # 代码生成器
│   └── ruoyi-workflow/              # 工作流模块
│
├── script/sql/                      # 数据库脚本
│   ├── ry_vue_5.X.sql              # 系统表（用户、角色、菜单等）
│   ├── ry_job.sql                  # 定时任务表
│   └── ry_workflow.sql             # 工作流表
│
├── docs/                            # 项目文档
├── .claude/                         # Claude AI 配置目录
│   └── skills/                      # 技能库
│
└── pom.xml                          # Maven 项目配置
```

---

## 后端模块位置

### 已有主要模块

| 模块 | 位置 | 说明 |
|------|------|------|
| **系统管理** (System) | `ruoyi-modules/ruoyi-system/` | ⭐ 系统核心功能（用户、菜单、权限等） |
| **演示模块** (Demo) | `ruoyi-modules/ruoyi-demo/` | 功能演示示例 |
| **定时任务** (Job) | `ruoyi-modules/ruoyi-job/` | 任务调度功能 |
| **代码生成** (Generator) | `ruoyi-modules/ruoyi-generator/` | 代码生成器 |
| **工作流** (Workflow) | `ruoyi-modules/ruoyi-workflow/` | 工作流引擎 |

### 🔴 标准模块代码结构（三层架构）

> **重要**：本项目是三层架构（Controller → Service → Mapper），**没有 DAO 层**。

```
ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/
├── controller/                      # 控制器
│   └── system/
│       └── SysXxxController.java   # @RestController
├── service/                         # 服务层
│   ├── ISysXxxService.java         # 服务接口
│   └── impl/
│       └── SysXxxServiceImpl.java  # 服务实现（包含 buildQueryWrapper）
├── mapper/                          # Mapper 接口（extends BaseMapperPlus）
│   └── SysXxxMapper.java
├── domain/                          # 实体类和业务对象
│   ├── SysXxx.java                 # 实体类（extends TenantEntity）
│   ├── bo/                         # 业务对象
│   │   └── SysXxxBo.java          # 业务对象（@AutoMapper）
│   └── vo/                         # 视图对象
│       └── SysXxxVo.java          # 视图对象
├── listener/                        # 事件监听器
└── runner/                          # 启动运行器
```

**关键点**：
- Service 实现类**不继承任何基类**，直接注入 Mapper
- `buildQueryWrapper()` 方法在 **Service 实现类**中
- BO 使用 `@AutoMapper`（单数）注解；多目标映射时可用 `@AutoMappers`（复数）

### 核心工具类位置

| 工具类 | 位置 | 说明 |
|--------|------|------|
| `MapstructUtils` | `ruoyi-common-core` | 对象转换（必须使用） |
| `StringUtils` | `ruoyi-common-core` | 字符串工具 |
| `DateUtils` | `ruoyi-common-core` | 日期工具 |
| `ServiceException` | `ruoyi-common-core` | 业务异常 |
| `TenantEntity` | `ruoyi-common-tenant` | 租户实体基类 |
| `BaseMapperPlus` | `ruoyi-common-mybatis` | Mapper 基类接口 |
| `PageQuery` | `ruoyi-common-mybatis` | 分页查询参数 |
| `TableDataInfo` | `ruoyi-common-mybatis` | 分页结果 |
| `RedisUtils` | `ruoyi-common-redis` | Redis 缓存工具 |
| `LoginHelper` | `ruoyi-common-satoken` | 登录用户信息 |

---

## 配置文件位置

| 配置 | 位置 | 说明 |
|------|------|------|
| 后端主配置 | `ruoyi-admin/src/main/resources/application.yml` | 主配置文件 |
| 后端开发配置 | `ruoyi-admin/src/main/resources/application-dev.yml` | 开发环境配置（数据库连接） |
| 后端生产配置 | `ruoyi-admin/src/main/resources/application-prod.yml` | 生产环境配置 |
| 日志配置 | `ruoyi-admin/src/main/resources/logback-plus.xml` | 日志配置 |

---

## 数据库脚本位置

| 脚本 | 位置 | 说明 |
|------|------|------|
| 系统表初始化 | `script/sql/ry_vue_5.X.sql` | 用户、角色、菜单、系统表等 |
| 任务表初始化 | `script/sql/ry_job.sql` | 定时任务相关表 |
| 工作流表初始化 | `script/sql/ry_workflow.sql` | 工作流相关表 |
| Oracle 脚本 | `script/sql/oracle/` | Oracle 数据库脚本 |
| PostgreSQL 脚本 | `script/sql/postgres/` | PostgreSQL 数据库脚本 |
| SQL Server 脚本 | `script/sql/sqlserver/` | SQL Server 数据库脚本 |

---

## 快速查找

### 我想找...

| 需求 | 位置 |
|------|------|
| 参考后端代码 | `ruoyi-modules/ruoyi-system/` 的系统模块 |
| 看 Entity 怎么写 | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/domain/SysUser.java` |
| 看 Service 怎么写 | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/service/impl/SysUserServiceImpl.java` |
| 看 Controller 怎么写 | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/controller/system/SysUserController.java` |
| 看 Mapper 怎么写 | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/mapper/SysUserMapper.java` |
| 看 BO/VO 怎么写 | `ruoyi-modules/ruoyi-system/src/main/java/org/dromara/system/domain/bo/` |
| 数据库表结构 | `script/sql/ry_vue_5.X.sql` |
| 工具类 | `ruoyi-common/ruoyi-common-core/` |
| MyBatis 扩展 | `ruoyi-common/ruoyi-common-mybatis/` |
| Redis 工具 | `ruoyi-common/ruoyi-common-redis/` |
| 权限认证 | `ruoyi-common/ruoyi-common-satoken/` |

---

## 模块与表前缀对应

| 模块 | 表前缀 | 包路径 |
|------|--------|--------|
| system | `sys_` | `org.dromara.system` |
| demo | `test_` | `org.dromara.demo` |
| workflow | `flow_` | `org.dromara.workflow` |
| 自定义业务 | 自定义 | `org.dromara.xxx` |

---

## 常用查找命令

```bash
# 查找 Java 类
Glob ruoyi-modules/**/*[类名]*.java

# 查找包含特定内容的文件
Grep "[关键词]" ruoyi-modules/ --type java

# 查找配置文件
Glob ruoyi-admin/src/main/resources/application*.yml

# 查找 Service 实现类
Glob ruoyi-modules/**/impl/*ServiceImpl.java

# 查找 Mapper 接口
Glob ruoyi-modules/**/*Mapper.java

# 查找 Entity 类
Glob ruoyi-modules/**/domain/*.java

# 查找工具类
Glob ruoyi-common/**/*Utils.java
```

---

## 三层架构代码示例

### Service 实现类结构（重点参考）

```java
@Service
public class TestDemoServiceImpl implements ITestDemoService {

    private final TestDemoMapper baseMapper;  // 直接注入 Mapper，无 DAO 层

    /**
     * 构建查询条件（在 Service 层）
     */
    private LambdaQueryWrapper<TestDemo> buildQueryWrapper(TestDemoBo bo) {
        Map<String, Object> params = bo.getParams();
        LambdaQueryWrapper<TestDemo> lqw = Wrappers.lambdaQuery();
        lqw.eq(bo.getDeptId() != null, TestDemo::getDeptId, bo.getDeptId());
        lqw.like(StringUtils.isNotBlank(bo.getTestKey()), TestDemo::getTestKey, bo.getTestKey());
        return lqw;
    }

    @Override
    public TableDataInfo<TestDemoVo> queryPageList(TestDemoBo bo, PageQuery pageQuery) {
        LambdaQueryWrapper<TestDemo> lqw = buildQueryWrapper(bo);
        Page<TestDemoVo> result = baseMapper.selectVoPage(pageQuery.build(), lqw);
        return TableDataInfo.build(result);
    }
}
```

### BO 类结构

```java
@Data
@AutoMapper(target = TestDemo.class, reverseConvertGenerate = false)  // ✅ 单数
public class TestDemoBo extends BaseEntity {
    private Long id;
    private String testKey;
    // ...
}
```

### Controller 结构

```java
@RestController
@RequestMapping("/demo/demo")
public class TestDemoController extends BaseController {

    private final ITestDemoService testDemoService;

    @GetMapping("/list")              // 分页查询
    public TableDataInfo<TestDemoVo> list(TestDemoBo bo, PageQuery pageQuery) { }

    @GetMapping("/{id}")              // 获取详情
    public R<TestDemoVo> getInfo(@PathVariable Long id) { }

    @PostMapping                      // 新增
    public R<Void> add(@RequestBody TestDemoBo bo) { }

    @PutMapping                       // 修改
    public R<Void> edit(@RequestBody TestDemoBo bo) { }

    @DeleteMapping("/{ids}")          // 删除
    public R<Void> remove(@PathVariable Long[] ids) { }
}
```
