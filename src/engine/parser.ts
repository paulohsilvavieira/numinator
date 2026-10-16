import type { Token, TokenType } from "./tokenizer";
import { tokenize } from "./tokenizer";
import type { CompareOp, Node } from "./ast";
import { findUnit } from "./units";
import type { NumberFormat } from "./numberFormat";

const COMPARE_TOKENS: TokenType[] = ["=", "==", "===", "!=", "!==", "<", "<=", ">", ">="];

const WORD_OPERATORS: Record<string, "+" | "-" | "*" | "/" | "mod"> = {
  plus: "+",
  minus: "-",
  times: "*",
  multiplied: "*",
  divided: "/",
  over: "/",
  mod: "mod",
  modulo: "mod",
};

// words with a meaning of their own; anything else after a number is a custom unit
const RESERVED_WORDS = new Set([
  "in", "to", "of", "by", "mod", "modulo", "plus", "minus", "times", "multiplied", "divided", "over",
  "prev", "today", "now", "tomorrow", "yesterday",
  "as", "is", "on", "off", "pi", "e",
  "thousand", "million", "billion", "trillion",
]);

const SCALE_WORDS: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };

export const FUNCTION_NAMES = new Set([
  "sqrt", "cbrt", "abs", "round", "ceil", "floor", "ln", "log", "log2",
  "sin", "cos", "tan", "asin", "acos", "atan", "fact",
]);

export class ParseError extends Error {}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(input: string, format?: NumberFormat) {
    this.tokens = tokenize(input, format);
  }

  static parseLine(input: string, format?: NumberFormat): Node | null {
    const trimmed = input.trim();
    if (trimmed === "") return null;
    const parser = new Parser(input, format);
    const node = parser.parseStatement();
    parser.expect("eof");
    return node;
  }

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: Token["type"]): Token {
    const tok = this.next();
    if (tok.type !== type) {
      throw new ParseError(`Expected ${type} but got "${tok.text}" at position ${tok.pos}`);
    }
    return tok;
  }

  private matchWord(...words: string[]): boolean {
    const tok = this.peek();
    if (tok.type === "ident" && words.includes(tok.text.toLowerCase())) {
      this.pos++;
      return true;
    }
    return false;
  }

  private parseStatement(): Node {
    if (this.peek().type === "ident" && this.peek(1).type === "=" && !findUnit(this.peek().text)) {
      const name = this.next().text;
      this.next();
      const expr = this.parseConversion();
      return { kind: "assign", name, expr };
    }
    return this.parseComparison();
  }

  // "=" here (not caught by the assignment check above, which requires a
  // bare identifier on the left) reads as equality: "1+1=2" -> true.
  private parseComparison(): Node {
    const left = this.parseConversion();
    const tok = this.peek();
    if (COMPARE_TOKENS.includes(tok.type)) {
      this.pos++;
      const op = tok.type as CompareOp;
      const right = this.parseConversion();
      return { kind: "compare", op, left, right };
    }
    return left;
  }

  private parseConversion(): Node {
    let node = this.parseAdditive();
    if (this.matchWord("as")) {
      // "30 as a % of 50"
      this.matchWord("a");
      this.expect("%");
      if (!this.matchWord("of")) throw new ParseError('Expected "of" after "as a %"');
      return { kind: "asPercent", part: node, whole: this.parseAdditive() };
    }
    if (this.matchWord("is")) {
      // "20 is 5% of what"
      const percent = this.parsePostfix();
      if (percent.kind !== "percent" || !this.matchWord("of") || !this.matchWord("what")) {
        throw new ParseError('Expected a percentage like "20 is 5% of what"');
      }
      return { kind: "whatBase", part: node, percent };
    }
    if (this.matchWord("in", "to")) {
      const unitTok = this.next(); // a word ("usd") or a currency symbol ("$")
      const unit = findUnit(unitTok.text);
      if (!unit) throw new ParseError(`Unknown unit "${unitTok.text}"`);
      node = { kind: "convert", expr: node, unitId: unit.id };
    }
    return node;
  }

  private parseAdditive(): Node {
    let node = this.parseMultiplicative();
    for (;;) {
      if (this.peek().type === "+" || this.matchWordAhead("plus")) {
        this.pos++;
        node = { kind: "binary", op: "+", left: node, right: this.parseMultiplicative() };
      } else if (this.peek().type === "-" || this.matchWordAhead("minus")) {
        this.pos++;
        node = { kind: "binary", op: "-", left: node, right: this.parseMultiplicative() };
      } else if (this.matchWord("of")) {
        node = { kind: "binary", op: "*", left: node, right: this.parseMultiplicative() };
      } else {
        break;
      }
    }
    return node;
  }

  private matchWordAhead(word: string): boolean {
    const tok = this.peek();
    return tok.type === "ident" && tok.text.toLowerCase() === word;
  }

  private parseMultiplicative(): Node {
    let node = this.parseUnary();
    for (;;) {
      const tok = this.peek();
      if (tok.type === "*") {
        this.pos++;
        node = { kind: "binary", op: "*", left: node, right: this.parseUnary() };
      } else if (tok.type === "/") {
        this.pos++;
        node = { kind: "binary", op: "/", left: node, right: this.parseUnary() };
      } else if (tok.type === "ident" && WORD_OPERATORS[tok.text.toLowerCase()]) {
        const op = WORD_OPERATORS[tok.text.toLowerCase()];
        if (op !== "*" && op !== "/" && op !== "mod") break;
        const word = tok.text.toLowerCase();
        this.pos++;
        if (word === "divided") this.matchWord("by");
        if (word === "multiplied") this.matchWord("by");
        node = { kind: "binary", op, left: node, right: this.parseUnary() };
      } else {
        break;
      }
    }
    return node;
  }

  private parseUnary(): Node {
    if (this.peek().type === "-") {
      this.pos++;
      return { kind: "unary", op: "-", expr: this.parseUnary() };
    }
    if (this.matchWordAhead("minus")) {
      this.pos++;
      return { kind: "unary", op: "-", expr: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): Node {
    const node = this.parsePostfix();
    if (this.peek().type === "^") {
      this.pos++;
      const right = this.parseUnary();
      return { kind: "binary", op: "^", left: node, right };
    }
    return node;
  }

  private parsePostfix(): Node {
    let node: Node;
    if (this.peek().type === "currency") {
      // prefix currency: "R$ 1.234,50"
      const unit = this.currencyUnit(this.next());
      node = { kind: "unit", expr: this.applyScale(this.parsePrimary()), unitId: unit };
    } else {
      node = this.applyScale(this.parsePrimary());
    }

    if (this.peek().type === "%") {
      this.pos++;
      node = { kind: "percent", expr: node };
      // "5% on 30" / "5% off 30"
      const word = this.peek();
      if (word.type === "ident" && (word.text.toLowerCase() === "on" || word.text.toLowerCase() === "off")) {
        this.pos++;
        return { kind: "percentChange", op: word.text.toLowerCase() as "on" | "off", percent: node, base: this.parseUnary() };
      }
    }

    const tok = this.peek();
    if (tok.type === "currency" && node.kind !== "unit") {
      this.pos++;
      node = { kind: "unit", expr: node, unitId: this.currencyUnit(tok) };
    } else if (tok.type === "ident" && node.kind !== "unit" && !this.isConversionKeyword(tok)) {
      const unit = findUnit(tok.text);
      if (unit) {
        this.pos++;
        node = { kind: "unit", expr: node, unitId: unit.id };
      } else if (node.kind === "number" && !RESERVED_WORDS.has(tok.text.toLowerCase())) {
        this.pos++;
        node = { kind: "unit", expr: node, unitId: tok.text };
      }
    }

    return node;
  }

  // "x in miles": "in" followed by another unit is a conversion, not inches
  private isConversionKeyword(tok: Token): boolean {
    const word = tok.text.toLowerCase();
    if (word !== "in" && word !== "to") return false;
    const next = this.peek(1);
    return (next.type === "ident" || next.type === "currency") && !!findUnit(next.text);
  }

  // "3 million" -> 3000000
  private applyScale(node: Node): Node {
    const tok = this.peek();
    if (node.kind === "number" && tok.type === "ident") {
      const scale = SCALE_WORDS[tok.text.toLowerCase()];
      if (scale) {
        this.pos++;
        return { kind: "number", value: node.value * scale };
      }
    }
    return node;
  }

  private currencyUnit(tok: Token): string {
    const unit = findUnit(tok.text);
    if (!unit) throw new ParseError(`Unknown currency "${tok.text}"`);
    return unit.id;
  }

  private parsePrimary(): Node {
    const tok = this.peek();

    if (tok.type === "number") {
      this.pos++;
      return { kind: "number", value: tok.value! };
    }

    if (tok.type === "(") {
      this.pos++;
      const node = this.parseComparison();
      this.expect(")");
      return node;
    }

    if (tok.type === "string") {
      this.pos++;
      return { kind: "string", value: tok.text };
    }

    if (tok.type === "ident" && FUNCTION_NAMES.has(tok.text.toLowerCase()) && this.peek(1).type === "(") {
      this.pos += 2;
      const arg = this.parseComparison();
      this.expect(")");
      return { kind: "call", name: tok.text.toLowerCase(), arg };
    }

    if (tok.type === "ident") {
      this.pos++;
      return { kind: "ident", name: tok.text };
    }

    throw new ParseError(`Unexpected token "${tok.text}" at position ${tok.pos}`);
  }
}
