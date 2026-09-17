// Unit catalogue: every unit belongs to a category and converts to a
// per-category base unit through a single multiplicative ratio.
// value_in_base = value * ratio
export interface UnitDef {
  id: string;
  category: string;
  ratio: number;
  aliases: string[];
}

const catalogue: UnitDef[] = [
  // length (base: meter)
  { id: "m", category: "length", ratio: 1, aliases: ["m", "meter", "meters", "metre", "metres"] },
  { id: "km", category: "length", ratio: 1000, aliases: ["km", "kilometer", "kilometers", "kilometre", "kilometres"] },
  { id: "cm", category: "length", ratio: 0.01, aliases: ["cm", "centimeter", "centimeters"] },
  { id: "mm", category: "length", ratio: 0.001, aliases: ["mm", "millimeter", "millimeters"] },
  { id: "mi", category: "length", ratio: 1609.344, aliases: ["mi", "mile", "miles"] },
  { id: "yd", category: "length", ratio: 0.9144, aliases: ["yd", "yard", "yards"] },
  { id: "ft", category: "length", ratio: 0.3048, aliases: ["ft", "foot", "feet"] },
  { id: "in", category: "length", ratio: 0.0254, aliases: ["in", "inch", "inches"] },

  // mass (base: gram)
  { id: "g", category: "mass", ratio: 1, aliases: ["g", "gram", "grams", "gramme", "grammes"] },
  { id: "kg", category: "mass", ratio: 1000, aliases: ["kg", "kilogram", "kilograms", "kilo", "kilos"] },
  { id: "mg", category: "mass", ratio: 0.001, aliases: ["mg", "milligram", "milligrams"] },
  { id: "lb", category: "mass", ratio: 453.59237, aliases: ["lb", "lbs", "pound", "pounds"] },
  { id: "oz", category: "mass", ratio: 28.349523125, aliases: ["oz", "ounce", "ounces"] },
  { id: "t", category: "mass", ratio: 1_000_000, aliases: ["t", "ton", "tons", "tonne", "tonnes"] },

  // time (base: second)
  { id: "s", category: "time", ratio: 1, aliases: ["s", "sec", "secs", "second", "seconds"] },
  { id: "min", category: "time", ratio: 60, aliases: ["min", "mins", "minute", "minutes"] },
  { id: "h", category: "time", ratio: 3600, aliases: ["h", "hr", "hrs", "hour", "hours"] },
  { id: "day", category: "time", ratio: 86400, aliases: ["day", "days"] },
  { id: "week", category: "time", ratio: 604800, aliases: ["week", "weeks"] },
  { id: "month", category: "time", ratio: 2629800, aliases: ["month", "months", "mo", "mos"] },
  { id: "year", category: "time", ratio: 31557600, aliases: ["year", "years", "yr", "yrs"] },

  // digital data (base: byte)
  { id: "b", category: "data", ratio: 1, aliases: ["b", "byte", "bytes"] },
  { id: "kb", category: "data", ratio: 1000, aliases: ["kb", "kilobyte", "kilobytes"] },
  { id: "mb", category: "data", ratio: 1_000_000, aliases: ["mb", "megabyte", "megabytes"] },
  { id: "gb", category: "data", ratio: 1_000_000_000, aliases: ["gb", "gigabyte", "gigabytes"] },
  { id: "tb", category: "data", ratio: 1_000_000_000_000, aliases: ["tb", "terabyte", "terabytes"] },
  { id: "kib", category: "data", ratio: 1024, aliases: ["kib", "kibibyte", "kibibytes"] },
  { id: "mib", category: "data", ratio: 1024 ** 2, aliases: ["mib", "mebibyte", "mebibytes"] },
  { id: "gib", category: "data", ratio: 1024 ** 3, aliases: ["gib", "gibibyte", "gibibytes"] },
];

const aliasToUnit = new Map<string, UnitDef>();
for (const u of catalogue) {
  for (const alias of u.aliases) {
    aliasToUnit.set(alias.toLowerCase(), u);
  }
}

export function findUnit(word: string): UnitDef | undefined {
  return aliasToUnit.get(word.toLowerCase());
}

export function convert(value: number, from: UnitDef, to: UnitDef): number {
  if (from.category !== to.category) {
    throw new Error(`Cannot convert ${from.category} to ${to.category}`);
  }
  return (value * from.ratio) / to.ratio;
}
