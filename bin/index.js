#!/usr/bin/env node
/**
 * AI Engineering 初始化 / 更新 CLI
 * 用法:
 *   npx ai-engineering-init              # 交互式初始化
 *   npx ai-engineering-init --tool claude
 *   npx ai-engineering-init --tool all
 *   npx ai-engineering-init update       # 自动检测已安装工具并更新
 *   npx ai-engineering-init update --tool claude
 *   npx ai-engineering-init global       # 全局安装（对所有项目生效）
 *   npx ai-engineering-init global --tool claude
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
const os       = require('os');
const readline = require('readline');

// ── ANSI 颜色（Windows CMD/PowerShell 兼容）────────────────────────────────
// Windows Terminal 设置 WT_SESSION，ConEmu/Cmder 设置 COLORTERM，VSCode 设置 TERM_PROGRAM
const supportsColor = !!process.stdout.isTTY && (
  process.platform !== 'win32' ||
  !!process.env.WT_SESSION ||
  !!process.env.COLORTERM ||
  process.env.TERM_PROGRAM === 'vscode'
);
const ESC = supportsColor ? {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
} : Object.fromEntries(
  ['reset','bold','red','green','yellow','blue','cyan','magenta'].map(k => [k, ''])
);
const fmt = (color, text) => `${ESC[color]}${text}${ESC.reset}`;

// ── 版本 ───────────────────────────────────────────────────────────────────
const PKG_VERSION = require('../package.json').version;

// ── Banner ─────────────────────────────────────────────────────────────────
console.log('');
console.log(fmt('blue', fmt('bold', '┌─────────────────────────────────────────┐')));
console.log(fmt('blue', fmt('bold', `│      AI Engineering 工具  v${PKG_VERSION}        │`)));
console.log(fmt('blue', fmt('bold', '└─────────────────────────────────────────┘')));
console.log('');

// ── 参数解析 ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let command   = '';   // 'update' | 'global' | 'sync-back' | ''
let tool      = '';
let targetDir = process.cwd();
let force     = false;
let skillFilter = '';  // sync-back --skill <名称>
let submitIssue = false; // sync-back --submit

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case 'update':
      command = 'update';
      break;
    case 'global':
      command = 'global';
      break;
    case 'init':
      command = 'init';
      break;
    case 'sync-back':
      command = 'sync-back';
      break;
    case 'config':
      command = 'config';
      break;
    case 'mcp':
      command = 'mcp';
      break;
    case '--tool': case '-t':
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        console.error(fmt('red', `错误：${arg} 需要一个值（claude | cursor | codex | all）`));
        process.exit(1);
      }
      tool = args[++i];
      break;
    case '--dir': case '-d':
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        console.error(fmt('red', `错误：${arg} 需要一个目录路径`));
        process.exit(1);
      }
      targetDir = path.resolve(args[++i]);
      break;
    case '--force': case '-f':
      force = true;
      break;
    case '--skill': case '-s':
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        console.error(fmt('red', `错误：${arg} 需要一个技能名称`));
        process.exit(1);
      }
      skillFilter = args[++i];
      break;
    case '--submit':
      submitIssue = true;
      break;
    case '--help': case '-h':
      printHelp();
      process.exit(0);
      break;
    default:
      // 拒绝未知选项，避免静默忽略导致行为不符预期
      if (arg.startsWith('-')) {
        console.error(fmt('red', `错误：未知选项 "${arg}"，运行 --help 查看用法`));
        process.exit(1);
      }
      break;
  }
}

function printHelp() {
  console.log(`用法: ${fmt('bold', 'npx ai-engineering-init')} [命令] [选项]\n`);
  console.log('命令:');
  console.log(`  ${fmt('bold', 'init')}             交互式初始化（安装到当前项目目录）`);
  console.log(`  ${fmt('bold', 'update')}           更新已安装的框架文件（跳过用户自定义文件）`);
  console.log(`  ${fmt('bold', 'global')}           全局安装到 ~/.claude / ~/.cursor 等，对所有项目生效`);
  console.log(`  ${fmt('bold', 'sync-back')}        对比本地技能修改，生成 diff 或提交 GitHub Issue`);
  console.log(`  ${fmt('bold', 'config')}           初始化数据库配置文件（.claude/mysql-config.json）`);
  console.log(`  ${fmt('bold', 'mcp')}              MCP 服务器管理（安装/卸载/状态检查）\n`);
  console.log(`无命令时显示交互式主菜单。\n`);
  console.log('选项:');
  console.log('  --tool,  -t <工具>   指定工具: claude | cursor | codex | all');
  console.log('  --dir,   -d <目录>   目标目录（默认：当前目录，仅 init/update 有效）');
  console.log('  --force, -f          强制覆盖（init 时覆盖已有文件；update/global 时同时更新保留文件）');
  console.log('  --skill, -s <技能>   sync-back 时只对比指定技能');
  console.log('  --submit             sync-back 时自动创建 GitHub Issue（需要 gh CLI）');
  console.log('  --help,  -h          显示此帮助\n');
  console.log('示例:');
  console.log('  npx ai-engineering-init --tool claude');
  console.log('  npx ai-engineering-init --tool all --dir /path/to/project');
  console.log('  npx ai-engineering-init update               # 自动检测已安装工具');
  console.log('  npx ai-engineering-init update --tool claude # 只更新 Claude');
  console.log('  npx ai-engineering-init update --force       # 强制更新，包括保留文件');
  console.log('  npx ai-engineering-init global               # 全局安装所有工具');
  console.log('  npx ai-engineering-init global --tool claude # 只全局安装 Claude');
  console.log('  npx ai-engineering-init sync-back                        # 扫描所有已安装工具');
  console.log('  npx ai-engineering-init sync-back --tool claude          # 只扫描 Claude');
  console.log('  npx ai-engineering-init sync-back --skill bug-detective  # 只对比指定技能');
  console.log('  npx ai-engineering-init sync-back --skill bug-detective --submit # 提交 Issue\n');
}

// ── 工具定义（init 用）────────────────────────────────────────────────────
const TOOLS = {
  claude: {
    label: 'Claude Code',
    files: [
      { src: '.claude',   dest: '.claude',   label: '.claude/ 目录', isDir: true },
      { src: 'CLAUDE.md', dest: 'CLAUDE.md', label: 'CLAUDE.md'                 },
    ],
  },
  cursor: {
    label: 'Cursor',
    files: [
      { src: '.cursor',   dest: '.cursor',   label: '.cursor/ 目录', isDir: true },
    ],
  },
  codex: {
    label: 'OpenAI Codex',
    files: [
      { src: '.codex',    dest: '.codex',    label: '.codex/ 目录',  isDir: true },
      { src: 'AGENTS.md', dest: 'AGENTS.md', label: 'AGENTS.md'                 },
    ],
  },
};

// ── 更新规则（update 用）──────────────────────────────────────────────────
// update:   框架文件，从本机安装版本覆盖
// preserve: 用户自定义文件，默认跳过（--force 时强制覆盖）
const UPDATE_RULES = {
  claude: {
    label: 'Claude Code',
    detect: '.claude',
    update: [
      { src: '.claude/skills',                dest: '.claude/skills',                label: 'Skills（技能库）',    isDir: true },
      { src: '.claude/commands',              dest: '.claude/commands',              label: 'Commands（快捷命令）', isDir: true },
      { src: '.claude/agents',               dest: '.claude/agents',               label: 'Agents（子代理）',    isDir: true },
      { src: '.claude/hooks',                dest: '.claude/hooks',                label: 'Hooks（钩子脚本）',   isDir: true },
      { src: '.claude/templates',            dest: '.claude/templates',            label: 'Templates',          isDir: true },
      { src: '.claude/audio',                dest: '.claude/audio',                label: 'Audio（完成音效）',   isDir: true },
      { src: '.claude/framework-config.json', dest: '.claude/framework-config.json', label: 'framework-config.json' },
    ],
    preserve: [
      { dest: '.claude/settings.json',        reason: '包含用户 MCP 配置和权限设置' },
      { dest: '.claude/notify-config.json',   reason: '包含用户通知偏好设置' },
      { dest: 'CLAUDE.md',                    reason: '包含项目自定义规范' },
    ],
  },
  cursor: {
    label: 'Cursor',
    detect: '.cursor',
    update: [
      { src: '.cursor/skills',     dest: '.cursor/skills',     label: 'Skills（技能库）',  isDir: true },
      { src: '.cursor/agents',     dest: '.cursor/agents',     label: 'Agents（子代理）',  isDir: true },
      { src: '.cursor/hooks',      dest: '.cursor/hooks',      label: 'Hooks（钩子脚本）', isDir: true },
      { src: '.cursor/audio',      dest: '.cursor/audio',      label: 'Audio（完成音效）', isDir: true },
      { src: '.cursor/hooks.json', dest: '.cursor/hooks.json', label: 'hooks.json（Hooks 配置）' },
    ],
    preserve: [
      { dest: '.cursor/mcp.json', reason: '包含用户 MCP 服务器配置' },
    ],
  },
  codex: {
    label: 'OpenAI Codex',
    detect: '.codex',
    update: [
      { src: '.codex/skills', dest: '.codex/skills', label: 'Skills（技能库）', isDir: true },
    ],
    preserve: [
      { dest: 'AGENTS.md', reason: '包含项目自定义 Agent 规范' },
    ],
  },
};

// ── 全局安装规则（global 用）─────────────────────────────────────────────
// 安装到 ~/.claude / ~/.cursor / ~/.codex，对当前用户所有项目生效
const HOME_DIR = os.homedir();

const GLOBAL_RULES = {
  claude: {
    label: 'Claude Code',
    targetDir: path.join(HOME_DIR, '.claude'),
    files: [
      { src: '.claude/skills',                dest: 'skills',                label: 'Skills（全局技能库）',          isDir: true },
      { src: '.claude/commands',              dest: 'commands',              label: 'Commands（全局命令）',          isDir: true },
      { src: '.claude/agents',               dest: 'agents',               label: 'Agents（全局子代理）',          isDir: true },
      { src: '.claude/hooks',                dest: 'hooks',                label: 'Hooks（全局钩子）',             isDir: true },
      { src: '.claude/audio',                dest: 'audio',                label: 'Audio（完成音效）',             isDir: true },
      { src: '.claude/framework-config.json', dest: 'framework-config.json', label: 'framework-config.json' },
      { src: '.claude/notify-config.json',   dest: 'notify-config.json',   label: 'notify-config.json（通知偏好）' },
      { src: '.claude/settings.json',         dest: 'settings.json',         label: 'settings.json（Hooks + MCP 配置）', merge: true, rewritePrefix: '.claude/' },
    ],
    preserve: [],
    note: `Skills/Commands/Hooks/Settings 已安装到 ~/.claude，对所有项目自动生效`,
  },
  cursor: {
    label: 'Cursor',
    targetDir: path.join(HOME_DIR, '.cursor'),
    files: [
      { src: '.cursor/skills',     dest: 'skills',     label: 'Skills（全局技能库）',        isDir: true },
      { src: '.cursor/agents',     dest: 'agents',     label: 'Agents（全局子代理）',        isDir: true },
      { src: '.cursor/hooks',      dest: 'hooks',      label: 'Hooks（全局钩子脚本）',       isDir: true },
      { src: '.cursor/audio',      dest: 'audio',      label: 'Audio（完成音效）',           isDir: true },
      { src: '.cursor/hooks.json', dest: 'hooks.json', label: 'hooks.json（Hooks 触发配置）', rewritePrefix: '.cursor/' },
      { src: '.cursor/mcp.json',   dest: 'mcp.json',   label: 'mcp.json（MCP 服务器配置）', merge: true },
    ],
    preserve: [],
    note: `Skills/Hooks/MCP 已安装到 ~/.cursor，重启 Cursor 后生效`,
  },
  codex: {
    label: 'OpenAI Codex',
    targetDir: path.join(HOME_DIR, '.codex'),
    files: [
      { src: '.codex/skills', dest: 'skills', label: 'Skills（全局技能库）', isDir: true },
    ],
    preserve: [],
    note: `Skills 已安装到 ~/.codex`,
  },
};

/** 合并 JSON 文件：将 src 的键补充到 dest，已有的键保留不覆盖 */
function mergeJsonFile(srcPath, destPath, label) {
  try {
    const srcData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    let destData = {};
    if (fs.existsSync(destPath)) {
      try { destData = JSON.parse(fs.readFileSync(destPath, 'utf8')); } catch { destData = {}; }
    }
    // 深度合并第一层对象键（如 mcpServers），已有的不覆盖
    let added = 0;
    for (const [key, value] of Object.entries(srcData)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!destData[key]) destData[key] = {};
        for (const [subKey, subValue] of Object.entries(value)) {
          if (!(subKey in destData[key])) {
            destData[key][subKey] = subValue;
            added++;
          }
        }
      } else if (!(key in destData)) {
        destData[key] = value;
        added++;
      }
    }
    fs.writeFileSync(destPath, JSON.stringify(destData, null, 2) + '\n');
    console.log(`  ${fmt('green', '✓')}  ${label} ${fmt('magenta', `(合并 +${added} 项，已有配置保留)`)}`);
    return added > 0 ? 1 : 0;
  } catch (e) {
    console.log(`  ${fmt('red', '✗')}  ${label} 合并失败: ${e.message}`);
    return -1;
  }
}

/** 将 JSON 中的相对路径重写为绝对路径（递归遍历所有字符串值） */
function rewritePaths(obj, relPrefix, absPrefix) {
  if (typeof obj === 'string') {
    // 匹配 "node .claude/hooks/xxx" 或 ".cursor/hooks/xxx" 等相对路径
    return obj.split(' ').map(part =>
      part.startsWith(relPrefix) ? part.replace(relPrefix, absPrefix) : part
    ).join(' ');
  }
  if (Array.isArray(obj)) return obj.map(item => rewritePaths(item, relPrefix, absPrefix));
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = rewritePaths(v, relPrefix, absPrefix);
    }
    return result;
  }
  return obj;
}

/** 重写已写入的 JSON 文件中的相对路径为绝对路径 */
function rewriteJsonFilePaths(filePath, relPrefix, absPrefix) {
  try {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data = rewritePaths(data, relPrefix, absPrefix);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  } catch { /* 静默失败 */ }
}

/** 全局安装单个工具 */
function globalInstallTool(toolKey) {
  const rule       = GLOBAL_RULES[toolKey];
  const globalDest = rule.targetDir;
  console.log(fmt('cyan', `[${rule.label}]`) + fmt('blue', ` → ${globalDest}`));

  let installed = 0, failed = 0;

  try { fs.mkdirSync(globalDest, { recursive: true }); } catch { /* 已存在忽略 */ }

  for (const item of rule.files) {
    const srcPath  = path.join(SOURCE_DIR, item.src);
    const destPath = path.join(globalDest, item.dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ${fmt('yellow', '⚠')}  ${item.label} 源文件不存在，跳过`);
      continue;
    }

    // merge 模式：合并 JSON 而非覆盖（保留用户已有配置）
    if (item.merge) {
      const result = mergeJsonFile(srcPath, destPath, item.label);
      // merge 后路径重写
      if (result >= 0 && item.rewritePrefix) {
        rewriteJsonFilePaths(destPath, item.rewritePrefix, globalDest + '/');
      }
      if (result >= 0) installed++; else failed++;
      continue;
    }

    if (fs.existsSync(destPath) && !force) {
      console.log(`  ${fmt('yellow', '⚠')}  ${item.label} 已存在，跳过（--force 可强制覆盖）`);
      continue;
    }
    try {
      if (item.isDir) {
        const n = copyDir(srcPath, destPath);
        console.log(`  ${fmt('green', '✓')}  ${item.label} ${fmt('magenta', `(${n} 个文件)`)}`);
        installed += n;
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        // 非 merge JSON 文件的路径重写
        if (item.rewritePrefix && destPath.endsWith('.json')) {
          try {
            let data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
            data = rewritePaths(data, item.rewritePrefix, globalDest + '/');
            fs.writeFileSync(destPath, JSON.stringify(data, null, 2) + '\n');
          } catch { fs.copyFileSync(srcPath, destPath); }
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
        console.log(`  ${fmt('green', '✓')}  ${item.label}`);
        installed++;
      }
    } catch (e) {
      console.log(`  ${fmt('red', '✗')}  ${item.label} 安装失败: ${e.message}`);
      failed++;
    }
  }

  for (const item of rule.preserve) {
    const destPath = path.join(globalDest, item.dest);
    if (fs.existsSync(destPath)) {
      console.log(`  ${fmt('yellow', '⊘')}  ${item.dest} 已保留 — ${item.reason}`);
    }
  }

  return { installed, failed };
}

/** global 命令主流程 */
function runGlobal(selectedTool) {
  const validKeys    = Object.keys(GLOBAL_RULES);
  const toolsToInstall = (!selectedTool || selectedTool === 'all')
    ? validKeys
    : [selectedTool];

  if (selectedTool && selectedTool !== 'all' && !GLOBAL_RULES[selectedTool]) {
    console.error(fmt('red', `无效工具: "${selectedTool}"。有效选项: claude | cursor | codex | all`));
    process.exit(1);
  }

  console.log(`  安装模式: ${fmt('green', fmt('bold', '全局安装（当前用户所有项目生效）'))}`);
  console.log(`  安装工具: ${fmt('bold', toolsToInstall.join(', '))}`);
  if (force) console.log(`  ${fmt('yellow', '⚠  --force 模式：强制覆盖已有文件')}`);
  console.log('');
  console.log(fmt('bold', '正在安装到系统目录...'));
  console.log('');

  let totalInstalled = 0, totalFailed = 0;
  for (let i = 0; i < toolsToInstall.length; i++) {
    const { installed, failed } = globalInstallTool(toolsToInstall[i]);
    totalInstalled += installed;
    totalFailed    += failed;
    if (i < toolsToInstall.length - 1) console.log('');
  }

  console.log('');
  console.log(fmt('green', fmt('bold', '✅ 全局安装完成！')));
  console.log('');
  console.log(`  ${fmt('green', `✓ 安装文件: ${totalInstalled} 个`)}`);
  if (totalFailed > 0) {
    console.log(`  ${fmt('red', `✗ 失败文件: ${totalFailed} 个`)}（请检查目录权限）`);
  }
  console.log('');
  console.log(fmt('cyan', '安装位置说明：'));
  for (const key of toolsToInstall) {
    const rule = GLOBAL_RULES[key];
    console.log(`  ${fmt('bold', rule.label + ':')} ${rule.note}`);
  }
  console.log('');
  console.log(fmt('yellow', '提示：项目级配置（.claude/ 等）优先级高于全局配置，两者可同时使用。'));
  console.log('');

  if (totalFailed > 0) process.exitCode = 1;
}

// ── 公共工具函数 ──────────────────────────────────────────────────────────
const SOURCE_DIR = path.join(__dirname, '..');

/** 安全判断路径是否为真实目录（避免 existsSync 将文件误判为已安装目录） */
function isRealDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

/** 递归复制目录，返回实际写入的文件数；单文件失败不中断整体 */
function copyDir(src, dest) {
  let written = 0;
  try {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  } catch (e) {
    console.log(`  ${fmt('red', '✗')}  无法创建目录 ${dest}: ${e.message}`);
    return written;
  }
  let entries;
  try {
    entries = fs.readdirSync(src);
  } catch (e) {
    console.log(`  ${fmt('red', '✗')}  无法读取源目录 ${src}: ${e.message}`);
    return written;
  }
  for (const entry of entries) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    try {
      fs.statSync(s).isDirectory() ? (written += copyDir(s, d)) : (fs.copyFileSync(s, d), written++);
    } catch (e) {
      console.log(`  ${fmt('yellow', '⚠')}  跳过文件 ${d}: ${e.message}`);
    }
  }
  return written;
}

/** 构建包含 --dir 上下文的提示命令（方便用户直接复制执行） */
function hintCmd(subCmd) {
  const dirPart = targetDir !== process.cwd() ? ` --dir "${targetDir}"` : '';
  return `npx ai-engineering-init${dirPart} ${subCmd}`;
}

// ── INIT 逻辑 ─────────────────────────────────────────────────────────────
function copyItem({ src, dest, label, isDir: srcIsDir }) {
  const srcPath  = path.join(SOURCE_DIR, src);
  const destPath = path.join(targetDir, dest);

  if (!fs.existsSync(srcPath)) {
    console.log(`  ${fmt('yellow', '⚠')}  ${label} 在源目录中不存在，跳过`);
    return;
  }
  if (fs.existsSync(destPath) && !force) {
    console.log(`  ${fmt('yellow', '⚠')}  ${label} 已存在，跳过（--force 可强制覆盖）`);
    return;
  }
  try {
    if (srcIsDir) {
      const n = copyDir(srcPath, destPath);
      console.log(`  ${fmt('green', '✓')}  ${label} ${fmt('magenta', `(${n} 个文件)`)}`);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ${fmt('green', '✓')}  ${label}`);
    }
  } catch (e) {
    console.log(`  ${fmt('red', '✗')}  ${label} 复制失败: ${e.message}`);
  }
}

function initTool(toolKey) {
  const t = TOOLS[toolKey];
  console.log(fmt('cyan', `[${t.label}]`));
  // 确保目标根目录存在（兼容 --dir 指向尚不存在的路径）
  try { fs.mkdirSync(targetDir, { recursive: true }); } catch { /* 已存在忽略 */ }
  for (const f of t.files) copyItem(f);
}

function showDoneHint(toolKey) {
  console.log('');
  console.log(fmt('green', fmt('bold', '✅ 初始化完成！')));
  console.log('');
  if (toolKey === 'claude' || toolKey === 'all') {
    console.log(fmt('cyan', 'Claude Code 使用：'));
    console.log(`  1. 按需修改 ${fmt('bold', 'CLAUDE.md')} 中的项目信息`);
    console.log(`  2. 在 Claude Code 中输入 ${fmt('bold', '/start')} 快速了解项目`);
    console.log(`  3. 输入 ${fmt('bold', '/dev')} 开始开发新功能`);
    console.log('');
  }
  if (toolKey === 'cursor' || toolKey === 'all') {
    console.log(fmt('cyan', 'Cursor 使用：'));
    console.log(`  1. 在 Cursor Chat 中输入 ${fmt('bold', '/')} 查看所有可用 Skills`);
    console.log(`  2. 输入 ${fmt('bold', '@技能名')} 手动调用指定技能`);
    console.log(`  3. 在 Settings → MCP 中确认 MCP 服务器已连接`);
    console.log('');
  }
  if (toolKey === 'codex' || toolKey === 'all') {
    console.log(fmt('cyan', 'Codex 使用：'));
    console.log(`  1. 按需修改 ${fmt('bold', 'AGENTS.md')} 中的项目说明`);
    console.log(`  2. 在 Codex 中使用 .codex/skills/ 下的技能`);
    console.log('');
  }
}

function run(selectedTool) {
  if (!Object.keys(TOOLS).concat('all').includes(selectedTool)) {
    console.error(fmt('red', `无效工具: "${selectedTool}"。有效选项: claude | cursor | codex | all`));
    process.exit(1);
  }
  console.log(`  目标目录: ${fmt('bold', targetDir)}`);
  console.log(`  初始化工具: ${fmt('bold', selectedTool)}`);
  console.log('');
  console.log(fmt('bold', '正在复制文件...'));
  console.log('');

  if (selectedTool === 'all') {
    Object.keys(TOOLS).forEach((k, i) => { if (i) console.log(''); initTool(k); });
  } else {
    initTool(selectedTool);
  }
  showDoneHint(selectedTool);
}

// ── UPDATE 逻辑 ───────────────────────────────────────────────────────────

/** 检测当前目录已安装了哪些工具（用 isRealDir 排除误判） */
function detectInstalledTools() {
  return Object.keys(UPDATE_RULES).filter(key =>
    isRealDir(path.join(targetDir, UPDATE_RULES[key].detect))
  );
}

/** 更新单个工具，返回 { updated, failed, preserved } 文件数 */
function updateTool(toolKey) {
  const rule = UPDATE_RULES[toolKey];
  console.log(fmt('cyan', `[${rule.label}]`));

  let updated = 0, failed = 0, preserved = 0;

  // 更新框架文件
  for (const item of rule.update) {
    const srcPath  = path.join(SOURCE_DIR, item.src);
    const destPath = path.join(targetDir, item.dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ${fmt('yellow', '⚠')}  ${item.label} 源文件不存在，跳过`);
      continue;
    }
    try {
      if (item.isDir) {
        const n = copyDir(srcPath, destPath);
        console.log(`  ${fmt('green', '✓')}  ${item.label} ${fmt('magenta', `(${n} 个文件)`)}`);
        updated += n;
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ${fmt('green', '✓')}  ${item.label}`);
        updated++;
      }
    } catch (e) {
      console.log(`  ${fmt('red', '✗')}  ${item.label} 失败: ${e.message}`);
      failed++;
    }
  }

  // 处理保留文件
  for (const item of rule.preserve) {
    const destPath = path.join(targetDir, item.dest);
    const srcPath  = path.join(SOURCE_DIR, item.dest);

    if (force) {
      if (fs.existsSync(srcPath)) {
        try {
          if (isRealDir(srcPath)) {
            const n = copyDir(srcPath, destPath);
            updated += n;
          } else {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(srcPath, destPath);
            updated++;
          }
          console.log(`  ${fmt('green', '✓')}  ${item.dest} ${fmt('yellow', '(强制更新)')}`);
        } catch (e) {
          console.log(`  ${fmt('red', '✗')}  ${item.dest} 强制更新失败: ${e.message}`);
          failed++;
        }
      }
    } else {
      const exists = fs.existsSync(destPath);
      const mark   = exists ? fmt('yellow', '已保留') : fmt('yellow', '不存在，跳过');
      console.log(`  ${fmt('yellow', '⊘')}  ${item.dest} ${mark} — ${item.reason}`);
      if (exists) preserved++;
    }
  }

  return { updated, failed, preserved };
}

/** update 命令主流程 */
function runUpdate(selectedTool) {
  console.log(`  目标目录: ${fmt('bold', targetDir)}`);
  console.log(`  本机版本: ${fmt('bold', `v${PKG_VERSION}`)}`);
  if (force) console.log(`  ${fmt('yellow', '⚠  --force 模式：将同时更新保留文件')}`);
  console.log('');

  let toolsToUpdate = [];

  if (!selectedTool || selectedTool === 'all') {
    // 无参数 或 all：只更新已检测到的工具（不主动创建新目录）
    toolsToUpdate = detectInstalledTools();
    if (toolsToUpdate.length === 0) {
      console.log(fmt('yellow', '⚠  当前目录未检测到已安装的 AI 工具配置。'));
      console.log(`   请先运行: ${fmt('bold', hintCmd('--tool claude'))}\n`);
      process.exit(1);
    }
    console.log(`  检测到已安装: ${fmt('bold', toolsToUpdate.join(', '))}`);
    if (selectedTool === 'all') {
      console.log(`  ${fmt('yellow', '提示')}：--tool all 只更新已安装工具，如需初始化新工具请用 --tool <name>`);
    }
  } else {
    // 指定单个工具
    if (!UPDATE_RULES[selectedTool]) {
      console.error(fmt('red', `无效工具: "${selectedTool}"。有效选项: claude | cursor | codex | all`));
      process.exit(1);
    }
    if (!isRealDir(path.join(targetDir, UPDATE_RULES[selectedTool].detect))) {
      console.log(fmt('yellow', `⚠  ${selectedTool} 未在当前目录初始化，请先运行：`));
      console.log(`   ${fmt('bold', hintCmd(`--tool ${selectedTool}`))}\n`);
      process.exit(1);
    }
    toolsToUpdate = [selectedTool];
  }

  console.log('');
  console.log(fmt('bold', '正在更新框架文件...'));
  console.log('');

  let totalUpdated = 0, totalFailed = 0, totalPreserved = 0;
  for (let i = 0; i < toolsToUpdate.length; i++) {
    const { updated, failed, preserved } = updateTool(toolsToUpdate[i]);
    totalUpdated   += updated;
    totalFailed    += failed;
    totalPreserved += preserved;
    if (i < toolsToUpdate.length - 1) console.log('');
  }

  console.log('');
  console.log(fmt('green', fmt('bold', '✅ 更新完成！')));
  console.log('');
  console.log(`  ${fmt('green', `✓ 更新文件: ${totalUpdated} 个`)}`);
  if (totalFailed > 0) {
    console.log(`  ${fmt('red', `✗ 失败文件: ${totalFailed} 个`)}（请检查目录权限）`);
  }
  if (totalPreserved > 0) {
    console.log(`  ${fmt('yellow', `⊘ 已保留文件: ${totalPreserved} 个`)}（--force 可强制更新）`);
  }
  console.log('');
  console.log(fmt('cyan', '提示：'));
  console.log('  重启 Claude Code / Cursor 使新技能生效');
  console.log(`  ${fmt('yellow', '注意')}：update 只新增/覆盖文件，不删除旧版本已移除的文件`);
  if (!force && totalPreserved > 0) {
    console.log(`  强制更新保留文件: ${fmt('bold', hintCmd('update --force'))}`);
  }
  console.log('');

  if (totalFailed > 0) process.exitCode = 1;
}

// ── SYNC-BACK 逻辑 ─────────────────────────────────────────────────────────

/** 技能目录名称到工具的映射 */
const SKILL_DIRS = {
  claude: '.claude/skills',
  cursor: '.cursor/skills',
  codex:  '.codex/skills',
};

/** 递归列出目录下所有文件（相对路径） */
function listFilesRecursive(dir, prefix) {
  prefix = prefix || '';
  let results = [];
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return results; }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const relPath = prefix ? prefix + '/' + entry : entry;
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        results = results.concat(listFilesRecursive(fullPath, relPath));
      } else {
        results.push(relPath);
      }
    } catch { /* 跳过不可读文件 */ }
  }
  return results;
}

/**
 * 简易 unified diff 生成器（纯 Node.js，零依赖）
 * 使用贪心 LCS 简化算法，输出标准 unified diff 格式
 */
function generateDiff(oldContent, newContent, oldLabel, newLabel) {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);

  // 计算 LCS 表（简化版，O(n*m) 但对技能文件足够）
  const m = oldLines.length;
  const n = newLines.length;

  // 对于大文件，跳过 LCS 直接标记全部替换
  if (m * n > 1000000) {
    const lines = [];
    lines.push(`--- ${oldLabel}`);
    lines.push(`+++ ${newLabel}`);
    lines.push(`@@ -1,${m} +1,${n} @@`);
    for (const line of oldLines) lines.push('-' + line);
    for (const line of newLines) lines.push('+' + line);
    return lines.join('\n');
  }

  // LCS 回溯表
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯生成编辑操作序列
  const ops = []; // { type: 'equal'|'delete'|'insert', line }
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: 'equal', oldIdx: i, newIdx: j, line: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'insert', newIdx: j, line: newLines[j - 1] });
      j--;
    } else {
      ops.push({ type: 'delete', oldIdx: i, line: oldLines[i - 1] });
      i--;
    }
  }
  ops.reverse();

  // 将操作序列组织为 hunks（上下文 3 行）
  const CTX = 3;
  const hunks = [];
  let hunkOps = [];
  let lastChangeIdx = -999;

  for (let k = 0; k < ops.length; k++) {
    if (ops[k].type !== 'equal') {
      // 如果距离上次变更超过 2*CTX+1，开始新 hunk
      if (k - lastChangeIdx > 2 * CTX + 1 && hunkOps.length > 0) {
        hunks.push(hunkOps);
        hunkOps = [];
        // 回退加上下文
        const start = Math.max(k - CTX, lastChangeIdx + CTX + 1);
        for (let c = start; c < k; c++) {
          if (ops[c]) hunkOps.push(ops[c]);
        }
      } else if (hunkOps.length === 0) {
        // 新 hunk 加前上下文
        const start = Math.max(0, k - CTX);
        for (let c = start; c < k; c++) {
          hunkOps.push(ops[c]);
        }
      } else {
        // 补充中间的上下文行
        for (let c = lastChangeIdx + 1; c < k; c++) {
          if (!hunkOps.includes(ops[c])) hunkOps.push(ops[c]);
        }
      }
      hunkOps.push(ops[k]);
      lastChangeIdx = k;
    }
  }
  // 最后一个 hunk 加后上下文
  if (hunkOps.length > 0) {
    const end = Math.min(ops.length, lastChangeIdx + CTX + 1);
    for (let c = lastChangeIdx + 1; c < end; c++) {
      hunkOps.push(ops[c]);
    }
    hunks.push(hunkOps);
  }

  if (hunks.length === 0) return ''; // 无差异

  // 格式化输出
  const lines = [];
  lines.push(`--- ${oldLabel}`);
  lines.push(`+++ ${newLabel}`);

  for (const hunk of hunks) {
    // 计算 hunk 头
    let oldStart = Infinity, oldCount = 0, newStart = Infinity, newCount = 0;
    for (const op of hunk) {
      if (op.type === 'equal' || op.type === 'delete') {
        if (op.oldIdx < oldStart) oldStart = op.oldIdx;
        oldCount++;
      }
      if (op.type === 'equal' || op.type === 'insert') {
        if (op.newIdx < newStart) newStart = op.newIdx;
        newCount++;
      }
    }
    lines.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    for (const op of hunk) {
      if (op.type === 'equal')  lines.push(' ' + op.line);
      if (op.type === 'delete') lines.push('-' + op.line);
      if (op.type === 'insert') lines.push('+' + op.line);
    }
  }

  return lines.join('\n');
}

/** 统计 diff 中的增删行数 */
function countDiffLines(diffText) {
  let added = 0, removed = 0;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }
  return { added, removed };
}

/** 检测 gh CLI 是否可用 */
function isGhAvailable() {
  try {
    const { execSync } = require('child_process');
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

/** 通过 gh CLI 创建 GitHub Issue */
function submitGitHubIssue(changes, allDiffText) {
  const { execSync } = require('child_process');
  const skillNames = changes.map(c => c.skillName).join(', ');
  const title = `[sync-back] 技能改进：${skillNames}`;
  const body = [
    '## 技能修改反馈',
    '',
    `> 由 \`npx ai-engineering-init sync-back --submit\` 自动生成`,
    '',
    '### 修改的技能',
    '',
    ...changes.map(c => {
      const files = c.files.map(f => `  - \`${f.relPath}\` (+${f.added}, -${f.removed})`).join('\n');
      return `- **${c.skillName}**\n${files}`;
    }),
    '',
    '### Diff',
    '',
    '```diff',
    allDiffText,
    '```',
    '',
    '---',
    `CLI 版本: v${PKG_VERSION}`,
  ].join('\n');

  try {
    const result = execSync(
      `gh issue create --repo xu-cell/ai-engineering-init --title "${title.replace(/"/g, '\\"')}" --body-file -`,
      { input: body, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }
    );
    return result.trim();
  } catch (e) {
    return null;
  }
}

/** sync-back 命令主流程 */
function runSyncBack(selectedTool, selectedSkill, doSubmit) {
  console.log(`  目标目录: ${fmt('bold', targetDir)}`);
  console.log(`  本机版本: ${fmt('bold', `v${PKG_VERSION}`)}`);
  console.log('');

  // 1. 确定扫描范围
  let toolsToScan = [];
  if (selectedTool && selectedTool !== 'all') {
    if (!SKILL_DIRS[selectedTool]) {
      console.error(fmt('red', `无效工具: "${selectedTool}"。有效选项: claude | cursor | codex | all`));
      process.exit(1);
    }
    toolsToScan = [selectedTool];
  } else {
    toolsToScan = detectInstalledTools();
  }

  if (toolsToScan.length === 0) {
    console.log(fmt('yellow', '⚠  当前目录未检测到已安装的 AI 工具配置。'));
    console.log(`   请先运行: ${fmt('bold', hintCmd('--tool claude'))}\n`);
    process.exit(1);
  }

  console.log(`  扫描工具: ${fmt('bold', toolsToScan.join(', '))}`);
  console.log('');
  console.log(fmt('bold', '🔍 正在对比技能文件...'));
  console.log('');

  // 2. 对比每个工具的 skills 目录
  const allChanges = []; // { toolKey, skillName, files: [{ relPath, diff, added, removed }] }

  for (const toolKey of toolsToScan) {
    const skillDir = SKILL_DIRS[toolKey];
    const userSkillsDir = path.join(targetDir, skillDir);
    const srcSkillsDir  = path.join(SOURCE_DIR, skillDir);

    if (!isRealDir(userSkillsDir) || !isRealDir(srcSkillsDir)) continue;

    // 列出用户目录中的技能
    let skillNames;
    try { skillNames = fs.readdirSync(userSkillsDir); } catch { continue; }

    for (const name of skillNames) {
      if (selectedSkill && name !== selectedSkill) continue;

      const userSkillDir = path.join(userSkillsDir, name);
      const srcSkillDir  = path.join(srcSkillsDir, name);

      if (!isRealDir(userSkillDir)) continue;

      // 列出用户技能目录下所有文件
      const userFiles = listFilesRecursive(userSkillDir);
      const srcFiles  = isRealDir(srcSkillDir) ? listFilesRecursive(srcSkillDir) : [];
      const allFiles = [...new Set([...userFiles, ...srcFiles])].sort();

      const changedFiles = [];

      for (const relFile of allFiles) {
        const userFile = path.join(userSkillDir, relFile);
        const srcFile  = path.join(srcSkillDir, relFile);

        const userExists = fs.existsSync(userFile);
        const srcExists  = fs.existsSync(srcFile);

        if (userExists && srcExists) {
          // 两边都有，对比内容
          const userContent = fs.readFileSync(userFile, 'utf8');
          const srcContent  = fs.readFileSync(srcFile, 'utf8');
          if (userContent !== srcContent) {
            const diff = generateDiff(srcContent, userContent,
              `原版 (v${PKG_VERSION})`, '本地修改');
            if (diff) {
              const { added, removed } = countDiffLines(diff);
              changedFiles.push({ relPath: relFile, diff, added, removed, status: 'modified' });
            }
          }
        } else if (userExists && !srcExists) {
          // 用户新增的文件
          const content = fs.readFileSync(userFile, 'utf8');
          const lineCount = content.split(/\r?\n/).length;
          changedFiles.push({
            relPath: relFile,
            diff: `--- /dev/null\n+++ 本地新增\n@@ -0,0 +1,${lineCount} @@\n` +
                  content.split(/\r?\n/).map(l => '+' + l).join('\n'),
            added: lineCount, removed: 0, status: 'added'
          });
        }
        // srcExists && !userExists: 用户删除的文件（不报告，可能是有意删除）
      }

      if (changedFiles.length > 0) {
        // 去重：只保留第一个工具的结果（多工具 skills 内容相同）
        const existing = allChanges.find(c => c.skillName === name);
        if (!existing) {
          allChanges.push({ toolKey, skillName: name, files: changedFiles });
        }
      }
    }
  }

  // 3. 展示结果
  if (allChanges.length === 0) {
    console.log(fmt('green', '  ✓ 未检测到技能修改，所有技能与包版本一致。'));
    console.log('');
    return;
  }

  console.log(`  检测到 ${fmt('bold', String(allChanges.length))} 个技能有修改：`);
  console.log('');

  for (let idx = 0; idx < allChanges.length; idx++) {
    const change = allChanges[idx];
    console.log(`  ${fmt('bold', String(idx + 1) + '.')} ${fmt('cyan', change.skillName)}`);
    for (const file of change.files) {
      const statusLabel = file.status === 'added' ? fmt('green', '新增文件') : fmt('yellow', '修改文件');
      console.log(`     ${statusLabel}: ${file.relPath} (${fmt('green', '+' + file.added)} 行, ${fmt('red', '-' + file.removed)} 行)`);
    }
    console.log('');
  }

  // 4. 展示 diff 详情
  const allDiffParts = [];

  for (const change of allChanges) {
    for (const file of change.files) {
      const header = `${change.skillName}/${file.relPath}`;
      console.log(fmt('bold', '─'.repeat(Math.min(50, header.length + 10))));
      console.log(`📋 ${fmt('bold', header)} 的变更：`);
      console.log(fmt('bold', '─'.repeat(Math.min(50, header.length + 10))));

      // 着色 diff 输出
      for (const line of file.diff.split('\n')) {
        if (line.startsWith('+++') || line.startsWith('---')) {
          console.log(fmt('bold', line));
        } else if (line.startsWith('+')) {
          console.log(fmt('green', line));
        } else if (line.startsWith('-')) {
          console.log(fmt('red', line));
        } else if (line.startsWith('@@')) {
          console.log(fmt('cyan', line));
        } else {
          console.log(line);
        }
      }
      console.log('');

      allDiffParts.push(`# ${header}\n${file.diff}`);
    }
  }

  const allDiffText = allDiffParts.join('\n\n');

  // 5. 提交 Issue 或提示
  if (doSubmit) {
    console.log(fmt('bold', '📤 正在提交 GitHub Issue...'));
    console.log('');

    if (!isGhAvailable()) {
      console.log(fmt('yellow', '⚠  未检测到 gh CLI，无法自动提交 Issue。'));
      console.log(`   安装方法: ${fmt('bold', 'https://cli.github.com/')}`);
      console.log('');
      console.log(fmt('bold', '📋 请手动复制以下内容到 GitHub Issue：'));
      console.log('');
      console.log(fmt('cyan', '─'.repeat(50)));
      console.log(`标题: [sync-back] 技能改进：${allChanges.map(c => c.skillName).join(', ')}`);
      console.log(fmt('cyan', '─'.repeat(50)));
      console.log(allDiffText);
      console.log(fmt('cyan', '─'.repeat(50)));
      console.log('');
      console.log(`提交到: ${fmt('bold', 'https://github.com/xu-cell/ai-engineering-init/issues/new')}`);
    } else {
      const issueUrl = submitGitHubIssue(allChanges, allDiffText);
      if (issueUrl) {
        console.log(fmt('green', fmt('bold', '✅ Issue 已创建！')));
        console.log(`  ${fmt('bold', issueUrl)}`);
      } else {
        console.log(fmt('red', '✗ Issue 创建失败，请检查 gh 认证状态（gh auth status）'));
        console.log('');
        console.log(fmt('bold', '📋 请手动复制上方 diff 到 GitHub Issue：'));
        console.log(`  ${fmt('bold', 'https://github.com/xu-cell/ai-engineering-init/issues/new')}`);
      }
    }
  } else {
    console.log(fmt('cyan', '💡 提交方式：'));
    if (allChanges.length === 1) {
      console.log(`  → 运行 ${fmt('bold', hintCmd(`sync-back --skill ${allChanges[0].skillName} --submit`))}`);
    } else {
      console.log(`  → 运行 ${fmt('bold', hintCmd('sync-back --submit'))}`);
    }
    console.log(`  → 或手动复制上方 diff 到 ${fmt('bold', 'https://github.com/xu-cell/ai-engineering-init/issues/new')}`);
  }
  console.log('');
}

// ── 数据库配置初始化 ──────────────────────────────────────────────────────
function runConfig() {
  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：config 命令需要交互式终端'));
    process.exit(1);
  }

  const configPath = path.join(targetDir, '.claude', 'mysql-config.json');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });

  const ENV_DEFAULTS = {
    local: { host: '127.0.0.1', user: 'root', desc: '本地开发环境' },
    dev:   { host: '',          user: '',     desc: '开发测试环境' },
    test:  { host: '',          user: '',     desc: '测试环境' },
    prod:  { host: '',          user: '',     desc: '生产环境' },
  };

  (async () => {
    try {
      // 1. 检测已有配置
      if (fs.existsSync(configPath)) {
        console.log(fmt('yellow', `⚠ 配置文件已存在：${configPath}`));
        const overwrite = await ask(fmt('bold', '是否重新配置？[y/N]: '));
        if (overwrite.toLowerCase() !== 'y') {
          console.log('已取消。');
          rl.close();
          return;
        }
        console.log('');
      }

      // 2. 选择环境
      console.log(fmt('cyan', '请选择要配置的数据库环境（多选，用逗号分隔）：'));
      console.log('');
      console.log(`  ${fmt('bold', '1')}) local  — 本地开发环境`);
      console.log(`  ${fmt('bold', '2')}) dev    — 开发测试环境`);
      console.log(`  ${fmt('bold', '3')}) test   — 测试环境`);
      console.log(`  ${fmt('bold', '4')}) prod   — 生产环境`);
      console.log('');
      const envAnswer = await ask(fmt('bold', '请输入选项（如 1,2 或 1-3）: '));

      // 解析选择
      const envNames = ['local', 'dev', 'test', 'prod'];
      const selected = new Set();
      for (const part of envAnswer.split(',')) {
        const trimmed = part.trim();
        const rangeMatch = trimmed.match(/^(\d)-(\d)$/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          for (let n = start; n <= end; n++) {
            if (n >= 1 && n <= 4) selected.add(envNames[n - 1]);
          }
        } else {
          const n = parseInt(trimmed, 10);
          if (n >= 1 && n <= 4) selected.add(envNames[n - 1]);
        }
      }

      const selectedEnvs = [...selected];
      if (selectedEnvs.length === 0) {
        console.error(fmt('red', '未选择任何环境，退出。'));
        rl.close();
        process.exit(1);
      }

      console.log('');
      console.log(fmt('green', `已选择环境：${selectedEnvs.join(', ')}`));
      console.log('');

      // 3. 收集每个环境的配置
      const environments = {};
      for (const env of selectedEnvs) {
        const defaults = ENV_DEFAULTS[env];
        console.log(fmt('cyan', `── ${env} 环境配置 ──`));

        const host = await ask(`  host [${defaults.host || '无默认'}]: `) || defaults.host;
        const port = await ask('  port [3306]: ') || '3306';
        const user = await ask(`  user [${defaults.user || '无默认'}]: `) || defaults.user;
        const password = await ask('  password: ');
        const desc = await ask(`  描述 [${defaults.desc}]: `) || defaults.desc;
        console.log('');

        if (!host) {
          console.error(fmt('red', `错误：${env} 环境的 host 不能为空`));
          rl.close();
          process.exit(1);
        }
        if (!user) {
          console.error(fmt('red', `错误：${env} 环境的 user 不能为空`));
          rl.close();
          process.exit(1);
        }

        environments[env] = {
          host,
          port: parseInt(port, 10),
          user,
          password,
          description: desc,
        };
      }

      // 4. 选择默认环境
      let defaultEnv = selectedEnvs[0];
      if (selectedEnvs.length > 1) {
        console.log(fmt('cyan', '请选择默认环境：'));
        selectedEnvs.forEach((env, i) => {
          console.log(`  ${fmt('bold', String(i + 1))}) ${env}`);
        });
        const defaultAnswer = await ask(fmt('bold', `请输入选项 [1-${selectedEnvs.length}]: `));
        const idx = parseInt(defaultAnswer, 10) - 1;
        if (idx >= 0 && idx < selectedEnvs.length) {
          defaultEnv = selectedEnvs[idx];
        }
        console.log('');
      }

      // 5. 写入配置文件
      const config = { defaultEnv, environments };
      const claudeDir = path.join(targetDir, '.claude');
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
      console.log(fmt('green', `✔ 配置已写入：${configPath}`));

      // 6. 确保 .gitignore 包含该文件
      const gitignorePath = path.join(targetDir, '.gitignore');
      const ignoreEntry = '.claude/mysql-config.json';
      let needAppend = true;
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        if (content.split('\n').some(line => line.trim() === ignoreEntry)) {
          needAppend = false;
        }
      }
      if (needAppend) {
        const separator = fs.existsSync(gitignorePath) ? '\n' : '';
        fs.appendFileSync(gitignorePath, `${separator}${ignoreEntry}\n`, 'utf-8');
        console.log(fmt('green', `✔ 已添加 ${ignoreEntry} 到 .gitignore`));
      }

      console.log('');
      console.log(fmt('green', '数据库配置初始化完成！'));
      console.log(`使用 ${fmt('bold', 'mysql-debug')} 技能时将自动读取此配置。`);
    } finally {
      rl.close();
    }
  })();
}

// ── MCP 服务器管理 ──────────────────────────────────────────────────────────

const MCP_REGISTRY = [
  {
    name: 'sequential-thinking',
    package: '@modelcontextprotocol/server-sequential-thinking',
    description: '链式推理 — 深度分析、仔细思考、全面评估时使用',
    env: {},
    recommended: true,
  },
  {
    name: 'context7',
    package: '@upstash/context7-mcp',
    description: '官方文档查询 — 最佳实践、官方文档、标准写法时使用',
    env: {},
    recommended: true,
  },
  {
    name: 'github',
    package: '@modelcontextprotocol/server-github',
    description: 'GitHub 集成 — 查询 Issues、PR、仓库信息',
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}' },
    recommended: true,
  },
  {
    name: 'filesystem',
    package: '@modelcontextprotocol/server-filesystem',
    description: '文件系统访问 — 读写项目外的文件',
    env: {},
    recommended: false,
  },
  {
    name: 'fetch',
    package: '@anthropic-ai/mcp-fetch',
    description: '网页抓取 — 获取网页内容',
    env: {},
    recommended: false,
  },
  {
    name: 'yunxiao',
    package: 'alibabacloud-devops-mcp-server',
    description: '阿里云效 — DevOps 项目管理、代码仓库、流水线集成',
    env: { YUNXIAO_ACCESS_TOKEN: '<YOUR_TOKEN>' },
    recommended: false,
  },
  {
    name: 'yuque',
    package: 'yuque-mcp',
    description: '语雀 — 知识库文档读写、搜索、团队协作',
    env: { YUQUE_TOKEN: '<YOUR_TOKEN>' },
    recommended: false,
  },
];

/** MCP 配置文件路径映射 */
const MCP_CONFIG_PATHS = {
  claude: { file: '.claude/settings.json', key: 'mcpServers' },
  cursor: { file: '.cursor/mcp.json',      key: 'mcpServers' },
};

/** 检测项目中已有的工具配置目录 */
function detectMcpTools() {
  const tools = [];
  if (isRealDir(path.join(targetDir, '.claude'))) tools.push('claude');
  if (isRealDir(path.join(targetDir, '.cursor'))) tools.push('cursor');
  return tools;
}

/** 读取指定工具的 MCP 已配置服务器 */
function getMcpServers(toolName) {
  const config = MCP_CONFIG_PATHS[toolName];
  if (!config) return {};
  const filePath = path.join(targetDir, config.file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data[config.key] || {};
  } catch { return {}; }
}

/** 写入指定工具的 MCP 配置（保留文件其他字段） */
function setMcpServers(toolName, mcpServers) {
  const config = MCP_CONFIG_PATHS[toolName];
  if (!config) return;
  const filePath = path.join(targetDir, config.file);
  let data = {};
  try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { /* 新建 */ }
  data[config.key] = mcpServers;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/** 构建单个 MCP 服务器的配置对象 */
function buildMcpServerConfig(entry) {
  const config = {
    command: 'npx',
    args: ['-y', entry.package],
  };
  if (Object.keys(entry.env).length > 0) {
    config.env = { ...entry.env };
  }
  return config;
}

/** 获取所有工具中已安装的 MCP 服务器名称集合 */
function getInstalledMcpNames(tools) {
  const names = new Set();
  for (const t of tools) {
    const servers = getMcpServers(t);
    for (const name of Object.keys(servers)) names.add(name);
  }
  return names;
}

function runMcp() {
  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：mcp 命令需要交互式终端'));
    process.exit(1);
  }

  const tools = detectMcpTools();
  if (tools.length === 0) {
    console.log(fmt('yellow', '⚠  当前目录未检测到 .claude/ 或 .cursor/ 配置目录。'));
    console.log(`   请先运行: ${fmt('bold', hintCmd('init --tool claude'))}`);
    console.log('');
    process.exit(1);
  }

  console.log(`  检测到工具: ${fmt('bold', tools.join(', '))}`);
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });

  (async () => {
    try {
      console.log(fmt('cyan', '请选择 MCP 操作：'));
      console.log('');
      console.log(`  ${fmt('bold', '1')}) ${fmt('green',  '安装 MCP 服务器')}    — 从预置列表选择并安装到配置`);
      console.log(`  ${fmt('bold', '2')}) ${fmt('red',    '卸载 MCP 服务器')}    — 从已安装列表中移除`);
      console.log(`  ${fmt('bold', '3')}) ${fmt('cyan',   '查看状态')}           — 检查已配置的 MCP 服务器`);
      console.log(`  ${fmt('bold', '4')}) ${fmt('yellow', '一键推荐安装')}       — 安装所有推荐的 MCP 服务器`);
      console.log('');
      const action = await ask(fmt('bold', '请输入选项 [1-4]: '));
      console.log('');

      switch (action) {
        case '1': await mcpInstall(tools, ask); break;
        case '2': await mcpUninstall(tools, ask); break;
        case '3': mcpStatus(tools); break;
        case '4': await mcpRecommend(tools, ask); break;
        default:
          console.error(fmt('red', '无效选项，退出。'));
          process.exit(1);
      }
    } finally {
      rl.close();
    }
  })();
}

/** 安装 MCP 服务器 */
async function mcpInstall(tools, ask) {
  const installed = getInstalledMcpNames(tools);

  console.log(fmt('cyan', '可用的 MCP 服务器：'));
  console.log('');
  for (let i = 0; i < MCP_REGISTRY.length; i++) {
    const entry = MCP_REGISTRY[i];
    const tags = [];
    if (installed.has(entry.name)) tags.push(fmt('green', '[已安装]'));
    if (entry.recommended) tags.push(fmt('yellow', '[推荐]'));
    const tagStr = tags.length > 0 ? ' ' + tags.join(' ') : '';
    console.log(`  ${fmt('bold', String(i + 1))}) ${fmt('bold', entry.name)}${tagStr}`);
    console.log(`     ${entry.description}`);
  }
  console.log('');
  const answer = await ask(fmt('bold', '请选择要安装的服务器（逗号分隔，如 1,2,3）: '));
  const indices = answer.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => i >= 0 && i < MCP_REGISTRY.length);

  if (indices.length === 0) {
    console.log(fmt('yellow', '未选择任何服务器，退出。'));
    return;
  }

  const selected = indices.map(i => MCP_REGISTRY[i]);
  console.log('');

  // 处理需要 env 的服务器
  for (const entry of selected) {
    if (Object.keys(entry.env).length > 0) {
      console.log(fmt('cyan', `── ${entry.name} 环境变量配置 ──`));
      for (const [key, defaultVal] of Object.entries(entry.env)) {
        const val = await ask(`  ${key} [${defaultVal}]: `);
        if (val) entry.env[key] = val;
      }
      console.log('');
    }
  }

  // 写入所有检测到的工具配置
  for (const toolName of tools) {
    const servers = getMcpServers(toolName);
    for (const entry of selected) {
      servers[entry.name] = buildMcpServerConfig(entry);
    }
    setMcpServers(toolName, servers);
    console.log(`  ${fmt('green', '✓')}  ${toolName}: 已写入 ${selected.map(e => e.name).join(', ')}`);
  }

  console.log('');
  console.log(fmt('green', fmt('bold', `✅ 已安装 ${selected.length} 个 MCP 服务器！`)));
  console.log('');
}

/** 卸载 MCP 服务器 */
async function mcpUninstall(tools, ask) {
  // 收集所有已安装的服务器（合并去重）
  const allServers = new Map(); // name → 出现在哪些工具中
  for (const toolName of tools) {
    const servers = getMcpServers(toolName);
    for (const name of Object.keys(servers)) {
      if (!allServers.has(name)) allServers.set(name, []);
      allServers.get(name).push(toolName);
    }
  }

  if (allServers.size === 0) {
    console.log(fmt('yellow', '  当前没有已安装的 MCP 服务器。'));
    console.log(`  运行 ${fmt('bold', hintCmd('mcp'))} 安装服务器。`);
    console.log('');
    return;
  }

  const serverNames = [...allServers.keys()];
  console.log(fmt('cyan', '已安装的 MCP 服务器：'));
  console.log('');
  for (let i = 0; i < serverNames.length; i++) {
    const name = serverNames[i];
    const toolList = allServers.get(name).join(', ');
    console.log(`  ${fmt('bold', String(i + 1))}) ${fmt('bold', name)} ${fmt('magenta', `(${toolList})`)}`);
  }
  console.log('');
  const answer = await ask(fmt('bold', '请选择要卸载的服务器（逗号分隔）: '));
  const indices = answer.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => i >= 0 && i < serverNames.length);

  if (indices.length === 0) {
    console.log(fmt('yellow', '未选择任何服务器，退出。'));
    return;
  }

  const toRemove = indices.map(i => serverNames[i]);
  console.log('');

  for (const toolName of tools) {
    const servers = getMcpServers(toolName);
    let removed = 0;
    for (const name of toRemove) {
      if (name in servers) {
        delete servers[name];
        removed++;
      }
    }
    if (removed > 0) {
      setMcpServers(toolName, servers);
      console.log(`  ${fmt('green', '✓')}  ${toolName}: 已移除 ${toRemove.filter(n => !servers[n]).join(', ')}`);
    }
  }

  console.log('');
  console.log(fmt('green', fmt('bold', `✅ 已卸载 ${toRemove.length} 个 MCP 服务器！`)));
  console.log('');
}

/** 查看 MCP 状态 */
function mcpStatus(tools) {
  let hasAny = false;

  for (const toolName of tools) {
    const servers = getMcpServers(toolName);
    const names = Object.keys(servers);

    console.log(fmt('cyan', `[${toolName}]`) + ` ${MCP_CONFIG_PATHS[toolName].file}`);

    if (names.length === 0) {
      console.log(`  ${fmt('yellow', '（无已安装的 MCP 服务器）')}`);
    } else {
      hasAny = true;
      for (const name of names) {
        const srv = servers[name];
        const pkg = (srv.args || []).find(a => a.startsWith('@')) || '—';
        const envKeys = srv.env ? Object.keys(srv.env).join(', ') : '—';
        console.log(`  ${fmt('green', '●')} ${fmt('bold', name)}`);
        console.log(`    包: ${pkg}  |  环境变量: ${envKeys}`);
      }
    }
    console.log('');
  }

  if (!hasAny) {
    console.log(fmt('yellow', '💡 未安装任何 MCP 服务器。'));
    console.log(`   运行 ${fmt('bold', hintCmd('mcp'))} 开始安装。`);
    console.log('');
  }
}

/** 一键推荐安装 */
async function mcpRecommend(tools, ask) {
  const installed = getInstalledMcpNames(tools);
  const toInstall = MCP_REGISTRY.filter(e => e.recommended && !installed.has(e.name));

  if (toInstall.length === 0) {
    console.log(fmt('green', '  ✓ 所有推荐的 MCP 服务器已安装！'));
    console.log('');
    mcpStatus(tools);
    return;
  }

  console.log(fmt('cyan', '将安装以下推荐服务器：'));
  console.log('');
  for (const entry of toInstall) {
    console.log(`  ${fmt('green', '●')} ${fmt('bold', entry.name)} — ${entry.description}`);
  }
  console.log('');

  // 处理需要 env 的服务器
  for (const entry of toInstall) {
    if (Object.keys(entry.env).length > 0) {
      console.log(fmt('cyan', `── ${entry.name} 环境变量配置 ──`));
      for (const [key, defaultVal] of Object.entries(entry.env)) {
        const val = await ask(`  ${key} [${defaultVal}]: `);
        if (val) entry.env[key] = val;
      }
      console.log('');
    }
  }

  // 写入配置
  for (const toolName of tools) {
    const servers = getMcpServers(toolName);
    for (const entry of toInstall) {
      servers[entry.name] = buildMcpServerConfig(entry);
    }
    setMcpServers(toolName, servers);
    console.log(`  ${fmt('green', '✓')}  ${toolName}: 已写入 ${toInstall.map(e => e.name).join(', ')}`);
  }

  console.log('');
  console.log(fmt('green', fmt('bold', `✅ 已安装 ${toInstall.length} 个推荐 MCP 服务器！`)));
  console.log('');
}

// ── 工具选择菜单（init 用）─────────────────────────────────────────────────
function showToolMenu() {
  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：非交互环境下必须指定 --tool 参数'));
    console.error(`  示例: ${fmt('bold', hintCmd('init --tool claude'))}`);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(fmt('cyan', '请选择要初始化的工具：'));
  console.log('');
  console.log(`  ${fmt('bold', '1')}) ${fmt('green',   'Claude Code')}   — .claude/ + CLAUDE.md`);
  console.log(`  ${fmt('bold', '2')}) ${fmt('cyan',    'Cursor')}        — .cursor/（Skills + Agents）`);
  console.log(`  ${fmt('bold', '3')}) ${fmt('yellow',  'OpenAI Codex')}  — .codex/ + AGENTS.md`);
  console.log(`  ${fmt('bold', '4')}) ${fmt('blue',    '全部工具')}       — 同时初始化 Claude + Cursor + Codex`);
  console.log('');
  rl.question(fmt('bold', '请输入选项 [1-4]: '), (answer) => {
    rl.close();
    const map = { '1': 'claude', '2': 'cursor', '3': 'codex', '4': 'all' };
    const selected = map[answer.trim()];
    console.log('');
    if (selected) {
      run(selected);
    } else {
      console.error(fmt('red', '无效选项，退出。'));
      process.exit(1);
    }
  });
}

// ── 主菜单（无命令时展示）──────────────────────────────────────────────────
function showMainMenu() {
  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：非交互环境下必须指定命令'));
    console.error(`  示例: ${fmt('bold', hintCmd('init --tool claude'))}`);
    console.error(`  运行 ${fmt('bold', hintCmd('--help'))} 查看所有命令`);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(fmt('cyan', '请选择操作：'));
  console.log('');
  console.log(`  ${fmt('bold', '1')}) ${fmt('green',   '初始化')}         — 安装 AI 工具配置到当前项目`);
  console.log(`  ${fmt('bold', '2')}) ${fmt('cyan',    '更新')}           — 更新已安装的框架文件`);
  console.log(`  ${fmt('bold', '3')}) ${fmt('yellow',  '全局安装')}       — 安装到 ~/.claude 等，对所有项目生效`);
  console.log(`  ${fmt('bold', '4')}) ${fmt('magenta', '技能同步反馈')}   — 对比本地技能修改，生成 diff`);
  console.log(`  ${fmt('bold', '5')}) ${fmt('blue',    '数据库配置')}     — 初始化 mysql-config.json（数据库连接信息）`);
  console.log(`  ${fmt('bold', '6')}) ${fmt('green',   'MCP 管理')}       — MCP 服务器安装/卸载/状态检查`);
  console.log('');
  rl.question(fmt('bold', '请输入选项 [1-6]: '), (answer) => {
    rl.close();
    console.log('');
    switch (answer.trim()) {
      case '1':
        showToolMenu();
        break;
      case '2':
        runUpdate(tool);
        break;
      case '3':
        runGlobal(tool || 'all');
        break;
      case '4':
        runSyncBack(tool, skillFilter, submitIssue);
        break;
      case '5':
        runConfig();
        break;
      case '6':
        runMcp();
        break;
      default:
        console.error(fmt('red', '无效选项，退出。'));
        process.exit(1);
    }
  });
}

// ── 主入口 ────────────────────────────────────────────────────────────────
if (command === 'init') {
  // 显式 init 子命令
  if (tool) {
    run(tool);
  } else {
    showToolMenu();
  }
} else if (command === 'update') {
  runUpdate(tool);
} else if (command === 'global') {
  runGlobal(tool);
} else if (command === 'sync-back') {
  runSyncBack(tool, skillFilter, submitIssue);
} else if (command === 'config') {
  runConfig();
} else if (command === 'mcp') {
  runMcp();
} else if (tool) {
  // 向后兼容：无 command 但有 --tool，当作 init 执行
  run(tool);
} else {
  // 无命令无参数：显示主菜单
  showMainMenu();
}
