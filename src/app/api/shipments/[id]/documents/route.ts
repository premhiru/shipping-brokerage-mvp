import { documentLabelToValue, documentTypeValues } from "@/lib/document-types";
import { buildDocumentReview, mergeReviewNote, reviewStatusForDocument } from "@/lib/document-review";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { AutofillConfidence, AutofillSuggestion } from "@/lib/document-autofill";
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

function cleanSuggestions(value: unknown): AutofillSuggestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item): AutofillSuggestion => ({
      field: cleanString(item.field) as AutofillSuggestion["field"],
      label: cleanString(item.label),
      value: cleanString(item.value),
      sourceFileName: cleanString(item.sourceFileName),
      confidence: (item.confidence === "high" ? "high" : "medium") satisfies AutofillConfidence,
    }))
    .filter((item) => item.field && item.label && item.value);
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
      .select(`
        id,
        shipment_reference,
        shipper_name,
        consignee_name,
        notify_party,
        cargo_description,
        item_type,
        hs_code,
        package_count,
        gross_weight_kg,
        net_weight_kg,
        incoterm,
        origin,
        destination,
        pol,
        pod,
        container_type,
        preferred_etd,
        preferred_eta,
        carrier,
        booking_number,
        bl_number,
        container_number
      `)
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id)
      .maybeSingle();

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    if (!shipment) {
      return jsonError("Shipment was not found.", 404);
    }

    const suggestions = cleanSuggestions(input.extractedFields);
    const review = buildDocumentReview({
      documentType,
      suggestions,
      shipment: {
        shipperName: cleanString(shipment.shipper_name),
        consigneeName: cleanString(shipment.consignee_name),
        notifyParty: cleanString(shipment.notify_party),
        cargoDescription: cleanString(shipment.cargo_description),
        itemType: cleanString(shipment.item_type),
        hsCode: cleanString(shipment.hs_code),
        packageCount: Number(shipment.package_count ?? 0),
        grossWeightKg: Number(shipment.gross_weight_kg ?? 0),
        netWeightKg: Number(shipment.net_weight_kg ?? 0),
        incoterm: cleanString(shipment.incoterm),
        origin: cleanString(shipment.origin),
        destination: cleanString(shipment.destination),
        pol: cleanString(shipment.pol),
        pod: cleanString(shipment.pod),
        containerType: cleanString(shipment.container_type),
        etd: cleanString(shipment.preferred_etd),
        eta: cleanString(shipment.preferred_eta),
        carrier: cleanString(shipment.carrier),
        bookingNumber: cleanString(shipment.booking_number),
        blNumber: cleanString(shipment.bl_number),
        containerNumber: cleanString(shipment.container_number),
      },
    });
    const finalStatus = reviewStatusForDocument(status, review.findings);
    const reviewNote = mergeReviewNote(notes, review.summary);
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
        status: finalStatus,
        rejection_reason: reviewNote,
        extracted_fields: review.extractedFields,
        review_findings: review.findings,
        review_summary: review.summary,
      })
      .select("id")
      .single();

    if (documentError) {
      throw new Error(documentError.message);
    }

    const shipmentDocumentStatus = documentStatusForShipment(finalStatus);
    const nextAction =
      finalStatus === "needs_review"
        ? "Review document mismatch findings."
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
      notes:
        review.findings.length > 0
          ? `${fileName} uploaded with ${review.findings.length} mismatch finding${review.findings.length === 1 ? "" : "s"}.`
          : `${fileName} uploaded to shipment documents.`,
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
        status: finalStatus,
        storagePath,
        reviewSummary: review.summary,
        reviewFindings: review.findings,
      },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return Response.json({
      document: {
        id: document.id,
        fileName,
        status: finalStatus,
        reviewSummary: review.summary,
        reviewFindings: review.findings,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save document metadata.", 400);
  }
}
