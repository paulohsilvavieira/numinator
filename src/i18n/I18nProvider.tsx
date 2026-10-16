import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Language } from "./messages";
import { I18nContext, makeTranslate } from "./translate";

function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const t = useMemo(() => makeTranslate(language), [language]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

export default I18nProvider;
