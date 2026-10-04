# CodeAtlas：一次搜索怎样穿过前后端

仓库: CodeAtlas

源码摘录与笔记保存于阅读时，不随当前工作区变化。

## 1. 发起搜索

[frontend/lib/hooks/use\-repository\-reader\.ts:69\-86](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/frontend/lib/hooks/use-repository-reader.ts#L69-L86)

提交表单后，阅读器清空上次结果，将仓库 ID、去掉首尾空白的关键词和数量上限交给 repositoryTool。begin 取消同一通道的前一次请求；响应回来后还要检查是否已经取消。

```typescript
  async function search(query: string, mode: "search" | "find-symbol") {
    if (!query.trim()) return;
    const signal = begin("search");
    setSearching(true);
    setSearchError("");
    setSearched(false);
    setResults([]);
    setResultQuery("");
    setSourceTarget((current) => current ? { ...current, resultKey: undefined, searchQuery: undefined } : null);
    try {
      const response = await repositoryTool(mode, {
        repo_id: repository.id, [mode === "search" ? "query" : "name"]: query.trim(), limit: 30,
      }, locale, signal);
      if (signal.aborted) return;
      setResults(response.items);
      setResultQuery(query.trim());
      setTruncated(response.truncated);
      setSearched(true);
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T17:05:46.106Z
- 文件 SHA-256: `b5dd84d5cd31fab1786d0f14469945e4086526a8b4f7c6d7995720782536d1b3`
- 提交: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 2. 发出 HTTP 请求

[frontend/lib/api\.ts:82\-91](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/frontend/lib/api.ts#L82-L91)

关键词模式下 tool 为 search，载荷被序列化为 JSON，POST 到 /api/tools/search。共享 request 函数负责拼接后端地址、设置请求头和处理非成功响应。

```typescript
export function repositoryTool(
  tool: "list-tree" | "search" | "read" | "find-symbol",
  payload: Record<string, unknown>,
  locale: WorkspaceLocale,
  signal?: AbortSignal,
) {
  return request<ToolExecutionResponse>(`/api/tools/${tool}`, {
    method: "POST", body: JSON.stringify(payload), locale, signal,
  });
}
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T17:05:46.540Z
- 文件 SHA-256: `e2d02f7b4a3af4473931f4aef89922e82290d4f7692a704454039884f6ff8002`
- 提交: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 3. 接收搜索请求

[backend/app/api/routes/tools\.py:31\-40](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/backend/app/api/routes/tools.py#L31-L40)

FastAPI 将 JSON 解析为 SearchRepoRequest，注入数据库会话和响应语言。路由把请求交给 RepositoryTools，后者调用 RepositoryQueryService\.search\_repo。

```python
@router.post("/search", response_model=ToolExecutionResponse)
def search_repo(
    payload: SearchRepoRequest,
    db: Session = Depends(get_db),
    response_language: ResponseLanguage | None = Depends(get_response_language),
) -> ToolExecutionResponse:
    tools = RepositoryTools(db)
    if payload.response_language is None:
        payload.response_language = response_language
    return tools.search_repo(payload)
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T17:05:47.029Z
- 文件 SHA-256: `1102cf0b5127b5fd3218208bc9197ecc89870d6960d72708c2618032c36165d9`
- 提交: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 4. 查询索引片段

[backend/app/services/retrieval\_service\.py:104\-119](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/backend/app/services/retrieval_service.py#L104-L119)

查询限定当前仓库，逐个加入关键词条件，再检查文件排除规则。候选来自已建立的 FileChunk 索引；本次搜索最多收集 min\(limit × 8, 200\) 个候选，不会重新扫描全部源码。

```python
        statement = select(FileChunk).where(FileChunk.repo_id == payload.repo_id)
        for term in query_terms:
            statement = statement.where(func.lower(FileChunk.text).contains(term))

        if payload.path_prefix:
            statement = statement.where(FileChunk.path.startswith(payload.path_prefix.strip().strip("/")))

        fetch_limit = min(payload.limit * 8, 200)
        root = self.repository_service.resolve_repository_root(repository, payload.response_language)
        policy = RepositoryFilePolicy(root)
        candidates = []
        for chunk in self.db.scalars(statement).yield_per(200):
            if policy.allows(root / chunk.path):
                candidates.append(chunk)
                if len(candidates) >= fetch_limit:
                    break
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T17:05:47.458Z
- 文件 SHA-256: `e4cf48f2ceb009abedbc7c9f07b0643c0f1231523b630cd5178e109af15c520b`
- 提交: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 5. 排序并返回结果

[backend/app/services/retrieval\_service\.py:121\-147](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/backend/app/services/retrieval_service.py#L121-L147)

对已收集的候选评分，按分数、路径和起始行排序，再取 limit 条。每条结果带有路径、行范围、语言和摘要，前端据此显示列表并定位源码。

```python
        ranked: list[tuple[float, FileChunk]] = []
        for chunk in candidates:
            score = self._score_chunk(chunk.text, chunk.path, normalized_query, query_terms)
            if score > 0:
                ranked.append((score, chunk))

        ranked.sort(key=lambda entry: (-entry[0], entry[1].path, entry[1].start_line))
        limited = ranked[: payload.limit]
        items = [
            ToolResultItem(
                kind="search_match",
                path=chunk.path,
                start_line=chunk.start_line,
                end_line=chunk.end_line,
                language=chunk.language,
                content=self._build_snippet(chunk.text, normalized_query, query_terms),
                score=round(score, 3),
            )
            for score, chunk in limited
        ]

        return ToolExecutionResponse(
            tool_name="search_repo",
            repo_id=payload.repo_id,
            items=items,
            truncated=len(ranked) > len(limited),
            total_matches=len(ranked),
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T17:05:47.937Z
- 文件 SHA-256: `e4cf48f2ceb009abedbc7c9f07b0643c0f1231523b630cd5178e109af15c520b`
- 提交: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 6. 展示结果并打开源码

[frontend/components/reader/repository\-reader\.tsx:78\-86](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/frontend/components/reader/repository-reader.tsx#L78-L86)

界面逐条显示结果。点击时，路径和起始行交给 openSource，另发 /api/tools/read 请求读取当前工作区文件。因此结果摘要来自索引，打开的源码来自当前文件；文件改变后应重新索引。

```tsx
      {reader.results.map((item, index) => {
        const key = `${item.path}:${item.start_line}:${index}`;
        const selected = reader.sourceTarget?.resultKey === key;
        return <button className={`search-result ${selected ? "selected" : ""}`} key={key} aria-current={selected ? "true" : undefined}
          onClick={() => void reader.openSource({ path: item.path, line: item.start_line ?? 1, resultKey: key, searchQuery: reader.resultQuery })}>
          <span className="result-path">{item.path}<span className="muted">:{item.start_line}</span></span>
          <code><HighlightedLine tokens={[{ text: item.content ?? "" }]} query={reader.resultQuery} /></code>
        </button>;
      })}
```

<details>
<summary>来源与版本</summary>

- 来源: 与提交内容一致
- 保存时间: 2026-10-04T17:05:48.405Z
- 文件 SHA-256: `00923015cffc440455977d248a557d3d2f2262f12fe8ae92fd5bc12730af79d5`
- 提交: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

<details>
<summary>关于这份导出</summary>

文件哈希按整个 UTF-8 文件计算，换行统一为 LF。

GitHub 链接按本地 origin 和提交生成，未确认提交是否已推送或访问权限。

</details>
