import { extractShipmentFieldsFromText, isTextExtractableDocument } from "@/lib/document-autofill";
import { jsonError } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_EXTRACTION_BYTES = 5 * 1024 * 1024;

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

    if (!isTextExtractableDocument(file.name, file.type)) {
      return Response.json({
        suggestions: [],
        message:
          "This MVP can autofill from text, CSV, JSON, Markdown, and TSV files. PDF and image OCR can be added next.",
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
