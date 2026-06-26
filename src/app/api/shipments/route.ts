import { createHash } from "crypto";
import { buildDocumentReview, mergeReviewNote, reviewStatusForDocument } from "@/lib/document-review";
import { resolveAvailableShipmentReference, nextShipmentReference } from "@/lib/shipment-reference";
import { getSupabaseShipments } from "@/lib/supabase-shipments";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { AutofillConfidence, AutofillSuggestion } from "@/lib/document-autofill";
import type { DocumentStatus, ShipmentStatus } from "@/lib/types";

export const runtime = "nodejs";

type UploadedDocumentPayload = {
  rowId: string;
  documentType: string;
  status: DocumentStatus;
  uploadedBy: string;
  notes: string;
  upload?: {
    path: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
  extractedFields?: AutofillSuggestion[];
};

type AutofillPayload = {
  appliedFields: string[];
  sourceFiles: string[];
};

type CreateShipmentPayload = {
  intent: "draft" | "created";
  shipmentReference: string;
  carrier: string;
  bookingNumber: string;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  cargoDescription: string;
  itemType: string;
  hsCode: string;
  packageCount: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  grossWeightKg: number;
  netWeightKg: number;
  volumeCbm: number;
  incoterm: string;
  origin: string;
  destination: string;
  containerType: string;
  pol: string;
  pod: string;
  preferredEtd: string;
  preferredEta: string;
  blNumber: string;
  containerNumber: string;
  notes: string;
  documents: UploadedDocumentPayload[];
  autofill: AutofillPayload;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requireField(value: string, label: string) {
  if (!value) {
    throw new Error(`${label} is required.`);
  }
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(cleanString).filter(Boolean);
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

async function resolveUniqueReference(baseReference: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase server env vars are missing.");
  }

  const { data, error } = await supabase
    .from("shipments")
    .select("shipment_reference")
    .eq("company_id", DEMO_COMPANY_ID)
    .ilike("shipment_reference", "HB-2026-%");

  if (error) {
    throw new Error(error.message);
  }

  return resolveAvailableShipmentReference(
    baseReference,
    (data ?? []).map((row) => row.shipment_reference as string),
  );
}

function parsePayload(raw: unknown): CreateShipmentPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid shipment payload.");
  }

  const input = raw as Record<string, unknown>;
  const rawAutofill = input.autofill && typeof input.autofill === "object"
    ? (input.autofill as Record<string, unknown>)
    : {};
  const payload: CreateShipmentPayload = {
    intent: input.intent === "draft" ? "draft" : "created",
    shipmentReference: cleanString(input.shipmentReference),
    carrier: cleanString(input.carrier),
    bookingNumber: cleanString(input.bookingNumber),
    shipperName: cleanString(input.shipperName),
    consigneeName: cleanString(input.consigneeName),
    notifyParty: cleanString(input.notifyParty),
    cargoDescription: cleanString(input.cargoDescription),
    itemType: cleanString(input.itemType),
    hsCode: cleanString(input.hsCode),
    packageCount: cleanNumber(input.packageCount),
    lengthCm: cleanNumber(input.lengthCm),
    widthCm: cleanNumber(input.widthCm),
    heightCm: cleanNumber(input.heightCm),
    grossWeightKg: cleanNumber(input.grossWeightKg),
    netWeightKg: cleanNumber(input.netWeightKg),
    volumeCbm: cleanNumber(input.volumeCbm),
    incoterm: cleanString(input.incoterm) || "FOB",
    origin: cleanString(input.origin),
    destination: cleanString(input.destination),
    containerType: cleanString(input.containerType),
    pol: cleanString(input.pol),
    pod: cleanString(input.pod),
    preferredEtd: cleanString(input.preferredEtd),
    preferredEta: cleanString(input.preferredEta),
    blNumber: cleanString(input.blNumber),
    containerNumber: cleanString(input.containerNumber),
    notes: cleanString(input.notes),
    documents: Array.isArray(input.documents)
      ? (input.documents as UploadedDocumentPayload[]).map((document) => ({
          ...document,
          extractedFields: cleanSuggestions((document as Record<string, unknown>).extractedFields),
        }))
      : [],
    autofill: {
      appliedFields: cleanStringArray(rawAutofill.appliedFields),
      sourceFiles: cleanStringArray(rawAutofill.sourceFiles),
    },
  };

  requireField(payload.shipperName, "Shipper name");
  requireField(payload.consigneeName, "Consignee name");
  requireField(payload.cargoDescription, "Cargo description");
  requireField(payload.origin, "Origin");
  requireField(payload.destination, "Destination");

  return payload;
}

function dimensionsText(payload: CreateShipmentPayload) {
  if (!payload.lengthCm || !payload.widthCm || !payload.heightCm) {
    return "";
  }

  return `${payload.lengthCm} x ${payload.widthCm} x ${payload.heightCm} cm`;
}

export async function GET() {
  try {
    const shipments = await getSupabaseShipments();

    if (!shipments) {
      return jsonError("Supabase server env vars are missing.", 500);
    }

    return Response.json(
      {
        shipments,
        nextReference: nextShipmentReference(shipments.map((shipment) => shipment.reference)),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load shipments.", 500);
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError(
      "Supabase server env vars are missing. Add SUPABASE_URL and SUPABASE_SECRET_KEY.",
      500,
    );
  }

  try {
    const payload = parsePayload(await request.json());
    const shipmentReference = await resolveUniqueReference(payload.shipmentReference);
    const hasUploadedDocuments = payload.documents.some((document) => document.upload?.path);
    const status: ShipmentStatus = "draft";
    const documentStatus: DocumentStatus = hasUploadedDocuments ? "uploaded" : "not_uploaded";

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .insert({
        company_id: DEMO_COMPANY_ID,
        shipment_reference: shipmentReference,
        shipper_name: payload.shipperName,
        consignee_name: payload.consigneeName,
        notify_party: payload.notifyParty || null,
        cargo_description: payload.cargoDescription,
        item_type: payload.itemType || null,
        hs_code: payload.hsCode || null,
        package_count: payload.packageCount || null,
        dimensions: dimensionsText(payload) || null,
        gross_weight_kg: payload.grossWeightKg || null,
        net_weight_kg: payload.netWeightKg || null,
        volume_cbm: payload.volumeCbm || null,
        incoterm: payload.incoterm,
        origin: payload.origin,
        destination: payload.destination,
        pol: payload.pol || null,
        pod: payload.pod || null,
        container_type: payload.containerType || null,
        preferred_etd: payload.preferredEtd || null,
        preferred_eta: payload.preferredEta || null,
        carrier: payload.carrier || "Carrier pending",
        booking_number: payload.bookingNumber || null,
        bl_number: payload.blNumber || null,
        container_number: payload.containerNumber || null,
        status,
        document_status: documentStatus,
        bl_status: payload.blNumber ? "B/L reference captured" : "Not issued",
        next_action: hasUploadedDocuments
          ? "Review uploaded documents and prepare carrier sharing."
          : "Upload initial shipment documents.",
        notes: payload.notes || null,
      })
      .select("id, shipment_reference")
      .single();

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    const shipmentId = shipment.id as string;

    const { error: cargoError } = await supabase.from("cargo_items").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      description: payload.cargoDescription,
      item_type: payload.itemType || null,
      hs_code: payload.hsCode || null,
      package_count: payload.packageCount || null,
      length_cm: payload.lengthCm || null,
      width_cm: payload.widthCm || null,
      height_cm: payload.heightCm || null,
      gross_weight_kg: payload.grossWeightKg || null,
      net_weight_kg: payload.netWeightKg || null,
      volume_cbm: payload.volumeCbm || null,
    });

    if (cargoError) {
      throw new Error(cargoError.message);
    }

    const uploadedDocuments = payload.documents.filter((document) => document.upload?.path);
    const reviewedDocuments = uploadedDocuments.map((document) => {
      const review = buildDocumentReview({
        documentType: document.documentType,
        suggestions: document.extractedFields ?? [],
        shipment: {
          shipperName: payload.shipperName,
          consigneeName: payload.consigneeName,
          notifyParty: payload.notifyParty,
          cargoDescription: payload.cargoDescription,
          itemType: payload.itemType,
          hsCode: payload.hsCode,
          packageCount: payload.packageCount,
          grossWeightKg: payload.grossWeightKg,
          netWeightKg: payload.netWeightKg,
          incoterm: payload.incoterm,
          origin: payload.origin,
          destination: payload.destination,
          pol: payload.pol,
          pod: payload.pod,
          containerType: payload.containerType,
          etd: payload.preferredEtd,
          eta: payload.preferredEta,
          carrier: payload.carrier,
          bookingNumber: payload.bookingNumber,
          blNumber: payload.blNumber,
          containerNumber: payload.containerNumber,
        },
      });

      return {
        document,
        review,
        status: reviewStatusForDocument(document.status, review.findings),
      };
    });

    if (reviewedDocuments.length > 0) {
      const { error: documentsError } = await supabase.from("documents").insert(
        reviewedDocuments.map(({ document, review, status: finalDocumentStatus }) => ({
          company_id: DEMO_COMPANY_ID,
          shipment_id: shipmentId,
          document_type: document.documentType,
          file_name: document.upload?.fileName || "Uploaded document",
          storage_path: document.upload?.path,
          mime_type: document.upload?.mimeType || null,
          file_size_bytes: document.upload?.size || null,
          uploaded_by_name: document.uploadedBy || "Demo Admin",
          uploaded_at: new Date().toISOString(),
          status: finalDocumentStatus || "uploaded",
          rejection_reason: mergeReviewNote(document.notes, review.summary),
          extracted_fields: review.extractedFields,
          review_findings: review.findings,
          review_summary: review.summary,
        })),
      );

      if (documentsError) {
        throw new Error(documentsError.message);
      }

      if (reviewedDocuments.some(({ status: finalDocumentStatus }) => finalDocumentStatus === "needs_review")) {
        const { error: reviewStatusError } = await supabase
          .from("shipments")
          .update({
            document_status: "needs_review",
            next_action: "Review document mismatch findings.",
          })
          .eq("company_id", DEMO_COMPANY_ID)
          .eq("id", shipmentId);

        if (reviewStatusError) {
          throw new Error(reviewStatusError.message);
        }
      }
    }

    const eventRows = [
      {
        company_id: DEMO_COMPANY_ID,
        shipment_id: shipmentId,
        milestone: "Draft created",
        status: "completed",
        event_timestamp: new Date().toISOString(),
        responsible_party: "Broker",
        notes:
          payload.intent === "draft"
            ? "Draft saved to Supabase from the shipment intake form."
            : "Shipment created in Supabase from the shipment intake form.",
        source: "manual",
      },
      ...(hasUploadedDocuments
        ? [
            {
              company_id: DEMO_COMPANY_ID,
              shipment_id: shipmentId,
              milestone: "Documents uploaded",
              status: "completed",
              event_timestamp: new Date().toISOString(),
              responsible_party: "Broker",
              notes: `${reviewedDocuments.length} initial document file${
                reviewedDocuments.length === 1 ? "" : "s"
              } uploaded through Supabase Storage${
                reviewedDocuments.some(({ review }) => review.findings.length > 0)
                  ? " with mismatch findings for review."
                  : "."
              }`,
              source: "manual",
            },
          ]
        : []),
    ];

    const { error: eventsError } = await supabase.from("shipment_events").insert(eventRows);

    if (eventsError) {
      throw new Error(eventsError.message);
    }

    const { error: commentsError } = await supabase.from("comments").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      user_name: "Demo Admin",
      user_role: "admin",
      message:
        payload.intent === "draft"
          ? "Draft shipment saved from the intake form."
          : "Shipment created from the intake form and ready for review.",
    });

    if (commentsError) {
      throw new Error(commentsError.message);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      actor_name: "Demo Admin",
      actor_role: "admin",
      action: "shipment_created",
      metadata: {
        reference: shipmentReference,
        source: "create_shipment_form",
        uploadedDocumentCount: reviewedDocuments.length,
        autofillAppliedFields: payload.autofill.appliedFields,
        autofillSourceFiles: payload.autofill.sourceFiles,
        documentReviewFindings: reviewedDocuments.reduce(
          (total, item) => total + item.review.findings.length,
          0,
        ),
      },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    if (payload.blNumber) {
      const { error: blError } = await supabase.from("bill_of_lading_records").insert({
        company_id: DEMO_COMPANY_ID,
        shipment_id: shipmentId,
        bl_number: payload.blNumber,
        bl_type: "Not selected",
        status: "Reference captured",
        notes: "B/L reference captured during shipment creation.",
      });

      if (blError) {
        throw new Error(blError.message);
      }
    }

    const token = `share-${shipmentId}`;
    await supabase.from("share_links").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      public_token: token,
      token_hash: createHash("sha256").update(token).digest("hex"),
      recipient_company: payload.carrier || "Carrier pending",
      recipient_name: "Carrier contact",
      recipient_email: "",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return Response.json({
      shipment: {
        id: shipmentId,
        reference: shipmentReference,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create shipment.", 400);
  }
}
