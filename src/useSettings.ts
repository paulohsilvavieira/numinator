import { useEffect, useState } from "react";

import type { DateFormat, NumberFormat } from "./engine";

export interface Settings extends NumberFormat {
  date: DateFormat;
  fontFamily: string;
  fontSize: number;
}

const DEFAULT_SETTINGS: Settings = {
  fontFamily: "ui-monospace",
  fontSize: 15,
  decimal: ".",
  thousands: ",",
  date: "system",
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
