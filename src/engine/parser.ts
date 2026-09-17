import type { Token, TokenType } from "./tokenizer";
import { tokenize } from "./tokenizer";
import type { CompareOp, Node } from "./ast";
import { findUnit } from "./units";

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

export class ParseError extends Error {}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(input: string) {
    this.tokens = tokenize(input);
  }

  static parseLine(input: string): Node | null {
    const trimmed = input.trim();
    if (trimmed === "") return null;
    const parser = new Parser(input);
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
    if (this.matchWord("in", "to")) {
      const unitTok = this.next();
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
    let node = this.parsePrimary();

    if (this.peek().type === "%") {
      this.pos++;
      node = { kind: "percent", expr: node };
    }

    const tok = this.peek();
    if (tok.type === "ident") {
      const unit = findUnit(tok.text);
      if (unit) {
        this.pos++;
        node = { kind: "unit", expr: node, unitId: unit.id };
      }
    }

    return node;
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

    if (tok.type === "ident") {
      this.pos++;
      return { kind: "ident", name: tok.text };
    }

    throw new ParseError(`Unexpected token "${tok.text}" at position ${tok.pos}`);
  }
}
