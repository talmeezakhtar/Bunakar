import PDFDocument from 'pdfkit';
import { Design } from '../entities/design.entity';

export function renderDesignSpecSheet(design: Design): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text('Bunakar — Rug Design Spec Sheet', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Design ID: ${design.id}`);
  doc.text(`Shape: ${design.shape}`);
  doc.text(`Size: ${design.widthFt}ft x ${design.heightFt}ft`);
  doc.moveDown();

  doc.text(`Field color: ${design.fieldColor?.name ?? design.fieldColorId}`);
  doc.text(
    `Field pattern: ${design.fieldPattern?.name ?? design.fieldPatternId}`,
  );
  doc.moveDown();

  doc.text(`Material: ${design.material?.name ?? design.materialId}`);
  doc.text(`Pile type: ${design.pileType?.name ?? design.pileTypeId}`);
  doc.moveDown();

  if (design.medallionEnabled) {
    doc.text(`Medallion: enabled (scale ${design.medallionScale})`);
    doc.moveDown();
  }

  doc.text('Borders:');
  for (const border of design.borders ?? []) {
    doc.text(`  #${border.order} — ${border.widthIn}in`);
  }
  doc.moveDown();

  doc
    .fontSize(14)
    .text(`Price estimate: $${design.priceEstimate}`, { align: 'right' });

  doc.end();
  return doc;
}
