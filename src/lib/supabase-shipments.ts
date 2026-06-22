import { createHash } from "crypto";
import { documentTypeLabels } from "@/lib/document-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type {
  AuditLog,
  BillOfLading,
  CargoItem,
  Comment,
  DocumentStatus,
  MilestoneStatus,
  ShareLink,
  Shipment,
  ShipmentDocument,
  ShipmentEvent,
  ShipmentStatus,
  UserRole,
} from "@/lib/types";

type SupabaseShipmentRow = {
  id: string;
  shipment_reference: string;
  shipper_name: string;
  consignee_name: string;
  notify_party: string | null;
  cargo_description: string;
  item_type: string | null;
  hs_code: string | null;
  package_count: number | null;
  dimensions: string | null;
  gross_weight_kg: string | number | null;
  net_weight_kg: string | number | null;
  volume_cbm: string | number | null;
  incoterm: string | null;
  origin: string;
  destination: string;
  pol: string | null;
  pod: string | null;
  container_type: string | null;
  preferred_etd: string | null;
  preferred_eta: string | null;
  carrier: string | null;
  booking_number: string | null;
  bl_number: string | null;
  container_number: string | null;
  status: ShipmentStatus;
  document_status: DocumentStatus;
  bl_status: string;
  next_action: string | null;
  notes: string | null;
  updated_at: string;
  created_at: string;
  cargo_items?: SupabaseCargoRow[];
  documents?: SupabaseDocumentRow[];
  shipment_events?: SupabaseEventRow[];
  comments?: SupabaseCommentRow[];
  audit_logs?: SupabaseAuditRow[];
  bill_of_lading_records?: SupabaseBillOfLadingRow[];
  share_links?: SupabaseShareLinkRow[];
};

type SupabaseCargoRow = {
  description: string;
  item_type: string | null;
  hs_code: string | null;
  package_count: number | null;
  length_cm: string | number | null;
  width_cm: string | number | null;
  height_cm: string | number | null;
  gross_weight_kg: string | number | null;
  net_weight_kg: string | number | null;
  volume_cbm: string | number | null;
};

type SupabaseDocumentRow = {
  id: string;
  document_type: string;
  file_name: string;
  uploaded_by_name: string | null;
  uploaded_at: string | null;
  status: DocumentStatus;
  rejection_reason: string | null;
};

type SupabaseEventRow = {
  milestone: string;
  status: MilestoneStatus;
  event_timestamp: string | null;
  responsible_party: string | null;
  notes: string | null;
  source: "manual" | "system" | "shipping_line_guest";
};

type SupabaseCommentRow = {
  user_name: string;
  user_role: UserRole;
  message: string;
  attachment_storage_path: string | null;
  created_at: string;
};

type SupabaseAuditRow = {
  action: string;
  actor_name: string | null;
  actor_role: UserRole | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SupabaseBillOfLadingRow = {
  bl_number: string | null;
  bl_type: string | null;
  status: string;
  issued_at: string | null;
  approved_at: string | null;
  notes: string | null;
};

type SupabaseShareLinkRow = {
  token_hash: string;
  recipient_company: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  expires_at: string;
  last_viewed_at: string | null;
  can_comment: boolean;
  can_upload_documents: boolean;
  can_update_status: boolean;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dimensionText(cargo?: SupabaseCargoRow) {
  if (!cargo?.length_cm || !cargo.width_cm || !cargo.height_cm) {
    return "Not set";
  }

  return `${toNumber(cargo.length_cm)} x ${toNumber(cargo.width_cm)} x ${toNumber(cargo.height_cm)} cm`;
}

function shareTokenFromHash(tokenHash: string) {
  const knownTokens = ["demo-share-electronics", "demo-share-furniture"];
  return knownTokens.find(
    (token) => createHash("sha256").update(token).digest("hex") === tokenHash,
  ) ?? tokenHash;
}

function mapCargo(row: SupabaseCargoRow): CargoItem {
  return {
    description: row.description,
    itemType: row.item_type ?? "General cargo",
    hsCode: row.hs_code ?? "",
    packages: row.package_count ?? 0,
    dimensions: dimensionText(row),
    grossWeightKg: toNumber(row.gross_weight_kg),
    netWeightKg: toNumber(row.net_weight_kg),
    volumeCbm: toNumber(row.volume_cbm),
  };
}

function mapDocument(row: SupabaseDocumentRow): ShipmentDocument {
  return {
    id: row.id,
    type: documentTypeLabels[row.document_type] ?? "Other",
    fileName: row.file_name,
    uploadedBy: row.uploaded_by_name ?? "Not uploaded",
    uploadedAt: row.uploaded_at ?? "",
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
  };
}

function mapEvent(row: SupabaseEventRow): ShipmentEvent {
  return {
    milestone: row.milestone,
    status: row.status,
    timestamp: row.event_timestamp ?? undefined,
    responsibleParty: row.responsible_party ?? "Broker",
    notes: row.notes ?? "No update yet.",
    source: row.source,
  };
}

function mapComment(row: SupabaseCommentRow): Comment {
  return {
    userName: row.user_name,
    role: row.user_role,
    timestamp: row.created_at,
    message: row.message,
    attachment: row.attachment_storage_path ?? undefined,
  };
}

function mapAuditLog(row: SupabaseAuditRow): AuditLog {
  return {
    action: row.action,
    actor: row.actor_name ?? "System",
    role: row.actor_role ?? "admin",
    timestamp: row.created_at,
    detail: row.metadata ? JSON.stringify(row.metadata) : row.action,
  };
}

function mapBillOfLading(row: SupabaseBillOfLadingRow): BillOfLading {
  return {
    number: row.bl_number ?? undefined,
    type: row.bl_type ?? "Not selected",
    status: row.status,
    issuedAt: row.issued_at ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    notes: row.notes ?? "No B/L notes yet.",
  };
}

function mapShareLink(row: SupabaseShareLinkRow): ShareLink {
  return {
    token: shareTokenFromHash(row.token_hash),
    recipientCompany: row.recipient_company ?? "Carrier",
    recipientName: row.recipient_name ?? "Carrier contact",
    recipientEmail: row.recipient_email ?? "",
    expiresAt: row.expires_at,
    lastViewedAt: row.last_viewed_at ?? undefined,
    canComment: row.can_comment,
    canUploadDocuments: row.can_upload_documents,
    canUpdateStatus: row.can_update_status,
  };
}

export function mapSupabaseShipment(row: SupabaseShipmentRow): Shipment {
  const cargoItems = (row.cargo_items ?? []).map(mapCargo);
  const firstCargo = cargoItems[0];

  return {
    id: row.id,
    reference: row.shipment_reference,
    shipperName: row.shipper_name,
    consigneeName: row.consignee_name,
    notifyParty: row.notify_party ?? "",
    cargoDescription: row.cargo_description,
    itemType: row.item_type ?? firstCargo?.itemType ?? "General cargo",
    hsCode: row.hs_code ?? firstCargo?.hsCode ?? "",
    packageCount: row.package_count ?? firstCargo?.packages ?? 0,
    dimensions: row.dimensions ?? firstCargo?.dimensions ?? "Not set",
    grossWeightKg: toNumber(row.gross_weight_kg || firstCargo?.grossWeightKg),
    netWeightKg: toNumber(row.net_weight_kg || firstCargo?.netWeightKg),
    volumeCbm: toNumber(row.volume_cbm || firstCargo?.volumeCbm),
    incoterm: row.incoterm ?? "FOB",
    origin: row.origin,
    destination: row.destination,
    pol: row.pol ?? "",
    pod: row.pod ?? "",
    containerType: row.container_type ?? "",
    etd: row.preferred_etd ?? "",
    eta: row.preferred_eta ?? "",
    carrier: row.carrier ?? "Carrier pending",
    bookingNumber: row.booking_number ?? undefined,
    blNumber: row.bl_number ?? undefined,
    containerNumber: row.container_number ?? undefined,
    status: row.status,
    documentStatus: row.document_status,
    blStatus: row.bl_status,
    nextAction: row.next_action ?? "Review shipment details and documents.",
    notes: row.notes ?? "",
    lastUpdated: row.updated_at ?? row.created_at,
    cargoItems,
    documents: (row.documents ?? []).map(mapDocument),
    timeline: (row.shipment_events ?? []).map(mapEvent),
    comments: (row.comments ?? []).map(mapComment),
    auditLogs: (row.audit_logs ?? []).map(mapAuditLog),
    billOfLading: row.bill_of_lading_records?.[0]
      ? mapBillOfLading(row.bill_of_lading_records[0])
      : undefined,
    shareLinks: (row.share_links ?? []).map(mapShareLink),
  };
}

const shipmentSelect = `
  *,
  cargo_items(*),
  documents(*),
  shipment_events(*),
  comments(*),
  audit_logs(*),
  bill_of_lading_records(*),
  share_links(*)
`;

export async function getSupabaseShipments() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("shipments")
    .select(shipmentSelect)
    .eq("company_id", DEMO_COMPANY_ID)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SupabaseShipmentRow[]).map(mapSupabaseShipment);
}

export async function getSupabaseShipment(id: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("shipments")
    .select(shipmentSelect)
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapSupabaseShipment(data as SupabaseShipmentRow) : null;
}
