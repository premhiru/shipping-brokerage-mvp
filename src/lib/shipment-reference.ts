export const DEFAULT_SHIPMENT_REFERENCE = "HB-2026-0005";

const shipmentReferencePattern = /^HB-2026-(\d+)$/;
const minimumReferenceSeed = 4;

function referenceNumber(reference: string) {
  const parsed = Number(reference.match(shipmentReferencePattern)?.[1] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function nextShipmentReference(references: string[]) {
  const nextNumber = Math.max(minimumReferenceSeed, ...references.map(referenceNumber)) + 1;
  return `HB-2026-${String(nextNumber).padStart(4, "0")}`;
}

export function resolveAvailableShipmentReference(baseReference: string, references: string[]) {
  const normalized = baseReference.trim() || DEFAULT_SHIPMENT_REFERENCE;
  return references.includes(normalized) ? nextShipmentReference(references) : normalized;
}
