import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { createApplicationMenu } from './menu';

// Set Application User Model ID for Windows 10/11 taskbar & notification grouping
app.setAppUserModelId('com.nextgen.pdfstudio');

let mainWindow: BrowserWindow | null = null;
let initialPdfPath: string | null = null;

// Helper to sanitize and check safe file paths
function isValidFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  // Normalize and check
  const normalized = path.normalize(filePath);
  return fs.existsSync(normalized);
}

function parseCommandLineFile(argv: string[]): string | null {
  // On Windows, when opened with "Open with", the file path is passed as an argument
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && !arg.startsWith('--') && !arg.startsWith('-') && !arg.includes('electron')) {
      const normalized = path.normalize(arg);
      if (fs.existsSync(normalized) && normalized.toLowerCase().endsWith('.pdf')) {
        return normalized;
      }
    }
  }
  return null;
}

// Single instance enforcement
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Check if a PDF file was passed in the second instance command line
      const openedPath = parseCommandLineFile(commandLine);
      if (openedPath) {
        try {
          const stats = fs.statSync(openedPath);
          const data = fs.readFileSync(openedPath);
          mainWindow.webContents.send('file:opened', {
            name: path.basename(openedPath),
            path: openedPath,
            data: new Uint8Array(data),
            size: stats.size,
          });
        } catch (err) {
          console.error('Failed to open second-instance PDF', err);
        }
      }
    }
  });
}

// Check initial process arguments
initialPdfPath = parseCommandLineFile(process.argv);

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'NextGen PDF Studio',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: '#18181b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Attach native application menu
  const menu = createApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Window state change notifications for custom UI
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximize-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximize-change', false);
  });

  // Security: prevent opening external links in the app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (
      !url.startsWith('file:') &&
      !url.includes('localhost') &&
      !url.includes('127.0.0.1')
    ) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Determine whether to load dev server or built production assets
  const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register secure IPC Handlers
function setupIpcHandlers() {
  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  // Windows window controls
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // Initial file passed via Windows "Open With" or command line
  ipcMain.handle('file:getInitialFile', async () => {
    if (initialPdfPath && isValidFilePath(initialPdfPath)) {
      try {
        const stats = await fs.promises.stat(initialPdfPath);
        const data = await fs.promises.readFile(initialPdfPath);
        const result = {
          name: path.basename(initialPdfPath),
          path: initialPdfPath,
          data: new Uint8Array(data),
          size: stats.size,
        };
        // Clear once consumed so reloads don't re-trigger
        initialPdfPath = null;
        return result;
      } catch (err) {
        console.error('Failed reading initial PDF file', err);
      }
    }
    return null;
  });

  // Open Single PDF via Native Windows Dialog
  ipcMain.handle('dialog:openPdf', async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open PDF Document — NextGen PDF Studio',
      properties: ['openFile'],
      filters: [
        { name: 'PDF Documents (*.pdf)', extensions: ['pdf'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    if (!isValidFilePath(selectedPath)) {
      throw new Error('Invalid file path selected');
    }

    const stats = await fs.promises.stat(selectedPath);
    const data = await fs.promises.readFile(selectedPath);

    return {
      name: path.basename(selectedPath),
      path: selectedPath,
      data: new Uint8Array(data),
      size: stats.size,
    };
  });

  // Open Multiple PDFs via Native Windows Dialog
  ipcMain.handle('dialog:openPdfs', async () => {
    if (!mainWindow) return [];

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open PDF Documents — NextGen PDF Studio',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'PDF Documents (*.pdf)', extensions: ['pdf'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    const files = [];
    for (const selectedPath of result.filePaths) {
      if (!isValidFilePath(selectedPath)) continue;
      const stats = await fs.promises.stat(selectedPath);
      const data = await fs.promises.readFile(selectedPath);
      files.push({
        name: path.basename(selectedPath),
        path: selectedPath,
        data: new Uint8Array(data),
        size: stats.size,
      });
    }
    return files;
  });

  // Save PDF to Local Disk
  ipcMain.handle('dialog:savePdf', async (_event, data: Uint8Array, defaultName: string) => {
    if (!mainWindow) return { success: false, error: 'Window not available' };

    const cleanDefault = defaultName ? path.basename(defaultName) : 'Untitled.pdf';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF Document — NextGen PDF Studio',
      defaultPath: cleanDefault,
      filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    try {
      await fs.promises.writeFile(result.filePath, Buffer.from(data));
      return { success: true, filePath: result.filePath };
    } catch (err: any) {
      console.error('Failed to write PDF file', err);
      return { success: false, error: err.message };
    }
  });

  // Export any file format (DOCX, XLSX, TXT, JPG, PNG)
  ipcMain.handle(
    'dialog:exportFile',
    async (_event, data: Uint8Array | string, defaultName: string) => {
      if (!mainWindow) return { success: false, error: 'Window not available' };

      const cleanDefault = defaultName ? path.basename(defaultName) : 'Exported_Document';
      const ext = path.extname(cleanDefault).replace('.', '').toLowerCase();

      const filters: any[] = [];
      if (ext === 'docx') {
        filters.push({ name: 'Word Document (*.docx)', extensions: ['docx'] });
      } else if (ext === 'xlsx') {
        filters.push({ name: 'Excel Spreadsheet (*.xlsx)', extensions: ['xlsx'] });
      } else if (ext === 'txt') {
        filters.push({ name: 'Text Document (*.txt)', extensions: ['txt'] });
      } else if (ext === 'jpg' || ext === 'jpeg') {
        filters.push({ name: 'JPEG Image (*.jpg)', extensions: ['jpg', 'jpeg'] });
      } else if (ext === 'png') {
        filters.push({ name: 'PNG Image (*.png)', extensions: ['png'] });
      } else {
        filters.push({ name: 'All Files (*.*)', extensions: ['*'] });
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: `Export ${ext.toUpperCase()} Document — NextGen PDF Studio`,
        defaultPath: cleanDefault,
        filters,
      });

      if (result.canceled || !result.filePath) {
        return { success: false };
      }

      try {
        const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
        await fs.promises.writeFile(result.filePath, buffer);
        return { success: true, filePath: result.filePath };
      } catch (err: any) {
        console.error('Export failed', err);
        return { success: false, error: err.message };
      }
    }
  );

  // Read arbitrary PDF file from disk
  ipcMain.handle('file:readPdf', async (_event, filePath: string) => {
    if (!isValidFilePath(filePath)) {
      return null;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      const data = await fs.promises.readFile(filePath);
      return {
        name: path.basename(filePath),
        path: filePath,
        data: new Uint8Array(data),
        size: stats.size,
      };
    } catch (err) {
      console.error('Failed reading file', err);
      return null;
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
