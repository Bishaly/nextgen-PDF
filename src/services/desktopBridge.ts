import { pdfEditorService } from './pdfEditorService';
import { ElectronFileResult } from '../types/electron';

export const desktopBridge = {
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  },

  async getPlatform(): Promise<string> {
    if (this.isElectron() && window.electronAPI) {
      return await window.electronAPI.getPlatform();
    }
    return 'web';
  },

  async getVersion(): Promise<string> {
    if (this.isElectron() && window.electronAPI) {
      return await window.electronAPI.getVersion();
    }
    return '1.0.0-web';
  },

  // Open PDF via Native Windows Dialog in Electron, or trigger fallback in Web
  async openPdf(): Promise<ElectronFileResult | null> {
    if (this.isElectron() && window.electronAPI) {
      try {
        return await window.electronAPI.dialog.openPdf();
      } catch (err) {
        console.error('Electron open dialog failed', err);
        return null;
      }
    }
    return null;
  },

  async openPdfs(): Promise<ElectronFileResult[]> {
    if (this.isElectron() && window.electronAPI) {
      try {
        if (window.electronAPI.dialog.openPdfs) {
          return await window.electronAPI.dialog.openPdfs();
        }
        const single = await window.electronAPI.dialog.openPdf();
        return single ? [single] : [];
      } catch (err) {
        console.error('Electron multi-open dialog failed', err);
        return [];
      }
    }
    return [];
  },

  // Save PDF via Native Windows Save Dialog in Electron, or download in Web
  async savePdf(data: Uint8Array, defaultName: string): Promise<boolean> {
    if (this.isElectron() && window.electronAPI) {
      try {
        const result = await window.electronAPI.dialog.savePdf(data, defaultName);
        return result.success;
      } catch (err) {
        console.error('Electron save dialog failed', err);
        // Fallback to browser download
        pdfEditorService.downloadBytes(data, defaultName);
        return true;
      }
    } else {
      pdfEditorService.downloadBytes(data, defaultName);
      return true;
    }
  },

  // Export non-PDF files (DOCX, XLSX, TXT, images) to native disk
  async exportFile(data: Uint8Array | string, defaultName: string, mimeType?: string): Promise<boolean> {
    if (this.isElectron() && window.electronAPI) {
      try {
        const result = await window.electronAPI.dialog.exportFile(data, defaultName, mimeType);
        return result.success;
      } catch (err) {
        console.error('Electron export dialog failed', err);
        this.fallbackWebDownload(data, defaultName, mimeType);
        return true;
      }
    } else {
      this.fallbackWebDownload(data, defaultName, mimeType);
      return true;
    }
  },

  fallbackWebDownload(data: Uint8Array | string, defaultName: string, mimeType = 'application/octet-stream') {
    const blob = typeof data === 'string'
      ? new Blob([data], { type: mimeType })
      : new Blob([data as any], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // Check for initial file opened with NextGen PDF Studio
  async getInitialFile(): Promise<ElectronFileResult | null> {
    if (this.isElectron() && window.electronAPI) {
      try {
        return await window.electronAPI.file.getInitialFile();
      } catch (err) {
        console.error('Failed to get initial file', err);
      }
    }
    return null;
  },

  // Subscribe to files opened via Windows Open With or secondary instance
  onOpenFile(callback: (file: ElectronFileResult) => void): (() => void) | undefined {
    if (this.isElectron() && window.electronAPI) {
      return window.electronAPI.file.onOpenFile(callback);
    }
    return undefined;
  },

  // Subscribe to native Windows application menu events
  onMenuAction(callback: (action: string) => void): (() => void) | undefined {
    if (this.isElectron() && window.electronAPI) {
      return window.electronAPI.menu.onMenuAction(callback);
    }
    return undefined;
  },

  // Window frame controls
  window: {
    minimize() {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.window.minimize();
      }
    },
    maximize() {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.window.maximize();
      }
    },
    close() {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.window.close();
      }
    },
    async isMaximized(): Promise<boolean> {
      if (typeof window !== 'undefined' && window.electronAPI) {
        return await window.electronAPI.window.isMaximized();
      }
      return false;
    },
    onMaximizeChange(callback: (isMax: boolean) => void): (() => void) | undefined {
      if (typeof window !== 'undefined' && window.electronAPI) {
        return window.electronAPI.window.onMaximizeChange(callback);
      }
      return undefined;
    },
  },
};
