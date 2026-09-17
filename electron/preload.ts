import { contextBridge, ipcRenderer } from "electron";

export interface OpenedFile {
  path: string;
  content: string;
}

export type MenuAction = "open" | "save" | "saveAs";

contextBridge.exposeInMainWorld("numinator", {
  openFile: (): Promise<OpenedFile | null> => ipcRenderer.invoke("file:open"),
  readFile: (path: string): Promise<OpenedFile | null> => ipcRenderer.invoke("file:read", path),
  saveFile: (path: string, content: string): Promise<void> => ipcRenderer.invoke("file:save", path, content),
  saveFileAs: (content: string): Promise<OpenedFile | null> => ipcRenderer.invoke("file:saveAs", content),
  onMenuAction: (handler: (action: MenuAction) => void) => {
    const listener = (_event: unknown, action: MenuAction) => handler(action);
    ipcRenderer.on("menu:action", listener);
    return () => ipcRenderer.removeListener("menu:action", listener);
  },
  setTitle: (title: string) => ipcRenderer.send("window:setTitle", title),
});
