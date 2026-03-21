# 更新日志

> 所有版本变更记录，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [v2.0.2] - 2026-03-21

### 改进
- **MCP 新增 Chrome DevTools**：浏览器截图、导航、点击、执行JS（可选安装）
- MCP 列表扩充至 13 个

---

## [v2.0.1] - 2026-03-21

### 修复
- **安装位置显示**：Cursor/Codex 安装确认页面现在显示正确路径（`~/.cursor/` / `~/.codex/`），不再都显示 `~/.claude/`
- **update 角色恢复**：更新时自动读取安装元数据中的角色，按之前选择的角色过滤更新，避免覆盖为全量技能

### 改进
- **MCP 推荐列表扩充**：新增蓝湖(lanhu)、Apifox、云效(yunxiao) 为推荐 MCP；新增 firecrawl、exa 为可选 MCP，共 12 个
- **update 命令增强**：支持 `--role` 参数覆盖更新角色

---

## [v2.0.0] - 2026-03-21

### Breaking Changes
- **包名变更**：`ai-engineering-init` → `leniu-dev`
- **命令简化**：`init/global` → `install`，`sync-back` → `syncback`
- **仅用户级安装**：不再支持项目级安装（`init` 命令），统一安装到 `~/.claude/` 等用户目录
- 旧命令自动映射，向后兼容

### 新增
- **交互式安装向导**：5 步引导（角色→工具→配置→MCP→确认），支持非交互 `--role` / `--tool` 参数
- **角色化安装**：后端研发(89技能) / 前端研发(41技能) / 产品经理(37技能) / 全部，按需过滤安装
- **`doctor` 命令**：诊断安装状态（技能数、配置文件、MCP 连通性）
- **`uninstall` 命令**：基于安装记录的清洁卸载
- **安装元数据**：`~/.claude/.leniu-install-meta.json` 记录版本、角色、时间
- **🐂 牛马吃草动画**：安装进度 ASCII 动画展示
- **版本更新检测**：24h 缓存自动检查 npm 最新版本，有更新时温和提示
- **配置集成**：MySQL/Loki 配置和 MCP 推荐安装合并到安装向导
- **`--role` 参数**：`--role backend|frontend|product|all` 非交互指定角色

### 改进
- **Banner 更新**：🐂 leniu-dev v2.0.0
- **help 输出全面重写**：简洁清晰的命令+选项+示例
- **update 智能检测**：自动识别用户级安装，使用正确的更新逻辑

---

## [v1.17.2] - 2026-03-18

### 改进
- **jenkins-deploy 架构重构**：脚本留在技能 `assets/` 不再复制到项目，凭证改为全局 `~/.claude/jenkins-config.json`（本地 > 全局优先级）
- **构建状态自动创建**：`jenkins/last_cd_env.json` 脚本运行时自动生成，无需模板初始化
- **安装提示优化**：`showJenkinsHint()` 改为检测 `jenkins-config.json` 是否存在
- **文档补充**：`docs/reference.md` 新增打包部署工作流说明（含定制项目流程）

---

## [v1.17.1] - 2026-03-18

### 新增
- **`jenkins-deploy` 技能**：Jenkins + Portainer 自动打包部署，支持 dev/test 环境构建、4 种构建模式、定制项目部署
- **部署初始化模板**：`assets/` 目录包含 `jk_build.py`、`env_param.template.json`、`last_cd_env.template.json`，团队成员可一键初始化
- **安装/更新后提示**：`npx ai-engineering-init` 和 `update` 完成后自动检测 `jenkins/` 目录，提示初始化部署环境

---

## [v1.17.0] - 2026-03-16

### 新增
- **`/init-config` 命令**：在 Claude Code 中从 Markdown 文件一键初始化 MySQL + Loki 配置，支持 `--scope global/local`
- **`--from` 参数**：`npx ai-engineering-init config --from env-config.md` 非交互式解析 MD 表格写入配置
- **Markdown 配置模板**：`.claude/templates/env-config.md`，填表即用，`YOUR_*` 占位符自动跳过
- **MD 表格解析引擎**：自动识别 MySQL/Loki 段落，解析表头+数据行，支持 range 展开

---

## [v1.16.4] - 2026-03-16

### 改进
- **碎片技能合并**：9 个碎片技能内容迁移到场景技能 `references/` 目录，删除独立碎片目录

---

## [v1.16.3] - 2026-03-16

### 新增
- **GSD 深度集成**：CLAUDE.md 新增 GSD 集成段落，GSD executor/debugger 可发现 loki-runner/mysql-runner 等领域 Agent
- **docs/reference.md**：新增 GSD 集成使用场景路由和安装指南
- **9 个碎片技能恢复**：leniu-java-amount-handling、leniu-java-export、leniu-java-report-query-param、leniu-java-total-line、leniu-mealtime、leniu-marketing-price-rule-customizer、leniu-marketing-recharge-rule-customizer、leniu-report-customization、leniu-report-standard-customization

### 改进
- **mysql-debug 技能**：四级降级查找 + range 范围匹配 + 全局配置（修复 linter 还原）
- **loki-log-query 技能**：三级配置查找 + range→projects 展开 + 全局配置（修复 linter 还原）
- **三平台技能同步**：所有 skills 修改自动同步到 .claude/ + .cursor/ + .codex/
- **技能精简**：code-patterns、leniu-code-patterns、leniu-crud-development、leniu-java-mybatis、codex-code-review

---

## [v1.16.2] - 2026-03-16

### 修复
- **Cursor 兼容**：全局配置（`--scope global`）同时写入 `~/.claude/` 和 `~/.cursor/`，Cursor 用户可正确读取
- **Cursor 技能同步**：mysql-debug、loki-log-query 技能同步到 `.cursor/skills/`（含全局查找、range 匹配）

---

## [v1.16.1] - 2026-03-16

### 改进
- **config 全局配置支持**：新增 `--scope global` 参数，配置写入 `~/.claude/`，所有项目共享；技能按 本地→全局 顺序查找
- **config 增量添加**：新增 `--add` 参数，追加环境到已有配置而不覆盖；交互中可输入 `add` 进入追加模式
- **环境范围匹配（range）**：配置支持 `range: "1~15"` 字段，用户说"dev10"时自动匹配 dev 环境配置
- **mysql-debug 技能**：升级为四级降级查找（用户指定→本地配置→全局配置→bootstrap-dev.yml），支持 range 范围匹配
- **loki-log-query 技能**：升级为三级配置查找（本地→旧路径兼容→全局），range 自动展开为 projects 列表

---

## [v1.16.0] - 2026-03-16

### 新增
- **config 命令统一入口**：`npx ai-engineering-init config` 支持交互式选择配置类型（MySQL / Loki / 全部），新增 `--type` 参数（`mysql` | `loki` | `all`）
- **Loki 日志查询配置初始化**：交互式配置 Grafana Service Account Token，支持已有环境补 Token 和从零创建两种模式
- **多工具目录同步**：自动检测 `.claude/` 和 `.cursor/` 目录，配置同步写入对应位置
- **敏感配置 .gitignore 保护**：自动检测并添加 mysql-config.json、environments.json 到 .gitignore

---

## [v1.15.0] - 2026-03-15

### 新增
- **leniu-marketing-scenario 统一营销技能**：合并 2 个碎片营销技能为场景化技能，覆盖四大规则模块（就餐/计价/扣款/充值）的新增、定制、调试全场景，包含决策树、架构总览、Handler 三层结构、18 种计价规则 + 5 种充值规则 + 3 种扣款规则 + 2 种就餐规则速查表、代码模板、references 按需加载

### 移除
- **9 个碎片技能**：已被场景技能替代（leniu-marketing-price-rule-customizer、leniu-marketing-recharge-rule-customizer、leniu-java-amount-handling、leniu-java-export、leniu-java-report-query-param、leniu-java-total-line、leniu-mealtime、leniu-report-customization、leniu-report-standard-customization）

---

## [v1.14.3] - 2026-03-15

### 新增
- **chrome-cdp 技能**：通过 Chrome DevTools Protocol 与本地 Chrome 浏览器交互（截图、导航、点击、执行 JS）
- **/release 发版命令**：自动读取 RELEASE.md 规范，按标准流程执行版本发布（版本号推荐、CHANGELOG 生成、tag 推送、验证）
- **claude-code-workflow-dewu 文档**：Claude Code 工作流参考文档

---

## [v1.14.2] - 2026-03-15

### 新增
- **leniu-report-scenario 统一报表技能**：合并 7 个碎片报表技能为场景化技能，包含决策树、Param/VO/Controller/Service/Mapper XML 完整模板、金额处理、退款净额、餐次速查，references 按需加载汇总表定制/数据权限/基础表字段
- **定制报表对齐陷阱**（issue #12）：pay_time vs order_date 选择指南、order_type 覆盖范围、上线前数据验证检查项

### 修复
- **Service 模式描述修正**：leniu-crud-development/leniu-java-mybatis 中"不继承基类"改为混合模式（简单 CRUD 继承 ServiceImpl + 业务聚合直接 @Service）
- **report-scenario WHY 解释**：金额处理、合计行规则添加原因说明，description 采用 pushy 风格

### 移除
- **ai-index 代码索引功能**：技能（三平台）+ src/index-builder/ + CLI index 命令 + 设计文档
- **7 个碎片报表技能**：已被 leniu-report-scenario 替代

---

## [v1.14.1] - 2026-03-13

### 改进
- **代码规范技能增强**：基于架构师 Review 规范，完善 3 个代码规范相关技能
  - **code-patterns**：新增数据类型规范（Boolean/枚举/金额/原始类型vs包装类型）、Optional 使用规范、@Transactional 规范、TODO 管理规范、代码格式化规范，常见错误表新增 5 项
  - **leniu-code-patterns**：新增 MyBatis-Plus 安全规范（selectOne/EXISTS/Wrapper 复杂度/SELECT*）、Redis KEYS 禁令、布尔字段命名、枚举标注、Optional、业务逻辑分层规范
  - **codex-code-review**：新增 7 个 Grep 检查项（selectOne 安全、selectCount→exists、Redis KEYS、Optional.of 误用、布尔字段类型、Wrapper 嵌套）
- **CLI `mcp` 命令增强**：MCP 注册表新增 codex（GuDaStudio/codexmcp）条目，优化 MCP 配置路径解析逻辑
- **CLAUDE.md 精简**：移除 Codex MCP 硬编码协作指令（已由 collaborating-with-codex 技能覆盖）
- **三平台同步**：code-patterns、leniu-code-patterns 同步更新至 Cursor 和 Codex 平台

---

## [v1.14.0] - 2026-03-10

### 新增
- **Codex MCP 集成**：通过 `GuDaStudio/codexmcp` 将 Codex 注册为 MCP 工具（`mcp__codex__codex`），支持 `read-only` 沙箱直接在对话中调用，无需命令行
- **collaborating-with-codex 技能升级**：从桥接脚本模式迁移至纯 MCP 模式，更新前置要求、工具参数说明、调用示例、多轮交互规范
- **CLAUDE.md Codex 协作规范**：新增 MCP 触发词条目及完整 Codex 工具调用规范（四步协作流程、沙箱策略、SESSION_ID 管理）

### 改进
- **uvx 安装**：通过 Homebrew 安装 `uv`（含 `uvx`），为 codexmcp 提供运行时支持

---

## [v1.13.0] - 2026-03-10

### 新增
- **auto-test 技能**：API 自动化测试技能。基于 Apifox MCP 读取接口文档，使用 Hurl 生成并执行真实 HTTP 测试，支持单接口/单业务组合（CRUD 生命周期）/跨业务串联（多模块流程）三种粒度，生成 HTML/JSON 测试报告。测试失败时自动调用 fix-bug 技能走标准修复流程
- **auto-test-generator Agent**：新增自动化测试生成 Agent（`.claude/agents/auto-test-generator.md`），支持 Hurl 集成测试规则、数据正确性验证、失败处理流程
- **auto-test 斜杠命令**：新增 `/auto-test` 命令（`.claude/commands/auto-test.md`），支持读取 Param/VO 源码、测试数据检查清单、自动修复条件
- **示例测试文件**：`tests/hurl/` 目录包含 env/finance/flows/reports 示例

### 改进
- **技能注册同步**：三个平台（Claude/Cursor/Codex）的技能注册文件同步新增 auto-test 关键词触发
- **AGENTS.md**：新增 auto-test Agent 条目

---

## [v1.12.2] - 2026-03-09

### 新增
- **lanhu-design 技能**：集成蓝湖 MCP Server，支持通过 MCP 工具直接读取蓝湖项目的 Axure 原型页面、UI 设计图、切图资源和团队留言。包含 12 个 MCP 工具，支持 development/testing/exploration 三种分析模式

---

## [v1.12.1] - 2026-03-09

### 改进
- **analyze-requirements Axure 链接处理**：当用户提供 Axure 链接时，强制使用 Playwright 截图而非 WebFetch（Axure 是 SPA，WebFetch 必定失败）。SKILL.md 新增 Axure 链接判断规则和 Playwright 截图流程，requirements-analyzer Agent 同步更新

---

## [v1.12.0] - 2026-03-09

### 改进
- **OpenSpec 命令化**：Claude Code 平台的 10 个 OpenSpec 技能转为 `/opsx-*` 斜杠命令（`.claude/commands/`），不再通过关键词自动触发，改为显式 `/opsx-new`、`/opsx-ff` 等命令调用。Codex/Cursor 平台保持技能形式不变
- **Loki 查询时间优化**：所有查询场景默认时间范围统一为 6 小时（原 24h/1h 混用），减少无效日志扫描
- **platform-map.json**：新增 10 个 OpenSpec 平台排除规则，Claude 平台不再分发 OpenSpec 技能文件
- **文档更新**：README 和 reference.md 更新技能/命令计数（80 技能 + 20 命令）

---

## [v1.11.0] - 2026-03-09

### 新增
- **流程编排技能**：新增 2 个工作流编排技能，通过复杂度判断自动路由到最优路径
  - **`analyze-requirements`**：需求分析全流程编排。简单需求直接分析，复杂需求自动调度 image-reader + task-fetcher Agent 并行获取数据，输出结构化需求报告和开发任务清单
  - **`fix-bug`**：Bug 修复全流程编排。简单 Bug 直接修复，复杂 Bug 并行启动 bug-analyzer + loki-runner + mysql-runner + code-scanner Agent，汇总后修复并走 git-workflow 提交
- **code-scanner Agent**：新增 Haiku 层代码扫描 Agent（`.claude/agents/code-scanner.md`），负责代码库扫描、文件定位、代码片段收集

### 改进
- **yunxiao-task-management 技能重构**：新增项目缓存表、关键词搜索限制说明、"提测单完善流程"章节及 HTML 模板（`templates/提测单模板.html`），精简 API 文档（closes #10）
- **AGENTS.md 更新**：新增 `analyze-requirements`、`fix-bug` 技能条目，更新 Bug 修复和需求分析工作流图
- **多模型分层 Agent 架构指南更新**：3 个场景工作流融入编排技能的复杂度判断模式和动态 Agent 选择逻辑
- **Hook 注册同步**：Claude/Cursor Hook 新增流程编排技能触发词（`skill-forced-eval.js`、`cursor-skill-eval.js`、`skill-activation.mdc`）
- **技能数量**：90 个（新增 analyze-requirements、fix-bug）

### 关闭 Issue
- closes #9（fix-bug 技能改进）
- closes #10（yunxiao-task-management 技能改进）

---

## [v1.10.0] - 2026-03-08

### 新增
- **多模型分层 Agent 架构**：按思维深度分层，不同 Agent 使用不同模型，各司其职
  - **Haiku 层（4 个 Agent）**：loki-runner（日志查询）、mysql-runner（数据库查询）、task-fetcher（云效任务）、image-reader（图片/Axure 原型分析）— 快速、低成本、只搬数据不分析
  - **Sonnet 层（2 个 Agent）**：bug-analyzer（Bug 根因分析 + Codex 逻辑分析）、code-reviewer（规范检查 + Codex 逻辑审查）— 理解代码逻辑、分析根因
  - **Opus 层（1 个 Agent）**：requirements-analyzer（需求分析，协调 Haiku 层提取原型图/任务数据，输出开发任务清单）
- **image-reader 合并 Axure 原型分析**：自动识别原型图并提取页面结构、搜索条件、表格列、表单字段、操作按钮、交互流程
- **requirements-analyzer 需求分析 Agent**：从 Axure 原型图 → 数据库设计 → 接口清单 → 开发任务拆解的完整流程
- **Cursor agents 同步**：8 个 Agent 全量同步到 `.cursor/agents/`，model 字段适配 Cursor 规范（`fast`/`inherit`）
- **架构指南文档**：`docs/多模型分层Agent架构指南.md`，含完整运行架构图、4 个场景工作流、成本效益分析

### 改进
- **code-reviewer agent 增强**：从单一规范检查升级为双重审查（Sonnet 规范 + Codex 逻辑），新增 4 阶段审查流程
- **AGENTS.md 更新**：新增多模型分层 Agent 系统章节，含 Haiku/Sonnet/Opus 三层说明和协作流程图

---

## [v1.9.0] - 2026-03-08

### 新增
- **OpenSpec 与 Commands 融合工作流**：OpenSpec 负责需求拆解和设计决策，Commands 负责代码生成和质量管控
- **CLAUDE.md 开发模式选择指南**：根据功能复杂度自动路由到合适的工作流（轻量→/dev、中等→/dev+OpenSpec、复杂→OpenSpec全流程）
- **/next 命令增强**：自动扫描 OpenSpec 活跃变更并推荐下一步
- **/progress 命令增强**：集成 OpenSpec 变更状态展示

---

## [v1.8.0] - 2026-03-07

### 重大改进
- **22 个通用技能去 RuoYi 耦合**：将 `backend-annotations`、`security-guard`、`data-permission`、`tenant-management`、`scheduled-jobs`、`workflow-engine`、`websocket-sse`、`sms-mail`、`social-login`、`crud-development`、`architecture-design`、`database-ops`、`code-patterns`、`error-handler`、`bug-detective`、`utils-toolkit`、`redis-cache`、`file-oss-management`、`json-serialization`、`api-development`、`git-workflow`、`performance-doctor` 重写为框架无关的通用模板，使用 `[你的xxx]` 占位符
- **CLAUDE.md 通用化**：从 leniu 项目专属改为通用示例模板，所有配置项使用占位符
- **collaborating-with-codex 技能升级**：新增 MCP 原生集成方式（codex-mcp-server），默认模型更新为 gpt-5.3-codex，新增 Profile 配置（closes #8）

### 改进
- **Hook 技能列表对齐**：Claude/Cursor Hook 技能列表与 src/skills/ 完全同步（88 个技能）
- **docs/reference.md 更新**：技能数量从 69 更正为 88，描述与新内容同步
- **安装后提示增强**：新增 MCP 管理命令提示（`npx ai-engineering-init mcp`）
- **README.md 改进**：增加必做提示、核心命令精简、内容计数更新
- **.claude/settings.json MCP 补全**：自动配置 sequential-thinking 和 context7
- **CONTRIBUTING.md 新增**：通用 vs 专属技能判断指南、质量检查清单、占位符规范

### 修复
- 删除 `.claude/skills/skill-creator`（platform-map 排除 Claude 平台，不应存在）
- 删除 `.claude/skills/loki-log-query/environments.template.json`（已改为运行时复制）

### 关闭 Issue
- closes #8（collaborating-with-codex MCP 原生集成）

---

## [v1.7.0] - 2026-03-07

### 新增
- **loki-log-query 技能**：通过 Grafana Loki API 查询线上日志，支持 5 环境管理、traceId 链路追踪、接口路径查询、关键词搜索
- **yunxiao-task-management 技能**：阿里云云效任务管理，通过 Open API 查询/修改/流转工作项
- **sync-back-merge 技能**：合并 sync-back Issue 到源仓库的标准流程
- **skill-creator 技能**：技能创建元技能（仅分发到 Codex 和 Cursor，Claude 使用内置 add-skill）
- **codex-code-review 技能重写**：改为两阶段审查（本地规范检查 + 代码逻辑审查），可选调用 Codex CLI
- **CLI `mcp` 命令**：MCP Server 管理（列出/添加/移除/启用/禁用），支持多工具平台
- **CLI `config` 命令**：查看和管理项目配置

### 改进
- **mysql-debug 技能**：新增三级降级连接（用户指定 > mysql-config.json > bootstrap-dev.yml 自动提取）+ mysql CLI 多路径查找（closes #5, #6）
- **leniu-report-customization 技能**：新增 ONLY_FULL_GROUP_BY 兼容章节
- **leniu-report-standard-customization 技能**：新增 ONLY_FULL_GROUP_BY 兼容章节
- **code-reviewer agent**：精简冗余检查清单
- **stop hook**：新增代码审查提示
- **platform-map.json**：新增 skill-creator 平台分发配置

### 关闭 Issue
- closes #3（报表技能增强）
- closes #5（mysql-debug CLI 路径查找）
- closes #6（mysql-debug 三级降级连接）

---

## [v1.6.0] - 2026-03-05

### 新增
- **`sync-back` 命令**：对比本地技能修改与包版本的差异，生成 unified diff，支持自动提交 GitHub Issue
  - `npx ai-engineering-init sync-back` — 扫描所有已安装工具，列出修改的技能
  - `--tool claude` — 只扫描指定工具
  - `--skill <名称>` — 只对比指定技能
  - `--submit` — 自动通过 `gh` CLI 创建 GitHub Issue（需先安装 gh）
  - 纯 Node.js 实现 unified diff（零外部依赖，跨平台兼容 Windows/macOS/Linux）
  - 补全**安装 → 使用 → 发现问题 → sync-back → 维护者合并 → 重新发布**的闭环

---

## [v1.5.0] - 2026-03-05

### 新增
- **单一源架构（src/skills/）**：建立 `src/skills/` 作为唯一事实源（Single Source of Truth），彻底解决三平台同步遗忘问题
- **构建脚本（build-skills.js）**：`npm run build:skills` 从 `src/skills/` 自动生成 `.claude/`、`.codex/`、`.cursor/` 三个平台目录
- **一致性检查（check:skills）**：`npm run check:skills` 验证三平台与源文件一致性（CI 可用）
- **平台映射配置（platform-map.json）**：精确定义每个技能分发到哪些平台，支持平台独有技能

### 架构变更
- 84 个技能统一管理于 `src/skills/`，通过构建分发到三平台
- 平台分发规则：Claude 73 个、Codex 83 个、Cursor 73 个
- 以前需要手动同步三个目录，现在**改一处 → 运行 build → 三平台自动一致**

---

## [v1.4.3] - 2026-03-05

### 优化
- **leniu-java-export 技能大幅重构**：全面扩充导出规范，新增同步导出、异步分页导出（Feign 跨模块）完整模板，补充 VO 注解规范（`CustomNumberConverter` 金额转换）、Service 层导出逻辑、导出列控制、数据脱敏、性能优化等章节
- **三平台完整同步**：修复 `.codex/` 和 `.cursor/` 仅同步了局部改动的问题，全量覆盖为 `.claude/` 最新版本

---

## [v1.4.2] - 2026-03-05

### 优化
- **bug-detective 技能联动增强**：新增 `mysql-debug` 联动说明，诊断到数据问题时自动激活数据库查询验证
- **project-navigator 技能重构**：精简内容结构，提升导航效率
- **三平台同步**：`.claude/`、`.codex/`、`.cursor/` 同步更新上述技能
- **CLAUDE.md 增强**：补充工作流编排、Agent 团队策略、自我改进循环等核心工作原则

---

## [v1.4.1] - 2026-03-04

### 修复
- **cursor hooks.json 路径兼容性**：将 `$(git rev-parse --show-toplevel)` 替换为跨平台 Node.js 目录遍历逻辑，解决非 git 仓库工作区和子目录场景下 hook 执行失败的问题；同时支持 Windows/macOS/Linux
- **cursor-skill-eval.js 技能注册补全**：补充 9 个未注册技能（`add-skill`、`banana-image`、`collaborating-with-codex`、`collaborating-with-gemini`、`leniu-brainstorm`、`leniu-report-customization`、`leniu-report-standard-customization`、`mysql-debug`、`openspec-onboard`），技能注册数从 64 提升至 73，与技能目录完全对齐

---

## [v1.4.0] - 2026-03-04

### 优化
- **全量技能精简重构（72 个技能）**：按"精简至上"设计原则，将所有技能压缩至 500 行以内（平均削减 53%），移除 AI 已知内容，只保留项目特有知识
- **渐进披露架构（references/ 目录）**：为 22 个内容丰富的技能创建 `references/` 子目录，将完整模板、字段参考、详细示例拆分为按需加载的参考文档
- **YAML 头部标准化**：为全部 72 个技能补全"触发场景"（≥3 个）和"触发词"（≥5 个），修复 10 个 OpenSpec 技能及 banana-image 技能的缺失问题
- **三平台同步**：优化后的 72 个技能（含 references/ 目录）全量同步至 `.codex/skills/` 和 `.cursor/skills/`，保留各平台专有技能不受影响

---

## [v1.3.4] - 2026-03-03

### 新增
- **leniu-report-standard-customization 技能**：新增标准版（core-report 模块）定制报表开发技能，涵盖经营分析、营业额分析、用户活跃度、菜品排行、操作员统计、账户日结等场景

### 优化
- **add-skill 技能重构**：优化技能创建文档，提升技能编写指引的清晰度
- **leniu-report-customization 技能**：补充更多报表开发模板和示例
- **skill-forced-eval.js**：同步注册 `leniu-report-standard-customization` 触发词
- **skill-activation.mdc**：同步注册标准版报表技能触发词到 Cursor Rules
- **AGENTS.md**：同步更新技能注册信息

---

## [v1.3.3] - 2026-03-03

### 修复
- **Cursor beforeSubmitPrompt hook 技能注入失效**：根本原因是 `systemMessage` 字段不在 Cursor 支持范围内
  - Cursor `beforeSubmitPrompt` 只支持 `{continue, user_message}`，之前输出 `{systemMessage}` 被直接忽略
  - 改为同时输出 `prompt`（修改用户 prompt 注入指引）和 `user_message`（fallback 备注），覆盖 Cursor 可能支持的字段

### 新增
- **`.cursor/rules/skill-activation.mdc`（核心兜底）**：利用 Cursor Rules 系统实现永久技能激活
  - `alwaysApply: true` — Cursor 将其内容注入**每次对话的系统上下文**，不依赖 hook 协议
  - 包含完整的触发词 → SKILL.md 路径映射表（leniu 专项、OpenSpec 工作流、通用技能三大分类）
  - AI 识别到触发词后自动读取对应 SKILL.md，确保技能激活率接近 100%

---

## [v1.3.2] - 2026-03-03

### 修复
- **音效搜索路径升级为 4 层回退**：确保任何安装方式下音效都能正常播放
  - `.claude/hooks/stop.js`：从单一路径升级为 4 层搜索（工作区 `.claude/` → `.cursor/` → 全局 `~/.claude/` → `~/.cursor/`）
  - `.cursor/hooks/stop.js`：从 2 层搜索升级为 4 层搜索，补充全局路径回退
  - 与全局 `~/.cursor/hooks/stop.js` 的搜索策略保持一致
- **安装脚本补充 audio 目录**：`update` 和 `global` 命令现在会正确安装音效文件
  - `UPDATE_RULES` 新增 `.claude/audio` 和 `.cursor/audio` 目录
  - `GLOBAL_RULES` 新增 `audio` 目录到 `~/.claude/audio/` 和 `~/.cursor/audio/`
  - 之前只有 `init`（整个目录复制）才会包含音效，`update`/`global` 会遗漏

### 移除
- **leniu-java-code-style 技能**：移除已合并到其他技能的冗余代码风格文档

---

## [v1.3.1] - 2026-03-02

### 修复
- **全局安装 Hooks 路径重写**：全局安装时自动将 hooks 命令中的相对路径（`.claude/hooks/`、`.cursor/hooks/`）重写为绝对路径
  - Claude Code: `node .claude/hooks/xxx.js` → `node /Users/you/.claude/hooks/xxx.js`
  - Cursor: `node .cursor/hooks/xxx.js` → `node /Users/you/.cursor/hooks/xxx.js`
  - 修复全局 `~/.claude/settings.json` 和 `~/.cursor/hooks.json` 中 hooks 因相对路径无法触发的问题
  - 新增 `rewritePaths()` 递归路径重写工具函数，支持 merge 和 copy 两种模式

---

## [v1.3.0] - 2026-03-02

### 新增
- **`global` 命令：全局安装（系统级别，对所有项目生效）**
  - 新增 `npx ai-engineering-init global` 命令，将 Skills/Commands/Hooks/Agents 安装到 `~/.claude` / `~/.cursor` / `~/.codex`
  - 支持 `--tool claude|cursor|codex|all` 指定工具
  - 支持 `--force` 强制覆盖已有全局文件
  - Claude Code `settings.json` 采用**合并安装**：Hooks 配置自动注入，用户已有的 env/model/statusLine 等完整保留
  - Cursor `hooks.json` + `mcp.json` 均正确安装，MCP 采用合并策略不覆盖用户已有服务器
  - 交互菜单新增选项 5「全局安装」
  - 帮助文档同步更新，补充 `global` 命令说明与示例
  - 移除 `.claude/settings.json` 中硬编码的 codex MCP 路径，避免分发到其他机器出错

---

## [v1.2.7] - 2026-03-02

### 修复
- **Cursor beforeSubmitPrompt hook 输出格式**：修复技能注入失效问题
  - 将 `console.log(instructions)` 改为 `console.log(JSON.stringify({ systemMessage: instructions }))`
  - Cursor 的 `beforeSubmitPrompt` hook 需要 JSON 格式 `{ "systemMessage": "..." }` 才能将内容注入 AI 上下文，纯 markdown 文本输出会被忽略

---

## [v1.2.6] - 2026-03-02

### 修复
- **Cursor stop hook 自包含**：将 `stop.js` 和 `completed.wav` 内置到 `.cursor/` 目录，不再依赖 Claude Code 安装
  - 新增 `.cursor/hooks/stop.js`（原来引用 `.claude/hooks/stop.js`）
  - 新增 `.cursor/audio/completed.wav` 音效文件
  - 音效查找策略：优先 `.cursor/audio/`，兼容 `.claude/audio/`（两者都安装时自动共用）
  - `hooks.json` stop 命令改为 `node .cursor/hooks/stop.js`

---

## [v1.2.5] - 2026-03-02

### 修复
- **Cursor hooks.json 格式兼容**：修复新版 Cursor 无法加载 hooks 的问题
  - 添加顶层 `"version": 1` 字段（Cursor 新版要求为数字类型）
  - 将 `command` 从嵌套 `hooks[]` 数组内提升到每个 hook 条目的顶层
  - 移除冗余的 `"type": "command"` 字段

---

## [v1.2.4] - 2026-03-02

### 新增
- **leniu-report-customization 技能**：新增定制报表开发技能，涵盖 `report_order_info`/`report_order_detail`/`report_account_flow` 基础表结构、退款数据处理模式、汇总报表开发模板

### 优化
- **技能触发词精准化**：移除所有 leniu-* 技能触发词中的 `leniu-` 前缀，改为自然语言关键词，提升匹配精准度
- **合并冗余技能**：`leniu-java-code-style` 合并到 `leniu-code-patterns`，消除重复
- **补充 YAML 头部**：为 `leniu-data-permission` 和 `leniu-redis-cache` 补充标准 YAML 头部
- **同步注册信息**：`skill-forced-eval.js` hook、`AGENTS.md`、`.cursor/skills/` 全部同步更新

---

## [v1.2.2] - 2026-03-01

### 新增
- **Windows MCP 路径说明**：在 README 中新增 Windows 用户配置 Codex MCP Server 路径的指引
  - `mcpServers.codex.command` 需改为 Windows 实际路径（如 `C:\Users\YourName\AppData\Roaming\npm\codex.cmd`）
  - 可通过 `where codex` 命令查询实际安装路径
  - 在"包含内容"和"初始化后使用"两处均已添加说明

---

## [v1.2.1] - 2026-03-01

### 新增
- **`update` 命令**：一键更新已安装的框架文件（Skills/Commands/Agents/Hooks），自动跳过用户自定义文件（`settings.json`、`CLAUDE.md`、`AGENTS.md`、`mcp.json`）
  - `npx ai-engineering-init update` — 自动检测已安装工具并更新
  - `npx ai-engineering-init update --tool claude` — 只更新指定工具
  - `npx ai-engineering-init update --force` — 强制更新，包括保留文件
- **Codex MCP Server 集成**：将 OpenAI Codex CLI 以 MCP Server 方式接入 `.claude/settings.json`，Claude 可直接通过 `codex` / `codex-reply` 工具调用 Codex 进行代码审查与协同开发，无需 Python 桥接脚本
- **CHANGELOG.md**：从 README.md 拆分独立更新日志文件

### 优化
- CLI 版本号从 `package.json` 动态读取，Banner 自动同步

---

## [v1.2.0] - 2026-03-01

### 新增
- **Cursor Hooks 支持**（`.cursor/hooks.json` + `.cursor/hooks/`）
  - `beforeSubmitPrompt`：检测用户意图，自动注入相关技能文档路径引导 Agent 阅读（对应 Claude 的 `UserPromptSubmit`）
  - `preToolUse`：拦截危险 Shell 命令（`rm -rf /`、`drop database` 等），兼容 Cursor `Shell` 工具名
  - `stop`：复用 Claude 的 `stop.js`，支持 nul 文件清理和完成音效
- **leniu-brainstorm** 云食堂头脑风暴技能

### 修复
- **leniu-java-export** 技能示例代码：移除错误的 `Executors.readInSystem()` 包装（业务查询默认在商户库执行）
- **leniu-java-total-line** 技能：同步修正双库架构说明，`Executors.doInSystem()` 仅用于访问系统库

---

## [v1.1.1] - 2026-02-24

### 优化
- **npm 发布流程**
  - 预发布版本（含 `-`）自动发布到 `test` 标签
  - 正式版本自动发布到 `latest` 标签
  - GitHub Release 自动标记预发布版本（`prerelease: true`）

---

## [v1.1.0] - 2026-02-24

### 新增
- **Cursor 工具支持**（`.cursor/` 目录）
  - 同步 68 个 Skills 到 `.cursor/skills/`
  - 新增 Subagents 配置（`code-reviewer`、`project-manager`）
  - 新增 MCP 服务器配置（`sequential-thinking`、`context7`、`github`）
- **25 个 leniu 云食堂专项技能**
  - 覆盖金额处理、并发、MQ、定时任务、报表、餐次、营销规则等场景

---

## [v1.0.0]

### 新增
- 初始版本，支持 Claude Code 和 OpenAI Codex
- 内置通用后端技能、OpenSpec 工作流技能
- 自动化 Hooks（技能强制评估、代码规范检查）
