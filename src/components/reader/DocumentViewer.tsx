import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  Bold,
  Italic,
} from 'lucide-react';
import { Annotation, EditableTextBlock, ToolMode, Point } from '../../types/pdf';
import { pdfEngine } from '../../services/pdfEngine';
import { PdfTextEditorLayer } from '../editor/PdfTextEditorLayer';

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
  editableBlocks?: EditableTextBlock[];
  selectedTextBlockId?: string | null;
  editingTextBlockId?: string | null;
  onSelectTextBlock?: (id: string | null) => void;
  onStartEditingTextBlock?: (id: string | null) => void;
  onUpdateTextBlock?: (block: EditableTextBlock, recordHistory?: boolean) => void;
  onCommitTextBlockDragHistory?: (beforeBlock: EditableTextBlock) => void;
  onDeleteTextBlock?: (id: string) => void;
  onCreateNewTextBlockAt?: (x: number, y: number) => void;
}

interface PageBaseSize {
  width: number;
  height: number;
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
  editableBlocks = [],
  selectedTextBlockId = null,
  editingTextBlockId = null,
  onSelectTextBlock,
  onStartEditingTextBlock,
  onUpdateTextBlock,
  onCommitTextBlockDragHistory,
  onDeleteTextBlock,
  onCreateNewTextBlockAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageBoxRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const overlayRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const renderTaskKeysRef = useRef<Record<number, string>>({});

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  const isScrollDrivenPageUpdateRef = useRef(false);
  const lastProgrammaticPageRef = useRef<number>(currentPage);

  const numPages: number = docProxy?.numPages || 1;
  const [pageBaseSizes, setPageBaseSizes] = useState<Record<number, PageBaseSize>>({});
  const [renderedPages, setRenderedPages] = useState<Record<number, boolean>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeInteractionPage, setActiveInteractionPage] = useState<number>(currentPage);
  const [drawPoints, setDrawPoints] = useState<Point[]>([]);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<Point | null>(null);

  const [newTextInput, setNewTextInput] = useState<{
    page: number;
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

  const [dragAction, setDragAction] = useState<{
    type: 'move' | 'resize';
    annoId: string;
    page: number;
    startX: number;
    startY: number;
    initialAnnoX: number;
    initialAnnoY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  // Measure unscaled page sizes across document when docProxy or rotation changes
  useEffect(() => {
    let cancelled = false;
    if (!docProxy) return;

    renderTaskKeysRef.current = {};
    setRenderedPages({});

    (async () => {
      const sizes: Record<number, PageBaseSize> = {};
      for (let p = 1; p <= docProxy.numPages; p++) {
        if (cancelled) return;
        try {
          const dims = await pdfEngine.getPageDimensions(docProxy, p, rotation);
          sizes[p] = { width: dims.width, height: dims.height };
        } catch {
          sizes[p] = { width: 595, height: 842 };
        }
        // Flush first batch quickly so initial layout is instant
        if (p === 1 || p === docProxy.numPages || p % 10 === 0) {
          if (!cancelled) setPageBaseSizes({ ...sizes });
        }
      }
      if (!cancelled) setPageBaseSizes(sizes);
    })();

    return () => {
      cancelled = true;
    };
  }, [docProxy, rotation]);

  // Reset render cache on zoom / rotation / document change so pages crisp re-render
  useEffect(() => {
    renderTaskKeysRef.current = {};
  }, [docProxy, zoom, rotation]);

  const renderSinglePage = useCallback(
    async (pageNum: number) => {
      const canvas = canvasRefs.current[pageNum];
      if (!docProxy || !canvas) return;
      const key = `${docProxy?.fingerprints?.[0] || 'doc'}_${pageNum}_${zoom}_${rotation}`;
      if (renderTaskKeysRef.current[pageNum] === key) return;
      renderTaskKeysRef.current[pageNum] = key;

      try {
        await pdfEngine.renderPageToCanvas(docProxy, pageNum, canvas, zoom, rotation);
        setRenderedPages((prev) => ({ ...prev, [pageNum]: true }));
      } catch (err) {
        if (renderTaskKeysRef.current[pageNum] === key) {
          delete renderTaskKeysRef.current[pageNum];
        }
        console.error(`Page ${pageNum} render failed`, err);
      }
    },
    [docProxy, zoom, rotation]
  );

  // Render pages near currentPage + any page visible via IntersectionObserver
  useEffect(() => {
    if (!docProxy) return;
    const minP = Math.max(1, currentPage - 1);
    const maxP = Math.min(numPages, currentPage + 2);
    for (let p = minP; p <= maxP; p++) {
      renderSinglePage(p);
    }
  }, [docProxy, numPages, currentPage, zoom, rotation, pageBaseSizes, renderSinglePage]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !docProxy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pStr = (entry.target as HTMLElement).dataset.pageNumber;
            const pNum = Number(pStr);
            if (pNum >= 1 && pNum <= numPages) {
              renderSinglePage(pNum);
            }
          }
        }
      },
      { root, rootMargin: '450px 0px' }
    );

    for (let p = 1; p <= numPages; p++) {
      const el = pageBoxRefs.current[p];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [docProxy, numPages, zoom, rotation, pageBaseSizes, renderSinglePage]);

  // Ctrl + Mouse Wheel smooth zoom (prevent browser viewport zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const oldZoom = zoomRef.current;
        const step = e.deltaY < 0 ? 0.12 : -0.12;
        const nextZoom = Math.max(0.25, Math.min(4.0, Math.round((oldZoom + step) * 100) / 100));
        if (nextZoom === oldZoom) return;

        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left + container.scrollLeft;
        const cursorY = e.clientY - rect.top + container.scrollTop;
        const ratio = nextZoom / oldZoom;

        onZoomChangeRef.current(nextZoom);

        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          containerRef.current.scrollLeft = cursorX * ratio - (e.clientX - rect.left);
          containerRef.current.scrollTop = cursorY * ratio - (e.clientY - rect.top);
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Scroll listener to automatically sync currentPage when user scrolls vertically across pages
  const handleViewportScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const targetY = cRect.top + cRect.height * 0.4;

    let closestPage = currentPageRef.current;
    let closestDist = Infinity;

    for (let p = 1; p <= numPages; p++) {
      const el = pageBoxRefs.current[p];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= targetY && r.bottom >= targetY) {
        closestPage = p;
        closestDist = 0;
        break;
      }
      const dist = Math.min(Math.abs(r.top - targetY), Math.abs(r.bottom - targetY));
      if (dist < closestDist) {
        closestDist = dist;
        closestPage = p;
      }
    }

    if (closestPage !== currentPageRef.current) {
      isScrollDrivenPageUpdateRef.current = true;
      onPageChangeRef.current(closestPage);
    }
  }, [numPages]);

  const hasRestoredInitialPageRef = useRef(false);

  // Scroll to restored page once when switching back to a tab that was scrolled down
  useEffect(() => {
    if (hasRestoredInitialPageRef.current) return;
    if (!pageBaseSizes[currentPage]) return;
    hasRestoredInitialPageRef.current = true;
    lastProgrammaticPageRef.current = currentPage;
    if (currentPage <= 1) return;

    const el = pageBoxRefs.current[currentPage];
    const container = containerRef.current;
    if (el && container) {
      const containerTop = container.getBoundingClientRect().top;
      const pageTop = el.getBoundingClientRect().top;
      const targetScrollTop = container.scrollTop + (pageTop - containerTop) - 24;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'auto' });
    }
  }, [currentPage, pageBaseSizes]);

  // Programmatic scroll to page when user clicks sidebar thumbnail, Next/Prev, search match, or arrow keys
  useEffect(() => {
    if (isScrollDrivenPageUpdateRef.current) {
      isScrollDrivenPageUpdateRef.current = false;
      lastProgrammaticPageRef.current = currentPage;
      return;
    }
    if (lastProgrammaticPageRef.current === currentPage) return;
    lastProgrammaticPageRef.current = currentPage;

    const el = pageBoxRefs.current[currentPage];
    const container = containerRef.current;
    if (el && container) {
      const containerTop = container.getBoundingClientRect().top;
      const pageTop = el.getBoundingClientRect().top;
      const targetScrollTop = container.scrollTop + (pageTop - containerTop) - 24;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    }
  }, [currentPage]);

  // Draw overlay annotations for any specific page
  const drawPageOverlay = useCallback(
    (pageNum: number) => {
      const canvas = overlayRefs.current[pageNum];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scale = zoom;
      const pageAnnos = annotations.filter((a) => a.page === pageNum);

      pageAnnos.forEach((anno) => {
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
            ctx.arc(anno.x * scale + r, anno.y * scale + r, r, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }

          case 'shape-line': {
            ctx.beginPath();
            ctx.moveTo(anno.x * scale, anno.y * scale);
            ctx.lineTo(
              (anno.x + (anno.width || 100)) * scale,
              (anno.y + (anno.height || 0)) * scale
            );
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
            ctx.lineTo(
              x2 - headLen * Math.cos(angle - Math.PI / 6),
              y2 - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(x2, y2);
            ctx.lineTo(
              x2 - headLen * Math.cos(angle + Math.PI / 6),
              y2 - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            break;
          }

          case 'text': {
            if (anno.text) {
              const fontSize = (anno.fontSize || 14) * scale;
              let fam = 'Arial, Helvetica, sans-serif';
              if (anno.fontFamily === 'Times-Roman' || anno.fontFamily === 'Times') {
                fam = "'Times New Roman', Times, serif";
              } else if (anno.fontFamily === 'Courier') {
                fam = "'Courier New', Courier, monospace";
              }
              const weight = anno.isBold ? 'bold ' : '';
              const style = anno.isItalic ? 'italic ' : '';
              ctx.font = `${style}${weight}${fontSize}px ${fam}`;
              ctx.textBaseline = 'top';
              const lines = anno.text.split('\n');
              const lineHeight = fontSize * 1.25;
              lines.forEach((line, idx) => {
                ctx.fillText(line, anno.x * scale, anno.y * scale + idx * lineHeight);
              });
            }
            break;
          }

          case 'comment': {
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

          ctx.fillStyle = '#2563eb';
          const handleSize = 7 * Math.max(1, scale * 0.8);
          ctx.fillRect(bx + w - handleSize / 2, by + h - handleSize / 2, handleSize, handleSize);
        }

        ctx.restore();
      });

      // Live in-progress drawing on activeInteractionPage
      if (isDrawing && pageNum === activeInteractionPage && drawPoints.length > 1 && toolMode === 'draw') {
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

      if (shapeStart && shapeCurrent && pageNum === activeInteractionPage) {
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
          ctx.lineTo(
            cx - headLen * Math.cos(angle - Math.PI / 6),
            cy - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx - headLen * Math.cos(angle + Math.PI / 6),
            cy - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        } else if (toolMode === 'highlight') {
          ctx.fillStyle = selectedColor;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(sx, sy, w, h);
        }
        ctx.restore();
      }
    },
    [
      annotations,
      zoom,
      activeAnnotationId,
      isDrawing,
      activeInteractionPage,
      drawPoints,
      toolMode,
      selectedColor,
      strokeWidth,
      shapeStart,
      shapeCurrent,
    ]
  );

  // Sync overlay canvas dimensions & redraw across rendered pages
  useEffect(() => {
    for (let p = 1; p <= numPages; p++) {
      const overlay = overlayRefs.current[p];
      const base = pageBaseSizes[p] || { width: 595, height: 842 };
      const w = Math.floor(base.width * zoom);
      const h = Math.floor(base.height * zoom);
      if (overlay) {
        if (overlay.width !== w || overlay.height !== h) {
          overlay.width = w;
          overlay.height = h;
        }
        drawPageOverlay(p);
      }
    }
  }, [numPages, pageBaseSizes, zoom, drawPageOverlay, renderedPages]);

  const getPdfCoordsForPage = (e: React.MouseEvent<HTMLDivElement>, pageNum: number): Point => {
    const pageEl = pageBoxRefs.current[pageNum];
    if (!pageEl) return { x: 0, y: 0 };
    const rect = pageEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handlePageMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (e.button !== 0) return;

    if (pageNum !== currentPage) {
      isScrollDrivenPageUpdateRef.current = true;
      onPageChange(pageNum);
    }
    setActiveInteractionPage(pageNum);

    if (toolMode === 'edit-text') return;

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

    const coords = getPdfCoordsForPage(e, pageNum);

    if (activeSignatureData) {
      onAddAnnotation({
        id: `sig_${Date.now()}`,
        type: 'signature',
        page: pageNum,
        x: coords.x - 80,
        y: coords.y - 30,
        width: 160,
        height: 60,
        imageData: activeSignatureData,
        color: selectedColor,
        opacity: 1,
        timestamp: Date.now(),
      });
      onConsumeSignature();
      return;
    }

    if (activeImageData) {
      onAddAnnotation({
        id: `img_${Date.now()}`,
        type: 'image',
        page: pageNum,
        x: coords.x - 100,
        y: coords.y - 75,
        width: 200,
        height: 150,
        imageData: activeImageData,
        color: selectedColor,
        opacity: 1,
        timestamp: Date.now(),
      });
      if (onConsumeImage) onConsumeImage();
      return;
    }

    if (toolMode === 'text' || toolMode === 'comment') {
      setNewTextInput({
        page: pageNum,
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
      const pageAnnos = annotations.filter((a) => a.page === pageNum);
      if (activeAnnotationId) {
        const activeAnno = pageAnnos.find((a) => a.id === activeAnnotationId);
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
              page: pageNum,
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

      const clickedAnno = [...pageAnnos].reverse().find((anno) => {
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
          page: pageNum,
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

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && panStart && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft = panStart.scrollLeft - dx;
      containerRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    const targetPage = dragAction?.page || activeInteractionPage;
    const coords = getPdfCoordsForPage(e, targetPage);

    if (dragAction) {
      const targetAnno = annotations.find((a) => a.id === dragAction.annoId);
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
          const newW = Math.max(
            20,
            Math.round(dragAction.initialWidth + (coords.x - dragAction.startX))
          );
          const newH = Math.max(
            15,
            Math.round(dragAction.initialHeight + (coords.y - dragAction.startY))
          );
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

  const handleContainerMouseUp = () => {
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
        onAddAnnotation({
          id: `draw_${Date.now()}`,
          type: 'draw',
          page: activeInteractionPage,
          x: drawPoints[0].x,
          y: drawPoints[0].y,
          points: drawPoints,
          color: selectedColor,
          opacity: 1,
          strokeWidth,
          timestamp: Date.now(),
        });
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
        onAddAnnotation({
          id: `shape_${Date.now()}`,
          type: toolMode,
          page: activeInteractionPage,
          x:
            toolMode.startsWith('shape-') &&
            toolMode !== 'shape-rect' &&
            toolMode !== 'shape-circle'
              ? shapeStart.x
              : minX,
          y:
            toolMode.startsWith('shape-') &&
            toolMode !== 'shape-rect' &&
            toolMode !== 'shape-circle'
              ? shapeStart.y
              : minY,
          width:
            toolMode.startsWith('shape-') &&
            toolMode !== 'shape-rect' &&
            toolMode !== 'shape-circle'
              ? shapeCurrent.x - shapeStart.x
              : width,
          height:
            toolMode.startsWith('shape-') &&
            toolMode !== 'shape-rect' &&
            toolMode !== 'shape-circle'
              ? shapeCurrent.y - shapeStart.y
              : height,
          color: selectedColor,
          opacity: toolMode === 'highlight' ? 0.4 : 1,
          strokeWidth,
          timestamp: Date.now(),
        });
      }

      setShapeStart(null);
      setShapeCurrent(null);
    }
  };

  const submitNewText = () => {
    if (newTextInput && newTextInput.text.trim()) {
      const approxWidth = Math.max(90, newTextInput.text.length * (newTextInput.fontSize * 0.65));
      const approxHeight = Math.max(25, newTextInput.fontSize * 1.6);
      onAddAnnotation({
        id: `text_${Date.now()}`,
        type: newTextInput.isComment ? 'comment' : 'text',
        page: newTextInput.page,
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
      });
    }
    setNewTextInput(null);
  };

  const pagesArray = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-neutral-200/70 dark:bg-[#121215]">
      {/* Continuous Vertical Scrollable Multi-Page Viewport */}
      <div
        ref={containerRef}
        onScroll={handleViewportScroll}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        className={`flex-1 overflow-auto p-6 sm:p-8 ${
          toolMode === 'hand'
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : toolMode === 'select'
            ? 'cursor-default'
            : 'cursor-crosshair'
        }`}
      >
        <div className="w-fit min-w-full flex flex-col items-center gap-6 pb-16">
          {pagesArray.map((pageNum) => {
            const base = pageBaseSizes[pageNum] || { width: 595, height: 842 };
            const scaledWidth = Math.floor(base.width * zoom);
            const scaledHeight = Math.floor(base.height * zoom);
            const isActivePage = pageNum === currentPage;
            const activeAnnoOnPage = activeAnnotationId
              ? annotations.find((a) => a.id === activeAnnotationId && a.page === pageNum)
              : null;

            return (
              <div
                key={pageNum}
                data-page-number={pageNum}
                ref={(el) => {
                  pageBoxRefs.current[pageNum] = el;
                }}
                onMouseDown={(e) => handlePageMouseDown(e, pageNum)}
                className={`relative shrink-0 bg-white shadow-xl rounded-xs select-none transition-shadow duration-150 ${
                  isActivePage ? 'ring-1 ring-blue-500/30' : ''
                }`}
                style={{
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                }}
              >
                {/* Base PDF Page Canvas */}
                <canvas
                  ref={(el) => {
                    canvasRefs.current[pageNum] = el;
                  }}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />

                {/* Interactive Annotation Canvas */}
                <canvas
                  ref={(el) => {
                    overlayRefs.current[pageNum] = el;
                  }}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                />

                {/* Existing PDF Text Editing Layer on active page (click/drag to select, move, resize, edit) */}
                {toolMode === 'edit-text' &&
                  isActivePage &&
                  onSelectTextBlock &&
                  onStartEditingTextBlock &&
                  onUpdateTextBlock &&
                  onCommitTextBlockDragHistory &&
                  onDeleteTextBlock &&
                  onCreateNewTextBlockAt && (
                    <PdfTextEditorLayer
                      docProxy={docProxy}
                      baseCanvasRef={{ current: canvasRefs.current[pageNum] || null }}
                      currentPage={pageNum}
                      zoom={zoom}
                      rotation={rotation}
                      blocks={editableBlocks}
                      selectedBlockId={selectedTextBlockId}
                      editingBlockId={editingTextBlockId}
                      onSelectBlock={onSelectTextBlock}
                      onStartEditingBlock={onStartEditingTextBlock}
                      onUpdateBlock={onUpdateTextBlock}
                      onCommitBlockDragHistory={onCommitTextBlockDragHistory}
                      onDeleteBlock={onDeleteTextBlock}
                      onCreateNewBlockAt={onCreateNewTextBlockAt}
                    />
                  )}

                {/* Inline Text Creation Input */}
                {newTextInput && newTextInput.page === pageNum && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute z-30 bg-white dark:bg-neutral-800 p-2.5 rounded-lg shadow-xl border border-neutral-300 dark:border-neutral-700 flex flex-col gap-2"
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
                          onChange={(e) =>
                            setNewTextInput({ ...newTextInput, fontFamily: e.target.value })
                          }
                          className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                        >
                          <option value="Helvetica">Helvetica (Sans)</option>
                          <option value="Times-Roman">Times (Serif)</option>
                          <option value="Courier">Courier (Mono)</option>
                        </select>

                        <select
                          value={newTextInput.fontSize}
                          onChange={(e) =>
                            setNewTextInput({
                              ...newTextInput,
                              fontSize: Number(e.target.value),
                            })
                          }
                          className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                        >
                          {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}px
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() =>
                            setNewTextInput({ ...newTextInput, isBold: !newTextInput.isBold })
                          }
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
                          onClick={() =>
                            setNewTextInput({ ...newTextInput, isItalic: !newTextInput.isItalic })
                          }
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
                      onChange={(e) =>
                        setNewTextInput({ ...newTextInput, text: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          submitNewText();
                        } else if (e.key === 'Escape') {
                          setNewTextInput(null);
                        }
                      }}
                      placeholder={
                        newTextInput.isComment ? 'Type note content...' : 'Enter text to place...'
                      }
                      className="w-full text-xs p-1.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white text-neutral-900 focus:outline-none focus:border-blue-500"
                      style={{
                        fontFamily:
                          newTextInput.fontFamily === 'Times-Roman'
                            ? 'serif'
                            : newTextInput.fontFamily === 'Courier'
                            ? 'monospace'
                            : 'sans-serif',
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
                {activeAnnoOnPage && activeAnnoOnPage.type === 'text' && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute z-30 bg-white dark:bg-neutral-800 p-1.5 rounded shadow-lg border border-neutral-300 dark:border-neutral-700 flex items-center gap-1.5 text-xs"
                    style={{
                      left: `${activeAnnoOnPage.x * zoom}px`,
                      top: `${Math.max(0, activeAnnoOnPage.y * zoom - 38)}px`,
                    }}
                  >
                    <select
                      value={activeAnnoOnPage.fontFamily || 'Helvetica'}
                      onChange={(e) =>
                        onUpdateAnnotation({ ...activeAnnoOnPage, fontFamily: e.target.value })
                      }
                      className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                    >
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times-Roman">Times</option>
                      <option value="Courier">Courier</option>
                    </select>

                    <select
                      value={activeAnnoOnPage.fontSize || 14}
                      onChange={(e) =>
                        onUpdateAnnotation({
                          ...activeAnnoOnPage,
                          fontSize: Number(e.target.value),
                        })
                      }
                      className="h-6 px-1 text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200 focus:outline-none"
                    >
                      {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}px
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() =>
                        onUpdateAnnotation({
                          ...activeAnnoOnPage,
                          isBold: !activeAnnoOnPage.isBold,
                        })
                      }
                      className={`p-1 rounded border transition-colors ${
                        activeAnnoOnPage.isBold
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                      }`}
                      title="Toggle Bold"
                    >
                      <Bold className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() =>
                        onUpdateAnnotation({
                          ...activeAnnoOnPage,
                          isItalic: !activeAnnoOnPage.isItalic,
                        })
                      }
                      className={`p-1 rounded border transition-colors ${
                        activeAnnoOnPage.isItalic
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
                          onClick={() => onUpdateAnnotation({ ...activeAnnoOnPage, color: c })}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            activeAnnoOnPage.color === c
                              ? 'ring-1 ring-blue-500 scale-110'
                              : 'border-neutral-300 dark:border-neutral-600'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!renderedPages[pageNum] && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded text-[11px] font-medium border border-neutral-200 dark:border-neutral-700">
                      Loading Page {pageNum}...
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Placement Banners */}
      {activeSignatureData && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
          <span>Click anywhere on a page to place your signature</span>
        </div>
      )}
      {activeImageData && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md z-30 pointer-events-none flex items-center gap-1.5 animate-bounce">
          <span>Click anywhere on a page to place your image</span>
        </div>
      )}

      {/* Floating Bottom Navigation Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md border border-neutral-300/80 dark:border-neutral-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-3 z-30 text-xs">
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
            {currentPage} / {numPages}
          </span>

          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />

        <div className="flex items-center gap-1.5" title="Use Ctrl + Mouse Wheel to Zoom">
          <button
            onClick={() => onZoomChange(Math.max(0.25, Math.round((zoom - 0.15) * 100) / 100))}
            disabled={zoom <= 0.25}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => onZoomChange(Math.min(4.0, Math.round((zoom + 0.15) * 100) / 100))}
            disabled={zoom >= 4.0}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 text-neutral-700 dark:text-neutral-300"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {activeAnnotationId && (
          <>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
            <button
              onClick={() => {
                onDeleteAnnotation(activeAnnotationId);
                onSelectAnnotation(null);
              }}
              className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded"
              title="Delete Selected Item (Delete)"
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
