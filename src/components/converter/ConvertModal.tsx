import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  FileCode, 
  Type, 
  Check, 
  Download, 
  Upload, 
  RefreshCw 
} from 'lucide-react';
import { pdfConverterService, ConversionProgress } from '../../services/pdfConverterService';

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversionType: string;
  docProxy: any;
  documentName: string;
  onNewPdfGenerated?: (pdfBytes: Uint8Array, fileName: string) => void;
}

export const ConvertModal: React.FC<ConvertModalProps> = ({
  isOpen,
  onClose,
  conversionType,
  docProxy,
  documentName,
  onNewPdfGenerated,
}) => {
  const [selectedType, setSelectedType] = useState(conversionType || 'pdf-to-word');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [rawText, setRawText] = useState('');
  const [textTitle, setTextTitle] = useState('New Document');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = async () => {
    setIsConverting(true);
    setStatusSuccess(null);
    setProgress({ current: 0, total: 1, status: 'Starting conversion...' });

    try {
      const baseName = documentName ? documentName.replace(/\.pdf$/i, '') : 'Document';

      switch (selectedType) {
        case 'pdf-to-jpg':
        case 'pdf-to-png': {
          const format = selectedType === 'pdf-to-jpg' ? 'jpeg' : 'png';
          const ext = selectedType === 'pdf-to-jpg' ? 'jpg' : 'png';
          const images = await pdfConverterService.pdfToImages(
            docProxy,
            format,
            2.0,
            (p) => setProgress(p)
          );

          // Download each image or trigger
          for (const img of images) {
            const link = document.createElement('a');
            link.href = img.dataUrl;
            link.download = `${baseName}_Page_${img.pageNumber}.${ext}`;
            link.click();
          }
          setStatusSuccess(`Exported ${images.length} images successfully.`);
          break;
        }

        case 'pdf-to-word': {
          const docxBlob = await pdfConverterService.pdfToWordDocx(docProxy, (p) => setProgress(p));
          pdfConverterService.downloadConvertedFile(docxBlob, `${baseName}.docx`);
          setStatusSuccess(`Downloaded ${baseName}.docx Microsoft Word document.`);
          break;
        }

        case 'pdf-to-excel': {
          const excelBytes = await pdfConverterService.pdfToExcelSheet(docProxy, (p) => setProgress(p));
          pdfConverterService.downloadConvertedFile(excelBytes, `${baseName}.xlsx`);
          setStatusSuccess(`Downloaded ${baseName}.xlsx Microsoft Excel spreadsheet.`);
          break;
        }

        case 'pdf-to-text': {
          const textContent = await pdfConverterService.pdfToText(docProxy);
          pdfConverterService.downloadConvertedFile(textContent, `${baseName}.txt`);
          setStatusSuccess(`Downloaded ${baseName}.txt plain text document.`);
          break;
        }

        case 'images-to-pdf': {
          if (imageFiles.length === 0) return;
          const pdfBytes = await pdfConverterService.imagesToPdf(imageFiles);
          if (onNewPdfGenerated) {
            onNewPdfGenerated(pdfBytes, 'Images_Combined.pdf');
          } else {
            pdfConverterService.downloadConvertedFile(pdfBytes, 'Images_Combined.pdf');
          }
          setStatusSuccess(`Created PDF with ${imageFiles.length} pages.`);
          break;
        }

        case 'text-to-pdf': {
          if (!rawText.trim()) return;
          const pdfBytes = await pdfConverterService.textToPdf(rawText, textTitle);
          if (onNewPdfGenerated) {
            onNewPdfGenerated(pdfBytes, `${textTitle.replace(/\s+/g, '_')}.pdf`);
          } else {
            pdfConverterService.downloadConvertedFile(pdfBytes, `${textTitle.replace(/\s+/g, '_')}.pdf`);
          }
          setStatusSuccess('Formatted text successfully rendered into PDF.');
          break;
        }
      }
    } catch (err: any) {
      console.error('Conversion failed', err);
      alert('Conversion failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConverting(false);
      setProgress(null);
    }
  };

  const CONVERSION_OPTIONS = [
    { id: 'pdf-to-word', label: 'PDF to Word (.docx)', icon: FileText, desc: 'Extract paragraphs into formatted DOCX', requiresPdf: true },
    { id: 'pdf-to-excel', label: 'PDF to Excel (.xlsx)', icon: FileSpreadsheet, desc: 'Extract table rows into structured spreadsheet', requiresPdf: true },
    { id: 'pdf-to-jpg', label: 'PDF to JPG', icon: FileImage, desc: 'High-resolution JPEG images per page', requiresPdf: true },
    { id: 'pdf-to-png', label: 'PDF to PNG', icon: FileImage, desc: 'Lossless crisp PNG rendering', requiresPdf: true },
    { id: 'pdf-to-text', label: 'PDF to Text (.txt)', icon: FileCode, desc: 'Pure plain text extraction', requiresPdf: true },
    { id: 'images-to-pdf', label: 'Images to PDF', icon: Upload, desc: 'Compile PNG and JPG images into a new PDF', requiresPdf: false },
    { id: 'text-to-pdf', label: 'Text to PDF', icon: Type, desc: 'Format and paginate text into clean PDF', requiresPdf: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Universal Document Converter
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Option Selector Grid */}
          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Select Target Conversion
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONVERSION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.id;
                const isDisabled = opt.requiresPdf && !docProxy;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setSelectedType(opt.id);
                      setStatusSuccess(null);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                    } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 text-xs">
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Sub-input for Images to PDF */}
          {selectedType === 'images-to-pdf' && (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-900 space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Choose Images to Combine (Batch)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    if (e.target.files) {
                      setImageFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                    }
                  }}
                  className="w-full text-xs text-neutral-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>

              {/* Batch items list */}
              {imageFiles.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="flex justify-between items-center text-[11px] text-neutral-500">
                    <span>{imageFiles.length} images queued</span>
                    <button
                      type="button"
                      onClick={() => setImageFiles([])}
                      className="text-red-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  {imageFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between p-1.5 bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 text-[11px]"
                    >
                      <span className="truncate max-w-[200px] text-neutral-800 dark:text-neutral-200">
                        {idx + 1}. {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-red-500 p-0.5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conditional Sub-input for Text to PDF */}
          {selectedType === 'text-to-pdf' && (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-900 space-y-2">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Document Header Title
                </label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Paste or Enter Text Body
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste content here to generate structured PDF pages..."
                  className="w-full p-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Conversion Engine Architecture Transparency Notice */}
          <div className="p-3 bg-neutral-100/70 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700/60 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 block mb-0.5">
              Local Engine vs Optional Cloud Pipeline:
            </span>
            This conversion runs 100% locally in your browser memory for total privacy and zero data transfer. It reconstructs semantic headings, tables, and paragraphs. For heavy legacy scanned magazine multi-column layouts with complex graphical overlays, an optional Adobe Document Services API or CloudConvert webhook integration can be configured in Preferences.
          </div>

          {/* Progress or Success Bar */}
          {isConverting && progress && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-700 dark:text-blue-300 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span>{progress.status}</span>
                {progress.total > 0 && (
                  <span className="font-mono">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                )}
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{
                    width: `${progress.total ? (progress.current / progress.total) * 100 : 50}%`,
                  }}
                />
              </div>
            </div>
          )}

          {statusSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{statusSuccess}</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleConvert}
              disabled={isConverting}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isConverting ? 'Processing...' : 'Start Conversion'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
