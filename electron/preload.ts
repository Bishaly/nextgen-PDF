import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface ElectronFileResult {
  name: string;
  path: string;
  data: Uint8Array;
  size: number;
}

export interface ElectronSaveResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

const electronAPI = {
  isElectron: true,

  getPlatform: (): Promise<string> => ipcRenderer.invoke('app:getPlatform'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('app:openExternal', url),

  dialog: {
    openPdf: (): Promise<ElectronFileResult | null> => ipcRenderer.invoke('dialog:openPdf'),
    openPdfs: (): Promise<ElectronFileResult[]> => ipcRenderer.invoke('dialog:openPdfs'),
    savePdf: (data: Uint8Array, defaultName: string): Promise<ElectronSaveResult> =>
      ipcRenderer.invoke('dialog:savePdf', data, defaultName),
    exportFile: (data: Uint8Array | string, defaultName: string, mimeType?: string): Promise<ElectronSaveResult> =>
      ipcRenderer.invoke('dialog:exportFile', data, defaultName, mimeType),
  },

  file: {
    readPdf: (filePath: string): Promise<ElectronFileResult | null> =>
      ipcRenderer.invoke('file:readPdf', filePath),
    getInitialFile: (): Promise<ElectronFileResult | null> =>
      ipcRenderer.invoke('file:getInitialFile'),
    onOpenFile: (callback: (file: ElectronFileResult) => void) => {
      const handler = (_event: IpcRendererEvent, file: ElectronFileResult) => callback(file);
      ipcRenderer.on('file:opened', handler);
      return () => {
        ipcRenderer.removeListener('file:opened', handler);
      };
    },
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: IpcRendererEvent, isMax: boolean) => callback(isMax);
      ipcRenderer.on('window:maximize-change', handler);
      return () => {
        ipcRenderer.removeListener('window:maximize-change', handler);
      };
    },
  },

  menu: {
    onMenuAction: (callback: (action: string) => void) => {
      const handler = (_event: IpcRendererEvent, action: string) => callback(action);
      ipcRenderer.on('menu:action', handler);
      return () => {
        ipcRenderer.removeListener('menu:action', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
