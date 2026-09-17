export type TokenType =
  | "number"
  | "ident"
  | "string"
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

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      const start = i;
      while (i < n && /[0-9,]/.test(input[i])) i++;
      if (input[i] === ".") {
        i++;
        while (i < n && /[0-9]/.test(input[i])) i++;
      }
      const raw = input.slice(start, i).replace(/,/g, "");
      tokens.push({ type: "number", text: input.slice(start, i), value: parseFloat(raw), pos: start, end: i });
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
