var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron2 = require("electron");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);

// electron/menu.ts
var import_electron = require("electron");
function createApplicationMenu(mainWindow2) {
  const isMac = process.platform === "darwin";
  const sendAction = (action) => {
    if (!mainWindow2.isDestroyed()) {
      mainWindow2.webContents.send("menu:action", action);
    }
  };
  const template = [
    {
      label: "&File",
      submenu: [
        {
          label: "&Open PDF...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendAction("open")
        },
        {
          label: "&Save Modified PDF",
          accelerator: "CmdOrCtrl+S",
          click: () => sendAction("save")
        },
        {
          label: "Save &As...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => sendAction("save-as")
        },
        {
          label: "&Print...",
          accelerator: "CmdOrCtrl+P",
          click: () => sendAction("print")
        },
        { type: "separator" },
        {
          label: "&Close Document",
          accelerator: "CmdOrCtrl+W",
          click: () => sendAction("close-doc")
        },
        { type: "separator" },
        {
          label: "E&xit",
          accelerator: isMac ? "Cmd+Q" : "Alt+F4",
          click: () => import_electron.app.quit()
        }
      ]
    },
    {
      label: "&Edit",
      submenu: [
        {
          label: "&Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => sendAction("undo")
        },
        {
          label: "&Redo",
          accelerator: isMac ? "Shift+Cmd+Z" : "CmdOrCtrl+Y",
          click: () => sendAction("redo")
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "&View",
      submenu: [
        {
          label: "Zoom &In",
          accelerator: "CmdOrCtrl+=",
          click: () => sendAction("zoom-in")
        },
        {
          label: "Zoom &Out",
          accelerator: "CmdOrCtrl+-",
          click: () => sendAction("zoom-out")
        },
        {
          label: "Fit &Width",
          accelerator: "CmdOrCtrl+1",
          click: () => sendAction("fit-width")
        },
        {
          label: "Fit &Page",
          accelerator: "CmdOrCtrl+0",
          click: () => sendAction("fit-page")
        },
        { type: "separator" },
        {
          label: "Rotate Clockwise (90\xB0)",
          accelerator: "CmdOrCtrl+R",
          click: () => sendAction("rotate-cw")
        },
        {
          label: "Rotate Counter-Clockwise (90\xB0)",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => sendAction("rotate-ccw")
        },
        { type: "separator" },
        { role: "togglefullscreen" },
        {
          label: "Toggle Developer Tools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => mainWindow2.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: "&Tools",
      submenu: [
        {
          label: "&Merge Multiple PDFs...",
          click: () => sendAction("tool-merge")
        },
        {
          label: "&Split or Extract Pages...",
          click: () => sendAction("tool-split")
        },
        {
          label: "&Compress PDF Document...",
          click: () => sendAction("tool-compress")
        },
        {
          label: "&Page Organizer & Reorder...",
          click: () => sendAction("tool-pages")
        },
        { type: "separator" },
        {
          label: "&OCR Text Scanner...",
          click: () => sendAction("tool-ocr")
        },
        {
          label: "Convert to &Word (.docx)...",
          click: () => sendAction("tool-word")
        },
        {
          label: "Convert to &Excel (.xlsx)...",
          click: () => sendAction("tool-excel")
        }
      ]
    },
    {
      label: "&Help",
      submenu: [
        {
          label: "&Keyboard Shortcuts & Guide",
          accelerator: "F1",
          click: () => sendAction("help")
        },
        {
          label: "Application &Settings...",
          accelerator: "CmdOrCtrl+,",
          click: () => sendAction("settings")
        },
        { type: "separator" },
        {
          label: "&About NextGen PDF Studio",
          click: () => {
            import_electron.dialog.showMessageBox(mainWindow2, {
              type: "info",
              title: "About NextGen PDF Studio",
              message: "NextGen PDF Studio",
              detail: "Version: 1.0.0 (Enterprise Desktop Edition)\nPlatform: Windows 10 & Windows 11\n\nA full-featured, privacy-focused offline PDF reader, editor, document converter, and utility suite for Windows.\nAll PDF processing runs 100% locally on your machine.",
              buttons: ["OK"]
            });
          }
        }
      ]
    }
  ];
  return import_electron.Menu.buildFromTemplate(template);
}

// electron/main.ts
import_electron2.app.setAppUserModelId("com.nextgen.pdfstudio");
var mainWindow = null;
var initialPdfPath = null;
function isValidFilePath(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const normalized = import_path.default.normalize(filePath);
  return import_fs.default.existsSync(normalized);
}
function parseCommandLineFile(argv) {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith("--") && !arg.startsWith("-") && !arg.includes("electron")) {
      const normalized = import_path.default.normalize(arg);
      if (import_fs.default.existsSync(normalized) && normalized.toLowerCase().endsWith(".pdf")) {
        return normalized;
      }
    }
  }
  return null;
}
var gotTheLock = import_electron2.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron2.app.quit();
} else {
  import_electron2.app.on("second-instance", (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const openedPath = parseCommandLineFile(commandLine);
      if (openedPath) {
        try {
          const stats = import_fs.default.statSync(openedPath);
          const data = import_fs.default.readFileSync(openedPath);
          mainWindow.webContents.send("file:opened", {
            name: import_path.default.basename(openedPath),
            path: openedPath,
            data: new Uint8Array(data),
            size: stats.size
          });
        } catch (err) {
          console.error("Failed to open second-instance PDF", err);
        }
      }
    }
  });
}
initialPdfPath = parseCommandLineFile(process.argv);
function createWindow() {
  const iconPath = process.platform === "win32" ? import_path.default.join(__dirname, "../build/icon.ico") : import_path.default.join(__dirname, "../build/icon.png");
  mainWindow = new import_electron2.BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "NextGen PDF Studio",
    icon: import_fs.default.existsSync(iconPath) ? iconPath : void 0,
    show: false,
    backgroundColor: "#18181b",
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  const menu = createApplicationMenu(mainWindow);
  import_electron2.Menu.setApplicationMenu(menu);
  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximize-change", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximize-change", false);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      import_electron2.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file:") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      event.preventDefault();
      import_electron2.shell.openExternal(url);
    }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(import_path.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function setupIpcHandlers() {
  import_electron2.ipcMain.handle("app:getPlatform", () => process.platform);
  import_electron2.ipcMain.handle("app:getVersion", () => import_electron2.app.getVersion());
  import_electron2.ipcMain.handle("app:openExternal", async (_event, url) => {
    if (typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
      await import_electron2.shell.openExternal(url);
      return true;
    }
    return false;
  });
  import_electron2.ipcMain.on("window:minimize", () => {
    mainWindow?.minimize();
  });
  import_electron2.ipcMain.on("window:maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  import_electron2.ipcMain.on("window:close", () => {
    mainWindow?.close();
  });
  import_electron2.ipcMain.handle("window:isMaximized", () => {
    return mainWindow?.isMaximized() ?? false;
  });
  import_electron2.ipcMain.handle("file:getInitialFile", async () => {
    if (initialPdfPath && isValidFilePath(initialPdfPath)) {
      try {
        const stats = await import_fs.default.promises.stat(initialPdfPath);
        const data = await import_fs.default.promises.readFile(initialPdfPath);
        const result = {
          name: import_path.default.basename(initialPdfPath),
          path: initialPdfPath,
          data: new Uint8Array(data),
          size: stats.size
        };
        initialPdfPath = null;
        return result;
      } catch (err) {
        console.error("Failed reading initial PDF file", err);
      }
    }
    return null;
  });
  import_electron2.ipcMain.handle("dialog:openPdf", async () => {
    if (!mainWindow) return null;
    const result = await import_electron2.dialog.showOpenDialog(mainWindow, {
      title: "Open PDF Document \u2014 NextGen PDF Studio",
      properties: ["openFile"],
      filters: [
        { name: "PDF Documents (*.pdf)", extensions: ["pdf"] },
        { name: "All Files (*.*)", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selectedPath = result.filePaths[0];
    if (!isValidFilePath(selectedPath)) {
      throw new Error("Invalid file path selected");
    }
    const stats = await import_fs.default.promises.stat(selectedPath);
    const data = await import_fs.default.promises.readFile(selectedPath);
    return {
      name: import_path.default.basename(selectedPath),
      path: selectedPath,
      data: new Uint8Array(data),
      size: stats.size
    };
  });
  import_electron2.ipcMain.handle("dialog:openPdfs", async () => {
    if (!mainWindow) return [];
    const result = await import_electron2.dialog.showOpenDialog(mainWindow, {
      title: "Open PDF Documents \u2014 NextGen PDF Studio",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "PDF Documents (*.pdf)", extensions: ["pdf"] },
        { name: "All Files (*.*)", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    const files = [];
    for (const selectedPath of result.filePaths) {
      if (!isValidFilePath(selectedPath)) continue;
      const stats = await import_fs.default.promises.stat(selectedPath);
      const data = await import_fs.default.promises.readFile(selectedPath);
      files.push({
        name: import_path.default.basename(selectedPath),
        path: selectedPath,
        data: new Uint8Array(data),
        size: stats.size
      });
    }
    return files;
  });
  import_electron2.ipcMain.handle("dialog:savePdf", async (_event, data, defaultName) => {
    if (!mainWindow) return { success: false, error: "Window not available" };
    const cleanDefault = defaultName ? import_path.default.basename(defaultName) : "Untitled.pdf";
    const result = await import_electron2.dialog.showSaveDialog(mainWindow, {
      title: "Save PDF Document \u2014 NextGen PDF Studio",
      defaultPath: cleanDefault,
      filters: [{ name: "PDF Document (*.pdf)", extensions: ["pdf"] }]
    });
    if (result.canceled || !result.filePath) {
      return { success: false };
    }
    try {
      await import_fs.default.promises.writeFile(result.filePath, Buffer.from(data));
      return { success: true, filePath: result.filePath };
    } catch (err) {
      console.error("Failed to write PDF file", err);
      return { success: false, error: err.message };
    }
  });
  import_electron2.ipcMain.handle(
    "dialog:exportFile",
    async (_event, data, defaultName) => {
      if (!mainWindow) return { success: false, error: "Window not available" };
      const cleanDefault = defaultName ? import_path.default.basename(defaultName) : "Exported_Document";
      const ext = import_path.default.extname(cleanDefault).replace(".", "").toLowerCase();
      const filters = [];
      if (ext === "docx") {
        filters.push({ name: "Word Document (*.docx)", extensions: ["docx"] });
      } else if (ext === "xlsx") {
        filters.push({ name: "Excel Spreadsheet (*.xlsx)", extensions: ["xlsx"] });
      } else if (ext === "txt") {
        filters.push({ name: "Text Document (*.txt)", extensions: ["txt"] });
      } else if (ext === "jpg" || ext === "jpeg") {
        filters.push({ name: "JPEG Image (*.jpg)", extensions: ["jpg", "jpeg"] });
      } else if (ext === "png") {
        filters.push({ name: "PNG Image (*.png)", extensions: ["png"] });
      } else {
        filters.push({ name: "All Files (*.*)", extensions: ["*"] });
      }
      const result = await import_electron2.dialog.showSaveDialog(mainWindow, {
        title: `Export ${ext.toUpperCase()} Document \u2014 NextGen PDF Studio`,
        defaultPath: cleanDefault,
        filters
      });
      if (result.canceled || !result.filePath) {
        return { success: false };
      }
      try {
        const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
        await import_fs.default.promises.writeFile(result.filePath, buffer);
        return { success: true, filePath: result.filePath };
      } catch (err) {
        console.error("Export failed", err);
        return { success: false, error: err.message };
      }
    }
  );
  import_electron2.ipcMain.handle("file:readPdf", async (_event, filePath) => {
    if (!isValidFilePath(filePath)) {
      return null;
    }
    try {
      const stats = await import_fs.default.promises.stat(filePath);
      const data = await import_fs.default.promises.readFile(filePath);
      return {
        name: import_path.default.basename(filePath),
        path: filePath,
        data: new Uint8Array(data),
        size: stats.size
      };
    } catch (err) {
      console.error("Failed reading file", err);
      return null;
    }
  });
}
import_electron2.app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
//# sourceMappingURL=main.cjs.map
