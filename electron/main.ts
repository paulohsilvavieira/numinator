import { app, BrowserWindow, dialog, ipcMain, Menu, type MenuItemConstructorOptions } from "electron";
import { getFonts2 } from "font-list";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Vite copies public/ verbatim into dist/, so the icon lives at the same
// relative path in both dev and the built app.
const ICON_PATH = path.join(__dirname, "../public/icon.png");

const FILE_FILTERS = [
  { name: "Numinator documents", extensions: ["numi", "txt"] },
  { name: "All files", extensions: ["*"] },
];

function buildMenu(win: BrowserWindow) {
  const send = (action: "open" | "save" | "saveAs") => win.webContents.send("menu:action", action);

  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [
      { label: "Open...", accelerator: "CmdOrCtrl+O", click: () => send("open") },
      { label: "Save", accelerator: "CmdOrCtrl+S", click: () => send("save") },
      { label: "Save As...", accelerator: "CmdOrCtrl+Shift+S", click: () => send("saveAs") },
      { type: "separator" },
      process.platform === "darwin" ? { role: "close" } : { role: "quit" },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin"
      ? [{ label: app.name, submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] } as MenuItemConstructorOptions]
      : []),
    fileMenu,
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 480,
    minHeight: 360,
    backgroundColor: "#1e1e24",
    icon: ICON_PATH,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  buildMenu(win);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: FILE_FILTERS,
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf-8");
  return { path: filePath, content };
});

ipcMain.handle("file:read", async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { path: filePath, content };
  } catch {
    return null;
  }
});

ipcMain.handle("file:save", async (_event, filePath: string, content: string) => {
  await fs.writeFile(filePath, content, "utf-8");
});

ipcMain.handle("file:saveAs", async (_event, content: string) => {
  const result = await dialog.showSaveDialog({
    filters: FILE_FILTERS,
    defaultPath: "Untitled.numi",
  });
  if (result.canceled || !result.filePath) return null;

  await fs.writeFile(result.filePath, content, "utf-8");
  return { path: result.filePath, content };
});

ipcMain.on("window:setTitle", (event, title: string) => {
  BrowserWindow.fromWebContents(event.sender)?.setTitle(title);
});

let cachedFonts: { name: string; monospace: boolean }[] | undefined;

ipcMain.handle("fonts:list", async () => {
  if (cachedFonts) return cachedFonts;

  const fonts = await getFonts2({ disableQuoting: true });
  const byName = new Map<string, boolean>();
  for (const f of fonts) {
    // a family can list multiple weights/styles; treat it as monospace if any variant is
    byName.set(f.familyName, byName.get(f.familyName) || f.monospace);
  }

  cachedFonts = [...byName.entries()].map(([name, monospace]) => ({ name, monospace }));
  return cachedFonts;
});

app.whenReady().then(() => {
  // BrowserWindow's `icon` option doesn't reach the Dock while running
  // unpackaged on macOS, so it's set explicitly here.
  if (process.platform === "darwin") app.dock?.setIcon(ICON_PATH);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
