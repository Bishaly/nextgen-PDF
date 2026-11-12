import React, { useState } from 'react';
import { X, Trash2, Check, AlertCircle } from 'lucide-react';
import { pdfEditorService } from '../../services/pdfEditorService';

interface BlankPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  docProxy: any;
  documentBytes: Uint8Array;
  documentName: string;
  onSuccess: (trimmedBytes: Uint8Array, removedCount: number) => void;
}

export const BlankPageModal: React.FC<BlankPageModalProps> = ({
  isOpen,
  onClose,
  docProxy,
  documentBytes,
  documentName,
  onSuccess,
}) => {
  const [sensitivity, setSensitivity] = useState(0.992);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleScanAndRemove = async () => {
    if (!docProxy) return;
    setIsAnalyzing(true);
    setStatusMessage('Scanning pages for content...');

    try {
      const result = await pdfEditorService.removeBlankPages(docProxy, documentBytes, sensitivity);
      if (result.removedCount === 0) {
        setStatusMessage('No blank pages detected with current sensitivity setting.');
      } else {
        onSuccess(result.pdfBytes, result.removedCount);
        onClose();
      }
    } catch (err) {
      console.error('Blank page removal error', err);
      setStatusMessage('Error scanning pages.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-sm overflow-hidden flex flex-col text-xs">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Remove Blank Pages
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            Automatically detect and delete empty or blank pages from <span className="font-semibold text-neutral-900 dark:text-neutral-100">{documentName}</span>.
          </p>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-neutral-700 dark:text-neutral-300">
                Detection Threshold
              </label>
              <span className="text-neutral-400 font-mono text-[11px]">
                {sensitivity >= 0.995 ? 'Strict (99.5%)' : sensitivity >= 0.99 ? 'Balanced (99.2%)' : 'Aggressive (98.5%)'}
              </span>
            </div>
            <input
              type="range"
              min="0.980"
              max="0.998"
              step="0.002"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-full accent-rose-600"
            />
            <span className="text-[10px] text-neutral-400 block mt-1">
              Higher value ensures only completely empty pages are removed.
            </span>
          </div>

          {statusMessage && (
            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScanAndRemove}
              disabled={isAnalyzing}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Scanning...' : 'Scan & Remove'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
