# 参考文档

> 详细的安装方式、包含内容、Skills 列表、命令选项等参考信息。

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
--help,  -h          显示帮助
```

## 包含内容

### Claude Code（`.claude/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/`（90个） | 业务技能：CRUD、API、数据库、安全、性能、leniu 云食堂专项等 |
| `commands/`（10个） | 快捷命令：`/dev`、`/crud`、`/check`、`/start`、`/progress` 等 |
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

## OpenSpec 规格驱动开发

基于 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 的工作流，在 Cursor Chat 中通过 `/opsx-*` 命令使用：

**标准流程**：`/opsx-new` → `/opsx-ff` → `/opsx-apply` → `/opsx-verify` → `/opsx-archive`

其他命令：`/opsx-continue`、`/opsx-sync`、`/opsx-bulk-archive`、`/opsx-explore`、`/opsx-onboard`

## Skills 列表（90个）

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

### OpenSpec 工作流技能（10个）

`openspec-new-change`、`openspec-ff-change`、`openspec-apply-change`、`openspec-continue-change`、`openspec-archive-change`、`openspec-bulk-archive-change`、`openspec-explore`、`openspec-onboard`、`openspec-sync-specs`、`openspec-verify-change`

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
