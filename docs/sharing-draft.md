# 项目介绍草稿

以下内容尚未对外发布，不包含用户评价或效果数据。

## 中文

CodeAtlas 是一个本地代码阅读工作台：导入仓库后，可以搜索函数或关键词，点击结果核对带行号的源码，不需要模型 Key。配置模型后可围绕代码提问，引用也能打开文件查看；修改代码仍需先预览 diff 再明确应用。

演示用固定版本的 Click，沿着三次搜索查看装饰器如何保存并调用原函数。安装依赖后运行 `npm run demo` 即可复现，不用先配置模型。当前使用关键词和正则符号检索；模型问答还没有完成真实案例验收。欢迎反馈具体仓库中找不到的代码，或启动时遇到的问题。

项目：https://github.com/zlsjtj/CodeAtlas

## English

CodeAtlas is a local code-reading workspace. Import a repository, search for a symbol or keyword, and open numbered source lines without a model key. With a model configured, you can ask questions and inspect the referenced files. Changes still require a diff preview and an explicit apply step.

The demo follows three searches through a pinned Click checkout to see how a decorator stores and invokes the original function. After setup, run `npm run demo` to reproduce it without configuring a model. Retrieval is keyword- and regex-based. Real-model Q&A is not yet validated against the fixed cases. Reports of startup problems or code that a query fails to locate are especially useful.

Project: https://github.com/zlsjtj/CodeAtlas

## GitHub About 建议

Explore unfamiliar codebases locally. Search symbols and read source without a model key.

Topics 可保留 `code-search`、`developer-tools`、`repository-analysis`、`nextjs`、`fastapi`。About 和 topics 不在 Git 文件中，这份草稿不表示远端设置已经修改。

## 展示取舍

参考 [Aider](https://github.com/Aider-AI/aider) 对使用场景的直接说明、[Repomix](https://github.com/yamadashy/repomix) 的快速开始入口、[DeepWiki-Open](https://github.com/AsyncFuncAI/deepwiki-open) 的成果演示。借鉴的是信息顺序，不借用用户评价、不比较未经测量的效果，也不复制其功能规模。

下一次迭代先记录外部用户的启动失败和定位问题，再选可复现的问题修复。访问与 clone 数据只能作为试用线索，短期 star 波动不能证明改版有效。提交按完整变更组织，不调整时间或重写历史。
