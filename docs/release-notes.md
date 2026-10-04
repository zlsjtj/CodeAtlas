# v0.1.0-preview.4 · Shareable Reading Notes

**给关键代码起一个标题，把阅读路线导出成一篇更好读的源码笔记。** 这版完善了 Reading Routes 的整理与分享，并提供 Click 和 CodeAtlas 自身的两个完整案例。阅读、记笔记和导出仍不需要模型 Key。

<picture>
  <source media="(max-width: 600px)" srcset="https://raw.githubusercontent.com/zlsjtj/CodeAtlas/v0.1.0-preview.4/docs/assets/codeatlas-showcase-mobile.png">
  <source media="(prefers-reduced-motion: reduce)" srcset="https://raw.githubusercontent.com/zlsjtj/CodeAtlas/v0.1.0-preview.4/docs/assets/codeatlas-showcase.png">
  <img alt="CodeAtlas：带位置标题的 Click 阅读路线，以及搜索、保存和导出过程" src="https://raw.githubusercontent.com/zlsjtj/CodeAtlas/v0.1.0-preview.4/docs/assets/codeatlas-showcase.gif">
</picture>

约 14 秒真实操作剪辑，部分 2 倍速，无模型调用。[40 秒完整实录](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/assets/codeatlas-showcase-full.gif)

## 从 preview.3 更新了什么

- **每个阅读位置可以有自己的标题。** 用“创建命令”“排序并返回结果”说明为什么保存这段代码；原来的路线仍可读取，不必重新整理。
- **导出笔记更适合直接阅读。** 标题、源码链接、笔记和带语言标记的代码块组成正文，保存时间与文件哈希收进“来源与版本”折叠区。
- **两个可跟读的完整案例。** Click 用三个位置解释装饰器与回调；CodeAtlas 用六个位置串起 React、FastAPI、索引查询和结果展示。

[Click 导出笔记](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/click-showcase-route.md) · [CodeAtlas 搜索案例](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/codeatlas-search.md) · [CodeAtlas 导出笔记](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/codeatlas-search-route.md)

## 直接试一次

准备 Python 3.11+、Node.js 20.12+ 和 Git：

```sh
git clone --branch v0.1.0-preview.4 https://github.com/zlsjtj/CodeAtlas.git
cd CodeAtlas
npm run setup
npm run demo
```

打开终端打印的地址，Click 已导入并索引。搜索 `callback=f`，打开源码，保存一个位置并添加标题、笔记，再到“路线”中导出 Markdown。示例数据独立保存，不覆盖 `.env`，也不使用其中的模型 Key。退出按 `Ctrl+C`。

读自己的仓库用 `npm run dev`。已有 checkout 更新前先保存本地改动；此版本兼容旧路线，没有数据库迁移。路线保存在当前浏览器，更新或清理浏览器数据前建议先导出笔记。Docker 和配置见[本版本 README](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/README.md)。

素材来自真实工作台，导出文件未手工改写。源码摘录和版本核对结果见[实录记录](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/evidence/showcase-demo.json)与[跨前后端案例记录](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/evidence/codeatlas-search.json)。

## English

**Give each reading stop a title, then share a clearer source-code walkthrough.** This release improves Reading Routes and its Markdown output, with two complete examples to follow. Reading, annotation, and export need no model key.

- Name individual stops while keeping existing saved routes compatible.
- Export titled sections, source links, notes, and language-tagged code blocks. Timestamps and file hashes fold into “Source and version.”
- Follow Click from decorator to callback, or trace CodeAtlas's search across React, FastAPI, and its index query.

[Click export](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/click-showcase-route.en.md) · [CodeAtlas walkthrough](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/codeatlas-search.en.md) · [CodeAtlas export](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/codeatlas-search-route.en.md)

Run the commands above, open the printed URL, and switch to English. Search `callback=f` in the preloaded Click repository, save a stop with a title and note, then export it from Route. Use `npm run dev` for your own repositories. Save local changes before updating an existing checkout; this release needs no database migration and keeps older routes readable. Export notes before clearing browser data. See the [versioned README](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/README.en.md) for Docker and configuration.

[English short demo](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/assets/codeatlas-showcase-en.gif): about 14 seconds of real actions, edited with some sections at 2× speed. [Full 40-second recording](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/assets/codeatlas-showcase-full-en.gif). Neither uses model calls.

---

服务仅供本机使用，检查只应在信任的仓库运行。分享笔记前移除私有代码和凭据；模型问答需另行配置，其验证状态见[运行说明](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/development.md#模型与运行说明)。

Keep the service local, run checks only on trusted repositories, and review exports before sharing private code. Optional model setup and validation status are documented in the [execution notes](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/development.md#model-and-execution-notes).

[Changes since preview.3](https://github.com/zlsjtj/CodeAtlas/compare/v0.1.0-preview.3...v0.1.0-preview.4) · [Previous release](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.3) · [Report a problem or share feedback](https://github.com/zlsjtj/CodeAtlas/issues/new/choose)
