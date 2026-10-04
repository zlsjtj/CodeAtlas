# CodeAtlas

带引用查看代码，预览改动，再运行检查。

[![CI](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml/badge.svg)](https://github.com/zlsjtj/CodeAtlas/actions/workflows/ci.yml)

中文 | [English](README.en.md)

CodeAtlas 是一个在本地运行的代码仓库工作台。导入仓库后，可以围绕代码提问，核对回答中的文件路径、行号和工具调用记录；需要修改时，先查看 diff，再决定是否应用。

适合阅读一个不熟悉的仓库，或尝试单文件、少量文件的改动。当前面向本地单用户使用。

![CodeAtlas 检查面板：本地示例仓库的一次 pytest 通过结果](docs/assets/codeatlas-workspace.png)

截图展示的是检查面板。问答、改动草案和检查验证在同一个工作台内切换。

| 要做的事 | 可以查看的结果 |
| --- | --- |
| 找到功能入口 | 回答中的文件引用、代码摘录和工具调用摘要 |
| 修改少量代码 | 完整文件草案、unified diff；应用前检查文件哈希是否变化 |
| 验证改动 | 发现到的 pytest / npm 检查项、退出码和输出；使用“应用并检查”时，检查失败会恢复本次写入的目标文件 |

## 本地启动

需要 Python 3.11+、Node.js 20+ 和 Git。导入、索引、检索工具和检查功能不需要模型 Key；问答与生成改动草案需要 `OPENAI_API_KEY`，会产生模型 API 费用。

### 1. 下载项目

```sh
git clone https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
```

### 2. 启动后端

从项目根目录执行。首次使用时复制 `.env.example`；已有 `.env` 时保留现有配置。要使用问答，在 `.env` 中填写 `OPENAI_API_KEY`，模型名由 `CODE_AGENT_OPENAI_MODEL` 配置。

Windows PowerShell：

```powershell
Copy-Item .env.example .env
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --env-file ../.env --reload --port 8000
```

<details>
<summary>macOS / Linux</summary>

```sh
cp .env.example .env
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/python -m uvicorn app.main:app --env-file ../.env --reload --port 8000
```

</details>

`--env-file` 会把 `.env` 中的 Key 加载到后端进程。修改 Key 后重启后端。API 文档位于 [localhost:8000/docs](http://localhost:8000/docs)。

### 3. 启动前端

另开一个终端，从项目根目录执行：

```sh
cd frontend
npm ci
npm run dev
```

打开 [localhost:3000](http://localhost:3000)。前端默认连接 `http://localhost:8000`；如需修改，在 `frontend/.env.local` 设置 `NEXT_PUBLIC_API_BASE_URL` 后重启前端。

## 第一次试用

可以先使用本项目的 `frontend` 目录，不需要准备另外一个仓库。

1. 在“导入仓库”中选择“本地仓库”，填写 `CodeAtlas/frontend` 的绝对路径，点击“登记仓库”。
2. 点击“开始索引”，等状态变为“可用”。
3. 没有 Key 时，可以在 API 文档中调用 `GET /api/repositories` 取得仓库 ID，再调用 `POST /api/tools/find-symbol`。把下面的 `repo_id` 替换为实际 ID：

```json
{"repo_id": 1, "name": "WorkspaceShell"}
```

应能找到 `components/workspace-shell.tsx` 中的定义，响应包含路径和行号。这里的路径相对于导入的 `frontend` 目录。

配置 Key 后，可以在“问答”中尝试：

> WorkspaceShell 在哪里定义？它如何切换问答、改动草案和检查面板？请引用相关文件。

查看回答旁的“证据与轨迹”，核对引用与源码是否一致。

## 使用边界

- 仓库和索引保存在本机，模型问答和草案生成会把相关代码发送给模型服务。文件访问遵循导入目录内的 `.gitignore`，默认排除 `.env`、常见私钥文件和符号链接；`.env.example` 等示例配置允许读取。这是按路径过滤，不会识别源码中的密钥，首次试用仍建议使用不含凭据的公开源码。
- 检索基于关键词和按行切分的片段，符号定位使用正则匹配。跨文件问题可能漏掉证据，返回的引用需要人工核对。
- 草案使用完整文件内容，适合小文件。回滚只恢复本次应用涉及的目标文件，不能撤销测试脚本的其他副作用。
- 检查项来自有限的命令列表，但 npm scripts 和 pytest 仍会执行仓库代码；请只对信任的仓库运行检查。检查功能没有执行沙箱。
- 尚未实现鉴权、多用户隔离和后台任务重启恢复，不适合直接部署为公共服务。

## 开发与验证

后端使用 FastAPI、SQLAlchemy、SQLite 和 OpenAI Agents SDK；前端使用 Next.js。API 类型由 FastAPI OpenAPI 生成。实现细节见[设计记录](docs/design-notes.md)。

在 `backend` 目录用虚拟环境中的 Python 执行 `python -m pytest`；在 `frontend` 目录执行 `npm run typecheck`。CI 运行这两项检查。

已有测试覆盖[文件排除与旧索引访问](backend/tests/test_file_access.py)、[检索工具](backend/tests/test_tools.py)、[过期草案拒绝与检查失败回滚](backend/tests/test_patches.py)等后端行为。模型生成在单元测试中使用替身，前端暂未加入端到端测试，这些检查不能代表真实模型回答质量。

[引用冒烟脚本](benchmarks/README.md)会向运行中的后端发送三条问题，核对预期引用路径，需要 Key 和已索引的 **CodeAtlas 项目根目录**，与上面的 `frontend` 试用目录不同。它不评价回答是否正确，目前也没有公布跨仓库效果数据。

## 反馈

遇到问题可以[提交 Issue](https://github.com/zlsjtj/CodeAtlas/issues)。启动问题请附系统版本、执行命令和错误信息；定位失败请附符号名及最小代码片段；引用错误请说明提问内容、实际引用和预期文件。请移除 Key 和私有代码。
