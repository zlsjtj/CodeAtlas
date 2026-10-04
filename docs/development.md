# 启动与开发 / Development

根目录 `npm run setup` 检查 Node、Python 和 Git，安装项目依赖，不安装系统软件。`npm run dev` 同时启动后端和前端。Windows PowerShell、Ubuntu 在 CI 中实际运行；macOS 暂未验收。

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

将 Click 克隆到 `repos/click-demo`，checkout [案例清单](../benchmarks/reading-cases.json)中的提交；启动 CodeAtlas 后执行：

```sh
node frontend/scripts/record-reading.mjs
python scripts/encode-recording.py
```

编码脚本需要 Pillow，它只用于制作 GIF，不是应用运行依赖。浏览器先运行 `npx playwright install chromium` 安装。非默认端口用 `DEMO_WEB_URL` 和 `DEMO_API_URL`。原始帧、时间戳与请求状态写入忽略的 `data/recording`。脚本不调用问答接口，不模拟响应；核对显示的源码行与 checkout 一致后才生成记录。
