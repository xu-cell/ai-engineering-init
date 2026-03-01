#!/usr/bin/env node
/**
 * AI Engineering 初始化 / 更新 CLI
 * 用法:
 *   npx ai-engineering-init              # 交互式初始化
 *   npx ai-engineering-init --tool claude
 *   npx ai-engineering-init --tool all
 *   npx ai-engineering-init update       # 自动检测已安装工具并更新
 *   npx ai-engineering-init update --tool claude
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
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
let command   = '';   // 'update' | ''
let tool      = '';
let targetDir = process.cwd();
let force     = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case 'update':
      command = 'update';
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
  console.log(`  ${fmt('bold', '(无)')}            交互式初始化`);
  console.log(`  ${fmt('bold', 'update')}           更新已安装的框架文件（跳过用户自定义文件）\n`);
  console.log('选项:');
  console.log('  --tool, -t <工具>   指定工具: claude | cursor | codex | all');
  console.log('  --dir,  -d <目录>   目标目录（默认：当前目录）');
  console.log('  --force,-f          强制覆盖（init 时覆盖已有文件；update 时同时更新保留文件）');
  console.log('  --help, -h          显示此帮助\n');
  console.log('示例:');
  console.log('  npx ai-engineering-init --tool claude');
  console.log('  npx ai-engineering-init --tool all --dir /path/to/project');
  console.log('  npx ai-engineering-init update               # 自动检测已安装工具');
  console.log('  npx ai-engineering-init update --tool claude # 只更新 Claude');
  console.log('  npx ai-engineering-init update --force       # 强制更新，包括保留文件\n');
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
      { src: '.claude/framework-config.json', dest: '.claude/framework-config.json', label: 'framework-config.json' },
    ],
    preserve: [
      { dest: '.claude/settings.json', reason: '包含用户 MCP 配置和权限设置' },
      { dest: 'CLAUDE.md',             reason: '包含项目自定义规范' },
    ],
  },
  cursor: {
    label: 'Cursor',
    detect: '.cursor',
    update: [
      { src: '.cursor/skills',     dest: '.cursor/skills',     label: 'Skills（技能库）',  isDir: true },
      { src: '.cursor/agents',     dest: '.cursor/agents',     label: 'Agents（子代理）',  isDir: true },
      { src: '.cursor/hooks',      dest: '.cursor/hooks',      label: 'Hooks（钩子脚本）', isDir: true },
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

// ── 主入口 ────────────────────────────────────────────────────────────────
if (command === 'update') {
  runUpdate(tool);
} else if (tool) {
  run(tool);
} else {
  // 非 TTY 环境（CI/管道）无法交互，强制要求显式指定 --tool
  if (!process.stdin.isTTY) {
    console.error(fmt('red', '错误：非交互环境下必须指定 --tool 参数'));
    console.error(`  示例: ${fmt('bold', hintCmd('--tool claude'))}`);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(fmt('cyan', '请选择要初始化的 AI 工具：'));
  console.log('');
  console.log(`  ${fmt('bold', '1')}) ${fmt('green',   'Claude Code')}   — 初始化 .claude/ + CLAUDE.md`);
  console.log(`  ${fmt('bold', '2')}) ${fmt('cyan',    'Cursor')}        — 初始化 .cursor/（Skills + Agents + MCP）`);
  console.log(`  ${fmt('bold', '3')}) ${fmt('yellow',  'OpenAI Codex')}  — 初始化 .codex/ + AGENTS.md`);
  console.log(`  ${fmt('bold', '4')}) ${fmt('blue',    '全部工具')}       — 同时初始化 Claude + Cursor + Codex`);
  console.log('');
  rl.question(fmt('bold', '请输入选项 [1-4]: '), (answer) => {
    rl.close();
    const map = { '1': 'claude', '2': 'cursor', '3': 'codex', '4': 'all' };
    const selected = map[answer.trim()];
    if (!selected) { console.error(fmt('red', '无效选项，退出。')); process.exit(1); }
    console.log('');
    run(selected);
  });
}
