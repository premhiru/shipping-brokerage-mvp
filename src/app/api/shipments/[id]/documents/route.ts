import { documentLabelToValue, documentTypeValues } from "@/lib/document-types";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { DocumentStatus } from "@/lib/types";

export const runtime = "nodejs";

const documentStatuses = new Set([
  "uploaded",
  "processing",
  "needs_review",
  "approved",
  "shared_with_line",
]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanDocumentType(value: string) {
  const normalized = documentTypeValues.includes(value) ? value : documentLabelToValue(value);
  return documentTypeValues.includes(normalized) ? normalized : "other";
}

function documentStatusForShipment(status: DocumentStatus) {
  if (status === "approved") {
    return "approved";
  }

  if (status === "shared_with_line") {
    return "shared_with_line";
  }

  if (status === "needs_review") {
    return "needs_review";
  }

  return "uploaded";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const documentType = cleanDocumentType(cleanString(input.documentType));
    const status = documentStatuses.has(cleanString(input.status))
      ? (cleanString(input.status) as DocumentStatus)
      : "uploaded";
    const uploadedBy = cleanString(input.uploadedBy) || "Demo Admin";
    const notes = cleanString(input.notes);
    const upload = input.upload && typeof input.upload === "object"
      ? (input.upload as Record<string, unknown>)
      : {};
    const fileName = cleanString(upload.fileName) || cleanString(input.fileName);
    const storagePath = cleanString(upload.path) || cleanString(input.storagePath);
    const mimeType = cleanString(upload.mimeType) || null;
    const size = cleanNumber(upload.size);

    if (!fileName || !storagePath) {
      return jsonError("Upload a file before saving document metadata.", 400);
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("id, shipment_reference")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id)
      .maybeSingle();

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    if (!shipment) {
      return jsonError("Shipment was not found.", 404);
    }

    const uploadedAt = new Date().toISOString();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        company_id: DEMO_COMPANY_ID,
        shipment_id: id,
        document_type: documentType,
        file_name: fileName,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size_bytes: size,
        uploaded_by_name: uploadedBy,
        uploaded_at: uploadedAt,
        status,
        rejection_reason: notes || null,
      })
      .select("id")
      .single();

    if (documentError) {
      throw new Error(documentError.message);
    }

    const shipmentDocumentStatus = documentStatusForShipment(status);
    const nextAction =
      status === "needs_review"
        ? "Review newly uploaded document."
        : "Continue shipment workflow after document upload.";

    const { error: updateShipmentError } = await supabase
      .from("shipments")
      .update({
        document_status: shipmentDocumentStatus,
        next_action: nextAction,
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id);

    if (updateShipmentError) {
      throw new Error(updateShipmentError.message);
    }

    const { error: eventError } = await supabase.from("shipment_events").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      milestone: "Document uploaded",
      status: "completed",
      event_timestamp: uploadedAt,
      responsible_party: uploadedBy,
      notes: `${fileName} uploaded to shipment documents.`,
      source: "manual",
    });

    if (eventError) {
      throw new Error(eventError.message);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      actor_name: uploadedBy,
      actor_role: "admin",
      action: "document_uploaded",
      metadata: {
        reference: shipment.shipment_reference,
        documentId: document.id,
        documentType,
        fileName,
        status,
        storagePath,
      },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return Response.json({
      document: {
        id: document.id,
        fileName,
        status,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save document metadata.", 400);
  }
}
