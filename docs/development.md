# 启动与开发 / Development

根目录 `npm run setup` 检查 Node、Python 和 Git，安装项目依赖，不安装系统软件。`npm run dev` 同时启动后端和前端。Windows PowerShell、Ubuntu 在 CI 中实际运行；macOS 暂未验收。

## 固定版本示例

安装依赖后运行 `npm run demo`。它从[案例清单](../benchmarks/reading-cases.json)读取 Click 的提交号，准备 `repos/examples/click-<commit>`，用现有接口导入并索引，再启动工作台。只下载和读取源码，不安装 Click 的依赖或运行其脚本。

示例数据库为 `data/demo/atlas.db`；它不使用普通开发数据库或 `.env` 中的模型 Key。设置 `CODEATLAS_FRONTEND_PORT` / `CODEATLAS_BACKEND_PORT` 仍可选择首选端口。

再次运行会检查提交号及工作区状态，复用干净的 checkout，不重复登记仓库。若有本地修改、额外文件或忽略的文件，先自行保存并移走该示例目录，再重新运行；启动器不会重置它。下载失败只清理本次创建的临时目录，重跑即可。

这是一条原生启动入口，不改变 Compose 的行为。Docker 用户仍在界面导入仓库。`npm run demo -- --smoke` 使用临时数据库验证示例索引及重复导入，完成后退出；CI 在 Windows 和 Ubuntu 上运行这一命令。

## 配置

- `.env`：后端模型配置。`OPENAI_API_KEY` 默认留空；可选 `OPENAI_BASE_URL`，模型名用 `CODE_AGENT_OPENAI_MODEL`。修改后重启。
- `CODEATLAS_FRONTEND_PORT` / `CODEATLAS_BACKEND_PORT`：原生启动的首选端口，默认 3000 / 8000。原生启动遇到占用会继续找空闲端口，使用 `127.0.0.1` 并同步 CORS，不结束占用者进程。
- 根目录启动脚本会覆盖前端 API 地址，使它对应本次后端端口。单独开发前端时可设置 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_BASE_URL`，不要向前端环境放模型 Key。
- 导入目录决定访问范围。不读取其外层或全局 Git 忽略配置；详情见[文件排除规则](design-notes.md#文件排除规则放在哪里)。

## 模型与运行说明

阅读、搜索、保存路线和导出 Markdown 不需要模型配置。问答与草案使用 `.env` 中的 `OPENAI_API_KEY`、`CODE_AGENT_OPENAI_MODEL`，兼容服务可另设 `OPENAI_BASE_URL`。Key 仅传给后端，不进入前端或镜像；配置存在不代表模型服务已经连通。

模型功能会将相关源码发给所配置的服务，并可能产生 API 费用，只应使用获准发送的代码。六条预定义真实问答案例尚未执行，不能由自动化测试中的替身回答推断真实回答质量；原始状态保留在[问答记录](evidence/qa-status.json)。首页展示的是实际搜索、源码阅读和笔记导出，不是模型问答效果。

关键词检索使用行级片段，符号定位基于正则而非 AST 或语义索引；跨文件问题可能漏证据。每次读取最多 200 行。目录、搜索、读取和草案共用文件排除规则，包括 `.gitignore`、常见凭据路径和符号链接，但不检测普通源码中的密钥。完整取舍见[设计记录](design-notes.md)。

草案使用完整文件内容，适合较小文件；应用前检查原文件哈希。“应用并检查”失败时只恢复本次写入的目标文件，不能撤销检查脚本的其他副作用。pytest 和 npm scripts 会执行仓库代码，只对信任的仓库运行检查。原生与容器启动都不提供不可信代码执行沙箱、鉴权或多用户隔离，不要直接暴露到公网。

### Model and execution notes

Reading, search, routes, and Markdown export do not require a model. Q&A and drafts use `OPENAI_API_KEY` and `CODE_AGENT_OPENAI_MODEL` in the root `.env`, with optional `OPENAI_BASE_URL` for compatible services. Keys stay on the backend, outside the frontend and images. Restart native development or rerun Compose after changes. Configuration presence does not establish connectivity.

Model features send relevant source to the configured service and may incur API costs. Only use code you are authorized to send. The six real-model cases remain unrun; test doubles are not evidence of answer quality. See the [validation record](evidence/qa-status.json). Homepage demos show actual source reading and note export, not model answers.

Retrieval uses line-based chunks and regex symbol matching, not AST or semantic analysis. Reads are capped at 200 lines. Shared file exclusions are path filters, not secret detection inside source. Drafts use full-file replacements and suit small files. Applying checks the original hash; rollback restores patched targets, not arbitrary effects of test scripts.

Run checks only on trusted repositories: pytest and npm scripts execute repository code. Neither native nor container deployment provides an execution sandbox, authentication, or multi-user isolation. Keep the service local. See [design notes](design-notes.md) for the implementation details and [route storage and provenance](reading-route.md#english) before sharing exports.

## Docker 挂载与端口

默认 Compose 不挂载宿主源码。公开 GitHub 仓库可直接在界面导入。

需要读本地源码时，在根目录 `.env` 中**显式**设置 `CODEATLAS_SOURCE_DIR` 为其绝对路径。例如 Windows 用 `E:/projects/example`，Linux 用 `/home/me/projects/example`，再运行：

```sh
docker compose -f compose.yaml -f compose.local.yaml up --build --wait
```

界面导入路径填写 `/workspace/source`。该挂载可写，因此确认应用草案会改动宿主文件。只读阅读可以在自己的 override 中加 `read_only: true`，此时不要运行应用或检查操作。不要挂载整个磁盘、个人主目录或 Docker socket。

Docker 端口被占用时，先在 `.env` 设置 `CODEATLAS_FRONTEND_PORT` / `CODEATLAS_BACKEND_PORT`，再用 `--build` 启动；前端 API 地址是构建参数。Docker 不自动选择端口。默认只绑定本机，不提供远程部署支持。

命名卷 `atlas-data` 保存数据库，`atlas-repos` 保存克隆仓库。`docker compose down` 保留它们；`docker compose down --volumes` 会删除这些数据。CI 在隔离 runner 上验证重建后的索引保留，再删除测试卷。

## 回归命令

根目录：

```sh
npm run test:startup
npm run smoke
npm run demo -- --smoke
```

后端用项目虚拟环境运行。Windows：`backend\.venv\Scripts\python.exe -m pytest backend/tests -q`；Ubuntu：`backend/.venv/bin/python -m pytest backend/tests -q`。

前端：

```sh
cd frontend
npm run generate:api-types
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Linux 首次安装浏览器依赖可能需要 `npx playwright install --with-deps chromium`。E2E 使用 3100 / 8100 固定端口及临时数据库；端口被占用会报错，不接管现有服务。请先停止当前前端开发服务器，避免两个 Next.js 进程同时写 `.next`。

模型替身仅用于引用、迟到响应及草案交互测试。导入、索引、搜索、读取、应用文件和 pytest 检查走真实后端。截图输出在忽略的 `frontend/test-results`，不是 README 问答成果。

## 实录复现

首页的 40 秒演示包含搜索、保存笔记、调整路线和下载 Markdown。先运行 `npm run demo`，在另一个终端执行：

```sh
node frontend/scripts/capture-reading-route.mjs --record
python scripts/encode-recording.py --kind workflow
node frontend/scripts/capture-reading-route.mjs --record --locale en
python scripts/encode-recording.py --kind workflow
```

录制使用独立浏览器上下文，不读取已有的阅读路线。开拍前通过界面保存 Click 回调的两个位置；片中搜索装饰器、保存第三个位置，再上移两次，最后下载文件。实际下载的 Markdown、截图、帧和核对记录写入 `data/workflow-recording/<timestamp>`，失败也保留。发布的导出文件是 `docs/examples/click-workflow-route*.md`，没有手工改写导出内容。

脚本核对固定提交、界面源码、摘录、顺序和导出链接，并验证刷新后仍能打开同一位置。GIF 是原速截图序列，没有生成界面或模型回答。手机和减少动态效果模式使用实拍静态图。发布素材的核对记录见 [workflow-demo.json](evidence/workflow-demo.json) 与 [workflow-demo-en.json](evidence/workflow-demo-en.json)。

原有的 28 秒纯搜索演示仍保留，可以独立复现：

```sh
node frontend/scripts/record-reading.mjs
python scripts/encode-recording.py
```

英文界面用 `node frontend/scripts/record-reading.mjs --locale en` 录制，再运行同一编码命令。语言通过工作台自身的切换控件选择，不修改截图文字。英文素材和记录使用 `-en` 后缀，不覆盖中文版。

编码脚本需要 Pillow，它只用于制作 GIF，不是应用运行依赖。浏览器在 `frontend` 下运行 `npx playwright install chromium` 安装。非默认端口用 `DEMO_WEB_URL` 和 `DEMO_API_URL`。每次录制的帧、时间戳与请求记录写入独立的 `data/recording/<timestamp>`；失败记录也保留。编码器使用最近一次成功录制。

录屏从已索引、已打开装饰器源码的工作台开始，演示三次关键词搜索和源码核对，不包含安装或下载。GIF 为原速截图序列；手机静态图直接截取真实手机尺寸下的阅读栏，开启自动换行，没有拼接源码或模拟回答。
