#!/usr/bin/env node
/**
 * preToolUse Hook - 工具使用前触发 (Cursor 版本)
 * 功能:
 * 1. 阻止危险命令
 * 2. 提醒敏感操作
 * 3. 自动修正常见错误
 *
 * Cursor vs Claude 差异:
 * - Cursor Shell 工具名: "Shell"（Claude 是 "Bash"）
 * - 输出格式兼容: { decision: "block", reason: "..." }
 */

const fs = require('fs');

// 从 stdin 读取输入
let inputData = '';
try {
  inputData = fs.readFileSync(0, 'utf8');
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let input;
try {
  input = JSON.parse(inputData);
} catch {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

const toolName = input.tool_name || input.toolName || '';
const toolInput = input.tool_input || input.toolInput || {};

// Shell/Bash 命令检查（兼容 Cursor 的 "Shell" 和 Claude 的 "Bash"）
if (toolName === 'Shell' || toolName === 'Bash') {
  const command = toolInput.command || toolInput.cmd || '';

  // 检测 > nul 错误用法（Windows 会创建名为 nul 的文件）
  const nulPattern = /[12]?\s*>\s*nul\b/i;
  if (nulPattern.test(command)) {
    const output = {
      decision: 'block',
      reason: `🚫 **命令被阻止**：检测到 \`> nul\`\n\n**问题**：Windows 下某些 Shell 会创建名为 \`nul\` 的文件\n\n**解决方案**：\n- 移除输出重定向，或\n- 使用 \`> /dev/null 2>&1\`（跨平台）\n\n原命令: \`${command}\``
    };
    console.log(JSON.stringify(output));
    process.exit(2);
  }

  // 危险命令模式 - 直接阻止
  const dangerousPatterns = [
    { pattern: /rm\s+-rf\s+\/(?!\w)/, reason: '删除根目录' },
    { pattern: /rm\s+-rf\s+\*/, reason: '删除所有文件' },
    { pattern: /drop\s+database/i, reason: '删除数据库' },
    { pattern: /truncate\s+table/i, reason: '清空表数据' },
    { pattern: /git\s+push\s+--force\s+(origin\s+)?(main|master)/i, reason: '强制推送到主分支' },
    { pattern: /git\s+reset\s+--hard\s+HEAD~\d+/, reason: '硬重置多个提交' },
    { pattern: />\s*\/dev\/sd[a-z]/, reason: '直接写入磁盘设备' },
    { pattern: /mkfs\./, reason: '格式化文件系统' },
    { pattern: /:(){ :|:& };:/, reason: 'Fork 炸弹' },
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(command)) {
      const output = {
        decision: 'block',
        reason: `⚠️ **危险操作被阻止**\n\n命令: \`${command}\`\n原因: ${reason}\n\n如确需执行，请手动在终端运行`
      };
      console.log(JSON.stringify(output));
      process.exit(2);
    }
  }

  // 警告但不阻止的命令
  const warningPatterns = [
    { pattern: /git\s+push\s+--force/, warning: 'Force push 可能覆盖他人代码' },
    { pattern: /npm\s+publish/, warning: '即将发布到 npm' },
    { pattern: /docker\s+system\s+prune/, warning: '将清理所有未使用的 Docker 资源' },
    { pattern: /brew\s+upgrade/, warning: '升级所有 Homebrew 包可能影响环境' },
  ];

  for (const { pattern, warning } of warningPatterns) {
    if (pattern.test(command)) {
      const output = {
        continue: true,
        systemMessage: `⚠️ **注意**: ${warning}`
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }
  }
}

// Write 工具检查
if (toolName === 'Write' || toolName === 'CreateFile' || toolName === 'EditFile') {
  const filePath = toolInput.file_path || toolInput.path || toolInput.filePath || '';

  // 检查是否写入敏感配置文件
  const sensitiveFiles = [
    '.env.production',
    'application-prod.yml',
    'credentials.json',
    'secrets.json',
    '.env.prod'
  ];

  for (const sensitive of sensitiveFiles) {
    if (filePath.endsWith(sensitive)) {
      const output = {
        continue: true,
        systemMessage: `⚠️ **敏感文件**: 正在写入 \`${sensitive}\`\n\n请确保不要提交敏感信息到 Git`
      };
      console.log(JSON.stringify(output));
      process.exit(0);
    }
  }
}

// 默认：允许继续
console.log(JSON.stringify({ continue: true }));
process.exit(0);
