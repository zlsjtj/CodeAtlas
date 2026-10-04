# 问答案例与引用检查

本轮展示使用 [`reading-cases.json`](reading-cases.json)：CodeAtlas 和 Click 各三道预定义问题，固定提交，最多六次真实问答，不重试筛选结果。当前缺少模型 Key，[六项均未运行](../docs/evidence/qa-status.json)。它与下面的旧版引用路径冒烟测试是不同清单，不能合并计算成绩。

## 引用路径冒烟

这里放了少量手写的问答检查样例，用来发现明显的检索或引用退化。它只检查预期文件有没有出现在引用里，不评价回答文字质量。

目前包含：

- `smoke_cases.json`：几条针对本仓库的问答样例。
- `run_smoke_cases.py`：调用一个正在运行的 CodeAtlas 后端，逐条提问并核对引用路径。
- 后端测试会检查样例格式和路径匹配逻辑。

## 运行

先启动后端，在 CodeAtlas 中导入并索引当前仓库，记下仓库 ID。然后在项目根目录运行：

```powershell
python benchmarks/run_smoke_cases.py --repo-id 1
```

也可以指定其他后端地址或 case 文件：

```powershell
python benchmarks/run_smoke_cases.py `
  --repo-id 1 `
  --base-url http://localhost:8000 `
  --cases benchmarks/smoke_cases.json
```

每条 case 会输出 `PASS` 或 `FAIL`。只要有预期引用缺失，脚本就以状态码 1 退出，方便在本地脚本或后续 CI 中使用。

路径命中只说明预期文件出现在引用列表中，不验证行号、摘录或回答结论。该脚本会产生额外模型请求，不属于本轮六次验收预算。
