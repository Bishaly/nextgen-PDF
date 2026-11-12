import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  Trash2, 
  Move,
  Check,
  X,
  Bold,
  Italic,
  Type
} from 'lucide-react';
import { Annotation, ToolMode, Point } from '../../types/pdf';
import { pdfEngine } from '../../services/pdfEngine';

interface DocumentViewerProps {
  docProxy: any;
  currentPage: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  rotation: number;
  toolMode: ToolMode;
  selectedColor: string;
  strokeWidth: number;
  annotations: Annotation[];
  onAddAnnotation: (anno: Annotation) => void;
  onUpdateAnnotation: (anno: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
  activeAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  activeSignatureData: string | null;
  onConsumeSignature: () => void;
  activeImageData?: string | null;
  onConsumeImage?: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  docProxy,
  currentPage,
  onPageChange,
  zoom,
  onZoomChange,
  rotation,
  toolMode,
  selectedColor,
  strokeWidth,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  activeAnnotationId,
  onSelectAnnotation,
  activeSignatureData,
  onConsumeSignature,
  activeImageData,
  onConsumeImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 });
  const [isRendering, setIsRendering] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<Point[]>([]);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<Point | null>(null);

  const [newTextInput, setNewTextInput] = useState<{
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    isBold: boolean;
    isItalic: boolean;
    color?: string;
    isComment?: boolean;
  } | null>(null);

  // Moving / Resizing selected annotation state
  const [dragAction, setDragAction] = useState<{
    type: 'move' | 'resize';
    annoId: string;
    startX: number;
    startY: number;
    initialAnnoX: number;
    initialAnnoY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  // Hand tool panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Page annotations for the current page
  const pageAnnotations = annotations.filter((a) => a.page === currentPage);

  // Render PDF page to canvas
  const renderCurrentPage = useCallback(async () => {
    if (!docProxy || !canvasRef.current) return;
    setIsRendering(true);

    try {
      const result = await pdfEngine.renderPageToCanvas(
        docProxy,
        currentPage,
        canvasRef.current,
        zoom,
        rotation
      );

      setPageDimensions({ width: result.width, height: result.height });
    } catch (err) {
      console.error('Page rendering failed', err);
    } finally {
      setIsRendering(false);
    }
  }, [docProxy, currentPage, zoom, rotation]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Redraw overlay annotations and interactive preview
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = zoom;

    // Render saved annotations for current page
    pageAnnotations.forEach((anno) => {
      ctx.save();
      ctx.strokeStyle = anno.color || '#000000';
      ctx.fillStyle = anno.color || '#000000';
      ctx.lineWidth = (anno.strokeWidth || 2) * scale;
      ctx.globalAlpha = anno.opacity ?? 1;

      const isSelected = anno.id === activeAnnotationId;

      switch (anno.type) {
        case 'draw': {
          if (anno.points && anno.points.length > 1) {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(anno.points[0].x * scale, anno.points[0].y * scale);
            for (let i = 1; i < anno.points.length; i++) {
              ctx.lineTo(anno.points[i].x * scale, anno.points[i].y * scale);
            }
            ctx.stroke();
          }
          break;
        }

        case 'highlight': {
          ctx.globalAlpha = 0.35;
          ctx.fillRect(
            anno.x * scale,
            anno.y * scale,
            (anno.width || 120) * scale,
            (anno.height || 22) * scale
          );
          break;
        }

        case 'underline': {
          ctx.beginPath();
          const y = (anno.y + (anno.height || 18)) * scale;
          ctx.moveTo(anno.x * scale, y);
          ctx.lineTo((anno.x + (anno.width || 120)) * scale, y);
          ctx.stroke();
          break;
        }

        case 'strikethrough': {
          ctx.beginPath();
          const y = (anno.y + (anno.height || 18) / 2) * scale;
          ctx.moveTo(anno.x * scale, y);
          ctx.lineTo((anno.x + (anno.width || 120)) * scale, y);
          ctx.stroke();
          break;
        }

        case 'shape-rect': {
          const w = (anno.width || 80) * scale;
          const h = (anno.height || 60) * scale;
          ctx.strokeRect(anno.x * scale, anno.y * scale, w, h);
          break;
        }

        case 'shape-circle': {
          const r = ((anno.width || 60) / 2) * scale;
          ctx.beginPath();
          ctx.arc((anno.x * scale) + r, (anno.y * scale) + r, r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'shape-line': {
          ctx.beginPath();
          ctx.moveTo(anno.x * scale, anno.y * scale);
          ctx.lineTo((anno.x + (anno.width || 100)) * scale, (anno.y + (anno.height || 0)) * scale);
          ctx.stroke();
          break;
        }

        case 'shape-arrow': {
          const x1 = anno.x * scale;
          const y1 = anno.y * scale;
          const x2 = (anno.x + (anno.width || 100)) * scale;
          const y2 = (anno.y + (anno.height || 0)) * scale;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = 14 * scale;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          break;
        }

        case 'text': {
          if (anno.text) {
            const fontSize = (anno.fontSize || 14) * scale;
            let fam = "'Plus Jakarta Sans', sans-serif";
            if (anno.fontFamily === 'Times-Roman' || anno.fontFamily === 'Times') {
              fam = "'Times New Roman', Times, serif";
            } else if (anno.fontFamily === 'Courier') {
              fam = "'JetBrains Mono', Courier, monospace";
            }
            const weight = anno.isBold ? 'bold ' : '';
            const style = anno.isItalic ? 'italic ' : '';
            ctx.font = `${style}${weight}${fontSize}px ${fam}`;
            ctx.textBaseline = 'top';
            const lines = anno.text.split('\n');
            const lineHeight = fontSize * 1.25;
            lines.forEach((line, idx) => {
              ctx.fillText(line, anno.x * scale, (anno.y * scale) + (idx * lineHeight));
            });
          }
          break;
        }

        case 'comment': {
          // Draw sticky note icon badge
          const sz = 24 * scale;
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1.5;
          ctx.fillRect(anno.x * scale, anno.y * scale, sz, sz);
          ctx.strokeRect(anno.x * scale, anno.y * scale, sz, sz);
          ctx.fillStyle = '#854d0e';
          ctx.font = `bold ${10 * scale}px sans-serif`;
          ctx.fillText('N', anno.x * scale + sz / 3, anno.y * scale + sz * 0.7);
          break;
        }

        case 'signature':
        case 'image': {
          if (anno.imageData) {
            const img = new Image();
            img.src = anno.imageData;
            const w = (anno.width || 160) * scale;
            const h = (anno.height || 60) * scale;
            ctx.drawImage(img, anno.x * scale, anno.y * scale, w, h);
          }
          break;
        }
      }

      // Selection bounding box with interactive resize handle
      if (isSelected) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        const w = (anno.width || 80) * scale;
        const h = (anno.height || 30) * scale;
        const bx = anno.x * scale;
        const by = anno.y * scale;
        ctx.strokeRect(bx - 2, by - 2, w + 4, h + 4);
        ctx.setLineDash([]);

        // Draw resize corner handle on bottom-right
        ctx.fillStyle = '#2563eb';
        const handleSize = 7 * Math.max(1, scale * 0.8);
        ctx.fillRect(bx + w - handleSize / 2, by + h - handleSize / 2, handleSize, handleSize);
      }

      ctx.restore();
    });

    // Render in-progress active drawings
    if (isDrawing && drawPoints.length > 1 && toolMode === 'draw') {
      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(drawPoints[0].x * scale, drawPoints[0].y * scale);
      for (let i = 1; i < drawPoints.length; i++) {
        ctx.lineTo(drawPoints[i].x * scale, drawPoints[i].y * scale);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Render in-progress shapes
    if (shapeStart && shapeCurrent) {
      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth * scale;

      const sx = shapeStart.x * scale;
      const sy = shapeStart.y * scale;
      const cx = shapeCurrent.x * scale;
      const cy = shapeCurrent.y * scale;
      const w = cx - sx;
      const h = cy - sy;

      if (toolMode === 'shape-rect') {
        ctx.strokeRect(sx, sy, w, h);
      } else if (toolMode === 'shape-circle') {
        const radius = Math.max(Math.abs(w), Math.abs(h)) / 2;
        ctx.beginPath();
        ctx.arc(sx + w / 2, sy + h / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (toolMode === 'shape-line') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      } else if (toolMode === 'shape-arrow') {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(cx, cy);
        ctx.stroke();

        const angle = Math.atan2(cy - sy, cx - sx);
        const headLen = 14 * scale;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - headLen * Math.cos(angle - Math.PI / 6), cy - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - headLen * Math.cos(angle + Math.PI / 6), cy - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (toolMode === 'highlight') {
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(sx, sy, w, h);
      }
      ctx.restore();
    }
  }, [
    pageAnnotations,
    zoom,
    activeAnnotationId,
    isDrawing,
    drawPoints,
    toolMode,
    selectedColor,
    strokeWidth,
    shapeStart,
    shapeCurrent,
  ]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.width = pageDimensions.width;
      overlayRef.current.height = pageDimensions.height;
    }
    drawOverlay();
  }, [pageDimensions, drawOverlay]);

  // Pointer position relative to unscaled PDF coordinates
  const getPdfCoords = (e: React.MouseEvent<HTMLDivElement>): Point => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only

    if (toolMode === 'hand') {
      setIsPanning(true);
      if (containerRef.current) {
        setPanStart({
          x: e.clientX,
          y: e.clientY,
          scrollLeft: containerRef.current.scrollLeft,
          scrollTop: containerRef.current.scrollTop,
        });
      }
      return;
    }

    const coords = getPdfCoords(e);

    // If active signature ready to drop:
    if (activeSignatureData) {
      const newAnno: Annotation = {
        id: `sig_${Date.now()}`,
        type: 'signature',
        page: currentPage,
        x: coords.x - 80,
        y: coords.y - 30,
        width: 160,
        height: 60,
        imageData: activeSignatureData,
        color: selectedColor,
        opacity: 1,
        timestamp: Date.now(),
      };
      onAddAnnotation(newAnno);
      onConsumeSignature();
      return;
    }

    // If active image ready to drop:
    if (activeImageData) {
      const newAnno: Annotation = {
        id: `img_${Date.now()}`,
        type: 'image',
        page: currentPage,
        x: coords.x - 100,
        y: coords.y - 75,
        width: 200,
        height: 150,
        imageData: activeImageData,
        color: selectedColor,
        opacity: 1,
        timestamp: Date.now(),
      };
      onAddAnnotation(newAnno);
      if (onConsumeImage) onConsumeImage();
      return;
    }

    if (toolMode === 'text' || toolMode === 'comment') {
      setNewTextInput({
        x: coords.x,
        y: coords.y,
        text: '',
        fontSize: 14,
        fontFamily: 'Helvetica',
        isBold: false,
        isItalic: false,
        color: selectedColor,
        isComment: toolMode === 'comment',
      });
      return;
    }

    if (toolMode === 'draw') {
      setIsDrawing(true);
      setDrawPoints([coords]);
      return;
    }

    if (
      toolMode === 'shape-rect' ||
      toolMode === 'shape-circle' ||
      toolMode === 'shape-line' ||
      toolMode === 'shape-arrow' ||
      toolMode === 'highlight' ||
      toolMode === 'underline' ||
      toolMode === 'strikethrough'
    ) {
      setShapeStart(coords);
      setShapeCurrent(coords);
      return;
    }

    if (toolMode === 'select') {
      // 1. Check if clicking on resize handle of currently active annotation
      if (activeAnnotationId) {
        const activeAnno = pageAnnotations.find((a) => a.id === activeAnnotationId);
        if (activeAnno) {
          const aw = activeAnno.width || 80;
          const ah = activeAnno.height || 30;
          const handleTolerance = 12;
          if (
            Math.abs(coords.x - (activeAnno.x + aw)) <= handleTolerance &&
            Math.abs(coords.y - (activeAnno.y + ah)) <= handleTolerance
          ) {
            setDragAction({
              type: 'resize',
              annoId: activeAnno.id,
              startX: coords.x,
              startY: coords.y,
              initialAnnoX: activeAnno.x,
              initialAnnoY: activeAnno.y,
              initialWidth: aw,
              initialHeight: ah,
            });
            return;
          }
        }
      }

      // 2. Check if user clicked on any existing annotation
      const clickedAnno = [...pageAnnotations].reverse().find((anno) => {
        const w = anno.width || 80;
        const h = anno.height || 30;
        return (
          coords.x >= anno.x &&
          coords.x <= anno.x + w &&
          coords.y >= anno.y &&
          coords.y <= anno.y + h
        );
      });

      if (clickedAnno) {
        onSelectAnnotation(clickedAnno.id);
        setDragAction({
          type: 'move',
          annoId: clickedAnno.id,
          startX: coords.x,
          startY: coords.y,
          initialAnnoX: clickedAnno.x,
          initialAnnoY: clickedAnno.y,
          initialWidth: clickedAnno.width || 80,
          initialHeight: clickedAnno.height || 30,
        });
      } else {
        onSelectAnnotation(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && panStart && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    const coords = getPdfCoords(e);

    // Handle annotation moving or resizing
    if (dragAction) {
      const targetAnno = pageAnnotations.find((a) => a.id === dragAction.annoId);
      if (targetAnno) {
        if (dragAction.type === 'move') {
          const dx = coords.x - dragAction.startX;
          const dy = coords.y - dragAction.startY;
          onUpdateAnnotation({
            ...targetAnno,
            x: Math.round(dragAction.initialAnnoX + dx),
            y: Math.round(dragAction.initialAnnoY + dy),
          });
        } else if (dragAction.type === 'resize') {
          const newW = Math.max(20, Math.round(dragAction.initialWidth + (coords.x - dragAction.startX)));
          const newH = Math.max(15, Math.round(dragAction.initialHeight + (coords.y - dragAction.startY)));
          onUpdateAnnotation({
            ...targetAnno,
            width: newW,
            height: newH,
          });
        }
      }
      return;
    }

    if (isDrawing && toolMode === 'draw') {
      setDrawPoints((prev) => [...prev, coords]);
      return;
    }

    if (shapeStart) {
      setShapeCurrent(coords);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (dragAction) {
      setDragAction(null);
      return;
    }

    if (isDrawing && toolMode === 'draw') {
      if (drawPoints.length > 1) {
        const newAnno: Annotation = {
          id: `draw_${Date.now()}`,
          type: 'draw',
          page: currentPage,
          x: drawPoints[0].x,
          y: drawPoints[0].y,
          points: drawPoints,
          color: selectedColor,
          opacity: 1,
          strokeWidth,
          timestamp: Date.now(),
        };
        onAddAnnotation(newAnno);
      }
      setIsDrawing(false);
      setDrawPoints([]);
      return;
    }

    if (shapeStart && shapeCurrent) {
      const minX = Math.min(shapeStart.x, shapeCurrent.x);
      const minY = Math.min(shapeStart.y, shapeCurrent.y);
      const width = Math.abs(shapeCurrent.x - shapeStart.x);
      const height = Math.abs(shapeCurrent.y - shapeStart.y);

      if (width > 5 || height > 5) {
        const newAnno: Annotation = {
          id: `shape_${Date.now()}`,
          type: toolMode,
          page: currentPage,
          x: toolMode.startsWith('shape-') && toolMode !== 'shape-rect' && toolMode !== 'shape-circle' ? shapeStart.x : minX,
          y: toolMode.startsWith('shape-') && toolMode !== 'shape-rect' && toolMode !== 'shape-circle' ? shapeStart.y : minY,
          width: toolMode.startsWith('shape-') && toolMode !== 'shape-rect' && toolMode !== 'shape-circle' ? shapeCurrent.x - shapeStart.x : width,
          height: toolMode.startsWith('shape-') && toolMode !== 'shape-rect' && toolMode !== 'shape-circle' ? shapeCurrent.y - shapeStart.y : height,
          color: selectedColor,
          opacity: toolMode === 'highlight' ? 0.4 : 1,
          strokeWidth,
          timestamp: Date.now(),
        };
        onAddAnnotation(newAnno);
      }

      setShapeStart(null);
      setShapeCurrent(null);
    }
  };

  const submitNewText = () => {
    if (newTextInput && newTextInput.text.trim()) {
      const approxWidth = Math.max(90, newTextInput.text.length * (newTextInput.fontSize * 0.65));
      const approxHeight = Math.max(25, newTextInput.fontSize * 1.6);
      const newAnno: Annotation = {
        id: `text_${Date.now()}`,
        type: newTextInput.isComment ? 'comment' : 'text',
        page: currentPage,
        x: newTextInput.x,
        y: newTextInput.y,
        width: approxWidth,
        height: approxHeight,
        text: newTextInput.text.trim(),
        color: newTextInput.color || selectedColor,
        opacity: 1,
        fontSize: newTextInput.fontSize,
        fontFamily: newTextInput.fontFamily,
        isBold: newTextInput.isBold,
        isItalic: newTextInput.isItalic,
        timestamp: Date.now(),
      };
      onAddAnnotation(newAnno);
    }
    setNewTextInput(null);
  };

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-neutral-200/70 dark:bg-[#121215]">
      {/* Scrollable Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 overflow-auto p-8 flex items-center justify-center ${
          toolMode === 'hand'
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : toolMode === 'select'
            ? 'cursor-default'
            : activeSignatureData || activeImageData
            ? 'cursor-crosshair'
            : 'cursor-crosshair'
        }`}
      >
        {/* PDF Page Container Canvas Box */}
        <div
          className="relative bg-white shadow-xl rounded-xs select-none transition-shadow duration-200"
          style={{
            width: `${pageDimensions.width}px`,
            height: `${pageDimensions.height}px`,
          }}
        >
          {/* Base PDF Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />

          {/* Interactive Annotation Canvas */}
          <canvas
            ref={overlayRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
          />

          {/* Inline Text Creation Input with Rich Styling */}
          {newTextInput && (
            <div
              className="absolute z-20 bg-white dark:bg-neutral-800 p-2.5 rounded-lg shadow-xl border border-neutral-300 dark:border-neutral-700 flex flex-col gap-2"
              style={{
                left: `${newTextInput.x * zoom}px`,
                top: `${newTextInput.y * zoom}px`,
                minWidth: '280px',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  {newTextInput.isComment ? 'Add Sticky Note' : 'Add Text Box'}
                </span>
                <button
                  onClick={() => setNewTextInput(null)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {!newTextInput.isComment && (
                <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-200 dark:border-neutral-700">
                  <select
                    value={newTextInput.fontFamily}
                    onChange={(e) => setNewTextInput({ ...newTextInput, fontFamily: e.target.value })}
                    className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                  >
                    <option value="Helvetica">Helvetica (Sans)</option>
                    <option value="Times-Roman">Times (Serif)</option>
                    <option value="Courier">Courier (Mono)</option>
                  </select>

                  <select
                    value={newTextInput.fontSize}
                    onChange={(e) => setNewTextInput({ ...newTextInput, fontSize: Number(e.target.value) })}
                    className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                  >
                    {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                      <option key={sz} value={sz}>{sz}px</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setNewTextInput({ ...newTextInput, isBold: !newTextInput.isBold })}
                    className={`p-1 rounded border transition-colors ${
                      newTextInput.isBold
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => setNewTextInput({ ...newTextInput, isItalic: !newTextInput.isItalic })}
                    className={`p-1 rounded border transition-colors ${
                      newTextInput.isItalic
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1 ml-auto">
                    {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTextInput({ ...newTextInput, color: c })}
                        className={`w-3.5 h-3.5 rounded-full border ${
                          (newTextInput.color || selectedColor) === c
                            ? 'ring-1 ring-blue-500 scale-110'
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <textarea
                autoFocus
                rows={2}
                value={newTextInput.text}
                onChange={(e) => setNewTextInput({ ...newTextInput, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    submitNewText();
                  } else if (e.key === 'Escape') {
                    setNewTextInput(null);
                  }
                }}
                placeholder={newTextInput.isComment ? 'Type note content...' : 'Enter text to place...'}
                className="w-full text-xs p-1.5 border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-blue-500"
                style={{
                  fontFamily: newTextInput.fontFamily === 'Times-Roman' ? 'serif' : newTextInput.fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
                  fontWeight: newTextInput.isBold ? 'bold' : 'normal',
                  fontStyle: newTextInput.isItalic ? 'italic' : 'normal',
                  color: newTextInput.color || selectedColor,
                }}
              />
              <div className="flex justify-end gap-1.5 pt-0.5">
                <button
                  onClick={() => setNewTextInput(null)}
                  className="px-2 py-1 text-[11px] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={submitNewText}
                  className="px-3 py-1 text-[11px] bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                >
                  Place Text
                </button>
              </div>
            </div>
          )}

          {/* Active selected text annotation properties floating bar */}
          {activeAnnotationId && (() => {
            const activeAnno = pageAnnotations.find((a) => a.id === activeAnnotationId);
            if (!activeAnno || activeAnno.type !== 'text') return null;
            return (
              <div
                className="absolute z-30 bg-white dark:bg-neutral-800 p-1.5 rounded shadow-lg border border-neutral-300 dark:border-neutral-700 flex items-center gap-1.5 text-xs"
                style={{
                  left: `${activeAnno.x * zoom}px`,
                  top: `${Math.max(0, (activeAnno.y * zoom) - 38)}px`,
                }}
              >
                <select
                  value={activeAnno.fontFamily || 'Helvetica'}
                  onChange={(e) => onUpdateAnnotation({ ...activeAnno, fontFamily: e.target.value })}
                  className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times</option>
                  <option value="Courier">Courier</option>
                </select>

                <select
                  value={activeAnno.fontSize || 14}
                  onChange={(e) => onUpdateAnnotation({ ...activeAnno, fontSize: Number(e.target.value) })}
                  className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                >
                  {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                    <option key={sz} value={sz}>{sz}px</option>
                  ))}
                </select>

                <button
                  onClick={() => onUpdateAnnotation({ ...activeAnno, isBold: !activeAnno.isBold })}
                  className={`p-1 rounded border transition-colors ${
                    activeAnno.isBold
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                  }`}
                  title="Toggle Bold"
                >
                  <Bold className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onUpdateAnnotation({ ...activeAnno, isItalic: !activeAnno.isItalic })}
                  className={`p-1 rounded border transition-colors ${
                    activeAnno.isItalic
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                  }`}
                  title="Toggle Italic"
                >
                  <Italic className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1 ml-1">
                  {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdateAnnotation({ ...activeAnno, color: c })}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        activeAnno.color === c
                          ? 'ring-1 ring-blue-500 scale-110'
                          : 'border-neutral-300 dark:border-neutral-600'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Signature Drop Banner */}
          {activeSignatureData && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
              <span>Click anywhere on the document to place your signature</span>
            </div>
          )}

          {/* Image Drop Banner */}
          {activeImageData && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
              <span>Click anywhere on the document to place your image</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isRendering && (
            <div className="absolute inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-20">
              <div className="px-3 py-1.5 bg-neutral-900/80 text-white rounded-md text-xs font-medium">
                Rendering vector PDF...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Navigation Pill Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md border border-neutral-300/80 dark:border-neutral-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-3 z-30 text-xs">
        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-neutral-800 dark:text-neutral-200 tabular-nums px-1">
            {currentPage} / {docProxy ? docProxy.numPages : 1}
          </span>

          <button
            onClick={() => onPageChange(Math.min(docProxy ? docProxy.numPages : 1, currentPage + 1))}
            disabled={!docProxy || currentPage >= docProxy.numPages}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onZoomChange(Math.max(0.3, zoom - 0.15))}
            disabled={zoom <= 0.3}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => onZoomChange(Math.min(3.0, zoom + 0.15))}
            disabled={zoom >= 3.0}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Delete selected annotation button if any is selected */}
        {activeAnnotationId && (
          <>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
            <button
              onClick={() => {
                onDeleteAnnotation(activeAnnotationId);
                onSelectAnnotation(null);
              }}
              className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded"
              title="Delete Selected Item"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Delete Item</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
