import type { CompareOp, Node } from "./ast";
import type { UnitDef } from "./units";
import { convert, customUnit, findUnit } from "./units";

export interface Value {
  value: number;
  unitId?: string;
  isPercent?: boolean;
  isDate?: boolean;
  epochMs?: number;
  isString?: boolean;
  stringValue?: string;
  isBoolean?: boolean;
}

export class EvalError extends Error {}

function unitOf(unitId: string | undefined): UnitDef | undefined {
  return unitId ? (findUnit(unitId) ?? customUnit(unitId)) : undefined;
}

function toFraction(v: Value): number {
  return v.isPercent ? v.value / 100 : v.value;
}

// currencies show their symbol (R$) instead of the internal id (BRL)
function unitLabel(u: UnitDef): string {
  return u.symbol ?? u.id;
}

function categoryLabel(u: UnitDef): string {
  return u.category.split(":")[0];
}

function sameCategoryOrThrow(a: UnitDef, b: UnitDef) {
  if (a.category !== b.category) {
    throw new EvalError(`Cannot combine "${unitLabel(a)}" (${categoryLabel(a)}) with "${unitLabel(b)}" (${categoryLabel(b)})`);
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const BUILTIN_DATES: Record<string, () => Value> = {
  today: () => ({ value: 0, isDate: true, epochMs: startOfDay(new Date()) }),
  now: () => ({ value: 0, isDate: true, epochMs: Date.now() }),
  tomorrow: () => ({ value: 0, isDate: true, epochMs: startOfDay(new Date(Date.now() + 86_400_000)) }),
  yesterday: () => ({ value: 0, isDate: true, epochMs: startOfDay(new Date(Date.now() - 86_400_000)) }),
};

// month/year vary in length, so they're applied as calendar steps rather
// than a fixed millisecond offset (otherwise "+ 1 year" could land at a
// different time of day when it crosses a leap year).
function applyDurationToDate(epochMs: number, duration: Value, sign: 1 | -1): number {
  const unit = unitOf(duration.unitId);
  if (!unit || unit.category !== "time") {
    throw new EvalError("Expected a duration (e.g. 2 days) next to a date");
  }
  const amount = duration.value * sign;

  if (unit.id === "year" || unit.id === "month") {
    const d = new Date(epochMs);
    if (unit.id === "year") d.setFullYear(d.getFullYear() + amount);
    else d.setMonth(d.getMonth() + amount);
    return d.getTime();
  }

  return epochMs + amount * unit.ratio * 1000;
}

function evaluateDateBinary(op: "+" | "-", left: Value, right: Value): Value {
  if (left.isDate && right.isDate) {
    if (op === "+") throw new EvalError("Cannot add two dates together");
    return { value: (left.epochMs! - right.epochMs!) / 86_400_000, unitId: "day" };
  }
  if (left.isDate) {
    return { value: 0, isDate: true, epochMs: applyDurationToDate(left.epochMs!, right, op === "+" ? 1 : -1) };
  }
  // right.isDate
  if (op === "-") throw new EvalError("Cannot subtract a date from a duration");
  return { value: 0, isDate: true, epochMs: applyDurationToDate(right.epochMs!, left, 1) };
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new EvalError("fact needs a non-negative whole number");
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// functions that return a quantity of the same kind keep the unit; the rest are plain numbers
const UNIT_KEEPING: Record<string, (x: number) => number> = {
  abs: Math.abs,
  round: Math.round,
  ceil: Math.ceil,
  floor: Math.floor,
};

const PLAIN_FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  fact: factorial,
};

function callFunction(name: string, arg: Value): Value {
  if (arg.isDate || arg.isString || arg.isBoolean) throw new EvalError(`${name}() needs a number`);
  const keep = UNIT_KEEPING[name];
  if (keep) return { ...arg, value: keep(arg.value) };
  return { value: PLAIN_FUNCTIONS[name](toFraction(arg)) };
}

// The lines of the current block (up to the previous blank line or # heading),
// supplied by runDocument so "sum" and "average" can see them.
let blockSource: (() => Value[]) | undefined;
let usedBlock = false;

export function setBlockSource(source: (() => Value[]) | undefined) {
  blockSource = source;
  usedBlock = false;
}

export function blockWasUsed(): boolean {
  return usedBlock;
}

const AGGREGATES = new Set(["sum", "total", "average", "avg"]);

function aggregate(name: string): Value {
  const values = blockSource?.() ?? [];
  if (values.length === 0) throw new EvalError(`Nothing to ${name} above`);
  usedBlock = true;
  const total = values.reduce((acc, v) => evaluateBinary("+", acc, v));
  return name === "average" || name === "avg" ? evaluateBinary("/", total, { value: values.length }) : total;
}

export function evaluate(node: Node, scope: Map<string, Value>): Value {
  switch (node.kind) {
    case "number":
      return { value: node.value };

    case "string":
      return { value: 0, isString: true, stringValue: node.value };

    case "percent": {
      const v = evaluate(node.expr, scope);
      return { value: v.value, isPercent: true };
    }

    case "unit": {
      const v = evaluate(node.expr, scope);
      return { value: v.value, unitId: node.unitId };
    }

    case "unary": {
      const v = evaluate(node.expr, scope);
      if (v.isDate) throw new EvalError("Cannot negate a date");
      if (v.isString) throw new EvalError("Cannot negate a string");
      return { ...v, value: -v.value };
    }

    case "ident": {
      const lower = node.name.toLowerCase();
      const builtin = BUILTIN_DATES[lower];
      if (builtin) return builtin();
      const existing = scope.get(lower);
      if (!existing && AGGREGATES.has(lower)) return aggregate(lower);
      if (!existing && lower in CONSTANTS) return { value: CONSTANTS[lower] };
      if (!existing) {
        throw new EvalError(`Unknown variable "${node.name}"`);
      }
      return existing;
    }

    case "assign": {
      const v = evaluate(node.expr, scope);
      scope.set(node.name.toLowerCase(), v);
      return v;
    }

    case "convert": {
      const v = evaluate(node.expr, scope);
      if (v.isDate) throw new EvalError("Cannot convert a date");
      const from = unitOf(v.unitId);
      const to = unitOf(node.unitId);
      if (!from || !to) {
        throw new EvalError(`Cannot convert a unitless value to "${node.unitId}"`);
      }
      sameCategoryOrThrow(from, to);
      return { value: convert(v.value, from, to), unitId: to.id };
    }

    case "binary":
      return evaluateBinary(node.op, evaluate(node.left, scope), evaluate(node.right, scope));

    case "call":
      return callFunction(node.name, evaluate(node.arg, scope));

    case "percentChange": {
      const percent = evaluate(node.percent, scope);
      const base = evaluate(node.base, scope);
      const delta = base.value * (percent.value / 100);
      return { ...base, value: node.op === "on" ? base.value + delta : base.value - delta };
    }

    case "asPercent": {
      const part = evaluate(node.part, scope);
      const whole = evaluate(node.whole, scope);
      return { value: (numericRatio(part, whole)) * 100, isPercent: true };
    }

    case "whatBase": {
      const part = evaluate(node.part, scope);
      const percent = evaluate(node.percent, scope);
      return { ...part, value: part.value / (percent.value / 100) };
    }

    case "compare":
      return evaluateCompare(node.op, evaluate(node.left, scope), evaluate(node.right, scope));
  }
}

// part / whole, converting when both carry units of the same category
function numericRatio(part: Value, whole: Value): number {
  const partUnit = unitOf(part.unitId);
  const wholeUnit = unitOf(whole.unitId);
  if (partUnit && wholeUnit) {
    sameCategoryOrThrow(partUnit, wholeUnit);
    return part.value / convert(whole.value, wholeUnit, partUnit);
  }
  return part.value / whole.value;
}

function toComparableNumber(v: Value): number {
  return v.isPercent ? v.value / 100 : v.value;
}

// same-category units get converted before comparing; anything else falls
// back to raw numeric value (e.g. comparing a plain number against a duration)
function numericDelta(left: Value, right: Value): number {
  if (left.isDate && right.isDate) return left.epochMs! - right.epochMs!;

  const leftUnit = unitOf(left.unitId);
  const rightUnit = unitOf(right.unitId);
  if (leftUnit && rightUnit && leftUnit.category === rightUnit.category) {
    return left.value - convert(right.value, rightUnit, leftUnit);
  }
  return toComparableNumber(left) - toComparableNumber(right);
}

function numericEquals(left: Value, right: Value): boolean {
  if (left.isDate || right.isDate) {
    return !!left.isDate && !!right.isDate && left.epochMs === right.epochMs;
  }
  return numericDelta(left, right) === 0;
}

// loose ("==") coerces strings/numbers to text for comparison, like "1" == 1;
// strict ("===") requires both sides to be the same kind of value.
function valuesEqual(left: Value, right: Value, strict: boolean): boolean {
  if (left.isString || right.isString) {
    if (strict) {
      return !!left.isString && !!right.isString && left.stringValue === right.stringValue;
    }
    const leftText = left.isString ? left.stringValue! : String(toComparableNumber(left));
    const rightText = right.isString ? right.stringValue! : String(toComparableNumber(right));
    return leftText === rightText;
  }
  return numericEquals(left, right);
}

function evaluateCompare(op: CompareOp, left: Value, right: Value): Value {
  let result: boolean;
  switch (op) {
    case "=":
    case "==":
      result = valuesEqual(left, right, false);
      break;
    case "===":
      result = valuesEqual(left, right, true);
      break;
    case "!=":
      result = !valuesEqual(left, right, false);
      break;
    case "!==":
      result = !valuesEqual(left, right, true);
      break;
    case "<":
      result = numericDelta(left, right) < 0;
      break;
    case "<=":
      result = numericDelta(left, right) <= 0;
      break;
    case ">":
      result = numericDelta(left, right) > 0;
      break;
    case ">=":
      result = numericDelta(left, right) >= 0;
      break;
  }
  return { value: result ? 1 : 0, isBoolean: true };
}

function evaluateBinary(op: "+" | "-" | "*" | "/" | "^" | "mod", left: Value, right: Value): Value {
  if ((op === "+" || op === "-") && (left.isDate || right.isDate)) {
    return evaluateDateBinary(op, left, right);
  }

  if (op === "+" || op === "-") {
    if (right.isPercent && !left.isPercent) {
      const delta = left.value * (right.value / 100);
      return { value: op === "+" ? left.value + delta : left.value - delta, unitId: left.unitId };
    }
    if (left.isPercent && !right.isPercent) {
      const delta = right.value * (left.value / 100);
      return { value: op === "+" ? right.value + delta : delta - right.value, unitId: right.unitId };
    }
    if (left.isPercent && right.isPercent) {
      return { value: op === "+" ? left.value + right.value : left.value - right.value, isPercent: true };
    }

    const leftUnit = unitOf(left.unitId);
    const rightUnit = unitOf(right.unitId);
    let rightValue = right.value;
    let unitId = left.unitId ?? right.unitId;
    if (leftUnit && rightUnit) {
      sameCategoryOrThrow(leftUnit, rightUnit);
      rightValue = convert(right.value, rightUnit, leftUnit);
      unitId = leftUnit.id;
    }
    return { value: op === "+" ? left.value + rightValue : left.value - rightValue, unitId };
  }

  if (op === "*" || op === "/") {
    const leftUnit = unitOf(left.unitId);
    const rightUnit = unitOf(right.unitId);
    if (leftUnit && rightUnit && op === "/") {
      // like the other operators, the result keeps the left unit: R$50 / R$2 = R$25
      sameCategoryOrThrow(leftUnit, rightUnit);
      return { value: left.value / convert(right.value, rightUnit, leftUnit), unitId: leftUnit.id };
    }
    if (leftUnit && rightUnit) {
      // no compound units: the right side is converted to the left unit, the
      // values are multiplied and the result keeps the left unit (R$5 * R$2 = R$10)
      sameCategoryOrThrow(leftUnit, rightUnit);
      return { value: left.value * convert(right.value, rightUnit, leftUnit), unitId: leftUnit.id };
    }
    const l = toFraction(left);
    const r = toFraction(right);
    const value = op === "*" ? l * r : l / r;
    const unitId = leftUnit ? leftUnit.id : rightUnit?.id;
    return { value, unitId };
  }

  if (op === "^") {
    return { value: Math.pow(toFraction(left), toFraction(right)), unitId: left.unitId };
  }

  return { value: toFraction(left) % toFraction(right), unitId: left.unitId };
}
