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
let configType = '';  // config --type <mysql|loki|all>
let configScope = '';  // config --scope <local|global>
let configAdd = false; // config --add
let configFrom = '';   // config --from <file.md>

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
    case '--type':
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        console.error(fmt('red', `错误：${arg} 需要一个值（mysql | loki | all）`));
        process.exit(1);
      }
      configType = args[++i];
      break;
    case '--scope':
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        console.error(fmt('red', `错误：${arg} 需要一个值（local | global）`));
        process.exit(1);
      }
      configScope = args[++i];
      break;
    case '--add':
      configAdd = true;
      break;
    case '--from':
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        console.error(fmt('red', `错误：${arg} 需要一个文件路径`));
        process.exit(1);
      }
      configFrom = path.resolve(args[++i]);
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
  console.log(`  ${fmt('bold', 'config')}           初始化环境配置（数据库连接 / Loki 日志 / 全部）`);
  console.log(`  ${fmt('bold', 'mcp')}              MCP 服务器管理（安装/卸载/状态检查）\n`);
  console.log(`无命令时显示交互式主菜单。\n`);
  console.log('选项:');
  console.log('  --tool,  -t <工具>   指定工具: claude | cursor | codex | all');
  console.log('  --dir,   -d <目录>   目标目录（默认：当前目录，仅 init/update 有效）');
  console.log('  --force, -f          强制覆盖（init 时覆盖已有文件；update/global 时同时更新保留文件）');
  console.log('  --skill, -s <技能>   sync-back 时只对比指定技能');
  console.log('  --submit             sync-back 时自动创建 GitHub Issue（需要 gh CLI）');
  console.log('  --type   <类型>      config 时指定配置类型: mysql | loki | all');
  console.log('  --scope  <范围>      config 时指定范围: local（当前项目） | global（全局 ~/）');
  console.log('  --add                config 时追加环境（不覆盖已有配置）');
  console.log('  --from   <文件>      config 时从 Markdown 文件解析配置（跳过交互）');
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
  console.log('  npx ai-engineering-init sync-back --skill bug-detective --submit # 提交 Issue');
  console.log('  npx ai-engineering-init config                         # 交互式选择配置类型');
  console.log('  npx ai-engineering-init config --type mysql            # 只配置数据库连接');
  console.log('  npx ai-engineering-init config --type loki             # 只配置 Loki 日志');
  console.log('  npx ai-engineering-init config --type all              # 配置全部');
  console.log('  npx ai-engineering-init config --type mysql --scope global  # 全局配置（所有项目共享）');
  console.log('  npx ai-engineering-init config --type mysql --add          # 追加环境到已有配置');
  console.log('  npx ai-engineering-init config --from env-config.md --scope global  # 从 MD 文件一键初始化');
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
    console.log(`  1. ${fmt('bold', '必做')}：修改 ${fmt('bold', 'CLAUDE.md')} — 把 [你的xxx] 占位符替换为项目实际信息`);
    console.log(`  2. 在 Claude Code 中输入 ${fmt('bold', '/start')} 快速了解项目`);
    console.log(`  3. 输入 ${fmt('bold', '/dev')} 开始开发新功能`);
    console.log('');
    console.log(fmt('yellow', '  💡 CLAUDE.md 和 AGENTS.md 是示例模板，务必替换占位符后使用'));
    console.log(fmt('yellow', `  💡 运行 ${fmt('bold', hintCmd('mcp'))} 管理 MCP 服务器（云效、语雀等）`));
    console.log('');
  }
  if (toolKey === 'cursor' || toolKey === 'all') {
    console.log(fmt('cyan', 'Cursor 使用：'));
    console.log(`  1. 在 Cursor Chat 中输入 ${fmt('bold', '/')} 查看所有可用 Skills`);
    console.log(`  2. 输入 ${fmt('bold', '@技能名')} 手动调用指定技能`);
    console.log(`  3. 在 Settings → MCP 中确认 MCP 服务器已连接`);
    console.log(fmt('yellow', `  💡 运行 ${fmt('bold', hintCmd('mcp'))} 管理 MCP 服务器（云效、语雀等）`));
    console.log('');
  }
  if (toolKey === 'codex' || toolKey === 'all') {
    console.log(fmt('cyan', 'Codex 使用：'));
    console.log(`  1. 按需修改 ${fmt('bold', 'AGENTS.md')} 中的项目说明`);
    console.log(`  2. 在 Codex 中使用 .codex/skills/ 下的技能`);
    console.log('');
  }
  showJenkinsHint();
}

/** 检测 jenkins/ 是否已初始化，提示用户配置部署环境 */
function showJenkinsHint() {
  const jenkinsDir = path.join(targetDir, 'jenkins');
  const envParamFile = path.join(jenkinsDir, 'env_param.json');
  const skillAssetsDir = path.join(targetDir, '.claude', 'skills', 'jenkins-deploy', 'assets');

  // 技能 assets 存在但 jenkins/ 未初始化
  if (fs.existsSync(skillAssetsDir) && !fs.existsSync(envParamFile)) {
    console.log(fmt('yellow', fmt('bold', '📦 Jenkins 部署环境未初始化')));
    console.log(`  项目包含 ${fmt('bold', 'jenkins-deploy')} 技能，但 jenkins/ 目录尚未配置。`);
    console.log(`  初始化方式：`);
    console.log(`    方式 1：在 AI 对话中说 ${fmt('bold', '"初始化部署环境"')}`);
    console.log(`    方式 2：从团队成员处拷贝 ${fmt('bold', 'jenkins/')} 目录`);
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
  showJenkinsHint();

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

// ── 环境配置初始化（MySQL / Loki）─────────────────────────────────────────

function runConfig() {
  // --from 模式：从 MD 文件解析配置（非交互式）
  if (configFrom) {
    runConfigFromFile(configFrom, configScope || 'global');
    return;
  }

  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：config 命令需要交互式终端（或使用 --from <file> 跳过交互）'));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });

  (async () => {
    try {
      let type = configType;
      let scope = configScope;

      // 未指定 --type 时显示交互式菜单
      if (!type) {
        console.log(fmt('cyan', '请选择要初始化的配置类型：'));
        console.log('');
        console.log(`  ${fmt('bold', '1')}) ${fmt('green', 'MySQL 数据库连接')}   — 配置 mysql-config.json`);
        console.log(`  ${fmt('bold', '2')}) ${fmt('blue',  'Loki 日志查询')}      — 配置 Grafana Loki Token`);
        console.log(`  ${fmt('bold', '3')}) ${fmt('yellow','全部配置')}            — 依次配置 MySQL + Loki`);
        console.log('');
        const answer = await ask(fmt('bold', '请输入选项 [1-3]: '));
        switch (answer) {
          case '1': type = 'mysql'; break;
          case '2': type = 'loki';  break;
          case '3': type = 'all';   break;
          default:
            console.error(fmt('red', '无效选项，退出。'));
            rl.close();
            process.exit(1);
        }
        console.log('');
      }

      if (!['mysql', 'loki', 'all'].includes(type)) {
        console.error(fmt('red', `错误：不支持的配置类型 "${type}"，可选：mysql | loki | all`));
        rl.close();
        process.exit(1);
      }

      // 未指定 --scope 时询问
      if (!scope) {
        console.log(fmt('cyan', '请选择配置范围：'));
        console.log('');
        console.log(`  ${fmt('bold', '1')}) ${fmt('green', 'global（全局）')}  — 写入 ~/.claude/，所有项目共享`);
        console.log(`  ${fmt('bold', '2')}) ${fmt('blue',  'local（本地）')}   — 写入当前项目目录`);
        console.log('');
        const scopeAnswer = await ask(fmt('bold', '请输入选项 [1-2，默认 1]: ')) || '1';
        scope = scopeAnswer === '2' ? 'local' : 'global';
        console.log('');
      }

      if (!['local', 'global'].includes(scope)) {
        console.error(fmt('red', `错误：不支持的范围 "${scope}"，可选：local | global`));
        rl.close();
        process.exit(1);
      }

      const isGlobal = scope === 'global';
      if (isGlobal) {
        console.log(fmt('magenta', `配置范围：全局（~/.claude/），所有项目共享`));
      } else {
        console.log(fmt('magenta', `配置范围：本地（${targetDir}）`));
      }
      console.log('');

      if (type === 'mysql' || type === 'all') {
        await runMysqlConfig(ask, isGlobal);
      }
      if (type === 'loki' || type === 'all') {
        if (type === 'all') console.log('');
        await runLokiConfig(ask, isGlobal);
      }

      console.log('');
      console.log(fmt('green', fmt('bold', '配置初始化完成！')));
      if (isGlobal) {
        console.log(fmt('cyan', '技能会按 全局(~/.claude/) → 本地(.claude/) 顺序查找配置，本地优先。'));
      }
    } finally {
      rl.close();
    }
  })();
}

// ── MySQL 数据库配置 ────────────────────────────────────────────────────────

async function runMysqlConfig(ask, isGlobal) {
  console.log(fmt('blue', fmt('bold', '┌─ MySQL 数据库连接配置 ─┐')));
  console.log('');

  const configPath = isGlobal
    ? path.join(HOME_DIR, '.claude', 'mysql-config.json')
    : path.join(targetDir, '.claude', 'mysql-config.json');

  // 读取已有配置
  let existingConfig = null;
  if (fs.existsSync(configPath)) {
    try { existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch { /* ignore */ }
  }

  // --add 模式
  if (configAdd && existingConfig && existingConfig.environments) {
    console.log(fmt('cyan', '当前已配置的环境：'));
    for (const [key, env] of Object.entries(existingConfig.environments)) {
      const rangeStr = env.range ? fmt('magenta', ` (range: ${env.range})`) : '';
      console.log(`  ${fmt('bold', key)} — ${env._desc || key}${rangeStr}  host=${env.host}`);
    }
    console.log('');
    console.log(fmt('green', '将追加新环境到已有配置。'));
    console.log('');
  } else if (existingConfig && !configAdd) {
    console.log(fmt('yellow', `⚠ 配置文件已存在：${configPath}`));
    const overwrite = await ask(fmt('bold', '输入 add 追加环境，y 重建，N 跳过 [add/y/N]: '));
    if (overwrite.toLowerCase() === 'add') {
      // 进入追加模式
    } else if (overwrite.toLowerCase() !== 'y') {
      console.log('已跳过 MySQL 配置。');
      return;
    } else {
      existingConfig = null;
    }
    console.log('');
  }

  // 自定义环境名输入
  console.log(fmt('cyan', '请输入要配置的环境（自定义名称，多个用逗号分隔）：'));
  console.log(fmt('yellow', '  示例：local, dev, test, prod 或自定义名称'));
  console.log('');
  const envAnswer = await ask(fmt('bold', '环境名称: '));
  const envNames = envAnswer.split(',').map(s => s.trim()).filter(Boolean);

  if (envNames.length === 0) {
    console.error(fmt('red', '未输入任何环境名，跳过 MySQL 配置。'));
    return;
  }
  console.log('');

  // 收集每个环境的配置
  const newEnvironments = {};
  for (const env of envNames) {
    if (existingConfig && existingConfig.environments && existingConfig.environments[env]) {
      console.log(fmt('yellow', `  ${env} 已存在，跳过。使用 y 模式可重建。`));
      continue;
    }

    const isLocal = env === 'local';
    console.log(fmt('cyan', `── ${env} 环境配置 ──`));

    const host = await ask(`  host [${isLocal ? '127.0.0.1' : '无默认'}]: `) || (isLocal ? '127.0.0.1' : '');
    if (!host) { console.error(fmt('red', `  host 不能为空，跳过。`)); continue; }
    const port = await ask('  port [3306]: ') || '3306';
    const user = await ask(`  user [${isLocal ? 'root' : '无默认'}]: `) || (isLocal ? 'root' : '');
    if (!user) { console.error(fmt('red', `  user 不能为空，跳过。`)); continue; }
    const password = await ask('  password: ');
    const desc = await ask(`  描述 [${env}环境]: `) || `${env}环境`;
    const rangeInput = await ask(`  覆盖范围（如 ${fmt('bold', '1~15')} 表示 ${env}1→${env}15，留空=无范围）: `);
    console.log('');

    newEnvironments[env] = { host, port: parseInt(port, 10), user, password, _desc: desc };
    if (rangeInput) newEnvironments[env].range = rangeInput;
  }

  if (Object.keys(newEnvironments).length === 0 && !existingConfig) {
    console.error(fmt('red', '未成功配置任何环境。'));
    return;
  }

  // 合并配置
  const allEnvironments = {
    ...(existingConfig && existingConfig.environments ? existingConfig.environments : {}),
    ...newEnvironments,
  };

  // 选择默认环境
  const allEnvKeys = Object.keys(allEnvironments);
  let defaultEnv = (existingConfig && existingConfig.default) || allEnvKeys[0];
  if (Object.keys(newEnvironments).length > 0 && allEnvKeys.length > 1) {
    console.log(fmt('cyan', '请选择默认环境：'));
    allEnvKeys.forEach((env, i) => {
      const marker = env === defaultEnv ? fmt('green', ' (当前)') : '';
      console.log(`  ${fmt('bold', String(i + 1))}) ${env}${marker}`);
    });
    const defaultAnswer = await ask(fmt('bold', `请输入选项 [1-${allEnvKeys.length}，回车保持当前]: `));
    if (defaultAnswer) {
      const idx = parseInt(defaultAnswer, 10) - 1;
      if (idx >= 0 && idx < allEnvKeys.length) defaultEnv = allEnvKeys[idx];
    }
    console.log('');
  }

  const config = {
    environments: allEnvironments,
    default: defaultEnv,
    _comment: '环境支持 range 字段（如 "1~15"），用户说"dev10"时自动匹配。查找顺序：本地 .claude/ > 全局 ~/.claude/',
  };

  const configJson = JSON.stringify(config, null, 2) + '\n';
  // 写入主路径
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, configJson, 'utf-8');
  console.log(`  ${fmt('green', '✔')} 已写入：${configPath}`);

  // 全局模式：同时写入 ~/.cursor/（如果目录存在）
  if (isGlobal) {
    const cursorConfigPath = path.join(HOME_DIR, '.cursor', 'mysql-config.json');
    if (fs.existsSync(path.join(HOME_DIR, '.cursor'))) {
      fs.writeFileSync(cursorConfigPath, configJson, 'utf-8');
      console.log(`  ${fmt('green', '✔')} 已同步：${cursorConfigPath}`);
    }
  } else {
    ensureGitignore(['mysql-config.json']);
  }

  console.log('');
  console.log(fmt('green', 'MySQL 数据库配置完成！'));
  for (const [key, env] of Object.entries(newEnvironments)) {
    if (env.range) {
      console.log(fmt('cyan', `  ${key} 覆盖 ${key}${env.range.replace('~', '→')}，说"${key}10"将自动匹配`));
    }
  }
}

// ── Loki 日志查询配置 ──────────────────────────────────────────────────────

async function runLokiConfig(ask, isGlobal) {
  console.log(fmt('blue', fmt('bold', '┌─ Loki 日志查询配置 ─┐')));
  console.log('');

  const configPath = isGlobal
    ? path.join(HOME_DIR, '.claude', 'loki-config.json')
    : getLokiConfigPath();

  if (!configPath) {
    console.log(fmt('yellow', '⚠ 未检测到配置目录。请先运行 init 安装框架。'));
    return;
  }

  let existingConfig = null;
  if (fs.existsSync(configPath)) {
    try { existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch { /* ignore */ }
  }

  if (existingConfig && existingConfig.environments) {
    const envs = existingConfig.environments;
    const envList = Object.keys(envs);
    console.log(fmt('cyan', '当前已配置的 Loki 环境：'));
    console.log('');
    for (const key of envList) {
      const env = envs[key];
      const hasToken = env.token && env.token.length > 0;
      const status = hasToken ? fmt('green', '✔ Token') : fmt('red', '✗ 缺Token');
      const rangeStr = env.range ? fmt('magenta', ` (range: ${env.range})`) : '';
      console.log(`  ${fmt('bold', key)} — ${env.name || key}  ${status}${rangeStr}`);
    }
    console.log('');

    if (configAdd) {
      console.log(fmt('green', '将追加新环境到已有配置。'));
    } else {
      const missingTokenEnvs = envList.filter(k => !envs[k].token);
      const action = await ask(fmt('bold', '输入 token 补充Token，add 追加环境，N 跳过 [token/add/N]: ')) || 'token';
      if (action.toLowerCase() === 'token') {
        await updateLokiTokens(ask, existingConfig, configPath, isGlobal);
        return;
      } else if (action.toLowerCase() !== 'add') {
        console.log('已跳过 Loki 配置。');
        return;
      }
    }
    console.log('');

    // 追加环境
    await addLokiEnvironments(ask, existingConfig, configPath, isGlobal);
  } else {
    await createLokiConfig(ask, configPath, isGlobal);
  }
}

async function updateLokiTokens(ask, config, configPath, isGlobal) {
  console.log('');
  console.log(fmt('cyan', fmt('bold', 'Grafana Token 获取：')));
  console.log(`  Grafana → Administration → Service accounts → Add（Viewer）→ Add token`);
  console.log('');

  const envs = config.environments;
  for (const key of Object.keys(envs)) {
    const env = envs[key];
    const hasToken = env.token && env.token.length > 0;
    if (hasToken) {
      const update = await ask(`  ${fmt('bold', key)} 已有 Token，更新？[y/N]: `);
      if (update.toLowerCase() !== 'y') continue;
    }
    if (env.url) console.log(`  URL: ${fmt('bold', env.url)}`);
    const token = await ask(`  输入 ${key} 的 Token: `);
    if (token) {
      envs[key].token = token;
      console.log(`  ${fmt('green', '✔')} 已设置`);
    }
    console.log('');
  }

  writeLokiConfig(config, configPath, isGlobal);
}

async function addLokiEnvironments(ask, config, configPath, isGlobal) {
  printLokiTokenGuide();
  const countAnswer = await ask(fmt('bold', '要追加几个环境？[1]: ')) || '1';
  const count = Math.max(1, Math.min(10, parseInt(countAnswer, 10) || 1));
  console.log('');

  for (let i = 0; i < count; i++) {
    const envData = await collectLokiEnvInput(ask, i + 1, count);
    if (!envData) continue;
    config.environments[envData.key] = envData.value;
  }

  writeLokiConfig(config, configPath, isGlobal);
}

async function createLokiConfig(ask, configPath, isGlobal) {
  console.log(fmt('cyan', '将创建新的 Loki 日志查询配置。'));
  console.log('');
  printLokiTokenGuide();
  const countAnswer = await ask(fmt('bold', '要配置几个 Grafana 环境？[1]: ')) || '1';
  const count = Math.max(1, Math.min(10, parseInt(countAnswer, 10) || 1));
  console.log('');

  const environments = {};
  let activeEnv = '';

  for (let i = 0; i < count; i++) {
    const envData = await collectLokiEnvInput(ask, i + 1, count);
    if (!envData) continue;
    environments[envData.key] = envData.value;
    if (!activeEnv) activeEnv = envData.key;
  }

  if (Object.keys(environments).length === 0) {
    console.error(fmt('red', '未配置任何环境。'));
    return;
  }

  const envKeys = Object.keys(environments);
  if (envKeys.length > 1) {
    console.log(fmt('cyan', '请选择默认活跃环境：'));
    envKeys.forEach((env, i) => console.log(`  ${fmt('bold', String(i + 1))}) ${env}`));
    const activeAnswer = await ask(fmt('bold', `请输入选项 [1-${envKeys.length}]: `));
    const idx = parseInt(activeAnswer, 10) - 1;
    if (idx >= 0 && idx < envKeys.length) activeEnv = envKeys[idx];
    console.log('');
  }

  const config = {
    _comment: 'Loki 多环境配置。环境支持 range 字段。查找顺序：本地 > 全局 ~/.claude/',
    _setup: 'Token：Grafana → Administration → Service accounts → Add（Viewer）→ Add token',
    active: activeEnv,
    environments,
  };

  writeLokiConfig(config, configPath, isGlobal);
}

function printLokiTokenGuide() {
  console.log(fmt('cyan', fmt('bold', 'Grafana Token 获取：')));
  console.log(`  Grafana → Administration → Service accounts → Add（Viewer）→ Add token`);
  console.log('');
}

async function collectLokiEnvInput(ask, index, total) {
  console.log(fmt('cyan', `── 环境 ${index}/${total} ──`));
  const envKey = await ask(`  环境标识（如 monitor-dev、test13）: `);
  if (!envKey) { console.log(fmt('yellow', '  跳过')); return null; }
  const name = await ask(`  环境名称（如 "开发环境"）: `) || envKey;
  const url = await ask(`  Grafana URL: `);
  const token = await ask(`  Token（可留空稍后配）: `);
  const aliasStr = await ask(`  别名（逗号分隔）[${envKey}]: `) || envKey;
  const aliases = aliasStr.split(',').map(s => s.trim()).filter(Boolean);
  const rangeInput = await ask(`  项目覆盖范围（如 ${fmt('bold', 'dev1~15')} 表示 dev01→dev15，留空=无范围）: `);
  console.log('');

  const value = { name, url, token: token || '', aliases };
  if (rangeInput) {
    value.range = rangeInput;
    value.projects = expandRange(rangeInput);
    if (value.projects.length > 0) {
      console.log(fmt('cyan', `  已展开 ${value.projects.length} 个项目：${value.projects.slice(0, 5).join(', ')}${value.projects.length > 5 ? '...' : ''}`));
      console.log('');
    }
  } else {
    value.projects = [];
  }

  return { key: envKey, value };
}

function writeLokiConfig(config, configPath, isGlobal) {
  const configJson = JSON.stringify(config, null, 2) + '\n';
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, configJson, 'utf-8');
  console.log(`  ${fmt('green', '✔')} 已写入：${configPath}`);

  // 全局模式：同时写入 ~/.cursor/（如果目录存在）
  if (isGlobal) {
    const cursorConfigPath = path.join(HOME_DIR, '.cursor', 'loki-config.json');
    if (fs.existsSync(path.join(HOME_DIR, '.cursor'))) {
      fs.writeFileSync(cursorConfigPath, configJson, 'utf-8');
      console.log(`  ${fmt('green', '✔')} 已同步：${cursorConfigPath}`);
    }
  } else {
    ensureGitignore(['loki-config.json', 'environments.json']);
  }
  console.log('');
  console.log(fmt('green', 'Loki 日志查询配置完成！'));
}

// ── 从 Markdown 文件解析配置（非交互式）──────────────────────────────────────

function runConfigFromFile(filePath, scope) {
  if (!fs.existsSync(filePath)) {
    console.error(fmt('red', `错误：文件不存在 "${filePath}"`));
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const isGlobal = scope === 'global';

  console.log(fmt('blue', fmt('bold', `从 Markdown 文件解析配置：${filePath}`)));
  console.log(fmt('magenta', `配置范围：${isGlobal ? '全局（~/.claude/）' : '本地（当前项目）'}`));
  console.log('');

  // 解析 MySQL 表格
  const mysqlConfig = parseMysqlFromMd(content);
  if (mysqlConfig) {
    const mysqlPath = isGlobal
      ? path.join(HOME_DIR, '.claude', 'mysql-config.json')
      : path.join(targetDir, '.claude', 'mysql-config.json');

    const configJson = JSON.stringify(mysqlConfig, null, 2) + '\n';
    const dir = path.dirname(mysqlPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mysqlPath, configJson, 'utf-8');
    console.log(`  ${fmt('green', '✔')} MySQL 配置（${Object.keys(mysqlConfig.environments).length} 个环境）→ ${mysqlPath}`);

    // 全局同步到 cursor
    if (isGlobal && fs.existsSync(path.join(HOME_DIR, '.cursor'))) {
      const cursorPath = path.join(HOME_DIR, '.cursor', 'mysql-config.json');
      fs.writeFileSync(cursorPath, configJson, 'utf-8');
      console.log(`  ${fmt('green', '✔')} 已同步 → ${cursorPath}`);
    }
  }

  // 解析 Loki 表格
  const lokiConfig = parseLokiFromMd(content);
  if (lokiConfig) {
    const lokiPath = isGlobal
      ? path.join(HOME_DIR, '.claude', 'loki-config.json')
      : path.join(targetDir, '.claude', 'loki-config.json');

    const configJson = JSON.stringify(lokiConfig, null, 2) + '\n';
    const dir = path.dirname(lokiPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(lokiPath, configJson, 'utf-8');
    console.log(`  ${fmt('green', '✔')} Loki 配置（${Object.keys(lokiConfig.environments).length} 个环境）→ ${lokiPath}`);

    if (isGlobal && fs.existsSync(path.join(HOME_DIR, '.cursor'))) {
      const cursorPath = path.join(HOME_DIR, '.cursor', 'loki-config.json');
      fs.writeFileSync(cursorPath, configJson, 'utf-8');
      console.log(`  ${fmt('green', '✔')} 已同步 → ${cursorPath}`);
    }
  }

  if (!mysqlConfig && !lokiConfig) {
    console.error(fmt('red', '未在文件中找到 MySQL 或 Loki 配置表格。'));
    console.log('');
    console.log('期望格式（MySQL）：');
    console.log('  | 环境 | host | port | user | password | range | 描述 |');
    console.log('');
    console.log('期望格式（Loki）：');
    console.log('  | 环境 | 名称 | URL | Token | 别名 | range |');
    process.exit(1);
  }

  if (!isGlobal) ensureGitignore(['mysql-config.json', 'loki-config.json']);

  console.log('');
  console.log(fmt('green', fmt('bold', '配置初始化完成！')));
  if (isGlobal) {
    console.log(fmt('cyan', '技能按 本地(.claude/) → 全局(~/.claude/) 顺序查找，本地优先。'));
  }
}

/** 从 Markdown 内容中解析 MySQL 配置表格 */
function parseMysqlFromMd(content) {
  // 找到 "MySQL" 标题后的表格
  const mysqlSection = extractSection(content, /mysql|数据库/i);
  if (!mysqlSection) return null;

  const rows = parseTable(mysqlSection);
  if (rows.length === 0) return null;

  const environments = {};
  for (const row of rows) {
    const env = row['环境'] || row['env'] || '';
    if (!env) continue;

    const host = row['host'] || '';
    const port = parseInt(row['port'] || '3306', 10);
    const user = row['user'] || '';
    const password = row['password'] || '';
    const range = row['range'] || '';
    const desc = row['描述'] || row['desc'] || `${env}环境`;

    if (!host || host.startsWith('YOUR_')) continue; // 跳过未填写的占位符

    environments[env] = { host, port, user, password, _desc: desc };
    if (range) environments[env].range = range;
  }

  if (Object.keys(environments).length === 0) return null;

  // 提取默认环境
  const defaultMatch = mysqlSection.match(/默认环境[:：]\s*(\S+)/);
  const defaultEnv = defaultMatch ? defaultMatch[1] : Object.keys(environments)[0];

  return {
    environments,
    default: defaultEnv,
    _comment: '从 Markdown 文件解析生成。支持 range 字段，查找顺序：本地 > 全局 ~/.claude/',
  };
}

/** 从 Markdown 内容中解析 Loki 配置表格 */
function parseLokiFromMd(content) {
  const lokiSection = extractSection(content, /loki|日志/i);
  if (!lokiSection) return null;

  const rows = parseTable(lokiSection);
  if (rows.length === 0) return null;

  const environments = {};
  for (const row of rows) {
    const env = row['环境'] || row['env'] || '';
    if (!env) continue;

    const name = row['名称'] || row['name'] || env;
    const url = row['url'] || row['URL'] || '';
    const token = row['token'] || row['Token'] || '';
    const aliasStr = row['别名'] || row['aliases'] || env;
    const aliases = aliasStr.split(',').map(s => s.trim()).filter(Boolean);
    const rangeStr = row['range'] || '';

    if (!url || url.startsWith('YOUR_')) continue;

    const envData = { name, url, token: token.startsWith('YOUR_') ? '' : token, aliases };
    if (rangeStr) {
      envData.range = rangeStr;
      envData.projects = expandRange(rangeStr);
    } else {
      envData.projects = [];
    }

    environments[env] = envData;
  }

  if (Object.keys(environments).length === 0) return null;

  const defaultMatch = lokiSection.match(/默认环境[:：]\s*(\S+)/);
  const activeEnv = defaultMatch ? defaultMatch[1] : Object.keys(environments)[0];

  return {
    _comment: '从 Markdown 文件解析生成。支持 range 字段，查找顺序：本地 > 全局 ~/.claude/',
    _setup: 'Token：Grafana → Administration → Service accounts → Add（Viewer）→ Add token',
    active: activeEnv,
    environments,
  };
}

/** 从 Markdown 中按标题提取段落 */
function extractSection(content, titlePattern) {
  const lines = content.split('\n');
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^#+\s/) && titlePattern.test(line)) {
      start = i;
      const level = line.match(/^(#+)/)[1].length;
      // 找到同级或更高级标题作为结束
      for (let j = i + 1; j < lines.length; j++) {
        const nextMatch = lines[j].match(/^(#+)\s/);
        if (nextMatch && nextMatch[1].length <= level) {
          end = j;
          break;
        }
      }
      break;
    }
  }
  if (start === -1) return null;
  return lines.slice(start, end).join('\n');
}

/** 解析 Markdown 表格为对象数组 */
function parseTable(text) {
  const lines = text.split('\n');
  let headerLine = -1;

  // 找到表头行（含 | 的行，下一行是分隔线 |---|）
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('|') && lines[i + 1] && lines[i + 1].match(/^\|[\s-:|]+\|$/)) {
      headerLine = i;
      break;
    }
  }
  if (headerLine === -1) return [];

  const parseRow = (line) => line.split('|').map(s => s.trim()).filter(Boolean);
  const headers = parseRow(lines[headerLine]);
  const rows = [];

  for (let i = headerLine + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('|')) break;
    const cells = parseRow(line);
    if (cells.length === 0) break;
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
    rows.push(row);
  }

  return rows;
}

// ── Config 工具函数 ─────────────────────────────────────────────────────────

function getLokiConfigPath() {
  const lokiJsonClaude = path.join(targetDir, '.claude', 'loki-config.json');
  if (fs.existsSync(lokiJsonClaude)) return lokiJsonClaude;
  const envJsonClaude = path.join(targetDir, '.claude', 'skills', 'loki-log-query', 'environments.json');
  if (fs.existsSync(envJsonClaude)) return envJsonClaude;
  const envJsonCursor = path.join(targetDir, '.cursor', 'skills', 'loki-log-query', 'environments.json');
  if (fs.existsSync(envJsonCursor)) return envJsonCursor;
  if (fs.existsSync(path.join(targetDir, '.claude'))) return lokiJsonClaude;
  if (fs.existsSync(path.join(targetDir, '.cursor'))) return path.join(targetDir, '.cursor', 'loki-config.json');
  return null;
}

/** 展开范围字符串为项目名列表，如 "dev1~15" → ["dev01","dev02",...,"dev15"] */
function expandRange(rangeStr) {
  const match = rangeStr.match(/^([a-zA-Z-]*)(\d+)\s*[~～]\s*(\d+)$/);
  if (!match) return [];
  const prefix = match[1];
  const start = parseInt(match[2], 10);
  const end = parseInt(match[3], 10);
  const maxDigits = Math.max(String(start).length, String(end).length, 2);
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(prefix + String(i).padStart(maxDigits, '0'));
  }
  return result;
}

function parseSelection(answer, names) {
  const selected = new Set();
  for (const part of answer.split(',')) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d)-(\d)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let n = start; n <= end; n++) {
        if (n >= 1 && n <= names.length) selected.add(names[n - 1]);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (n >= 1 && n <= names.length) selected.add(names[n - 1]);
    }
  }
  return [...selected];
}

function ensureGitignore(patterns) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }
  const lines = content.split('\n').map(l => l.trim());
  const toAdd = [];
  for (const pattern of patterns) {
    const alreadyIgnored = lines.some(line =>
      line.endsWith(pattern) || line.endsWith(`/${pattern}`) || line === `**/${pattern}`
    );
    if (!alreadyIgnored) {
      toAdd.push(`# 敏感配置 - ${pattern}`);
      toAdd.push(`**/${pattern}`);
    }
  }
  if (toAdd.length > 0) {
    const separator = content.endsWith('\n') || content === '' ? '' : '\n';
    fs.appendFileSync(gitignorePath, `${separator}${toAdd.join('\n')}\n`, 'utf-8');
    console.log(`  ${fmt('green', '✔')} 已更新 .gitignore`);
  }
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
  {
    name: 'codex',
    command: 'uvx',
    args: ['--from', 'git+https://github.com/GuDaStudio/codexmcp.git', 'codexmcp'],
    description: 'Codex 协作 — 代码审查、算法分析、生成补丁（需安装 uv）',
    env: {},
    recommended: false,
  },
];

/** MCP 配置文件路径映射 */
const MCP_CONFIG_PATHS = {
  claude: { file: '.claude/settings.json', key: 'mcpServers' },
  cursor: { file: '.cursor/mcp.json',      key: 'mcpServers' },
};

/** 解析 MCP 配置文件绝对路径 */
function resolveMcpConfigPath(toolName, scope = 'project') {
  const config = MCP_CONFIG_PATHS[toolName];
  if (!config) return '';
  const baseDir = scope === 'global' ? HOME_DIR : targetDir;
  return path.join(baseDir, config.file);
}

/** 检测指定作用域中已有的工具配置目录 */
function detectMcpTools(scope = 'project') {
  const baseDir = scope === 'global' ? HOME_DIR : targetDir;
  const tools = [];
  if (isRealDir(path.join(baseDir, '.claude'))) tools.push('claude');
  if (isRealDir(path.join(baseDir, '.cursor'))) tools.push('cursor');
  return tools;
}

/** 读取指定工具的 MCP 已配置服务器 */
function getMcpServers(toolName, filePath) {
  const config = MCP_CONFIG_PATHS[toolName];
  if (!config) return {};
  const resolvedPath = filePath || resolveMcpConfigPath(toolName, 'project');
  try {
    const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    return data[config.key] || {};
  } catch { return {}; }
}

/** 写入指定工具的 MCP 配置（保留文件其他字段） */
function setMcpServers(toolName, mcpServers, filePath) {
  const config = MCP_CONFIG_PATHS[toolName];
  if (!config) return;
  const resolvedPath = filePath || resolveMcpConfigPath(toolName, 'project');
  let data = {};
  try { data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')); } catch { /* 新建 */ }
  data[config.key] = mcpServers;
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2) + '\n');
}

/** 生成等效的手动安装 CLI 命令提示 */
function buildCliHints(entry, scope) {
  const scopeFlag = scope === 'global' ? '-s user ' : '';
  const hints = [];

  // Claude Code CLI
  if (entry.command && entry.command !== 'npx') {
    hints.push(`claude: claude mcp add ${entry.name} ${scopeFlag}--transport stdio -- ${entry.command} ${entry.args.join(' ')}`);
  } else {
    hints.push(`claude: claude mcp add ${entry.name} ${scopeFlag}-- npx -y ${entry.package}`);
  }

  // Cursor：无官方 CLI，提示手动编辑
  const cursorFile = scope === 'global' ? '~/.cursor/mcp.json' : '.cursor/mcp.json';
  hints.push(`cursor: 手动编辑 ${cursorFile}，在 mcpServers 中添加 "${entry.name}" 配置`);

  return hints;
}

/** 构建单个 MCP 服务器的配置对象 */
function buildMcpServerConfig(entry) {
  const command = entry.command || 'npx';
  const args = Array.isArray(entry.args) && entry.args.length > 0
    ? [...entry.args]
    : ['-y', entry.package];

  const config = { command, args };
  if (Object.keys(entry.env).length > 0) {
    config.env = { ...entry.env };
  }
  return config;
}

/** 获取所有工具中已安装的 MCP 服务器名称集合 */
function getInstalledMcpNames(tools, scope = 'project') {
  const names = new Set();
  for (const t of tools) {
    const configPath = resolveMcpConfigPath(t, scope);
    const servers = getMcpServers(t, configPath);
    for (const name of Object.keys(servers)) names.add(name);
  }
  return names;
}

function runMcp() {
  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：mcp 命令需要交互式终端'));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });

  (async () => {
    try {
      // 第一步：选择作用域
      console.log(fmt('cyan', '请选择 MCP 作用域：'));
      console.log('');
      console.log(`  ${fmt('bold', '1')}) ${fmt('green',  '项目级')}                       — 写入当前项目 .claude/.cursor`);
      console.log(`  ${fmt('bold', '2')}) ${fmt('yellow', '全局（~/.claude / ~/.cursor）')} — 对当前用户所有项目生效`);
      console.log('');
      const scopeAnswer = await ask(fmt('bold', '请输入选项 [1-2]: '));
      const scopeMap = { '1': 'project', '2': 'global' };
      const scope = scopeMap[scopeAnswer];
      if (!scope) {
        console.error(fmt('red', '无效作用域选项，退出。'));
        process.exit(1);
      }
      console.log('');

      const tools = detectMcpTools(scope);
      if (tools.length === 0) {
        if (scope === 'global') {
          console.log(fmt('yellow', '⚠  全局目录未检测到 ~/.claude/ 或 ~/.cursor/ 配置目录。'));
          console.log(`   请先运行: ${fmt('bold', 'npx ai-engineering-init global --tool claude')}`);
        } else {
          console.log(fmt('yellow', '⚠  当前目录未检测到 .claude/ 或 .cursor/ 配置目录。'));
          console.log(`   请先运行: ${fmt('bold', hintCmd('init --tool claude'))}`);
        }
        console.log('');
        process.exit(1);
      }

      const scopeLabel = scope === 'global'
        ? `全局（${HOME_DIR}/.claude / ${HOME_DIR}/.cursor）`
        : `项目级（${targetDir}）`;
      console.log(`  作用域: ${fmt('bold', scopeLabel)}`);
      console.log(`  检测到工具: ${fmt('bold', tools.join(', '))}`);
      console.log('');

      // 第二步：选择操作
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
        case '1': await mcpInstall(tools, ask, scope); break;
        case '2': await mcpUninstall(tools, ask, scope); break;
        case '3': mcpStatus(tools, scope); break;
        case '4': await mcpRecommend(tools, ask, scope); break;
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
async function mcpInstall(tools, ask, scope = 'project') {
  const installed = getInstalledMcpNames(tools, scope);

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
    const configPath = resolveMcpConfigPath(toolName, scope);
    const servers = getMcpServers(toolName, configPath);
    for (const entry of selected) {
      servers[entry.name] = buildMcpServerConfig(entry);
    }
    setMcpServers(toolName, servers, configPath);
    console.log(`  ${fmt('green', '✓')}  ${toolName}: 已写入 ${selected.map(e => e.name).join(', ')}`);
  }

  console.log('');
  console.log(fmt('green', fmt('bold', `✅ 已安装 ${selected.length} 个 MCP 服务器！`)));
  console.log('');

  // 输出等效手动安装命令供参考
  console.log(fmt('cyan', '💡 等效手动安装命令（仅供参考）：'));
  console.log('');
  for (const entry of selected) {
    console.log(`  ${fmt('bold', entry.name)}:`);
    for (const hint of buildCliHints(entry, scope)) {
      console.log(`    ${fmt('yellow', hint)}`);
    }
    console.log('');
  }
}

/** 卸载 MCP 服务器 */
async function mcpUninstall(tools, ask, scope = 'project') {
  // 收集所有已安装的服务器（合并去重）
  const allServers = new Map(); // name → 出现在哪些工具中
  for (const toolName of tools) {
    const configPath = resolveMcpConfigPath(toolName, scope);
    const servers = getMcpServers(toolName, configPath);
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
    const configPath = resolveMcpConfigPath(toolName, scope);
    const servers = getMcpServers(toolName, configPath);
    let removed = 0;
    for (const name of toRemove) {
      if (name in servers) {
        delete servers[name];
        removed++;
      }
    }
    if (removed > 0) {
      setMcpServers(toolName, servers, configPath);
      console.log(`  ${fmt('green', '✓')}  ${toolName}: 已移除 ${toRemove.filter(n => !servers[n]).join(', ')}`);
    }
  }

  console.log('');
  console.log(fmt('green', fmt('bold', `✅ 已卸载 ${toRemove.length} 个 MCP 服务器！`)));
  console.log('');
}

/** 查看 MCP 状态 */
function mcpStatus(tools, scope = 'project') {
  let hasAny = false;

  for (const toolName of tools) {
    const configPath = resolveMcpConfigPath(toolName, scope);
    const servers = getMcpServers(toolName, configPath);
    const names = Object.keys(servers);

    console.log(fmt('cyan', `[${toolName}]`) + ` ${configPath}`);

    if (names.length === 0) {
      console.log(`  ${fmt('yellow', '（无已安装的 MCP 服务器）')}`);
    } else {
      hasAny = true;
      for (const name of names) {
        const srv = servers[name];
        const args = srv.args || [];
        const pkg = args.find(a => a.startsWith('@'))
          || (srv.command !== 'npx' ? `${srv.command} ${args.join(' ')}` : '—');
        const envKeys = srv.env ? Object.keys(srv.env).join(', ') : '—';
        console.log(`  ${fmt('green', '●')} ${fmt('bold', name)}`);
        console.log(`    命令: ${pkg}  |  环境变量: ${envKeys}`);
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
async function mcpRecommend(tools, ask, scope = 'project') {
  const installed = getInstalledMcpNames(tools, scope);
  const toInstall = MCP_REGISTRY.filter(e => e.recommended && !installed.has(e.name));

  if (toInstall.length === 0) {
    console.log(fmt('green', '  ✓ 所有推荐的 MCP 服务器已安装！'));
    console.log('');
    mcpStatus(tools, scope);
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
    const configPath = resolveMcpConfigPath(toolName, scope);
    const servers = getMcpServers(toolName, configPath);
    for (const entry of toInstall) {
      servers[entry.name] = buildMcpServerConfig(entry);
    }
    setMcpServers(toolName, servers, configPath);
    console.log(`  ${fmt('green', '✓')}  ${toolName}: 已写入 ${toInstall.map(e => e.name).join(', ')}`);
  }

  console.log('');
  console.log(fmt('green', fmt('bold', `✅ 已安装 ${toInstall.length} 个推荐 MCP 服务器！`)));
  console.log('');

  // 输出等效手动安装命令供参考
  console.log(fmt('cyan', '💡 等效手动安装命令（仅供参考）：'));
  console.log('');
  for (const entry of toInstall) {
    console.log(`  ${fmt('bold', entry.name)}:`);
    for (const hint of buildCliHints(entry, scope)) {
      console.log(`    ${fmt('yellow', hint)}`);
    }
    console.log('');
  }
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
  console.log(`  ${fmt('bold', '5')}) ${fmt('blue',    '环境配置')}       — 初始化数据库连接 / Loki 日志查询配置`);
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
