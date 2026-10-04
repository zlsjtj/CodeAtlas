# 阅读路线

从 `v0.1.0-preview.3` 起提供。没有模型调用，也不会修改仓库文件。

## 用一次

1. 打开源码，点击行号范围旁的书签加号。
2. 选择当前已加载片段中的起止行，可以起一个简短的位置标题，再写笔记、保存。
3. 在“路线”中调整顺序、修改标题和笔记，或移除位置。最近一次移除可以撤销。
4. 导出 Markdown，得到按顺序排列的标题、笔记和带语法标记的源码摘录。文件位置保留在每节开头，保存时间、文件哈希和完整版本放在“来源与版本”折叠区。

位置标题是可选的，最多 120 字符；未填写时，导出小标题仍使用文件位置。已有路线可以直接打开，不需要迁移。新版排版见[实际导出的笔记](examples/click-showcase-route.md)。

以 Click 案例为例，可以保存 `decorators.py:248`、`core.py:1090` 和 `core.py:1442`，分别记下创建命令、保存回调、执行回调。文件中的完整路径和固定输入见[阅读案例](reading-example.md)。这些位置要由读者选择，不会自动推导成调用图。

已有一份[实际导出的 Click 路线](examples/click-reading-route.md)，保留了三处摘录、笔记和来源信息。[截图与复现步骤](reading-example.md#保存这次阅读)可以对照查看。

## 来源怎么判断

- 与提交内容一致：读取到的整个文件文本与本地 HEAD 中的文件一致。只说明这个文件，不说明整个工作区干净。
- 文件已修改或未跟踪：当前内容不能直接视为 HEAD 中的版本。导出保留摘录和文件哈希，不生成该摘录的 GitHub 提交链接。
- 本地文件：没有可用的 Git 仓库版本。
- 版本未确认：Git 不可用、超时或元数据无法核对；仍可保存已经读取的摘录。

只有内容核对一致、origin 是可解析的 GitHub 地址时才生成固定提交链接。不会返回嵌在远端地址中的用户名、密码或令牌。不会联网确认该提交已推送，私有仓库的访问权限也未验证。只支持 HTTPS 与 `git@github.com:owner/repo.git` 形式的 origin；其他地址仍保留摘录与哈希。

哈希按读取时的整个 UTF-8 文件计算，CRLF 和 CR 统一为 LF。核对 Git blob 时使用同样的换行规则，不运行内容过滤器、不使用 replacement objects。行号仍按已有读取规则计算，每个位置最多 200 行。

点击路线中的位置，打开的是**当前工作区文件**，不是自动切换到旧提交。哈希不同会提示行号可能偏移；文件被删除或排除后仍按原有规则报错。“保存时摘录”和导出内容不会随工作区变化而改写。

## 保存范围

每个仓库一条路线，最多 50 个位置，每条笔记最多 2000 字符。相同文件版本和行范围不会重复添加，不同版本可以并存。

路线使用当前浏览器、当前站点地址的 localStorage，并按后端地址和仓库身份隔离。换浏览器、换前端端口或重新导入为另一个仓库记录，不会自动迁移。清除站点数据会删除路线；Markdown 是导出文件，目前不支持导入恢复。

浏览器存储失败时不会显示保存成功。旧数据损坏时不覆盖；其他标签页修改后要求重新加载，避免静默覆盖。这里只做浏览器本地保存，不提供跨设备同步。

保存的摘录可能包含私有代码。后来新增 `.gitignore` 规则不会自动清理历史摘录，导出前需要检查内容。导出元数据不包含本机绝对路径、数据库 ID 或认证信息；选定的源码和笔记仍可能包含这些内容，需要自行审阅。

## English

Available from `v0.1.0-preview.3`. Save a loaded source range with the bookmark-plus button, then open Route to edit notes, reorder stops or export Markdown. There are no model calls or repository writes.

Stops can have an optional title of up to 120 characters. Exports lead with the title, source location, note and code; timestamps, hashes and revision details remain under “Source and version.” Stops without titles, including older saved routes, use the file location as their heading. See the [current export format](examples/click-showcase-route.en.md).

See the [actual Click export](examples/click-reading-route.en.md) and [capture steps](reading-example.en.md#keep-the-reading-route) for a complete three-stop example.

Each stop retains the excerpt, line range, timestamp and whole-file text hash. GitHub links use a full commit only when the loaded file matches that commit and origin has a supported GitHub URL. Remote availability is not checked. Modified, untracked or unverified files keep their excerpts without claiming an exact GitHub source link. CRLF and CR are normalized to LF for hashing and comparison.

Opening a stop reads the current workspace file and compares its hash. It does not check out the saved commit or update the stored excerpt. Deleted or excluded files remain inaccessible through the reader.

One route per repository is stored in localStorage, limited to 50 stops and 2000 characters per note. Browser, site address and repository identity matter: changing them does not migrate data. Clearing site data deletes routes. Markdown export cannot currently be imported back. Storage failures, corrupt data and cross-tab conflicts are reported instead of silently replacing saved data.

Export metadata omits local absolute paths and authentication data, but saved source and notes may still contain them or other private information. Review the contents before sharing. New file exclusions do not erase previously saved excerpts.
