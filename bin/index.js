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

// ── ANSI 颜色 ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};
const fmt = (color, text) => `${c[color]}${text}${c.reset}`;

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
let command   = '';   // 'init' | 'update'
let tool      = '';
let targetDir = process.cwd();
let force     = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case 'update':       command   = 'update'; break;
    case '--tool': case '-t': tool = args[++i]; break;
    case '--dir':  case '-d': targetDir = path.resolve(args[++i]); break;
    case '--force':case '-f': force = true; break;
    case '--help': case '-h':
      printHelp();
      process.exit(0);
  }
}

function printHelp() {
  console.log(`用法: ${fmt('bold', 'npx ai-engineering-init')} [命令] [选项]\n`);
  console.log('命令:');
  console.log(`  ${fmt('bold', '(无)')  }          交互式初始化`);
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

// ── 工具定义（init 用） ──────────────────────────────────────────────────────
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

// ── 更新规则（update 用） ────────────────────────────────────────────────────
// update:  框架文件，始终从 npm 包最新版本覆盖
// preserve: 用户自定义文件，默认跳过（--force 时强制更新）
const UPDATE_RULES = {
  claude: {
    label: 'Claude Code',
    detect: '.claude',   // 检测目录，判断是否已安装
    update: [
      { src: '.claude/skills',            dest: '.claude/skills',            label: 'Skills（技能库）',   isDir: true },
      { src: '.claude/commands',          dest: '.claude/commands',          label: 'Commands（快捷命令）', isDir: true },
      { src: '.claude/agents',            dest: '.claude/agents',            label: 'Agents（子代理）',   isDir: true },
      { src: '.claude/hooks',             dest: '.claude/hooks',             label: 'Hooks（钩子脚本）',  isDir: true },
      { src: '.claude/templates',         dest: '.claude/templates',         label: 'Templates',         isDir: true },
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
      { src: '.cursor/skills',  dest: '.cursor/skills',  label: 'Skills（技能库）', isDir: true },
      { src: '.cursor/agents',  dest: '.cursor/agents',  label: 'Agents（子代理）', isDir: true },
      { src: '.cursor/hooks',   dest: '.cursor/hooks',   label: 'Hooks（钩子脚本）', isDir: true },
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

// ── 公共工具函数 ───────────────────────────────────────────────────────────
const SOURCE_DIR = path.join(__dirname, '..');

/** 统计目录中的文件总数 */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    count += fs.statSync(full).isDirectory() ? countFiles(full) : 1;
  }
  return count;
}

/** 递归复制目录 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ── INIT 逻辑 ──────────────────────────────────────────────────────────────
function copyItem({ src, dest, label, isDir }) {
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
  isDir ? copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
  console.log(`  ${fmt('green', '✓')}  ${label}`);
}

function initTool(toolKey) {
  const t = TOOLS[toolKey];
  console.log(fmt('cyan', `[${t.label}]`));
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
  if (!['claude', 'cursor', 'codex', 'all'].includes(selectedTool)) {
    console.error(fmt('red', `无效工具: ${selectedTool}。有效选项: claude | cursor | codex | all`));
    process.exit(1);
  }
  console.log(`  目标目录: ${fmt('bold', targetDir)}`);
  console.log(`  初始化工具: ${fmt('bold', selectedTool)}`);
  console.log('');
  console.log(fmt('bold', '正在复制文件...'));
  console.log('');

  if (selectedTool === 'all') {
    initTool('claude'); console.log(''); initTool('cursor'); console.log(''); initTool('codex');
  } else {
    initTool(selectedTool);
  }
  showDoneHint(selectedTool);
}

// ── UPDATE 逻辑 ─────────────────────────────────────────────────────────────

/** 检测当前目录已安装了哪些工具 */
function detectInstalledTools() {
  return Object.keys(UPDATE_RULES).filter(key => {
    const detectPath = path.join(targetDir, UPDATE_RULES[key].detect);
    return fs.existsSync(detectPath);
  });
}

/** 更新单个工具的框架文件 */
function updateTool(toolKey) {
  const rule = UPDATE_RULES[toolKey];
  console.log(fmt('cyan', `[${rule.label}]`));

  let updatedCount = 0;
  let skippedCount = 0;

  // 更新框架文件
  for (const item of rule.update) {
    const srcPath  = path.join(SOURCE_DIR, item.src);
    const destPath = path.join(targetDir, item.dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ${fmt('yellow', '⚠')}  ${item.label} 源文件不存在，跳过`);
      continue;
    }

    const fileCount = item.isDir ? countFiles(srcPath) : 1;
    if (item.isDir) {
      copyDir(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`  ${fmt('green', '✓')}  ${item.label} ${fmt('magenta', `(${fileCount} 个文件)`)}`);
    updatedCount += fileCount;
  }

  // 处理保留文件
  for (const item of rule.preserve) {
    const destPath = path.join(targetDir, item.dest);
    const srcPath  = path.join(SOURCE_DIR, item.dest);

    if (force) {
      // --force 时强制更新保留文件
      if (fs.existsSync(srcPath)) {
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
        console.log(`  ${fmt('green', '✓')}  ${item.dest} ${fmt('yellow', '(强制更新)')}`);
        updatedCount++;
      }
    } else {
      if (fs.existsSync(destPath)) {
        console.log(`  ${fmt('yellow', '⊘')}  ${item.dest} ${fmt('yellow', `已保留`)} — ${item.reason}`);
        skippedCount++;
      }
    }
  }

  return { updatedCount, skippedCount };
}

/** update 命令主流程 */
function runUpdate(selectedTool) {
  console.log(`  目标目录: ${fmt('bold', targetDir)}`);
  console.log(`  来源版本: ${fmt('bold', `v${PKG_VERSION}`)} (npm latest)`);
  if (force) console.log(`  ${fmt('yellow', '⚠  --force 模式：将同时更新用户保留文件')}`);
  console.log('');

  // 确定要更新的工具列表
  let toolsToUpdate = [];
  if (selectedTool && selectedTool !== 'all') {
    if (!UPDATE_RULES[selectedTool]) {
      console.error(fmt('red', `无效工具: ${selectedTool}。有效选项: claude | cursor | codex | all`));
      process.exit(1);
    }
    const detectPath = path.join(targetDir, UPDATE_RULES[selectedTool].detect);
    if (!fs.existsSync(detectPath)) {
      console.log(fmt('yellow', `⚠  ${selectedTool} 未在当前目录初始化，请先运行：`));
      console.log(`   ${fmt('bold', `npx ai-engineering-init --tool ${selectedTool}`)}\n`);
      process.exit(1);
    }
    toolsToUpdate = [selectedTool];
  } else if (selectedTool === 'all') {
    toolsToUpdate = Object.keys(UPDATE_RULES);
  } else {
    // 自动检测
    toolsToUpdate = detectInstalledTools();
    if (toolsToUpdate.length === 0) {
      console.log(fmt('yellow', '⚠  当前目录未检测到已安装的 AI 工具配置。'));
      console.log(`   请先运行 ${fmt('bold', 'npx ai-engineering-init')} 进行初始化。\n`);
      process.exit(1);
    }
    console.log(`  检测到已安装: ${fmt('bold', toolsToUpdate.join(', '))}`);
    console.log('');
  }

  console.log(fmt('bold', '正在更新框架文件...'));
  console.log('');

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < toolsToUpdate.length; i++) {
    const { updatedCount, skippedCount } = updateTool(toolsToUpdate[i]);
    totalUpdated += updatedCount;
    totalSkipped += skippedCount;
    if (i < toolsToUpdate.length - 1) console.log('');
  }

  // 汇总
  console.log('');
  console.log(fmt('green', fmt('bold', '✅ 更新完成！')));
  console.log('');
  console.log(`  ${fmt('green',  `✓ 更新文件: ${totalUpdated} 个`)}`);
  if (totalSkipped > 0) {
    console.log(`  ${fmt('yellow', `⊘ 已保留文件: ${totalSkipped} 个`)}（用户自定义，使用 --force 可强制更新）`);
  }
  console.log('');
  console.log(fmt('cyan', '提示：'));
  console.log('  重启 Claude Code / Cursor 使新技能生效');
  if (!force && totalSkipped > 0) {
    console.log(`  如需同步保留文件，运行: ${fmt('bold', `npx ai-engineering-init update --force`)}`);
  }
  console.log('');
}

// ── 主入口 ─────────────────────────────────────────────────────────────────
if (command === 'update') {
  runUpdate(tool);
} else if (tool) {
  run(tool);
} else {
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
