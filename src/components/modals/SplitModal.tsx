import React, { useState } from 'react';
import { X, Scissors, Check } from 'lucide-react';
import { pdfEditorService } from '../../services/pdfEditorService';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentBytes: Uint8Array;
  totalPages: number;
  documentName: string;
  onSplitSuccess: (splitBytes: Uint8Array, fileName: string) => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  documentBytes,
  totalPages,
  documentName,
  onSplitSuccess,
}) => {
  const [mode, setMode] = useState<'range' | 'extract'>('range');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(Math.min(totalPages, 2));
  const [customPages, setCustomPages] = useState('1, 2');
  const [isSplitting, setIsSplitting] = useState(false);

  if (!isOpen) return null;

  const handleSplit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSplitting(true);
    try {
      if (mode === 'range') {
        if (startPage > endPage || startPage < 1 || endPage > totalPages) return;
        const splitBytes = await pdfEditorService.splitPdf(documentBytes, startPage, endPage);
        const fileName = `${documentName.replace('.pdf', '')}_p${startPage}-p${endPage}.pdf`;
        onSplitSuccess(splitBytes, fileName);
      } else {
        // Parse custom list e.g. "1, 3, 5-7"
        const pagesToExtract: number[] = [];
        const tokens = customPages.split(',');
        for (const token of tokens) {
          if (token.includes('-')) {
            const [s, e] = token.split('-').map((n) => parseInt(n.trim(), 10));
            if (!isNaN(s) && !isNaN(e)) {
              for (let i = Math.max(1, s); i <= Math.min(totalPages, e); i++) {
                pagesToExtract.push(i);
              }
            }
          } else {
            const val = parseInt(token.trim(), 10);
            if (!isNaN(val) && val >= 1 && val <= totalPages) {
              pagesToExtract.push(val);
            }
          }
        }

        const uniquePages = Array.from(new Set(pagesToExtract)).sort((a, b) => a - b);
        if (uniquePages.length === 0) {
          alert('Please enter valid page numbers.');
          setIsSplitting(false);
          return;
        }

        const extractedBytes = await pdfEditorService.extractPages(documentBytes, uniquePages);
        const fileName = `${documentName.replace('.pdf', '')}_extracted_${uniquePages.length}pages.pdf`;
        onSplitSuccess(extractedBytes, fileName);
      }
      onClose();
    } catch (err) {
      console.error('Split/extract failed', err);
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-sm overflow-hidden flex flex-col text-xs">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Split & Extract Pages
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSplit} className="p-5 space-y-4">
          {/* Mode Selector */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('range')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'range'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Page Range
            </button>
            <button
              type="button"
              onClick={() => setMode('extract')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === 'extract'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Extract Specific Pages
            </button>
          </div>

          {mode === 'range' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Start Page
                </label>
                <input
                  type="number"
                  min={1}
                  max={endPage}
                  value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  End Page
                </label>
                <input
                  type="number"
                  min={startPage}
                  max={totalPages}
                  value={endPage}
                  onChange={(e) => setEndPage(Math.min(totalPages, parseInt(e.target.value, 10) || startPage))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Enter Pages to Extract (e.g. 1, 3, 5-7)
              </label>
              <input
                type="text"
                value={customPages}
                onChange={(e) => setCustomPages(e.target.value)}
                placeholder="e.g. 1, 3, 4"
                className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 font-mono"
              />
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Total available pages in document: {totalPages}
              </span>
            </div>
          )}

          <div className="bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-500">
              {mode === 'range'
                ? `Selected: ${endPage - startPage + 1} pages will be exported.`
                : 'Selected specific pages will be packaged into a new PDF.'}
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSplitting}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSplitting ? 'Processing...' : 'Extract & Open'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
