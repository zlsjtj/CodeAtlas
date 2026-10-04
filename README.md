# CodeAtlas

在浏览器里读一个陌生仓库：搜索函数，打开源码，再核对模型的解释。

[![CI](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml)
[MIT](LICENSE) · 中文 | [English](README.en.md)

CodeAtlas 是本地运行的代码阅读工作台。目录、关键词搜索、符号定位和带行号源码都不需要模型 Key。配置模型后，可以提问并点击回答中的引用；需要改动时，仍然先看 diff，再明确应用。

## 看一次实际操作

![在 Click 中搜索 Command，打开定义并翻页核对源码](docs/assets/codeatlas-reading.gif)

26 秒原速实录：在固定版本的 `pallets/click` 中搜索 `Command`，打开 `src/click/core.py`，查看相邻代码。无模拟响应，没有调用模型。当前没有配置模型 Key，真实问答尚未验收。[静态截图](docs/assets/codeatlas-reading.png) · [版本与核对记录](docs/reading-example.md)

## 启动

### 原生运行

准备 Python 3.11+、Node.js 20.12+ 和 Git，在终端执行：

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run dev
```

Windows PowerShell 和 Ubuntu 使用相同命令。`setup` 创建 `backend/.venv`、安装项目依赖；没有 `.env` 时才从示例创建，不覆盖已有配置，也不安装系统软件。

打开终端打印的地址，默认是 [127.0.0.1:3000](http://127.0.0.1:3000)。端口占用时自动选择空闲端口，同时更新 API 地址和 CORS。`Ctrl+C` 关闭本次启动的前后端，不会清理其他项目的进程。

第一次试用可导入启动输出中的 `frontend` 绝对路径，点击“开始索引”，然后在“符号”模式搜索 `WorkspaceShell`。点击结果就能阅读定义，不需要进入 API 文档。

### Docker Compose

已安装 Docker 和 Compose 时，在项目根目录运行：

```sh
docker compose up --build --wait
```

打开 [127.0.0.1:3000](http://127.0.0.1:3000)。容器端口仅绑定本机；索引和克隆仓库保存在命名卷。停止用 `docker compose down`，不要加 `--volumes`，除非确实要删除数据。

容器不能直接读取宿主机任意路径。可在界面导入公开 GitHub 仓库，或按[启动细节](docs/development.md)显式挂载一个本地源码目录。Docker 部署不是不可信代码执行沙箱。

### 可选：模型问答

在根目录 `.env` 中填写 `OPENAI_API_KEY`，并设置 `CODE_AGENT_OPENAI_MODEL`。兼容服务还可设置 `OPENAI_BASE_URL`。原生运行需重启；Docker 修改配置后重新执行上述 Compose 命令。

Key 只交给后端，问答和草案会产生模型 API 费用，并发送相关代码给模型服务。“已配置”只说明配置存在，不保证服务可连接或模型可用。

## 一个阅读案例

问题是“Click 的 `Command` 在哪里定义？”在演示固定的提交中，符号搜索定位到 [`src/click/core.py:985`](https://github.com/pallets/click/blob/06b2a678741131fd577ce170e23e5ca0aeba0309/src/click/core.py#L985)。点击结果后，工作台显示第 985–1184 行，可继续翻页查看实现。

这是一次可复核的代码定位，不是模型答题成绩。回答中的摘录和当前工作区文件分开显示；能打开引用文件，不代表回答的推断正确。CodeAtlas 与 Click 各三道问题已固定在[案例清单](benchmarks/reading-cases.json)，[验收状态](docs/evidence/qa-status.json)保留为未运行，不用测试替身填充结果。

## 边界与开发

- 关键词和行级片段检索，符号匹配基于正则，不是 AST 或语义索引。跨文件问题可能漏证据。
- 读取每次最多 200 行。目录、检索、读取和草案共用文件排除规则，包括 `.gitignore`、常见凭据路径和符号链接；这不是源码中的密钥检测。
- 模型草案适合小文件。应用前校验文件哈希；“应用并检查”失败时只恢复本次写入的目标文件，不能撤销检查脚本的其他副作用。
- pytest 和 npm scripts 会执行仓库代码，只应对信任的仓库运行检查。没有执行沙箱、鉴权或多用户隔离，不要直接暴露到公网。

后端是 FastAPI / SQLite，前端是 Next.js。CI 实际运行 Windows、Ubuntu 原生启动、后端测试、前端构建、Playwright 和 Linux Docker 冒烟测试。测试中的模型替身只验证交互，不证明模型回答质量。

[开发与测试命令](docs/development.md) · [设计取舍](docs/design-notes.md) · [换仓库时的迟到请求案例](docs/maintenance-reading.md)

遇到启动、定位或引用问题，可以[提交 Issue](https://github.com/zlsjtj/CodeAtlas/issues/new/choose)，附复现步骤和公开最小样例，删除 Key 和私有代码。项目采用 [MIT](LICENSE)；演示中的 Click 源码保留[第三方许可](THIRD_PARTY_NOTICES.md)。
