import { useEffect, useState } from "react";

export interface Settings {
  fontFamily: string;
  fontSize: number;
}

export const FONT_OPTIONS = [
  { label: "SF Mono", value: '"SF Mono", ui-monospace, Menlo, Consolas, monospace' },
  { label: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace' },
  { label: "Fira Code", value: '"Fira Code", ui-monospace, Menlo, Consolas, monospace' },
  { label: "Menlo", value: "Menlo, Consolas, monospace" },
  { label: "Consolas", value: "Consolas, Menlo, monospace" },
  { label: "System Monospace", value: "ui-monospace, monospace" },
];

const DEFAULT_SETTINGS: Settings = {
  fontFamily: FONT_OPTIONS[0].value,
  fontSize: 15,
};

const STORAGE_KEY = "numinator.settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore write failures (e.g. private browsing)
    }
  }, [settings]);

  return { settings, setSettings };
}
