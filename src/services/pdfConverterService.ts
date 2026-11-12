import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';
import { pdfEditorService } from './pdfEditorService';
import { desktopBridge } from './desktopBridge';

export interface ConversionProgress {
  current: number;
  total: number;
  status: string;
}

export const pdfConverterService = {
  async pdfToImages(
    docProxy: any,
    format: 'jpeg' | 'png',
    scale: number = 2.0,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<{ dataUrl: string; pageNumber: number }[]> {
    const results: { dataUrl: string; pageNumber: number }[] = [];
    const numPages = docProxy.numPages;

    for (let i = 1; i <= numPages; i++) {
      onProgress?.({
        current: i,
        total: numPages,
        status: `Rendering page ${i} of ${numPages}...`,
      });

      const page = await docProxy.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mime, 0.92);
        results.push({ dataUrl, pageNumber: i });
      }
    }

    return results;
  },

  async imagesToPdf(
    files: File[],
    options: { pageSize?: 'fit' | 'a4'; orientation?: 'portrait' | 'landscape'; margin?: number } = {}
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const margin = options.margin ?? 20;

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let embeddedImage;

      if (file.type.includes('png')) {
        embeddedImage = await pdfDoc.embedPng(bytes);
      } else {
        // default JPEG
        embeddedImage = await pdfDoc.embedJpg(bytes);
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      if (options.pageSize === 'a4') {
        const isLandscape = options.orientation === 'landscape';
        const pageWidth = isLandscape ? 841.89 : 595.28;
        const pageHeight = isLandscape ? 595.28 : 841.89;

        const availW = pageWidth - margin * 2;
        const availH = pageHeight - margin * 2;
        const scale = Math.min(availW / imgWidth, availH / imgHeight, 1);

        const drawW = imgWidth * scale;
        const drawH = imgHeight * scale;
        const drawX = (pageWidth - drawW) / 2;
        const drawY = (pageHeight - drawH) / 2;

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
      } else {
        // Fit exact image dimensions
        const page = pdfDoc.addPage([imgWidth, imgHeight]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgWidth,
          height: imgHeight,
        });
      }
    }

    return await pdfDoc.save();
  },

  async pdfToText(docProxy: any): Promise<string> {
    const pagesCount = docProxy.numPages;
    let fullText = '';

    for (let i = 1; i <= pagesCount; i++) {
      const page = await docProxy.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      fullText += `========================================================\n`;
      fullText += `PAGE ${i} OF ${pagesCount}\n`;
      fullText += `========================================================\n\n`;
      fullText += pageStrings.join(' ') + '\n\n';
    }

    return fullText;
  },

  async textToPdf(text: string, title = 'Document'): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    const fontSize = 11;
    const lineHeight = 16;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Header title
    currentPage.drawText(title, {
      x: margin,
      y: currentY - 10,
      size: 16,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.2),
    });
    currentY -= 40;

    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        currentY -= lineHeight;
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize);

        if (textWidth > contentWidth && currentLine) {
          if (currentY - lineHeight < margin) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }

          currentPage.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: fontSize,
            font: helvetica,
            color: rgb(0.2, 0.22, 0.25),
          });

          currentLine = word;
          currentY -= lineHeight;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (currentY - lineHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }

        currentPage.drawText(currentLine, {
          x: margin,
          y: currentY,
          size: fontSize,
          font: helvetica,
          color: rgb(0.2, 0.22, 0.25),
        });
        currentY -= lineHeight;
      }

      currentY -= 6; // Paragraph gap
    }

    return await pdfDoc.save();
  },

  async pdfToWordDocx(docProxy: any, onProgress?: (p: ConversionProgress) => void): Promise<Blob> {
    const numPages = docProxy.numPages;
    const paragraphs: Paragraph[] = [];

    // Title paragraph
    paragraphs.push(
      new Paragraph({
        text: 'Converted PDF Document',
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );

    for (let i = 1; i <= numPages; i++) {
      onProgress?.({
        current: i,
        total: numPages,
        status: `Converting page ${i} of ${numPages} to Word format...`,
      });

      const page = await docProxy.getPage(i);
      const textContent = await page.getTextContent();

      // Page header indicator
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `--- Page ${i} ---`,
              bold: true,
              color: '1E40AF',
              size: 20,
            }),
          ],
          spacing: { before: 240, after: 120 },
        })
      );

      // Group items into structured lines with font size and style analysis
      let currentLineItems: Array<{ str: string; fontSize: number; isBold: boolean; isItalic: boolean }> = [];
      let lastY: number | null = null;

      const flushLine = () => {
        if (currentLineItems.length === 0) return;
        
        const lineText = currentLineItems.map((ci) => ci.str).join(' ').trim();
        if (!lineText) {
          currentLineItems = [];
          return;
        }

        const maxFontSize = Math.max(...currentLineItems.map((ci) => ci.fontSize));
        const hasBold = currentLineItems.some((ci) => ci.isBold);

        // Map larger font sizes to Word headings
        if (maxFontSize >= 20) {
          paragraphs.push(
            new Paragraph({
              text: lineText,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (maxFontSize >= 15 || (hasBold && maxFontSize >= 13)) {
          paragraphs.push(
            new Paragraph({
              text: lineText,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 160, after: 80 },
            })
          );
        } else {
          // Standard text paragraph
          const runs = currentLineItems.map(
            (ci) =>
              new TextRun({
                text: ci.str + ' ',
                bold: ci.isBold,
                italics: ci.isItalic,
                size: Math.max(18, Math.round(ci.fontSize * 1.8)),
              })
          );

          paragraphs.push(
            new Paragraph({
              children: runs,
              spacing: { after: 120 },
            })
          );
        }

        currentLineItems = [];
      };

      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const transform = item.transform;
        const itemY = transform ? transform[5] : 0;
        const fontHeight = transform ? Math.abs(transform[0] || transform[3]) : 12;
        const fontName = item.fontName || '';
        const isBold = /bold|black|heavy/i.test(fontName);
        const isItalic = /oblique|italic/i.test(fontName);

        if (lastY !== null && Math.abs(itemY - lastY) > 6) {
          flushLine();
        }

        currentLineItems.push({
          str: item.str,
          fontSize: fontHeight,
          isBold,
          isItalic,
        });

        lastY = itemY;
      }

      flushLine();
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    return await Packer.toBlob(doc);
  },

  async pdfToExcelSheet(docProxy: any, onProgress?: (p: ConversionProgress) => void): Promise<Uint8Array> {
    const numPages = docProxy.numPages;
    const workbook = XLSX.utils.book_new();

    for (let i = 1; i <= numPages; i++) {
      onProgress?.({
        current: i,
        total: numPages,
        status: `Extracting table data from page ${i}...`,
      });

      const page = await docProxy.getPage(i);
      const textContent = await page.getTextContent();

      // Cluster text elements by horizontal lines (Y position)
      const lineMap = new Map<number, Array<{ x: number; text: string }>>();

      for (const item of textContent.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const transform = item.transform;
        const x = transform ? Math.round(transform[4]) : 0;
        const y = transform ? Math.round(transform[5] / 8) * 8 : 0; // round to 8px bands

        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push({ x, text: item.str });
      }

      // Sort rows top-to-bottom (highest Y to lowest Y in PDF coords)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      const rows: string[][] = [];

      for (const y of sortedYs) {
        const lineItems = lineMap.get(y)!;
        // Sort columns left-to-right
        lineItems.sort((a, b) => a.x - b.x);

        // Group columns with distance threshold
        const rowCells: string[] = [];
        let currentCell = '';
        let lastX = -1;

        for (const item of lineItems) {
          if (lastX !== -1 && item.x - lastX > 50) {
            rowCells.push(currentCell.trim());
            currentCell = item.text;
          } else {
            currentCell += (currentCell ? ' ' : '') + item.text;
          }
          lastX = item.x;
        }
        if (currentCell.trim()) {
          rowCells.push(currentCell.trim());
        }

        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
      }

      const worksheet = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['(No structured data detected on page)']]);
      XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${i}`);
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(excelBuffer);
  },

  async downloadConvertedFile(data: Uint8Array | Blob | string, filename: string) {
    if (desktopBridge.isElectron()) {
      let exportData: Uint8Array | string;
      if (typeof data === 'string') {
        exportData = data;
      } else if (data instanceof Blob) {
        const buffer = await data.arrayBuffer();
        exportData = new Uint8Array(buffer);
      } else {
        exportData = data;
      }
      await desktopBridge.exportFile(exportData, filename);
      return;
    }

    if (typeof data === 'string') {
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
      pdfEditorService.downloadBlob(blob, filename);
    } else if (data instanceof Blob) {
      pdfEditorService.downloadBlob(data, filename);
    } else {
      const mime = filename.endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : filename.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream';
      pdfEditorService.downloadBytes(data, filename, mime);
    }
  },
};
