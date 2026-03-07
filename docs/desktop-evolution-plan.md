# AI Engineering Init — 桌面端演进计划

> 技术栈：Rust (Tauri) + Vue 3 + TypeScript
> 定位：从 CLI 配置生成器 → AI 开发驾驶舱

---

## 演进路线总览

```
Phase 0 (当前)          Phase 1              Phase 2              Phase 3              Phase 4
CLI 配置生成器    →    桌面 GUI 化      →    流程编排引擎    →    AI Agent 中控台  →    团队协作平台
npx 一行命令           Tauri + Vue 3         可视化工作流          多 Agent 调度          技能市场
84 个 Skills          技能管理面板          拖拽编排              实时监控               共享协作
```

---

## Phase 0: 当前状态（已完成）

### 核心能力

| 能力 | 实现方式 |
|------|---------|
| 一键初始化 | `npx ai-engineering-init --tool <claude\|cursor\|codex\|all>` |
| 自动更新 | `npx ai-engineering-init update` |
| 全局安装 | `npx ai-engineering-init global` |
| 反馈闭环 | `npx ai-engineering-init sync-back` |
| MCP 管理 | `npx ai-engineering-init mcp` |
| 数据库配置 | `npx ai-engineering-init config` |

### 技术栈

- 语言：JavaScript (Node.js ≥16)
- 入口：`bin/index.js`（67KB）
- 技能源：`src/skills/`（84 个技能）
- 平台分发：`src/platform-map.json`
- 构建：`scripts/build-skills.js`

### 架构亮点

- 单一源架构：`src/skills/` → 构建 → `.claude/` + `.cursor/` + `.codex/`
- 渐进披露：主文档 + `references/` 子目录
- 平台适配：`platform-map.json` 控制分发规则

---

## Phase 1: 桌面 GUI 化

### 目标

把现有 CLI 功能全部可视化，提供图形界面管理技能、项目、配置。

### 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| **Tauri** | v2 | 桌面应用框架（Rust 后端 + WebView） |
| **Rust** | stable | 后端逻辑：文件操作、Git、JSON 解析 |
| **Vue 3** | 3.x | 前端界面（Composition API + `<script setup>`） |
| **TypeScript** | 5.x | 前端类型安全 |
| **Pinia** | 2.x | 状态管理 |
| **Vue Router** | 4.x | 路由 |
| **Tailwind CSS** | 3.x | 样式（或 UnoCSS） |

### 选 Tauri 而非 Electron 的理由

| 维度 | Tauri | Electron |
|------|-------|----------|
| 安装包 | ~3-10 MB | ~150-200 MB |
| 内存 | ~30-50 MB | ~100-300 MB |
| 启动速度 | 快 | 慢 |
| 移动端 | Tauri v2 支持 iOS/Android | 不支持 |
| 学习价值 | 学 Rust（长期价值高） | 已熟悉 Node.js |
| 安全性 | 默认安全（权限白名单） | 全权限（风险高） |

### 项目结构

```
ai-engineering-desktop/
├── src-tauri/                      # Rust 后端
│   ├── src/
│   │   ├── main.rs                 # 入口
│   │   ├── lib.rs                  # 模块注册
│   │   ├── commands/               # Tauri commands（暴露给前端）
│   │   │   ├── mod.rs
│   │   │   ├── skill.rs            # 技能 CRUD
│   │   │   ├── project.rs          # 项目管理
│   │   │   ├── config.rs           # 配置读写
│   │   │   ├── git.rs              # Git 操作
│   │   │   └── platform.rs         # 平台分发
│   │   ├── engine/                 # 核心引擎
│   │   │   ├── mod.rs
│   │   │   ├── skill_loader.rs     # 解析 SKILL.md
│   │   │   ├── platform_map.rs     # 平台分发逻辑
│   │   │   └── builder.rs          # 构建分发
│   │   └── models/                 # 数据结构
│   │       ├── mod.rs
│   │       ├── skill.rs            # SkillInfo
│   │       ├── project.rs          # ProjectInfo
│   │       └── config.rs           # AppConfig
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                            # Vue 3 前端
│   ├── App.vue
│   ├── main.ts
│   ├── views/
│   │   ├── Dashboard.vue           # 仪表盘（项目概览）
│   │   ├── Skills.vue              # 技能管理
│   │   ├── Projects.vue            # 项目管理
│   │   ├── PlatformMap.vue         # 平台分发配置
│   │   ├── Builder.vue             # 构建面板
│   │   └── Settings.vue            # 应用设置
│   ├── components/
│   │   ├── SkillCard.vue           # 技能卡片
│   │   ├── SkillEditor.vue         # SKILL.md 编辑器（Markdown）
│   │   ├── SkillFilter.vue         # 筛选/搜索
│   │   ├── PlatformSelector.vue    # 平台选择器
│   │   ├── ProjectCard.vue         # 项目卡片
│   │   └── SideNav.vue             # 侧边导航
│   ├── stores/
│   │   ├── skills.ts               # 技能状态
│   │   ├── projects.ts             # 项目状态
│   │   └── app.ts                  # 全局状态
│   ├── router/
│   │   └── index.ts
│   └── types/
│       ├── skill.ts                # 技能类型定义
│       └── project.ts              # 项目类型定义
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 界面设计

#### 主界面布局

```
┌─────────────────────────────────────────────────────┐
│  AI Engineering Init                        ─ □ ×   │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ 📊 仪表盘 │  [当前视图内容]                           │
│          │                                          │
│ 📁 项目   │                                          │
│          │                                          │
│ 🧩 技能   │                                          │
│          │                                          │
│ 🔀 分发   │                                          │
│          │                                          │
│ 🔨 构建   │                                          │
│          │                                          │
│ ⚙️ 设置   │                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│  状态栏: v1.7.0 | 84 Skills | 3 Platforms          │
└─────────────────────────────────────────────────────┘
```

#### 技能管理页

```
┌──────────────────────────────────────────────────────┐
│  🧩 技能管理                                [+ 新建]  │
├──────────────────────────────────────────────────────┤
│  🔍 搜索技能...    分类: [全部▾]  平台: [全部▾]       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────┐  ┌────────────────────┐     │
│  │ crud-development   │  │ api-development    │     │
│  │ CRUD 开发规范       │  │ API 接口设计规范    │     │
│  │ ☑C ☑Cx ☑Cu        │  │ ☑C ☑Cx ☑Cu        │     │
│  │ [编辑] [预览]       │  │ [编辑] [预览]       │     │
│  └────────────────────┘  └────────────────────┘     │
│                                                      │
│  ┌────────────────────┐  ┌────────────────────┐     │
│  │ bug-detective      │  │ database-ops       │     │
│  │ Bug 排查指南        │  │ 数据库操作规范      │     │
│  │ ☑C ☑Cx ☑Cu        │  │ ☑C ☑Cx ☑Cu        │     │
│  │ [编辑] [预览]       │  │ [编辑] [预览]       │     │
│  └────────────────────┘  └────────────────────┘     │
│                                                      │
│  共 84 个技能 | 通用: 34 | leniu: 25 | OpenSpec: 10  │
└──────────────────────────────────────────────────────┘

C = Claude | Cx = Codex | Cu = Cursor
```

### Rust 侧核心代码示例

#### 技能管理 Command

```rust
// src-tauri/src/commands/skill.rs

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]  // Rust snake_case -> 前端 camelCase 自动转换
pub struct SkillInfo {
    pub name: String,
    pub description: String,     // SKILL.md 第一行
    pub platforms: Vec<String>,  // ["claude", "cursor", "codex"]
    pub category: String,        // "通用" | "leniu" | "openspec"
    pub has_references: bool,    // 前端收到 "hasReferences"
    pub content: Option<String>, // SKILL.md 完整内容（按需加载）
}

#[command]
pub fn list_skills(project_path: String) -> Result<Vec<SkillInfo>, String> {
    let skills_dir = PathBuf::from(&project_path).join("src/skills");

    if !skills_dir.exists() {
        return Err(format!("技能目录不存在: {}", skills_dir.display()));
    }

    let mut skills = Vec::new();

    let entries = fs::read_dir(&skills_dir)
        .map_err(|e| format!("读取目录失败: {}", e))?;

    for entry in entries.flatten() {
        if !entry.path().is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        let skill_md = entry.path().join("SKILL.md");

        let description = fs::read_to_string(&skill_md)
            .unwrap_or_default()
            .lines()
            .next()
            .unwrap_or("")
            .trim_start_matches("# ")
            .to_string();

        let has_references = entry.path().join("references").is_dir();

        let category = if name.starts_with("leniu-") {
            "leniu".to_string()
        } else if name.starts_with("openspec-") {
            "openspec".to_string()
        } else {
            "通用".to_string()
        };

        skills.push(SkillInfo {
            name,
            description,
            platforms: vec!["claude".into(), "cursor".into(), "codex".into()],
            category,
            has_references,
            content: None, // 列表不加载完整内容
        });
    }

    skills.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(skills)
}

#[command]
pub fn get_skill_content(project_path: String, skill_name: String) -> Result<String, String> {
    let skill_md = PathBuf::from(&project_path)
        .join("src/skills")
        .join(&skill_name)
        .join("SKILL.md");

    fs::read_to_string(&skill_md)
        .map_err(|e| format!("读取技能失败: {}", e))
}

#[command]
pub fn save_skill_content(
    project_path: String,
    skill_name: String,
    content: String,
) -> Result<(), String> {
    let skill_md = PathBuf::from(&project_path)
        .join("src/skills")
        .join(&skill_name)
        .join("SKILL.md");

    fs::write(&skill_md, content)
        .map_err(|e| format!("保存技能失败: {}", e))
}
```

#### Git 操作 Command

```rust
// src-tauri/src/commands/git.rs

use std::process::Command;
use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub changed_files: Vec<String>,  // 前端收到 "changedFiles"
    pub is_clean: bool,              // 前端收到 "isClean"
}

#[tauri::command]
pub fn git_status(project_path: String) -> Result<GitStatus, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain", "-b"])
        .current_dir(&project_path)
        .output()
        .map_err(|e| format!("Git 执行失败: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();

    let branch = lines
        .first()
        .unwrap_or(&"")
        .trim_start_matches("## ")
        .split("...")
        .next()
        .unwrap_or("unknown")
        .to_string();

    let changed_files: Vec<String> = lines
        .iter()
        .skip(1)
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    let is_clean = changed_files.is_empty();

    Ok(GitStatus {
        branch,
        changed_files,
        is_clean,
    })
}
```

#### 构建分发 Command

```rust
// src-tauri/src/commands/platform.rs

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct PlatformMap {
    pub defaults: PlatformDefaults,
    pub overrides: std::collections::HashMap<String, PlatformOverride>,
}

#[derive(Deserialize)]
pub struct PlatformDefaults {
    pub platforms: Vec<String>,
}

#[derive(Deserialize)]
pub struct PlatformOverride {
    pub platforms: Vec<String>,
    pub note: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildResult {
    pub success: bool,
    pub skills_count: usize,       // 前端收到 "skillsCount"
    pub platforms: Vec<PlatformBuildResult>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformBuildResult {
    pub platform: String,
    pub skills_copied: usize,      // 前端收到 "skillsCopied"
}

#[tauri::command]
pub fn build_skills(project_path: String) -> Result<BuildResult, String> {
    let map_path = PathBuf::from(&project_path).join("src/platform-map.json");
    let map_content = fs::read_to_string(&map_path)
        .map_err(|e| format!("读取 platform-map.json 失败: {}", e))?;

    let platform_map: PlatformMap = serde_json::from_str(&map_content)
        .map_err(|e| format!("解析 platform-map.json 失败: {}", e))?;

    // 构建逻辑：遍历 src/skills → 按 platform-map 分发到各平台目录
    // ... 实际构建逻辑

    Ok(BuildResult {
        success: true,
        skills_count: 84,
        platforms: vec![
            PlatformBuildResult { platform: "claude".into(), skills_copied: 79 },
            PlatformBuildResult { platform: "cursor".into(), skills_copied: 80 },
            PlatformBuildResult { platform: "codex".into(), skills_copied: 75 },
        ],
    })
}
```

### Vue 侧核心代码示例

#### 技能管理页

```vue
<!-- src/views/Skills.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import SkillCard from '@/components/SkillCard.vue'
import type { SkillInfo } from '@/types/skill'

const skills = ref<SkillInfo[]>([])
const searchQuery = ref('')
const categoryFilter = ref('全部')
const loading = ref(true)

const filteredSkills = computed(() => {
  return skills.value.filter(skill => {
    const matchSearch = skill.name.includes(searchQuery.value)
      || skill.description.includes(searchQuery.value)
    const matchCategory = categoryFilter.value === '全部'
      || skill.category === categoryFilter.value
    return matchSearch && matchCategory
  })
})

const categories = computed(() => {
  const cats = new Set(skills.value.map(s => s.category))
  return ['全部', ...cats]
})

onMounted(async () => {
  try {
    skills.value = await invoke('list_skills', {
      projectPath: '/Users/xujiajun/Developer/ai-engineering-init'
    })
  } catch (e) {
    console.error('加载技能失败:', e)
  } finally {
    loading.value = false
  }
})

async function openEditor(skillName: string) {
  const content = await invoke('get_skill_content', {
    projectPath: '/Users/xujiajun/Developer/ai-engineering-init',
    skillName,
  })
  // 打开编辑器 ...
}
</script>

<template>
  <div class="skills-page">
    <header class="skills-header">
      <h1>技能管理</h1>
      <button class="btn-primary">+ 新建</button>
    </header>

    <div class="skills-toolbar">
      <input v-model="searchQuery" placeholder="搜索技能..." class="search-input" />
      <select v-model="categoryFilter" class="category-select">
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="skills-grid">
      <SkillCard
        v-for="skill in filteredSkills"
        :key="skill.name"
        :skill="skill"
        @edit="openEditor(skill.name)"
      />
    </div>

    <footer class="skills-footer">
      共 {{ filteredSkills.length }} / {{ skills.length }} 个技能
    </footer>
  </div>
</template>
```

#### Pinia Store

```typescript
// src/stores/skills.ts
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { SkillInfo } from '@/types/skill'

export const useSkillsStore = defineStore('skills', {
  state: () => ({
    skills: [] as SkillInfo[],
    loading: false,
    error: null as string | null,
  }),

  getters: {
    byCategory: (state) => (category: string) =>
      state.skills.filter(s => s.category === category),

    totalCount: (state) => state.skills.length,

    categories: (state) => [...new Set(state.skills.map(s => s.category))],
  },

  actions: {
    async loadSkills(projectPath: string) {
      this.loading = true
      this.error = null
      try {
        this.skills = await invoke('list_skills', { projectPath })
      } catch (e) {
        this.error = String(e)
      } finally {
        this.loading = false
      }
    },

    async saveSkill(projectPath: string, skillName: string, content: string) {
      await invoke('save_skill_content', { projectPath, skillName, content })
      // 重新加载
      await this.loadSkills(projectPath)
    },
  },
})
```

### Rust 学习路径（配合 Phase 1）

| 顺序 | 学什么 | 在项目中用在哪 |
|------|--------|--------------|
| 1 | 所有权 & 借用 | 字符串和路径处理 |
| 2 | `Result<T, E>` 错误处理 | 每个 command 的返回值 |
| 3 | `serde` 序列化 | JSON ↔ Struct 转换 |
| 4 | `std::fs` 文件操作 | 读写 SKILL.md |
| 5 | `std::process::Command` | 调用 git / npx |
| 6 | Tauri `#[command]` | 前后端通信 |
| 7 | 模块系统 `mod` | 代码组织 |
| 8 | trait（接口） | 抽象不同平台的构建逻辑 |

### Rust 关键 Crate 清单

```toml
# src-tauri/Cargo.toml
[build-dependencies]
tauri-build = { version = "2.3", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-store = "2"                                              # 应用设置持久化（键值存储）
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["rt-multi-thread", "sync", "fs", "macros", "time"] }  # 按需启用，不用 "full"
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] } # HTTP 客户端（调 AI API）
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }   # SQLite 本地持久化（对话历史）
thiserror = "2"                                                       # 规范化错误处理
walkdir = "2"                                                         # 递归遍历目录
notify = "6"                                                          # 文件变更监听（热更新技能）
# git2 = "0.19"  # Git 操作（可选，也可以用 Command 调 git CLI）
```

---

## Phase 2: 流程编排引擎

### 目标

把 `/dev`、`/crud`、`/check` 等命令序列变成**可视化的可拖拽工作流**。

### 核心概念

```
Workflow（工作流）
  ├── Node（节点）= 一个 Skill 或自定义操作
  ├── Edge（连线）= 节点间的执行顺序
  ├── Condition（条件）= 分支判断
  └── Context（上下文）= 节点间共享数据
```

### 界面设计

```
┌─────────────────────────────────────────────────────────┐
│  工作流编辑器: "新功能开发"               [▶ 运行] [💾]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ brainstorm│───→│database  │───→│  crud    │          │
│  │  头脑风暴  │    │  建表设计 │    │ 代码生成  │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│                                        │                │
│                                        ▼                │
│                  ┌──────────┐    ┌──────────┐          │
│                  │  check   │←───│   test   │          │
│                  │ 规范检查  │    │ 单元测试  │          │
│                  └──────────┘    └──────────┘          │
│                       │                                 │
│                   ┌───┴───┐                             │
│                   │ 通过？  │                             │
│                   └───┬───┘                             │
│               是 ─────┼───── 否                          │
│                  ▼         ▼                            │
│            ┌──────────┐  ┌──────────┐                  │
│            │  commit  │  │  fix     │                  │
│            │ Git 提交  │  │ 修复问题  │──→ 回到 test     │
│            └──────────┘  └──────────┘                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  节点面板: [Skill] [条件] [循环] [输入] [输出] [脚本]     │
└─────────────────────────────────────────────────────────┘
```

### Rust 侧核心数据结构

```rust
// src-tauri/src/engine/workflow.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub nodes: Vec<WorkflowNode>,
    pub edges: Vec<Edge>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WorkflowNode {
    pub id: String,
    pub node_type: NodeType,
    pub position: Position,             // 画布上的位置
    pub config: HashMap<String, String>, // 节点配置
}

#[derive(Serialize, Deserialize, Clone)]
pub enum NodeType {
    Skill { skill_name: String },       // 调用一个技能
    Condition { expression: String },    // 条件分支
    Script { command: String },          // 自定义脚本
    Input { prompt: String },            // 用户输入
    Output { template: String },         // 输出结果
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Edge {
    pub from: String,       // 源节点 ID
    pub to: String,         // 目标节点 ID
    pub label: Option<String>, // 连线标签（如 "是" / "否"）
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}
```

### 工作流执行器

```rust
// src-tauri/src/engine/executor.rs

use std::collections::HashMap;

pub struct WorkflowExecutor {
    workflow: Workflow,
    context: ExecutionContext,
}

pub struct ExecutionContext {
    pub variables: HashMap<String, String>,  // 节点间共享变量
    pub current_node: Option<String>,
    pub status: ExecutionStatus,
    pub logs: Vec<ExecutionLog>,
}

pub enum ExecutionStatus {
    Idle,
    Running,
    Paused,       // 等待用户输入
    Completed,
    Failed(String),
}

pub struct ExecutionLog {
    pub node_id: String,
    pub timestamp: String,
    pub message: String,
    pub level: LogLevel,
}

pub enum LogLevel {
    Info,
    Warn,
    Error,
}

impl WorkflowExecutor {
    /// 按拓扑排序执行节点
    pub async fn run(&mut self) -> Result<(), String> {
        let order = self.topological_sort()?;

        for node_id in order {
            self.context.current_node = Some(node_id.clone());
            self.execute_node(&node_id).await?;
        }

        self.context.status = ExecutionStatus::Completed;
        Ok(())
    }

    /// 执行单个节点
    async fn execute_node(&mut self, node_id: &str) -> Result<(), String> {
        let node = self.workflow.nodes.iter()
            .find(|n| n.id == node_id)
            .ok_or("节点不存在")?
            .clone();

        match &node.node_type {
            NodeType::Skill { skill_name } => {
                // 调用对应的技能逻辑
                self.execute_skill(skill_name).await
            }
            NodeType::Condition { expression } => {
                // 评估条件表达式
                self.evaluate_condition(expression)
            }
            NodeType::Script { command } => {
                // 执行脚本命令
                self.execute_script(command).await
            }
            _ => Ok(()),
        }
    }

    /// 拓扑排序（DAG 执行顺序）
    fn topological_sort(&self) -> Result<Vec<String>, String> {
        // Kahn 算法实现
        // ...
        todo!()
    }
}
```

### 预置工作流模板

| 模板名 | 节点链 | 适用场景 |
|--------|--------|---------|
| 新功能开发 | brainstorm → database → crud → test → check → commit | 完整功能开发 |
| 快速 CRUD | database → crud → commit | 简单增删改查 |
| Bug 修复 | bug-detective → 修复 → test → check → commit | 问题排查修复 |
| 代码审查 | check → codex-review → 修复建议 | 代码质量 |
| 技术方案 | brainstorm → tech-decision → 输出文档 | 方案设计 |
| 定制报表 | database → leniu-report → test → commit | leniu 报表开发 |

### Vue 前端工作流编辑器

推荐使用 **Vue Flow**（基于 Vue 3 的流程图库）：

```typescript
// 技术选型
{
  "@vue-flow/core": "^1.x",       // 流程图核心
  "@vue-flow/controls": "^1.x",   // 缩放控制
  "@vue-flow/minimap": "^1.x",    // 小地图
  "@vue-flow/node-toolbar": "^1.x" // 节点工具栏
}
```

---

## Phase 3: AI Agent 中控台

### 目标

可视化管理多个 AI Agent（Claude/Codex/Gemini/本地 LLM）的协作执行。

### 界面设计

```
┌───────────────────────────────────────────────────────┐
│  Agent 监控面板                                ─ □ ×  │
├───────────────────────────────────────────────────────┤
│                                                       │
│  当前任务: "开发优惠券模块"                              │
│                                                       │
│  ┌─ Claude ──────────┐  ┌─ Codex ──────────┐        │
│  │ 🟢 执行中           │  │ 🟡 等待中          │        │
│  │ 正在生成 Service   │  │ 待审查代码         │        │
│  │ ████████░░ 80%     │  │ ░░░░░░░░░░ 0%     │        │
│  │ Token: 12.3k      │  │                    │        │
│  └───────────────────┘  └───────────────────┘        │
│                                                       │
│  ┌─ Gemini ──────────┐  ┌─ 本地 LLM ─────────┐      │
│  │ 🟢 执行中           │  │ ⚫ 未启用           │      │
│  │ 正在设计前端 UI    │  │                    │        │
│  │ ██████░░░░ 60%     │  │ [启用]             │        │
│  └───────────────────┘  └───────────────────┘        │
│                                                       │
│  📊 消耗: Claude 12.3k | Gemini 8.1k | 总计 20.4k    │
│  ⏱️ 耗时: 3m 24s                                      │
└───────────────────────────────────────────────────────┘
```

### Rust 侧核心能力

```rust
// Agent 调度器
pub struct AgentScheduler {
    agents: Vec<AgentInstance>,
    task_queue: VecDeque<AgentTask>,
}

pub struct AgentInstance {
    pub agent_type: AgentType,  // Claude / Codex / Gemini / LocalLLM
    pub status: AgentStatus,
    pub process: Option<Child>, // 子进程句柄
    pub token_usage: u64,
    pub output_channel: Receiver<String>, // 实时输出流
}

pub enum AgentType {
    Claude,     // claude CLI
    Codex,      // codex CLI
    Gemini,     // gemini CLI
    LocalLLM,   // ollama 等
}

pub enum AgentStatus {
    Idle,
    Running { progress: f32, current_task: String },
    Waiting { reason: String },
    Completed { result: String },
    Failed { error: String },
}
```

### 关键功能

| 功能 | 说明 |
|------|------|
| **多 Agent 并行** | 同时调度 Claude + Codex + Gemini 处理不同子任务 |
| **任务分配** | 根据 Agent 特长自动分配（Claude=复杂逻辑, Gemini=UI, Codex=审查） |
| **实时监控** | WebSocket 推送 Agent 执行进度到前端 |
| **Token 计费** | 统计每个 Agent 的 Token 消耗 |
| **执行日志** | 完整的执行历史，支持回放 |
| **失败重试** | Agent 执行失败自动重试或切换到备用 Agent |

---

## Phase 4: 团队协作 + 技能市场

### 目标

从个人工具 → 团队平台 → 社区生态。

### 核心功能

| 功能 | 说明 | 实现方式 |
|------|------|---------|
| **技能市场** | 社区共享技能，一键安装 | 类似 VS Code 扩展市场 |
| **私有仓库** | 企业内部技能共享 | 私有 Git 仓库 + 认证 |
| **团队同步** | 团队统一配置 | 中央配置服务器 |
| **版本管理** | 技能版本化 | SemVer + 变更日志 |
| **使用统计** | 技能使用频率、效果分析 | 匿名遥测 |
| **评分评论** | 社区评价技能质量 | 评分系统 |

### 技能市场界面

```
┌──────────────────────────────────────────────────────┐
│  🏪 技能市场                                          │
├──────────────────────────────────────────────────────┤
│  🔍 搜索...    [热门] [最新] [推荐] [我的发布]         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────┐          │
│  │ 📦 react-crud-generator         v2.1.0 │          │
│  │ React + TypeScript CRUD 代码生成器      │          │
│  │ ⭐⭐⭐⭐⭐ (128) | 下载 3.2k | by @author  │          │
│  │ [安装]                                  │          │
│  └────────────────────────────────────────┘          │
│                                                      │
│  ┌────────────────────────────────────────┐          │
│  │ 📦 kubernetes-deploy              v1.0.3 │          │
│  │ K8s 部署工作流自动化                     │          │
│  │ ⭐⭐⭐⭐ (67) | 下载 1.8k | by @devops    │          │
│  │ [安装]                                  │          │
│  └────────────────────────────────────────┘          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 后端服务（可选）

Phase 4 可能需要一个轻量后端服务：

```
技能市场 API 服务
├── 技能注册/发布
├── 搜索/推荐
├── 下载统计
├── 用户认证
└── 评分评论
```

技术选型建议：Rust (Axum) 或保持 Node.js (Fastify)，取决于你在 Phase 1-3 的 Rust 熟练度。

---

## Rust 学习曲线与阶段对应

| 阶段 | Rust 能力 | 核心知识点 | 难度 |
|------|----------|-----------|------|
| Phase 1 | 基础 | 所有权、`serde`、`std::fs`、Tauri IPC、`Result<T,E>` | ★★☆☆☆ |
| Phase 2 | 进阶 | 图算法（拓扑排序）、`tokio` 异步、状态机、trait 抽象 | ★★★☆☆ |
| Phase 3 | 中高级 | 多进程管理、`channels`、并发模式、WebSocket | ★★★★☆ |
| Phase 4 | 高级 | 网络编程（Axum）、数据库（`sqlx`）、认证、API 设计 | ★★★★★ |

---

## 快速启动指南

### 环境准备

```bash
# 1. 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. 安装 Tauri CLI
cargo install create-tauri-app

# 3. 创建项目
cargo create-tauri-app ai-engineering-desktop
# 选择: Vue + TypeScript + Vite

# 4. 进入项目
cd ai-engineering-desktop

# 5. 开发模式
cargo tauri dev
```

### 第一个 Milestone（建议 2 周）

- [ ] Tauri + Vue 3 项目搭建
- [ ] 侧边导航 + 路由
- [ ] `list_skills` command 实现
- [ ] 技能列表展示（卡片布局）
- [ ] 技能搜索/筛选
- [ ] `get_skill_content` + Markdown 预览

### 第二个 Milestone（建议 2 周）

- [ ] `save_skill_content` + Markdown 编辑器
- [ ] 平台分发配置 GUI（读写 `platform-map.json`）
- [ ] `build_skills` command（构建分发）
- [ ] Git 状态展示
- [ ] 项目管理（多项目切换）

---

## 竞品参考

| 产品 | 定位 | 可借鉴的点 |
|------|------|-----------|
| **n8n** | 工作流自动化 | 拖拽式流程编辑器 UI |
| **Langflow** | LLM 工作流 | AI Agent 可视化编排 |
| **Raycast** | 效率工具 | 极致的快捷操作体验 |
| **VS Code** | 代码编辑器 | 扩展市场生态 |
| **Warp** | 终端 | AI 增强的开发者工具 |

---

## 总结

这套工程的演进本质是：

```
配置文件生成器 → 可视化管理工具 → 开发流程引擎 → AI 协作平台
```

每个阶段都是上一个阶段的自然延伸，同时你的 Rust + Vue 能力也在同步成长。
Phase 1 是学习和验证阶段，Phase 2 是核心价值飞跃，Phase 3/4 是长期愿景。

**建议从 Phase 1 的第一个 Milestone 开始，2 周后评估是否继续。**

---

## 附录 A：技术研究报告摘要（2026-03-07）

> 通过 context7 官方文档研究，三个并行 Agent 完成的研究成果。

### A.1 Tauri v2 核心要点

| 主题 | 要点 |
|------|------|
| **进程模型** | 多进程：Core (Rust) + WebView (独立进程)，WebView 默认无系统权限 |
| **IPC 方式** | Commands（请求-响应，首选）、Events（发射即忘）、Channel（高频数据流） |
| **安全模型** | ACL 体系：Capabilities 定义窗口权限，Permissions 定义命令权限 |
| **插件系统** | v2 核心功能拆成 30+ 独立插件（fs/dialog/http/store/sql 等） |
| **移动端** | v2 新增 iOS + Android 支持 |
| **v1 vs v2** | v2 废弃 allowlist → ACL 权限模型；核心 API → 独立插件 |

**关键插件清单（Phase 1-3 需要）：**

| 插件 | NPM 包 | 用途 | Phase |
|------|--------|------|-------|
| fs | `@tauri-apps/plugin-fs` | 读写 SKILL.md、项目文件 | 1 |
| store | `@tauri-apps/plugin-store` | 应用设置持久化 | 1 |
| dialog | `@tauri-apps/plugin-dialog` | 文件选择/保存对话框 | 1 |
| shell | `@tauri-apps/plugin-shell` | 执行 git/npx 等子进程 | 1 |
| notification | `@tauri-apps/plugin-notification` | 构建完成通知 | 1 |
| sql | `@tauri-apps/plugin-sql` | SQLite 数据库 | 2 |
| window-state | `@tauri-apps/plugin-window-state` | 窗口位置/大小记忆 | 1 |
| global-shortcut | `@tauri-apps/plugin-global-shortcut` | 全局快捷键 | 2 |
| websocket | `@tauri-apps/plugin-websocket` | WebSocket 连接 | 3 |
| deep-link | `@tauri-apps/plugin-deep-link` | URL 协议（手机扫码唤起） | 3 |
| updater | `@tauri-apps/plugin-updater` | 应用内自动更新 | 2 |

**权限配置示例（src-tauri/capabilities/default.json）：**

```json
{
  "identifier": "default",
  "description": "主窗口默认能力",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "dialog:allow-open",
    "shell:allow-spawn",
    "store:default",
    "notification:default",
    "window-state:default"
  ]
}
```

### A.2 Vue 3 核心要点

| 主题 | 要点 |
|------|------|
| **Composition API** | 推荐 `<script setup>` + `ref()`（官方推荐优于 `reactive()`） |
| **状态管理** | Pinia 替代 Vuex（无 mutations、扁平结构、~1KB、推荐 Setup Store） |
| **路由** | Vue Router 4，Tauri 中**必须用 Hash 模式** `createWebHashHistory()` |
| **TypeScript** | `defineProps<T>()`、Vue 3.4+ 解构默认值、`defineEmits<T>()` |
| **构建工具** | Vite，要求 Node.js 20.19+ |
| **SSR** | Tauri 中不可用，只能 SPA |

**Vue 2 → 3 迁移关键变更：**

| Vue 2 | Vue 3 |
|-------|-------|
| `new Vue()` | `createApp()` |
| `this.$router` | `useRouter()` |
| Vuex + mutations | Pinia（直接修改 state） |
| Filters `{{ x \| format }}` | `computed` 或方法 |
| `$on / $off / $once` | 外部库 mitt |
| `destroyed` | `unmounted` |
| `mode: 'history'` | `history: createWebHashHistory()` |

**Vite 配置（Tauri 适配）：**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  server: {
    port: 5173,
    strictPort: true,         // Tauri 需要固定端口
    host: host || false,      // 移动端开发需 '0.0.0.0'
    hmr: host ? { protocol: 'ws', host, port: 5183 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  resolve: { alias: { '@': '/src' } },
})
```

### A.3 Rust Crate 核心要点

**版本兼容性总结：**

| Crate | 版本 | 与 Tauri v2 关系 | 关键注意 |
|-------|------|-----------------|---------|
| tauri | 2.10.x | 核心框架 | 与 tauri-build 同 minor 版本 |
| serde | 1.x | Tauri 内部依赖 | 所有 struct 加 `#[serde(rename_all = "camelCase")]` |
| serde_json | 1.x | IPC 传输格式 | 枚举推荐内部标记 `#[serde(tag = "type")]` |
| tokio | 1.x | Tauri 内部管理 | **不需要** `#[tokio::main]`，按需启用 features |
| reqwest | 0.12.x | HTTP 客户端 | 用 `rustls-tls` 保证跨平台一致性 |
| sqlx | 0.8.x | SQLite 异步 ORM | 必须用 `runtime-tokio` feature |
| tauri-plugin-store | 2.x | 键值存储 | 自动保存（100ms 防抖），要求 Rust >= 1.77.2 |
| thiserror | 2.x | 错误定义 | Tauri 官方推荐搭配 |

**错误处理最佳实践：**

```rust
use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("文件操作失败: {0}")]
    FileError(String),
    #[error("技能不存在: {0}")]
    SkillNotFound(String),
    #[error("构建失败: {0}")]
    BuildError(String),
}

// 所有 command 统一返回 Result<T, AppError>
#[tauri::command]
fn list_skills(project_path: String) -> Result<Vec<SkillInfo>, AppError> {
    // ...
}
```

**状态管理模式：**

```rust
use std::sync::Mutex;

// 不需要 Arc — Tauri State 内部已处理引用计数
struct AppState {
    project_path: String,
    skills_cache: Vec<SkillInfo>,
}

tauri::Builder::default()
    .manage(Mutex::new(AppState { ... }))
```

**sqlx + SQLite 初始化（Phase 2 用）：**

```rust
use sqlx::sqlite::SqlitePoolOptions;

async fn setup_db(app: &tauri::App) -> sqlx::Pool<sqlx::Sqlite> {
    let app_dir = app.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_dir).unwrap();
    let db_path = app_dir.join("app.db");

    let pool = SqlitePoolOptions::new()
        .connect(&format!("sqlite:{}?mode=rwc", db_path.display()))
        .await.unwrap();

    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}
```

**数据存储选型指南：**

| 场景 | 方案 |
|------|------|
| 应用设置、用户偏好 | `tauri-plugin-store`（JSON 键值） |
| 工作流定义、对话历史 | `sqlx + SQLite`（结构化查询） |
| 临时缓存 | Rust `HashMap` + `Mutex` |

### A.4 手机远程控制方案（Phase 3 追加）

> 决策：**不使用 Java 后端中继**，采用 Rust 内嵌服务器 P2P 直连。

**架构设计：**

```
┌──────────────┐     局域网 WebSocket      ┌──────────────┐
│  手机浏览器    │ ◄───────────────────────► │  Tauri 桌面    │
│  (Vue 3 PWA)  │     ws://192.168.x:3001   │  Rust 内嵌     │
│              │                            │  axum 服务器   │
└──────────────┘                            └──────────────┘
       │                                           │
       │  扫二维码获取:                              │ 生成二维码:
       │  IP + Port + Token                        │  IP + Port + Token
       └───────────────────────────────────────────┘
```

**核心 Crate（Phase 3 额外添加）：**

```toml
axum = "0.8"              # 内嵌 HTTP + WebSocket 服务器
tower-http = { version = "0.6", features = ["cors"] }  # CORS 支持
qrcode = "0.14"           # 二维码生成
```

**工作流程：**

1. 桌面 Tauri 启动时，Rust 端启动 axum WebSocket 服务器（端口 3001）
2. 生成配对二维码（包含局域网 IP + 端口 + 一次性 Token）
3. 手机浏览器扫码 → 打开 PWA → 通过 WebSocket 直连桌面
4. 手机发送指令（继续对话/执行命令） → 桌面 Rust 执行 → 结果回传手机
5. 外网场景：可选加 Tailscale/WireGuard 组网

**此方案不在 Phase 1 实现，自然融入 Phase 3 的 Agent 中控台功能。**
