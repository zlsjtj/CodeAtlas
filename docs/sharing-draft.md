# 分享材料

## 中文介绍

**CodeAtlas：读懂陌生仓库，留下自己的源码阅读路线。**

读源码时，找到一个函数只是开始。CodeAtlas 可以把关键代码、位置标题和你的笔记保存成一条阅读路线，再导出 Markdown，让别人也能沿着这条路读下去。

两个例子可以直接打开看：Click 的 `@command()` 如何保存并调用原函数；CodeAtlas 的一次搜索如何穿过 React、FastAPI 和索引查询。笔记中保留了源码摘录和固定提交链接。

搜索、记笔记、调整顺序和导出都在本地完成，不需要模型 Key。安装依赖后运行 `npm run demo`，就能从已经索引的 Click 开始。

[项目与短演示](https://github.com/zlsjtj/CodeAtlas) · [Click 笔记](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/click-showcase-route.md) · [CodeAtlas 笔记](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/codeatlas-search-route.md) · [试用版本](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.4)

欢迎带着一个想读懂的仓库来试，也欢迎分享你整理的阅读路线。

## English Introduction

**CodeAtlas: Read the code. Keep the trail.**

Finding a function is only the start of reading a codebase. CodeAtlas lets you save source excerpts with titles and notes, arrange them into a reading route, and export Markdown that someone else can follow.

Two examples are ready to read: follow Click's `@command()` from decorator to callback, or trace a CodeAtlas search through React, FastAPI, and its index query. Both exports retain source excerpts and commit-pinned links.

Search, annotation, reordering, and export run locally without a model key. After setup, run `npm run demo` to start with an indexed Click checkout.

[Project and short demo](https://github.com/zlsjtj/CodeAtlas/blob/master/README.en.md) · [Click notes](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/click-showcase-route.en.md) · [CodeAtlas notes](https://github.com/zlsjtj/CodeAtlas/blob/v0.1.0-preview.4/docs/examples/codeatlas-search-route.en.md) · [Try this release](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.4)

Try it with a repository you want to understand, and share the route you discover.

## 配图与演示

- **短演示：[中文](assets/codeatlas-showcase.gif) / [English](assets/codeatlas-showcase-en.gif)。** 约 14 秒，先看成果，再看搜索、保存与导出。真实操作剪辑，部分 2 倍速，无模型调用。
- **同次完整实录：[中文](assets/codeatlas-showcase-full.gif) / [English](assets/codeatlas-showcase-full-en.gif)。** 约 40 秒原速，供希望看完整操作的读者使用。
- **静态图：[中文](assets/codeatlas-showcase.png) / [English](assets/codeatlas-showcase-en.png)。** 不支持 GIF 或偏好减少动态效果时使用。
- **手机图：[中文](assets/codeatlas-showcase-mobile.png) / [English](assets/codeatlas-showcase-en-mobile.png)。** 真实窄屏工作台，不将桌面图硬缩到手机宽度。
- **品牌封面：[1280 × 640 PNG](assets/codeatlas-social-preview.png)。** 用于链接分享和 GitHub Social preview。

品牌封面是 AI 生成的概念插画，不是产品界面。工作台图片、GIF 和 Markdown 来自真实操作；记录见[中文实录](evidence/showcase-demo.json)、[英文实录](evidence/showcase-demo-en.json)与[封面生成记录](evidence/social-preview.json)。CodeAtlas 案例另有[中文核对记录](evidence/codeatlas-search.json)和[英文核对记录](evidence/codeatlas-search-en.json)。

短演示对录制顺序作了剪辑，完整实录保留原顺序和速度。转发时请保留“真实操作剪辑、部分 2 倍速”的说明，不把它描述成模型自动生成阅读路线。

GitHub Social preview 独立于 Git 文件：更换封面仍需在仓库 Settings 中上传。本轮沿用现有封面，不重复更换。

以上为中英文介绍稿和素材入口，未自动对外发帖。
