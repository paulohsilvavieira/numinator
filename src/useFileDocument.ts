import { useCallback, useEffect, useRef, useState } from 'react';

const TEXT_KEY = 'numinator.document';
const PATH_KEY = 'numinator.lastFilePath';

const DEFAULT_TEXT = ``;

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore write failures (e.g. private browsing)
  }
}

// Documents live on disk (via Electron's file dialogs/fs) when running as
// a desktop app; localStorage is only a scratch buffer + a pointer back to
// the last opened file, so relaunching the app reopens where you left off.
export function useFileDocument() {
  const [text, setText] = useState(() => readLocal(TEXT_KEY) ?? DEFAULT_TEXT);
  const [filePath, setFilePath] = useState<string | null>(() =>
    readLocal(PATH_KEY),
  );
  const [savedText, setSavedText] = useState(text);
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (hasReloaded.current) return;
    hasReloaded.current = true;
    if (!filePath || !window.numinator) return;
    window.numinator.readFile(filePath).then((result) => {
      if (result) {
        setText(result.content);
        setSavedText(result.content);
      }
    });
  }, [filePath]);

  useEffect(() => writeLocal(TEXT_KEY, text), [text]);
  useEffect(() => writeLocal(PATH_KEY, filePath), [filePath]);

  const openFile = useCallback(async () => {
    if (!window.numinator) return;
    const result = await window.numinator.openFile();
    if (!result) return;
    setText(result.content);
    setSavedText(result.content);
    setFilePath(result.path);
  }, []);

  const saveFileAs = useCallback(async () => {
    if (!window.numinator) return;
    const result = await window.numinator.saveFileAs(text);
    if (!result) return;
    setFilePath(result.path);
    setSavedText(result.content);
  }, [text]);

  const saveFile = useCallback(async () => {
    if (!window.numinator) return;
    if (!filePath) {
      await saveFileAs();
      return;
    }
    await window.numinator.saveFile(filePath, text);
    setSavedText(text);
  }, [filePath, text, saveFileAs]);

  useEffect(() => {
    if (!window.numinator) return;
    return window.numinator.onMenuAction((action) => {
      if (action === 'open') openFile();
      else if (action === 'save') saveFile();
      else if (action === 'saveAs') saveFileAs();
    });
  }, [openFile, saveFile, saveFileAs]);

  const fileName = filePath
    ? (filePath.split(/[\\/]/).pop() ?? filePath)
    : null;
  const isDirty = text !== savedText;
  const canUseFiles = typeof window !== 'undefined' && !!window.numinator;

  useEffect(() => {
    if (!window.numinator) return;
    const base = fileName ? `${fileName}${isDirty ? ' •' : ''}` : 'Untitled';
    window.numinator.setTitle(`${base} — Numinator`);
  }, [fileName, isDirty]);

  return {
    text,
    setText,
    fileName,
    filePath,
    isDirty,
    canUseFiles,
    openFile,
    saveFile,
    saveFileAs,
  };
}
