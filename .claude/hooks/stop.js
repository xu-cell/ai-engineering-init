#!/usr/bin/env node
/**
 * Stop Hook - Claude 回答结束时触发
 * 功能: nul 文件清理 + 代码审查提示 + 智能完成通知（音效/系统通知/TTS）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 清理可能误创建的 nul 文件（Windows 下 > nul 可能创建该文件）
const findAndDeleteNul = (dir, depth = 0) => {
  if (depth > 5) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === 'nul') {
        fs.unlinkSync(fullPath);
        console.error(`🧹 已清理: ${fullPath}`);
      } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findAndDeleteNul(fullPath, depth + 1);
      }
    }
  } catch {
    // 访问失败时静默忽略
  }
};
findAndDeleteNul(process.cwd());

// 代码审查提示：检测是否有未提交的代码变更
try {
  const cwd = process.cwd();
  const diff = execSync('git diff --name-only HEAD 2>/dev/null || true', { cwd, encoding: 'utf8' }).trim();
  const staged = execSync('git diff --cached --name-only 2>/dev/null || true', { cwd, encoding: 'utf8' }).trim();
  const allChanged = [diff, staged].filter(Boolean).join('\n');

  if (allChanged) {
    // 检查是否有业务代码变更（Java/XML/SQL/Vue/JS 等）
    const codeExtensions = /\.(java|xml|sql|vue|js|ts|jsx|tsx|py|go|rs|kt)$/i;
    const changedFiles = allChanged.split('\n').filter(f => codeExtensions.test(f));

    if (changedFiles.length > 0) {
      console.error(`\n💡 检测到 ${changedFiles.length} 个代码文件变更，建议执行代码审查：`);
      console.error(`   → 输入 "review" 或 "审查代码" 使用 code-reviewer 进行规范检查\n`);
    }
  }
} catch {
  // git 不可用或非 git 仓库，静默跳过
}

// 执行智能通知
require('./lib/notify.js').run(process.cwd())
  .then(() => process.exit(0))
  .catch(() => process.exit(0));
