import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Move, Trash2, Edit3, Check } from 'lucide-react';
import { EditableTextBlock } from '../../types/pdf';

interface PdfTextEditorLayerProps {
  docProxy: any;
  baseCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentPage: number;
  zoom: number;
  rotation: number;
  blocks: EditableTextBlock[];
  selectedBlockId: string | null;
  editingBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onStartEditingBlock: (id: string | null) => void;
  onUpdateBlock: (block: EditableTextBlock, recordHistory?: boolean) => void;
  onCommitBlockDragHistory: (beforeBlock: EditableTextBlock) => void;
  onDeleteBlock: (id: string) => void;
  onCreateNewBlockAt: (x: number, y: number) => void;
}

function getCssFontFamily(family: EditableTextBlock['fontFamily']): string {
  if (family === 'Times-Roman') return "'Times New Roman', Times, Georgia, serif";
  if (family === 'Courier') return "'JetBrains Mono', 'Courier New', Courier, monospace";
  return "'Plus Jakarta Sans', Arial, Helvetica, sans-serif";
}

function sampleCanvasBackgroundColor(
  canvas: HTMLCanvasElement | null,
  pdfX: number,
  pdfY: number,
  zoom: number
): string {
  if (!canvas) return '#ffffff';
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#ffffff';
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(0, Math.min(canvas.width - 1, Math.round((pdfX * zoom - 2) * dpr)));
    const py = Math.max(0, Math.min(canvas.height - 1, Math.round((pdfY * zoom - 2) * dpr)));
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    if (pixel[3] < 20) return '#ffffff';
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  } catch {
    return '#ffffff';
  }
}

export const PdfTextEditorLayer: React.FC<PdfTextEditorLayerProps> = ({
  docProxy,
  baseCanvasRef,
  currentPage,
  zoom,
  rotation,
  blocks,
  selectedBlockId,
  editingBlockId,
  onSelectBlock,
  onStartEditingBlock,
  onUpdateBlock,
  onCommitBlockDragHistory,
  onDeleteBlock,
  onCreateNewBlockAt,
}) => {
  const layerRootRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const [selectionPopover, setSelectionPopover] = useState<{
    x: number;
    y: number;
    selectedText: string;
    matchedBlockId: string;
  } | null>(null);

  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize-se' | 'resize-e' | 'resize-s' | 'resize-w';
    blockId: string;
    startClientX: number;
    startClientY: number;
    initialBlock: EditableTextBlock;
  } | null>(null);

  const pageBlocks = blocks.filter((b) => b.page === currentPage);
  const visibleBlocks = pageBlocks.filter((b) => !b.isDeleted);

  // Render PDF.js TextLayer so users can drag-select native PDF text spans directly
  useEffect(() => {
    let cancelled = false;
    const container = textLayerRef.current;
    if (!docProxy || !container) return;

    (async () => {
      try {
        const page = await docProxy.getPage(currentPage);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: zoom, rotation });
        const textContent = await page.getTextContent();
        if (cancelled) return;

        container.innerHTML = '';
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container,
          viewport,
        });
        await textLayer.render();
      } catch (err) {
        if (!cancelled) console.warn('PDF.js TextLayer render warning:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docProxy, currentPage, zoom, rotation]);

  // Handle mouse move / mouse up globally during move or resize drag
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragState.startClientX) / zoom;
      const dy = (e.clientY - dragState.startClientY) / zoom;
      const init = dragState.initialBlock;

      if (dragState.mode === 'move') {
        onUpdateBlock(
          {
            ...init,
            x: Math.max(0, Math.round((init.x + dx) * 10) / 10),
            y: Math.max(0, Math.round((init.y + dy) * 10) / 10),
            isModified: true,
          },
          false
        );
      } else if (dragState.mode === 'resize-e') {
        onUpdateBlock(
          {
            ...init,
            width: Math.max(32, Math.round((init.width + dx) * 10) / 10),
            isModified: true,
          },
          false
        );
      } else if (dragState.mode === 'resize-s') {
        onUpdateBlock(
          {
            ...init,
            height: Math.max(16, Math.round((init.height + dy) * 10) / 10),
            isModified: true,
          },
          false
        );
      } else if (dragState.mode === 'resize-se') {
        onUpdateBlock(
          {
            ...init,
            width: Math.max(32, Math.round((init.width + dx) * 10) / 10),
            height: Math.max(16, Math.round((init.height + dy) * 10) / 10),
            isModified: true,
          },
          false
        );
      } else if (dragState.mode === 'resize-w') {
        const newWidth = Math.max(32, init.width - dx);
        const appliedDx = init.width - newWidth;
        onUpdateBlock(
          {
            ...init,
            x: Math.max(0, Math.round((init.x + appliedDx) * 10) / 10),
            width: Math.round(newWidth * 10) / 10,
            isModified: true,
          },
          false
        );
      }
    };

    const handleUp = () => {
      onCommitBlockDragHistory(dragState.initialBlock);
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, zoom, onUpdateBlock, onCommitBlockDragHistory]);

  const findBlockAtPoint = (pdfX: number, pdfY: number): EditableTextBlock | undefined => {
    // Check in reverse order so newly added / top blocks win
    return [...visibleBlocks].reverse().find((b) => {
      const h = Math.max(16, b.height);
      return pdfX >= b.x - 4 && pdfX <= b.x + b.width + 4 && pdfY >= b.y - 4 && pdfY <= b.y + h + 4;
    });
  };

  const getRelativePdfCoords = (clientX: number, clientY: number) => {
    const rect = layerRootRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, rawX: 0, rawY: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
      rawX: clientX - rect.left,
      rawY: clientY - rect.top,
    };
  };

  const handleRootMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    setSelectionPopover(null);
  };

  const handleRootMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || editingBlockId) return;
    const coords = getRelativePdfCoords(e.clientX, e.clientY);
    const hit = findBlockAtPoint(coords.x, coords.y);
    setHoveredBlockId(hit ? hit.id : null);
  };

  const handleRootMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState || e.button !== 0) return;

    const downPos = pointerDownPosRef.current;
    pointerDownPosRef.current = null;
    const movedDist = downPos ? Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) : 0;

    // 1. Check if user drag-selected text over the PDF.js TextLayer
    const sel = window.getSelection();
    if (movedDist >= 4 && sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const selectedText = sel.toString().trim();
      if (selectedText.length > 0 && layerRootRef.current) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const rootRect = layerRootRef.current.getBoundingClientRect();
        const selPdfX = (rect.left - rootRect.left) / zoom;
        const selPdfY = (rect.top - rootRect.top) / zoom;
        const selPdfW = Math.max(4, rect.width / zoom);
        const selPdfH = Math.max(4, rect.height / zoom);

        const matched =
          visibleBlocks.find((b) => {
            const overlapX = Math.max(0, Math.min(b.x + b.width, selPdfX + selPdfW) - Math.max(b.x, selPdfX));
            const overlapY = Math.max(
              0,
              Math.min(b.y + Math.max(16, b.height), selPdfY + selPdfH) - Math.max(b.y, selPdfY)
            );
            return overlapX > 0 && overlapY > 0;
          }) || visibleBlocks.find((b) => b.text.includes(selectedText));

        if (matched) {
          setSelectionPopover({
            x: Math.max(8, rect.left - rootRect.left),
            y: Math.max(8, rect.top - rootRect.top - 40),
            selectedText,
            matchedBlockId: matched.id,
          });
          onSelectBlock(matched.id);
          return;
        }
      }
    }

    // 2. Click handling (when not dragging)
    if (movedDist < 6) {
      const coords = getRelativePdfCoords(e.clientX, e.clientY);
      const hitBlock = findBlockAtPoint(coords.x, coords.y);

      if (hitBlock) {
        window.getSelection()?.removeAllRanges();
        if (selectedBlockId === hitBlock.id && editingBlockId !== hitBlock.id) {
          onStartEditingBlock(hitBlock.id);
        } else {
          onSelectBlock(hitBlock.id);
          onStartEditingBlock(null);
        }
      } else {
        // Clicked empty space
        if (editingBlockId || selectedBlockId) {
          onStartEditingBlock(null);
          onSelectBlock(null);
        } else {
          onCreateNewBlockAt(coords.x, coords.y);
        }
      }
    }
  };

  const handleRootDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getRelativePdfCoords(e.clientX, e.clientY);
    const hitBlock = findBlockAtPoint(coords.x, coords.y);
    if (hitBlock) {
      window.getSelection()?.removeAllRanges();
      setSelectionPopover(null);
      onSelectBlock(hitBlock.id);
      onStartEditingBlock(hitBlock.id);
    }
  };

  return (
    <div
      ref={layerRootRef}
      onMouseDown={handleRootMouseDown}
      onMouseMove={handleRootMouseMove}
      onMouseUp={handleRootMouseUp}
      onDoubleClick={handleRootDoubleClick}
      className="absolute inset-0 z-20"
    >
      {/* 1. Live Preview Backdrop Concealment for Modified / Deleted Original Blocks ONLY (Saved PDF uses MuPDF content-stream removal!) */}
      {pageBlocks
        .filter((b) => b.source === 'existing' && (b.isModified || b.isDeleted))
        .map((blk) =>
          (blk.origRects && blk.origRects.length > 0
            ? blk.origRects
            : [{ x: blk.origX, y: blk.origY, width: blk.origWidth, height: blk.origHeight }]
          ).map((r, idx) => {
            const bgColor = sampleCanvasBackgroundColor(baseCanvasRef.current, r.x, r.y, zoom);
            return (
              <div
                key={`mask_${blk.id}_${idx}`}
                className="absolute pointer-events-none z-10"
                style={{
                  left: `${(r.x - 1) * zoom}px`,
                  top: `${(r.y - 1) * zoom}px`,
                  width: `${(r.width + 2) * zoom}px`,
                  height: `${(r.height + 2) * zoom}px`,
                  backgroundColor: bgColor,
                }}
              />
            );
          })
        )}

      {/* 2. Rendered Live Text & Hover Outlines (underneath TextLayer when unselected) */}
      {visibleBlocks.map((blk) => {
        const isSelected = blk.id === selectedBlockId;
        const isEditing = blk.id === editingBlockId;
        const isHovered = blk.id === hoveredBlockId;
        const showLiveText = blk.source === 'new' || blk.isModified;
        const cssFont = getCssFontFamily(blk.fontFamily);
        const scaledFontSize = blk.fontSize * zoom;

        return (
          <div
            key={blk.id}
            style={{
              left: `${blk.x * zoom}px`,
              top: `${blk.y * zoom}px`,
              width: `${blk.width * zoom}px`,
              minHeight: `${Math.max(18, blk.height) * zoom}px`,
            }}
            className={`absolute transition-shadow ${
              isEditing
                ? 'z-30 ring-2 ring-blue-600 bg-white/90 dark:bg-neutral-900/85 shadow-md pointer-events-auto'
                : isSelected
                ? 'z-30 ring-1.5 ring-blue-500 bg-blue-500/5 pointer-events-auto'
                : isHovered
                ? 'z-10 ring-1 ring-dashed ring-blue-500/75 bg-blue-500/5 pointer-events-none'
                : 'z-10 pointer-events-none'
            }`}
          >
            {/* Drag-to-move & Quick Action Header Bar when Selected */}
            {isSelected && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDragState({
                    mode: 'move',
                    blockId: blk.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    initialBlock: { ...blk },
                  });
                }}
                onMouseUp={(e) => e.stopPropagation()}
                className="absolute -top-6 left-0 flex items-center gap-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-t shadow-sm cursor-move whitespace-nowrap z-40"
              >
                <Move className="w-3 h-3" />
                <span className="font-medium">
                  {blk.source === 'existing' ? blk.origFontName : 'New Text'}
                </span>
                {!isEditing ? (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditingBlock(blk.id);
                    }}
                    className="ml-1 p-0.5 hover:bg-blue-700 rounded"
                    title="Edit Text Content"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditingBlock(null);
                    }}
                    className="ml-1 p-0.5 hover:bg-emerald-600 rounded"
                    title="Done Editing"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBlock(blk.id);
                  }}
                  className="p-0.5 hover:bg-red-600 rounded"
                  title="Delete Text Block"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Inline Textarea Editor OR Live Preview Text */}
            {isEditing ? (
              <textarea
                autoFocus
                value={blk.text}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  onUpdateBlock({
                    ...blk,
                    text: nextVal,
                    isModified: blk.source === 'new' || nextVal !== blk.origText || blk.isModified,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    onStartEditingBlock(null);
                  }
                }}
                rows={Math.max(1, blk.text.split('\n').length)}
                className="w-full h-full min-h-full bg-transparent resize-none focus:outline-none p-0 m-0 overflow-hidden"
                style={{
                  fontFamily: cssFont,
                  fontSize: `${scaledFontSize}px`,
                  fontWeight: blk.isBold ? 700 : 400,
                  fontStyle: blk.isItalic ? 'italic' : 'normal',
                  color: blk.color,
                  textAlign: blk.align,
                  lineHeight: blk.lineHeight,
                }}
              />
            ) : showLiveText ? (
              <div
                onMouseDown={(e) => {
                  if (isSelected) {
                    e.stopPropagation();
                    setDragState({
                      mode: 'move',
                      blockId: blk.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialBlock: { ...blk },
                    });
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onStartEditingBlock(blk.id);
                }}
                className="w-full h-full whitespace-pre-wrap break-words"
                style={{
                  fontFamily: cssFont,
                  fontSize: `${scaledFontSize}px`,
                  fontWeight: blk.isBold ? 700 : 400,
                  fontStyle: blk.isItalic ? 'italic' : 'normal',
                  color: blk.color,
                  textAlign: blk.align,
                  lineHeight: blk.lineHeight,
                }}
              >
                {blk.text}
              </div>
            ) : null}

            {/* Resize Handles when Selected */}
            {isSelected && (
              <>
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setDragState({
                      mode: 'resize-e',
                      blockId: blk.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialBlock: { ...blk },
                    });
                  }}
                  onMouseUp={(e) => e.stopPropagation()}
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 bg-white border border-blue-600 rounded-xs cursor-ew-resize z-40 shadow-2xs"
                  title="Resize Width"
                />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setDragState({
                      mode: 'resize-w',
                      blockId: blk.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialBlock: { ...blk },
                    });
                  }}
                  onMouseUp={(e) => e.stopPropagation()}
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-5 bg-white border border-blue-600 rounded-xs cursor-ew-resize z-40 shadow-2xs"
                  title="Resize Left Edge"
                />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setDragState({
                      mode: 'resize-s',
                      blockId: blk.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialBlock: { ...blk },
                    });
                  }}
                  onMouseUp={(e) => e.stopPropagation()}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-white border border-blue-600 rounded-xs cursor-ns-resize z-40 shadow-2xs"
                  title="Resize Height"
                />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setDragState({
                      mode: 'resize-se',
                      blockId: blk.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      initialBlock: { ...blk },
                    });
                  }}
                  onMouseUp={(e) => e.stopPropagation()}
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-600 border border-white rounded-xs cursor-nwse-resize z-40 shadow-xs"
                  title="Resize Text Box"
                />
              </>
            )}
          </div>
        );
      })}

      {/* 3. Native PDF.js TextLayer (z-20 so mouse drags select existing PDF text spans smoothly!) */}
      <div
        ref={textLayerRef}
        className="pdf-text-layer z-20"
        style={{ '--scale-factor': zoom } as React.CSSProperties}
      />

      {/* 4. Drag-Selection Action Popover */}
      {selectionPopover && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          style={{ left: `${selectionPopover.x}px`, top: `${selectionPopover.y}px` }}
          className="absolute z-50 bg-neutral-900 text-white text-[11px] rounded-lg shadow-xl px-2 py-1 flex items-center gap-1.5 border border-neutral-700"
        >
          <button
            onClick={() => {
              const targetId = selectionPopover.matchedBlockId;
              window.getSelection()?.removeAllRanges();
              setSelectionPopover(null);
              onSelectBlock(targetId);
              onStartEditingBlock(targetId);
            }}
            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 font-medium flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit Selected Text</span>
          </button>

          <button
            onClick={() => {
              const blk = pageBlocks.find((b) => b.id === selectionPopover.matchedBlockId);
              if (blk) {
                const selText = selectionPopover.selectedText;
                const remaining = blk.text.replace(selText, '').replace(/\s{2,}/g, ' ').trim();
                if (!remaining || selText.length >= blk.text.trim().length * 0.85) {
                  onDeleteBlock(blk.id);
                } else {
                  onUpdateBlock({ ...blk, text: remaining, isModified: true }, true);
                }
              }
              window.getSelection()?.removeAllRanges();
              setSelectionPopover(null);
            }}
            className="px-2 py-0.5 rounded bg-red-600/90 hover:bg-red-700 font-medium flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete Text</span>
          </button>
        </div>
      )}
    </div>
  );
};
