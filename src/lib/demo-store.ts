import { shipments } from "@/lib/demo-data";
import type { Shipment } from "@/lib/types";

export const CREATED_DEMO_SHIPMENT_ID = "demo-created-shipment";
const STORAGE_KEY = "harborbridge.createdShipments";

export function buildCreatedDemoShipment(volumeCbm: number, initialDocumentCount = 1): Shipment {
  const now = new Date().toISOString();
  const documentCount = Math.max(1, initialDocumentCount);

  return {
    id: CREATED_DEMO_SHIPMENT_ID,
    reference: "HB-2026-0005",
    shipperName: "Demo Exporter Pte Ltd",
    consigneeName: "Demo Consignee Ltd",
    notifyParty: "Demo Notify Party",
    cargoDescription: "New demo shipment created from intake form",
    itemType: "General cargo",
    hsCode: "0000.00",
    packageCount: 10,
    dimensions: "120 x 100 x 140 cm demo packages",
    grossWeightKg: 0,
    netWeightKg: 0,
    volumeCbm,
    incoterm: "FOB",
    origin: "Singapore",
    destination: "Rotterdam, Netherlands",
    pol: "Singapore",
    pod: "Rotterdam",
    containerType: "40HC",
    etd: "2026-07-15",
    eta: "2026-08-15",
    carrier: "Carrier pending",
    status: "draft",
    documentStatus: "uploaded",
    blStatus: "Not issued",
    nextAction: "Review uploaded documents and share with shipping line",
    notes: "Created from the MVP create shipment flow. Supabase persistence will replace local demo storage.",
    lastUpdated: now,
    cargoItems: [
      {
        description: "New demo shipment created from intake form",
        itemType: "General cargo",
        hsCode: "0000.00",
        packages: 10,
        dimensions: "120 x 100 x 140 cm demo packages",
        grossWeightKg: 0,
        netWeightKg: 0,
        volumeCbm,
      },
    ],
    documents: Array.from({ length: documentCount }, (_, index) => ({
      id: `doc-1005-initial-${index + 1}`,
      type: index === 0 ? "Commercial invoice" : "Other",
      fileName: `initial-demo-upload-${index + 1}.pdf`,
      uploadedBy: "Demo Admin",
      uploadedAt: now,
      status: "uploaded",
    })),
    timeline: [
      {
        milestone: "Draft created",
        status: "completed",
        timestamp: now,
        responsibleParty: "Broker",
        notes: "Shipment created from the demo intake form.",
        source: "manual",
      },
      {
        milestone: "Documents uploaded",
        status: "completed",
        timestamp: now,
        responsibleParty: "Broker",
        notes: "Initial document placeholder attached during creation.",
        source: "manual",
      },
    ],
    comments: [
      {
        userName: "Demo Admin",
        role: "admin",
        timestamp: now,
        message: "Created from the intake form and ready for document review.",
      },
    ],
    auditLogs: [
      {
        action: "shipment_created",
        actor: "Demo Admin",
        role: "admin",
        timestamp: now,
        detail: "Created demo shipment HB-2026-0005 from the intake form.",
      },
    ],
    shareLinks: [],
  };
}

export function readCreatedShipments(): Shipment[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Shipment[]) : [];
  } catch {
    return [];
  }
}

export function readAllDemoShipments() {
  return [...readCreatedShipments(), ...shipments];
}

export function saveCreatedShipment(shipment: Shipment) {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readCreatedShipments().filter((item) => item.id !== shipment.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([shipment, ...existing]));
  window.dispatchEvent(new Event("harborbridge:shipments-changed"));
}

export function findCreatedShipment(id: string) {
  return readCreatedShipments().find((shipment) => shipment.id === id);
}
