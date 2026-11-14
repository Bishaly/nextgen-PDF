import * as mupdf from 'mupdf';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees, StandardFonts, PDFFont } from 'pdf-lib';
import {
  Annotation,
  EditableFontFamily,
  EditableTextBlock,
  PageEditDiagnostics,
  PdfTextSpanInfo,
  TextAlignment,
  TextRect,
} from '../types/pdf';
import { pdfEditorService } from './pdfEditorService';

// Map raw PDF font name + MuPDF flags to editable standard font family & style
export function mapPdfFontInfo(
  rawFontName: string,
  flags?: { isBold?: boolean; isItalic?: boolean; isSerif?: boolean; isMono?: boolean }
): {
  fontFamily: EditableFontFamily;
  isBold: boolean;
  isItalic: boolean;
  isCustomFont: boolean;
  cleanFontName: string;
} {
  // Strip PDF subset prefix like "ABCDEF+Calibri-Bold" -> "Calibri-Bold"
  const cleanName = (rawFontName || 'Helvetica').replace(/^[A-Z]{6}\+/, '');
  const lower = cleanName.toLowerCase();

  let fontFamily: EditableFontFamily = 'Helvetica';
  if (
    flags?.isMono ||
    lower.includes('courier') ||
    lower.includes('mono') ||
    lower.includes('consolas') ||
    lower.includes('menlo') ||
    lower.includes('jetbrains') ||
    lower.includes('fira') ||
    lower.includes('inconsolata')
  ) {
    fontFamily = 'Courier';
  } else if (
    flags?.isSerif ||
    lower.includes('times') ||
    lower.includes('serif') ||
    lower.includes('georgia') ||
    lower.includes('garamond') ||
    lower.includes('palatino') ||
    lower.includes('cambria') ||
    lower.includes('book') ||
    lower.includes('minion')
  ) {
    fontFamily = 'Times-Roman';
  }

  const isBold = Boolean(
    flags?.isBold ||
      lower.includes('bold') ||
      lower.includes('black') ||
      lower.includes('heavy') ||
      lower.includes('semibold') ||
      lower.includes('demi') ||
      lower.includes('-bd') ||
      lower.endsWith('bd')
  );

  const isItalic = Boolean(
    flags?.isItalic ||
      lower.includes('italic') ||
      lower.includes('oblique') ||
      lower.includes('slant') ||
      lower.includes('-it') ||
      lower.endsWith('it')
  );

  const isStandardPdfFont =
    lower.startsWith('helvetica') ||
    lower.startsWith('arial') ||
    lower.startsWith('times') ||
    lower.startsWith('courier') ||
    lower === 'sans-serif' ||
    lower === 'serif' ||
    lower === 'monospace';

  return {
    fontFamily,
    isBold,
    isItalic,
    isCustomFont: !isStandardPdfFont,
    cleanFontName: cleanName,
  };
}

function rgbArrayToHex(color?: number[]): string {
  if (!color || color.length === 0) return '#000000';
  if (color.length === 1) {
    const g = Math.max(0, Math.min(255, Math.round(color[0] * 255)));
    const h = g.toString(16).padStart(2, '0');
    return `#${h}${h}${h}`;
  }
  const r = Math.max(0, Math.min(255, Math.round((color[0] ?? 0) * 255)));
  const g = Math.max(0, Math.min(255, Math.round((color[1] ?? 0) * 255)));
  const b = Math.max(0, Math.min(255, Math.round((color[2] ?? 0) * 255)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgbTuple(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '#000000').replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) / 255,
      g: parseInt(clean[1] + clean[1], 16) / 255,
      b: parseInt(clean[2] + clean[2], 16) / 255,
    };
  }
  return {
    r: (parseInt(clean.substring(0, 2), 16) || 0) / 255,
    g: (parseInt(clean.substring(2, 4), 16) || 0) / 255,
    b: (parseInt(clean.substring(4, 6), 16) || 0) / 255,
  };
}

// Sanitize text for WinAnsi encoding in pdf-lib standard fonts
function sanitizeForWinAnsi(font: PDFFont, text: string): string {
  const replacements: Record<string, string> = {
    '→': '->',
    '←': '<-',
    '↑': '^',
    '↓': 'v',
    '✓': 'v',
    '✔': 'v',
    '✕': 'x',
    '✖': 'x',
    '≥': '>=',
    '≤': '<=',
    '≠': '!=',
    '≈': '~=',
    '−': '-',
    '‐': '-',
    '\u00a0': ' ',
    '\t': '    ',
  };
  let normalized = text;
  for (const [k, v] of Object.entries(replacements)) {
    if (normalized.includes(k)) {
      normalized = normalized.split(k).join(v);
    }
  }
  // Test character by character so pdf-lib never crashes on unsupported glyphs
  let safe = '';
  for (const ch of normalized) {
    try {
      font.encodeText(ch);
      safe += ch;
    } catch {
      safe += '?';
    }
  }
  return safe;
}

interface RawLine {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontName: string;
  cleanFontName: string;
  fontFamily: EditableFontFamily;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isCustomFont: boolean;
  color: string;
  baselineRatio?: number;
}

interface WrappedLine {
  text: string;
  isLastInParagraph: boolean;
}

function wrapTextToLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): WrappedLine[] {
  const paragraphs = text.split('\n');
  const output: WrappedLine[] = [];
  const safeMaxWidth = Math.max(20, maxWidth);

  paragraphs.forEach((para) => {
    const trimmedRight = para.replace(/\s+$/g, '');
    if (trimmedRight.length === 0) {
      output.push({ text: '', isLastInParagraph: true });
      return;
    }

    const words = trimmedRight.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

      if (candidateWidth > safeMaxWidth && currentLine) {
        output.push({ text: currentLine, isLastInParagraph: false });
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      output.push({ text: currentLine, isLastInParagraph: true });
    }
  });

  return output;
}

export const pdfTextEditEngine = {
  /**
   * Inspect a page using BOTH PDF.js (text layer spans + operator list for scanned/outlined detection)
   * and MuPDF WASM (exact color, font flags, glyph bounding boxes, and permissions).
   */
  async analyzeAndExtractPageText(
    pdfBytes: Uint8Array,
    docProxy: any,
    pageNumber: number
  ): Promise<{
    blocks: EditableTextBlock[];
    spans: PdfTextSpanInfo[];
    diagnostics: PageEditDiagnostics;
  }> {
    // 1. PDF.js Inspection (Text content + Operator list for images vs vector paths)
    const pdfPage = await docProxy.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const textContent = await pdfPage.getTextContent();
    const styles = textContent.styles || {};

    let imageCount = 0;
    let vectorPathCount = 0;
    try {
      const opList = await pdfPage.getOperatorList();
      const OPS = pdfjsLib.OPS;
      for (const fn of opList.fnArray) {
        if (
          fn === OPS.paintImageXObject ||
          fn === OPS.paintInlineImageXObject ||
          fn === OPS.paintImageMaskXObject
        ) {
          imageCount++;
        } else if (
          fn === OPS.curveTo ||
          fn === OPS.curveTo2 ||
          fn === OPS.curveTo3 ||
          fn === OPS.stroke ||
          fn === OPS.fill ||
          fn === OPS.eoFill
        ) {
          vectorPathCount++;
        }
      }
    } catch {
      // Operator inspection fallback
    }

    const pdfjsSpans: PdfTextSpanInfo[] = [];
    for (let idx = 0; idx < textContent.items.length; idx++) {
      const item: any = textContent.items[idx];
      if (!('str' in item) || !item.str.trim()) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontHeight = Math.hypot(tx[2], tx[3]) || Math.abs(item.height) || 11;
      const spanWidth = Math.max(4, item.width || fontHeight * item.str.length * 0.5);
      const styleObj = styles[item.fontName] || {};
      const mapped = mapPdfFontInfo(styleObj.fontFamily || item.fontName || 'Helvetica');

      pdfjsSpans.push({
        id: `span_${pageNumber}_${idx}`,
        text: item.str,
        x: tx[4],
        y: tx[5] - fontHeight * 0.85,
        width: spanWidth,
        height: fontHeight * 1.2,
        fontName: mapped.cleanFontName,
        fontFamily: mapped.fontFamily,
        fontSize: Math.round(fontHeight * 10) / 10,
        isBold: mapped.isBold,
        isItalic: mapped.isItalic,
        isCustomFont: mapped.isCustomFont,
        color: '#000000',
      });
    }

    // 2. MuPDF Inspection (exact font names, bold/italic/serif/mono flags, RGB colors, precise bboxes, permissions)
    let blocks: EditableTextBlock[] = [];
    let hasPermissionsIssue = false;
    let isEncrypted = false;
    const customFontSet = new Set<string>();

    try {
      const baseDoc = mupdf.Document.openDocument(pdfBytes, 'application/pdf');
      isEncrypted = baseDoc.needsPassword();
      const mDoc = baseDoc.asPDF();

      if (mDoc) {
        try {
          hasPermissionsIssue = !mDoc.hasPermission('edit');
        } catch {
          hasPermissionsIssue = false;
        }

        const mPage = mDoc.loadPage(pageNumber - 1);
        const bounds = mPage.getBounds(); // [bx0, by0, bx1, by1]
        const bx0 = bounds[0] || 0;
        const by0 = bounds[1] || 0;

        const stext = mPage.toStructuredText('preserve-whitespace');
        const rawLines: RawLine[] = [];

        interface CharAccum {
          c: string;
          x0: number;
          y0: number;
          x1: number;
          y1: number;
          originY: number;
          fontName: string;
          isBold: boolean;
          isItalic: boolean;
          isSerif: boolean;
          isMono: boolean;
          size: number;
          color: number[];
        }
        let currentChars: CharAccum[] = [];

        stext.walk({
          beginLine() {
            currentChars = [];
          },
          onChar(c, origin, font, size, quad, color) {
            const xs = [quad[0], quad[2], quad[4], quad[6]];
            const ys = [quad[1], quad[3], quad[5], quad[7]];
            currentChars.push({
              c,
              x0: Math.min(...xs) - bx0,
              y0: Math.min(...ys) - by0,
              x1: Math.max(...xs) - bx0,
              y1: Math.max(...ys) - by0,
              originY: origin[1] - by0,
              fontName: font.getName(),
              isBold: font.isBold(),
              isItalic: font.isItalic(),
              isSerif: font.isSerif(),
              isMono: font.isMono(),
              size,
              color: Array.isArray(color) ? color : [0, 0, 0],
            });
          },
          endLine() {
            if (currentChars.length === 0) return;

            // Split a line if there is a wide horizontal column gap (e.g., table row cells!)
            const segments: CharAccum[][] = [];
            let activeSeg: CharAccum[] = [];

            for (let i = 0; i < currentChars.length; i++) {
              const ch = currentChars[i];
              if (activeSeg.length === 0) {
                activeSeg.push(ch);
                continue;
              }
              const prev = activeSeg[activeSeg.length - 1];
              const gap = ch.x0 - prev.x1;
              const fontThreshold = Math.max(prev.size, 8) * 1.4;

              // If there's a large horizontal gap or consecutive spaces creating a table column jump, split!
              if (gap > fontThreshold) {
                segments.push(activeSeg);
                activeSeg = [ch];
              } else {
                activeSeg.push(ch);
              }
            }
            if (activeSeg.length > 0) {
              segments.push(activeSeg);
            }

            // Convert each segment into a RawLine (trimmed of leading/trailing spaces)
            for (const seg of segments) {
              const rawText = seg.map((s) => s.c).join('');
              const trimmed = rawText.trim();
              if (!trimmed) continue;

              // Find non-space char slice for tight bounding box
              let firstIdx = 0;
              while (firstIdx < seg.length && seg[firstIdx].c === ' ') firstIdx++;
              let lastIdx = seg.length - 1;
              while (lastIdx > firstIdx && seg[lastIdx].c === ' ') lastIdx--;

              const visibleChars = seg.slice(firstIdx, lastIdx + 1);
              const firstVisible = visibleChars.find((v) => v.c.trim().length > 0) || visibleChars[0];
              const mapped = mapPdfFontInfo(firstVisible.fontName, {
                isBold: firstVisible.isBold,
                isItalic: firstVisible.isItalic,
                isSerif: firstVisible.isSerif,
                isMono: firstVisible.isMono,
              });

              if (mapped.isCustomFont) {
                customFontSet.add(mapped.cleanFontName);
              }

              const x0 = Math.min(...visibleChars.map((s) => s.x0));
              const y0 = Math.min(...visibleChars.map((s) => s.y0));
              const x1 = Math.max(...visibleChars.map((s) => s.x1));
              const y1 = Math.max(...visibleChars.map((s) => s.y1));

              const rawBaselineRatio =
                firstVisible.size > 0
                  ? (firstVisible.originY - y0) / firstVisible.size
                  : 0.92;
              const clampedBaselineRatio =
                rawBaselineRatio >= 0.6 && rawBaselineRatio <= 1.25
                  ? Math.round(rawBaselineRatio * 1000) / 1000
                  : 0.92;

              rawLines.push({
                x: x0,
                y: y0,
                width: Math.max(8, x1 - x0),
                height: Math.max(8, y1 - y0),
                text: trimmed,
                fontName: firstVisible.fontName,
                cleanFontName: mapped.cleanFontName,
                fontFamily: mapped.fontFamily,
                fontSize: Math.round(firstVisible.size * 10) / 10,
                isBold: mapped.isBold,
                isItalic: mapped.isItalic,
                isCustomFont: mapped.isCustomFont,
                color: rgbArrayToHex(firstVisible.color),
                baselineRatio: clampedBaselineRatio,
              });
            }
          },
        });

        // Group adjacent vertical lines that share style & alignment into paragraph EditableTextBlocks
        blocks = groupLinesIntoBlocks(rawLines, pageNumber);
      }
    } catch (err) {
      console.warn('MuPDF inspection notice, falling back to PDF.js spans:', err);
      blocks = pdfjsSpans.map((sp, i) => ({
        id: `blk_${pageNumber}_${i}_${Math.round(sp.x)}_${Math.round(sp.y)}`,
        page: pageNumber,
        source: 'existing',
        origX: sp.x,
        origY: sp.y,
        origWidth: sp.width,
        origHeight: sp.height,
        origText: sp.text,
        origRects: [{ x: sp.x, y: sp.y, width: sp.width, height: sp.height }],
        origFontName: sp.fontName,
        isCustomFont: sp.isCustomFont,
        text: sp.text,
        x: sp.x,
        y: sp.y,
        width: sp.width + 12,
        height: sp.height,
        fontSize: sp.fontSize,
        fontFamily: sp.fontFamily,
        isBold: sp.isBold,
        isItalic: sp.isItalic,
        color: sp.color,
        align: 'left',
        lineHeight: 1.25,
        isDeleted: false,
        isModified: false,
      }));
    }

    // Build honest PageEditDiagnostics
    const customFontNames = Array.from(customFontSet);
    let status: PageEditDiagnostics['status'] = 'editable';
    let message = `${blocks.length} editable text ${blocks.length === 1 ? 'block' : 'blocks'} detected via PDF.js + MuPDF.`;

    if (isEncrypted) {
      status = 'encrypted';
      message = 'This PDF is password-encrypted. Unlock it before saving content-stream text edits.';
    } else if (blocks.length === 0 && pdfjsSpans.length === 0) {
      if (imageCount > 0 && vectorPathCount < 25) {
        status = 'scanned';
        message =
          'No editable text objects found on this page — it appears to be a scanned or image-based PDF. Use OCR Scanner to extract text.';
      } else if (vectorPathCount >= 25) {
        status = 'outlined';
        message =
          'No selectable PDF text found, while complex vector paths are present. Text on this page may be converted to vector outlines and cannot be directly edited as characters.';
      } else {
        status = 'empty';
        message = 'This page contains no existing text objects. Click anywhere on the page to add new text.';
      }
    } else if (hasPermissionsIssue) {
      status = 'encrypted';
      message =
        'Document permission flags restrict editing. Local modification may be limited or require owner authorization.';
    } else if (customFontNames.length > 0) {
      status = 'mixed';
      message = `${blocks.length} editable text blocks detected. Embedded/custom fonts (${customFontNames.slice(0, 3).join(', ')}${customFontNames.length > 3 ? '...' : ''}) will map to metric-compatible Helvetica, Times, or Courier when edited.`;
    }

    return {
      blocks,
      spans: pdfjsSpans,
      diagnostics: {
        page: pageNumber,
        status,
        textSpanCount: pdfjsSpans.length,
        blockCount: blocks.length,
        imageCount,
        vectorPathCount,
        customFontNames,
        hasPermissionsIssue,
        message,
      },
    };
  },

  /**
   * Commit all modified/deleted existing text blocks and new text blocks directly into real PDF bytes:
   * 1. MuPDF strips ONLY the original glyphs/text operators from the PDF content stream (NO whiteout boxes!).
   * 2. pdf-lib renders the replacement and newly added text with chosen font, size, color, bold, italic, and alignment.
   * 3. Any pending non-text annotations are also preserved/applied cleanly.
   */
  async commitTextEditsToPdf(
    originalBytes: Uint8Array,
    editableBlocks: EditableTextBlock[],
    annotations: Annotation[] = []
  ): Promise<Uint8Array> {
    const existingEdits = editableBlocks.filter(
      (b) => b.source === 'existing' && (b.isModified || b.isDeleted)
    );
    const blocksToDraw = editableBlocks.filter(
      (b) =>
        !b.isDeleted &&
        b.text.trim().length > 0 &&
        ((b.source === 'existing' && b.isModified) || b.source === 'new')
    );

    let workingBytes = originalBytes;

    // Stage 1: True content-stream text removal using MuPDF WASM redaction (zero white/black boxes!)
    if (existingEdits.length > 0) {
      const baseDoc = mupdf.Document.openDocument(workingBytes, 'application/pdf');
      if (baseDoc.needsPassword()) {
        throw new Error('Cannot modify content stream of a password-protected PDF without unlocking it first.');
      }
      const mDoc = baseDoc.asPDF();
      if (!mDoc) {
        throw new Error('Document is not a valid editable PDF structure.');
      }

      const editsByPage = new Map<number, EditableTextBlock[]>();
      for (const blk of existingEdits) {
        const list = editsByPage.get(blk.page) || [];
        list.push(blk);
        editsByPage.set(blk.page, list);
      }

      for (const [pageNum, pageBlocks] of editsByPage.entries()) {
        const pageIdx = pageNum - 1;
        if (pageIdx < 0 || pageIdx >= mDoc.countPages()) continue;

        const mPage = mDoc.loadPage(pageIdx) as mupdf.PDFPage;
        const bounds = mPage.getBounds();
        const bx0 = bounds[0] || 0;
        const by0 = bounds[1] || 0;

        for (const blk of pageBlocks) {
          const rectsToRedact =
            blk.origRects && blk.origRects.length > 0
              ? blk.origRects
              : [{ x: blk.origX, y: blk.origY, width: blk.origWidth, height: blk.origHeight }];

          for (const r of rectsToRedact) {
            if (r.width <= 0 || r.height <= 0) continue;
            // Tightly shrink vertically by 0.25pt to avoid accidentally clipping adjacent table rules
            const yPad = Math.min(0.35, r.height * 0.03);
            const annot = mPage.createAnnotation('Redact');
            annot.setRect([
              r.x + bx0,
              r.y + by0 + yPad,
              r.x + r.width + bx0,
              r.y + r.height + by0 - yPad,
            ]);
          }
        }

        // Remove ONLY overlapping text operators; keep images, vector borders, and shaded backgrounds!
        mPage.applyRedactions(
          false,
          mupdf.PDFPage.REDACT_IMAGE_NONE,
          mupdf.PDFPage.REDACT_LINE_ART_NONE,
          mupdf.PDFPage.REDACT_TEXT_REMOVE
        );
      }

      workingBytes = new Uint8Array(mDoc.saveToBuffer('compress,garbage').asUint8Array());
    }

    // Stage 2: Re-insert replacement & new text cleanly via pdf-lib with full typography & alignment
    if (blocksToDraw.length > 0) {
      const pdfDoc = await PDFDocument.load(workingBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      // Cache embedded standard fonts (all 12 regular/bold/italic/bold-italic combinations)
      const fontCache: Partial<Record<StandardFonts, PDFFont>> = {};
      const getFont = async (
        family: EditableFontFamily,
        isBold: boolean,
        isItalic: boolean
      ): Promise<PDFFont> => {
        let key: StandardFonts = StandardFonts.Helvetica;
        if (family === 'Times-Roman') {
          if (isBold && isItalic) key = StandardFonts.TimesRomanBoldItalic;
          else if (isBold) key = StandardFonts.TimesRomanBold;
          else if (isItalic) key = StandardFonts.TimesRomanItalic;
          else key = StandardFonts.TimesRoman;
        } else if (family === 'Courier') {
          if (isBold && isItalic) key = StandardFonts.CourierBoldOblique;
          else if (isBold) key = StandardFonts.CourierBold;
          else if (isItalic) key = StandardFonts.CourierOblique;
          else key = StandardFonts.Courier;
        } else {
          if (isBold && isItalic) key = StandardFonts.HelveticaBoldOblique;
          else if (isBold) key = StandardFonts.HelveticaBold;
          else if (isItalic) key = StandardFonts.HelveticaOblique;
          else key = StandardFonts.Helvetica;
        }

        if (!fontCache[key]) {
          fontCache[key] = await pdfDoc.embedFont(key);
        }
        return fontCache[key]!;
      };

      for (const blk of blocksToDraw) {
        const pageIdx = blk.page - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;

        const page = pages[pageIdx];
        const cropBox = page.getCropBox();
        const pageRot = ((page.getRotation().angle % 360) + 360) % 360;
        const font = await getFont(blk.fontFamily, blk.isBold, blk.isItalic);
        const fontSize = Math.max(6, Math.min(96, blk.fontSize || 12));
        const lineHeight = fontSize * (blk.lineHeight || 1.25);
        const ascent = fontSize * (blk.baselineRatio ?? 0.92);
        const { r, g, b } = hexToRgbTuple(blk.color || '#000000');
        const textColor = rgb(r, g, b);

        const safeText = sanitizeForWinAnsi(font, blk.text);
        const wrappedLines = wrapTextToLines(safeText, font, fontSize, blk.width);

        // Helper to map visual top-left (vx, vyBaseline) onto PDF page coordinates accounting for CropBox & rotation
        const drawAtVisualPos = (textStr: string, vx: number, vyBaseline: number) => {
          if (pageRot === 90) {
            page.drawText(textStr, {
              x: cropBox.x + vyBaseline,
              y: cropBox.y + vx,
              size: fontSize,
              font,
              color: textColor,
              rotate: degrees(90),
            });
          } else if (pageRot === 180) {
            page.drawText(textStr, {
              x: cropBox.x + (cropBox.width - vx),
              y: cropBox.y + vyBaseline,
              size: fontSize,
              font,
              color: textColor,
              rotate: degrees(180),
            });
          } else if (pageRot === 270) {
            page.drawText(textStr, {
              x: cropBox.x + (cropBox.width - vyBaseline),
              y: cropBox.y + (cropBox.height - vx),
              size: fontSize,
              font,
              color: textColor,
              rotate: degrees(270),
            });
          } else {
            page.drawText(textStr, {
              x: cropBox.x + vx,
              y: cropBox.y + (cropBox.height - vyBaseline),
              size: fontSize,
              font,
              color: textColor,
            });
          }
        };

        wrappedLines.forEach((lineObj, lineIdx) => {
          const lineText = lineObj.text;
          if (!lineText) return;

          const baselineY = blk.y + ascent + lineIdx * lineHeight;
          const lineWidth = font.widthOfTextAtSize(lineText, fontSize);

          if (blk.align === 'justify' && !lineObj.isLastInParagraph) {
            const words = lineText.split(' ').filter(Boolean);
            if (words.length > 1) {
              const totalWordsWidth = words.reduce(
                (acc, w) => acc + font.widthOfTextAtSize(w, fontSize),
                0
              );
              const extraSpace = Math.max(0, blk.width - totalWordsWidth);
              const gap = extraSpace / (words.length - 1);
              let cursorX = blk.x;
              for (const word of words) {
                drawAtVisualPos(word, cursorX, baselineY);
                cursorX += font.widthOfTextAtSize(word, fontSize) + gap;
              }
              return;
            }
          }

          let drawX = blk.x;
          if (blk.align === 'center') {
            drawX = blk.x + Math.max(0, (blk.width - lineWidth) / 2);
          } else if (blk.align === 'right') {
            drawX = blk.x + Math.max(0, blk.width - lineWidth);
          }

          drawAtVisualPos(lineText, drawX, baselineY);
        });
      }

      workingBytes = await pdfDoc.save();
    }

    // Stage 3: Apply any regular annotations if present
    if (annotations.length > 0) {
      workingBytes = await pdfEditorService.applyAnnotations(workingBytes, annotations);
    }

    return workingBytes;
  },
};

function groupLinesIntoBlocks(rawLines: RawLine[], pageNumber: number): EditableTextBlock[] {
  if (rawLines.length === 0) return [];

  // Sort visually top-to-bottom, then left-to-right
  const sorted = [...rawLines].sort((a, b) => {
    if (Math.abs(a.y - b.y) > Math.min(a.height, b.height) * 0.4) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  const groups: RawLine[][] = [];

  for (const line of sorted) {
    let placed = false;
    // Try appending to the most recent compatible paragraph group
    for (let gIdx = groups.length - 1; gIdx >= 0; gIdx--) {
      const group = groups[gIdx];
      const prev = group[group.length - 1];

      // Must match typography closely
      const sameStyle =
        prev.fontFamily === line.fontFamily &&
        prev.isBold === line.isBold &&
        prev.isItalic === line.isItalic &&
        prev.color === line.color &&
        Math.abs(prev.fontSize - line.fontSize) <= 1.2;

      if (!sameStyle) continue;

      const verticalGap = line.y - (prev.y + prev.height);
      const maxLineGap = Math.max(prev.fontSize * 0.95, 9);
      const isDirectlyBelow = verticalGap >= -prev.fontSize * 0.25 && verticalGap <= maxLineGap;

      // Avoid merging separate table columns or side-by-side cards
      const sameRow = Math.abs(line.y - prev.y) < prev.fontSize * 0.5;
      if (sameRow) continue;

      if (!isDirectlyBelow) continue;

      // Alignment check: left edge aligned within 18pt, or centered within 18pt
      const prevCenter = prev.x + prev.width / 2;
      const currCenter = line.x + line.width / 2;
      const leftAligned = Math.abs(line.x - group[0].x) <= 18;
      const centerAligned = Math.abs(currCenter - prevCenter) <= 18;

      if (leftAligned || centerAligned) {
        group.push(line);
        placed = true;
        break;
      }
    }

    if (!placed) {
      groups.push([line]);
    }
  }

  return groups.map((group, idx) => {
    const x0 = Math.min(...group.map((l) => l.x));
    const y0 = Math.min(...group.map((l) => l.y));
    const x1 = Math.max(...group.map((l) => l.x + l.width));
    const y1 = Math.max(...group.map((l) => l.y + l.height));
    const first = group[0];
    const width = Math.max(24, x1 - x0);
    const height = Math.max(14, y1 - y0);
    const fullText = group.map((l) => l.text).join('\n');

    // Detect likely center alignment if multiple lines have varied widths centered around same midpoint
    let inferredAlign: TextAlignment = 'left';
    if (group.length >= 2) {
      const centers = group.map((l) => l.x + l.width / 2);
      const lefts = group.map((l) => l.x);
      const centerSpread = Math.max(...centers) - Math.min(...centers);
      const leftSpread = Math.max(...lefts) - Math.min(...lefts);
      if (centerSpread < 6 && leftSpread > 10) {
        inferredAlign = 'center';
      }
    }

    // Estimate line-height ratio from consecutive lines if multi-line
    let lineHeightRatio = 1.25;
    if (group.length >= 2 && first.fontSize > 0) {
      const avgStep = (group[group.length - 1].y - group[0].y) / (group.length - 1);
      const ratio = avgStep / first.fontSize;
      if (ratio >= 1.0 && ratio <= 2.2) {
        lineHeightRatio = Math.round(ratio * 100) / 100;
      }
    }

    return {
      id: `blk_${pageNumber}_${idx}_${Math.round(x0)}_${Math.round(y0)}`,
      page: pageNumber,
      source: 'existing',
      origX: x0,
      origY: y0,
      origWidth: width,
      origHeight: height,
      origText: fullText,
      origRects: group.map((l) => ({
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
      })),
      origFontName: first.cleanFontName,
      isCustomFont: first.isCustomFont,
      text: fullText,
      x: x0,
      y: y0,
      width: width + 8, // Slight breathing room for editing without premature wrapping
      height,
      fontSize: first.fontSize || 11,
      fontFamily: first.fontFamily,
      isBold: first.isBold,
      isItalic: first.isItalic,
      color: first.color,
      align: inferredAlign,
      lineHeight: lineHeightRatio,
      baselineRatio: first.baselineRatio ?? 0.92,
      isDeleted: false,
      isModified: false,
    };
  });
}
