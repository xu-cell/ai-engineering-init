---
name: jenkins-deploy
description: |
  Jenkins + Portainer 自动打包部署技能。通过 Python 脚本调用 Jenkins API 构建项目，并触发 Portainer Webhook/Update 完成容器更新。

  触发场景：
  - 需要将代码打包部署到 dev/test 环境
  - 需要触发 Jenkins 构建 core 或 api 项目
  - 需要更新 Portainer 容器服务
  - 需要查看或修改构建配置（分支、环境、模式）
  - 定制项目的打包部署

  触发词：打包、部署、Jenkins、构建、Portainer、发布到dev、发布到test、更新环境、自动部署
---

# Jenkins + Portainer 自动打包部署

## 架构

```
技能目录（随框架更新，不复制到项目）:
  ~/.claude/skills/jenkins-deploy/assets/jk_build.py     ← 构建脚本

全局配置（一次性配置，所有项目共享）:
  ~/.claude/jenkins-config.json                           ← 凭证（Jenkins/Portainer）

项目本地（自动生成）:
  jenkins/last_cd_env.json                                ← 构建状态（环境、分支、模式）
```

脚本按 **本地 `.claude/` > 全局 `~/.claude/`** 优先级查找 `jenkins-config.json`。

## 构建模式

| 模式 | 说明 | 执行步骤 |
|------|------|---------|
| `0` | 只构建 | 构建 core + api，不更新 Portainer |
| `1` | 全构建+更新 | 构建 core + api → 触发 Portainer 更新 |
| `2` | 构建 api+更新 | 跳过 core，构建 api → 触发 Portainer 更新 |
| `3` | 只更新 | 不构建，直接触发 Portainer 更新 |

## 环境支持

| 环境 | 前缀 | Portainer 更新方式 |
|------|------|-------------------|
| dev1~15 | `dev` | Webhook 触发 |
| dev16~43 | `dev` | Force Update（xnzn-dev.xnzn.net） |
| dev44+ | `dev` | 只支持模式 0（手动更新） |
| test | `test` | Webhook 触发 |

## 使用方式

### 运行构建脚本

```bash
python ~/.claude/skills/jenkins-deploy/assets/jk_build.py
```

脚本交互式询问：模式 → 环境 → core 分支 → api 分支 → 定制工程文件夹

### 通过 AI 辅助部署

当用户说"打包到 devX"时：

1. 读取 `jenkins/last_cd_env.json` 获取上次参数
2. 确认参数：环境、分支、模式
3. 修改 `jenkins/last_cd_env.json` 写入新参数
4. 执行 `python ~/.claude/skills/jenkins-deploy/assets/jk_build.py`

## 配置文件

### jenkins-config.json（凭证，全局）

位置：`~/.claude/jenkins-config.json`（或本地 `.claude/jenkins-config.json`）

模板：`.claude/skills/jenkins-deploy/assets/env_param.template.json`

> **注意**：此文件包含敏感凭证，不要将内容输出到对话中。

### last_cd_env.json（构建状态，项目本地）

位置：`jenkins/last_cd_env.json`（脚本自动创建，无需手动初始化）

```json
{
  "build_mode": "1",
  "cd_env": "dev1",
  "core_param_branch": "master",
  "api_param_branch": "master",
  "api_param_folder": null
}
```

## 定制项目

指定 `api_param_folder` 后，Jenkins Job 路径变为：

```
{folder_name}/dev-后端-core
{folder_name}/dev-后端-api
```

## 首次初始化（团队成员）

只需一步：配置全局凭证文件。

```bash
# 方式 1：从团队成员拷贝
cp /path/to/teammate/jenkins-config.json ~/.claude/jenkins-config.json

# 方式 2：从模板创建，手动填写凭证
cp ~/.claude/skills/jenkins-deploy/assets/env_param.template.json ~/.claude/jenkins-config.json
# 然后替换 __JENKINS_*__ 和 __PORTAINER_*__ 占位符
```

### AI 初始化行为

当技能被触发但 `jenkins-config.json` 不存在时：
1. 提示"检测到尚未配置 Jenkins 凭证"
2. 询问是否从模板创建
3. 复制模板到 `~/.claude/jenkins-config.json`
4. 提示用户填写凭证（或拷贝已有配置）

## 依赖

```bash
pip install python-jenkins requests
```

## 注意

- 本技能用于 dev/test 环境部署，**不涉及生产环境**
- 如果是 Git 提交/分支管理，请使用 `git-workflow` 技能
- 如果是代码构建错误排查，请使用 `bug-detective` 技能
