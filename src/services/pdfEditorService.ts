import { PDFDocument, rgb, degrees, StandardFonts, LineCapStyle } from 'pdf-lib';
import { Annotation, Point } from '../types/pdf';

// Helper to convert hex color to RGB 0..1
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return { r, g, b };
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return { r, g, b };
}

export const pdfEditorService = {
  async applyAnnotations(originalBytes: Uint8Array, annotations: Annotation[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    
    // Embed standard fonts for flexible typography
    const fonts = {
      helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
      helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      helveticaItalic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
      times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      timesItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
      courier: await pdfDoc.embedFont(StandardFonts.Courier),
      courierBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    };

    for (const anno of annotations) {
      const pageIndex = anno.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const cropBox = page.getCropBox();
      const pageRot = ((page.getRotation().angle % 360) + 360) % 360;
      const color = hexToRgb(anno.color || '#000000');
      const pdfColor = rgb(color.r, color.g, color.b);
      const opacity = typeof anno.opacity === 'number' ? anno.opacity : 1;

      const toPdfPoint = (vx: number, vy: number): { x: number; y: number } => {
        if (pageRot === 90) {
          return { x: cropBox.x + vy, y: cropBox.y + vx };
        }
        if (pageRot === 180) {
          return { x: cropBox.x + (cropBox.width - vx), y: cropBox.y + vy };
        }
        if (pageRot === 270) {
          return { x: cropBox.x + (cropBox.width - vy), y: cropBox.y + (cropBox.height - vx) };
        }
        return { x: cropBox.x + vx, y: cropBox.y + (cropBox.height - vy) };
      };

      const rotOpt = pageRot !== 0 ? degrees(pageRot) : undefined;

      switch (anno.type) {
        case 'text':
        case 'comment': {
          if (anno.text) {
            const fontSize = anno.fontSize || 14;
            let chosenFont = fonts.helvetica;
            const fam = (anno.fontFamily || 'helvetica').toLowerCase();

            if (fam.includes('times') || fam.includes('serif')) {
              chosenFont = anno.isBold ? fonts.timesBold : anno.isItalic ? fonts.timesItalic : fonts.times;
            } else if (fam.includes('courier') || fam.includes('mono')) {
              chosenFont = anno.isBold ? fonts.courierBold : fonts.courier;
            } else {
              chosenFont = anno.isBold ? fonts.helveticaBold : anno.isItalic ? fonts.helveticaItalic : fonts.helvetica;
            }

            // Support multi-line text boxes
            const lines = anno.text.split('\n');
            const lineHeight = fontSize * 1.25;

            lines.forEach((line, lIdx) => {
              const pos = toPdfPoint(anno.x, anno.y + fontSize + lIdx * lineHeight);
              page.drawText(line, {
                x: pos.x,
                y: pos.y,
                size: fontSize,
                font: chosenFont,
                color: pdfColor,
                opacity,
                rotate: rotOpt,
              });
            });
          }
          break;
        }

        case 'highlight': {
          const w = anno.width || 100;
          const h = anno.height || 20;
          const origin = toPdfPoint(anno.x, anno.y + h);
          page.drawRectangle({
            x: origin.x,
            y: origin.y,
            width: w,
            height: h,
            color: pdfColor,
            opacity: 0.35,
            rotate: rotOpt,
          });
          break;
        }

        case 'underline': {
          const w = anno.width || 100;
          const h = anno.height || 18;
          const p1 = toPdfPoint(anno.x, anno.y + h);
          const p2 = toPdfPoint(anno.x + w, anno.y + h);
          page.drawLine({
            start: p1,
            end: p2,
            thickness: anno.strokeWidth || 2,
            color: pdfColor,
            opacity,
          });
          break;
        }

        case 'strikethrough': {
          const w = anno.width || 100;
          const h = anno.height || 18;
          const p1 = toPdfPoint(anno.x, anno.y + h / 2);
          const p2 = toPdfPoint(anno.x + w, anno.y + h / 2);
          page.drawLine({
            start: p1,
            end: p2,
            thickness: anno.strokeWidth || 2,
            color: pdfColor,
            opacity,
          });
          break;
        }

        case 'shape-rect': {
          const w = Math.max(10, anno.width || 80);
          const h = Math.max(10, anno.height || 60);
          const origin = toPdfPoint(anno.x, anno.y + h);
          page.drawRectangle({
            x: origin.x,
            y: origin.y,
            width: w,
            height: h,
            borderColor: pdfColor,
            borderWidth: anno.strokeWidth || 2,
            color: rgb(color.r, color.g, color.b),
            opacity: opacity < 1 ? opacity * 0.2 : 0,
            borderOpacity: opacity,
            rotate: rotOpt,
          });
          break;
        }

        case 'shape-circle': {
          const r = Math.max(5, (anno.width || 60) / 2);
          const center = toPdfPoint(anno.x + r, anno.y + r);
          page.drawCircle({
            x: center.x,
            y: center.y,
            size: r,
            borderColor: pdfColor,
            borderWidth: anno.strokeWidth || 2,
            borderOpacity: opacity,
          });
          break;
        }

        case 'shape-line': {
          const p1 = toPdfPoint(anno.x, anno.y);
          const p2 = toPdfPoint(anno.x + (anno.width || 100), anno.y + (anno.height || 0));
          page.drawLine({
            start: p1,
            end: p2,
            thickness: anno.strokeWidth || 2,
            color: pdfColor,
            opacity,
          });
          break;
        }

        case 'shape-arrow': {
          const vx1 = anno.x;
          const vy1 = anno.y;
          const vx2 = anno.x + (anno.width || 100);
          const vy2 = anno.y + (anno.height || 0);

          const p1 = toPdfPoint(vx1, vy1);
          const p2 = toPdfPoint(vx2, vy2);

          page.drawLine({
            start: p1,
            end: p2,
            thickness: anno.strokeWidth || 2,
            color: pdfColor,
            opacity,
          });

          // Draw arrowhead in visual coordinates, then map to PDF space
          const vAngle = Math.atan2(vy2 - vy1, vx2 - vx1);
          const headLength = 12;
          const h1 = toPdfPoint(
            vx2 - headLength * Math.cos(vAngle - Math.PI / 6),
            vy2 - headLength * Math.sin(vAngle - Math.PI / 6)
          );
          const h2 = toPdfPoint(
            vx2 - headLength * Math.cos(vAngle + Math.PI / 6),
            vy2 - headLength * Math.sin(vAngle + Math.PI / 6)
          );
          page.drawLine({
            start: p2,
            end: h1,
            thickness: anno.strokeWidth || 2,
            color: pdfColor,
            opacity,
          });
          page.drawLine({
            start: p2,
            end: h2,
            thickness: anno.strokeWidth || 2,
            color: pdfColor,
            opacity,
          });
          break;
        }

        case 'draw': {
          if (anno.points && anno.points.length > 1) {
            const pts = anno.points;
            for (let i = 0; i < pts.length - 1; i++) {
              page.drawLine({
                start: toPdfPoint(pts[i].x, pts[i].y),
                end: toPdfPoint(pts[i + 1].x, pts[i + 1].y),
                thickness: anno.strokeWidth || 2.5,
                color: pdfColor,
                opacity,
                lineCap: LineCapStyle.Round,
              });
            }
          }
          break;
        }

        case 'signature':
        case 'image': {
          if (anno.imageData) {
            try {
              let embeddedImage;
              if (anno.imageData.startsWith('data:image/png')) {
                const base64Data = anno.imageData.split(',')[1];
                embeddedImage = await pdfDoc.embedPng(Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)));
              } else if (anno.imageData.startsWith('data:image/jpeg') || anno.imageData.startsWith('data:image/jpg')) {
                const base64Data = anno.imageData.split(',')[1];
                embeddedImage = await pdfDoc.embedJpg(Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)));
              }

              if (embeddedImage) {
                const imgW = anno.width || 160;
                const imgH = anno.height || 60;
                const origin = toPdfPoint(anno.x, anno.y + imgH);
                page.drawImage(embeddedImage, {
                  x: origin.x,
                  y: origin.y,
                  width: imgW,
                  height: imgH,
                  opacity,
                  rotate: rotOpt,
                });
              }
            } catch (e) {
              console.error('Failed to embed image or signature', e);
            }
          }
          break;
        }
      }
    }

    return await pdfDoc.save();
  },

  async deletePages(originalBytes: Uint8Array, pageNumbersToDelete: number[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const sortedIndices = [...pageNumbersToDelete].map((p) => p - 1).sort((a, b) => b - a);

    for (const idx of sortedIndices) {
      if (idx >= 0 && idx < pdfDoc.getPageCount() && pdfDoc.getPageCount() > 1) {
        pdfDoc.removePage(idx);
      }
    }

    return await pdfDoc.save();
  },

  async reorderPages(originalBytes: Uint8Array, newOrder: number[]): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const zeroIndexedOrder = newOrder.map((p) => p - 1);
    const copiedPages = await newDoc.copyPages(sourceDoc, zeroIndexedOrder);

    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    return await newDoc.save();
  },

  async rotatePages(originalBytes: Uint8Array, pageNumbers: number[], rotationDeg: number): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    for (const pNum of pageNumbers) {
      const idx = pNum - 1;
      if (idx >= 0 && idx < pages.length) {
        const page = pages[idx];
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + rotationDeg) % 360));
      }
    }

    return await pdfDoc.save();
  },

  async mergePdfs(pdfByteArrays: Uint8Array[]): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();

    for (const pdfBytes of pdfByteArrays) {
      const donorDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(donorDoc, donorDoc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    return await mergedDoc.save();
  },

  async splitPdf(originalBytes: Uint8Array, startPage: number, endPage: number): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const count = sourceDoc.getPageCount();
    const start = Math.max(1, startPage);
    const end = Math.min(count, endPage);

    const indicesToCopy: number[] = [];
    for (let i = start - 1; i <= end - 1; i++) {
      indicesToCopy.push(i);
    }

    const copiedPages = await newDoc.copyPages(sourceDoc, indicesToCopy);
    copiedPages.forEach((page) => newDoc.addPage(page));

    return await newDoc.save();
  },

  async extractPages(originalBytes: Uint8Array, pageNumbers: number[]): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    const zeroIndexed = pageNumbers
      .filter((p) => p >= 1 && p <= sourceDoc.getPageCount())
      .map((p) => p - 1);

    const copiedPages = await newDoc.copyPages(sourceDoc, zeroIndexed);
    copiedPages.forEach((page) => newDoc.addPage(page));

    return await newDoc.save();
  },

  async removePassword(originalBytes: Uint8Array): Promise<Uint8Array> {
    const sourceDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const cleanDoc = await PDFDocument.create();
    const copiedPages = await cleanDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
    copiedPages.forEach((page) => cleanDoc.addPage(page));
    return await cleanDoc.save();
  },

  async addWatermark(
    originalBytes: Uint8Array,
    watermarkText: string,
    options: {
      fontSize?: number;
      opacity?: number;
      angle?: number;
      color?: string;
    } = {}
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const text = watermarkText || 'CONFIDENTIAL';
    const fontSize = options.fontSize || 48;
    const opacity = typeof options.opacity === 'number' ? options.opacity : 0.25;
    const angle = options.angle ?? 45;
    const color = hexToRgb(options.color || '#ef4444');

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);

      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font: helveticaBold,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(angle),
      });
    }

    return await pdfDoc.save();
  },

  async removeBlankPages(docProxy: any, originalBytes: Uint8Array, threshold = 0.992): Promise<{ pdfBytes: Uint8Array; removedCount: number }> {
    const pagesToKeep: number[] = [];
    const numPages = docProxy.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await docProxy.getPage(i);
      const viewport = page.getViewport({ scale: 0.25 }); // Low scale for speed
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        pagesToKeep.push(i);
        continue;
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      let whitePixels = 0;
      const totalPixels = data.length / 4;

      for (let p = 0; p < data.length; p += 4) {
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        // Check if pixel is effectively white / blank
        if (r > 240 && g > 240 && b > 240) {
          whitePixels++;
        }
      }

      const whiteRatio = whitePixels / totalPixels;
      if (whiteRatio < threshold) {
        pagesToKeep.push(i);
      }
    }

    if (pagesToKeep.length === 0 || pagesToKeep.length === numPages) {
      return { pdfBytes: originalBytes, removedCount: 0 };
    }

    const trimmedBytes = await this.reorderPages(originalBytes, pagesToKeep);
    return {
      pdfBytes: trimmedBytes,
      removedCount: numPages - pagesToKeep.length,
    };
  },

  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  },

  downloadBytes(bytes: Uint8Array, filename: string, mimeType = 'application/pdf') {
    const blob = new Blob([bytes as any], { type: mimeType });
    this.downloadBlob(blob, filename);
  },
};
