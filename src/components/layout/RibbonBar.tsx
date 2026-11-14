import React from 'react';
import {
  FileText,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCw,
  RotateCcw,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  MoveRight,
  Highlighter,
  Underline,
  Strikethrough,
  PenTool,
  MessageSquare,
  Feather,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Layers,
  Scissors,
  Minimize2,
  Lock,
  Unlock,
  Stamp,
  ScanText,
  LayoutGrid,
  Trash2,
  Download,
  Printer,
  ChevronDown,
  Palette,
  FolderOpen,
  Undo2,
  Redo2,
  FilePenLine,
  FileDown
} from 'lucide-react';
import { MainTab, ToolMode } from '../../types/pdf';

interface RibbonBarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  toolMode: ToolMode;
  onSelectToolMode: (mode: ToolMode) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFitWidth: () => void;
  onZoomFitPage: () => void;
  onRotateClockwise: () => void;
  onRotateCounterClockwise: () => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  onOpenFile: () => void;
  onDownload: () => void;
  onSaveAs?: () => void;
  onPrint: () => void;
  onOpenSignatureModal: () => void;
  onOpenWatermarkModal: () => void;
  onOpenMergeModal: () => void;
  onOpenSplitModal: () => void;
  onOpenCompressModal: () => void;
  onOpenProtectModal: () => void;
  onOpenBlankPageModal: () => void;
  onOpenConvertModal: (type: string) => void;
  onTriggerOcr: () => void;
  hasDocument: boolean;
  onClearAnnotations: () => void;
  onDeleteSelectedAnnotation?: () => void;
  hasSelectedAnnotation?: boolean;
  onAddImageClick?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
}

const COLOR_PALETTE = [
  '#ef4444', // Red
  '#f59e0b', // Amber / Orange
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#000000', // Black
  '#ffffff', // White
  '#eab308', // Yellow (classic highlighter)
];

export const RibbonBar: React.FC<RibbonBarProps> = ({
  activeTab,
  onSelectTab,
  toolMode,
  onSelectToolMode,
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFitWidth,
  onZoomFitPage,
  onRotateClockwise,
  onRotateCounterClockwise,
  selectedColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onOpenFile,
  onDownload,
  onSaveAs,
  onPrint,
  onOpenSignatureModal,
  onOpenWatermarkModal,
  onOpenMergeModal,
  onOpenSplitModal,
  onOpenCompressModal,
  onOpenProtectModal,
  onOpenBlankPageModal,
  onOpenConvertModal,
  onTriggerOcr,
  hasDocument,
  onClearAnnotations,
  onDeleteSelectedAnnotation,
  hasSelectedAnnotation,
  onAddImageClick,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
}) => {
  return (
    <div className="bg-[#f8f9fa] dark:bg-[#1b1b1e] border-b border-neutral-200 dark:border-neutral-800 shadow-2xs select-none shrink-0 z-20">
      {/* Tab Headers */}
      <div className="flex items-center px-3 border-b border-neutral-200 dark:border-neutral-800 gap-1 bg-white/70 dark:bg-[#18181b]/70 backdrop-blur-xs">
        {[
          { id: 'read', label: 'View & Read' },
          { id: 'edit', label: 'Edit & Annotate' },
          { id: 'convert', label: 'Convert' },
          { id: 'tools', label: 'PDF Tools' },
          { id: 'ocr', label: 'OCR Scanner' },
          { id: 'pages', label: 'Page Organizer' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as MainTab)}
              className={`px-3.5 py-1.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-neutral-100/60 dark:bg-neutral-800/60'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Toolbar */}
      <div className="h-16 px-3 flex items-center gap-4 overflow-x-auto text-xs py-1">
        {/* ================= READ TAB ================= */}
        {activeTab === 'read' && (
          <div className="flex items-center gap-3">
            {/* Group 1: Navigation */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={!hasDocument || currentPage <= 1}
                className="px-2 py-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors font-medium text-neutral-700 dark:text-neutral-300"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, totalPages)}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      onPageChange(val);
                    }
                  }}
                  disabled={!hasDocument}
                  className="w-12 h-7 px-1 text-center font-mono text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                />
                <span className="text-neutral-500 dark:text-neutral-400 font-mono text-xs">
                  / {totalPages || 1}
                </span>
              </div>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={!hasDocument || currentPage >= totalPages}
                className="px-2 py-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors font-medium text-neutral-700 dark:text-neutral-300"
              >
                Next
              </button>
            </div>

            {/* Group 2: Pointer / Hand Tools */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onSelectToolMode('select')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'select'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Select Tool"
              >
                <MousePointer className="w-4 h-4" />
                <span className="text-[10px]">Select</span>
              </button>
              <button
                onClick={() => onSelectToolMode('hand')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'hand'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Hand Tool (Pan)"
              >
                <Hand className="w-4 h-4" />
                <span className="text-[10px]">Hand</span>
              </button>
              <button
                onClick={() => onSelectToolMode('edit-text')}
                disabled={!hasDocument}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[56px] transition-colors ${
                  toolMode === 'edit-text'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                } disabled:opacity-40`}
                title="Edit Existing PDF Text (Select, Modify, Delete, Reflow)"
              >
                <FilePenLine className="w-4 h-4" />
                <span className="text-[10px] font-semibold">Edit Text</span>
              </button>
            </div>

            {/* Group 3: Zoom Controls */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={onZoomOut}
                disabled={!hasDocument || zoom <= 0.25}
                className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="w-14 text-center font-mono text-xs tabular-nums text-neutral-700 dark:text-neutral-300">
                {Math.round(zoom * 100)}%
              </span>

              <button
                onClick={onZoomIn}
                disabled={!hasDocument || zoom >= 4.0}
                className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={onZoomFitWidth}
                  disabled={!hasDocument}
                  className="px-2 py-1 rounded bg-neutral-200/80 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-[11px] font-medium"
                >
                  Fit Width
                </button>
                <button
                  onClick={onZoomFitPage}
                  disabled={!hasDocument}
                  className="px-2 py-1 rounded bg-neutral-200/80 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-[11px] font-medium"
                >
                  Fit Page
                </button>
              </div>
            </div>

            {/* Group 4: Rotation & Output */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onRotateCounterClockwise}
                disabled={!hasDocument}
                className="p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex flex-col items-center gap-0.5"
                title="Rotate Left 90°"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px]">Rotate L</span>
              </button>
              <button
                onClick={onRotateClockwise}
                disabled={!hasDocument}
                className="p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex flex-col items-center gap-0.5"
                title="Rotate Right 90°"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[10px]">Rotate R</span>
              </button>
              <button
                onClick={onPrint}
                disabled={!hasDocument}
                className="p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex flex-col items-center gap-0.5 ml-2"
                title="Print PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="text-[10px]">Print</span>
              </button>
              <button
                onClick={onDownload}
                disabled={!hasDocument}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs ml-1 disabled:opacity-40"
                title="Save Modified PDF (Ctrl+S)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              {onSaveAs && (
                <button
                  onClick={onSaveAs}
                  disabled={!hasDocument}
                  className="px-2.5 py-1.5 rounded bg-neutral-200/80 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-medium flex items-center gap-1 disabled:opacity-40"
                  title="Save As New PDF File (Ctrl+Shift+S)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Save As</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= EDIT TAB ================= */}
        {activeTab === 'edit' && (
          <div className="flex items-center gap-3">
            {/* Existing PDF Text Editor + Annotation Tools */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onSelectToolMode('edit-text')}
                disabled={!hasDocument}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[58px] transition-colors ${
                  toolMode === 'edit-text'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                } disabled:opacity-40`}
                title="Edit Existing PDF Text (Select, Modify, Delete, Add & Format)"
              >
                <FilePenLine className="w-4 h-4" />
                <span className="text-[10px] font-semibold">Edit Text</span>
              </button>

              <button
                onClick={() => onSelectToolMode('text')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[50px] transition-colors ${
                  toolMode === 'text'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Add Text Annotation Overlay"
              >
                <Type className="w-4 h-4" />
                <span className="text-[10px]">Add Note</span>
              </button>

              <button
                onClick={() => onSelectToolMode('highlight')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'highlight'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Highlight Area"
              >
                <Highlighter className="w-4 h-4" />
                <span className="text-[10px]">Highlight</span>
              </button>

              <button
                onClick={() => onSelectToolMode('underline')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'underline'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Underline"
              >
                <Underline className="w-4 h-4" />
                <span className="text-[10px]">Underline</span>
              </button>

              <button
                onClick={() => onSelectToolMode('strikethrough')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'strikethrough'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
                <span className="text-[10px]">Strike</span>
              </button>

              <button
                onClick={() => onSelectToolMode('draw')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'draw'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Freehand Pen"
              >
                <PenTool className="w-4 h-4" />
                <span className="text-[10px]">Draw</span>
              </button>
            </div>

            {/* Shapes Group */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onSelectToolMode('shape-rect')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'shape-rect'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Rectangle"
              >
                <Square className="w-4 h-4" />
                <span className="text-[10px]">Rect</span>
              </button>

              <button
                onClick={() => onSelectToolMode('shape-circle')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'shape-circle'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Circle / Ellipse"
              >
                <Circle className="w-4 h-4" />
                <span className="text-[10px]">Circle</span>
              </button>

              <button
                onClick={() => onSelectToolMode('shape-arrow')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'shape-arrow'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Arrow"
              >
                <MoveRight className="w-4 h-4" />
                <span className="text-[10px]">Arrow</span>
              </button>

              <button
                onClick={() => onSelectToolMode('shape-line')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[44px] transition-colors ${
                  toolMode === 'shape-line'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Line"
              >
                <Minus className="w-4 h-4" />
                <span className="text-[10px]">Line</span>
              </button>
            </div>

            {/* Note & Signature Group */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onSelectToolMode('comment')}
                className={`p-2 rounded flex flex-col items-center gap-0.5 min-w-[48px] transition-colors ${
                  toolMode === 'comment'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
                title="Add Sticky Comment"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px]">Note</span>
              </button>

              <button
                onClick={onOpenSignatureModal}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[54px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title="Insert Signature"
              >
                <Feather className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">Sign</span>
              </button>

              <button
                onClick={onAddImageClick}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[54px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title="Insert Image (PNG, JPG)"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Image</span>
              </button>
            </div>

            {/* Color Palette & Stroke */}
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Color:</span>
                <div className="flex items-center gap-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => onColorChange(color)}
                      className={`w-4 h-4 rounded-full border transition-transform ${
                        selectedColor === color
                          ? 'scale-125 border-neutral-900 dark:border-white ring-1 ring-blue-500'
                          : 'border-neutral-300 dark:border-neutral-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1 ml-2">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Width:</span>
                <select
                  value={strokeWidth}
                  onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                  className="h-6 px-1.5 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                >
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={4}>4px</option>
                  <option value={6}>6px</option>
                  <option value={8}>8px</option>
                </select>
              </div>
            </div>

            {/* Undo / Redo & Clear / Delete Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded flex flex-col items-center gap-0.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Undo</span>
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded flex flex-col items-center gap-0.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Redo</span>
              </button>

              <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700 mx-1" />

              {hasSelectedAnnotation && onDeleteSelectedAnnotation && (
                <button
                  onClick={onDeleteSelectedAnnotation}
                  className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex flex-col items-center gap-0.5"
                  title="Delete Selected Item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Delete</span>
                </button>
              )}

              <button
                onClick={onClearAnnotations}
                className="px-2.5 py-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-[11px]"
                title="Clear all annotations on current document"
              >
                Clear Page
              </button>
            </div>
          </div>
        )}

        {/* ================= CONVERT TAB ================= */}
        {activeTab === 'convert' && (
          <div className="flex items-center gap-3">
            {/* PDF To Images */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onOpenConvertModal('pdf-to-jpg')}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[56px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <FileImage className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px]">PDF → JPG</span>
              </button>

              <button
                onClick={() => onOpenConvertModal('pdf-to-png')}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[56px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <FileImage className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-[10px]">PDF → PNG</span>
              </button>
            </div>

            {/* PDF To Office & Text */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => onOpenConvertModal('pdf-to-word')}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[62px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px]">PDF → Word</span>
              </button>

              <button
                onClick={() => onOpenConvertModal('pdf-to-excel')}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[62px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-[10px]">PDF → Excel</span>
              </button>

              <button
                onClick={() => onOpenConvertModal('pdf-to-text')}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[58px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <FileCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px]">PDF → Text</span>
              </button>
            </div>

            {/* Creation From Images & Text */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenConvertModal('images-to-pdf')}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[68px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-[10px]">Images → PDF</span>
              </button>

              <button
                onClick={() => onOpenConvertModal('text-to-pdf')}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[64px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px]">Text → PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TOOLS TAB ================= */}
        {activeTab === 'tools' && (
          <div className="flex items-center gap-3">
            {/* Merge & Split */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={onOpenMergeModal}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[56px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px]">Merge PDF</span>
              </button>

              <button
                onClick={onOpenSplitModal}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[54px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-[10px]">Split PDF</span>
              </button>

              <button
                onClick={onOpenCompressModal}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[62px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <Minimize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px]">Compress</span>
              </button>
            </div>

            {/* Security & Watermark */}
            <div className="flex items-center gap-1 pr-3 border-r border-neutral-200 dark:border-neutral-700">
              <button
                onClick={onOpenWatermarkModal}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[62px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <Stamp className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-[10px]">Watermark</span>
              </button>

              <button
                onClick={onOpenProtectModal}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[58px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <Lock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="text-[10px]">Password</span>
              </button>
            </div>

            {/* Clean & Organize Utilities */}
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenBlankPageModal}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[76px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span className="text-[10px]">Trim Blanks</span>
              </button>

              <button
                onClick={() => onSelectTab('pages')}
                disabled={!hasDocument}
                className="p-2 rounded flex flex-col items-center gap-0.5 min-w-[68px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40"
              >
                <LayoutGrid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px]">Reorder Grid</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= OCR TAB ================= */}
        {activeTab === 'ocr' && (
          <div className="flex items-center gap-3">
            <button
              onClick={onTriggerOcr}
              disabled={!hasDocument}
              className="px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium flex items-center gap-2 shadow-xs disabled:opacity-40"
            >
              <ScanText className="w-4 h-4" />
              <span>Scan & Extract Text (OCR)</span>
            </button>

            <span className="text-neutral-500 dark:text-neutral-400 text-xs">
              Optical Character Recognition runs 100% locally in your browser using neural computer vision.
            </span>
          </div>
        )}

        {/* ================= PAGES TAB ================= */}
        {activeTab === 'pages' && (
          <div className="flex items-center gap-3">
            <span className="text-neutral-700 dark:text-neutral-300 text-xs font-medium">
              Page Organizer Mode Active:
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-xs">
              Reorder pages by dragging or using the buttons, rotate specific pages, or delete unneeded pages below.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
