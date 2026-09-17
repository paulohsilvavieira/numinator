import { Parser, ParseError } from "./parser";
import type { Value } from "./evaluator";
import { evaluate, EvalError } from "./evaluator";

export interface LineResult {
  input: string;
  output: string;
  error?: string;
}

export function formatValue(v: Value): string {
  if (v.isBoolean) return v.value ? "true" : "false";
  if (v.isString) return `"${v.stringValue}"`;

  if (v.isDate) {
    const d = new Date(v.epochMs!);
    const isMidnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
    return isMidnight
      ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const rounded = Math.round(v.value * 1e6) / 1e6;
  const text = rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
  if (v.isPercent) return `${text}%`;
  if (v.unitId) return `${text} ${v.unitId}`;
  return text;
}

export function runDocument(text: string): LineResult[] {
  const scope = new Map<string, Value>();
  const results: LineResult[] = [];
  let prev: Value | undefined;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      results.push({ input: line, output: "" });
      continue;
    }

    if (prev) scope.set("prev", prev);

    try {
      const ast = Parser.parseLine(line);
      if (!ast) {
        results.push({ input: line, output: "" });
        continue;
      }
      const value = evaluate(ast, scope);
      prev = value;
      results.push({ input: line, output: formatValue(value) });
    } catch (err) {
      const message = err instanceof ParseError || err instanceof EvalError ? err.message : String(err);
      results.push({ input: line, output: "", error: message });
    }
  }

  return results;
}
