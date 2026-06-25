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
  completedAt?: unknown;
  reopenedAt?: unknown;
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

function mapTaskAssignment(row: SupabaseTaskAuditRow): TaskAssignment {
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

  return ((data ?? []) as unknown as SupabaseTaskAuditRow[]).map(mapTaskAssignment);
}

export async function updateSupabaseTaskStatus({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskAssignment["status"];
}) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data: existingTask, error: lookupError } = await supabase
    .from("audit_logs")
    .select("id, metadata")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("action", "task_assigned")
    .eq("id", taskId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (!existingTask) {
    return null;
  }

  const metadata = (existingTask.metadata ?? {}) as TaskMetadata;
  const nextMetadata = {
    ...metadata,
    status,
    completedAt: status === "done" ? new Date().toISOString() : null,
    reopenedAt: status === "open" ? new Date().toISOString() : metadata.reopenedAt ?? null,
  };

  const { data, error } = await supabase
    .from("audit_logs")
    .update({ metadata: nextMetadata })
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("action", "task_assigned")
    .eq("id", taskId)
    .select("id, shipment_id, actor_name, metadata, created_at, shipments(shipment_reference)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapTaskAssignment(data as unknown as SupabaseTaskAuditRow);
}
