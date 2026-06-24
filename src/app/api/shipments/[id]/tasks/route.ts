import { createShipmentNotification } from "@/lib/supabase-notifications";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { Priority } from "@/lib/types";

export const runtime = "nodejs";

const priorities = new Set(["low", "medium", "high"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPriority(value: unknown): Priority {
  const priority = cleanString(value);

  return priorities.has(priority) ? (priority as Priority) : "medium";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const task = cleanString(input.task);
    const assignedTo = cleanString(input.assignedTo);
    const assignedBy = cleanString(input.assignedBy) || "Demo Admin";
    const dueDate = cleanString(input.dueDate);
    const priority = cleanPriority(input.priority);

    if (!task) {
      return jsonError("Task is required.", 400);
    }

    if (!assignedTo) {
      return jsonError("Assignee is required.", 400);
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

    const { data: auditLog, error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        company_id: DEMO_COMPANY_ID,
        shipment_id: id,
        actor_name: assignedBy,
        actor_role: "admin",
        action: "task_assigned",
        metadata: {
          reference: shipment.shipment_reference,
          task,
          assignedTo,
          assignedBy,
          dueDate: dueDate || null,
          priority,
          status: "open",
        },
      })
      .select("id, created_at")
      .single();

    if (auditError) {
      throw new Error(auditError.message);
    }

    const nextAction = `${assignedTo}: ${task}`;
    const { error: updateError } = await supabase
      .from("shipments")
      .update({
        next_action: nextAction,
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await createShipmentNotification({
      shipmentId: id,
      title: `Task assigned for ${shipment.shipment_reference}`,
      message: `${assignedBy} assigned ${assignedTo}: ${task}${dueDate ? ` Due ${dueDate}.` : ""}`,
    });

    return Response.json({
      task: {
        id: auditLog.id,
        shipmentId: id,
        shipmentReference: shipment.shipment_reference,
        task,
        assignedTo,
        assignedBy,
        dueDate: dueDate || undefined,
        priority,
        status: "open",
        createdAt: auditLog.created_at,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to assign task.", 400);
  }
}
