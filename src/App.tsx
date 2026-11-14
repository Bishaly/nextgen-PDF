/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { RibbonBar } from './components/layout/RibbonBar';
import { Sidebar } from './components/layout/Sidebar';
import { DocumentViewer } from './components/reader/DocumentViewer';
import { HomeWelcomeView } from './components/home/HomeWelcomeView';
import { SignatureModal } from './components/modals/SignatureModal';
import { WatermarkModal } from './components/modals/WatermarkModal';
import { MergeModal } from './components/modals/MergeModal';
import { SplitModal } from './components/modals/SplitModal';
import { CompressModal } from './components/modals/CompressModal';
import { ProtectModal } from './components/modals/ProtectModal';
import { BlankPageModal } from './components/modals/BlankPageModal';
import { ConvertModal } from './components/converter/ConvertModal';
import { OcrModal } from './components/ocr/OcrModal';
import { HelpModal } from './components/modals/HelpModal';
import { PasswordPromptModal } from './components/modals/PasswordPromptModal';
import { PageOrganizerView } from './components/tools/PageOrganizerView';
import { SettingsModal } from './components/modals/SettingsModal';
import { EditTextToolbar } from './components/editor/EditTextToolbar';

import {
  DocumentInfo,
  MainTab,
  ToolMode,
  Annotation,
  BookmarkItem,
  RecentFile,
  EditableTextBlock,
  EditableFontFamily,
  PageEditDiagnostics,
  TextAlignment,
} from './types/pdf';
import { pdfEngine } from './services/pdfEngine';
import { pdfEditorService } from './services/pdfEditorService';
import { pdfTextEditEngine } from './services/pdfTextEditEngine';
import { storageService } from './services/storageService';
import { createSampleReportPdf } from './services/samplePdfs';
import { desktopBridge } from './services/desktopBridge';

export default function App() {
  // Theme & Window State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active View & Tab
  const [activeTab, setActiveTab] = useState<MainTab>('read');
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Document State
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [docProxy, setDocProxy] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  // Annotations & Existing-PDF Text Editing State (Unified Undo/Redo)
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editableBlocks, setEditableBlocks] = useState<EditableTextBlock[]>([]);
  const [analyzedPages, setAnalyzedPages] = useState<Record<number, PageEditDiagnostics>>({});
  const [isAnalyzingPageText, setIsAnalyzingPageText] = useState(false);
  const [isCommittingTextEdits, setIsCommittingTextEdits] = useState(false);
  const [selectedTextBlockId, setSelectedTextBlockId] = useState<string | null>(null);
  const [editingTextBlockId, setEditingTextBlockId] = useState<string | null>(null);
  const [textEditorStyle, setTextEditorStyle] = useState<{
    fontFamily: EditableFontFamily;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
    color: string;
    align: TextAlignment;
  }>({
    fontFamily: 'Helvetica',
    fontSize: 12,
    isBold: false,
    isItalic: false,
    color: '#000000',
    align: 'left',
  });

  const [undoStack, setUndoStack] = useState<
    Array<{ annotations: Annotation[]; editableBlocks: EditableTextBlock[] }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{ annotations: Annotation[]; editableBlocks: EditableTextBlock[] }>
  >([]);
  const lastTypedBlockRef = useRef<string | null>(null);

  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [thumbnails, setThumbnails] = useState<{ [page: number]: string }>({});
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Signature & Image placement staging
  const [activeSignatureData, setActiveSignatureData] = useState<string | null>(null);
  const [activeImageData, setActiveImageData] = useState<string | null>(null);

  // Modals state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isCompressModalOpen, setIsCompressModalOpen] = useState(false);
  const [isProtectModalOpen, setIsProtectModalOpen] = useState(false);
  const [isBlankPageModalOpen, setIsBlankPageModalOpen] = useState(false);
  const [convertModalType, setConvertModalType] = useState<string | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{
    data: Uint8Array;
    name: string;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Sync theme class on document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load saved settings & recent files on launch
  useEffect(() => {
    (async () => {
      const settings = await storageService.getSettings();
      setTheme(settings.theme);
      const recents = await storageService.getRecentFiles();
      setRecentFiles(recents);
    })();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    storageService.saveSettings({ ...storageService.getSettings(), theme: next } as any);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Helper to load document bytes into PDF.js and state
  const loadPdfBytes = useCallback(
    async (
      data: Uint8Array,
      fileName: string,
      password?: string,
      options?: { preserveToolAndPage?: number }
    ) => {
      try {
        const proxy = await pdfEngine.loadDocument(data, password);
        setDocProxy(proxy);

        const docId = `${fileName}_${Date.now()}`;
        const info: DocumentInfo = {
          id: docId,
          name: fileName,
          size: data.byteLength,
          pageCount: proxy.numPages,
          data,
          lastModified: Date.now(),
        };

        setDocumentInfo(info);
        setCurrentPage(
          options?.preserveToolAndPage
            ? Math.min(options.preserveToolAndPage, proxy.numPages)
            : 1
        );
        setRotation(0);
        if (!options?.preserveToolAndPage) {
          setZoom(1.0);
          setActiveTab('read');
        }
        setAnnotations([]);
        setEditableBlocks([]);
        setAnalyzedPages({});
        setSelectedTextBlockId(null);
        setEditingTextBlockId(null);
        setUndoStack([]);
        setRedoStack([]);
        setHasUnsavedChanges(false);
        setPasswordPrompt(null);

      // Load bookmarks
      const outline = await pdfEngine.getBookmarks(proxy);
      setBookmarks(outline);

      // Generate thumbnails in background
      const thumbMap: { [page: number]: string } = {};
      const maxThumbPages = Math.min(proxy.numPages, 30);
      for (let i = 1; i <= maxThumbPages; i++) {
        const thumb = await pdfEngine.renderThumbnail(proxy, i, 120);
        thumbMap[i] = thumb;
      }
      setThumbnails(thumbMap);

      // Save to recent files
      const firstThumb = thumbMap[1] || '';
      const recentItem: RecentFile = {
        id: docId,
        name: fileName,
        size: data.byteLength,
        pageCount: proxy.numPages,
        timestamp: Date.now(),
        thumbnail: firstThumb,
      };
      await storageService.addRecentFile(recentItem, data);
      const updatedRecents = await storageService.getRecentFiles();
      setRecentFiles(updatedRecents);
    } catch (err: any) {
      console.error('Failed to load PDF document', err);
      if (err.name === 'PasswordException' || err.message?.includes('password')) {
        setPasswordPrompt({
          data,
          name: fileName,
          error: password ? 'Incorrect password. Please try again.' : undefined,
        });
      } else {
        alert('Could not open PDF: ' + (err.message || 'Unknown error'));
      }
    }
  }, []);

  // Open file from local filesystem or Windows native dialog
  const handleOpenFile = async () => {
    if (desktopBridge.isElectron()) {
      const file = await desktopBridge.openPdf();
      if (file) {
        await loadPdfBytes(file.data, file.name);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await loadPdfBytes(bytes, file.name);
    }
  };

  // Open sample PDF
  const handleOpenSample = async () => {
    try {
      const sampleBytes = await createSampleReportPdf();
      await loadPdfBytes(sampleBytes, 'Annual_Business_Report_2026.pdf');
    } catch (err) {
      console.error('Failed to create sample PDF', err);
    }
  };

  // Open recent file from IndexedDB
  const handleOpenRecent = async (file: RecentFile) => {
    const cachedData = await storageService.getCachedPdf(file.id);
    if (cachedData) {
      await loadPdfBytes(cachedData, file.name);
    } else {
      alert('Cached document not found. Please browse to open the file.');
      storageService.removeRecentFile(file.id);
      setRecentFiles((prev) => prev.filter((f) => f.id !== file.id));
    }
  };

  const handleRemoveRecent = async (id: string) => {
    await storageService.removeRecentFile(id);
    setRecentFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Automatically analyze current PDF page text & fonts when Edit Text tool is active
  useEffect(() => {
    if (toolMode !== 'edit-text' || !docProxy || !documentInfo) return;
    if (analyzedPages[currentPage]) return;

    let cancelled = false;
    setIsAnalyzingPageText(true);

    pdfTextEditEngine
      .analyzeAndExtractPageText(documentInfo.data, docProxy, currentPage)
      .then(({ blocks, diagnostics }) => {
        if (cancelled) return;
        setAnalyzedPages((prev) => ({ ...prev, [currentPage]: diagnostics }));
        setEditableBlocks((prev) => {
          const existingOtherPages = prev.filter((b) => b.page !== currentPage);
          const newOnCurrent = prev.filter((b) => b.page === currentPage && b.source === 'new');
          return [...existingOtherPages, ...blocks, ...newOnCurrent];
        });
      })
      .catch((err) => {
        console.error('Failed to analyze PDF page text', err);
      })
      .finally(() => {
        if (!cancelled) setIsAnalyzingPageText(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toolMode, docProxy, documentInfo, currentPage, analyzedPages]);

  // Helper to push unified Undo history snapshot
  const pushHistorySnapshot = useCallback(
    (snapAnnotations = annotations, snapBlocks = editableBlocks) => {
      setUndoStack((prev) => [
        ...prev.slice(-49),
        {
          annotations: snapAnnotations.map((a) => ({ ...a })),
          editableBlocks: snapBlocks.map((b) => ({ ...b })),
        },
      ]);
      setRedoStack([]);
    },
    [annotations, editableBlocks]
  );

  // Annotations management with unified Undo / Redo history
  const handleAddAnnotation = (anno: Annotation) => {
    pushHistorySnapshot();
    setAnnotations((prev) => [...prev, anno]);
    setHasUnsavedChanges(true);
  };

  const handleUpdateAnnotation = (anno: Annotation) => {
    pushHistorySnapshot();
    setAnnotations((prev) => prev.map((a) => (a.id === anno.id ? anno : a)));
    setHasUnsavedChanges(true);
  };

  const handleDeleteAnnotation = (id: string) => {
    pushHistorySnapshot();
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (activeAnnotationId === id) setActiveAnnotationId(null);
    setHasUnsavedChanges(true);
  };

  const handleClearAnnotations = () => {
    if (confirm('Clear all annotations on this page?')) {
      pushHistorySnapshot();
      setAnnotations((prev) => prev.filter((a) => a.page !== currentPage));
      setActiveAnnotationId(null);
      setHasUnsavedChanges(true);
    }
  };

  // Existing PDF Text Editing handlers
  const handleStartEditingTextBlock = (id: string | null) => {
    if (!id) {
      lastTypedBlockRef.current = null;
    }
    setEditingTextBlockId(id);
  };

  const handleUpdateTextBlock = useCallback(
    (updated: EditableTextBlock, recordHistory = true) => {
      if (recordHistory && lastTypedBlockRef.current !== updated.id) {
        pushHistorySnapshot();
        lastTypedBlockRef.current = updated.id;
      }
      setEditableBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setHasUnsavedChanges(true);
    },
    [pushHistorySnapshot]
  );

  const handleCommitTextBlockDragHistory = useCallback(
    (beforeBlock: EditableTextBlock) => {
      const current = editableBlocks.find((b) => b.id === beforeBlock.id);
      if (
        current &&
        (current.x !== beforeBlock.x ||
          current.y !== beforeBlock.y ||
          current.width !== beforeBlock.width ||
          current.height !== beforeBlock.height)
      ) {
        const prevSnapshot = editableBlocks.map((b) =>
          b.id === beforeBlock.id ? beforeBlock : { ...b }
        );
        pushHistorySnapshot(annotations, prevSnapshot);
      }
    },
    [editableBlocks, annotations, pushHistorySnapshot]
  );

  const handleDeleteTextBlock = useCallback(
    (id: string) => {
      const target = editableBlocks.find((b) => b.id === id);
      if (!target) return;
      pushHistorySnapshot();
      if (target.source === 'new') {
        setEditableBlocks((prev) => prev.filter((b) => b.id !== id));
      } else {
        setEditableBlocks((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isDeleted: true, isModified: true } : b))
        );
      }
      if (selectedTextBlockId === id) setSelectedTextBlockId(null);
      if (editingTextBlockId === id) setEditingTextBlockId(null);
      setHasUnsavedChanges(true);
    },
    [editableBlocks, pushHistorySnapshot, selectedTextBlockId, editingTextBlockId]
  );

  const handleCreateNewTextBlockAt = useCallback(
    (x: number, y: number) => {
      pushHistorySnapshot();
      const newId = `new_txt_${Date.now()}`;
      const newBlock: EditableTextBlock = {
        id: newId,
        page: currentPage,
        source: 'new',
        origX: x,
        origY: y,
        origWidth: 200,
        origHeight: textEditorStyle.fontSize * 1.5,
        origText: '',
        origRects: [],
        origFontName: textEditorStyle.fontFamily,
        isCustomFont: false,
        text: 'New PDF Text',
        x: Math.max(10, x),
        y: Math.max(10, y),
        width: 220,
        height: Math.max(24, textEditorStyle.fontSize * 1.6),
        fontSize: textEditorStyle.fontSize,
        fontFamily: textEditorStyle.fontFamily,
        isBold: textEditorStyle.isBold,
        isItalic: textEditorStyle.isItalic,
        color: textEditorStyle.color,
        align: textEditorStyle.align,
        lineHeight: 1.25,
        isDeleted: false,
        isModified: true,
      };
      setEditableBlocks((prev) => [...prev, newBlock]);
      setSelectedTextBlockId(newId);
      setEditingTextBlockId(newId);
      lastTypedBlockRef.current = newId;
      setHasUnsavedChanges(true);
    },
    [currentPage, textEditorStyle, pushHistorySnapshot]
  );

  const handleUpdateSelectedTextStyle = (patch: {
    fontFamily?: EditableFontFamily;
    fontSize?: number;
    isBold?: boolean;
    isItalic?: boolean;
    color?: string;
    align?: TextAlignment;
  }) => {
    setTextEditorStyle((prev) => ({ ...prev, ...patch }));
    if (!selectedTextBlockId) return;
    const target = editableBlocks.find((b) => b.id === selectedTextBlockId);
    if (!target) return;
    pushHistorySnapshot();
    lastTypedBlockRef.current = null;
    setEditableBlocks((prev) =>
      prev.map((b) => (b.id === selectedTextBlockId ? { ...b, ...patch, isModified: true } : b))
    );
    setHasUnsavedChanges(true);
  };

  const pendingTextEditCount = editableBlocks.filter(
    (b) =>
      (b.source === 'existing' && (b.isModified || b.isDeleted)) ||
      (b.source === 'new' && !b.isDeleted && b.text.trim().length > 0)
  ).length;

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [
      ...prev,
      {
        annotations: annotations.map((a) => ({ ...a })),
        editableBlocks: editableBlocks.map((b) => ({ ...b })),
      },
    ]);
    setAnnotations(previous.annotations);
    setEditableBlocks(previous.editableBlocks);
    lastTypedBlockRef.current = null;
    setHasUnsavedChanges(true);
  }, [undoStack, annotations, editableBlocks]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [
      ...prev,
      {
        annotations: annotations.map((a) => ({ ...a })),
        editableBlocks: editableBlocks.map((b) => ({ ...b })),
      },
    ]);
    setAnnotations(next.annotations);
    setEditableBlocks(next.editableBlocks);
    lastTypedBlockRef.current = null;
    setHasUnsavedChanges(true);
  }, [redoStack, annotations, editableBlocks]);

  const handleImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setActiveImageData(reader.result as string);
        setToolMode('image');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Commit existing PDF text edits + annotations directly into the PDF content stream
  const handleCommitTextEdits = async () => {
    if (!documentInfo || pendingTextEditCount === 0) return;
    setIsCommittingTextEdits(true);
    try {
      const committedBytes = await pdfTextEditEngine.commitTextEditsToPdf(
        documentInfo.data,
        editableBlocks,
        annotations
      );
      await loadPdfBytes(committedBytes, documentInfo.name, undefined, {
        preserveToolAndPage: currentPage,
      });
    } catch (err: any) {
      console.error('Failed to commit PDF text edits', err);
      alert('Failed to apply text edits to PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsCommittingTextEdits(false);
    }
  };

  // Save modified PDF (commits existing text edits + annotations via MuPDF + pdf-lib)
  const handleSaveFile = async (saveAs = false) => {
    if (!documentInfo) return;

    setIsCommittingTextEdits(true);
    try {
      let finalBytes = documentInfo.data;
      const hasAnyEdits = pendingTextEditCount > 0 || annotations.length > 0;

      if (hasAnyEdits) {
        finalBytes = await pdfTextEditEngine.commitTextEditsToPdf(
          documentInfo.data,
          editableBlocks,
          annotations
        );
      }

      const targetName = saveAs
        ? `${documentInfo.name.replace(/\.pdf$/i, '')}_edited.pdf`
        : documentInfo.name;

      const saved = await desktopBridge.savePdf(finalBytes, targetName);
      if (saved && hasAnyEdits) {
        await loadPdfBytes(finalBytes, targetName, undefined, {
          preserveToolAndPage: currentPage,
        });
      } else if (saved) {
        setHasUnsavedChanges(false);
      }
    } catch (err: any) {
      console.error('Save failed', err);
      alert('Failed to save PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsCommittingTextEdits(false);
    }
  };

  // Print PDF
  const handlePrint = () => {
    if (documentInfo) {
      pdfEngine.printDocument(documentInfo.data);
    }
  };

  // Desktop integration: listen for Windows "Open With", second instances, and menu actions
  useEffect(() => {
    if (desktopBridge.isElectron()) {
      desktopBridge.getInitialFile().then((file) => {
        if (file) {
          loadPdfBytes(file.data, file.name);
        }
      });

      const unsubFile = desktopBridge.onOpenFile((file) => {
        if (file) {
          loadPdfBytes(file.data, file.name);
        }
      });

      const unsubMenu = desktopBridge.onMenuAction((action) => {
        switch (action) {
          case 'open':
            handleOpenFile();
            break;
          case 'save':
            handleSaveFile(false);
            break;
          case 'save-as':
            handleSaveFile(true);
            break;
          case 'print':
            handlePrint();
            break;
          case 'undo':
            handleUndo();
            break;
          case 'redo':
            handleRedo();
            break;
          case 'zoom-in':
            setZoom((z) => Math.min(3.0, z + 0.15));
            break;
          case 'zoom-out':
            setZoom((z) => Math.max(0.3, z - 0.15));
            break;
          case 'fit-width':
            handleZoomFitWidth();
            break;
          case 'fit-page':
            handleZoomFitPage();
            break;
          case 'rotate-cw':
            handleRotateClockwise();
            break;
          case 'rotate-ccw':
            handleRotateCounterClockwise();
            break;
          case 'tool-merge':
            setIsMergeModalOpen(true);
            break;
          case 'tool-split':
            setIsSplitModalOpen(true);
            break;
          case 'tool-compress':
            setIsCompressModalOpen(true);
            break;
          case 'tool-ocr':
            setIsOcrModalOpen(true);
            break;
          case 'tool-word':
            setConvertModalType('pdf-to-word');
            break;
          case 'tool-excel':
            setConvertModalType('pdf-to-excel');
            break;
          case 'tool-pages':
            setActiveTab('pages');
            break;
          case 'settings':
            setIsSettingsModalOpen(true);
            break;
          case 'help':
            setIsHelpModalOpen(true);
            break;
          case 'close-doc':
            setDocumentInfo(null);
            setDocProxy(null);
            setAnnotations([]);
            setHasUnsavedChanges(false);
            break;
        }
      });

      return () => {
        if (unsubFile) unsubFile();
        if (unsubMenu) unsubMenu();
      };
    }
  }, [loadPdfBytes, handleUndo, handleRedo]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when typing inside an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile(e.shiftKey);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'ArrowLeft') {
        if (currentPage > 1) setCurrentPage((p) => p - 1);
      } else if (e.key === 'ArrowRight') {
        if (docProxy && currentPage < docProxy.numPages) setCurrentPage((p) => p + 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3.0, z + 0.15));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.3, z - 0.15));
      } else if (e.key === 'Escape') {
        setActiveAnnotationId(null);
        setSelectedTextBlockId(null);
        setEditingTextBlockId(null);
        setActiveSignatureData(null);
        setActiveImageData(null);
        setToolMode('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (toolMode === 'edit-text' && selectedTextBlockId && !editingTextBlockId) {
          handleDeleteTextBlock(selectedTextBlockId);
        } else if (activeAnnotationId) {
          handleDeleteAnnotation(activeAnnotationId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    documentInfo,
    annotations,
    editableBlocks,
    currentPage,
    docProxy,
    activeAnnotationId,
    selectedTextBlockId,
    editingTextBlockId,
    toolMode,
    handleUndo,
    handleRedo,
    handleDeleteTextBlock,
  ]);

  // Page rotation
  const handleRotateClockwise = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleRotateCounterClockwise = () => {
    setRotation((r) => (r + 270) % 360);
  };

  // Zoom helpers
  const handleZoomFitWidth = () => {
    setZoom(1.25);
  };

  const handleZoomFitPage = () => {
    setZoom(0.85);
  };

  // Watermark applied
  const handleApplyWatermark = async (
    text: string,
    opts: { fontSize: number; opacity: number; angle: number; color: string }
  ) => {
    if (!documentInfo) return;
    try {
      const watermarkedBytes = await pdfEditorService.addWatermark(documentInfo.data, text, opts);
      await loadPdfBytes(watermarkedBytes, `${documentInfo.name.replace('.pdf', '')}_watermarked.pdf`);
    } catch (err) {
      console.error('Failed to apply watermark', err);
    }
  };

  // Quick Action Handler from Welcome Screen
  const handleQuickAction = (action: string) => {
    if (action === 'merge') {
      setIsMergeModalOpen(true);
    } else if (action === 'ocr') {
      if (!docProxy) {
        alert('Please open or load a PDF document first to run OCR.');
        handleOpenSample();
      } else {
        setIsOcrModalOpen(true);
      }
    } else if (action === 'word') {
      if (!docProxy) {
        handleOpenSample().then(() => setConvertModalType('pdf-to-word'));
      } else {
        setConvertModalType('pdf-to-word');
      }
    } else if (action === 'excel') {
      if (!docProxy) {
        handleOpenSample().then(() => setConvertModalType('pdf-to-excel'));
      } else {
        setConvertModalType('pdf-to-excel');
      }
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f3f4f6] dark:bg-[#18181b] text-neutral-800 dark:text-neutral-200">
      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleImagePicked}
        className="hidden"
      />

      {/* 1. Desktop TitleBar */}
      <TitleBar
        document={documentInfo}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenFile={handleOpenFile}
        onSaveFile={() => handleSaveFile(false)}
        onSaveAs={() => handleSaveFile(true)}
        onPrint={handlePrint}
        onOpenSample={handleOpenSample}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        hasUnsavedChanges={hasUnsavedChanges}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* 2. Desktop RibbonBar */}
      <RibbonBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        toolMode={toolMode}
        onSelectToolMode={(nextMode) => {
          setToolMode(nextMode);
          if (nextMode !== 'edit-text') {
            setEditingTextBlockId(null);
          }
        }}
        currentPage={currentPage}
        totalPages={docProxy ? docProxy.numPages : 1}
        onPageChange={setCurrentPage}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(3.0, z + 0.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.3, z - 0.15))}
        onZoomFitWidth={handleZoomFitWidth}
        onZoomFitPage={handleZoomFitPage}
        onRotateClockwise={handleRotateClockwise}
        onRotateCounterClockwise={handleRotateCounterClockwise}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onOpenFile={handleOpenFile}
        onDownload={() => handleSaveFile(false)}
        onSaveAs={() => handleSaveFile(true)}
        onPrint={handlePrint}
        onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
        onOpenWatermarkModal={() => setIsWatermarkModalOpen(true)}
        onOpenMergeModal={() => setIsMergeModalOpen(true)}
        onOpenSplitModal={() => setIsSplitModalOpen(true)}
        onOpenCompressModal={() => setIsCompressModalOpen(true)}
        onOpenProtectModal={() => setIsProtectModalOpen(true)}
        onOpenBlankPageModal={() => setIsBlankPageModalOpen(true)}
        onOpenConvertModal={(type) => setConvertModalType(type)}
        onTriggerOcr={() => setIsOcrModalOpen(true)}
        hasDocument={!!docProxy}
        onClearAnnotations={handleClearAnnotations}
        onDeleteSelectedAnnotation={() => activeAnnotationId && handleDeleteAnnotation(activeAnnotationId)}
        hasSelectedAnnotation={!!activeAnnotationId}
        onAddImageClick={() => imageInputRef.current?.click()}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
      />

      {/* 2b. Dedicated Existing-PDF Text Editor Formatting Bar */}
      {toolMode === 'edit-text' && docProxy && activeTab !== 'pages' && (
        <EditTextToolbar
          selectedBlock={editableBlocks.find((b) => b.id === selectedTextBlockId) || null}
          defaultStyle={textEditorStyle}
          onUpdateStyle={handleUpdateSelectedTextStyle}
          onAddNewTextBox={() => handleCreateNewTextBlockAt(72, 120)}
          onDeleteSelectedBlock={() =>
            selectedTextBlockId && handleDeleteTextBlock(selectedTextBlockId)
          }
          onUndo={handleUndo}
          canUndo={undoStack.length > 0}
          onRedo={handleRedo}
          canRedo={redoStack.length > 0}
          pendingEditCount={pendingTextEditCount}
          isCommitting={isCommittingTextEdits}
          onCommitEdits={handleCommitTextEdits}
          onSave={() => handleSaveFile(false)}
          onSaveAs={() => handleSaveFile(true)}
          diagnostics={analyzedPages[currentPage] || null}
          isAnalyzing={isAnalyzingPageText}
          onTriggerOcr={() => setIsOcrModalOpen(true)}
          hasDocument={!!docProxy}
        />
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {docProxy && activeTab !== 'pages' ? (
          <>
            {/* Collapsible Left Sidebar */}
            <Sidebar
              isOpen={isSidebarOpen}
              onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
              currentPage={currentPage}
              totalPages={docProxy.numPages}
              onSelectPage={setCurrentPage}
              thumbnails={thumbnails}
              bookmarks={bookmarks}
              annotations={annotations}
              onSelectAnnotation={(anno) => {
                setActiveAnnotationId(anno.id);
                setCurrentPage(anno.page);
              }}
              onRotatePage={async (pageNum) => {
                if (!documentInfo) return;
                const rotated = await pdfEditorService.rotatePages(documentInfo.data, [pageNum], 90);
                await loadPdfBytes(rotated, documentInfo.name);
              }}
              onDeletePage={async (pageNum) => {
                if (!documentInfo || docProxy.numPages <= 1) return;
                if (confirm(`Delete page ${pageNum}?`)) {
                  const updated = await pdfEditorService.deletePages(documentInfo.data, [pageNum]);
                  await loadPdfBytes(updated, documentInfo.name);
                }
              }}
              onSearch={(query) => pdfEngine.searchText(docProxy, query)}
              onSelectSearchMatch={(match) => {
                setCurrentPage(match.pageIndex);
              }}
            />

            {/* Central Document Viewer Canvas */}
            <DocumentViewer
              docProxy={docProxy}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              zoom={zoom}
              onZoomChange={setZoom}
              rotation={rotation}
              toolMode={toolMode}
              selectedColor={selectedColor}
              strokeWidth={strokeWidth}
              annotations={annotations}
              onAddAnnotation={handleAddAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              activeAnnotationId={activeAnnotationId}
              onSelectAnnotation={setActiveAnnotationId}
              activeSignatureData={activeSignatureData}
              onConsumeSignature={() => setActiveSignatureData(null)}
              activeImageData={activeImageData}
              onConsumeImage={() => setActiveImageData(null)}
              editableBlocks={editableBlocks}
              selectedTextBlockId={selectedTextBlockId}
              editingTextBlockId={editingTextBlockId}
              onSelectTextBlock={setSelectedTextBlockId}
              onStartEditingTextBlock={handleStartEditingTextBlock}
              onUpdateTextBlock={handleUpdateTextBlock}
              onCommitTextBlockDragHistory={handleCommitTextBlockDragHistory}
              onDeleteTextBlock={handleDeleteTextBlock}
              onCreateNewTextBlockAt={handleCreateNewTextBlockAt}
            />
          </>
        ) : docProxy && activeTab === 'pages' ? (
          /* Page Organizer Grid Mode */
          <PageOrganizerView
            documentBytes={documentInfo!.data}
            totalPages={docProxy.numPages}
            thumbnails={thumbnails}
            onApplyNewPageOrder={async (newBytes) => {
              await loadPdfBytes(newBytes, documentInfo!.name);
              setActiveTab('read');
            }}
            onExitOrganizer={() => setActiveTab('read')}
          />
        ) : (
          /* Welcome Start Screen */
          <HomeWelcomeView
            onOpenFile={handleOpenFile}
            onOpenSample={handleOpenSample}
            onFileDrop={async (file) => {
              const buffer = await file.arrayBuffer();
              await loadPdfBytes(new Uint8Array(buffer), file.name);
            }}
            recentFiles={recentFiles}
            onOpenRecent={handleOpenRecent}
            onRemoveRecent={handleRemoveRecent}
            onQuickAction={handleQuickAction}
          />
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onApplySignature={(dataUrl) => {
          setActiveSignatureData(dataUrl);
          setToolMode('signature');
        }}
      />

      {/* Watermark Modal */}
      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        onApplyWatermark={handleApplyWatermark}
      />

      {/* Merge Modal */}
      <MergeModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        currentDocumentBytes={documentInfo?.data}
        currentDocumentName={documentInfo?.name}
        onMergedSuccess={async (mergedBytes, name) => {
          await loadPdfBytes(mergedBytes, name);
        }}
      />

      {/* Split Modal */}
      {documentInfo && (
        <SplitModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          documentBytes={documentInfo.data}
          totalPages={docProxy.numPages}
          documentName={documentInfo.name}
          onSplitSuccess={async (splitBytes, name) => {
            await loadPdfBytes(splitBytes, name);
          }}
        />
      )}

      {/* Compress Modal */}
      {documentInfo && docProxy && (
        <CompressModal
          isOpen={isCompressModalOpen}
          onClose={() => setIsCompressModalOpen(false)}
          docProxy={docProxy}
          documentName={documentInfo.name}
          originalSize={documentInfo.size}
        />
      )}

      {/* Protect Modal */}
      {documentInfo && (
        <ProtectModal
          isOpen={isProtectModalOpen}
          onClose={() => setIsProtectModalOpen(false)}
          documentBytes={documentInfo.data}
          documentName={documentInfo.name}
          onProtectedSuccess={async (bytes, name) => {
            await loadPdfBytes(bytes, name);
          }}
        />
      )}

      {/* Blank Page Modal */}
      {documentInfo && docProxy && (
        <BlankPageModal
          isOpen={isBlankPageModalOpen}
          onClose={() => setIsBlankPageModalOpen(false)}
          docProxy={docProxy}
          documentBytes={documentInfo.data}
          documentName={documentInfo.name}
          onSuccess={async (trimmedBytes, removedCount) => {
            await loadPdfBytes(trimmedBytes, documentInfo.name);
            alert(`Successfully removed ${removedCount} blank ${removedCount === 1 ? 'page' : 'pages'}.`);
          }}
        />
      )}

      {/* Conversion Modal */}
      <ConvertModal
        isOpen={!!convertModalType}
        onClose={() => setConvertModalType(null)}
        conversionType={convertModalType || 'pdf-to-word'}
        docProxy={docProxy}
        documentName={documentInfo?.name || 'Document'}
        onNewPdfGenerated={async (bytes, name) => {
          await loadPdfBytes(bytes, name);
        }}
      />

      {/* OCR Modal */}
      {docProxy && documentInfo && (
        <OcrModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          docProxy={docProxy}
          currentPage={currentPage}
          documentName={documentInfo.name}
        />
      )}

      {/* Help & Shortcuts Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onRecentFilesCleared={async () => {
          const updated = await storageService.getRecentFiles();
          setRecentFiles(updated);
        }}
      />

      {/* Password Decryption Prompt Modal */}
      {passwordPrompt && (
        <PasswordPromptModal
          isOpen={true}
          onClose={() => setPasswordPrompt(null)}
          documentName={passwordPrompt.name}
          errorMessage={passwordPrompt.error}
          onSubmitPassword={(password) => {
            loadPdfBytes(passwordPrompt.data, passwordPrompt.name, password);
          }}
        />
      )}
    </div>
  );
}
