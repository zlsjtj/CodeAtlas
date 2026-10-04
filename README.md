# CodeAtlas

把陌生仓库放到一个本地工作台里读：搜索关键词或符号，沿行号核对源码。基础阅读不需要模型 Key。

[![CI](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml) · [MIT](LICENSE)

[快速体验](#在本机试一次) · [阅读案例](docs/reading-example.md) · [预览版](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.2) · [English](README.en.md)

## 从一个问题开始

**Click 的 `@command()` 怎样把函数变成可执行的命令？**

在这个固定版本里，装饰器把原函数交给 `Command` 保存为回调，执行命令时再经 `Context.invoke()` 调用。下面沿三处源码核对这个过程。

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/codeatlas-reading-mobile.png">
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/codeatlas-reading.png">
  <img alt="在 Click 中搜索 callback=f，查看装饰器如何保存回调，再定位执行回调的源码" src="docs/assets/codeatlas-reading.gif">
</picture>

约 28 秒实录，原速、无模型调用。手机显示单栏静态画面。[完整动画](docs/assets/codeatlas-reading.gif) · [案例与源码核对记录](docs/reading-example.md)

在这个固定版本里，阅读路径是：

1. 搜索 `callback=f`：装饰器用原函数创建命令对象，[decorators.py:248](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248)。
2. 搜索 `self.callback = callback`：`Command` 保存这个回调，[core.py:1090](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090)。
3. 搜索 `ctx.invoke(self.callback`：命令执行时，把解析后的参数交给回调，[core.py:1442](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1442)。

这是手动沿源码核对的阅读路径，不是自动生成的调用图。

读完后可以把这三处源码和笔记保存为[阅读路线](docs/reading-route.md)，再[导出 Markdown](docs/examples/click-reading-route.md)。这是工作台实际导出的 Click 示例，不是模型回答。路线保存在当前浏览器；此功能属于开发版，不包含在 `v0.1.0-preview.2` 中。

## 在本机试一次

准备 Python 3.11+、Node.js 20.12+ 和 Git：

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

打开终端打印的地址。Click 已导入并索引，直接在“关键词”里搜索 `callback=f`，点击结果即可跟着上面的例子阅读。首次运行会从 GitHub 下载固定提交。

退出按 `Ctrl+C`。示例使用独立数据，不覆盖 `.env`，也不使用其中的模型 Key。

读自己的仓库用 `npm run dev`，点击顶部 `+` 导入本地目录或公开 GitHub 仓库，再建立索引。[Windows / Ubuntu 启动、端口与数据目录](docs/development.md)

### Docker Compose

已安装 Docker 和 Compose 时，在项目根目录运行：

```sh
docker compose up --build --wait
```

打开 [127.0.0.1:3000](http://127.0.0.1:3000)，导入公开仓库。Docker 不自动加载上述固定版本示例；宿主源码需要[显式挂载](docs/development.md#docker-挂载与端口)。端口只绑定本机，命名卷保存数据，`docker compose down` 保留数据。

### 可选：模型问答

在根目录 `.env` 配置 `OPENAI_API_KEY`、`CODE_AGENT_OPENAI_MODEL`，兼容服务另设 `OPENAI_BASE_URL`，然后用 `npm run dev` 启动。Docker 修改配置后重新执行 Compose 命令。

问答和草案会把相关源码发送给模型服务，并产生 API 费用。Key 只交给后端；配置存在不代表服务可用。六条真实问答案例尚未执行，不能据此评价回答质量。[验收状态](docs/evidence/qa-status.json)

## 使用边界

- 关键词和行级片段检索，符号匹配基于正则，不是 AST 或语义索引。跨文件问题可能漏证据。
- 读取每次最多 200 行。目录、检索、读取和草案共用文件排除规则，包括 `.gitignore`、常见凭据路径和符号链接；这不是源码中的密钥检测。
- 模型草案适合小文件。应用前校验文件哈希；“应用并检查”失败时只恢复本次写入的目标文件，不能撤销检查脚本的其他副作用。
- pytest 和 npm scripts 会执行仓库代码，只应对信任的仓库运行检查。没有执行沙箱、鉴权或多用户隔离，不要直接暴露到公网。

## 开发与反馈

FastAPI / SQLite 后端，Next.js 前端。

[开发与测试命令](docs/development.md) · [设计取舍](docs/design-notes.md) · [换仓库时的迟到请求案例](docs/maintenance-reading.md)

遇到启动、定位或引用问题，可以[提交 Issue](https://github.com/zlsjtj/CodeAtlas/issues/new/choose)，附复现步骤和公开最小样例，删除 Key 和私有代码。项目采用 [MIT](LICENSE)；演示中的 Click 源码保留[第三方许可](THIRD_PARTY_NOTICES.md)。
