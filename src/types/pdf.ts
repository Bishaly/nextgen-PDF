export type ToolMode = 
  | 'select' 
  | 'hand' 
  | 'edit-text'
  | 'text' 
  | 'highlight' 
  | 'underline' 
  | 'strikethrough' 
  | 'draw' 
  | 'shape-rect' 
  | 'shape-circle' 
  | 'shape-line' 
  | 'shape-arrow' 
  | 'comment' 
  | 'signature' 
  | 'image' 
  | 'erase';

export type MainTab = 'read' | 'edit' | 'convert' | 'tools' | 'ocr' | 'pages';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type EditableFontFamily = 'Helvetica' | 'Times-Roman' | 'Courier';

export interface TextRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfTextSpanInfo {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontFamily: EditableFontFamily;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isCustomFont: boolean;
  color: string;
}

export interface EditableTextBlock {
  id: string;
  page: number; // 1-based
  source: 'existing' | 'new';
  origX: number;
  origY: number;
  origWidth: number;
  origHeight: number;
  origText: string;
  origRects: TextRect[];
  origFontName: string;
  isCustomFont: boolean;

  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: EditableFontFamily;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  align: TextAlignment;
  lineHeight: number;
  baselineRatio?: number;
  isDeleted: boolean;
  isModified: boolean;
}

export interface PageEditDiagnostics {
  page: number;
  status: 'editable' | 'scanned' | 'outlined' | 'encrypted' | 'mixed' | 'empty';
  textSpanCount: number;
  blockCount: number;
  imageCount: number;
  vectorPathCount: number;
  customFontNames: string[];
  hasPermissionsIssue: boolean;
  message: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: ToolMode;
  page: number; // 1-based
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  opacity: number;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string; // 'Helvetica' | 'Times-Roman' | 'Courier'
  isBold?: boolean;
  isItalic?: boolean;
  points?: Point[]; // For freehand drawing
  imageData?: string; // Data URL for image or signature
  author?: string;
  timestamp: number;
}

export interface DocumentInfo {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  data: Uint8Array;
  lastModified: number;
  isEncrypted?: boolean;
}

export interface BookmarkItem {
  title: string;
  dest?: any;
  pageIndex?: number;
  items?: BookmarkItem[];
}

export interface SearchMatch {
  pageIndex: number;
  text: string;
  matchIndex: number;
}

export interface RecentFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  timestamp: number;
  thumbnail?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  defaultZoom: 'fit-width' | 'fit-page' | number;
  showThumbnails: boolean;
  authorName: string;
  highQualityRender: boolean;
}

export interface UndoRedoSnapshot {
  annotations: Annotation[];
  editableBlocks: EditableTextBlock[];
}

export interface OpenDocumentSession {
  tabId: string;
  documentInfo: DocumentInfo;
  docProxy: any;
  currentPage: number;
  zoom: number;
  rotation: number;
  toolMode: ToolMode;
  activeTab: MainTab;
  annotations: Annotation[];
  editableBlocks: EditableTextBlock[];
  analyzedPages: Record<number, PageEditDiagnostics>;
  selectedTextBlockId: string | null;
  editingTextBlockId: string | null;
  activeAnnotationId: string | null;
  undoStack: UndoRedoSnapshot[];
  redoStack: UndoRedoSnapshot[];
  hasUnsavedChanges: boolean;
  thumbnails: { [page: number]: string };
  bookmarks: BookmarkItem[];
}

