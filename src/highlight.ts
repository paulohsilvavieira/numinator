import { tokenize } from "./engine/tokenizer";
import { findUnit } from "./engine/units";

const KEYWORDS = new Set([
  "in",
  "to",
  "of",
  "mod",
  "modulo",
  "plus",
  "minus",
  "times",
  "multiplied",
  "divided",
  "over",
  "by",
  "prev",
  "today",
  "now",
  "tomorrow",
  "yesterday",
]);

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Renders one line as HTML with a <span class="tok-*"> per token, reusing
// the engine's own tokenizer so highlighting never drifts from parsing.
export function highlightLine(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return `<span class="tok-comment">${escapeHtml(line)}</span>`;
  }

  const tokens = tokenize(line);
  let out = "";
  let last = 0;

  for (const tok of tokens) {
    if (tok.type === "eof") break;
    out += escapeHtml(line.slice(last, tok.pos));
    // use the raw source slice, not tok.text: for strings tok.text is the
    // content only (no quotes), so rendering tok.text would silently drop
    // the quote characters from the visible editor
    const raw = escapeHtml(line.slice(tok.pos, tok.end));

    if (tok.type === "number") {
      out += `<span class="tok-number">${raw}</span>`;
    } else if (tok.type === "string") {
      out += `<span class="tok-string">${raw}</span>`;
    } else if (tok.type === "ident") {
      if (findUnit(tok.text)) {
        out += `<span class="tok-unit">${raw}</span>`;
      } else if (KEYWORDS.has(tok.text.toLowerCase())) {
        out += `<span class="tok-keyword">${raw}</span>`;
      } else {
        out += `<span class="tok-variable">${raw}</span>`;
      }
    } else {
      out += `<span class="tok-operator">${raw}</span>`;
    }

    last = tok.end;
  }

  out += escapeHtml(line.slice(last));
  return out.length ? out : "&nbsp;";
}
