import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { Priority, TaskAssignment } from "@/lib/types";

type TaskMetadata = {
  task?: unknown;
  assignedTo?: unknown;
  assignedBy?: unknown;
  dueDate?: unknown;
  priority?: unknown;
  status?: unknown;
};

type SupabaseTaskAuditRow = {
  id: string;
  shipment_id: string | null;
  actor_name: string | null;
  metadata: TaskMetadata | null;
  created_at: string;
  shipments?: {
    shipment_reference: string | null;
  } | {
    shipment_reference: string | null;
  }[] | null;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPriority(value: unknown): Priority {
  const priority = cleanString(value);

  return priority === "low" || priority === "high" ? priority : "medium";
}

function getShipmentReference(row: SupabaseTaskAuditRow) {
  const shipment = Array.isArray(row.shipments) ? row.shipments[0] : row.shipments;

  return shipment?.shipment_reference ?? "Shipment";
}

export async function getSupabaseTaskAssignments({ shipmentId }: { shipmentId?: string } = {}) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("audit_logs")
    .select("id, shipment_id, actor_name, metadata, created_at, shipments(shipment_reference)")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("action", "task_assigned")
    .order("created_at", { ascending: false })
    .limit(20);

  if (shipmentId) {
    query = query.eq("shipment_id", shipmentId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as SupabaseTaskAuditRow[]).map((row): TaskAssignment => {
    const metadata = row.metadata ?? {};

    return {
      id: row.id,
      shipmentId: row.shipment_id ?? "",
      shipmentReference: getShipmentReference(row),
      task: cleanString(metadata.task) || "Review shipment task.",
      assignedTo: cleanString(metadata.assignedTo) || "Unassigned",
      assignedBy: cleanString(metadata.assignedBy) || row.actor_name || "Admin",
      dueDate: cleanString(metadata.dueDate) || undefined,
      priority: cleanPriority(metadata.priority),
      status: cleanString(metadata.status) === "done" ? "done" : "open",
      createdAt: row.created_at,
    };
  });
}
