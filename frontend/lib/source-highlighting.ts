import { common, createLowlight } from "lowlight";

const highlighter = createLowlight(common);
const aliases: Record<string, string> = { tsx: "typescript", shell: "bash", toml: "ini" };
type SyntaxNode = ReturnType<typeof highlighter.highlight>["children"][number];
export type SourceToken = { text: string; className?: string };

export function sourceLines(content: string, language?: string | null, startLine = 1): SourceToken[][] {
  const plain = () => content.split("\n").map((text) => [{ text }]);
  const grammar = aliases[language ?? ""] ?? language;
  // Long files still open normally; highlighting must not block reading them.
  if (!grammar || !highlighter.registered(grammar) || content.length > 50_000) return plain();
  // A paged read may start inside a string or comment. Do not carry an
  // ambiguous opening delimiter through the rest of that source page.
  if (startLine > 1) return content.split("\n").map((line) => sourceLines(line, language)[0]);
  try {
    const lines: SourceToken[][] = [[]];
    function visit(node: SyntaxNode, className = "") {
      if (node.type === "text") {
        node.value.split("\n").forEach((text, index) => {
          if (index) lines.push([]);
          if (text) lines[lines.length - 1].push({ text, className });
        });
      } else if (node.type === "element") {
        const classes = node.properties.className;
        const inherited = [className, ...(Array.isArray(classes) ? classes : [])].filter(Boolean).join(" ");
        node.children.forEach((child) => visit(child, inherited));
      }
    }
    highlighter.highlight(grammar, content).children.forEach((node) => visit(node));
    if (lines.map((line) => line.map((token) => token.text).join("")).join("\n") !== content) return plain();
    return lines;
  } catch {
    return plain();
  }
}

export function highlightMatches(tokens: SourceToken[], query: string): (SourceToken & { hit?: boolean })[] {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!terms.length) return tokens;
  const pattern = new RegExp(terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "giu");
  const text = tokens.map((token) => token.text).join("");
  const matches = [...text.matchAll(pattern)].map((match) => ({ start: match.index!, end: match.index! + match[0].length }));
  const result: (SourceToken & { hit?: boolean })[] = [];
  let offset = 0;
  let matchIndex = 0;
  // Find matches across syntax boundaries, then split tokens without changing text.
  for (const token of tokens) {
    const end = offset + token.text.length;
    let cursor = offset;
    while (cursor < end) {
      while (matchIndex < matches.length && matches[matchIndex].end <= cursor) matchIndex++;
      const match = matches[matchIndex];
      const hit = !!match && match.start <= cursor;
      const next = Math.min(end, match ? (hit ? match.end : match.start) : end);
      result.push({ text: token.text.slice(cursor - offset, next - offset), className: token.className, hit });
      cursor = next;
    }
    offset = end;
  }
  return result;
}
