import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";
import {
  extractShipmentFieldsFromText,
  isPdfDocument,
  isTextExtractableDocument,
} from "@/lib/document-autofill";
import { jsonError } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_EXTRACTION_BYTES = 5 * 1024 * 1024;

function configurePdfWorker() {
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
  configurePdfWorker();

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

    if (!isTextExtractableDocument(file.name, file.type)) {
      return Response.json({
        suggestions: [],
        message:
          "This MVP can autofill from PDFs with selectable text, text, CSV, JSON, Markdown, and TSV files. Image OCR can be added next.",
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
