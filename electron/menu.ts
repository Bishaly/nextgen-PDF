import { Menu, BrowserWindow, app, dialog } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const sendAction = (action: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu:action', action);
    }
  };

  const template: any[] = [
    {
      label: '&File',
      submenu: [
        {
          label: '&Open PDF...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendAction('open'),
        },
        {
          label: '&Save Modified PDF',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendAction('save'),
        },
        {
          label: 'Save &As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendAction('save-as'),
        },
        {
          label: '&Print...',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendAction('print'),
        },
        { type: 'separator' },
        {
          label: '&Close Document',
          accelerator: 'CmdOrCtrl+W',
          click: () => sendAction('close-doc'),
        },
        { type: 'separator' },
        {
          label: 'E&xit',
          accelerator: isMac ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        {
          label: '&Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendAction('undo'),
        },
        {
          label: '&Redo',
          accelerator: isMac ? 'Shift+Cmd+Z' : 'CmdOrCtrl+Y',
          click: () => sendAction('redo'),
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '&View',
      submenu: [
        {
          label: 'Zoom &In',
          accelerator: 'CmdOrCtrl+=',
          click: () => sendAction('zoom-in'),
        },
        {
          label: 'Zoom &Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => sendAction('zoom-out'),
        },
        {
          label: 'Fit &Width',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendAction('fit-width'),
        },
        {
          label: 'Fit &Page',
          accelerator: 'CmdOrCtrl+0',
          click: () => sendAction('fit-page'),
        },
        { type: 'separator' },
        {
          label: 'Rotate Clockwise (90°)',
          accelerator: 'CmdOrCtrl+R',
          click: () => sendAction('rotate-cw'),
        },
        {
          label: 'Rotate Counter-Clockwise (90°)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => sendAction('rotate-ccw'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: '&Tools',
      submenu: [
        {
          label: '&Merge Multiple PDFs...',
          click: () => sendAction('tool-merge'),
        },
        {
          label: '&Split or Extract Pages...',
          click: () => sendAction('tool-split'),
        },
        {
          label: '&Compress PDF Document...',
          click: () => sendAction('tool-compress'),
        },
        {
          label: '&Page Organizer & Reorder...',
          click: () => sendAction('tool-pages'),
        },
        { type: 'separator' },
        {
          label: '&OCR Text Scanner...',
          click: () => sendAction('tool-ocr'),
        },
        {
          label: 'Convert to &Word (.docx)...',
          click: () => sendAction('tool-word'),
        },
        {
          label: 'Convert to &Excel (.xlsx)...',
          click: () => sendAction('tool-excel'),
        },
      ],
    },
    {
      label: '&Help',
      submenu: [
        {
          label: '&Keyboard Shortcuts & Guide',
          accelerator: 'F1',
          click: () => sendAction('help'),
        },
        {
          label: 'Application &Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => sendAction('settings'),
        },
        { type: 'separator' },
        {
          label: '&About NextGen PDF Studio',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About NextGen PDF Studio',
              message: 'NextGen PDF Studio',
              detail:
                'Version: 1.0.0 (Enterprise Desktop Edition)\nPlatform: Windows 10 & Windows 11\n\nA full-featured, privacy-focused offline PDF reader, editor, document converter, and utility suite for Windows.\nAll PDF processing runs 100% locally on your machine.',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
