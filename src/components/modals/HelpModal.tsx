import React from 'react';
import { X, Keyboard, Shield, FileText, CheckCircle2 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const SHORTCUTS = [
    { key: 'Ctrl + O', action: 'Open PDF Document' },
    { key: 'Ctrl + S', action: 'Save Modified PDF' },
    { key: 'Ctrl + Shift + S', action: 'Save As New PDF' },
    { key: 'Ctrl + P', action: 'Print Active Document' },
    { key: 'Ctrl + Z', action: 'Undo Edit / Annotation' },
    { key: 'Ctrl + Y', action: 'Redo Edit / Annotation' },
    { key: 'F11', action: 'Toggle Full Screen Mode' },
    { key: '← / →', action: 'Navigate Previous / Next Page' },
    { key: '+ / -', action: 'Zoom In / Out' },
    { key: 'Escape', action: 'Deselect / Close Active Tool' },
    { key: 'Delete', action: 'Delete Selected Text / Item' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col text-xs">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              NextGen PDF Studio Help & Shortcuts
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Privacy Guarantee */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold text-xs">
              <Shield className="w-4 h-4" />
              <span>100% Client-Side Privacy Guarantee</span>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">
              All PDF rendering, existing text content-stream editing (MuPDF + pdf-lib), page manipulation, text recognition (OCR), signature embedding, and conversions execute locally in memory without uploading documents to external servers.
            </p>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200 mb-2.5">
              <Keyboard className="w-4 h-4 text-neutral-500" />
              <span>Desktop Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SHORTCUTS.map((sc) => (
                <div
                  key={sc.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                >
                  <span className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                    {sc.action}
                  </span>
                  <kbd className="px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono text-[10px] text-neutral-800 dark:text-neutral-200 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-1.5 pt-1">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
              Core Capabilities Included:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-neutral-600 dark:text-neutral-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Edit Existing PDF Text & Fonts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> PDF Reader & Vector Canvas
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Freehand Pen & Highlighters
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Digital Signatures (Draw/Type)
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> PDF to Word & Excel Converter
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Local Tesseract Neural OCR
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Merge, Split & Compress
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Watermark & Password Locks
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
