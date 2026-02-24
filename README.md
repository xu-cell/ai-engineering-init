# AI Engineering Init

> 一键初始化 AI 工程化配置，支持 Claude Code、Cursor、OpenAI Codex 等主流 AI 开发工具。

## 快速开始

### 方式一：npx（推荐，无需克隆）

```bash
# 交互式选择
npx ai-engineering-init

# 直接指定工具
npx ai-engineering-init --tool claude   # 初始化 Claude Code
npx ai-engineering-init --tool cursor   # 初始化 Cursor
npx ai-engineering-init --tool codex    # 初始化 OpenAI Codex
npx ai-engineering-init --tool all      # 初始化全部
```

### 方式二：Shell 脚本（远程执行）

```bash
# 交互式
bash <(curl -fsSL https://raw.githubusercontent.com/xu-cell/ai-engineering-init/main/init.sh)

# 直接指定工具
bash <(curl -fsSL https://raw.githubusercontent.com/xu-cell/ai-engineering-init/main/init.sh) --tool claude
bash <(curl -fsSL https://raw.githubusercontent.com/xu-cell/ai-engineering-init/main/init.sh) --tool cursor
```

### 方式三：克隆后初始化

```bash
git clone https://github.com/xu-cell/ai-engineering-init
cd ai-engineering-init
./init.sh --tool claude
./init.sh --tool cursor
```

## 支持的工具

| 工具 | 参数 | 初始化内容 |
|------|------|-----------|
| Claude Code | `--tool claude` | `.claude/` 目录 + `CLAUDE.md` |
| Cursor | `--tool cursor` | `.cursor/` 目录（Skills + Agents + MCP） |
| OpenAI Codex | `--tool codex` | `.codex/` 目录 + `AGENTS.md` |
| 全部 | `--tool all` | 以上全部 |

## 选项

```
--tool, -t <工具>   指定工具: claude | cursor | codex | all
--dir,  -d <目录>   目标目录（默认：当前目录）
--force,-f          强制覆盖已有文件
--help, -h          显示帮助
```

## 包含内容

### Claude Code（`.claude/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/`（68个） | 业务技能：CRUD、API、数据库、安全、性能、leniu 云食堂专项等 |
| `commands/`（10个） | 快捷命令：`/dev`、`/crud`、`/check`、`/start`、`/progress` 等 |
| `agents/`（2个） | 子代理：`code-reviewer`（代码审查）、`project-manager`（项目管理） |
| `hooks/` | 自动化钩子：技能强制评估（UserPromptSubmit）、代码规范检查（PreToolUse） |
| `CLAUDE.md` | 项目规范说明（包名、架构、工具类、禁止事项等） |

### Cursor（`.cursor/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/`（68个） | 与 `.claude/skills/` 完全同步，支持 `@技能名` 手动调用或 Agent 自动委托 |
| `agents/`（2个） | Subagents：`code-reviewer`（`readonly: true`）、`project-manager` |
| `mcp.json` | MCP 服务器配置：`sequential-thinking`、`context7`、`github` |

### OpenAI Codex（`.codex/`）

| 目录/文件 | 说明 |
|-----------|------|
| `skills/` | Codex 技能配置 |
| `AGENTS.md` | AI Agent 项目规范说明 |

## Skills 列表（68个）

<details>
<summary>展开查看完整列表</summary>

**通用后端技能（33个）**

| 技能 | 触发场景 |
|------|---------|
| `crud-development` | CRUD 开发、业务模块、Entity/Service/Controller |
| `api-development` | RESTful API 设计、接口规范 |
| `database-ops` | 建表、SQL、字典、菜单配置 |
| `backend-annotations` | `@RateLimiter`、`@RepeatSubmit`、`@DataPermission` |
| `utils-toolkit` | StringUtils、MapstructUtils、StreamUtils 等工具类 |
| `architecture-design` | 系统架构、模块划分、代码重构 |
| `code-patterns` | 编码规范、命名规范、禁止事项 |
| `error-handler` | 异常处理、ServiceException、全局错误码 |
| `security-guard` | Sa-Token 认证授权、数据脱敏、加密 |
| `data-permission` | 行级数据权限、部门隔离 |
| `performance-doctor` | 慢查询优化、缓存策略、N+1 问题 |
| `redis-cache` | Redis 缓存、分布式锁、`@Cacheable` |
| `json-serialization` | JSON 序列化、BigDecimal 精度、日期格式 |
| `scheduled-jobs` | 定时任务、SnailJob、`@Scheduled` |
| `websocket-sse` | WebSocket、SSE 实时推送、消息通知 |
| `workflow-engine` | 工作流、审批流、WarmFlow |
| `file-oss-management` | 文件上传、OSS、MinIO |
| `sms-mail` | 短信、邮件、SMS4j |
| `social-login` | 第三方登录、OAuth2、JustAuth |
| `tenant-management` | 多租户隔离、TenantEntity |
| `test-development` | 单元测试、JUnit5、Mockito |
| `git-workflow` | Git 提交规范、分支策略 |
| `bug-detective` | Bug 排查、异常定位 |
| `brainstorm` | 方案设计、头脑风暴 |
| `tech-decision` | 技术选型、方案对比 |
| `task-tracker` | 任务进度跟踪 |
| `project-navigator` | 项目结构导航、文件定位 |
| `collaborating-with-codex` | 与 Codex 协同开发 |
| `collaborating-with-gemini` | 与 Gemini 协同开发 |
| `banana-image` | AI 图片生成、海报、缩略图 |
| `add-skill` | 创建新技能 |
| `ui-pc` | 前端 PC 端组件库 |
| `store-pc` | 前端 Vuex 状态管理 |

**leniu 云食堂专项技能（25个）**

| 技能 | 说明 |
|------|------|
| `leniu-crud-development` | 云食堂四层架构 CRUD（Controller→Business→Service→Mapper） |
| `leniu-api-development` | 云食堂 API 规范（LeResult、LeRequest、LeException） |
| `leniu-architecture-design` | 双库架构（商户库/系统库）、pigx-framework |
| `leniu-database-ops` | 云食堂建表规范（审计字段、逻辑删除、雪花ID） |
| `leniu-error-handler` | LeException、I18n 国际化异常处理 |
| `leniu-backend-annotations` | `@RequiresAuthentication`、分组校验 |
| `leniu-utils-toolkit` | BeanUtil、CollUtil、StrUtil、RedisUtil |
| `leniu-code-patterns` | net.xnzn 包名规范、禁止事项 |
| `leniu-data-permission` | 云食堂数据权限控制 |
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
| `leniu-redis-cache` | 云食堂 Redis 缓存规范 |
| `leniu-security-guard` | SQL 注入防护、XSS 防护、限流 |
| `leniu-marketing-price-rule-customizer` | 营销计费规则定制 |
| `leniu-marketing-recharge-rule-customizer` | 营销充值规则定制 |

**OpenSpec 工作流技能（10个）**

`openspec-new-change`、`openspec-ff-change`、`openspec-apply-change`、`openspec-continue-change`、`openspec-archive-change`、`openspec-bulk-archive-change`、`openspec-explore`、`openspec-onboard`、`openspec-sync-specs`、`openspec-verify-change`

</details>

## 初始化后使用

### Claude Code

1. 修改 `CLAUDE.md` 中的项目信息（包名、模块名、架构说明等）
2. 输入 `/start` 快速了解项目
3. 输入 `/dev` 开始开发新功能
4. 输入 `/crud` 快速生成 CRUD 代码
5. 输入 `/check` 检查代码规范

### Cursor

1. 在 Chat 中输入 `/` 查看所有可用 Skills
2. 输入 `@技能名` 手动调用指定技能（如 `@leniu-crud-development`）
3. Subagents 会根据任务自动委托：`/code-reviewer`、`/project-manager`
4. 在 Settings → MCP 中确认 MCP 服务器已连接

### OpenAI Codex

1. 修改 `AGENTS.md` 中的项目说明
2. 使用 `.codex/skills/` 下的技能辅助开发

## 更新日志

### v1.1.0（2026-02-24）

- 新增 **Cursor** 工具支持（`.cursor/` 目录）
  - 同步 68 个 Skills 到 `.cursor/skills/`
  - 新增 Subagents 配置（`code-reviewer`、`project-manager`）
  - 新增 MCP 服务器配置（`sequential-thinking`、`context7`、`github`）
- 新增 **25 个 leniu 云食堂专项技能**
  - 覆盖金额处理、并发、MQ、定时任务、报表、餐次、营销规则等场景

### v1.0.0

- 初始版本，支持 Claude Code 和 OpenAI Codex
- 内置通用后端技能、OpenSpec 工作流技能
- 自动化 Hooks（技能强制评估、代码规范检查）

## License

MIT
