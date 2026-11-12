import React, { useState } from 'react';
import { X, Minimize2, Check, ArrowRight } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { pdfEditorService } from '../../services/pdfEditorService';

interface CompressModalProps {
  isOpen: boolean;
  onClose: () => void;
  docProxy: any;
  documentName: string;
  originalSize: number;
}

export const CompressModal: React.FC<CompressModalProps> = ({
  isOpen,
  onClose,
  docProxy,
  documentName,
  originalSize,
}) => {
  const [preset, setPreset] = useState<'extreme' | 'balanced' | 'light'>('balanced');
  const [isCompressing, setIsCompressing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [compressedResult, setCompressedResult] = useState<{ bytes: Uint8Array; size: number } | null>(null);

  if (!isOpen) return null;

  const handleCompress = async () => {
    if (!docProxy) return;
    setIsCompressing(true);
    setCompressedResult(null);

    try {
      const numPages = docProxy.numPages;
      const pdfDoc = await PDFDocument.create();

      // Configure scale and JPEG quality based on preset
      const config = {
        extreme: { scale: 1.0, quality: 0.6 },
        balanced: { scale: 1.3, quality: 0.75 },
        light: { scale: 1.8, quality: 0.88 },
      }[preset];

      for (let i = 1; i <= numPages; i++) {
        setProgressText(`Optimizing page ${i} of ${numPages}...`);
        const page = await docProxy.getPage(i);
        const viewport = page.getViewport({ scale: config.scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', config.quality);
        const base64Data = dataUrl.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const embeddedImage = await pdfDoc.embedJpg(imageBytes);

        // Target page standard size
        const originalViewport = page.getViewport({ scale: 1.0 });
        const newPage = pdfDoc.addPage([originalViewport.width, originalViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });
      }

      setProgressText('Finalizing optimized document...');
      const compressedBytes = await pdfDoc.save();
      setCompressedResult({
        bytes: compressedBytes,
        size: compressedBytes.byteLength,
      });
    } catch (err) {
      console.error('Compression failed', err);
    } finally {
      setIsCompressing(false);
      setProgressText('');
    }
  };

  const handleDownload = () => {
    if (compressedResult) {
      pdfEditorService.downloadBytes(
        compressedResult.bytes,
        `${documentName.replace('.pdf', '')}_compressed.pdf`
      );
      onClose();
    }
  };

  const originalKb = (originalSize / 1024).toFixed(0);
  const compressedKb = compressedResult ? (compressedResult.size / 1024).toFixed(0) : null;
  const reductionPercent = compressedResult
    ? Math.max(0, Math.round(((originalSize - compressedResult.size) / originalSize) * 100))
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col text-xs">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Compress PDF Document
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <span className="text-[10px] text-neutral-400 block">Current File Size</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono text-sm">
                {originalKb} KB
              </span>
            </div>
            {compressedResult && (
              <>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
                <div>
                  <span className="text-[10px] text-emerald-500 font-medium block">
                    Optimized Size (-{reductionPercent}%)
                  </span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">
                    {compressedKb} KB
                  </span>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Compression Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'extreme', title: 'High', desc: 'Smallest file size' },
                { id: 'balanced', title: 'Balanced', desc: 'Recommended' },
                { id: 'light', title: 'Light', desc: 'High visual fidelity' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setPreset(lvl.id as any)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    preset === lvl.id
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                  }`}
                >
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {lvl.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {lvl.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isCompressing && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="animate-spin text-sm">⚙</span>
              <span>{progressText}</span>
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
            {compressedResult ? (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Download Optimized PDF</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompress}
                disabled={isCompressing}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>{isCompressing ? 'Compressing...' : 'Start Compression'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
