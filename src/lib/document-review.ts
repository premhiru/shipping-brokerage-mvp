import type { AutofillField, AutofillSuggestion } from "@/lib/document-autofill";
import { documentTypeLabels } from "@/lib/document-types";
import type { DocumentReviewFinding, DocumentStatus, Shipment } from "@/lib/types";

type ReviewShipment = Pick<
  Shipment,
  | "shipperName"
  | "consigneeName"
  | "notifyParty"
  | "cargoDescription"
  | "itemType"
  | "hsCode"
  | "packageCount"
  | "grossWeightKg"
  | "netWeightKg"
  | "incoterm"
  | "origin"
  | "destination"
  | "pol"
  | "pod"
  | "containerType"
  | "etd"
  | "eta"
  | "carrier"
  | "bookingNumber"
  | "blNumber"
  | "containerNumber"
>;

type ReviewFieldType = "text" | "number" | "date";

type FieldRule = {
  field: AutofillField;
  label: string;
  shipmentValue: (shipment: ReviewShipment) => string | number | undefined;
  type?: ReviewFieldType;
  severity?: DocumentReviewFinding["severity"];
};

export type DocumentReviewResult = {
  extractedFields: Record<string, string>;
  findings: DocumentReviewFinding[];
  summary: string;
  status: "clear" | "needs_review";
};

const fieldRules: FieldRule[] = [
  { field: "shipperName", label: "Shipper", shipmentValue: (shipment) => shipment.shipperName },
  { field: "consigneeName", label: "Consignee", shipmentValue: (shipment) => shipment.consigneeName },
  { field: "notifyParty", label: "Notify party", shipmentValue: (shipment) => shipment.notifyParty },
  { field: "carrier", label: "Carrier", shipmentValue: (shipment) => shipment.carrier },
  { field: "bookingNumber", label: "Booking number", shipmentValue: (shipment) => shipment.bookingNumber },
  { field: "cargoDescription", label: "Cargo description", shipmentValue: (shipment) => shipment.cargoDescription },
  { field: "itemType", label: "Item type", shipmentValue: (shipment) => shipment.itemType },
  { field: "hsCode", label: "HS code", shipmentValue: (shipment) => shipment.hsCode },
  { field: "packageCount", label: "Package count", shipmentValue: (shipment) => shipment.packageCount, type: "number" },
  { field: "grossWeightKg", label: "Gross weight", shipmentValue: (shipment) => shipment.grossWeightKg, type: "number" },
  { field: "netWeightKg", label: "Net weight", shipmentValue: (shipment) => shipment.netWeightKg, type: "number" },
  { field: "incoterm", label: "Incoterm", shipmentValue: (shipment) => shipment.incoterm },
  { field: "origin", label: "Origin", shipmentValue: (shipment) => shipment.origin },
  { field: "destination", label: "Destination", shipmentValue: (shipment) => shipment.destination },
  { field: "pol", label: "POL", shipmentValue: (shipment) => shipment.pol },
  { field: "pod", label: "POD", shipmentValue: (shipment) => shipment.pod },
  { field: "preferredEtd", label: "ETD", shipmentValue: (shipment) => shipment.etd, type: "date" },
  { field: "preferredEta", label: "ETA", shipmentValue: (shipment) => shipment.eta, type: "date" },
  { field: "containerType", label: "Container type", shipmentValue: (shipment) => shipment.containerType },
  { field: "containerNumber", label: "Container number", shipmentValue: (shipment) => shipment.containerNumber },
  { field: "blNumber", label: "B/L number", shipmentValue: (shipment) => shipment.blNumber, severity: "critical" },
];

const requiredDocumentTypes = [
  "commercial_invoice",
  "packing_list",
  "booking_confirmation",
  "shipping_instructions",
];

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(pte|ltd|limited|co|company|inc|llc|plc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value: string) {
  const iso = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? normalizeText(value) : parsed.toISOString().slice(0, 10);
}

function numberFromValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(cleanString(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesMatch(documentValue: string, shipmentValue: string | number | undefined, type: ReviewFieldType = "text") {
  const shipmentText = cleanString(String(shipmentValue ?? ""));

  if (!documentValue || !shipmentText) {
    return true;
  }

  if (type === "number") {
    const documentNumber = numberFromValue(documentValue);
    const shipmentNumber = numberFromValue(shipmentValue);

    if (documentNumber === null || shipmentNumber === null) {
      return true;
    }

    return Math.abs(documentNumber - shipmentNumber) <= Math.max(0.01, Math.abs(shipmentNumber) * 0.01);
  }

  if (type === "date") {
    return normalizeDate(documentValue) === normalizeDate(shipmentText);
  }

  const normalizedDocument = normalizeText(documentValue);
  const normalizedShipment = normalizeText(shipmentText);

  return (
    normalizedDocument === normalizedShipment ||
    normalizedDocument.includes(normalizedShipment) ||
    normalizedShipment.includes(normalizedDocument)
  );
}

export function suggestionsToExtractedFields(suggestions: AutofillSuggestion[] = []) {
  const extractedFields: Record<string, string> = {};

  for (const suggestion of suggestions) {
    if (!extractedFields[suggestion.field]) {
      extractedFields[suggestion.field] = suggestion.value;
    }
  }

  return extractedFields;
}

export function buildDocumentReview({
  shipment,
  suggestions,
}: {
  shipment: ReviewShipment;
  documentType: string;
  suggestions: AutofillSuggestion[];
}): DocumentReviewResult {
  const extractedFields = suggestionsToExtractedFields(suggestions);
  const findings: DocumentReviewFinding[] = [];

  for (const rule of fieldRules) {
    const documentValue = cleanString(extractedFields[rule.field]);
    const shipmentValue = rule.shipmentValue(shipment);
    const shipmentText = cleanString(String(shipmentValue ?? ""));

    if (!documentValue) {
      continue;
    }

    if (!shipmentText) {
      findings.push({
        field: rule.field,
        label: rule.label,
        severity: "warning",
        documentValue,
        message: `${rule.label} appears in the document but is missing from the shipment record.`,
      });
      continue;
    }

    if (!valuesMatch(documentValue, shipmentValue, rule.type)) {
      findings.push({
        field: rule.field,
        label: rule.label,
        severity: rule.severity ?? "critical",
        documentValue,
        shipmentValue: shipmentText,
        message: `${rule.label} mismatch: document says "${documentValue}", shipment record says "${shipmentText}".`,
      });
    }
  }

  return {
    extractedFields,
    findings,
    summary:
      findings.length > 0
        ? `${findings.length} document mismatch${findings.length === 1 ? "" : "es"} need review.`
        : suggestions.length > 0
          ? "No mismatches found from extracted document fields."
          : "No extractable shipment fields were available for mismatch checks.",
    status: findings.length > 0 ? "needs_review" : "clear",
  };
}

export function reviewStatusForDocument(baseStatus: DocumentStatus, findings: DocumentReviewFinding[]): DocumentStatus {
  if (findings.length > 0) {
    return "needs_review";
  }

  return baseStatus;
}

export function mergeReviewNote(notes: string, summary: string) {
  if (!summary) {
    return notes || null;
  }

  if (!notes) {
    return summary;
  }

  return `${summary} ${notes}`;
}

export function getMissingRequiredDocumentFindings(shipment: Shipment): DocumentReviewFinding[] {
  const uploadedTypes = new Set(
    shipment.documents
      .filter((document) => document.status !== "rejected")
      .map((document) => document.type),
  );

  return requiredDocumentTypes
    .filter((documentType) => !uploadedTypes.has(documentTypeLabels[documentType]))
    .map((documentType) => ({
      field: "documentChecklist",
      label: "Required document",
      severity: "warning" as const,
      documentValue: documentTypeLabels[documentType],
      message: `${documentTypeLabels[documentType]} has not been uploaded yet.`,
    }));
}

export function getShipmentReviewFindings(shipment: Shipment) {
  return [
    ...getMissingRequiredDocumentFindings(shipment),
    ...shipment.documents.flatMap((document) => document.reviewFindings ?? []),
  ];
}
