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

## 概述

项目使用 `jenkins/` 目录下的 Python 脚本实现自动化构建部署，流程：

```
Jenkins 构建 core → Jenkins 构建 api → Portainer 更新容器
```

## 文件位置

| 文件 | 作用 |
|------|------|
| `jenkins/jk_build.py` | 主构建脚本 |
| `jenkins/env_param.json` | 环境配置（Jenkins/Portainer 连接参数） |
| `jenkins/last_cd_env.json` | 上次构建参数（自动保存） |

## 构建模式

| 模式 | 说明 | 执行步骤 |
|------|------|---------|
| `0` | 只构建 | 构建 core + api，不更新 Portainer |
| `1` | 全构建+更新 | 构建 core + api → 触发 Portainer 更新 |
| `2` | 构建 api+更新 | 跳过 core，构建 api → 触发 Portainer 更新 |
| `3` | 只更新 | 不构建，直接触发 Portainer 更新 |

## 环境支持

| 环境 | 前缀 | Jenkins Job | Portainer |
|------|------|-------------|-----------|
| 开发环境 | `dev` + 编号 | `dev-tengyun-core` / `dev-tengyun-yunshitang-api` | devops-dev.xnzn.net |
| 测试环境 | `test` + 编号 | `test-tengyun-core` / `test-tengyun-yunshitang-api` | devops-test.xnzn.net |
| dev16+ | `dev16` ~ `dev43` | 同 dev | xnzn-dev.xnzn.net（使用 forceupdateservice） |
| dev44+ | `dev44` 及以上 | 只支持模式 0 | 需手动更新 |

## 定制项目支持

当指定 `api_param_folder`（定制工程文件夹名）时，Jenkins Job 路径变为：

```
{folder_name}/dev-后端-core    # 替代 dev-tengyun-core
{folder_name}/dev-后端-api     # 替代 dev-tengyun-yunshitang-api
```

## 使用方式

### 直接运行脚本

```bash
cd jenkins && python jk_build.py
```

脚本会交互式询问：
1. **模式**（0/1/2/3）
2. **环境**（dev1, dev2, test1 等）
3. **core 分支**（如 release_5.56.0）
4. **api 分支**（如 master）
5. **定制工程文件夹**（可选，空格或 None 跳过）

### 通过 Claude 辅助部署

当用户说"打包到 devX"时：

1. **读取** `jenkins/last_cd_env.json` 获取上次构建参数
2. **确认参数**：环境、分支、模式、是否定制项目
3. **修改** `last_cd_env.json` 写入新参数
4. **执行** `cd jenkins && python jk_build.py`（脚本读取预设值，用户直接回车即可）

## 配置文件说明

### last_cd_env.json（构建参数）

```json
{
  "build_mode": "0",
  "cd_env": "dev63",
  "core_param_branch": "release_5.56.0",
  "api_param_branch": "master",
  "api_param_folder": null
}
```

| 字段 | 说明 |
|------|------|
| `build_mode` | 构建模式（0/1/2/3） |
| `cd_env` | 目标环境（如 dev1, test2） |
| `core_param_branch` | core 仓库分支 |
| `api_param_branch` | api 仓库分支 |
| `api_param_folder` | 定制项目文件夹（null 表示标准项目） |

### env_param.json（环境连接配置）

包含 Jenkins 和 Portainer 的连接参数（用户名、API Token、服务地址等），按 dev/test 环境分组。

> **注意**：此文件包含敏感凭证，不要将内容输出到对话中。

## 构建流程详解

```
1. 连接 Jenkins（ci.xnzn.net）
2. 构建 core（参数：BRANCH + VERSION=环境名）
   └─ 轮询构建进度，超时 10 分钟
3. 构建 api（参数同上）
   └─ 轮询构建进度，超时 5 分钟
4. 更新 Portainer：
   ├─ dev1~15：Webhook 触发
   │   └─ 获取 JWT → 查 Service ID → 获取/创建 Webhook → POST 触发
   └─ dev16+：Force Update
       └─ 获取 JWT → 查 Service ID → PUT forceupdateservice
```

## 常见操作

### 只改了 api 代码，快速部署

```bash
# 修改 last_cd_env.json 的 build_mode 为 "2"，然后运行
cd jenkins && python jk_build.py
```

### 只需要更新容器（已在 Jenkins 手动构建完）

```bash
# build_mode 设为 "3"
cd jenkins && python jk_build.py
```

### 部署定制项目

```json
// last_cd_env.json
{
  "api_param_folder": "leniu-tengyun-wuhanxieheyiyuan"
}
```

## 首次初始化（团队成员）

当用户说"初始化部署环境"或检测到 `jenkins/` 目录不存在时，执行以下步骤：

### 自动初始化流程

```bash
# 1. 创建 jenkins 目录
mkdir -p jenkins

# 2. 从技能模板复制文件（SKILL_DIR 为技能目录路径）
cp .claude/skills/jenkins-deploy/assets/jk_build.py jenkins/jk_build.py
cp .claude/skills/jenkins-deploy/assets/last_cd_env.template.json jenkins/last_cd_env.json

# 3. 环境配置需要用户提供（含敏感凭证）
cp .claude/skills/jenkins-deploy/assets/env_param.template.json jenkins/env_param.json

# 4. 安装依赖
pip install python-jenkins requests
```

### 配置凭证

初始化后，`jenkins/env_param.json` 中的占位符需要替换为真实值：

| 占位符 | 说明 | 获取方式 |
|--------|------|---------|
| `__JENKINS_DEV_USER__` | Jenkins dev 账号 | 向团队负责人获取 |
| `__JENKINS_DEV_TOKEN__` | Jenkins dev API Token | Jenkins → 用户 → 设置 → API Token |
| `__JENKINS_TEST_USER__` | Jenkins test 账号 | 同上 |
| `__JENKINS_TEST_TOKEN__` | Jenkins test API Token | 同上 |
| `__PORTAINER_*_USER__` | Portainer 用户名 | 向团队负责人获取 |
| `__PORTAINER_*_PWD__` | Portainer 密码 | 向团队负责人获取 |

**快捷方式**：如果团队已有成员配置好，可直接拷贝对方的 `env_param.json` 文件。

### AI 初始化行为

当技能被触发但 `jenkins/` 不存在时：
1. 提示用户"检测到尚未初始化部署环境"
2. 询问是否执行初始化
3. 执行上述复制步骤
4. 提示用户填写凭证（或拷贝已有配置）

## 依赖

```bash
pip install python-jenkins requests
```

## 注意

- 本技能用于 dev/test 环境部署，**不涉及生产环境**
- 如果是 Git 提交/分支管理，请使用 `git-workflow` 技能
- 如果是代码构建错误排查，请使用 `bug-detective` 技能
