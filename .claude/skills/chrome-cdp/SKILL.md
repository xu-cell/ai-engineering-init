---
name: chrome-cdp
description: 通过 Chrome DevTools Protocol 与本地 Chrome 浏览器交互（截图、导航、点击、执行JS等）
---

# Chrome CDP

轻量级 Chrome DevTools Protocol CLI 工具。通过 WebSocket 直接连接 Chrome 浏览器 —— 无需 Puppeteer，支持 100+ 标签页，即时连接。

## 前置条件

- Chrome 已启用远程调试：打开 `chrome://inspect/#remote-debugging` 并开启开关
- Node.js 22+（使用内置 WebSocket）—— 通过 nvm 自动切换

## 脚本路径

所有命令通过包装脚本执行（自动切换 Node.js 23）：

```bash
CDP="/Users/xujiajun/Developer/ai-engineering-init/.claude/skills/chrome-cdp/scripts/run-cdp.sh"
```

## 命令速查

### 列出打开的页面

```bash
bash $CDP list
```

### 截图

```bash
bash $CDP shot <target> [file]    # 默认: /tmp/screenshot.png
```

截取**视口**。需要滚动后内容时先用 `eval` 滚动。输出包含 DPR 和坐标转换提示。

### 可访问性树快照

```bash
bash $CDP snap <target>
```

### 执行 JavaScript

```bash
bash $CDP eval <target> <expr>
```

> **注意：** 避免跨多次 `eval` 调用使用基于索引的选择器（`querySelectorAll(...)[i]`），因为 DOM 可能在调用间变化。应在一次 `eval` 中收集所有数据或使用稳定选择器。

### 其他命令

```bash
bash $CDP html    <target> [selector]   # 完整页面或元素 HTML
bash $CDP nav     <target> <url>        # 导航并等待加载
bash $CDP net     <target>              # 资源加载计时
bash $CDP click   <target> <selector>   # 通过 CSS 选择器点击元素
bash $CDP clickxy <target> <x> <y>      # 在 CSS 像素坐标处点击
bash $CDP type    <target> <text>       # 在焦点元素处输入文本
bash $CDP loadall <target> <selector> [ms]  # 点击"加载更多"直到消失
bash $CDP evalraw <target> <method> [json]  # 原始 CDP 命令透传
bash $CDP stop    [target]              # 停止守护进程
```

## 坐标系统

`shot` 以原生分辨率保存图片：图片像素 = CSS 像素 x DPR。CDP 输入事件（`clickxy` 等）使用 **CSS 像素**。

```
CSS px = 截图图片 px / DPR
```

`shot` 会输出当前页面的 DPR。典型 Retina (DPR=2)：截图坐标除以 2。

## 使用技巧

- 优先使用 `snap --compact` 而非 `html` 来查看页面结构
- 使用 `type`（而非 eval）在跨域 iframe 中输入文本 —— 先用 `click`/`clickxy` 聚焦，再用 `type`
- Chrome 在首次访问标签页时显示"允许调试"弹窗。后台守护进程会保持会话，后续命令无需再次确认。守护进程在 20 分钟无活动后自动退出
