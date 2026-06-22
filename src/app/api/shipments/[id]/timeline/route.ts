import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { MilestoneStatus } from "@/lib/types";

export const runtime = "nodejs";

const statuses = new Set(["pending", "in_progress", "completed", "blocked", "skipped"]);
const sources = new Set(["manual", "system", "shipping_line_guest"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id);

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      actor_name: responsibleParty,
      actor_role: source === "shipping_line_guest" ? "shipping_line_guest" : "admin",
      action: "timeline_updated",
      metadata: { milestone, status, notes },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update timeline.", 400);
  }
}
