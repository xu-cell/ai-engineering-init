#!/usr/bin/env node
/**
 * UserPromptSubmit Hook - 强制技能评估 (跨平台版本)
 * 功能: 开发场景下，将 Skills 激活率从约 25% 提升到 90% 以上
 *
 * 适配项目: leniu (纯后端项目)
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
- mysql-debug: 查数据库/查表/执行SQL/查记录/mysql查询/数据库排查/验证数据/数据库调试/db查询
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
- leniu-java-amount-handling: 金额处理/分转元/元转分/Long金额/money/fen/BigDecimal金额/金额字段
- leniu-java-concurrent: 并发/CompletableFuture/线程池/ThreadPool/并发安全/异步处理/synchronized
- leniu-java-entity: Entity实体类/VO视图对象/DTO数据传输/Param参数类/@TableName/@TableField/审计字段/字段映射
- leniu-java-export: 导出/Excel导出/异步导出/分页导出/@ExcelProperty/exportApi/数据导出
- leniu-java-logging: 日志/@Slf4j/log.info/log.error/log.debug/日志级别/logback/日志格式
- leniu-java-mq: 消息队列/MQ/MqUtil/@MqConsumer/延迟消息/消息重试/事务消息
- leniu-java-mybatis: MyBatis/MyBatisPlus/Mapper/LambdaQueryWrapper/XML映射/动态SQL/BaseMapper/@Select/resultMap
- leniu-java-report-query-param: 报表查询入参/Param类/分页参数/时间范围查询/ReportBaseParam/exportCols
- leniu-java-task: 定时任务/XXL-Job/@XxlJob/TenantLoader/任务调度/分布式定时
- leniu-java-total-line: 合计行/totalLine/报表合计/SUM合计/ReportBaseTotalVO/合计查询
- leniu-report-customization: 定制报表/汇总报表/report_order_info/report_order_detail/report_account_flow/退款汇总/消费金额统计/订单报表/流水报表
- leniu-report-standard-customization: 标准版报表/core-report/report_refund/report_refund_detail/经营分析/营业额分析/用户活跃度/菜品排行/操作员统计/账户日结/钱包消费汇总/商户消费汇总/ReportOrderConsumeService/ReportAccountConsumeService
- leniu-customization-location: 定制开发/定制代码位置/Dz前缀/leniu-yunshitang/dz_表名/定制仓库/覆盖Service/@Primary/迁移core文件/定制开始/定制结束/net.xnzn.yunshitang/wuhanxiehe定制/bootstrap-ext
- leniu-crud-development: CRUD/增删改查/新建模块/Business层/Service/Mapper/Controller/分页查询/LeRequest/PageDTO/PageVO/事务管理
- leniu-database-ops: 数据库/SQL/建表/双库/商户库/系统库/审计字段/crby/crtime/del_flag
- leniu-utils-toolkit: 工具类/BeanUtil/StrUtil/CollUtil/ObjectUtil/RedisUtil/JacksonUtil/LeBeanUtil
- leniu-error-handler: 异常处理/LeException/全局异常/参数校验/错误码/I18n/国际化/throw
- leniu-backend-annotations: @RequiresAuthentication/@RequiresGuest/@Validated/@NotNull/@Api/@ApiOperation/@ApiModelProperty/分组校验/InsertGroup/UpdateGroup
- leniu-api-development: API接口/Controller/RESTful/LeResult/LeResponse/LeRequest/接口开发/路由前缀
- leniu-brainstorm: 头脑风暴/方案设计/怎么设计/创意探索/功能规划/可行性分析
- leniu-architecture-design: 架构设计/双库架构/商户库/系统库/pigx框架/四层架构/模块划分/Business层
- leniu-code-patterns: 代码禁令/代码规范/命名规范/代码风格/Git提交规范/包结构/禁止写法/审计字段规范/delFlag/crby
- leniu-data-permission: 多租户/数据权限/@UseSystem/Executors.doInTenant/readInSystem/TenantContextHolder/MERCHANT-ID/双库隔离/数据源切换
- leniu-redis-cache: Redis/缓存/RedisUtil/分布式锁/RLock/getLock/setNx/ZSet/限流/缓存击穿
- leniu-security-guard: 安全认证/SQL注入防护/XSS防护/数据脱敏/SM4加密/接口安全/限流
- leniu-mealtime: 餐次/mealtime/mealtimeType/早餐/午餐/晚餐/下午茶/夜宵/AllocMealtimeTypeEnum
- leniu-marketing-price-rule-customizer: 营销计费/计价规则/RulePriceHandler/RulePriceEnum/折扣规则/满减规则/限额规则/补贴规则
- leniu-marketing-recharge-rule-customizer: 营销充值/充值规则/RuleRechargeHandler/RuleRechargeEnum/满赠规则/充值赠送/管理费规则
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
