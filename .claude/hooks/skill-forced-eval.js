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
- java-amount-handling: 金额/分转元/元转分/Long金额/money/fen/金额字段/AmountConverter
- java-code-optimizer: 代码优化/性能优化/重构/坏味道/循环优化/策略模式/卫语句/代码改进
- java-code-quality: 代码质量/代码检查/代码审查/质量评分/SQL注入检查/空指针检查/代码评级
- java-code-style: 代码风格/命名规范/类命名/方法命名/包结构/注解使用/依赖注入/驼峰命名
- java-concurrent: 并发/CompletableFuture/线程池/ThreadPool/并发安全/锁/synchronized/volatile/原子类
- java-controller: Controller/@RestController/接口路径/@RequestMapping/@GetMapping/@PostMapping/API接口
- java-database: 建表/数据库设计/SQL规范/Flyway/迁移脚本/字段命名/索引设计/CREATE TABLE/审计字段
- java-entity: Entity/VO/DTO/Param/实体类/@TableName/@TableField/@JsonFormat/字段映射/@NotNull/@NotBlank
- java-exception: 异常处理/Exception/NPE/NullPointerException/finally/try-catch/Optional/异常链
- java-export: 导出/Export/Excel导出/异步导出/分页导出/@ExcelProperty/FastExcel/EasyExcel
- java-logging: 日志/@Slf4j/log.info/log.error/log.debug/log.warn/日志级别/日志格式/logging
- java-mq: 消息队列/MQ/RocketMQ/消息发送/消息消费/延迟消息/消息重试/事务消息/@RocketMQMessageListener
- java-multitenant: 多租户/租户隔离/TenantEntity/TenantHelper/tenantId/跨租户/@TenantIgnore/租户上下文
- java-mybatis: MyBatis/MyBatisPlus/Mapper/LambdaQueryWrapper/LambdaQuery/XML映射/动态SQL/selectPage/BaseMapper
- java-quality: 代码质量/空指针防护/参数校验/并发安全/事务边界/资源关闭/集合安全/返回值兜底
- java-report-query-param: 报表查询/Param类/查询入参/分页参数/时间范围/组织筛选/导出列配置/BaseReportParam
- java-security: 安全规范/SQL注入/XSS/CSRF/权限控制/数据脱敏/输入验证/@SaCheckPermission/@SaCheckRole
- java-service: Service层/@Service/@Transactional/事务管理/业务逻辑/分页查询/ServiceImpl/服务层
- java-task: 定时任务/XXL-Job/任务调度/@JobHandler/@XxlJob/任务日志/任务监控/cron
- java-total-line: 合计行/Total Line/报表合计/合计查询/合计SQL/SUM合计/needTotalLine/totalLine/汇总行
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
