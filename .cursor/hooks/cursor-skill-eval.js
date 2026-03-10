#!/usr/bin/env node
/**
 * beforeSubmitPrompt Hook - 强制技能评估 (Cursor 版本)
 * 功能: 开发场景下，检测用户意图并注入相关技能文档引导
 *
 * Cursor 与 Claude 的差异:
 * - Claude 用 Skill() 工具调用技能
 * - Cursor 通过读取 .cursor/skills/[name]/SKILL.md 获取技能知识
 */

const fs = require('fs');
const path = require('path');

// 项目根目录：__dirname 是 .cursor/hooks/，向上两级
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

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
  process.exit(0);
}

// 技能关键词映射（技能名 → 触发关键词列表）
const skillMap = [
  // ========== leniu 专项技能 ==========
  {
    name: 'leniu-crud-development',
    keywords: ['leniu-CRUD', 'leniu-增删改查', 'leniu-新建模块', 'leniu-Entity', 'leniu-Service',
      'leniu-Mapper', 'leniu-Controller', 'LeRequest', 'PageDTO', 'net.xnzn', 'leniu-yunshitang',
      '云食堂CRUD', '云食堂模块']
  },
  {
    name: 'leniu-api-development',
    keywords: ['leniu-API', 'leniu-接口', 'LeResult', '云食堂接口', '云食堂API', 'leniu-RESTful',
      'leniu-Controller']
  },
  {
    name: 'leniu-database-ops',
    keywords: ['leniu-数据库', 'leniu-SQL', 'leniu-建表', 'leniu-双库', 'leniu-商户库', 'leniu-系统库',
      'leniu-Entity']
  },
  {
    name: 'leniu-java-entity',
    keywords: ['leniu-Entity', 'leniu-VO', 'leniu-DTO', 'leniu-Param', 'leniu-实体类',
      'leniu-@TableName', 'leniu-@TableField']
  },
  {
    name: 'leniu-java-mybatis',
    keywords: ['leniu-MyBatis', 'leniu-MyBatisPlus', 'leniu-Mapper', 'leniu-LambdaQueryWrapper',
      'leniu-XML', 'leniu-BaseMapper']
  },
  {
    name: 'leniu-java-code-style',
    keywords: ['leniu-代码风格', 'leniu-命名规范', 'leniu-类命名', 'leniu-方法命名', 'leniu-包结构']
  },
  {
    name: 'leniu-java-concurrent',
    keywords: ['leniu-并发', 'leniu-CompletableFuture', 'leniu-线程池', 'leniu-分布式锁']
  },
  {
    name: 'leniu-java-export',
    keywords: ['leniu-导出', 'leniu-Export', 'leniu-Excel导出', 'leniu-异步导出', 'leniu-@ExcelProperty']
  },
  {
    name: 'leniu-java-logging',
    keywords: ['leniu-日志', 'leniu-@Slf4j', 'leniu-log.info', 'leniu-log.error']
  },
  {
    name: 'leniu-java-mq',
    keywords: ['leniu-消息队列', 'leniu-MQ', 'leniu-MqUtil', 'leniu-@MqConsumer', 'leniu-延迟消息']
  },
  {
    name: 'leniu-java-task',
    keywords: ['leniu-定时任务', 'leniu-XXL-Job', 'leniu-@XxlJob', 'leniu-TenantLoader']
  },
  {
    name: 'leniu-java-total-line',
    keywords: ['leniu-合计行', 'leniu-totalLine', 'leniu-报表合计', 'leniu-SUM合计', 'leniu-ReportBaseTotalVO']
  },
  {
    name: 'leniu-java-amount-handling',
    keywords: ['leniu-金额', 'leniu-分转元', 'leniu-元转分', 'leniu-Long金额', 'amountFen', 'amountYuan']
  },
  {
    name: 'leniu-java-report-query-param',
    keywords: ['leniu-报表查询', 'leniu-Param类', 'leniu-分页参数', 'leniu-时间范围', 'ReportBaseParam']
  },
  {
    name: 'leniu-error-handler',
    keywords: ['leniu-异常', 'leniu-LeException', 'leniu-全局异常', 'leniu-参数校验', 'leniu-错误码',
      'leniu-I18n', 'leniu-国际化', 'LeException']
  },
  {
    name: 'leniu-backend-annotations',
    keywords: ['leniu-注解', 'leniu-@RequiresAuthentication', 'leniu-@RequiresGuest',
      'leniu-@Validated', 'leniu-@Api', 'leniu-@ApiOperation', 'leniu-分组校验']
  },
  {
    name: 'leniu-utils-toolkit',
    keywords: ['leniu-工具类', 'leniu-BeanUtil', 'leniu-StrUtil', 'leniu-CollUtil',
      'leniu-RedisUtil', 'leniu-JacksonUtil', 'leniu-LeBeanUtil']
  },
  {
    name: 'leniu-architecture-design',
    keywords: ['leniu-架构', '云食堂架构', '双库架构', '商户库', '系统库', 'pigx框架']
  },
  {
    name: 'leniu-security-guard',
    keywords: ['leniu-安全', 'leniu-认证', 'leniu-授权', 'leniu-权限', 'leniu-加密']
  },
  {
    name: 'leniu-redis-cache',
    keywords: ['leniu-缓存', 'leniu-Redis', 'leniu-@Cacheable', 'leniu-@CacheEvict', 'leniu-RedisUtil']
  },
  {
    name: 'leniu-data-permission',
    keywords: ['leniu-数据权限', 'leniu-DataScope', 'leniu-行级权限', '部门权限']
  },
  {
    name: 'leniu-code-patterns',
    keywords: ['leniu-规范', 'leniu-禁止', 'leniu-命名', 'leniu-Git提交', 'leniu-代码风格']
  },
  {
    name: 'leniu-marketing-price-rule-customizer',
    keywords: ['营销计费', '计费规则', 'price规则', '折扣规则', '满减规则']
  },
  {
    name: 'leniu-marketing-recharge-rule-customizer',
    keywords: ['营销充值', '充值规则', 'recharge规则', '满赠规则']
  },
  {
    name: 'leniu-mealtime',
    keywords: ['餐次', '早餐', '午餐', '下午茶', '晚餐', '夜宵', 'mealtimeTypes']
  },
  {
    name: 'leniu-customization-location',
    keywords: ['定制开发', '定制代码位置', 'Dz前缀', 'leniu-yunshitang', 'dz_表名', '定制仓库',
      '覆盖Service', '@Primary', '迁移core文件', '定制开始', '定制结束', 'net.xnzn.yunshitang',
      'wuhanxiehe定制', 'bootstrap-ext']
  },

  // ========== OpenSpec 工作流 ==========
  {
    name: 'openspec-new-change',
    keywords: ['新建变更', '开始新功能', 'opsx:new', 'openspec new', '创建变更']
  },
  {
    name: 'openspec-ff-change',
    keywords: ['快速推进', '快速生成所有制品', 'opsx:ff', 'openspec ff', 'fast-forward']
  },
  {
    name: 'openspec-apply-change',
    keywords: ['实现任务', '开始实现', 'opsx:apply', 'openspec apply', '执行变更']
  },
  {
    name: 'openspec-continue-change',
    keywords: ['继续变更', '创建下一个制品', 'opsx:continue', 'openspec continue']
  },
  {
    name: 'openspec-archive-change',
    keywords: ['归档变更', '完成变更', 'opsx:archive', 'openspec archive', '归档']
  },
  {
    name: 'openspec-bulk-archive-change',
    keywords: ['批量归档', '批量完成', 'opsx:bulk-archive']
  },
  {
    name: 'openspec-explore',
    keywords: ['探索模式', '思维伙伴', 'opsx:explore', 'openspec explore', '探索问题']
  },
  {
    name: 'openspec-sync-specs',
    keywords: ['同步规格', '同步spec', 'opsx:sync', 'openspec sync', 'delta同步']
  },
  {
    name: 'openspec-verify-change',
    keywords: ['验证变更', '检查实现', 'opsx:verify', 'openspec verify', '验证规格']
  },

  // ========== 流程编排技能 ==========
  {
    name: 'analyze-requirements',
    keywords: ['分析需求', '需求分析', '原型分析', '需求拆解', '分析原型图', 'Axure原型', '原型截图']
  },
  {
    name: 'fix-bug',
    keywords: ['修复bug', 'fix bug', '排查修复', '线上修复', 'bug修复', '修复Bug', '修bug']
  },

  // ========== 通用技能 ==========
  {
    name: 'auto-test',
    keywords: ['自动测试', 'auto-test', '接口测试', 'API测试', 'Hurl', '测试报告', '回归测试']
  },
  {
    name: 'crud-development',
    keywords: ['CRUD', '增删改查', 'Entity', 'Service', 'Controller', '业务模块开发']
  },
  {
    name: 'api-development',
    keywords: ['API设计', 'RESTful', '接口规范', 'Swagger', 'OpenAPI']
  },
  {
    name: 'database-ops',
    keywords: ['数据库', 'SQL', '建表', '字典', '菜单配置']
  },
  {
    name: 'backend-annotations',
    keywords: ['注解', '限流', '防重复', '脱敏', '加密注解', 'AOP注解']
  },
  {
    name: 'utils-toolkit',
    keywords: ['工具类', '对象转换', '字符串工具', '集合工具', '日期工具', 'BeanUtils']
  },
  {
    name: 'file-oss-management',
    keywords: ['文件上传', 'OSS', '云存储', 'MinIO', '预签名URL']
  },
  {
    name: 'bug-detective',
    keywords: ['Bug', '报错', '异常', '不工作', '500', '404', 'NullPointerException']
  },
  {
    name: 'error-handler',
    keywords: ['异常处理', '全局异常', '业务异常', '参数校验异常', '@RestControllerAdvice']
  },
  {
    name: 'performance-doctor',
    keywords: ['性能', '慢查询', '优化', '接口慢', 'N+1', '批量优化']
  },
  {
    name: 'data-permission',
    keywords: ['数据权限', '@DataPermission', 'DataScope', '行级权限']
  },
  {
    name: 'security-guard',
    keywords: ['安全', '认证授权', '加密', 'XSS', 'SQL注入', '数据脱敏', 'Spring Security']
  },
  {
    name: 'architecture-design',
    keywords: ['架构设计', '模块划分', '重构', '技术栈']
  },
  {
    name: 'code-patterns',
    keywords: ['规范', '禁止', '命名规范', 'Git提交', '代码风格']
  },
  {
    name: 'project-navigator',
    keywords: ['项目结构', '文件在哪', '定位代码', '模块职责']
  },
  {
    name: 'git-workflow',
    keywords: ['git', 'commit', '提交', '分支', '合并', 'push', 'pull', '冲突']
  },
  {
    name: 'task-tracker',
    keywords: ['任务跟踪', '记录进度', '继续任务', '跨会话']
  },
  {
    name: 'tech-decision',
    keywords: ['技术选型', '方案对比', '哪个好', '优缺点']
  },
  {
    name: 'brainstorm',
    keywords: ['头脑风暴', '方案设计', '怎么设计', '有什么办法', '创意']
  },
  {
    name: 'workflow-engine',
    keywords: ['工作流', '审批流', 'Flowable', '流程定义', 'WarmFlow']
  },
  {
    name: 'test-development',
    keywords: ['单元测试', '@Test', 'JUnit5', 'Mockito', '集成测试']
  },
  {
    name: 'json-serialization',
    keywords: ['JSON', '序列化', '反序列化', 'JsonUtils', '日期格式', 'BigDecimal精度']
  },
  {
    name: 'redis-cache',
    keywords: ['Redis', '缓存', '@Cacheable', '@CacheEvict', 'RedisUtils', '分布式锁', 'RLock']
  },
  {
    name: 'scheduled-jobs',
    keywords: ['定时任务', '@Scheduled', 'Quartz', 'XXL-Job', '任务调度', '重试机制']
  },
  {
    name: 'websocket-sse',
    keywords: ['WebSocket', 'SSE', '实时推送', '消息通知', '在线状态', '双向通信']
  },
  {
    name: 'sms-mail',
    keywords: ['短信', '邮件', 'SMS', '验证码', '通知', 'MailUtils', '邮件发送']
  },
  {
    name: 'social-login',
    keywords: ['第三方登录', '微信登录', 'QQ登录', 'OAuth', 'JustAuth', '扫码登录']
  },
  {
    name: 'tenant-management',
    keywords: ['多租户', '租户隔离', 'tenantId', '跨租户', 'SaaS', '数据隔离']
  },
  {
    name: 'ui-pc',
    keywords: ['Element UI', '前端组件', 'el-table', 'el-form', '管理页面']
  },
  {
    name: 'store-pc',
    keywords: ['Vuex', 'store', 'mapState', 'mapActions', '状态管理']
  },
  {
    name: 'add-skill',
    keywords: ['添加技能', '创建技能', '新技能', '技能开发', '写技能', 'SKILL.md', '新增skill']
  },
  {
    name: 'banana-image',
    keywords: ['生成图片', 'AI图片', '产品图', '海报', '缩略图', '4K图片', '高清图', '制作图片', '/image']
  },
  {
    name: 'lanhu-design',
    keywords: ['蓝湖', 'lanhu', '设计稿', '蓝湖链接', '设计图', '切图', 'lanhuapp']
  },
  {
    name: 'codex-code-review',
    keywords: ['代码审查', 'code review', 'review代码', '代码检查', 'codex审查']
  },
  {
    name: 'collaborating-with-codex',
    keywords: ['codex协作', '委托codex', 'openai codex', 'codex分析', '多模型协作', '让codex']
  },
  {
    name: 'collaborating-with-gemini',
    keywords: ['gemini协作', '委托gemini', 'google gemini', 'gemini分析', '让gemini', 'gemini前端']
  },
  {
    name: 'leniu-brainstorm',
    keywords: ['leniu-头脑风暴', '云食堂方案', '云食堂设计', '云食堂功能规划', 'leniu-方案设计',
      '云食堂怎么设计', '云食堂可行性']
  },
  {
    name: 'leniu-report-customization',
    keywords: ['定制报表', 'report_order_info', 'report_order_detail', 'report_account_flow',
      '退款汇总', '消费金额统计', '订单报表', '流水报表', '汇总报表']
  },
  {
    name: 'leniu-report-standard-customization',
    keywords: ['标准版报表', 'core-report', 'report_refund', 'report_refund_detail',
      '经营分析', '营业额分析', '用户活跃度', '菜品排行', '操作员统计', '账户日结',
      'ReportOrderConsumeService', 'ReportAccountConsumeService']
  },
  {
    name: 'mysql-debug',
    keywords: ['mysql查询', '查数据库', '查表', '执行SQL', '数据库排查', '验证数据',
      '数据库调试', 'db查询', 'mysql调试', '直接查库']
  },
  {
    name: 'openspec-onboard',
    keywords: ['openspec入门', 'opsx:onboard', 'openspec onboard', 'openspec教程',
      'openspec新手', '学习openspec工作流']
  },
  {
    name: 'loki-log-query',
    keywords: ['Loki', '日志查询', '线上日志', 'Loki日志', '日志排查', 'LogQL']
  },
  {
    name: 'yunxiao-task-management',
    keywords: ['云效', '任务管理', '需求管理', '云效任务', 'yunxiao', '迭代管理']
  },
  {
    name: 'crud',
    keywords: ['快速CRUD', 'CRUD生成', '脚手架生成', '/crud']
  },
  {
    name: 'dev',
    keywords: ['开发新功能', '功能开发', '/dev', '新建功能']
  },
  {
    name: 'check',
    keywords: ['代码检查', '规范检查', '/check', '代码审查规范']
  },
  {
    name: 'start',
    keywords: ['项目启动', '初始化项目', '/start', '开始项目']
  },
  {
    name: 'next',
    keywords: ['下一步', '接下来', '/next', '继续做什么']
  },
  {
    name: 'progress',
    keywords: ['进度查看', '当前进度', '/progress', '任务进度']
  },
  {
    name: 'sync',
    keywords: ['同步代码', '代码同步', '/sync', '同步分支']
  },
  {
    name: 'sync-back-merge',
    keywords: ['回合并', 'sync back merge', '主分支同步', '回合主分支']
  },
  {
    name: 'init-docs',
    keywords: ['初始化文档', '项目文档', '生成文档', '/init-docs']
  },
  {
    name: 'add-todo',
    keywords: ['添加待办', '新增TODO', '任务添加', '/add-todo']
  },
  {
    name: 'update-status',
    keywords: ['更新状态', '状态变更', '修改状态', '/update-status']
  },
  {
    name: 'skill-creator',
    keywords: ['创建技能', '技能模板', '技能脚手架', 'skill scaffold', '新建skill']
  }
];

// 匹配技能
const promptLower = prompt.toLowerCase();
const matchedSkills = [];

for (const skill of skillMap) {
  const matched = skill.keywords.some(kw =>
    promptLower.includes(kw.toLowerCase())
  );
  if (matched) {
    matchedSkills.push(skill.name);
  }
}

// 无匹配技能，直接通过
if (matchedSkills.length === 0) {
  process.exit(0);
}

// 构建技能文档路径列表
const skillPaths = matchedSkills.map(name => path.join(PROJECT_ROOT, '.cursor', 'skills', name, 'SKILL.md'));

const skillList = matchedSkills.map((name, i) => `- **${name}**: \`${skillPaths[i]}\``).join('\n');

const injectedPrompt = `${prompt}

---
[系统提示] 检测到以下匹配技能，**请先用 Read 工具读取对应 SKILL.md 文件，再回答**：
${skillList}

执行顺序：① 读取 SKILL.md → ② 理解规范 → ③ 实现功能`;

// 策略1：尝试修改 prompt（若 Cursor 支持则直接生效，是最理想方案）
// 策略2：fallback 到 user_message 软提示（会打断用户但能传达信息）
// 策略3：rules/skill-activation.mdc 兜底（alwaysApply 永久生效，不依赖 hook）
console.log(JSON.stringify({
  continue: true,
  prompt: injectedPrompt,           // 策略1：修改 prompt（测试 Cursor 是否支持）
  user_message: skillList           // 策略2：fallback（continue:true 时可能作为备注显示）
}));
process.exit(0);
