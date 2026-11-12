var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var electronAPI = {
  isElectron: true,
  getPlatform: () => import_electron.ipcRenderer.invoke("app:getPlatform"),
  getVersion: () => import_electron.ipcRenderer.invoke("app:getVersion"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("app:openExternal", url),
  dialog: {
    openPdf: () => import_electron.ipcRenderer.invoke("dialog:openPdf"),
    savePdf: (data, defaultName) => import_electron.ipcRenderer.invoke("dialog:savePdf", data, defaultName),
    exportFile: (data, defaultName, mimeType) => import_electron.ipcRenderer.invoke("dialog:exportFile", data, defaultName, mimeType)
  },
  file: {
    readPdf: (filePath) => import_electron.ipcRenderer.invoke("file:readPdf", filePath),
    getInitialFile: () => import_electron.ipcRenderer.invoke("file:getInitialFile"),
    onOpenFile: (callback) => {
      const handler = (_event, file) => callback(file);
      import_electron.ipcRenderer.on("file:opened", handler);
      return () => {
        import_electron.ipcRenderer.removeListener("file:opened", handler);
      };
    }
  },
  window: {
    minimize: () => import_electron.ipcRenderer.send("window:minimize"),
    maximize: () => import_electron.ipcRenderer.send("window:maximize"),
    close: () => import_electron.ipcRenderer.send("window:close"),
    isMaximized: () => import_electron.ipcRenderer.invoke("window:isMaximized"),
    onMaximizeChange: (callback) => {
      const handler = (_event, isMax) => callback(isMax);
      import_electron.ipcRenderer.on("window:maximize-change", handler);
      return () => {
        import_electron.ipcRenderer.removeListener("window:maximize-change", handler);
      };
    }
  },
  menu: {
    onMenuAction: (callback) => {
      const handler = (_event, action) => callback(action);
      import_electron.ipcRenderer.on("menu:action", handler);
      return () => {
        import_electron.ipcRenderer.removeListener("menu:action", handler);
      };
    }
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.cjs.map
