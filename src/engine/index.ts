import { Parser, ParseError } from "./parser";
import type { Value } from "./evaluator";
import { evaluate, EvalError, blockWasUsed, setBlockSource } from "./evaluator";
import { findUnit } from "./units";
import type { FormatOptions, NumberFormat, DateFormat } from "./numberFormat";
import { DEFAULT_NUMBER_FORMAT, formatDate, formatNumber } from "./numberFormat";

export type { FormatOptions, NumberFormat, DateFormat };

export interface LineResult {
  input: string;
  output: string;
  error?: string;
}

export function formatValue(v: Value, format: FormatOptions = DEFAULT_NUMBER_FORMAT): string {
  if (v.isBoolean) return v.value ? "true" : "false";
  if (v.isString) return `"${v.stringValue}"`;

  if (v.isDate) return formatDate(v.epochMs!, format.date);

  const currency = v.unitId ? findUnit(v.unitId) : undefined;
  if (currency?.symbol && currency.money && !v.isPercent) {
    // money follows its own currency's convention, whatever the number settings say
    const { digits, ...separators } = currency.money;
    return `${currency.symbol} ${formatNumber(v.value, separators, digits, digits)}`;
  }

  const rounded = Math.round(v.value * 1e6) / 1e6;
  const text = formatNumber(rounded, format, 0, 6);
  if (v.isPercent) return `${text}%`;
  if (v.unitId) return `${text} ${v.unitId}`;
  return text;
}

export function runDocument(text: string, format: FormatOptions = DEFAULT_NUMBER_FORMAT): LineResult[] {
  const scope = new Map<string, Value>();
  const results: LineResult[] = [];
  let prev: Value | undefined;
  // numeric results since the last blank line / heading, for sum and average
  let block: Value[] = [];
  setBlockSource(() => block);

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) block = [];
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      results.push({ input: line, output: "" });
      continue;
    }

    if (prev) scope.set("prev", prev);

    try {
      const ast = Parser.parseLine(line, format);
      if (!ast) {
        results.push({ input: line, output: "" });
        continue;
      }
      setBlockSource(() => block);
      const value = evaluate(ast, scope);
      prev = value;
      const plain = !value.isDate && !value.isString && !value.isBoolean;
      if (plain && !blockWasUsed()) block.push(value);
      results.push({ input: line, output: formatValue(value, format) });
    } catch (err) {
      const message = err instanceof ParseError || err instanceof EvalError ? err.message : String(err);
      results.push({ input: line, output: "", error: message });
    }
  }

  setBlockSource(undefined);
  return results;
}
