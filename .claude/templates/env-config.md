# 环境配置模板

> 填写后运行 `npx ai-engineering-init config --from .claude/templates/env-config.md --scope global`
> 一键初始化 MySQL 数据库连接和 Loki 日志查询配置。

## MySQL 数据库连接

| 环境 | host | port | user | password | range | 描述 |
|------|------|------|------|----------|-------|------|
| local | 127.0.0.1 | 3306 | root | do@u.can | | 本地环境 |
| dev | YOUR_DEV_HOST | 3306 | YOUR_USER | YOUR_PASSWORD | 1~15 | 开发环境(dev1~dev15) |
| test | YOUR_TEST_HOST | 3306 | YOUR_USER | YOUR_PASSWORD | 1~30 | 测试环境(test1~test30) |
| prod | YOUR_PROD_HOST | 3306 | readonly | YOUR_PASSWORD | | 生产环境(只读) |

默认环境: local

## Loki 日志查询

| 环境 | 名称 | URL | Token | 别名 | range |
|------|------|-----|-------|------|-------|
| test13 | 测试13 | https://test13.xnzn.net/grafana | YOUR_TOKEN | test13,13 | |
| monitor-test | Monitor测试 | https://monitor-test.xnzn.net/grafana | YOUR_TOKEN | mtest | test1~12 |
| monitor-dev | Monitor开发 | https://monitor-dev.xnzn.net/grafana | YOUR_TOKEN | mdev,dev | dev1~15 |
| monitor02-dev | Monitor02开发 | https://monitor02-dev.xnzn.net/grafana | YOUR_TOKEN | m02,monitor02 | dev16~42 |
| monitor-tyy-dev | 体验园开发 | https://monitor-tyy-dev.xnzn.net/grafana | YOUR_TOKEN | tyy,体验园 | dev44~58 |

默认环境: test13
