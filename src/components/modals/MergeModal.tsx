import React, { useState } from 'react';
import { X, Layers, Plus, ArrowUp, ArrowDown, Trash2, Check, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { pdfEditorService } from '../../services/pdfEditorService';

interface MergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocumentBytes?: Uint8Array | null;
  currentDocumentName?: string;
  onMergedSuccess: (mergedBytes: Uint8Array, fileName: string) => void;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  data: Uint8Array;
}

export const MergeModal: React.FC<MergeModalProps> = ({
  isOpen,
  onClose,
  currentDocumentBytes,
  currentDocumentName,
  onMergedSuccess,
}) => {
  const [files, setFiles] = useState<FileItem[]>(() => {
    if (currentDocumentBytes && currentDocumentName) {
      return [
        {
          id: 'initial_doc',
          name: currentDocumentName,
          size: currentDocumentBytes.byteLength,
          pageCount: 1, // Will be updated
          data: currentDocumentBytes,
        },
      ];
    }
    return [];
  });

  const [mergedName, setMergedName] = useState('Merged_Document.pdf');
  const [isMerging, setIsMerging] = useState(false);

  if (!isOpen) return null;

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newItems: FileItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) continue;

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        newItems.push({
          id: `${file.name}_${Date.now()}_${i}`,
          name: file.name,
          size: file.size,
          pageCount: doc.getPageCount(),
          data: bytes,
        });
      } catch (err) {
        console.error('Failed to parse added PDF', err);
      }
    }

    setFiles((prev) => [...prev, ...newItems]);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index >= files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsMerging(true);
    try {
      const byteArrays = files.map((f) => f.data);
      const mergedBytes = await pdfEditorService.mergePdfs(byteArrays);
      onMergedSuccess(mergedBytes, mergedName);
      onClose();
    } catch (err) {
      console.error('Merge failed', err);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1f1f23] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              Merge Multiple PDFs
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col gap-4 text-xs">
          {/* Add file zone */}
          <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-blue-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
            <Plus className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Click to Add PDF Documents to Merge
            </span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleAddFiles}
              className="hidden"
            />
          </label>

          {/* Files List */}
          <div className="flex-1 max-h-56 overflow-y-auto space-y-2 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2 bg-neutral-50 dark:bg-neutral-900/50">
            {files.length > 0 ? (
              files.map((file, idx) => (
                <div
                  key={file.id}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-2 flex items-center justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-mono text-neutral-400 text-[10px] w-4">
                      {idx + 1}.
                    </span>
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'} · {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === files.length - 1}
                      className="p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-neutral-400">
                No documents in the merge queue yet. Add at least 2 PDF files.
              </div>
            )}
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Merged File Name
            </label>
            <input
              type="text"
              value={mergedName}
              onChange={(e) => setMergedName(e.target.value)}
              className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between text-xs">
          <span className="text-neutral-500">
            Total {files.reduce((acc, f) => acc + f.pageCount, 0)} pages
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={files.length < 2 || isMerging}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isMerging ? 'Merging...' : 'Merge & Open'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
