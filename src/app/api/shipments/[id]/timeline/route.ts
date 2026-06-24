import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { createShipmentNotification } from "@/lib/supabase-notifications";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { MilestoneStatus } from "@/lib/types";

export const runtime = "nodejs";

const statuses = new Set(["pending", "in_progress", "completed", "blocked", "skipped"]);
const sources = new Set(["manual", "system", "shipping_line_guest"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function blStatusFromMilestone(milestone: string, status: MilestoneStatus) {
  if (status !== "completed") {
    return null;
  }

  const normalized = milestone.toLowerCase();

  if (normalized.includes("draft") && normalized.includes("b/l") && normalized.includes("approved")) {
    return "Draft B/L approved";
  }

  if (normalized.includes("draft") && normalized.includes("b/l") && normalized.includes("issued")) {
    return "Draft B/L issued";
  }

  if (
    (normalized.includes("final") && normalized.includes("b/l") && normalized.includes("issued")) ||
    (normalized.includes("sea waybill") && normalized.includes("issued"))
  ) {
    return "Final B/L / sea waybill issued";
  }

  if (normalized.includes("b/l") && normalized.includes("issued")) {
    return "B/L issued";
  }

  return null;
}

async function upsertBillOfLadingRecord({
  supabase,
  shipmentId,
  blStatus,
  notes,
  eventTimestamp,
}: {
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>;
  shipmentId: string;
  blStatus: string;
  notes: string;
  eventTimestamp: string;
}) {
  const { data: existingRecord, error: lookupError } = await supabase
    .from("bill_of_lading_records")
    .select("id")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const statusIsIssued = blStatus.toLowerCase().includes("issued");
  const statusIsApproved = blStatus.toLowerCase().includes("approved");
  const values: Record<string, string | null> = {
    bl_type: blStatus.toLowerCase().includes("sea waybill") ? "Sea waybill" : "Original B/L",
    status: blStatus,
    notes,
  };

  if (statusIsIssued) {
    values.issued_at = eventTimestamp;
  }

  if (statusIsApproved) {
    values.approved_at = eventTimestamp;
  }

  if (existingRecord?.id) {
    const { error: updateError } = await supabase
      .from("bill_of_lading_records")
      .update(values)
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", existingRecord.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return;
  }

  const { error: insertError } = await supabase.from("bill_of_lading_records").insert({
    company_id: DEMO_COMPANY_ID,
    shipment_id: shipmentId,
    bl_number: null,
    issued_at: statusIsIssued ? eventTimestamp : null,
    approved_at: statusIsApproved ? eventTimestamp : null,
    ...values,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const milestone = cleanString(input.milestone);
    const status = statuses.has(cleanString(input.status))
      ? (cleanString(input.status) as MilestoneStatus)
      : "pending";
    const responsibleParty = cleanString(input.responsibleParty) || "Broker";
    const notes = cleanString(input.notes) || "Milestone updated.";
    const source = sources.has(cleanString(input.source)) ? cleanString(input.source) : "manual";
    const timestamp = cleanString(input.timestamp);

    if (!milestone) {
      return jsonError("Milestone is required.", 400);
    }

    const eventTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
    const nextBlStatus = blStatusFromMilestone(milestone, status);

    const { data: shipment, error: shipmentLookupError } = await supabase
      .from("shipments")
      .select("shipment_reference")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id)
      .maybeSingle();

    if (shipmentLookupError) {
      throw new Error(shipmentLookupError.message);
    }

    if (!shipment) {
      return jsonError("Shipment was not found.", 404);
    }

    const { error: eventError } = await supabase.from("shipment_events").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      milestone,
      status,
      event_timestamp: eventTimestamp,
      responsible_party: responsibleParty,
      notes,
      source,
    });

    if (eventError) {
      throw new Error(eventError.message);
    }

    const { error: shipmentError } = await supabase
      .from("shipments")
      .update({
        next_action: notes,
        ...(nextBlStatus ? { bl_status: nextBlStatus } : {}),
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id);

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    if (nextBlStatus) {
      await upsertBillOfLadingRecord({
        supabase,
        shipmentId: id,
        blStatus: nextBlStatus,
        notes,
        eventTimestamp,
      });
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      actor_name: responsibleParty,
      actor_role: source === "shipping_line_guest" ? "shipping_line_guest" : "admin",
      action: "timeline_updated",
      metadata: { milestone, status, notes, blStatus: nextBlStatus },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    await createShipmentNotification({
      shipmentId: id,
      title: `${shipment.shipment_reference} timeline updated`,
      message: `${responsibleParty} marked ${milestone} ${status}. ${notes}`,
    });

    return Response.json({ ok: true, blStatus: nextBlStatus });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update timeline.", 400);
  }
}
