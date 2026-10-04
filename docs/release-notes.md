# v0.1.0-preview.2 阅读预览版 / Reading Preview

已发布：[v0.1.0-preview.2](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.2)，对应提交 [`4c9b6aa`](https://github.com/zlsjtj/CodeAtlas/commit/4c9b6aa083cd09d22baf6868664da76285da31f8)。这是代码阅读预览版，不是稳定版。

## 可以试什么

这是一个不需要模型 Key 的代码阅读预览版。导入本地目录或公开 GitHub 仓库，搜索关键词或符号，再打开带行号的源码核对上下文。

第一次试用建议跟着 Click 示例：安装 Python 3.11+、Node.js 20.12+ 和 Git，再克隆这个预览版：

```sh
git clone --branch v0.1.0-preview.2 https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

打开终端打印的地址，搜索 `callback=f`。固定版本的 Click 已导入并索引；沿[三处源码](reading-example.md)查看装饰器如何保存、调用原函数。示例不用已有模型 Key，也不覆盖 `.env` 或普通开发数据库。

读自己的仓库用 `npm run dev`。另提供仅绑定本机的 Docker Compose；挂载和启动说明见 [README](../README.md)。中英文首页分别使用对应界面的实录，手机显示单栏静态图。

## 已验证与未验证

发布提交 `4c9b6aa` 的 [CI](https://github.com/zlsjtj/CodeAtlas/actions/runs/37195163701)已通过 Windows、Ubuntu 和 Linux Docker 验证，包含示例准备与重复导入、后端回归、前端类型检查及构建、浏览器测试，以及容器重建后的索引保留。这些结果对应本预览版，不代表后续提交也已通过。

前一轮演示提交 `4010666` 的[验证记录](https://github.com/zlsjtj/CodeAtlas/actions/runs/37192032213)仍可查看。

- 真实模型问答尚未验收，六道固定问题仍为 `not_run`。实录没有模型调用，浏览器测试中的模型替身不代表真实效果。
- 搜索是关键词和正则符号匹配，不是语义搜索或调用图。单次最多读取 200 行。
- 草案应用需要确认，并检查文件哈希；检查失败只回滚本次修改的目标文件。
- pytest 和 npm scripts 会执行仓库代码。没有执行沙箱、鉴权或多用户隔离，只对可信仓库运行检查，不直接部署到公网。
- macOS 和大规模仓库性能尚未验收。

遇到启动或搜索问题，请在 [Issue](https://github.com/zlsjtj/CodeAtlas/issues/new/choose) 中附系统、版本、复现步骤和公开最小样例，不上传密钥或私有代码。

## English

Published as [v0.1.0-preview.2](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.2) at commit [`4c9b6aa`](https://github.com/zlsjtj/CodeAtlas/commit/4c9b6aa083cd09d22baf6868664da76285da31f8). This is a prerelease, not a stable release.

This preview focuses on local code reading without a model key: import a repository, search text or symbols, and inspect numbered source lines.

With Python 3.11+, Node.js 20.12+ and Git installed, clone the `v0.1.0-preview.2` tag using the commands above, run `npm run setup`, then `npm run demo`. Open the printed URL and switch the workspace to English. The pinned Click checkout is already indexed; search `callback=f` and follow the [callback example](reading-example.en.md). Use `npm run dev` for your own repositories, or follow the [Docker instructions](../README.en.md#docker-compose).

The release commit passed [CI on Windows, Ubuntu and Linux Docker](https://github.com/zlsjtj/CodeAtlas/actions/runs/37195163701). This result applies to the tagged commit, not later changes.

Real-model Q&A remains unvalidated. Search uses keywords and regexes, not semantic retrieval. Reads are capped at 200 lines. Checks execute repository code without a sandbox; use trusted repositories only and do not expose the service publicly. macOS and large-repository performance have not been validated.

Please report startup failures or searches that cannot locate expected code, with reproducible steps and a minimal public example. Remove credentials and private source before sharing.
