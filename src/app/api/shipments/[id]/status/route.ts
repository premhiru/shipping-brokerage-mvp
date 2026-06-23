import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import { isShipmentStatus, shipmentStatusLabel } from "@/lib/shipment-status";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const status = cleanString(input.status);
    const nextAction = cleanString(input.nextAction);

    if (!isShipmentStatus(status)) {
      return jsonError("Choose a valid shipment status.", 400);
    }

    const statusLabel = shipmentStatusLabel(status);
    const note = nextAction || `Shipment status updated to ${statusLabel}.`;
    const now = new Date().toISOString();

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .update({
        status,
        next_action: note,
        updated_at: now,
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id)
      .select("id, shipment_reference")
      .maybeSingle();

    if (shipmentError) {
      throw new Error(shipmentError.message);
    }

    if (!shipment) {
      return jsonError("Shipment was not found.", 404);
    }

    const eventRows = [
      {
        company_id: DEMO_COMPANY_ID,
        shipment_id: id,
        milestone: `Status: ${statusLabel}`,
        status: "completed",
        event_timestamp: now,
        responsible_party: "Broker",
        notes: note,
        source: "manual",
      },
    ];

    const { error: eventError } = await supabase.from("shipment_events").insert(eventRows);

    if (eventError) {
      throw new Error(eventError.message);
    }

    const { error: commentError } = await supabase.from("comments").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      user_name: "Demo Admin",
      user_role: "admin",
      message: note,
    });

    if (commentError) {
      throw new Error(commentError.message);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      actor_name: "Demo Admin",
      actor_role: "admin",
      action: "shipment_status_updated",
      metadata: {
        reference: shipment.shipment_reference,
        status,
        note,
      },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return Response.json({
      ok: true,
      shipment: {
        id,
        reference: shipment.shipment_reference,
        status,
        nextAction: note,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update shipment status.", 400);
  }
}
