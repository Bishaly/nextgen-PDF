# NextGen PDF Studio — Windows 10 & Windows 11 Desktop Distribution

## 1. Overview

**NextGen PDF Studio** is an enterprise-grade desktop PDF application designed for Windows 10 and Windows 11. Built with Electron and React 19, it delivers the speed and aesthetics of a modern Windows 11 Fluent desktop software while preserving user privacy by running 100% of PDF processing, vector rendering, editing, and neural OCR locally.

---

## 2. Desktop Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NextGen PDF Studio                              │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Main Process                              │   │
│   │                 (electron/main.ts)                             │   │
│   │  • Windows Taskbar Grouping (AppUserModelId)                   │   │
│   │  • Single Instance Lock & "Open With" / File Associations      │   │
│   │  • Native Windows File Dialogs (Open, Save, Export)            │   │
│   │  • Native Menu Bar & Accelerator Dispatch                      │   │
│   │  • Safe File System & Path Traversal Prevention                │   │
│   └───────────────────────────┬────────────────────────────────────┘   │
│                               │ IPC via Context Bridge                 │
│   ┌───────────────────────────┴────────────────────────────────────┐   │
│   │                     Preload Script                             │   │
│   │                 (electron/preload.ts)                          │   │
│   │  • contextIsolation: true                                      │   │
│   │  • nodeIntegration: false                                      │   │
│   │  • sandbox: true                                               │   │
│   │  • Type-safe window.electronAPI context exposure               │   │
│   └───────────────────────────┬────────────────────────────────────┘   │
│                               │ Safe API Interface                     │
│   ┌───────────────────────────┴────────────────────────────────────┐   │
│   │               Renderer (React 19 + TypeScript)                 │   │
│   │                 (src/services/desktopBridge.ts)                │   │
│   │  • Seamless dual-mode (Desktop Electron + Web browser)         │   │
│   │  • Local Vector Engine (PDF.js + pdf-lib)                      │   │
│   │  • Local Document Converters (DOCX + XLSX)                     │   │
│   │  • Neural OCR Engine (Tesseract.js)                            │   │
│   │  • Windows Fluent TitleBar with Minimize, Maximize, Close      │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Security Compliance

1. **Context Isolation**: Enabled (`contextIsolation: true`). The renderer process has zero access to Node.js primitives or Electron internals.
2. **Node Integration**: Disabled (`nodeIntegration: false`). Malicious content or scripts cannot execute shell commands.
3. **Sandbox**: Enabled (`sandbox: true`).
4. **Input Validation**: All paths passed to `dialog:savePdf`, `dialog:exportFile`, and `file:readPdf` are normalized, checked for existence, and restricted to valid document extensions (`.pdf`, `.docx`, `.xlsx`, `.txt`, `.jpg`, `.png`).
5. **Navigation Hardening**: `webContents.on('will-navigate')` and `setWindowOpenHandler` prevent internal navigation away from the application. All external links are routed strictly to the user's default external browser via `shell.openExternal`.

---

## 3. Windows Native Integrations

- **Windows File Associations (`.pdf`)**: Registered via Electron Builder. Double-clicking any `.pdf` file in Windows Explorer or choosing **"Open with NextGen PDF Studio"** opens the file directly in the app.
- **Single Instance Enforcement**: If a user opens a second PDF file from Windows Explorer while the app is already open, the existing instance is focused and the new document is loaded immediately without launching redundant background processes.
- **Native File Dialogs**:
  - `dialog:openPdf` provides the native Windows 10/11 Open File dialog with `.pdf` filtering.
  - `dialog:savePdf` provides the native Windows Save File dialog.
  - `dialog:exportFile` provides custom file filter dialogs for Word (`.docx`), Excel (`.xlsx`), Text (`.txt`), and Images (`.png`, `.jpg`).
- **Drag & Drop**: Dropping files anywhere on the application window automatically opens and loads them into memory.
- **Windows TitleBar**: Features native Windows 10/11 Fluent window controls (Minimize, Maximize / Restore, and Close with Windows red hover styling `#e81123`) and draggable title region.
- **Application Menu**: Fully populated Windows menu bar (*File*, *Edit*, *View*, *Tools*, *Help*) with standard Windows accelerators (`Ctrl+O`, `Ctrl+S`, `Ctrl+P`, `Ctrl+Z`, `Ctrl+Y`, `F11`, `Alt+F4`).

---

## 4. Offline & Privacy Architecture

- **100% Offline Core**:
  - PDF rendering, page viewing, text search, bookmarks, thumbnails: **Offline**
  - Text box annotation, font styling, signature embedding, freehand pen, shapes, markups: **Offline**
  - Merge, split, compress, extract, password lock/unlock, blank page removal: **Offline**
  - Conversion to Word (`.docx`), Excel (`.xlsx`), Text, and Images: **Offline**
  - Optical Character Recognition (Tesseract.js): **Offline**
- **Explicit Online Disclosures**:
  - The application includes an optional Cloud OCR webhook in **Settings → Optional Cloud Extension**. This is clearly labeled as requiring an active internet connection.
  - The app never transmits documents, telemetry, or analytics to remote servers without explicit configuration.

---

## 5. Build & Packaging Instructions

### Prerequisites
- Node.js (v18 or v20+ recommended)
- npm (v9+)
- On Windows: No additional tools needed.
- On Linux (for cross-compiling Windows NSIS installers): `nsis` package or Wine if building signed executables.

### Scripts in `package.json`

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the Vite development server on port 3000 |
| `npm run build` | Builds both the web renderer (`dist/`) and Electron scripts (`dist-electron/`) |
| `npm run build:electron` | Compiles `electron/main.ts` and `electron/preload.ts` via esbuild |
| `npm run electron:dev` | Compiles electron scripts and starts local Electron development window |
| `npm run pack:win` | Packages unpacked Windows x64 binary directory (`release/win-unpacked/`) |
| `npm run dist:win` | Generates full Windows x64 NSIS Installer (`release/NextGen PDF Studio-Setup-1.0.0-x64.exe`) |
| `npm run dist:win:portable` | Generates standalone portable executable (`release/NextGen PDF Studio-Portable-1.0.0-x64.exe`) |

---

## 6. Windows Installer Configuration Details

Configured inside `package.json` under the `"build"` block:

- **App ID**: `com.nextgen.pdfstudio`
- **Product Name**: `NextGen PDF Studio`
- **Version**: `1.0.0`
- **Target Architecture**: Windows x64 (`x64`)
- **NSIS Installer Features**:
  - Custom install directory selection.
  - Automatic Desktop shortcut creation.
  - Start Menu program folder registration.
  - File association with `.pdf` (sets NextGen PDF Studio as handler).
  - Clean uninstaller removing registry associations and program files.
- **Portable Version**:
  - Zero-install single `.exe` file.
  - Ideal for USB drives and restricted corporate environments without administrator privileges.
- **Icons**:
  - Multi-size Windows ICO (`build/icon.ico`) containing 256x256, 128x128, 64x64, 48x48, 32x32, 16x16 bitmaps.

---

## 7. Windows Testing Checklist

| Test Item | Expected Result |
| :--- | :--- |
| **Clean Install (NSIS)** | Installer runs smoothly, creates desktop and Start Menu shortcuts. |
| **File Association** | Double-clicking a `.pdf` file in Windows Explorer opens it in NextGen PDF Studio. |
| **Open With** | Right-clicking a `.pdf` file and selecting "Open with NextGen PDF Studio" loads the document. |
| **Secondary Instance** | Opening a second PDF file focuses the existing window and switches to the new document. |
| **Drag and Drop** | Dragging a `.pdf` file from Windows Explorer into the app opens the file. |
| **File Open Dialog** | Clicking "Open" launches the native Windows open file dialog filtered by `*.pdf`. |
| **File Save Dialog** | Clicking "Save" launches the native Windows save file dialog and writes the modified PDF. |
| **Document Export** | Converting to Word (`.docx`) or Excel (`.xlsx`) saves the output file via native save dialog. |
| **Offline Test** | Disconnecting network connection; verify reading, editing, OCR, and conversion still work. |
| **Window Controls** | Minimize, Maximize/Restore, and Close buttons function properly in the custom titlebar. |
| **Keyboard Accelerators** | `Ctrl+O`, `Ctrl+S`, `Ctrl+P`, `Ctrl+Z`, `Ctrl+Y`, `F11` respond correctly. |
| **Uninstallation** | Running uninstaller completely removes shortcuts and program files. |

---

## 8. Licensing & Notes

- **NextGen PDF Studio** is distributed as standalone software.
- End-users do **not** need to install Node.js, Python, or external runtime libraries; the packaged Windows executable bundles the Electron runtime and all required dependencies.
