# 参考文档

> 详细的安装方式、包含内容、Skills 列表、命令选项等参考信息。

## 常用工作流

安装后最常用的 3 个场景：需求开发、Bug 修复、代码审查。AI 会根据关键词自动激活对应技能。

### 需求分析 → 开发

```
用户说："分析这个需求" / "分析原型图" / 发送 Axure 截图
  ↓ 自动激活 analyze-requirements 技能
AI 判断复杂度
  ├─ 简单需求 → 直接输出开发任务清单
  └─ 复杂需求 → 启动 Agent（image-reader 读原型 + task-fetcher 读云效）
       → 输出结构化需求报告 + 任务清单
  ↓
按任务清单逐个开发：/dev 或 /crud
  ↓
开发完成 → 自动触发 code-reviewer 审查
```

**触发词**：`分析需求`、`需求分析`、`原型分析`、`需求拆解`

### Bug 修复

```
用户说："修复这个 bug" / 粘贴报错日志 / 提供 traceId
  ↓ 自动激活 fix-bug 技能
AI 判断复杂度
  ├─ 简单 Bug → 读代码定位 → 输出排查报告 → 用户确认 → 修复 → git commit
  └─ 复杂 Bug → 两阶段 Agent 排查
       阶段一（并行）：
       ├─ bug-analyzer    → 根因分析（必启动）
       ├─ loki-runner     → 查日志（有 traceId 时）
       └─ mysql-runner    → 查数据（有 DB 信息时）
       阶段二（日志驱动）：
       └─ 日志中发现表名/数据ID → 自动启动 mysql-runner 二次查询
       → 汇总结果 → 输出排查报告 → ⏸️ 用户确认 → 修复 → git commit
```

**触发词**：`修复 bug`、`fix bug`、`排查修复`、`线上修复`

### 代码审查

```
用户说："审查代码" / "review" / /dev 或 /crud 完成后自动触发
  ↓ 自动激活 codex-code-review 技能
阶段一：本地规范检查（Grep 即时完成）
阶段二：代码逻辑审查（Read 逐文件）
阶段三（可选）：调用 Codex CLI 深度审查
  ↓
输出审查报告（问题清单 + 修复建议）
```

**触发词**：`审查代码`、`review`、`代码审查`、`code review`

### 打包部署

```
用户说："打包到 dev63" / "部署到 test1" / "更新 dev 环境"
  ↓ 自动激活 jenkins-deploy 技能
AI 读取 jenkins/last_cd_env.json（上次构建参数）
  ↓ 确认参数（环境、分支、模式）
修改 last_cd_env.json → 执行构建脚本
  ↓
Jenkins 构建 core（10分钟超时）→ 构建 api（5分钟超时）
  ↓
Portainer 更新容器
  ├─ dev1~15：Webhook 触发
  ├─ dev16~43：Force Update
  └─ dev44+：仅构建，需手动更新
```

**4 种模式**：`0` 只构建 | `1` 全构建+更新 | `2` 构建api+更新 | `3` 只更新容器

**定制项目打包**（如武汉协和定制）：

```
用户说："打包定制项目到 dev10，文件夹 leniu-tengyun-wuhanxieheyiyuan"
  ↓
脚本自动将 Jenkins Job 路径替换为：
  leniu-tengyun-wuhanxieheyiyuan/dev-后端-core   （替代 dev-tengyun-core）
  leniu-tengyun-wuhanxieheyiyuan/dev-后端-api    （替代 dev-tengyun-yunshitang-api）
  ↓
其余流程与标准项目一致
```

> 定制项目通过 `api_param_folder` 参数指定文件夹名，脚本交互时输入或在 AI 对话中告知即可。

**首次配置**（一次性）：

```bash
# 1. 更新框架
npx ai-engineering-init@latest global --tool claude --force

# 2. 配置凭证（从团队成员拷贝或从模板创建）
cp /path/to/teammate/jenkins-config.json ~/.claude/jenkins-config.json

# 3. 安装依赖
pip install python-jenkins requests
```

**手动运行**：`python ~/.claude/skills/jenkins-deploy/assets/jk_build.py`

**触发词**：`打包`、`部署`、`Jenkins`、`构建`、`发布到dev`、`发布到test`、`更新环境`

### 其他常用命令

| 命令 | 说明 | 场景 |
|------|------|------|
| `/dev` | 完整功能开发流程 | 从需求到代码 |
| `/crud` | 快速生成增删改查 | 标准 CRUD 模块 |
| `/check` | 代码规范检查 | 提交前验证 |
| `/start` | 项目扫描概览 | 新接手项目 |
| `/progress` | 项目进度梳理 | 跨会话跟踪 |
| `/next` | 下一步建议 | 不知道做什么时 |

---

## 深度指南

| 文档 | 说明 |
|------|------|
| [AI 助手实战使用指南](./AI助手实战使用指南.md) | 日常开发中如何高效使用 AI 助手，涵盖提问技巧、工作流实践、常见场景 |
| [多模型分层 Agent 架构指南](./多模型分层Agent架构指南.md) | Haiku/Sonnet/Opus 三层 Agent 架构详解，含 4 个场景工作流和成本效益分析 |
| [OpenSpec 与 Commands 融合工作流指南](./OpenSpec与Commands融合工作流指南.md) | 规格驱动开发（SDD）完整流程，OpenSpec 负责设计、Commands 负责执行 |
| [云效任务管理与线上日志排查使用指南](./云效任务管理与线上日志排查使用指南.md) | 云效 API 任务管理 + Grafana Loki 日志查询的实战操作手册 |

---

## 其他安装方式

**Shell 脚本（远程执行）**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/xu-cell/ai-engineering-init/main/init.sh)
bash <(curl -fsSL https://raw.githubusercontent.com/xu-cell/ai-engineering-init/main/init.sh) --tool claude
```

**克隆后初始化**

```bash
git clone https://github.com/xu-cell/ai-engineering-init
cd ai-engineering-init
./init.sh --tool claude
```

## 全部选项

```
--tool,  -t <工具>   指定工具: claude | cursor | codex | all
--dir,   -d <目录>   目标目录（默认：当前目录，仅 init/update 有效）
--force, -f          强制覆盖已有文件
--skill, -s <技能>   sync-back 时只对比指定技能
--submit             sync-back 时自动创建 GitHub Issue（需要 gh CLI）
--type   <类型>      config 时指定配置类型: mysql | loki | all
--scope  <范围>      config 时指定范围: local（当前项目） | global（全局 ~/）
--add                config 时追加环境（不覆盖已有配置）
--help,  -h          显示帮助
```

## 包含内容

### Claude Code（`.claude/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/`（68个） | 业务技能：CRUD、API、数据库、安全、性能、leniu 云食堂专项等 |
| `commands/`（20个） | 快捷命令：`/dev`、`/crud`、`/check`、`/start`、`/opsx-*` 等 |
| `agents/`（9个） | 子代理：多模型分层 Agent（code-scanner、loki-runner、mysql-runner 等） |
| `hooks/` | 自动化钩子：技能强制评估、代码规范检查 |
| `CLAUDE.md` | 项目规范说明 |

### Cursor（`.cursor/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/`（90个） | 与 Claude 同步，支持 `@技能名` 调用 |
| `agents/`（9个） | Subagents：多模型分层 Agent（code-scanner、loki-runner、mysql-runner 等） |
| `mcp.json` | MCP 服务器配置 |
| `hooks.json` + `hooks/` | Hooks 配置与脚本 |

### OpenAI Codex（`.codex/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/` | Codex 技能配置 |
| `AGENTS.md` | AI Agent 项目规范说明 |

> **Codex MCP Server**：可通过 `codex mcp-server` 接入 Claude Code。Windows 用户需将 `.claude/settings.json` 中 `mcpServers.codex.command` 改为 `where codex` 查询到的实际路径。

## GSD 集成（大型任务编排）

本框架与 [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) 深度集成，实现**编排层 + 执行层**分工：

- **GSD** — 项目编排：需求拆解、Phase 规划、Wave 并行执行、跨会话恢复
- **ai-engineering-init** — 代码执行：领域 Skills、编码规范、工具链（MySQL/Loki/云效）

### 使用场景路由

| 场景 | 选择 | 原因 |
|------|------|------|
| 单个 CRUD 模块 | `/dev` 或 `/crud` | Skills 直接搞定 |
| Bug 修复 | `fix-bug` 技能 | Agent 排查 + Loki/MySQL 联动 |
| 新项目从零开始 | `/gsd:new-project` | 需求→路线图→分阶段 |
| 大型重构（10+ 文件） | `/gsd:plan-phase` + Skills | GSD 拆任务，Skills 保规范 |
| 跨多天的里程碑 | `/gsd:resume-work` | GSD 跨会话恢复上下文 |

### 安装方式

```bash
# 先安装 GSD（全局）
npx get-shit-done-cc@latest

# 再安装 ai-engineering-init（全局）— agents/skills 会叠加到 GSD 旁边
npx ai-engineering-init global --tool claude

# 初始化环境配置（GSD agent 共享）
npx ai-engineering-init config --type all --scope global
```

GSD executor 执行时会自动读取项目的 `CLAUDE.md` 和 `.claude/skills/`，从而遵循项目编码规范。

## OpenSpec 规格驱动开发

基于 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 的工作流，通过 `/opsx-*` 命令使用（Claude Code 为命令，Cursor/Codex 为技能）：

**标准流程**：`/opsx-new` → `/opsx-ff` → `/opsx-apply` → `/opsx-verify` → `/opsx-archive`

其他命令：`/opsx-continue`、`/opsx-sync`、`/opsx-bulk-archive`、`/opsx-explore`、`/opsx-onboard`

## Skills 列表（80个技能 + 10个 OpenSpec 命令）

### 通用后端技能（36个）

| 技能 | 触发场景 |
|------|---------|
| `crud-development` | CRUD 开发、三层架构、Entity/Service/Controller |
| `api-development` | RESTful API 设计、接口规范 |
| `database-ops` | 建表、SQL、审计字段、逻辑删除 |
| `backend-annotations` | 限流、防重复提交、脱敏、加密注解 |
| `utils-toolkit` | 对象转换、字符串、集合、日期等工具类 |
| `architecture-design` | 系统架构、模块划分、分层设计 |
| `code-patterns` | 编码规范、命名规范、禁止事项 |
| `error-handler` | 异常处理、全局异常处理器、参数校验 |
| `security-guard` | 认证授权、XSS/SQL注入防护、数据加密 |
| `data-permission` | 行级数据权限、数据隔离 |
| `performance-doctor` | 慢查询优化、缓存策略、N+1 问题 |
| `redis-cache` | Redis 缓存、分布式锁、`@Cacheable` |
| `json-serialization` | JSON 序列化、BigDecimal 精度、日期格式 |
| `scheduled-jobs` | 定时任务、`@Scheduled`、Quartz、XXL-Job |
| `websocket-sse` | WebSocket、SSE 实时推送、消息通知 |
| `workflow-engine` | 工作流、审批流、流程引擎 |
| `file-oss-management` | 文件上传、OSS、S3 API |
| `sms-mail` | 短信、邮件、多渠道通知 |
| `social-login` | 第三方登录、OAuth2 授权码流程 |
| `tenant-management` | 多租户隔离架构、SaaS 设计 |
| `test-development` | 单元测试、JUnit5、Mockito |
| `git-workflow` | Git 提交规范、分支策略 |
| `bug-detective` | Bug 排查、异常定位、日志分析 |
| `brainstorm` | 方案设计、头脑风暴 |
| `tech-decision` | 技术选型、方案对比 |
| `task-tracker` | 任务进度跟踪 |
| `project-navigator` | 项目结构导航、文件定位 |
| `collaborating-with-codex` | 与 Codex 协同开发 |
| `collaborating-with-gemini` | 与 Gemini 协同开发 |
| `codex-code-review` | 代码审查工作流 |
| `banana-image` | AI 图片生成、海报、缩略图 |
| `analyze-requirements` | 需求分析全流程编排（原型图/云效任务 → 开发任务清单） |
| `fix-bug` | Bug 修复全流程编排（排查+修复+提交） |
| `add-skill` | 创建新技能 |
| `jenkins-deploy` | Jenkins + Portainer 自动打包部署（dev/test 环境） |
| `ui-pc` | 前端 PC 端组件库 |
| `store-pc` | 前端 Vuex 状态管理 |

### leniu 云食堂专项技能（34个）

| 技能 | 说明 |
|------|------|
| `leniu-crud-development` | 四层架构 CRUD（Controller→Business→Service→Mapper） |
| `leniu-api-development` | API 规范（LeResult、LeRequest、LeException） |
| `leniu-architecture-design` | 双库架构（商户库/系统库）、pigx-framework |
| `leniu-database-ops` | 建表规范（审计字段、逻辑删除、雪花ID） |
| `leniu-error-handler` | LeException、I18n 国际化异常处理 |
| `leniu-backend-annotations` | `@RequiresAuthentication`、分组校验 |
| `leniu-utils-toolkit` | BeanUtil、CollUtil、StrUtil、RedisUtil |
| `leniu-code-patterns` | net.xnzn 包名规范、禁止事项 |
| `leniu-brainstorm` | 云食堂方案头脑风暴 |
| `leniu-data-permission` | 数据权限控制 |
| `leniu-security-guard` | SQL 注入防护、XSS 防护、限流 |
| `leniu-redis-cache` | Redis 缓存规范 |
| `leniu-java-entity` | Entity/VO/DTO/Param 数据类规范 |
| `leniu-java-mybatis` | MyBatis Plus、LambdaQueryWrapper、XML 映射 |
| `leniu-java-amount-handling` | 金额分/元转换（Long 类型存储） |
| `leniu-java-code-style` | 命名规范、注解风格 |
| `leniu-java-concurrent` | CompletableFuture、线程池、分布式锁 |
| `leniu-java-export` | Excel 异步导出 |
| `leniu-java-logging` | `@Slf4j`、日志级别规范 |
| `leniu-java-mq` | MqUtil、`@MqConsumer`、延迟消息 |
| `leniu-java-report-query-param` | 报表查询入参 Param 类规范 |
| `leniu-java-task` | XXL-Job 定时任务 |
| `leniu-java-total-line` | 报表分页合计行 |
| `leniu-mealtime` | 餐次（早/午/下午茶/晚/夜宵）处理 |
| `leniu-marketing-price-rule-customizer` | 营销计费规则定制 |
| `leniu-marketing-recharge-rule-customizer` | 营销充值规则定制 |
| `leniu-customization-location` | 定制项目代码位置规范 |
| `leniu-report-customization` | 定制报表开发指南 |
| `leniu-report-standard-customization` | 标准版定制报表开发指南 |
| `mysql-debug` | MySQL 数据库查询调试 |
| `loki-log-query` | Grafana Loki 线上日志查询 |
| `sync-back-merge` | sync-back Issue 合并流程 |
| `skill-creator` | 技能创建与修改工具 |
| `yunxiao-task-management` | 云效任务管理 |

### OpenSpec 工作流命令（10个）

Claude Code 通过 `/opsx-*` 命令调用，Cursor/Codex 保持为技能。

`/opsx-new`、`/opsx-ff`、`/opsx-apply`、`/opsx-continue`、`/opsx-archive`、`/opsx-bulk-archive`、`/opsx-explore`、`/opsx-onboard`、`/opsx-sync`、`/opsx-verify`

### 其他通用技能（10个）

`skill-share`、`frontend-design`、`web-artifacts-builder`、`artifacts-builder`、`canvas-design`、`brand-guidelines`、`theme-factory`、`doc-coauthoring`、`internal-comms`、`webapp-testing`

## 命令详情

### update

```bash
npx ai-engineering-init@latest update                # 自动检测已安装工具
npx ai-engineering-init@latest update --tool claude   # 只更新指定工具
npx ai-engineering-init@latest update --force         # 强制更新，包括保留文件
```

> **注意**：必须加 `@latest`，否则 npx 会使用缓存的旧版本。

### global

```bash
npx ai-engineering-init@latest global                # 全局安装所有工具
npx ai-engineering-init@latest global --tool claude  # 只全局安装指定工具
npx ai-engineering-init@latest global --force        # 强制覆盖
```

> 全局安装到 `~/.claude` / `~/.cursor` / `~/.codex`。`settings.json`、`mcp.json` 采用合并策略，不覆盖用户已有配置。项目级配置优先级高于全局。

### sync-back

```bash
npx ai-engineering-init sync-back                              # 扫描所有已安装工具
npx ai-engineering-init sync-back --tool claude                # 只扫描 Claude
npx ai-engineering-init sync-back --skill bug-detective        # 只对比指定技能
npx ai-engineering-init sync-back --skill bug-detective --submit  # 自动创建 GitHub Issue
```

> **闭环**：安装 → 使用 → 发现问题 → `sync-back` → 维护者合并 → 重新发布。

### config

初始化数据库连接和 Loki 日志查询的环境配置。支持全局配置（所有项目共享）和本地配置。

```bash
npx ai-engineering-init config                              # 交互式选择配置类型和范围
npx ai-engineering-init config --type mysql                 # 只配置 MySQL 数据库连接
npx ai-engineering-init config --type loki                  # 只配置 Loki 日志查询 Token
npx ai-engineering-init config --type all                   # 依次配置 MySQL + Loki
npx ai-engineering-init config --type mysql --scope global  # 全局配置，写入 ~/.claude/
npx ai-engineering-init config --type mysql --scope local   # 本地配置，写入当前项目 .claude/
npx ai-engineering-init config --type mysql --add           # 追加环境到已有配置
```

**配置类型**：

| 类型 | 配置文件 | 用于 |
|------|---------|------|
| `mysql` | `mysql-config.json` | `mysql-debug` 技能的数据库连接信息 |
| `loki` | `loki-config.json` | `loki-log-query` 技能的 Grafana Token |

**配置范围**：

| 范围 | 写入位置 | 说明 |
|------|---------|------|
| `global` | `~/.claude/` | 所有项目共享，只需配置一次 |
| `local` | 当前项目 `.claude/` | 项目特定配置，优先级高于全局 |

> **推荐**：先用 `--scope global` 配置全公司统一的数据库连接和 Loki Token，项目有特殊需求时再用 `--scope local` 覆盖。

**环境范围匹配（range）**：

配置环境时可输入覆盖范围（如 `1~15`），表示该配置覆盖 dev1 到 dev15 共 15 个编号环境。使用时说"去 dev10 查"会自动匹配。

```json
{
  "environments": {
    "dev": { "host": "dev-db.com", "port": 3306, "user": "root", "password": "xxx", "range": "1~15" }
  },
  "default": "dev"
}
```

**技能查找顺序**：本地项目 `.claude/` → 全局 `~/.claude/`（本地优先）

### mcp

MCP 服务器的安装、卸载和状态管理。

```bash
npx ai-engineering-init mcp                                 # 交互式管理 MCP 服务器
```

> 支持 sequential-thinking、context7、github 等常用 MCP Server 的一键安装。
