# CodeAtlas: following a search across the stack

Repository: CodeAtlas

Saved source excerpts and notes, not a live workspace view.

## 1. Prepare the search

[frontend/lib/hooks/use\-repository\-reader\.ts:69\-86](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/frontend/lib/hooks/use-repository-reader.ts#L69-L86)

After form submission, the reader clears old results and passes the repository ID, trimmed query, and limit to repositoryTool\. begin aborts the previous request on this channel; the response is also checked for cancellation\.

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
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T17:06:19.371Z
- File SHA-256: `b5dd84d5cd31fab1786d0f14469945e4086526a8b4f7c6d7995720782536d1b3`
- Commit: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 2. Send the HTTP request

[frontend/lib/api\.ts:82\-91](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/frontend/lib/api.ts#L82-L91)

In text\-search mode, tool is search\. The payload becomes JSON in a POST to /api/tools/search\. The shared request function adds the backend URL and headers, and handles unsuccessful responses\.

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
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T17:06:19.790Z
- File SHA-256: `e2d02f7b4a3af4473931f4aef89922e82290d4f7692a704454039884f6ff8002`
- Commit: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 3. Receive the search request

[backend/app/api/routes/tools\.py:31\-40](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/backend/app/api/routes/tools.py#L31-L40)

FastAPI parses JSON into SearchRepoRequest and injects the database session and response language\. The route delegates to RepositoryTools, which calls RepositoryQueryService\.search\_repo\.

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
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T17:06:20.186Z
- File SHA-256: `1102cf0b5127b5fd3218208bc9197ecc89870d6960d72708c2618032c36165d9`
- Commit: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 4. Select indexed candidates

[backend/app/services/retrieval\_service\.py:104\-119](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/backend/app/services/retrieval_service.py#L104-L119)

The query is scoped to this repository, adds a condition for each term, and checks file exclusions\. Candidates come from indexed FileChunk rows; the search collects at most min\(limit \* 8, 200\) candidates without rescanning all source files\.

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
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T17:06:20.654Z
- File SHA-256: `e4cf48f2ceb009abedbc7c9f07b0643c0f1231523b630cd5178e109af15c520b`
- Commit: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 5. Rank and shape the results

[backend/app/services/retrieval\_service\.py:121\-147](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/backend/app/services/retrieval_service.py#L121-L147)

Collected candidates are scored and sorted by score, path, and starting line, then limited\. Each result includes its path, line range, language, and snippet so the frontend can render the list and locate the source\.

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
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T17:06:21.074Z
- File SHA-256: `e4cf48f2ceb009abedbc7c9f07b0643c0f1231523b630cd5178e109af15c520b`
- Commit: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

## 6. Render results and open source

[frontend/components/reader/repository\-reader\.tsx:78\-86](https://github.com/zlsjtj/CodeAtlas/blob/0309bce354bd666586e52988ebaf9522f5ddb210/frontend/components/reader/repository-reader.tsx#L78-L86)

The UI renders each result\. Clicking passes the path and starting line to openSource, which sends a separate /api/tools/read request for the current workspace file\. Snippets come from the index; opened source comes from the current file\. Reindex after changes\.

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
<summary>Source and version</summary>

- Source: Matches commit
- Saved: 2026-10-04T17:06:21.605Z
- File SHA-256: `00923015cffc440455977d248a557d3d2f2262f12fe8ae92fd5bc12730af79d5`
- Commit: `0309bce354bd666586e52988ebaf9522f5ddb210`

</details>

<details>
<summary>About this export</summary>

File hashes use the whole UTF-8 file with LF line endings.

GitHub links use the local origin and commit; remote availability and access permissions have not been checked.

</details>
