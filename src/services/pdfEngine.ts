import * as pdfjsLib from 'pdfjs-dist';
import { BookmarkItem, SearchMatch } from '../types/pdf';

// Initialize PDF.js worker securely with fallback
try {
  // Use cloudflare CDN worker matching version or bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (err) {
  console.warn('PDF.js worker initialization notice:', err);
}

export interface RenderPageResult {
  width: number;
  height: number;
  renderedScale: number;
}

export const pdfEngine = {
  async loadDocument(data: Uint8Array | ArrayBuffer, password?: string) {
    const loadingTask = pdfjsLib.getDocument({
      data,
      password: password || '',
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/',
    });

    return await loadingTask.promise;
  },

  async getPageDimensions(doc: any, pageNumber: number, rotation = 0) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 });
    return {
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation,
    };
  },

  async renderPageToCanvas(
    doc: any,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.0,
    additionalRotation: number = 0
  ): Promise<RenderPageResult> {
    const page = await doc.getPage(pageNumber);
    const totalRotation = (page.rotate + additionalRotation) % 360;
    const viewport = page.getViewport({ scale, rotation: totalRotation });

    // Handle high DPI screens
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');

    context.save();
    context.scale(pixelRatio, pixelRatio);

    const renderContext = {
      canvasContext: context,
      viewport,
    };

    await page.render(renderContext).promise;
    context.restore();

    return {
      width: viewport.width,
      height: viewport.height,
      renderedScale: scale,
    };
  },

  async renderThumbnail(doc: any, pageNumber: number, targetWidth = 140): Promise<string> {
    try {
      const page = await doc.getPage(pageNumber);
      const initialViewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / initialViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const context = canvas.getContext('2d');
      if (!context) return '';

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.error('Failed to render thumbnail for page', pageNumber, e);
      return '';
    }
  },

  async extractText(doc: any, pageNumber?: number): Promise<string> {
    const pagesToRead = pageNumber ? [pageNumber] : Array.from({ length: doc.numPages }, (_, i) => i + 1);
    let fullText = '';

    for (const p of pagesToRead) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      const pageText = pageStrings.join(' ');
      if (pageNumber) {
        fullText += pageText;
      } else {
        fullText += `--- Page ${p} ---\n${pageText}\n\n`;
      }
    }

    return fullText.trim();
  },

  async searchText(doc: any, query: string): Promise<SearchMatch[]> {
    if (!query || query.trim().length === 0) return [];
    const normalizedQuery = query.toLowerCase().trim();
    const matches: SearchMatch[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');

      const lowerText = text.toLowerCase();
      let matchIdx = lowerText.indexOf(normalizedQuery);
      while (matchIdx !== -1) {
        const snippetStart = Math.max(0, matchIdx - 35);
        const snippetEnd = Math.min(text.length, matchIdx + normalizedQuery.length + 35);
        const snippet = (snippetStart > 0 ? '...' : '') + text.substring(snippetStart, snippetEnd).trim() + (snippetEnd < text.length ? '...' : '');

        matches.push({
          pageIndex: i,
          text: snippet,
          matchIndex: matchIdx,
        });

        matchIdx = lowerText.indexOf(normalizedQuery, matchIdx + normalizedQuery.length);
      }
    }

    return matches;
  },

  async getBookmarks(doc: any): Promise<BookmarkItem[]> {
    try {
      const outline = await doc.getOutline();
      if (!outline || !outline.length) return [];

      const formatItems = async (items: any[]): Promise<BookmarkItem[]> => {
        const result: BookmarkItem[] = [];
        for (const item of items) {
          let pageIndex: number | undefined;
          if (item.dest) {
            try {
              const explicitDest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
              if (explicitDest && explicitDest[0]) {
                const pageRef = explicitDest[0];
                pageIndex = (await doc.getPageIndex(pageRef)) + 1;
              }
            } catch (e) {
              // destination lookup fallback
            }
          }

          const node: BookmarkItem = {
            title: item.title,
            pageIndex,
            dest: item.dest,
          };

          if (item.items && item.items.length) {
            node.items = await formatItems(item.items);
          }
          result.push(node);
        }
        return result;
      };

      return await formatItems(outline);
    } catch {
      return [];
    }
  },

  printDocument(pdfBytes: Uint8Array) {
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print trigger error', e);
          window.open(blobUrl, '_blank');
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 60000);
        }
      }, 500);
    };
  },
};
