export interface OpenedFile {
  path: string;
  content: string;
}

export type MenuAction = "open" | "save" | "saveAs";

export interface FontInfo {
  name: string;
  monospace: boolean;
}

export interface NuminatorFileApi {
  openFile: () => Promise<OpenedFile | null>;
  readFile: (path: string) => Promise<OpenedFile | null>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileAs: (content: string) => Promise<OpenedFile | null>;
  onMenuAction: (handler: (action: MenuAction) => void) => () => void;
  setTitle: (title: string) => void;
  listFonts: () => Promise<FontInfo[]>;
}

declare global {
  interface Window {
    numinator?: NuminatorFileApi;
  }
}
