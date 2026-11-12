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

export interface ElectronAPI {
  isElectron: boolean;
  getPlatform: () => Promise<string>;
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  
  dialog: {
    openPdf: () => Promise<ElectronFileResult | null>;
    savePdf: (data: Uint8Array, defaultName: string) => Promise<ElectronSaveResult>;
    exportFile: (data: Uint8Array | string, defaultName: string, mimeType?: string) => Promise<ElectronSaveResult>;
  };
  
  file: {
    readPdf: (filePath: string) => Promise<ElectronFileResult | null>;
    getInitialFile: () => Promise<ElectronFileResult | null>;
    onOpenFile: (callback: (file: ElectronFileResult) => void) => () => void;
  };
  
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
  
  menu: {
    onMenuAction: (callback: (action: string) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
