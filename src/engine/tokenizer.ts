import type { NumberFormat } from "./numberFormat";
import { DEFAULT_NUMBER_FORMAT, parseNumber } from "./numberFormat";

export type TokenType =
  | "number"
  | "ident"
  | "string"
  | "currency"
  | "+"
  | "-"
  | "*"
  | "/"
  | "^"
  | "%"
  | "="
  | "=="
  | "==="
  | "!="
  | "!=="
  | "<"
  | "<="
  | ">"
  | ">="
  | "("
  | ")"
  | "eof";

export interface Token {
  type: TokenType;
  text: string;
  value?: number;
  pos: number;
  /** exclusive end offset in the source line; may span more than text.length (e.g. quoted strings) */
  end: number;
}

const SYMBOLS: Record<string, TokenType> = {
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",
  "^": "^",
  "%": "%",
  "(": "(",
  ")": ")",
};

const CURRENCY_SYMBOLS = ["$", "€", "£", "¥"];

export function tokenize(input: string, format: NumberFormat = DEFAULT_NUMBER_FORMAT): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (/[.,]/.test(ch) && /[0-9]/.test(input[i + 1] ?? ""))) {
      const start = i;
      // a separator belongs to the number only when a digit follows it, so
      // "5." or "1, 2" don't swallow the trailing punctuation
      while (i < n && (/[0-9]/.test(input[i]) || (/[.,]/.test(input[i]) && /[0-9]/.test(input[i + 1] ?? "")))) i++;
      const text = input.slice(start, i);
      let value = parseNumber(text, format);
      // "5k" / "2M" scale suffix, only when it stands alone ("5mm" and "5 MB" stay units)
      if (/[kKM]/.test(input[i] ?? "") && !/[a-zA-Z_]/.test(input[i + 1] ?? "")) {
        value *= input[i] === "M" ? 1e6 : 1e3;
        i++;
      }
      tokens.push({ type: "number", text: input.slice(start, i), value, pos: start, end: i });
      continue;
    }

    // currency symbols are checked before identifiers so "R$" isn't read as the word "R"
    const symbol = /^R\$/i.test(input.slice(i, i + 2)) ? input.slice(i, i + 2) : CURRENCY_SYMBOLS.includes(ch) ? ch : "";
    if (symbol) {
      tokens.push({ type: "currency", text: symbol, pos: i, end: i + symbol.length });
      i += symbol.length;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < n && /[a-zA-Z_]/.test(input[i])) i++;
      tokens.push({ type: "ident", text: input.slice(start, i), pos: start, end: i });
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      i++;
      let value = "";
      while (i < n && input[i] !== quote) {
        value += input[i];
        i++;
      }
      if (input[i] === quote) i++; // skip closing quote, if present
      tokens.push({ type: "string", text: value, pos: start, end: i });
      continue;
    }

    if (ch === "=") {
      if (input[i + 1] === "=" && input[i + 2] === "=") {
        tokens.push({ type: "===", text: "===", pos: i, end: i + 3 });
        i += 3;
        continue;
      }
      if (input[i + 1] === "=") {
        tokens.push({ type: "==", text: "==", pos: i, end: i + 2 });
        i += 2;
        continue;
      }
      tokens.push({ type: "=", text: "=", pos: i, end: i + 1 });
      i++;
      continue;
    }

    if (ch === "!" && input[i + 1] === "=") {
      if (input[i + 2] === "=") {
        tokens.push({ type: "!==", text: "!==", pos: i, end: i + 3 });
        i += 3;
        continue;
      }
      tokens.push({ type: "!=", text: "!=", pos: i, end: i + 2 });
      i += 2;
      continue;
    }

    if (ch === "<") {
      if (input[i + 1] === "=") {
        tokens.push({ type: "<=", text: "<=", pos: i, end: i + 2 });
        i += 2;
        continue;
      }
      tokens.push({ type: "<", text: "<", pos: i, end: i + 1 });
      i++;
      continue;
    }

    if (ch === ">") {
      if (input[i + 1] === "=") {
        tokens.push({ type: ">=", text: ">=", pos: i, end: i + 2 });
        i += 2;
        continue;
      }
      tokens.push({ type: ">", text: ">", pos: i, end: i + 1 });
      i++;
      continue;
    }

    if (ch in SYMBOLS) {
      tokens.push({ type: SYMBOLS[ch], text: ch, pos: i, end: i + 1 });
      i++;
      continue;
    }

    // unknown character (e.g. a lone "!"): skip it rather than blowing up the whole line
    i++;
  }

  tokens.push({ type: "eof", text: "", pos: n, end: n });
  return tokens;
}
