import React from 'react';
import { 
  Save, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Sun, 
  Moon, 
  FolderOpen, 
  FilePlus, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  Undo2,
  Redo2,
  Settings,
  Minus,
  Square,
  Copy,
  X,
  FileDown
} from 'lucide-react';
import { DocumentInfo } from '../../types/pdf';
import { desktopBridge } from '../../services/desktopBridge';

interface TitleBarProps {
  document: DocumentInfo | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAs?: () => void;
  onPrint: () => void;
  onOpenSample: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  hasUnsavedChanges: boolean;
  onOpenHelp: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  onOpenSettings: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  document,
  theme,
  onToggleTheme,
  onOpenFile,
  onSaveFile,
  onSaveAs,
  onPrint,
  onOpenSample,
  isFullscreen,
  onToggleFullscreen,
  hasUnsavedChanges,
  onOpenHelp,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onOpenSettings,
}) => {
  const [isMaximized, setIsMaximized] = React.useState(false);
  const isDesktop = desktopBridge.isElectron();

  React.useEffect(() => {
    if (isDesktop) {
      desktopBridge.window.isMaximized().then(setIsMaximized);
      const unsubscribe = desktopBridge.window.onMaximizeChange(setIsMaximized);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isDesktop]);

  return (
    <header 
      className="h-10 bg-white dark:bg-[#1f1f23] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-3 text-xs select-none z-30 shrink-0"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Zone 1: Brand & Quick Action Strip */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-2 mr-2">
          <img
            src="./assets/aistudio/ChatGPT_Image_Nov_14__2026__03_03_43_PM_22acb7f7.png"
            alt="NextGen PDF Studio"
            className="w-6 h-6 rounded-md object-contain shadow-xs shrink-0"
            draggable={false}
          />
          <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm tracking-tight whitespace-nowrap">
            NextGen PDF Studio
          </span>
        </div>

        {/* Quick Access Toolbar */}
        <div className="hidden sm:flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-700 pl-2">
          <button
            onClick={onOpenFile}
            title="Open Document (Ctrl+O)"
            className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={onOpenSample}
            title="Load Sample Document"
            className="flex items-center gap-1 px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors font-medium"
          >
            <Sparkles className="w-3 h-3" />
            <span className="text-[11px]">Sample PDF</span>
          </button>

          {document && (
            <>
              <button
                onClick={onSaveFile}
                title="Save Modified PDF (Ctrl+S)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors relative"
              >
                <Save className="w-3.5 h-3.5" />
                {hasUnsavedChanges && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                )}
              </button>
              {onSaveAs && (
                <button
                  onClick={onSaveAs}
                  title="Save As New PDF File (Ctrl+Shift+S)"
                  className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onPrint}
                title="Print Document (Ctrl+P)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              <div className="h-3.5 w-px bg-neutral-300 dark:bg-neutral-700 mx-0.5" />

              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 rounded transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 rounded transition-colors"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Document Name Display */}
      <div className="flex items-center gap-2 max-w-[40%] truncate">
        {document ? (
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-medium">
            <span className="truncate">{document.name}</span>
            {hasUnsavedChanges && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                (Unsaved)
              </span>
            )}
            <span className="text-neutral-400 dark:text-neutral-500 text-[11px] tabular-nums">
              · {document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}
            </span>
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
            No document open — Open or drag & drop a PDF
          </span>
        )}
      </div>

      {/* Zone 3: Window Controls & Theme Toggle */}
      <div className="flex items-center gap-1 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={onOpenSettings}
          title="Application Settings"
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenHelp}
          title="Keyboard Shortcuts & About"
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen (F11)' : 'Full Screen (F11)'}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Windows 10 & 11 Desktop Style Window Control Buttons */}
        {isDesktop ? (
          <div className="flex items-center ml-2 border-l border-neutral-200 dark:border-neutral-700 pl-1">
            <button
              onClick={() => desktopBridge.window.minimize()}
              title="Minimize"
              className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => desktopBridge.window.maximize()}
              title={isMaximized ? 'Restore Down' : 'Maximize'}
              className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              {isMaximized ? (
                <Copy className="w-3 h-3 rotate-180" />
              ) : (
                <Square className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => desktopBridge.window.close()}
              title="Close"
              className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-[#e81123] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center ml-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
            <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700 mr-1.5" />
            <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700 mr-1.5" />
            <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          </div>
        )}
      </div>
    </header>
  );
};
