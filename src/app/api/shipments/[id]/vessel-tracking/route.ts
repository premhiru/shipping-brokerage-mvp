import { jsonError } from "@/lib/supabase-server";
import { normalizeImo, normalizeMmsi, refreshVesselTracking, upsertVesselTrackingConfig } from "@/lib/vessel-tracking";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const mmsi = cleanString(input.mmsi);
    const imo = cleanString(input.imo);

    if (mmsi && !normalizeMmsi(mmsi)) {
      return jsonError("MMSI must be a 9-digit vessel identifier.", 400);
    }

    if (imo && !normalizeImo(imo)) {
      return jsonError("IMO must be a 7-digit vessel identifier.", 400);
    }

    const tracking = await upsertVesselTrackingConfig({
      shipmentId: id,
      vesselName: cleanString(input.vesselName),
      voyageNumber: cleanString(input.voyageNumber),
      imo,
      mmsi,
    });

    if (!tracking) {
      return jsonError("Shipment was not found.", 404);
    }

    return Response.json({ tracking });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to save vessel tracking.", 400);
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tracking = await refreshVesselTracking(id);

    if (!tracking) {
      return jsonError("Shipment was not found.", 404);
    }

    return Response.json({ tracking });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to refresh vessel tracking.", 400);
  }
}
