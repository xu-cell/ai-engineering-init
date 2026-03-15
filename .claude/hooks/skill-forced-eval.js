#!/usr/bin/env node
/**
 * UserPromptSubmit Hook - 强制技能评估 (跨平台版本)
 * 功能: 开发场景下，将 Skills 激活率从约 25% 提升到 90% 以上
 *
 * 适配: 通用后端项目
 * 架构: 三层架构 (Controller → Service → Mapper)
 */

const fs = require('fs');

// 从 stdin 读取用户输入
let inputData = '';
try {
  inputData = fs.readFileSync(0, 'utf8');
} catch {
  process.exit(0);
}

let input;
try {
  input = JSON.parse(inputData);
} catch {
  process.exit(0);
}

const prompt = (input.prompt || '').trim();

// 检测是否是恢复会话（防止上下文溢出死循环）
const skipPatterns = [
  'continued from a previous conversation',
  'ran out of context',
  'No code restore',
  'Conversation compacted',
  'commands restored',
  'context window',
  'session is being continued'
];

const isRecoverySession = skipPatterns.some(pattern =>
  prompt.toLowerCase().includes(pattern.toLowerCase())
);

if (isRecoverySession) {
  // 恢复会话，跳过技能评估以防止死循环
  process.exit(0);
}

// 检测是否是斜杠命令
// 规则：以 / 开头，且后面不包含第二个 /（排除 /iot/device 这样的路径）
const isSlashCommand = /^\/[^\/\s]+$/.test(prompt.split(/\s/)[0]);

if (isSlashCommand) {
  // 斜杠命令，跳过技能评估
  process.exit(0);
}

const instructions = `## 强制技能激活流程（必须执行）

### 步骤 1 - 评估（必须在响应中明确展示）

针对用户问题，列出匹配的技能：\`技能名: 理由\`，无匹配则写"无匹配技能"

可用技能（后端项目）：
- crud-development: CRUD/业务模块/Entity/Service/Controller 开发
- api-development: API设计/RESTful/接口规范
- database-ops: 数据库/SQL/建表/字典/菜单
- backend-annotations: 注解/限流/防重复/脱敏/加密
- utils-toolkit: 工具类/对象转换/字符串/集合/日期
- file-oss-management: 文件上传/OSS/云存储
- analyze-requirements: 分析需求/需求分析/原型分析/需求拆解/分析原型图
- fix-bug: 修复bug/fix bug/排查修复/线上修复/bug修复
- bug-detective: Bug/报错/异常/不工作
- error-handler: 异常处理/全局异常/业务异常
- performance-doctor: 性能/慢查询/优化/缓存
- data-permission: 数据权限/行级权限/数据隔离
- security-guard: 安全/认证授权/加密/XSS/SQL注入防护
- architecture-design: 架构/模块划分/重构
- code-patterns: 规范/禁止/命名/Git提交
- project-navigator: 项目结构/文件在哪/定位
- git-workflow: Git/提交/commit/分支
- task-tracker: 任务跟踪/记录进度/继续任务
- tech-decision: 技术选型/方案对比
- brainstorm: 头脑风暴/创意/方案设计
- collaborating-with-codex: Codex协作/多模型/算法分析
- collaborating-with-gemini: Gemini协作/前端原型/UI设计
- codex-code-review: 代码审查/review/代码检查/code review
- workflow-engine: 工作流/审批流/流程引擎
- test-development: 测试/单元测试/@Test/JUnit5/Mockito
- json-serialization: JSON/序列化/反序列化/日期格式/BigDecimal/精度
- redis-cache: Redis/缓存/@Cacheable/分布式锁/限流
- scheduled-jobs: 定时任务/@Scheduled/Quartz/XXL-Job/任务调度
- auto-test: 自动测试/auto-test/接口测试/API测试/Hurl/测试报告/回归测试
- add-skill: 添加技能/创建技能/新技能/技能开发
- banana-image: 生成图片/AI图片/产品图/海报/缩略图
- lanhu-design: 蓝湖/lanhu/设计稿/原型图/蓝湖链接/设计图/切图
- websocket-sse: WebSocket/SSE/实时推送/消息通知/双向通信
- sms-mail: 短信/邮件/SMS/验证码/通知
- social-login: 第三方登录/OAuth/OAuth2/社交登录/授权登录
- tenant-management: 多租户/租户隔离/SaaS/数据隔离
- ui-pc: 前端组件/Element UI/页面开发
- store-pc: Vuex/状态管理/store模块
- mysql-debug: MySQL调试/查数据库/执行SQL/数据库排查
- loki-log-query: Loki日志/日志查询/线上日志排查
- yunxiao-task-management: 云效任务/任务管理/需求管理
- crud: 快速CRUD生成/脚手架
- dev: 开发新功能/功能开发流程
- check: 代码检查/规范检查
- start: 项目启动/初始化/开始
- next: 下一步/继续/接下来做什么
- progress: 进度查看/当前状态
- sync: 同步/代码同步
- sync-back-merge: 回合并/sync back merge/主分支同步
- init-docs: 初始化文档/项目文档生成
- add-todo: 添加待办/TODO/任务添加
- update-status: 更新状态/状态变更
- skill-creator: 创建技能模板/技能脚手架/skill scaffold
- leniu-report-scenario: 报表/报表开发/报表查询/报表导出/合计行/totalLine/汇总报表/定制报表/report_order_info/金额处理/分转元/餐次/mealtime/ReportBaseTotalVO/CustomNumberConverter

### 步骤 2 - 激活（逐个调用，等待每个完成）

⚠️ **必须逐个调用 Skill() 工具，每次调用后等待返回再调用下一个**
- 有 N 个匹配技能 → 逐个发起 N 次 Skill() 调用（不要并行！）
- 无匹配技能 → 写"无匹配技能"

**调用顺序**：按列出顺序，先调用第一个，等返回后再调用第二个...

### 步骤 3 - 实现

只有在步骤 2 的所有 Skill() 调用完成后，才能开始实现。

---

**关键规则（违反将导致任务失败）**：
1. ⛔ 禁止：评估后跳过 Skill() 直接实现
2. ⛔ 禁止：只调用部分技能（必须全部调用）
3. ⛔ 禁止：并行调用多个 Skill()（必须串行，一个一个来）
4. ✅ 正确：评估 → 逐个调用 Skill() → 全部完成后实现

**正确示例**：
用户问："帮我开发一个优惠券管理功能"

匹配技能：
- crud-development: 涉及业务模块CRUD开发
- database-ops: 需要建表和字典配置

激活技能：
> Skill(crud-development)
> Skill(database-ops)

[所有技能激活完成后开始实现...]

**错误示例（禁止）**：
❌ 只调用部分技能
❌ 列出技能但不调用 Skill()
❌ 并行调用（会导致只有一个生效）`;

console.log(instructions);
process.exit(0);
