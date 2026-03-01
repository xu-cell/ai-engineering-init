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

  // ========== 通用技能 ==========
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
    keywords: ['@RateLimiter', '@DataScope', '@RepeatSubmit', '@Sensitive', '@EncryptField']
  },
  {
    name: 'utils-toolkit',
    keywords: ['MapstructUtils', 'StreamUtils', 'TreeBuildUtils', 'DateUtils']
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
    keywords: ['异常处理', 'ServiceException', '全局异常', '参数校验异常']
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
    keywords: ['Sa-Token', '认证授权', '加密', 'XSS', 'SQL注入', '数据脱敏']
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
    keywords: ['定时任务', 'SnailJob', '@Scheduled', '@JobExecutor', '任务调度', '重试机制']
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
    keywords: ['多租户', '租户隔离', 'TenantEntity', 'TenantHelper', 'tenantId', '跨租户', 'SaaS']
  },
  {
    name: 'ui-pc',
    keywords: ['Element UI', '前端组件', 'el-table', 'el-form', '管理页面']
  },
  {
    name: 'store-pc',
    keywords: ['Vuex', 'store', 'mapState', 'mapActions', '状态管理']
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
const skillPaths = matchedSkills.map(name => `.cursor/skills/${name}/SKILL.md`);

const instructions = `## 技能知识库引导

检测到当前任务匹配以下技能，**请在回答前阅读对应技能文档**：

${matchedSkills.map((name, i) => `- **${name}**: \`${skillPaths[i]}\``).join('\n')}

### 执行步骤

1. **阅读技能文档**（必须）：依次读取上述 SKILL.md 文件获取规范指导
2. **理解项目规范**：根据文档中的规范、禁令和示例代码制定实现方案
3. **实现功能**：严格按照技能文档的规范实现，不得违反禁令

> 注意：SKILL.md 文档包含本项目特定的实现规范，必须优先参考，不得使用通用写法替代。`;

console.log(instructions);
process.exit(0);
