#!/usr/bin/env node

/**
 * build-skills.js
 *
 * 从 src/skills/ 单一源生成 .claude/skills/, .codex/skills/, .cursor/skills/ 三个平台目录。
 * 根据 src/platform-map.json 决定每个技能分发到哪些平台。
 *
 * 用法：
 *   node scripts/build-skills.js          # 构建
 *   node scripts/build-skills.js --check  # 仅检查一致性（CI 用）
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'skills');
const PLATFORM_MAP_PATH = path.join(ROOT, 'src', 'platform-map.json');

const PLATFORM_DIRS = {
  claude: path.join(ROOT, '.claude', 'skills'),
  codex: path.join(ROOT, '.codex', 'skills'),
  cursor: path.join(ROOT, '.cursor', 'skills'),
};

const CHECK_MODE = process.argv.includes('--check');

// ── 工具函数 ────────────────────────────────────────────

function loadPlatformMap() {
  const raw = fs.readFileSync(PLATFORM_MAP_PATH, 'utf-8');
  return JSON.parse(raw);
}

function getSkillPlatforms(skillName, platformMap) {
  if (platformMap.overrides[skillName]) {
    return platformMap.overrides[skillName].platforms;
  }
  return platformMap.defaults.platforms;
}

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function dirContentsEqual(dir1, dir2) {
  if (!fs.existsSync(dir1) || !fs.existsSync(dir2)) return false;

  const entries1 = getAllFiles(dir1).map(f => path.relative(dir1, f)).sort();
  const entries2 = getAllFiles(dir2).map(f => path.relative(dir2, f)).sort();

  if (entries1.length !== entries2.length) return false;

  for (let i = 0; i < entries1.length; i++) {
    if (entries1[i] !== entries2[i]) return false;

    const content1 = fs.readFileSync(path.join(dir1, entries1[i]));
    const content2 = fs.readFileSync(path.join(dir2, entries2[i]));

    if (!content1.equals(content2)) return false;
  }
  return true;
}

function getAllFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function removeDirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// ── 主逻辑 ──────────────────────────────────────────────

function build() {
  const platformMap = loadPlatformMap();
  const skillDirs = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const stats = { claude: 0, codex: 0, cursor: 0 };
  const errors = [];

  // 构建每个技能到目标平台
  for (const skillName of skillDirs) {
    const platforms = getSkillPlatforms(skillName, platformMap);
    const srcSkillDir = path.join(SRC_DIR, skillName);

    for (const platform of platforms) {
      const destSkillDir = path.join(PLATFORM_DIRS[platform], skillName);

      if (CHECK_MODE) {
        // 检查模式：对比内容是否一致
        if (!dirContentsEqual(srcSkillDir, destSkillDir)) {
          errors.push(`${platform}/skills/${skillName} 与 src/skills/${skillName} 不一致`);
        }
      } else {
        // 构建模式：删除旧的，复制新的
        removeDirRecursive(destSkillDir);
        copyDirRecursive(srcSkillDir, destSkillDir);
      }
      stats[platform]++;
    }
  }

  if (CHECK_MODE) {
    // 反向检查：平台目录中是否存在 src 中没有的技能
    for (const [platform, platformDir] of Object.entries(PLATFORM_DIRS)) {
      if (!fs.existsSync(platformDir)) continue;
      const platformSkills = fs.readdirSync(platformDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const skill of platformSkills) {
        const platforms = getSkillPlatforms(skill, platformMap);
        if (!platforms.includes(platform)) {
          errors.push(`${platform}/skills/${skill} 不应存在（platform-map 未配置）`);
        }
        if (!fs.existsSync(path.join(SRC_DIR, skill))) {
          errors.push(`${platform}/skills/${skill} 在 src/skills/ 中不存在`);
        }
      }
    }
  }

  return { stats, errors, skillCount: skillDirs.length };
}

// ── 执行 ────────────────────────────────────────────────

console.log(CHECK_MODE ? '🔍 检查三平台一致性...' : '🔨 从 src/skills/ 构建三平台目录...');
console.log();

const { stats, errors, skillCount } = build();

console.log(`📦 src/skills/ 源技能数: ${skillCount}`);
console.log(`   → .claude/skills/: ${stats.claude} 个`);
console.log(`   → .codex/skills/:  ${stats.codex} 个`);
console.log(`   → .cursor/skills/: ${stats.cursor} 个`);
console.log();

if (errors.length > 0) {
  console.error(`❌ 发现 ${errors.length} 个不一致:`);
  errors.forEach(e => console.error(`   • ${e}`));
  process.exit(1);
} else {
  console.log(CHECK_MODE ? '✅ 三平台与 src/skills/ 完全一致' : '✅ 构建完成');
}
