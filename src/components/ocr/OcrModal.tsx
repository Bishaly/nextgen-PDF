import React, { useState } from 'react';
import { X, ScanText, Copy, Download, Check, AlertCircle } from 'lucide-react';
import { ocrService, OcrProgressUpdate } from '../../services/ocrService';
import { pdfEditorService } from '../../services/pdfEditorService';
import { desktopBridge } from '../../services/desktopBridge';

interface OcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  docProxy: any;
  currentPage: number;
  documentName: string;
}

export const OcrModal: React.FC<OcrModalProps> = ({
  isOpen,
  onClose,
  docProxy,
  currentPage,
  documentName,
}) => {
  const [scope, setScope] = useState<'current' | 'all' | 'custom'>('current');
  const [customRange, setCustomRange] = useState('1');
  const [language, setLanguage] = useState('eng');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgressUpdate | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const totalPages = docProxy ? docProxy.numPages : 1;

  const handleCancelOcr = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProgress(null);
  };

  const handleStartOcr = async () => {
    if (!docProxy) return;

    let targetPages: number[] = [];
    if (scope === 'current') {
      targetPages = [currentPage];
    } else if (scope === 'all') {
      targetPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Parse custom range e.g. "1,2-4"
      const parts = customRange.split(',');
      for (const part of parts) {
        if (part.includes('-')) {
          const [s, e] = part.split('-').map((n) => parseInt(n.trim(), 10));
          if (!isNaN(s) && !isNaN(e)) {
            for (let i = Math.max(1, s); i <= Math.min(totalPages, e); i++) {
              targetPages.push(i);
            }
          }
        } else {
          const val = parseInt(tokenClean(part));
          if (!isNaN(val) && val >= 1 && val <= totalPages) {
            targetPages.push(val);
          }
        }
      }
      targetPages = Array.from(new Set(targetPages)).sort((a, b) => a - b);
    }

    if (targetPages.length === 0) {
      alert('Please specify valid pages to scan.');
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsProcessing(true);
    setExtractedText('');

    try {
      const result = await ocrService.recognizePdfPages(
        docProxy,
        targetPages,
        language,
        (p) => setProgress(p),
        abortController.signal
      );
      setExtractedText(result.text);
    } catch (err: any) {
      if (err.message?.includes('cancelled')) {
        console.log('OCR cancelled by user');
      } else {
        console.error('OCR failed', err);
        alert('OCR error: ' + (err.message || 'Unknown recognition error'));
      }
    } finally {
      setIsProcessing(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  };

  function tokenClean(val: string) {
    return val.trim();
  }

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!extractedText) return;
    const filename = `${documentName.replace('.pdf', '')}_OCR_Text.txt`;
    if (desktopBridge.isElectron()) {
      await desktopBridge.exportFile(extractedText, filename, 'text/plain;charset=utf-8');
    } else {
      const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
      pdfEditorService.downloadBlob(blob, filename);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanText className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              OCR Optical Character Recognition
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Scan Scope
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('current')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    scope === 'current'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  Current (p.{currentPage})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    scope === 'all'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  All ({totalPages} pages)
                </button>
                <button
                  type="button"
                  onClick={() => setScope('custom')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    scope === 'custom'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  Custom
                </button>
              </div>

              {scope === 'custom' && (
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-2, 4"
                  className="mt-2 w-full px-2.5 py-1 text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded"
                />
              )}
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Recognition Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100"
              >
                <option value="eng">English (Latin OCR)</option>
                <option value="spa">Spanish (Español)</option>
                <option value="fra">French (Français)</option>
                <option value="deu">German (Deutsch)</option>
                <option value="ita">Italian (Italiano)</option>
                <option value="por">Portuguese (Português)</option>
                <option value="chi_sim">Chinese Simplified (简体中文)</option>
                <option value="jpn">Japanese (日本語)</option>
              </select>
            </div>
          </div>

          {/* Progress bar */}
          {isProcessing && progress && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-700 dark:text-blue-300 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span>{progress.status}</span>
                <span className="font-mono">{Math.round(progress.progress * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-200"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Extracted Text Area */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-neutral-700 dark:text-neutral-300">
                Extracted Text Output
              </label>
              {extractedText && (
                <span className="text-neutral-400 font-mono text-[10px]">
                  {extractedText.split(/\s+/).length} words · {extractedText.length} characters
                </span>
              )}
            </div>
            <textarea
              rows={10}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="OCR extracted text will display here. You can edit, copy, or download it."
              className="w-full p-3 font-mono text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span>
              Tesseract neural OCR executes purely in your browser memory. No document images leave your device.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
          <div className="flex gap-2">
            {extractedText && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 flex items-center gap-1 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {isProcessing ? (
              <button
                type="button"
                onClick={handleCancelOcr}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs"
              >
                Cancel OCR
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleStartOcr}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
                >
                  <ScanText className="w-3.5 h-3.5" />
                  <span>Run Local OCR</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
