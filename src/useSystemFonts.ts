import { useEffect, useState } from "react";

export interface FontInfo {
  name: string;
  monospace: boolean;
}

// Used outside Electron (e.g. `vite dev` in a plain browser tab), where
// there's no main-process bridge to query the OS's installed fonts.
const FALLBACK_FONTS: FontInfo[] = [
  { name: "ui-monospace", monospace: true },
  { name: "Menlo", monospace: true },
  { name: "Consolas", monospace: true },
  { name: "Courier New", monospace: true },
];

// Loaded once per app session via the Electron main process (font-list),
// since enumerating system fonts means shelling out (fc-list/PowerShell/etc).
export function useSystemFonts(): FontInfo[] {
  const [fonts, setFonts] = useState<FontInfo[]>(FALLBACK_FONTS);

  useEffect(() => {
    let cancelled = false;
    window.numinator
      ?.listFonts()
      .then((list) => {
        if (!cancelled && list.length > 0) setFonts(list);
      })
      .catch(() => {
        // keep the fallback list
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return fonts;
}
