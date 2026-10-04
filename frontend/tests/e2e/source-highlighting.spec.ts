import { test, expect } from "@playwright/test";
import { highlightMatches, sourceLines } from "../../lib/source-highlighting";

test("syntax tokens preserve multiline strings, blank lines and literal markup", () => {
  const content = 'def greet():\n    """first\nsecond"""\n\n    return "<img src=x> & 中文"\n';
  const lines = sourceLines(content, "python");
  expect(lines.map((line) => line.map((token) => token.text).join("")).join("\n")).toBe(content);
  expect(lines[0].some((token) => token.className?.includes("hljs-keyword"))).toBe(true);
  expect(lines[2].some((token) => token.className?.includes("hljs-string"))).toBe(true);
  for (const language of ["tsx", "shell", "toml", "unknown", null]) {
    expect(sourceLines(content, language).flat().map((token) => token.text).join("")).toBe(content.replaceAll("\n", ""));
  }
});

test("search terms match literally across syntax tokens without changing the text", () => {
  const content = "ctx.invoke(self.callback, value='[a+b]*') # CALLBACK";
  const tokens = sourceLines(content, "python")[0];
  const pieces = highlightMatches(tokens, "ctx.invoke(self.callback [a+b]* CALLBACK");
  expect(pieces.map((part) => part.text).join("")).toBe(content);
  expect(pieces.filter((part) => part.hit).map((part) => part.text).join("")).toBe("ctx.invoke(self.callback[a+b]*CALLBACK");
  expect(highlightMatches([{ text: "İ😀greet" }], "GREET").filter((part) => part.hit).map((part) => part.text).join("")).toBe("greet");
  expect(highlightMatches([{ text: "hello" }], "  ")).toEqual([{ text: "hello" }]);
});

test("unknown languages and large segments fall back to unchanged plain text", () => {
  const content = "<tag>\n\n" + "x".repeat(50_000);
  expect(sourceLines(content, "python")).toEqual(content.split("\n").map((text) => [{ text }]));
  expect(sourceLines("one\n\ntwo", "unknown")).toEqual([[{ text: "one" }], [{ text: "" }], [{ text: "two" }]]);
});

test("paged snippets do not carry an ambiguous quote into later code", () => {
  const content = '    end of a docstring\n    """\n    if func is not None:\n        return decorator(func)';
  const lines = sourceLines(content, "python", 181);
  expect(lines.map((line) => line.map((token) => token.text).join("")).join("\n")).toBe(content);
  expect(lines[3].find((token) => token.text === "return")?.className).toContain("hljs-keyword");
  expect(lines[3].some((token) => token.className?.includes("hljs-string"))).toBe(false);
});
