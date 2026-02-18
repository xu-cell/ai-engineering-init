#!/usr/bin/env node
/**
 * RuoYi AI Engineering 初始化 CLI
 * 用法:
 *   npx ai-engineering-init              # 交互式
 *   npx ai-engineering-init --tool claude
 *   npx ai-engineering-init --tool codex
 *   npx ai-engineering-init --tool all
 */
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ── ANSI 颜色 ──────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
};
const fmt = (color, text) => `${c[color]}${text}${c.reset}`;

// ── Banner ─────────────────────────────────────────────────────────────────
console.log('');
console.log(fmt('blue', fmt('bold', '┌─────────────────────────────────────────┐')));
console.log(fmt('blue', fmt('bold', '│   RuoYi AI Engineering 初始化工具  v1.0  │')));
console.log(fmt('blue', fmt('bold', '└─────────────────────────────────────────┘')));
console.log('');

// ── 参数解析 ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let tool      = '';
let targetDir = process.cwd();
let force     = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--tool': case '-t': tool      = args[++i]; break;
    case '--dir':  case '-d': targetDir = path.resolve(args[++i]); break;
    case '--force':case '-f': force     = true; break;
    case '--help': case '-h':
      console.log(`用法: ${fmt('bold', 'npx ai-engineering-init')} [选项]\n`);
      console.log('选项:');
      console.log('  --tool, -t <工具>   指定工具: claude | codex | all');
      console.log('  --dir,  -d <目录>   目标目录（默认：当前目录）');
      console.log('  --force,-f          强制覆盖已有文件');
      console.log('  --help, -h          显示此帮助\n');
      console.log('示例:');
      console.log('  npx ai-engineering-init --tool claude');
      console.log('  npx ai-engineering-init --tool all --dir /path/to/project\n');
      process.exit(0);
  }
}

// ── 工具定义 ───────────────────────────────────────────────────────────────
const TOOLS = {
  claude: {
    label: 'Claude Code',
    files: [
      { src: '.claude',   dest: '.claude',   label: '.claude/ 目录', isDir: true },
      { src: 'CLAUDE.md', dest: 'CLAUDE.md', label: 'CLAUDE.md'                 },
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

// ── 工具函数 ───────────────────────────────────────────────────────────────
const SOURCE_DIR = path.join(__dirname, '..');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

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
  if (toolKey === 'codex' || toolKey === 'all') {
    console.log(fmt('cyan', 'Codex 使用：'));
    console.log(`  1. 按需修改 ${fmt('bold', 'AGENTS.md')} 中的项目说明`);
    console.log(`  2. 在 Codex 中使用 .codex/skills/ 下的技能`);
    console.log('');
  }
}

// ── 主逻辑 ────────────────────────────────────────────────────────────────
function run(selectedTool) {
  if (!['claude', 'codex', 'all'].includes(selectedTool)) {
    console.error(fmt('red', `无效工具: ${selectedTool}。有效选项: claude | codex | all`));
    process.exit(1);
  }
  console.log(`  目标目录: ${fmt('bold', targetDir)}`);
  console.log(`  初始化工具: ${fmt('bold', selectedTool)}`);
  console.log('');
  console.log(fmt('bold', '正在复制文件...'));
  console.log('');

  if (selectedTool === 'all') {
    initTool('claude'); console.log(''); initTool('codex');
  } else {
    initTool(selectedTool);
  }
  showDoneHint(selectedTool);
}

if (tool) {
  run(tool);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(fmt('cyan', '请选择要初始化的 AI 工具：'));
  console.log('');
  console.log(`  ${fmt('bold', '1')}) ${fmt('green', 'Claude Code')}   — 初始化 .claude/ + CLAUDE.md`);
  console.log(`  ${fmt('bold', '2')}) ${fmt('yellow', 'OpenAI Codex')}  — 初始化 .codex/ + AGENTS.md`);
  console.log(`  ${fmt('bold', '3')}) ${fmt('blue', '全部工具')}       — 同时初始化 Claude + Codex`);
  console.log('');
  rl.question(fmt('bold', '请输入选项 [1-3]: '), (answer) => {
    rl.close();
    const map = { '1': 'claude', '2': 'codex', '3': 'all' };
    const selected = map[answer.trim()];
    if (!selected) { console.error(fmt('red', '无效选项，退出。')); process.exit(1); }
    console.log('');
    run(selected);
  });
}
