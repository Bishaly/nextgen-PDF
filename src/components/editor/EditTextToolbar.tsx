import React from 'react';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Check,
  Save,
  FileDown,
  AlertTriangle,
  Info,
  ScanText,
  Lock,
  Sparkles,
  Minus,
} from 'lucide-react';
import {
  EditableFontFamily,
  EditableTextBlock,
  PageEditDiagnostics,
  TextAlignment,
} from '../../types/pdf';

interface EditTextToolbarProps {
  selectedBlock: EditableTextBlock | null;
  defaultStyle: {
    fontFamily: EditableFontFamily;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
    color: string;
    align: TextAlignment;
  };
  onUpdateStyle: (patch: {
    fontFamily?: EditableFontFamily;
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    color?: string;
    align?: TextAlignment;
  }) => void;
  onAddNewTextBox: () => void;
  onDeleteSelectedBlock: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  pendingEditCount: number;
  isCommitting: boolean;
  onCommitEdits: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  diagnostics: PageEditDiagnostics | null;
  isAnalyzing: boolean;
  onTriggerOcr: () => void;
  hasDocument: boolean;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 64, 72];
const QUICK_COLORS = ['#000000', '#1f2937', '#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed'];

export const EditTextToolbar: React.FC<EditTextToolbarProps> = ({
  selectedBlock,
  defaultStyle,
  onUpdateStyle,
  onAddNewTextBox,
  onDeleteSelectedBlock,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  pendingEditCount,
  isCommitting,
  onCommitEdits,
  onSave,
  onSaveAs,
  diagnostics,
  isAnalyzing,
  onTriggerOcr,
  hasDocument,
}) => {
  const activeFontFamily = selectedBlock ? selectedBlock.fontFamily : defaultStyle.fontFamily;
  const activeFontSize = selectedBlock ? Math.round(selectedBlock.fontSize) : defaultStyle.fontSize;
  const activeIsBold = selectedBlock ? selectedBlock.isBold : defaultStyle.isBold;
  const activeIsItalic = selectedBlock ? selectedBlock.isItalic : defaultStyle.isItalic;
  const activeColor = selectedBlock ? selectedBlock.color : defaultStyle.color;
  const activeAlign = selectedBlock ? selectedBlock.align : defaultStyle.align;

  return (
    <div className="bg-white dark:bg-[#222226] border-b border-neutral-200 dark:border-neutral-800 shrink-0 z-20 select-none">
      {/* Main Formatting Controls Bar */}
      <div className="px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-xs">
        {/* Badge */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-neutral-200 dark:border-neutral-700 shrink-0">
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
            Edit Text Engine
          </span>
        </div>

        {/* Font Family & Size */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-neutral-200 dark:border-neutral-700 shrink-0">
          <select
            value={activeFontFamily}
            disabled={!hasDocument}
            onChange={(e) => onUpdateStyle({ fontFamily: e.target.value as EditableFontFamily })}
            title="Font Family"
            className="h-7 px-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-blue-500 disabled:opacity-40"
          >
            <option value="Helvetica">Helvetica / Sans</option>
            <option value="Times-Roman">Times New Roman / Serif</option>
            <option value="Courier">Courier / Mono</option>
          </select>

          <div className="flex items-center border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 h-7">
            <button
              onClick={() => onUpdateStyle({ fontSize: Math.max(6, activeFontSize - 1) })}
              disabled={!hasDocument || activeFontSize <= 6}
              className="px-1.5 h-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-30"
              title="Decrease Font Size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <select
              value={FONT_SIZES.includes(activeFontSize) ? activeFontSize : ''}
              disabled={!hasDocument}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) onUpdateStyle({ fontSize: v });
              }}
              title="Font Size (pt)"
              className="h-full px-1 text-xs bg-transparent text-neutral-800 dark:text-neutral-200 font-mono focus:outline-none text-center"
            >
              {!FONT_SIZES.includes(activeFontSize) && (
                <option value="">{activeFontSize}pt</option>
              )}
              {FONT_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}pt
                </option>
              ))}
            </select>
            <button
              onClick={() => onUpdateStyle({ fontSize: Math.min(96, activeFontSize + 1) })}
              disabled={!hasDocument || activeFontSize >= 96}
              className="px-1.5 h-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-30"
              title="Increase Font Size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bold / Italic */}
        <div className="flex items-center gap-1 pr-2.5 border-r border-neutral-200 dark:border-neutral-700 shrink-0">
          <button
            onClick={() => onUpdateStyle({ isBold: !activeIsBold })}
            disabled={!hasDocument}
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
              activeIsBold
                ? 'bg-blue-100 dark:bg-blue-900/60 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            } disabled:opacity-40`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onUpdateStyle({ isItalic: !activeIsItalic })}
            disabled={!hasDocument}
            className={`w-7 h-7 flex items-center justify-center rounded border transition-colors ${
              activeIsItalic
                ? 'bg-blue-100 dark:bg-blue-900/60 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            } disabled:opacity-40`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color Controls */}
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-neutral-200 dark:border-neutral-700 shrink-0">
          <label
            className="flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            title="Pick Any Font Color"
          >
            <input
              type="color"
              value={activeColor}
              disabled={!hasDocument}
              onChange={(e) => onUpdateStyle({ color: e.target.value })}
              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
            />
            <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-300 uppercase">
              {activeColor}
            </span>
          </label>
          <div className="hidden lg:flex items-center gap-1">
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                disabled={!hasDocument}
                onClick={() => onUpdateStyle({ color: c })}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  activeColor.toLowerCase() === c
                    ? 'scale-115 ring-1 ring-blue-500 border-white dark:border-neutral-900'
                    : 'border-neutral-300 dark:border-neutral-600'
                }`}
                style={{ backgroundColor: c }}
                title={`Set Color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center gap-0.5 pr-2.5 border-r border-neutral-200 dark:border-neutral-700 shrink-0">
          {(
            [
              { id: 'left', icon: AlignLeft, label: 'Align Left' },
              { id: 'center', icon: AlignCenter, label: 'Align Center' },
              { id: 'right', icon: AlignRight, label: 'Align Right' },
              { id: 'justify', icon: AlignJustify, label: 'Justify' },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeAlign === item.id;
            return (
              <button
                key={item.id}
                disabled={!hasDocument}
                onClick={() => onUpdateStyle({ align: item.id })}
                title={item.label}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  active
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                } disabled:opacity-40`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Add Text / Delete / Undo / Redo */}
        <div className="flex items-center gap-1 pr-2.5 border-r border-neutral-200 dark:border-neutral-700 shrink-0">
          <button
            onClick={onAddNewTextBox}
            disabled={!hasDocument}
            className="px-2.5 h-7 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 font-medium flex items-center gap-1 disabled:opacity-40"
            title="Insert New Text Block on Page"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Add Text</span>
          </button>

          <button
            onClick={onDeleteSelectedBlock}
            disabled={!selectedBlock}
            className="px-2 h-7 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-900 flex items-center gap-1 disabled:opacity-35"
            title="Delete Selected Existing or New Text"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Commit & Save / Save As */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {pendingEditCount > 0 && (
            <button
              onClick={onCommitEdits}
              disabled={isCommitting}
              className="px-2.5 h-7 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
              title="Rewrite PDF content stream with MuPDF & pdf-lib and refresh document"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {isCommitting
                  ? 'Rewriting PDF...'
                  : `Apply (${pendingEditCount})`}
              </span>
            </button>
          )}

          <button
            onClick={onSave}
            disabled={!hasDocument || isCommitting}
            className="px-2.5 h-7 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-40"
            title="Save Modified PDF (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={onSaveAs}
            disabled={!hasDocument || isCommitting}
            className="px-2.5 h-7 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 font-medium flex items-center gap-1.5 disabled:opacity-40"
            title="Save As New PDF File (Ctrl+Shift+S)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Save As...</span>
          </button>
        </div>
      </div>

      {/* Diagnostics & Font Substitution Notice Strip */}
      {hasDocument && (isAnalyzing || diagnostics || (selectedBlock && selectedBlock.isCustomFont)) && (
        <div
          className={`px-3 py-1 border-t text-[11px] flex items-center justify-between gap-3 ${
            diagnostics?.status === 'scanned' || diagnostics?.status === 'outlined' || diagnostics?.status === 'encrypted'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
              : diagnostics?.status === 'mixed' || selectedBlock?.isCustomFont
              ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/40 text-blue-800 dark:text-blue-300'
              : 'bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {isAnalyzing ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                <span>Inspecting PDF text objects, embedded fonts, and content stream coordinates...</span>
              </>
            ) : diagnostics?.status === 'scanned' || diagnostics?.status === 'outlined' ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">{diagnostics.message}</span>
              </>
            ) : diagnostics?.status === 'encrypted' ? (
              <>
                <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <span className="truncate">{diagnostics.message}</span>
              </>
            ) : selectedBlock ? (
              <>
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  {selectedBlock.source === 'existing' ? (
                    <>
                      Selected PDF block · Original font:{' '}
                      <strong className="font-mono">{selectedBlock.origFontName}</strong>
                      {selectedBlock.isCustomFont
                        ? ` (embedded font substituted with ${selectedBlock.fontFamily} on edit)`
                        : ' (standard PDF font preserved)'}
                      {' · Double-click text to type, drag header to move, drag edges/corner to resize.'}
                    </>
                  ) : (
                    'New PDF text block · Drag header to move, drag edges/corner to resize.'
                  )}
                </span>
              </>
            ) : (
              <>
                <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">
                  {diagnostics?.message ||
                    'Click any existing text block or drag over text to select & edit. Click empty space to add new text.'}
                </span>
              </>
            )}
          </div>

          {diagnostics?.status === 'scanned' && (
            <button
              onClick={onTriggerOcr}
              className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1 shrink-0 text-[11px]"
            >
              <ScanText className="w-3 h-3" />
              <span>Run OCR Scanner</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
