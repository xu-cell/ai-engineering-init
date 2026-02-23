#!/usr/bin/env node
/**
 * UserPromptSubmit Hook - 强制技能评估 (跨平台版本)
 * 功能: 开发场景下，将 Skills 激活率从约 25% 提升到 90% 以上
 *
 * 适配项目: RuoYi-Vue-Plus (纯后端项目)
 * 架构: 三层架构 (Controller → Service → Mapper)
 * 包名: org.dromara.*
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

可用技能（纯后端项目）：
- crud-development: CRUD/业务模块/Entity/Service/Controller 开发
- api-development: API设计/RESTful/接口规范
- database-ops: 数据库/SQL/建表/字典/菜单
- backend-annotations: 注解/@RateLimiter/@DataScope
- utils-toolkit: 工具类/StringUtils/MapstructUtils
- file-oss-management: 文件上传/OSS/云存储/MinIO
- ai-langchain4j: AI/大模型/ChatGPT/DeepSeek
- media-processing: 图片处理/二维码/水印/Excel
- bug-detective: Bug/报错/异常/不工作
- error-handler: 异常处理/ServiceException
- performance-doctor: 性能/慢查询/优化/缓存
- data-permission: 数据权限/@DataPermission/DataScope/行级权限
- security-guard: 安全/Sa-Token/认证授权/加密
- architecture-design: 架构/模块划分/重构
- code-patterns: 规范/禁止/命名/Git提交
- project-navigator: 项目结构/文件在哪/定位
- git-workflow: Git/提交/commit/分支
- task-tracker: 任务跟踪/记录进度/继续任务
- tech-decision: 技术选型/方案对比
- brainstorm: 头脑风暴/创意/方案设计
- collaborating-with-codex: Codex协作/多模型/算法分析
- collaborating-with-gemini: Gemini协作/前端原型/UI设计
- workflow-engine: 工作流/审批流/Flowable/流程
- test-development: 测试/单元测试/@Test/JUnit5/Mockito
- json-serialization: JSON/序列化/反序列化/JsonUtils/日期格式/BigDecimal/精度/类型转换
- redis-cache: Redis/缓存/@Cacheable/@CacheEvict/RedisUtils/分布式锁/RLock/限流
- scheduled-jobs: 定时任务/SnailJob/@Scheduled/@JobExecutor/任务调度/重试机制
- add-skill: 添加技能/创建技能/新技能/技能开发/写技能
- banana-image: 生成图片/AI图片/产品图/海报/缩略图/4K/高清/制作图片
- websocket-sse: WebSocket/SSE/实时推送/消息通知/在线状态/双向通信/实时通信
- sms-mail: 短信/邮件/SMS/验证码/通知/SMS4j/MailUtils/邮件发送/短信发送
- social-login: 第三方登录/微信登录/QQ登录/OAuth/OAuth2/JustAuth/社交登录/扫码登录/授权登录
- tenant-management: 多租户/租户隔离/TenantEntity/TenantHelper/租户ID/tenantId/跨租户/动态租户/SaaS
- leniu-java-amount-handling: leniu-金额/leniu-分转元/leniu-元转分/leniu-Long金额/leniu-money/fen/leniu-yunshitang/net.xnzn
- leniu-java-code-style: leniu-代码风格/leniu-命名规范/leniu-类命名/leniu-方法命名/leniu-包结构/leniu-yunshitang/net.xnzn
- leniu-java-concurrent: leniu-并发/leniu-CompletableFuture/leniu-线程池/leniu-并发安全/leniu-分布式锁/leniu-yunshitang/net.xnzn
- leniu-java-entity: leniu-Entity/leniu-VO/leniu-DTO/leniu-Param/leniu-实体类/leniu-@TableName/leniu-@TableField/leniu-yunshitang/net.xnzn
- leniu-java-export: leniu-导出/leniu-Export/leniu-Excel导出/leniu-异步导出/leniu-@ExcelProperty/leniu-yunshitang/net.xnzn
- leniu-java-logging: leniu-日志/leniu-@Slf4j/leniu-log.info/leniu-log.error/leniu-日志级别/leniu-yunshitang/net.xnzn
- leniu-java-mq: leniu-消息队列/leniu-MQ/leniu-MqUtil/leniu-@MqConsumer/leniu-延迟消息/leniu-yunshitang/net.xnzn
- leniu-java-mybatis: leniu-MyBatis/leniu-MyBatisPlus/leniu-Mapper/leniu-LambdaQueryWrapper/leniu-XML映射/leniu-yunshitang/net.xnzn
- leniu-java-report-query-param: leniu-报表查询/leniu-Param类/leniu-分页参数/leniu-时间范围/leniu-ReportBaseParam/leniu-yunshitang/net.xnzn
- leniu-java-task: leniu-定时任务/leniu-XXL-Job/leniu-@XxlJob/leniu-TenantLoader/leniu-任务调度/leniu-yunshitang/net.xnzn
- leniu-java-total-line: leniu-合计行/leniu-totalLine/leniu-报表合计/leniu-SUM合计/leniu-ReportBaseTotalVO/leniu-yunshitang/net.xnzn
- leniu-crud-development: leniu-yunshitang/leniu-CRUD/leniu-增删改查/leniu-新建模块/leniu-Entity/leniu-DTO/leniu-VO/leniu-Service/leniu-Mapper/leniu-Controller/leniu-分页查询/LeRequest/PageDTO/net.xnzn/leniu-yunshitang
- leniu-database-ops: leniu-yunshitang/leniu-数据库/leniu-SQL/leniu-建表/leniu-Entity/leniu-双库/leniu-商户库/leniu-系统库/net.xnzn/leniu-yunshitang
- leniu-utils-toolkit: leniu-yunshitang/leniu-工具类/leniu-BeanUtil/leniu-StrUtil/leniu-CollUtil/leniu-ObjectUtil/leniu-RedisUtil/leniu-JacksonUtil/leniu-LeBeanUtil/net.xnzn/leniu-yunshitang
- leniu-error-handler: leniu-yunshitang/leniu-异常/leniu-LeException/leniu-全局异常/leniu-参数校验/leniu-日志/leniu-错误码/leniu-I18n/leniu-国际化/net.xnzn/leniu-yunshitang
- leniu-backend-annotations: leniu-yunshitang/leniu-注解/leniu-@RequiresAuthentication/leniu-@RequiresGuest/leniu-@Validated/leniu-@NotNull/leniu-@Api/leniu-@ApiOperation/leniu-@ApiModelProperty/leniu-分组校验/leniu-InsertGroup/leniu-UpdateGroup/net.xnzn/leniu-yunshitang
- leniu-api-development: leniu-API/leniu-接口/leniu-Controller/leniu-RESTful/LeResult/云食堂接口/云食堂API/leiu-yunshitang
- leniu-architecture-design: leniu-架构/云食堂架构/双库架构/商户库/系统库/net.xnzn/pigx框架
- openspec-new-change: 新建变更/开始新功能/opsx:new/openspec new/创建变更
- openspec-ff-change: 快速推进/快速生成所有制品/opsx:ff/openspec ff/fast-forward
- openspec-apply-change: 实现任务/开始实现/opsx:apply/openspec apply/执行变更
- openspec-continue-change: 继续变更/创建下一个制品/opsx:continue/openspec continue
- openspec-archive-change: 归档变更/完成变更/opsx:archive/openspec archive/归档
- openspec-bulk-archive-change: 批量归档/批量完成/opsx:bulk-archive/批量变更
- openspec-explore: 探索模式/思维伙伴/opsx:explore/openspec explore/探索问题
- openspec-onboard: 新手引导/学习工作流/opsx:onboard/openspec onboard/入门教程
- openspec-sync-specs: 同步规格/同步spec/opsx:sync/openspec sync/delta同步
- openspec-verify-change: 验证变更/检查实现/opsx:verify/openspec verify/验证规格

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
