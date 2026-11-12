import { createWorker } from 'tesseract.js';

export interface OcrProgressUpdate {
  status: string;
  progress: number;
  currentPage: number;
  totalPages: number;
}

export const ocrService = {
  async recognizePdfPages(
    docProxy: any,
    pageNumbers: number[],
    lang: string = 'eng',
    onProgress?: (progress: OcrProgressUpdate) => void,
    abortSignal?: AbortSignal
  ): Promise<{ text: string; pageTexts: { page: number; text: string }[] }> {
    const totalPages = pageNumbers.length;
    const pageTexts: { page: number; text: string }[] = [];

    onProgress?.({
      status: 'Initializing OCR engine...',
      progress: 0.05,
      currentPage: 0,
      totalPages,
    });

    const worker = await createWorker(lang);

    try {
      for (let idx = 0; idx < pageNumbers.length; idx++) {
        if (abortSignal?.aborted) {
          throw new Error('OCR operation cancelled by user.');
        }

        const pageNum = pageNumbers[idx];
        const page = await docProxy.getPage(pageNum);
        // Render at high resolution for high OCR accuracy
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        onProgress?.({
          status: `Processing OCR on page ${pageNum} (${idx + 1}/${totalPages})...`,
          progress: (idx + 0.2) / totalPages,
          currentPage: pageNum,
          totalPages,
        });

        const imageBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );

        if (imageBlob) {
          const ret = await worker.recognize(imageBlob);
          pageTexts.push({
            page: pageNum,
            text: ret.data.text.trim(),
          });
        }

        onProgress?.({
          status: `Completed OCR for page ${pageNum}`,
          progress: (idx + 1) / totalPages,
          currentPage: pageNum,
          totalPages,
        });
      }
    } finally {
      await worker.terminate();
    }

    const combinedText = pageTexts
      .map((p) => `--- Page ${p.page} ---\n${p.text}`)
      .join('\n\n');

    return {
      text: combinedText,
      pageTexts,
    };
  },
};
