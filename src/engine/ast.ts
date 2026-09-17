export type CompareOp = "=" | "==" | "===" | "!=" | "!==" | "<" | "<=" | ">" | ">=";

export type Node =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "unit"; expr: Node; unitId: string }
  | { kind: "percent"; expr: Node }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^" | "mod"; left: Node; right: Node }
  | { kind: "compare"; op: CompareOp; left: Node; right: Node }
  | { kind: "unary"; op: "-"; expr: Node }
  | { kind: "ident"; name: string }
  | { kind: "assign"; name: string; expr: Node }
  | { kind: "convert"; expr: Node; unitId: string };
