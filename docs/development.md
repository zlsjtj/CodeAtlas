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

先运行 `npm run demo`，在另一个终端执行：

```sh
node frontend/scripts/record-reading.mjs
python scripts/encode-recording.py
```

编码脚本需要 Pillow，它只用于制作 GIF，不是应用运行依赖。浏览器在 `frontend` 下运行 `npx playwright install chromium` 安装。非默认端口用 `DEMO_WEB_URL` 和 `DEMO_API_URL`。每次录制的帧、时间戳与请求记录写入独立的 `data/recording/<timestamp>`；失败记录也保留。编码器使用最近一次成功录制。

录屏从已索引、已打开装饰器源码的工作台开始，演示三次关键词搜索和源码核对，不包含安装或下载。GIF 为原速截图序列；手机静态图直接截取真实手机尺寸下的阅读栏，开启自动换行，没有拼接源码或模拟回答。
