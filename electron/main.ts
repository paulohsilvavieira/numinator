import { app, BrowserWindow, dialog, ipcMain, Menu, type MenuItemConstructorOptions } from "electron";
import { getFonts2 } from "font-list";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { languageFromLocale, MESSAGES } from "../src/i18n/messages";
import type { Language, MessageKey } from "../src/i18n/messages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// Vite copies public/ verbatim into dist/, so the icon lives at the same
// relative path in both dev and the built app.
const ICON_PATH = path.join(__dirname, "../public/icon.png");

// until the renderer reports the user's choice, follow the OS language
let language: Language = languageFromLocale(app.getLocale());
const t = (key: MessageKey) => MESSAGES[language][key];

const fileFilters = () => [
  { name: t("documentsFilter"), extensions: ["numi", "txt"] },
  { name: t("allFilesFilter"), extensions: ["*"] },
];

function buildMenu(win: BrowserWindow) {
  const send = (action: "open" | "save" | "saveAs") => win.webContents.send("menu:action", action);

  const fileMenu: MenuItemConstructorOptions = {
    label: t("menuFile"),
    submenu: [
      { label: t("menuOpen"), accelerator: "CmdOrCtrl+O", click: () => send("open") },
      { label: t("menuSave"), accelerator: "CmdOrCtrl+S", click: () => send("save") },
      { label: t("menuSaveAs"), accelerator: "CmdOrCtrl+Shift+S", click: () => send("saveAs") },
      { type: "separator" },
      process.platform === "darwin" ? { role: "close", label: t("menuClose") } : { role: "quit", label: t("menuQuit") },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [{ role: "about", label: t("menuAbout") }, { type: "separator" }, { role: "quit", label: t("menuQuit") }],
          } as MenuItemConstructorOptions,
        ]
      : []),
    fileMenu,
    {
      label: t("menuEdit"),
      submenu: [
        { role: "undo", label: t("menuUndo") },
        { role: "redo", label: t("menuRedo") },
        { type: "separator" },
        { role: "cut", label: t("menuCut") },
        { role: "copy", label: t("menuCopy") },
        { role: "paste", label: t("menuPaste") },
        { role: "selectAll", label: t("menuSelectAll") },
      ],
    },
    {
      label: t("menuView"),
      submenu: [
        { role: "reload", label: t("menuReload") },
        { role: "toggleDevTools", label: t("menuDevTools") },
        { type: "separator" },
        { role: "resetZoom", label: t("menuResetZoom") },
        { role: "zoomIn", label: t("menuZoomIn") },
        { role: "zoomOut", label: t("menuZoomOut") },
        { type: "separator" },
        { role: "togglefullscreen", label: t("menuFullscreen") },
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
    filters: fileFilters(),
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
    filters: fileFilters(),
    defaultPath: `${t("untitled")}.numi`,
  });
  if (result.canceled || !result.filePath) return null;

  await fs.writeFile(result.filePath, content, "utf-8");
  return { path: result.filePath, content };
});

ipcMain.on("app:setLanguage", (event, value: string) => {
  const next = value in MESSAGES ? (value as Language) : "en";
  if (next === language) return;
  language = next;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) buildMenu(win);
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
