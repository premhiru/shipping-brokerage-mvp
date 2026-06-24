import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  extractShipmentFieldsFromText,
  isExcelDocument,
  isLegacyExcelDocument,
  isPdfDocument,
  isTextExtractableDocument,
} from "@/lib/document-autofill";
import { jsonError } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_EXTRACTION_BYTES = 5 * 1024 * 1024;

type PdfParser = typeof import("pdf-parse")["PDFParse"];

async function installPdfCanvasPolyfills() {
  const canvas = await import("@napi-rs/canvas");
  const canvasPolyfills = canvas as Record<string, unknown>;
  const globalScope = globalThis as Record<string, unknown>;

  globalScope.DOMMatrix ??= canvasPolyfills.DOMMatrix;
  globalScope.DOMPoint ??= canvasPolyfills.DOMPoint;
  globalScope.DOMRect ??= canvasPolyfills.DOMRect;
  globalScope.ImageData ??= canvasPolyfills.ImageData;
  globalScope.Path2D ??= canvasPolyfills.Path2D;
}

function configurePdfWorker(PDFParse: PdfParser) {
  const require = createRequire(import.meta.url);
  const workerCandidates = [
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs"),
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ];
  const workerPath = workerCandidates.find((candidate) => existsSync(candidate));

  if (workerPath) {
    PDFParse.setWorker(pathToFileURL(workerPath).toString());
  }
}

async function extractPdfText(file: File) {
  await installPdfCanvasPolyfills();

  const { PDFParse } = await import("pdf-parse");

  configurePdfWorker(PDFParse);

  const parser = new PDFParse({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

function looksLikeHeaderRow(cells: string[]) {
  const filledCells = cells.filter(Boolean);

  if (filledCells.length < 2) {
    return false;
  }

  const headerSignals = filledCells.filter((cell) =>
    /\b(shipper|consignee|notify|cargo|description|origin|destination|gross|weight|container|b\/l|bl|booking|carrier|incoterm|pol|pod|etd|eta|hs|package|pkgs)\b/i.test(
      cell,
    ),
  );

  return headerSignals.length >= 2;
}

function normalizeCellText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function extractExcelText(file: File) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const fileBuffer = Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0];
  const lines: string[] = [];

  await workbook.xlsx.load(fileBuffer);

  workbook.eachSheet((worksheet) => {
    const rows: string[][] = [];

    lines.push(`Sheet: ${worksheet.name}`);

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const maxCellCount = Math.min(row.cellCount, 50);
      const cells: string[] = [];

      for (let columnIndex = 1; columnIndex <= maxCellCount; columnIndex += 1) {
        cells.push(normalizeCellText(row.getCell(columnIndex).text ?? ""));
      }

      if (cells.some(Boolean)) {
        rows.push(cells);
      }
    });

    rows.slice(0, 200).forEach((cells, rowIndex) => {
      const filledCells = cells.filter(Boolean);

      if (filledCells.length === 0) {
        return;
      }

      lines.push(filledCells.join(" | "));

      if (filledCells.length >= 2 && !looksLikeHeaderRow(cells)) {
        lines.push(`${filledCells[0]}: ${filledCells.slice(1).join(" ")}`);
      }

      const nextRow = rows[rowIndex + 1];
      if (!nextRow || !looksLikeHeaderRow(cells)) {
        return;
      }

      cells.forEach((header, columnIndex) => {
        const value = nextRow[columnIndex];

        if (header && value) {
          lines.push(`${header}: ${value}`);
        }
      });
    });
  });

  return lines.join("\n").trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Upload a document file to extract shipment fields.", 400);
    }

    if (file.size > MAX_EXTRACTION_BYTES) {
      return jsonError("Document extraction supports files up to 5 MB.", 413);
    }

    if (isPdfDocument(file.name, file.type)) {
      const text = await extractPdfText(file);

      if (!text) {
        return Response.json({
          suggestions: [],
          message: "No selectable PDF text was found. Scanned PDFs and image OCR can be added next.",
        });
      }

      const suggestions = extractShipmentFieldsFromText(text, file.name);

      return Response.json({
        suggestions,
        message:
          suggestions.length > 0
            ? `Found ${suggestions.length} shipment field suggestion${suggestions.length === 1 ? "" : "s"} from PDF text.`
            : "PDF text was extracted, but no labeled shipment fields were found.",
      });
    }

    if (isExcelDocument(file.name, file.type)) {
      const text = await extractExcelText(file);
      const suggestions = extractShipmentFieldsFromText(text, file.name);

      return Response.json({
        suggestions,
        message:
          suggestions.length > 0
            ? `Found ${suggestions.length} shipment field suggestion${suggestions.length === 1 ? "" : "s"} from Excel workbook.`
            : "Excel workbook text was extracted, but no labeled shipment fields were found.",
      });
    }

    if (isLegacyExcelDocument(file.name, file.type)) {
      return Response.json({
        suggestions: [],
        message: "Legacy .xls files are not supported yet. Save the workbook as .xlsx or .xlsm for autofill.",
      });
    }

    if (!isTextExtractableDocument(file.name, file.type)) {
      return Response.json({
        suggestions: [],
        message:
          "This MVP can autofill from PDFs with selectable text, Excel workbooks (.xlsx/.xlsm), text, CSV, JSON, Markdown, and TSV files. Image OCR and legacy .xls can be added next.",
      });
    }

    const text = await file.text();
    const suggestions = extractShipmentFieldsFromText(text, file.name);

    return Response.json({
      suggestions,
      message:
        suggestions.length > 0
          ? `Found ${suggestions.length} shipment field suggestion${suggestions.length === 1 ? "" : "s"}.`
          : "No labeled shipment fields were found in this document.",
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to extract document fields.", 400);
  }
}
