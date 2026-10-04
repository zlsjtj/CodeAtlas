# 从 Click 装饰器读到回调执行

问题是：`@click.command()` 怎样把一个普通函数变成命令？这次不用模型，沿着搜索结果阅读两个文件。

## 固定输入

- CodeAtlas 使用本次阅读体验改进后的界面：问答栏可收起，源码可自动换行。
- Click：[`06b2a678741131fd577ce170e23e5ca0aeba0309`](https://github.com/pallets/click/tree/06b2a678741131fd577ce170e23e5ca0aeba0309)。
- Windows，Chromium，桌面 960 × 640，手机 390 × 720；界面语言中文。使用 `npm run demo`，未调用模型。

## 操作与结果

1. `npm run demo` 准备固定提交、导入并索引 Click。打开打印的地址，展开 `src/click`。
2. 关键词搜索 `callback=f`。在 `decorators.py:248`，`cls(...)` 以原函数 `f` 作为 callback 创建命令，再返回命令对象。
3. 搜索 `self.callback = callback`。在 `core.py:1090`，`Command` 将 callback 保存到实例。这里也有其他匹配，注意核对类和文件上下文。
4. 搜索 `ctx.invoke(self.callback`。在 `core.py:1442`，命令执行时用解析后的 `ctx.params` 调用 callback。

这三处代码解释的是“原函数如何被保存并最终调用”，不覆盖完整参数解析、异常处理或命令组流程。工具提供关键词匹配和源码，没有自动分析调用关系。

录制脚本将每次打开的源码与固定 checkout 逐行比较，检查单次不超过 200 行，再记录文件哈希及行范围。[GIF](assets/codeatlas-reading.gif) 是约 28 秒的原速截图序列，没有加速、剪辑或模型响应。它从已经导入、索引并打开装饰器源码的工作台开始，不包含安装和下载。

[桌面静态画面](assets/codeatlas-reading.png)、[手机阅读栏截图](assets/codeatlas-reading-mobile.png)与[机器可读记录](evidence/reading-demo.json)一并保留。手机图来自实际窄屏布局，不是缩小的桌面图；首页对手机和减少动态效果偏好使用静态图。Click 源码使用 BSD-3-Clause，见[许可说明](../THIRD_PARTY_NOTICES.md)。

## 尚未验收的部分

CodeAtlas 和 Click 各三道问题已在[清单](../benchmarks/reading-cases.json)中预定义并固定版本。本轮模型请求数为 **0**：项目自身的环境和 `.env` 未提供有效 Key，不能生成真实回答。

[问答记录](evidence/qa-status.json)中六项均为 `not_run`，模型、原始回答、引用和源码审阅均为空。不是“六项通过”，也不能由 Playwright 中的替身回答补齐。后续有配置时只执行这六条问题，各一次；保存失败和原始回答，不挑选重试。引用核对应分别记录路径是否存在、行范围是否吻合、摘录是否相符、是否支持回答结论。

## 录制中发现的问题

前一次实录曾发现长目录撑高页面，已经改为各栏独立滚动。本次查看 GitHub 页面时又发现：桌面三栏图缩到手机约 324 像素后，源码难以阅读。

因此增加了问答栏开关和源码自动换行，并重新录制更窄的桌面画面、单独截取手机阅读栏。浏览器回归覆盖开关的键盘操作、关闭后源码保留、长行换行和原有问答/草案/检查入口。
