import { useEffect, useMemo } from "react";
import { runDocument } from "./engine";
import { useSettings } from "./useSettings";
import { useFileDocument } from "./useFileDocument";
import { useSyncedScroll } from "./useSyncedScroll";
import Toolbar from "./components/Toolbar";
import Editor from "./components/Editor";
import ResultsPanel from "./components/ResultsPanel";
import SettingsMenu from "./components/SettingsMenu";
import I18nProvider from "./i18n/I18nProvider";
import { makeTranslate, resolveLanguage } from "./i18n/translate";
import "./App.css";

function App() {
  const { settings, setSettings } = useSettings();
  const language = resolveLanguage(settings.language);
  const { text, setText, fileName, isDirty, canUseFiles } = useFileDocument(makeTranslate(language)("untitled"));
  const { textareaRef, highlightRef, resultsRef, syncScroll } = useSyncedScroll();

  // the native menu and dialogs live in the main process, so tell it too
  useEffect(() => {
    document.documentElement.lang = language;
    window.numinator?.setLanguage(language);
  }, [language]);

  const results = useMemo(
    () => runDocument(text, { decimal: settings.decimal, thousands: settings.thousands, date: settings.date }),
    [text, settings.decimal, settings.thousands, settings.date],
  );

  return (
    <I18nProvider language={language}>
    <div
      className="numi"
      style={
        {
          "--numi-font-family": `"${settings.fontFamily}", ui-monospace, monospace`,
          "--numi-font-size": `${settings.fontSize}px`,
        } as React.CSSProperties
      }
    >
      {canUseFiles && <Toolbar fileName={fileName} isDirty={isDirty} />}

      <div className="numi-body">
        <Editor text={text} onChange={setText} textareaRef={textareaRef} highlightRef={highlightRef} onScroll={syncScroll} />
        <ResultsPanel results={results} resultsRef={resultsRef} />
      </div>

      <SettingsMenu settings={settings} onChange={setSettings} />
    </div>
    </I18nProvider>
  );
}

export default App;
