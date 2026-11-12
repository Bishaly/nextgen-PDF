import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function createSampleReportPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Page 1 - Title & Executive Summary
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Top header accent line
  page1.drawRectangle({
    x: 40,
    y: height - 50,
    width: width - 80,
    height: 3,
    color: rgb(0.12, 0.44, 0.88),
  });

  page1.drawText('NEXTGEN GLOBAL ENTERPRISES', {
    x: 40,
    y: height - 70,
    size: 10,
    font: helveticaBold,
    color: rgb(0.12, 0.44, 0.88),
  });

  page1.drawText('ANNUAL BUSINESS & TECH REPORT', {
    x: 40,
    y: height - 105,
    size: 24,
    font: helveticaBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  page1.drawText('Fiscal Year 2026-2027 · Strategic Operations & Audit Portfolio', {
    x: 40,
    y: height - 125,
    size: 11,
    font: helveticaOblique,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Divider
  page1.drawLine({
    start: { x: 40, y: height - 145 },
    end: { x: width - 40, y: height - 145 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Section 1: Executive Summary
  page1.drawText('1. Executive Overview & Mission', {
    x: 40,
    y: height - 175,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  const p1 = 
    'The fiscal year 2026 marked a revolutionary milestone in enterprise digital transformation. ' +
    'Our core cloud architecture achieved 99.995% service reliability while expanding into secure client-side ' +
    'document processing workflows. This report outlines operational benchmarks, financial allocations, ' +
    'and key compliance standards established across our technical divisions.';

  drawWrappedText(page1, p1, 40, height - 195, width - 80, 10, helvetica, 16);

  // Section 2: Key Operational Metrics
  page1.drawText('2. Key Performance Indicators', {
    x: 40,
    y: height - 280,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  // Metric Boxes
  const metrics = [
    { label: 'Total Active Users', value: '4.2M+', change: '+32.4% YoY' },
    { label: 'Document Workflows', value: '188M', change: 'Zero Data Leaks' },
    { label: 'Client Satisfaction', value: '98.6%', change: 'NPS Score: 78' },
  ];

  metrics.forEach((m, idx) => {
    const boxX = 40 + idx * 175;
    const boxY = height - 370;

    page1.drawRectangle({
      x: boxX,
      y: boxY,
      width: 165,
      height: 70,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    page1.drawText(m.label, {
      x: boxX + 12,
      y: boxY + 48,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.5),
    });

    page1.drawText(m.value, {
      x: boxX + 12,
      y: boxY + 26,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.12, 0.16),
    });

    page1.drawText(m.change, {
      x: boxX + 12,
      y: boxY + 10,
      size: 8,
      font: helveticaOblique,
      color: rgb(0.12, 0.55, 0.35),
    });
  });

  // Section 3: Quarterly Breakdown Table
  page1.drawText('3. Financial & Throughput Analysis', {
    x: 40,
    y: height - 410,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  // Table header
  const tableY = height - 440;
  page1.drawRectangle({
    x: 40,
    y: tableY - 5,
    width: width - 80,
    height: 22,
    color: rgb(0.92, 0.94, 0.98),
  });

  const columns = [
    { title: 'Quarter', x: 50 },
    { title: 'Processed Files', x: 160 },
    { title: 'Conversion Rate', x: 290 },
    { title: 'Gross Revenue', x: 420 },
  ];

  columns.forEach((col) => {
    page1.drawText(col.title, {
      x: col.x,
      y: tableY + 2,
      size: 9,
      font: helveticaBold,
      color: rgb(0.2, 0.25, 0.3),
    });
  });

  const rows = [
    ['Q1 FY26', '38,400,120', '99.4%', '$12,450,000'],
    ['Q2 FY26', '44,120,500', '99.7%', '$14,890,000'],
    ['Q3 FY26', '51,800,200', '99.8%', '$18,120,000'],
    ['Q4 FY26', '54,230,000', '99.9%', '$21,400,000'],
  ];

  rows.forEach((row, rIdx) => {
    const rowY = tableY - 28 - rIdx * 24;
    page1.drawLine({
      start: { x: 40, y: rowY - 6 },
      end: { x: width - 40, y: rowY - 6 },
      thickness: 0.5,
      color: rgb(0.9, 0.92, 0.95),
    });

    row.forEach((cell, cIdx) => {
      page1.drawText(cell, {
        x: columns[cIdx].x,
        y: rowY,
        size: 9,
        font: helvetica,
        color: rgb(0.2, 0.22, 0.25),
      });
    });
  });

  // Footer
  page1.drawText('Page 1 of 2 · Confidential · NextGen PDF Studio Sample Document', {
    x: 40,
    y: 35,
    size: 8,
    font: helveticaOblique,
    color: rgb(0.5, 0.55, 0.6),
  });

  // Page 2 - Terms, Verification & Signatures
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  
  page2.drawRectangle({
    x: 40,
    y: height - 50,
    width: width - 80,
    height: 3,
    color: rgb(0.12, 0.44, 0.88),
  });

  page2.drawText('4. Security & Compliance Protocol', {
    x: 40,
    y: height - 80,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  const p2 = 
    'All documents handled inside NextGen PDF Studio execute exclusively in user client memory. ' +
    'Local cryptographical verification guarantees that data never traverses unauthorized network boundaries ' +
    'or unvetted third-party storage. All redactions, digital signatures, and page mutations are rendered ' +
    'in adherence to ISO 32000-1 specifications.';

  drawWrappedText(page2, p2, 40, height - 105, width - 80, 10, helvetica, 16);

  page2.drawText('5. Authorization & Endorsements', {
    x: 40,
    y: height - 200,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.12, 0.16),
  });

  // Signature Block 1
  page2.drawRectangle({
    x: 40,
    y: height - 320,
    width: 240,
    height: 100,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page2.drawText('Authorized Signature - Chief Technology Officer', {
    x: 50,
    y: height - 235,
    size: 9,
    font: helveticaBold,
    color: rgb(0.3, 0.35, 0.4),
  });

  page2.drawLine({
    start: { x: 50, y: height - 290 },
    end: { x: 260, y: height - 290 },
    thickness: 1,
    color: rgb(0.7, 0.75, 0.8),
  });

  page2.drawText('Date: November 12, 2026', {
    x: 50,
    y: height - 308,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Signature Block 2
  page2.drawRectangle({
    x: 315,
    y: height - 320,
    width: 240,
    height: 100,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page2.drawText('Reviewing Auditor - Lead Governance Officer', {
    x: 325,
    y: height - 235,
    size: 9,
    font: helveticaBold,
    color: rgb(0.3, 0.35, 0.4),
  });

  page2.drawLine({
    start: { x: 325, y: height - 290 },
    end: { x: 535, y: height - 290 },
    thickness: 1,
    color: rgb(0.7, 0.75, 0.8),
  });

  page2.drawText('Date: November 12, 2026', {
    x: 325,
    y: height - 308,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Footer
  page2.drawText('Page 2 of 2 · Confidential · NextGen PDF Studio Sample Document', {
    x: 40,
    y: 35,
    size: 8,
    font: helveticaOblique,
    color: rgb(0.5, 0.55, 0.6),
  });

  return await pdfDoc.save();
}

function drawWrappedText(
  page: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  font: any,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth && line) {
      page.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.2, 0.22, 0.25),
      });
      line = word;
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: rgb(0.2, 0.22, 0.25),
    });
  }
}
