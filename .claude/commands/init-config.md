# /init-config - 从 Markdown 一键初始化环境配置

从用户提供的 Markdown 文件中解析 MySQL 数据库连接和 Loki 日志查询配置，一键写入配置文件。

## 使用方式

```
/init-config <md文件路径> [--scope global|local]
```

- `/init-config env-config.md` — 解析 md 文件，写入全局配置（默认）
- `/init-config env-config.md --scope local` — 写入当前项目本地配置
- `/init-config` — 无参数时，使用模板文件 `.claude/templates/env-config.md`

## 参数

- `$ARGUMENTS` 的第一个词为文件路径，可以是相对路径或绝对路径
- `--scope global`（默认）写入 `~/.claude/` + `~/.cursor/`
- `--scope local` 写入当前项目 `.claude/`

## Markdown 文件格式

文件中必须包含以下两个段落（任一即可）：

### MySQL 数据库连接（标题含"MySQL"或"数据库"）

```markdown
## MySQL 数据库连接

| 环境 | host | port | user | password | range | 描述 |
|------|------|------|------|----------|-------|------|
| local | 127.0.0.1 | 3306 | root | xxx | | 本地环境 |
| dev | dev-db.com | 3306 | dev_user | xxx | 1~15 | 开发环境 |

默认环境: local
```

### Loki 日志查询（标题含"Loki"或"日志"）

```markdown
## Loki 日志查询

| 环境 | 名称 | URL | Token | 别名 | range |
|------|------|-----|-------|------|-------|
| monitor-dev | Monitor开发 | https://grafana.example.com | glsa_xxx | mdev,dev | dev1~15 |

默认环境: monitor-dev
```

### 注意事项

- host/URL 为 `YOUR_*` 占位符的行会被跳过
- Token 为 `YOUR_*` 的行会写入空 Token（稍后可用 `config --type loki` 补充）
- range 字段会自动展开为 projects 列表（如 `dev1~15` → `["dev01","dev02",...,"dev15"]`）

## 执行流程

### 第一步：确定文件路径和范围

```bash
# 解析参数
FILE_PATH="${ARGUMENTS%% --*}"    # 第一个参数为文件路径
SCOPE="global"                    # 默认全局
[[ "$ARGUMENTS" == *"--scope local"* ]] && SCOPE="local"

# 如果没指定文件，检查模板
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=".claude/templates/env-config.md"
fi
```

确认文件存在，不存在则提示用户创建。

### 第二步：读取并解析 Markdown

读取文件内容，按标题（`## MySQL`/`## Loki`）分割为两个段落。

解析每个段落中的 Markdown 表格：
1. 找到表头行（含 `|` 且下一行为 `|---|`）
2. 提取表头列名
3. 逐行解析数据行
4. 跳过 `YOUR_*` 占位符
5. 提取"默认环境: xxx"

### 第三步：生成配置 JSON

**MySQL 配置**（mysql-config.json）：
```json
{
  "environments": {
    "local": { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "xxx", "_desc": "本地环境" },
    "dev": { "host": "dev-db.com", "port": 3306, "user": "dev_user", "password": "xxx", "range": "1~15", "_desc": "开发环境" }
  },
  "default": "local"
}
```

**Loki 配置**（loki-config.json）：
```json
{
  "active": "monitor-dev",
  "environments": {
    "monitor-dev": {
      "name": "Monitor开发",
      "url": "https://grafana.example.com",
      "token": "glsa_xxx",
      "aliases": ["mdev", "dev"],
      "range": "dev1~15",
      "projects": ["dev01", "dev02", "...", "dev15"]
    }
  }
}
```

### 第四步：写入配置文件

根据 scope 决定写入位置：

| scope | MySQL 路径 | Loki 路径 |
|-------|-----------|----------|
| global | `~/.claude/mysql-config.json` + `~/.cursor/mysql-config.json` | `~/.claude/loki-config.json` + `~/.cursor/loki-config.json` |
| local | `.claude/mysql-config.json` | `.claude/loki-config.json` |

写入后输出：
```
✔ MySQL 配置（N 个环境）→ 路径
✔ Loki 配置（N 个环境）→ 路径
```

### 第五步：确保 .gitignore（仅 local scope）

如果是本地配置，确保 `.gitignore` 包含：
```
**/mysql-config.json
**/loki-config.json
```

## 模板文件

如果用户没有配置文件，输出模板路径：

```
提示：请先创建配置文件，参考模板：
  .claude/templates/env-config.md

填写后运行：
  /init-config .claude/templates/env-config.md
```

## 安全规则

- 不要在输出中显示完整的 password 和 Token（用 `***` 脱敏）
- local scope 时自动更新 .gitignore
- 覆盖已有配置前先展示将要写入的环境列表，让用户确认
