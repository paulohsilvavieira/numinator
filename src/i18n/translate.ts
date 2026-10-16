import { createContext, useContext } from "react";
import { languageFromLocale, MESSAGES } from "./messages";
import type { Language, MessageKey } from "./messages";

/** "system" follows the OS/browser language */
export type LanguageSetting = "system" | Language;

export type Translate = (key: MessageKey) => string;

export function resolveLanguage(setting: LanguageSetting): Language {
  if (setting !== "system") return setting;
  return languageFromLocale(typeof navigator !== "undefined" ? navigator.language : undefined);
}

export function makeTranslate(language: Language): Translate {
  return (key) => MESSAGES[language][key];
}

export const I18nContext = createContext<Translate>(makeTranslate("en"));

export function useT(): Translate {
  return useContext(I18nContext);
}
