export type ToolMode = 
  | 'select' 
  | 'hand' 
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
