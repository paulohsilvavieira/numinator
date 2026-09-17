import { useMemo } from "react";
import { runDocument } from "./engine";
import { useSettings } from "./useSettings";
import { useFileDocument } from "./useFileDocument";
import { useSyncedScroll } from "./useSyncedScroll";
import Toolbar from "./components/Toolbar";
import Editor from "./components/Editor";
import ResultsPanel from "./components/ResultsPanel";
import SettingsMenu from "./components/SettingsMenu";
import "./App.css";

function App() {
  const { text, setText, fileName, isDirty, canUseFiles } = useFileDocument();
  const { settings, setSettings } = useSettings();
  const { textareaRef, highlightRef, resultsRef, syncScroll } = useSyncedScroll();

  const results = useMemo(() => runDocument(text), [text]);

  return (
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
  );
}

export default App;
