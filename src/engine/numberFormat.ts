export interface NumberFormat {
  decimal: "." | ",";
  /** "" means no grouping */
  thousands: "," | "." | " " | "";
}

/** "system" uses the OS locale with a short month name ("Oct 30, 2026") */
export type DateFormat = "system" | "dmy" | "mdy" | "ymd";

export interface FormatOptions extends NumberFormat {
  date?: DateFormat;
}

export const DEFAULT_NUMBER_FORMAT: NumberFormat = { decimal: ".", thousands: "," };

// Reads "1,234.56", "1.234,56", "1,5" or "11000,00". With both separators the
// last one is the decimal mark. A lone separator is the decimal mark, except
// when it is the configured thousands mark (or repeated) and the digits are
// grouped by three, as in "1.000" with decimal "," - so "1,5" and "1.5" stay
// equivalent while "1.000" still means one thousand in a "," locale.
export function parseNumber(text: string, format: NumberFormat = DEFAULT_NUMBER_FORMAT): number {
  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  let decimalAt = -1;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalAt = Math.max(lastDot, lastComma);
  } else {
    const sep = lastDot >= 0 ? "." : lastComma >= 0 ? "," : "";
    if (sep) {
      const parts = text.split(sep);
      const grouped = parts.slice(1).every((p) => p.length === 3) && parts[0].length >= 1 && parts[0].length <= 3;
      const isThousands = parts.length > 2 || (sep !== format.decimal && grouped);
      if (!isThousands) decimalAt = text.indexOf(sep);
    }
  }

  if (decimalAt < 0) return parseFloat(text.replace(/[.,]/g, ""));
  const int = text.slice(0, decimalAt).replace(/[.,]/g, "");
  const frac = text.slice(decimalAt + 1).replace(/[.,]/g, "");
  return parseFloat(`${int || "0"}.${frac}`);
}

export function formatNumber(value: number, format: NumberFormat, minFraction: number, maxFraction: number): string {
  const text = value.toLocaleString("en-US", { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction });
  return text.replace(/[.,]/g, (c) => (c === "," ? format.thousands : format.decimal));
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDate(epochMs: number, format: DateFormat = "system"): string {
  const d = new Date(epochMs);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;

  if (format === "system") {
    return hasTime
      ? d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = String(d.getFullYear());
  const text = format === "dmy" ? `${day}/${month}/${year}` : format === "mdy" ? `${month}/${day}/${year}` : `${year}-${month}-${day}`;
  return hasTime ? `${text} ${pad(d.getHours())}:${pad(d.getMinutes())}` : text;
}
