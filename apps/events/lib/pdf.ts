import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function renderProposalPdf(text: string, footer = "Snow White Laundry") {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  const maxWidth = 475;

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const testLine = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  });
  if (current) lines.push(current);

  let cursorY = 780;
  lines.forEach((line) => {
    page.drawText(line, {
      x: 60,
      y: cursorY,
      size: fontSize,
      font,
      color: rgb(0.9, 0.9, 0.9),
    });
    cursorY -= lineHeight;
  });

  page.drawText(footer, {
    x: 60,
    y: 40,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}
