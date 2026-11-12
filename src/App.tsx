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

import { DocumentInfo, MainTab, ToolMode, Annotation, BookmarkItem, RecentFile, SearchMatch } from './types/pdf';
import { pdfEngine } from './services/pdfEngine';
import { pdfEditorService } from './services/pdfEditorService';
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

  // Annotations & Sidebar State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
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
  const loadPdfBytes = useCallback(async (data: Uint8Array, fileName: string, password?: string) => {
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
      setCurrentPage(1);
      setRotation(0);
      setZoom(1.0);
      setAnnotations([]);
      setUndoStack([]);
      setRedoStack([]);
      setHasUnsavedChanges(false);
      setPasswordPrompt(null);
      setActiveTab('read');

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

  // Annotations management with Undo / Redo history
  const handleAddAnnotation = (anno: Annotation) => {
    setUndoStack((prev) => [...prev, annotations]);
    setRedoStack([]);
    setAnnotations((prev) => [...prev, anno]);
    setHasUnsavedChanges(true);
  };

  const handleUpdateAnnotation = (anno: Annotation) => {
    setUndoStack((prev) => [...prev, annotations]);
    setRedoStack([]);
    setAnnotations((prev) => prev.map((a) => (a.id === anno.id ? anno : a)));
    setHasUnsavedChanges(true);
  };

  const handleDeleteAnnotation = (id: string) => {
    setUndoStack((prev) => [...prev, annotations]);
    setRedoStack([]);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (activeAnnotationId === id) setActiveAnnotationId(null);
    setHasUnsavedChanges(true);
  };

  const handleClearAnnotations = () => {
    if (confirm('Clear all annotations on this page?')) {
      setUndoStack((prev) => [...prev, annotations]);
      setRedoStack([]);
      setAnnotations((prev) => prev.filter((a) => a.page !== currentPage));
      setActiveAnnotationId(null);
      setHasUnsavedChanges(true);
    }
  };

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, annotations]);
    setAnnotations(previous);
    setHasUnsavedChanges(true);
  }, [undoStack, annotations]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, annotations]);
    setAnnotations(next);
    setHasUnsavedChanges(true);
  }, [redoStack, annotations]);

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

  // Save modified PDF with embedded annotations via native save dialog or browser download
  const handleSaveFile = async () => {
    if (!documentInfo) return;

    try {
      let finalBytes = documentInfo.data;
      if (annotations.length > 0) {
        finalBytes = await pdfEditorService.applyAnnotations(documentInfo.data, annotations);
      }

      await desktopBridge.savePdf(finalBytes, documentInfo.name);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save PDF.');
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
            handleSaveFile();
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
        handleSaveFile();
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
        setActiveSignatureData(null);
        setActiveImageData(null);
        setToolMode('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeAnnotationId) {
          handleDeleteAnnotation(activeAnnotationId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [documentInfo, annotations, currentPage, docProxy, activeAnnotationId, handleUndo, handleRedo]);

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
        onSaveFile={handleSaveFile}
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
        onSelectToolMode={setToolMode}
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
        onDownload={handleSaveFile}
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
