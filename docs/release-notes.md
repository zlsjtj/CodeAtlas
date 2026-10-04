# 0.1.0 阅读预览版 / Reading Preview

拟发布标签：`v0.1.0-preview.1`。本文是发布说明，是否已发布以 [GitHub Releases](https://github.com/zlsjtj/CodeAtlas/releases) 为准。

## 可以试什么

这是一个不需要模型 Key 的代码阅读预览版。导入本地目录或公开 GitHub 仓库，搜索关键词或符号，再打开带行号的源码核对上下文。

第一次试用建议跟着 Click 示例：安装 Python 3.11+、Node.js 20.12+ 和 Git，克隆仓库后运行：

```sh
npm run setup
npm run demo
```

打开终端打印的地址，搜索 `callback=f`。固定版本的 Click 已导入并索引；沿[三处源码](reading-example.md)查看装饰器如何保存、调用原函数。示例不用已有模型 Key，也不覆盖 `.env` 或普通开发数据库。

读自己的仓库用 `npm run dev`。另提供仅绑定本机的 Docker Compose；挂载和启动说明见 [README](../README.md)。中英文首页分别使用对应界面的实录，手机显示单栏静态图。

## 已验证与未验证

阅读演示提交 `4010666` 的 [CI](https://github.com/zlsjtj/CodeAtlas/actions/runs/37192032213)已通过 Windows、Ubuntu 和 Linux Docker 验证，包含示例准备与重复导入、后端回归、前端类型检查及构建、浏览器测试，以及容器重建后的索引保留。发布时仍需确认标签指向的提交 CI 通过，不能用这条历史记录代替。

- 真实模型问答尚未验收，六道固定问题仍为 `not_run`。实录没有模型调用，浏览器测试中的模型替身不代表真实效果。
- 搜索是关键词和正则符号匹配，不是语义搜索或调用图。单次最多读取 200 行。
- 草案应用需要确认，并检查文件哈希；检查失败只回滚本次修改的目标文件。
- pytest 和 npm scripts 会执行仓库代码。没有执行沙箱、鉴权或多用户隔离，只对可信仓库运行检查，不直接部署到公网。
- macOS 和大规模仓库性能尚未验收。

遇到启动或搜索问题，请在 [Issue](https://github.com/zlsjtj/CodeAtlas/issues/new/choose) 中附系统、版本、复现步骤和公开最小样例，不上传密钥或私有代码。

## English

This preview focuses on local code reading without a model key: import a repository, search text or symbols, and inspect numbered source lines.

With Python 3.11+, Node.js 20.12+ and Git installed, clone the project, run `npm run setup`, then `npm run demo`. Open the printed URL and switch the workspace to English. The pinned Click checkout is already indexed; search `callback=f` and follow the [callback example](reading-example.en.md). Use `npm run dev` for your own repositories, or follow the [Docker instructions](../README.en.md#docker-compose).

Real-model Q&A remains unvalidated. Search uses keywords and regexes, not semantic retrieval. Reads are capped at 200 lines. Checks execute repository code without a sandbox; use trusted repositories only and do not expose the service publicly. macOS and large-repository performance have not been validated.

Please report startup failures or searches that cannot locate expected code, with reproducible steps and a minimal public example. Remove credentials and private source before sharing.
