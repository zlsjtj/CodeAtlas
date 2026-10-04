# CodeAtlas

本地代码阅读工作台：搜索符号、查看上下文，把解释对回源码。

[![CI](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml)
[MIT](LICENSE) · 中文 | [English](README.en.md)

把目录、搜索结果和带行号源码放在一起读，不需要模型 Key。需要解释时再接入模型，点击回答中的引用核对原文。

## 从一个问题开始

**Click 的 `@command()` 怎样把函数变成可执行的命令？**

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/codeatlas-reading-mobile.png">
  <source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/codeatlas-reading.png">
  <img alt="在 Click 中搜索 callback=f，查看装饰器如何保存回调，再定位执行回调的源码" src="docs/assets/codeatlas-reading.gif">
</picture>

真实工作台录屏，原速、无模型调用。手机显示单栏静态画面；[完整动画](docs/assets/codeatlas-reading.gif) · [案例与录制记录](docs/reading-example.md)。模型问答尚未完成真实案例验收。

在这个固定版本里，阅读路径是：

1. 搜索 `callback=f`：装饰器用原函数创建命令对象，[decorators.py:248](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/decorators.py#L248)。
2. 搜索 `self.callback = callback`：`Command` 保存这个回调，[core.py:1090](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1090)。
3. 搜索 `ctx.invoke(self.callback`：命令执行时，把解析后的参数交给回调，[core.py:1442](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L1442)。

这是手动沿源码核对的阅读路径，不是自动生成的调用图。

## 在本机试一次

准备 Python 3.11+、Node.js 20.12+ 和 Git：

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

打开终端打印的地址。Click 已导入并索引，直接在“关键词”里搜索 `callback=f`，点击结果即可跟着上面的例子阅读。首次运行会从 GitHub 下载固定提交。

示例用独立的 `data/demo` 数据库和 `repos/examples` 源码目录，不覆盖 `.env`，也不使用其中的模型 Key。重复运行复用同一份源码；检测到本地改动会停止，不会替你重置。退出按 `Ctrl+C`。

读自己的仓库用 `npm run dev`，点击顶部 `+` 导入本地目录或公开 GitHub 仓库，再建立索引。Windows PowerShell 和 Ubuntu 使用相同命令；端口占用会自动换到空闲端口。[启动细节](docs/development.md)

### Docker Compose

已安装 Docker 和 Compose 时，在项目根目录运行：

```sh
docker compose up --build --wait
```

打开 [127.0.0.1:3000](http://127.0.0.1:3000)，导入公开仓库。Docker 不自动加载上述固定版本示例；宿主源码需要[显式挂载](docs/development.md#docker-挂载与端口)。端口只绑定本机，命名卷保存数据，`docker compose down` 保留数据。

### 可选：模型问答

在根目录 `.env` 配置 `OPENAI_API_KEY`、`CODE_AGENT_OPENAI_MODEL`，兼容服务另设 `OPENAI_BASE_URL`，然后用 `npm run dev` 启动。Docker 修改配置后重新执行 Compose 命令。

问答和草案会把相关源码发送给模型服务，并产生 API 费用。Key 只交给后端；配置存在不代表服务可用。[真实问答验收状态](docs/evidence/qa-status.json)

## 使用边界

- 关键词和行级片段检索，符号匹配基于正则，不是 AST 或语义索引。跨文件问题可能漏证据。
- 读取每次最多 200 行。目录、检索、读取和草案共用文件排除规则，包括 `.gitignore`、常见凭据路径和符号链接；这不是源码中的密钥检测。
- 模型草案适合小文件。应用前校验文件哈希；“应用并检查”失败时只恢复本次写入的目标文件，不能撤销检查脚本的其他副作用。
- pytest 和 npm scripts 会执行仓库代码，只应对信任的仓库运行检查。没有执行沙箱、鉴权或多用户隔离，不要直接暴露到公网。

## 开发与反馈

FastAPI / SQLite 后端，Next.js 前端。

[开发与测试命令](docs/development.md) · [设计取舍](docs/design-notes.md) · [换仓库时的迟到请求案例](docs/maintenance-reading.md)

遇到启动、定位或引用问题，可以[提交 Issue](https://github.com/zlsjtj/CodeAtlas/issues/new/choose)，附复现步骤和公开最小样例，删除 Key 和私有代码。项目采用 [MIT](LICENSE)；演示中的 Click 源码保留[第三方许可](THIRD_PARTY_NOTICES.md)。
