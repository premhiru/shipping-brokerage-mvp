import PDFDocument from "pdfkit";
import { getMissingRequiredDocumentFindings, getShipmentReviewFindings } from "@/lib/document-review";
import { documentTypes } from "@/lib/demo-data";
import { formatDate, formatDateTime, formatNumber, titleize } from "@/lib/format";
import type { DocumentReviewFinding, Shipment } from "@/lib/types";

type PdfDoc = InstanceType<typeof PDFDocument>;

const page = {
  margin: 48,
  width: 612,
  height: 792,
};

const colors = {
  ink: "#0f172a",
  muted: "#52525b",
  line: "#d4d4d8",
  soft: "#f4f4f5",
  sky: "#0369a1",
  amber: "#92400e",
  rose: "#be123c",
  green: "#047857",
};

function sanitize(value: string | number | null | undefined) {
  const text = value === null || value === undefined || value === "" ? "Not set" : String(value);

  return text
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[•·]/g, "-")
    .replace(/[–—]/g, "-")
    .trim();
}

function collectBuffer(doc: PdfDoc) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensureSpace(doc: PdfDoc, neededHeight: number) {
  if (doc.y + neededHeight <= page.height - page.margin) {
    return;
  }

  doc.addPage();
}

function footer(doc: PdfDoc, shipment: Shipment) {
  const currentY = doc.y;
  const pageCount = doc.bufferedPageRange().count;

  for (let index = 0; index < pageCount; index += 1) {
    doc.switchToPage(index);
    doc
      .fontSize(8)
      .fillColor(colors.muted)
      .text(
        `HarborBridge shipment pack - ${shipment.reference} - Page ${index + 1} of ${pageCount}`,
        page.margin,
        page.height - 34,
        { align: "center", lineBreak: false, width: page.width - page.margin * 2 },
      );
  }

  doc.switchToPage(pageCount - 1);
  doc.y = currentY;
}

function sectionTitle(doc: PdfDoc, title: string) {
  ensureSpace(doc, 42);
  doc.x = page.margin;
  doc.moveDown(0.7);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(colors.ink)
    .text(title, page.margin, doc.y, { width: page.width - page.margin * 2 });
  doc
    .moveTo(page.margin, doc.y + 4)
    .lineTo(page.width - page.margin, doc.y + 4)
    .strokeColor(colors.line)
    .stroke();
  doc.moveDown(0.7);
}

function labelValue(doc: PdfDoc, label: string, value: string | number | undefined | null, x: number, y: number, width: number) {
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(colors.muted)
    .text(label.toUpperCase(), x, y, { width });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.ink)
    .text(sanitize(value), x, y + 13, { width });
}

function detailsGrid(doc: PdfDoc, rows: Array<[string, string | number | undefined | null]>, columns = 3) {
  const gutter = 14;
  const columnWidth = (page.width - page.margin * 2 - gutter * (columns - 1)) / columns;
  const rowHeight = 44;

  for (let index = 0; index < rows.length; index += columns) {
    ensureSpace(doc, rowHeight + 8);
    doc.x = page.margin;
    const y = doc.y;
    rows.slice(index, index + columns).forEach(([label, value], columnIndex) => {
      const x = page.margin + columnIndex * (columnWidth + gutter);
      labelValue(doc, label, value, x, y, columnWidth);
    });
    doc.y = y + rowHeight;
  }
}

function statusText(value: string) {
  return titleize(value);
}

function findingTone(finding: DocumentReviewFinding) {
  if (finding.severity === "critical") {
    return colors.rose;
  }

  if (finding.severity === "warning") {
    return colors.amber;
  }

  return colors.sky;
}

function bullet(doc: PdfDoc, text: string, options: { color?: string; indent?: number } = {}) {
  ensureSpace(doc, 24);
  doc.x = page.margin;
  const indent = options.indent ?? 0;
  const x = page.margin + indent;
  const y = doc.y;

  doc.font("Helvetica").fontSize(9).fillColor(options.color ?? colors.ink).text("-", x, y, { width: 10 });
  doc.text(sanitize(text), x + 12, y, { width: page.width - page.margin * 2 - indent - 12 });
  doc.moveDown(0.4);
}

function documentChecklist(doc: PdfDoc, shipment: Shipment) {
  const uploadedTypes = new Set(shipment.documents.map((document) => document.type));

  for (const documentType of documentTypes) {
    const uploaded = uploadedTypes.has(documentType);
    bullet(doc, `${uploaded ? "[x]" : "[ ]"} ${documentType}`, {
      color: uploaded ? colors.green : colors.muted,
    });
  }
}

function reviewFindings(doc: PdfDoc, shipment: Shipment) {
  const missing = getMissingRequiredDocumentFindings(shipment);
  const findings = getShipmentReviewFindings(shipment);

  detailsGrid(
    doc,
    [
      ["Missing required docs", missing.length],
      ["Field findings", findings.length - missing.length],
      ["Docs uploaded", shipment.documents.length],
    ],
    3,
  );

  if (findings.length === 0) {
    bullet(doc, "No document review blockers found.", { color: colors.green });
    return;
  }

  findings.forEach((finding) => {
    bullet(doc, `${finding.label}: ${finding.message}`, { color: findingTone(finding) });
  });
}

function tableHeader(doc: PdfDoc, headers: string[], widths: number[]) {
  ensureSpace(doc, 24);
  doc.x = page.margin;
  const startX = page.margin;
  let x = startX;
  const y = doc.y;

  doc.rect(startX, y, widths.reduce((sum, width) => sum + width, 0), 18).fill(colors.soft);
  headers.forEach((header, index) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colors.muted)
      .text(header.toUpperCase(), x + 4, y + 5, { width: widths[index] - 8 });
    x += widths[index];
  });
  doc.y = y + 22;
}

function documentTable(doc: PdfDoc, shipment: Shipment) {
  const widths = [120, 166, 80, 140];
  tableHeader(doc, ["Type", "File", "Status", "Review"], widths);

  if (shipment.documents.length === 0) {
    bullet(doc, "No documents uploaded yet.", { color: colors.muted });
    return;
  }

  shipment.documents.forEach((document) => {
    ensureSpace(doc, 42);
    const y = doc.y;
    const values = [
      document.type,
      document.fileName,
      statusText(document.status),
      document.reviewSummary || (document.reviewFindings?.length ? `${document.reviewFindings.length} finding(s)` : "No findings"),
    ];
    let x = page.margin;

    values.forEach((value, index) => {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(colors.ink)
        .text(sanitize(value), x + 4, y, { width: widths[index] - 8, height: 34 });
      x += widths[index];
    });

    doc
      .moveTo(page.margin, y + 38)
      .lineTo(page.width - page.margin, y + 38)
      .strokeColor(colors.line)
      .stroke();
    doc.y = y + 44;
  });
}

function timelineTable(doc: PdfDoc, shipment: Shipment) {
  const milestones = shipment.timeline.slice(0, 12);
  const widths = [154, 76, 94, 188];

  tableHeader(doc, ["Milestone", "Status", "Date", "Notes"], widths);

  if (milestones.length === 0) {
    bullet(doc, "No timeline milestones yet.", { color: colors.muted });
    return;
  }

  milestones.forEach((event) => {
    ensureSpace(doc, 44);
    const y = doc.y;
    const values = [
      event.milestone,
      statusText(event.status),
      formatDate(event.timestamp),
      event.notes,
    ];
    let x = page.margin;

    values.forEach((value, index) => {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(colors.ink)
        .text(sanitize(value), x + 4, y, { width: widths[index] - 8, height: 36 });
      x += widths[index];
    });
    doc
      .moveTo(page.margin, y + 40)
      .lineTo(page.width - page.margin, y + 40)
      .strokeColor(colors.line)
      .stroke();
    doc.y = y + 46;
  });
}

function audit(doc: PdfDoc, shipment: Shipment, generatedAt: string) {
  const latestAudit = shipment.auditLogs.slice(0, 6);

  bullet(doc, `Pack generated at ${formatDateTime(generatedAt)}.`);
  latestAudit.forEach((log) => {
    bullet(doc, `${formatDateTime(log.timestamp)} - ${log.actor}: ${log.action}`, { color: colors.muted });
  });
}

export async function generateShipmentPackPdf({
  shipment,
  generatedAt = new Date().toISOString(),
}: {
  shipment: Shipment;
  generatedAt?: string;
}) {
  const doc = new PDFDocument({
    autoFirstPage: true,
    bufferPages: true,
    margins: {
      top: page.margin,
      right: page.margin,
      bottom: 24,
      left: page.margin,
    },
    size: "LETTER",
  });
  const pendingBuffer = collectBuffer(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(colors.sky)
    .text("HARBORBRIDGE SHIPMENT PACK", { characterSpacing: 1.2 });
  doc
    .moveDown(0.4)
    .fontSize(24)
    .fillColor(colors.ink)
    .text(shipment.reference);
  doc
    .moveDown(0.2)
    .font("Helvetica")
    .fontSize(12)
    .fillColor(colors.muted)
    .text(`${shipment.origin} to ${shipment.destination}`);
  doc
    .moveDown(0.5)
    .fontSize(9)
    .text(`Generated ${formatDateTime(generatedAt)}`);

  sectionTitle(doc, "Executive Summary");
  detailsGrid(
    doc,
    [
      ["Shipment status", statusText(shipment.status)],
      ["Document status", statusText(shipment.documentStatus)],
      ["B/L status", shipment.blStatus],
      ["Carrier", shipment.carrier],
      ["Booking number", shipment.bookingNumber],
      ["Container number", shipment.containerNumber],
      ["Next action", shipment.nextAction],
      ["ETD", formatDate(shipment.etd)],
      ["ETA", formatDate(shipment.eta)],
    ],
    3,
  );

  sectionTitle(doc, "Parties And Route");
  detailsGrid(
    doc,
    [
      ["Shipper", shipment.shipperName],
      ["Consignee", shipment.consigneeName],
      ["Notify party", shipment.notifyParty],
      ["Origin", shipment.origin],
      ["POL", shipment.pol],
      ["POD", shipment.pod],
      ["Destination", shipment.destination],
      ["Incoterm", shipment.incoterm],
      ["Carrier", shipment.carrier],
    ],
    3,
  );

  sectionTitle(doc, "Cargo Details");
  detailsGrid(
    doc,
    [
      ["Description", shipment.cargoDescription],
      ["Item type", shipment.itemType],
      ["HS code", shipment.hsCode],
      ["Packages", shipment.packageCount],
      ["Container type", shipment.containerType],
      ["Dimensions", shipment.dimensions],
      ["Gross weight", formatNumber(shipment.grossWeightKg, " kg")],
      ["Net weight", formatNumber(shipment.netWeightKg, " kg")],
      ["Volume", formatNumber(shipment.volumeCbm, " CBM")],
    ],
    3,
  );

  sectionTitle(doc, "Document Checklist");
  documentChecklist(doc, shipment);

  sectionTitle(doc, "Document Review Findings");
  reviewFindings(doc, shipment);

  sectionTitle(doc, "Uploaded Documents");
  documentTable(doc, shipment);

  sectionTitle(doc, "Timeline");
  timelineTable(doc, shipment);

  sectionTitle(doc, "Bill Of Lading");
  if (shipment.billOfLading) {
    detailsGrid(
      doc,
      [
        ["B/L number", shipment.billOfLading.number],
        ["Type", shipment.billOfLading.type],
        ["Status", shipment.billOfLading.status],
        ["Issued", formatDateTime(shipment.billOfLading.issuedAt)],
        ["Approved", formatDateTime(shipment.billOfLading.approvedAt)],
        ["Notes", shipment.billOfLading.notes],
      ],
      3,
    );
  } else {
    bullet(doc, "B/L not issued yet.", { color: colors.muted });
  }

  sectionTitle(doc, "Audit Snapshot");
  audit(doc, shipment, generatedAt);

  footer(doc, shipment);
  doc.end();

  return pendingBuffer;
}
