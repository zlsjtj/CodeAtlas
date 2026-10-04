# 分享材料

## 中文介绍

**CodeAtlas：读懂陌生仓库，留下自己的源码阅读路线。**

读源码时，找到一个函数只是开始。CodeAtlas 可以把关键行、源码摘录和你的笔记保存成一条阅读路线，再导出 Markdown，让别人也能沿着这条路读下去。

演示用 Click 的 `@command()` 串起命令创建、回调保存和执行。搜索、记笔记、调整顺序、导出都在本地完成，不需要模型 Key。安装依赖后运行 `npm run demo`，就能从同一份源码开始。

[查看项目与演示](https://github.com/zlsjtj/CodeAtlas) · [直接读导出的笔记](https://github.com/zlsjtj/CodeAtlas/blob/master/docs/examples/click-workflow-route.md)

欢迎带着一个想读懂的仓库来试，也欢迎分享你整理的阅读路线。

## English Introduction

**CodeAtlas: Read the code. Keep the trail.**

Finding a function is only the start of reading a codebase. CodeAtlas lets you save source excerpts with your own notes, arrange them into a reading route, and export Markdown that someone else can follow.

The Click demo traces `@command()` from command creation to callback execution. Search, annotation, and export run locally without a model key. After setup, run `npm run demo` to explore the same pinned source.

[Project and demo](https://github.com/zlsjtj/CodeAtlas/blob/master/README.en.md) · [Read the exported route](https://github.com/zlsjtj/CodeAtlas/blob/master/docs/examples/click-workflow-route.en.md)

Try it with a repository you want to understand, and share the route you discover.

## 配图与演示

| 素材 | 用途 |
| --- | --- |
| [品牌封面](assets/codeatlas-social-preview.png) | 1280 × 640 PNG，用于链接分享与 GitHub Social preview |
| [中文实录](assets/codeatlas-workflow.gif) / [English recording](assets/codeatlas-workflow-en.gif) | 40 秒，搜索到导出的完整操作；原速，无模型调用 |
| [中文静态图](assets/codeatlas-workflow.png) / [English still](assets/codeatlas-workflow-en.png) | 不支持 GIF 或需要静态预览时使用 |
| [手机截图](assets/codeatlas-workflow-mobile.png) / [Mobile screenshot](assets/codeatlas-workflow-en-mobile.png) | 真实手机尺寸工作台，不将桌面图硬缩到手机宽度 |

品牌封面是 AI 生成的概念插画，不是产品界面。工作台图片、GIF 和 Markdown 则来自真实操作；录制开始前已保存回调的两个位置，片中补上装饰器、调整顺序并导出。两次录制的记录见[中文](evidence/workflow-demo.json)和[英文](evidence/workflow-demo-en.json)，封面提示词见[生成记录](evidence/social-preview.json)。

GitHub 的分享封面不随 Git 推送自动生效，需要在仓库 **Settings → General → Social preview** 上传 PNG。素材文件已提供，不表示远端设置已修改。可参考 [GitHub 的设置说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)。

以上介绍稿供选择发布，未自动发帖。当前版本入口是 [Reading Routes](https://github.com/zlsjtj/CodeAtlas/releases/tag/v0.1.0-preview.3)。
