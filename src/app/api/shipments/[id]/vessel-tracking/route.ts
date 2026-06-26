import { jsonError } from "@/lib/supabase-server";
import { normalizeImo, normalizeMmsi, refreshVesselTracking, upsertVesselTrackingConfig } from "@/lib/vessel-tracking";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readJsonBody(request: Request) {
  try {
    const input = (await request.json()) as unknown;
    return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function validateVesselIdentifiers({ imo, mmsi }: { imo: string; mmsi: string }) {
  if (mmsi && !normalizeMmsi(mmsi)) {
    return "MMSI must be a 9-digit vessel identifier.";
  }

  if (imo && !normalizeImo(imo)) {
    return "IMO must be a 7-digit vessel identifier.";
  }

  return "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = await readJsonBody(request);
    const mmsi = cleanString(input.mmsi);
    const imo = cleanString(input.imo);
    const validationError = validateVesselIdentifiers({ imo, mmsi });

    if (validationError) {
      return jsonError(validationError, 400);
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = await readJsonBody(request);
    const mmsi = cleanString(input.mmsi);
    const imo = cleanString(input.imo);
    const hasConfigUpdate =
      Boolean(cleanString(input.vesselName)) ||
      Boolean(cleanString(input.voyageNumber)) ||
      Boolean(imo) ||
      Boolean(mmsi);

    if (hasConfigUpdate) {
      const validationError = validateVesselIdentifiers({ imo, mmsi });

      if (validationError) {
        return jsonError(validationError, 400);
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
    }

    const result = await refreshVesselTracking(id);

    if (!result) {
      return jsonError("Shipment was not found.", 404);
    }

    return Response.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to refresh vessel tracking.", 400);
  }
}
