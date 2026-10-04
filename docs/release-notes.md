# v0.1.0-preview.3 · Reading Routes

**把关键源码、阅读笔记和版本来源保存成一条路线，再导出为 Markdown。** 读完一个问题，也留下一份能复查、能分享的记录。整个阅读与导出过程无需模型 Key。

<picture>
  <source media="(max-width: 600px)" srcset="https://raw.githubusercontent.com/zlsjtj/CodeAtlas/v0.1.0-preview.3/docs/assets/codeatlas-route-mobile.png">
  <img alt="CodeAtlas 阅读路线工作台：Click 的三处源码、阅读笔记与 Markdown 导出" src="https://raw.githubusercontent.com/zlsjtj/CodeAtlas/v0.1.0-preview.3/docs/assets/codeatlas-route.png">
</picture>

Click 实例：从装饰器创建命令，读到回调执行。[打开实际导出的 Markdown](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/docs/examples/click-reading-route.md) · [阅读与搜索实录](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/docs/assets/codeatlas-reading.gif)

## 这版的新用法

- **读到关键位置，随手留下笔记。** 选择源码行范围，保存摘录与注释，之后可以回到对应文件继续读。
- **把跨文件的线索排成路线。** 修改标题和笔记、调整顺序、删除或撤销最近一次删除，在同一处整理阅读过程。
- **导出一份带来源的记录。** Markdown 保留摘录、行号、笔记和文件哈希；文件内容与提交核对一致、GitHub origin 可识别时，附上固定提交链接。

## 直接试一次

准备 Python 3.11+、Node.js 20.12+ 和 Git：

```sh
git clone --branch v0.1.0-preview.3 https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

打开终端打印的地址。固定版本的 Click 已导入并索引：搜索 `callback=f`，打开源码，点击行号旁的书签加号保存位置，再到“路线”中导出 Markdown。退出按 `Ctrl+C`。

示例使用独立数据，不覆盖 `.env`，也不使用其中的模型 Key。读自己的仓库用 `npm run dev`；Docker 入口和配置见[本版本 README](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/README.md)。

路线保存在当前浏览器。分享前检查摘录和笔记，移除私有代码与凭据。仅在本机运行服务，只对信任的仓库执行检查。[路线与版本说明](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/docs/reading-route.md) · [模型配置与运行说明](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/docs/development.md#模型与运行说明)

## English

**Keep a trail through the code, then share it as Markdown.** Reading Routes lets you save source ranges with notes, put them in reading order, and export the result. No model key is needed.

[See the actual Click export](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/docs/examples/click-reading-route.en.md) · [English workspace screenshot](https://raw.githubusercontent.com/zlsjtj/CodeAtlas/v0.1.0-preview.3/docs/assets/codeatlas-route-en.png)

- Save a source range with a note, then reopen its location when you return to the code.
- Edit notes and the route title, reorder stops, or undo the last removal.
- Export excerpts, line ranges, notes, and file hashes. Commit-pinned GitHub links are included when file contents match the commit and the origin URL is supported.

Run the commands above, open the printed URL, and switch the workspace to English. The pinned Click example is already indexed. Search `callback=f`, save a range with the bookmark-plus button, then open Route to export Markdown.

Routes stay in the current browser. Review excerpts before sharing them. Keep the service local and run checks only on trusted repositories. See the [versioned README](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/README.en.md) for Docker and optional model setup, and [execution notes](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.3/docs/development.md#model-and-execution-notes) for configuration and validation details.

---

[Changes since preview.2](https://github.com/zlsjtj/CodeAtlas/compare/v0.1.0-preview.2...v0.1.0-preview.3) · [Previous release](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.2) · [Report a problem or share feedback](https://github.com/zlsjtj/CodeAtlas/issues/new/choose)
