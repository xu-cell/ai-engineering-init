/**
 * 智能完成通知模块
 * 支持音效、系统通知弹窗、TTS 语音播报三种方式的任意组合
 * 跨平台兼容：macOS / Windows / Linux
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// ── 默认配置 ─────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  notify: {
    methods: ['sound'],
    sound: { enabled: true, file: 'completed.wav' },
    notification: { enabled: false, title: 'AI 任务完成' },
    tts: { enabled: false, prefix: '任务完成', maxLength: 80 },
    summary: { maxLength: 100, strategy: 'first-sentence', stripMarkdown: true },
  },
};

// ── 工具函数 ─────────────────────────────────────────────────────────────

/** 深度合并对象（src 补充到 dest，dest 已有的键保留） */
function deepMerge(dest, src) {
  const result = { ...dest };
  for (const [key, value] of Object.entries(src)) {
    if (key in result && typeof result[key] === 'object' && result[key] !== null
        && !Array.isArray(result[key]) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = deepMerge(result[key], value);
    } else if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}

/** 带超时的 spawn，返回 Promise */
function spawnWithTimeout(cmd, args, opts, timeoutMs) {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], ...opts });
      const timer = setTimeout(() => {
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
        resolve(false);
      }, timeoutMs);
      child.on('close', () => { clearTimeout(timer); resolve(true); });
      child.on('error', () => { clearTimeout(timer); resolve(false); });
    } catch {
      resolve(false);
    }
  });
}

// ── 1. readStdin ─────────────────────────────────────────────────────────

/** 读取 hook stdin JSON（2s 超时，失败返回 null） */
function readStdin() {
  return new Promise((resolve) => {
    // 非 TTY 且有 pipe 数据时才读取
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.destroy();
      resolve(null);
    }, 2000);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    process.stdin.resume();
  });
}

// ── 2. loadConfig ────────────────────────────────────────────────────────

/** 加载配置文件，按查找顺序：工作区 → 全局 → 内置默认值 */
function loadConfig(cwd) {
  const homeDir = os.homedir();
  const candidates = [
    path.join(cwd, '.claude', 'notify-config.json'),
    path.join(cwd, '.cursor', 'notify-config.json'),
    path.join(homeDir, '.claude', 'notify-config.json'),
    path.join(homeDir, '.cursor', 'notify-config.json'),
  ];

  for (const configPath of candidates) {
    try {
      if (fs.existsSync(configPath)) {
        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // 用户配置优先，缺失字段用默认值补充
        return deepMerge(userConfig, DEFAULT_CONFIG);
      }
    } catch {
      // 配置文件解析失败，继续尝试下一个
    }
  }

  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

// ── 3. extractSummary ────────────────────────────────────────────────────

/** 从 last_assistant_message 提取摘要 */
function extractSummary(message, config) {
  if (!message || typeof message !== 'string') return '';

  const summaryConfig = config.notify.summary;
  let text = message;

  // 去除 markdown 标记
  if (summaryConfig.stripMarkdown) {
    text = text
      .replace(/```[\s\S]*?```/g, '')       // 代码块
      .replace(/`[^`]+`/g, '')              // 行内代码
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 文字
      .replace(/^#{1,6}\s+.*$/gm, '')       // 整行标题（含文字）
      .replace(/\*\*([^*]+)\*\*/g, '$1')    // 粗体
      .replace(/\*([^*]+)\*/g, '$1')        // 斜体
      .replace(/~~([^~]+)~~/g, '$1')        // 删除线
      .replace(/^[-*+]\s+/gm, '')           // 无序列表标记
      .replace(/^\d+\.\s+/gm, '')           // 有序列表标记
      .replace(/^>\s+/gm, '')               // 引用
      .replace(/\n{2,}/g, '\n')             // 多余空行
      .trim();
  }

  if (!text) return '';

  const maxLen = summaryConfig.maxLength || 100;
  const strategy = summaryConfig.strategy || 'first-sentence';

  let result = '';

  switch (strategy) {
    case 'first-sentence': {
      // 匹配第一个句末标点（中文标点后无需空格，英文句号需后跟空格或结尾）
      const match = text.match(/^(.+?(?:[。！？!?]|\.(?:\s|$)))/);
      result = match ? match[1] : text.split('\n')[0];
      break;
    }
    case 'first-line': {
      result = text.split('\n')[0];
      break;
    }
    case 'truncate':
    default: {
      result = text;
      break;
    }
  }

  // 截断到 maxLength
  if (result.length > maxLen) {
    result = result.substring(0, maxLen - 3) + '...';
  }

  return result.trim();
}

// ── 4. playSound ─────────────────────────────────────────────────────────

/** 跨平台播放音效（5s 超时） */
function playSound(cwd, fileName) {
  const homeDir = os.homedir();
  const candidates = [
    path.join(cwd, '.claude', 'audio', fileName),
    path.join(cwd, '.cursor', 'audio', fileName),
    path.join(homeDir, '.claude', 'audio', fileName),
    path.join(homeDir, '.cursor', 'audio', fileName),
  ];

  const audioFile = candidates.find(f => {
    try { return fs.existsSync(f); } catch { return false; }
  });

  if (!audioFile) return Promise.resolve(false);

  const platform = process.platform;

  if (platform === 'darwin') {
    return spawnWithTimeout('afplay', [audioFile], {}, 5000);
  } else if (platform === 'win32') {
    return spawnWithTimeout('powershell', [
      '-c', `(New-Object Media.SoundPlayer '${audioFile.replace(/'/g, "''")}').PlaySync()`,
    ], {}, 5000);
  } else {
    // Linux: 尝试 aplay → paplay
    return spawnWithTimeout('aplay', [audioFile], {}, 5000).then(ok => {
      if (!ok) return spawnWithTimeout('paplay', [audioFile], {}, 5000);
      return true;
    });
  }
}

// ── 5. sendNotification ──────────────────────────────────────────────────

/** 跨平台系统通知弹窗（2s 超时） */
function sendNotification(title, body) {
  const safeTitle = (title || '').replace(/"/g, '\\"');
  const safeBody = (body || '').replace(/"/g, '\\"');
  const platform = process.platform;

  if (platform === 'darwin') {
    return spawnWithTimeout('osascript', [
      '-e', `display notification "${safeBody}" with title "${safeTitle}"`,
    ], {}, 2000);
  } else if (platform === 'win32') {
    const ps = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
      $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
      $textNodes = $template.GetElementsByTagName('text');
      $textNodes.Item(0).AppendChild($template.CreateTextNode('${safeTitle}')) | Out-Null;
      $textNodes.Item(1).AppendChild($template.CreateTextNode('${safeBody}')) | Out-Null;
      $toast = [Windows.UI.Notifications.ToastNotification]::new($template);
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AI Assistant').Show($toast);
    `.replace(/\n\s*/g, ' ');
    return spawnWithTimeout('powershell', ['-c', ps], {}, 2000);
  } else {
    // Linux: notify-send
    return spawnWithTimeout('notify-send', [safeTitle, safeBody], {}, 2000);
  }
}

// ── 6. speakTTS ──────────────────────────────────────────────────────────

/** 跨平台语音播报（7s 超时） */
function speakTTS(text, config) {
  if (!text) return Promise.resolve(false);

  const prefix = config.notify.tts.prefix || '';
  const fullText = prefix ? `${prefix}，${text}` : text;
  const maxLen = config.notify.tts.maxLength || 80;
  const spoken = fullText.length > maxLen ? fullText.substring(0, maxLen) : fullText;

  const platform = process.platform;

  if (platform === 'darwin') {
    return spawnWithTimeout('say', [spoken], {}, 7000);
  } else if (platform === 'win32') {
    const safeTxt = spoken.replace(/'/g, "''");
    return spawnWithTimeout('powershell', [
      '-c', `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${safeTxt}')`,
    ], {}, 7000);
  } else {
    // Linux: spd-say → espeak
    return spawnWithTimeout('spd-say', [spoken], {}, 7000).then(ok => {
      if (!ok) return spawnWithTimeout('espeak', [spoken], {}, 7000);
      return true;
    });
  }
}

// ── 7. run（主入口）──────────────────────────────────────────────────────

/** 主入口：读配置 → 读 stdin → 提取摘要 → 并行执行通知 */
async function run(cwd) {
  const config = loadConfig(cwd);
  const methods = config.notify.methods || ['sound'];

  // 读取 stdin（Claude/Cursor hook 通过 stdin 传入 JSON）
  const stdinData = await readStdin();
  const lastMessage = stdinData && stdinData.last_assistant_message
    ? stdinData.last_assistant_message
    : null;

  // 提取摘要
  const summary = lastMessage ? extractSummary(lastMessage, config) : '';

  // 并行执行各通知方式
  const tasks = [];

  if (methods.includes('sound') && config.notify.sound.enabled !== false) {
    tasks.push(playSound(cwd, config.notify.sound.file || 'completed.wav'));
  }

  if (methods.includes('notification') && config.notify.notification.enabled !== false) {
    const title = config.notify.notification.title || 'AI 任务完成';
    const body = summary || '回答已完成';
    tasks.push(sendNotification(title, body));
  }

  if (methods.includes('tts') && config.notify.tts.enabled !== false) {
    const ttsText = summary || '回答已完成';
    tasks.push(speakTTS(ttsText, config));
  }

  // 等待所有通知完成（任何失败都静默忽略）
  await Promise.allSettled(tasks);
}

module.exports = { run, readStdin, loadConfig, extractSummary, playSound, sendNotification, speakTTS };
