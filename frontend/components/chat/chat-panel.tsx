export function ChatPanel() {
  return (
    <section className="panel-card">
      <h2 className="panel-title">问答主链路预留</h2>
      <p className="panel-copy">
        现在后端工具层已经具备基础能力，下一阶段会把这些工具接到 Agent 上，让模型先检索、再读取局部上下文、最后给出带引用的回答。
      </p>
      <div className="placeholder-list">
        <div className="placeholder-card">
          <h3 className="placeholder-title">Available tools</h3>
          <div className="placeholder-copy inline-code">list_repo_tree / search_repo / read_file / find_symbol</div>
        </div>
        <div className="placeholder-card">
          <h3 className="placeholder-title">Answer contract</h3>
          <div className="placeholder-copy">后续回答会尽量包含结论、证据引用、风险提示和下一步建议。</div>
        </div>
      </div>
    </section>
  );
}
