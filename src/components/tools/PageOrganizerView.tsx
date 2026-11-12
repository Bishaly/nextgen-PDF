import React, { useState } from 'react';
import { 
  RotateCw, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  RotateCcw,
  LayoutGrid
} from 'lucide-react';
import { pdfEditorService } from '../../services/pdfEditorService';

interface PageOrganizerViewProps {
  documentBytes: Uint8Array;
  totalPages: number;
  thumbnails: { [page: number]: string };
  onApplyNewPageOrder: (updatedBytes: Uint8Array) => void;
  onExitOrganizer: () => void;
}

export const PageOrganizerView: React.FC<PageOrganizerViewProps> = ({
  documentBytes,
  totalPages,
  thumbnails,
  onApplyNewPageOrder,
  onExitOrganizer,
}) => {
  // Page state: array of { originalPageNumber, rotation: degrees }
  const [pages, setPages] = useState<Array<{ id: number; pageNumber: number; rotation: number }>>(() => {
    return Array.from({ length: totalPages }, (_, i) => ({
      id: i + 1,
      pageNumber: i + 1,
      rotation: 0,
    }));
  });

  const [isSaving, setIsSaving] = useState(false);

  const rotatePage = (index: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + 90) % 360,
      };
      return copy;
    });
  };

  const rotateAll = () => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + 90) % 360,
      }))
    );
  };

  const moveLeft = (index: number) => {
    if (index <= 0) return;
    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveRight = (index: number) => {
    if (index >= pages.length - 1) return;
    setPages((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      alert('Cannot delete the last remaining page.');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAndApply = async () => {
    setIsSaving(true);
    try {
      const pageOrder = pages.map((p) => p.pageNumber);
      // 1. Reorder pages
      let updatedBytes = await pdfEditorService.reorderPages(documentBytes, pageOrder);

      // 2. Apply any individual rotations
      const rotatedIndices: { page: number; rot: number }[] = [];
      pages.forEach((p, idx) => {
        if (p.rotation > 0) {
          rotatedIndices.push({ page: idx + 1, rot: p.rotation });
        }
      });

      for (const item of rotatedIndices) {
        updatedBytes = await pdfEditorService.rotatePages(updatedBytes, [item.page], item.rot);
      }

      onApplyNewPageOrder(updatedBytes);
    } catch (err) {
      console.error('Failed to apply page organization', err);
      alert('Failed to update page order.');
    } finally {
      setIsSaving(false);
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const copy = [...prev];
      const [draggedItem] = copy.splice(draggedIndex, 1);
      copy.splice(targetIndex, 0, draggedItem);
      return copy;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f3f4f6] dark:bg-[#121215] overflow-hidden select-none">
      {/* Top action toolbar for organizer */}
      <div className="h-12 bg-white dark:bg-[#1b1b1e] border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200 font-semibold">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <span>Page Organizer ({pages.length} pages)</span>
          </div>
          <span className="text-neutral-400 hidden sm:inline">· Drag & drop cards to reorder</span>
          <button
            onClick={rotateAll}
            className="px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-1 text-neutral-600 dark:text-neutral-400"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate All 90°</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExitOrganizer}
            className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
          >
            Exit Organizer
          </button>
          <button
            onClick={handleSaveAndApply}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Applying...' : 'Apply & Save Order'}</span>
          </button>
        </div>
      </div>

      {/* Pages Grid Viewport */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {pages.map((p, idx) => {
            const thumb = thumbnails[p.pageNumber];
            const isDragging = draggedIndex === idx;
            const isOver = dragOverIndex === idx;

            return (
              <div
                key={`${p.pageNumber}-${idx}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`bg-white dark:bg-[#1a1a1e] rounded-xl border p-3 flex flex-col items-center group cursor-grab active:cursor-grabbing transition-all ${
                  isDragging
                    ? 'opacity-40 scale-95 border-dashed border-blue-500'
                    : isOver
                    ? 'ring-2 ring-blue-500 scale-105 border-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-blue-400'
                }`}
              >
                {/* Page Number Badge */}
                <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-2">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Pos #{idx + 1}
                  </span>
                  <span>(Orig #{p.pageNumber})</span>
                </div>

                {/* Page Preview Thumbnail */}
                <div className="w-full aspect-[1/1.4] bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-200/80 dark:border-neutral-800 relative pointer-events-none">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`Page ${p.pageNumber}`}
                      className="w-full h-full object-contain transition-transform duration-200"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400 font-mono">
                      Page {p.pageNumber}
                    </span>
                  )}
                </div>

                {/* Card Controls */}
                <div className="flex items-center gap-1 mt-3 w-full justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveLeft(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 disabled:opacity-20"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRight(idx)}
                      disabled={idx === pages.length - 1}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 disabled:opacity-20"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => rotatePage(idx)}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(idx)}
                      disabled={pages.length <= 1}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 disabled:opacity-20"
                      title="Delete Page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
