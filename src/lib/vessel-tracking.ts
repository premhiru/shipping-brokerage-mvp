import WebSocket from "ws";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { VesselTracking, VesselTrackingStatus } from "@/lib/types";

type SupabaseClient = NonNullable<ReturnType<typeof createSupabaseServerClient>>;

type VesselTrackingRow = {
  vessel_name: string | null;
  voyage_number: string | null;
  imo: string | null;
  mmsi: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  speed_knots: string | number | null;
  course_degrees: string | number | null;
  heading_degrees: string | number | null;
  navigational_status: string | null;
  destination: string | null;
  ais_timestamp: string | null;
  provider: string;
  last_refresh_attempt_at: string | null;
  last_refresh_status: VesselTrackingStatus | string;
  last_refresh_error: string | null;
};

type AisSnapshot = {
  vesselName?: string;
  mmsi: string;
  latitude: number;
  longitude: number;
  speedKnots?: number;
  courseDegrees?: number;
  headingDegrees?: number;
  navigationalStatus?: string;
  destination?: string;
  aisTimestamp: string;
  rawPayload: Record<string, unknown>;
};

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeMmsi(value: unknown) {
  const cleaned = cleanString(value).replace(/\D/g, "");
  return cleaned.length === 9 ? cleaned : "";
}

export function normalizeImo(value: unknown) {
  const cleaned = cleanString(value).toUpperCase().replace(/^IMO\s*/i, "").replace(/\D/g, "");
  return cleaned.length === 7 ? cleaned : "";
}

function optionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requiredNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanStatus(value: string | null | undefined): VesselTrackingStatus {
  if (value === "configured" || value === "live" || value === "stale" || value === "error") {
    return value;
  }

  return "not_configured";
}

export function mapVesselTrackingRow(row: VesselTrackingRow): VesselTracking {
  return {
    vesselName: row.vessel_name ?? undefined,
    voyageNumber: row.voyage_number ?? undefined,
    imo: row.imo ?? undefined,
    mmsi: row.mmsi ?? undefined,
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    speedKnots: optionalNumber(row.speed_knots),
    courseDegrees: optionalNumber(row.course_degrees),
    headingDegrees: optionalNumber(row.heading_degrees),
    navigationalStatus: row.navigational_status ?? undefined,
    destination: row.destination ?? undefined,
    aisTimestamp: row.ais_timestamp ?? undefined,
    provider: row.provider,
    lastRefreshAttemptAt: row.last_refresh_attempt_at ?? undefined,
    lastRefreshStatus: cleanStatus(row.last_refresh_status),
    lastRefreshError: row.last_refresh_error ?? undefined,
  };
}

async function getShipmentForUpdate(supabase: SupabaseClient, shipmentId: string) {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, shipment_reference")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("id", shipmentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as { id: string; shipment_reference: string } | null;
}

export async function upsertVesselTrackingConfig({
  shipmentId,
  vesselName,
  voyageNumber,
  imo,
  mmsi,
}: {
  shipmentId: string;
  vesselName?: string;
  voyageNumber?: string;
  imo?: string;
  mmsi?: string;
}) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase server env vars are missing.");
  }

  const shipment = await getShipmentForUpdate(supabase, shipmentId);

  if (!shipment) {
    return null;
  }

  const normalizedMmsi = normalizeMmsi(mmsi);
  const normalizedImo = normalizeImo(imo);
  const status: VesselTrackingStatus = normalizedMmsi ? "configured" : "not_configured";

  const { data, error } = await supabase
    .from("vessel_tracking")
    .upsert(
      {
        company_id: DEMO_COMPANY_ID,
        shipment_id: shipmentId,
        vessel_name: cleanString(vesselName) || null,
        voyage_number: cleanString(voyageNumber) || null,
        imo: normalizedImo || null,
        mmsi: normalizedMmsi || null,
        last_refresh_status: status,
        last_refresh_error: null,
      },
      { onConflict: "company_id,shipment_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const tracking = mapVesselTrackingRow(data as VesselTrackingRow);

  await supabase.from("audit_logs").insert({
    company_id: DEMO_COMPANY_ID,
    shipment_id: shipmentId,
    actor_name: "Demo Admin",
    actor_role: "admin",
    action: "vessel_tracking_configured",
    metadata: {
      reference: shipment.shipment_reference,
      vesselName: tracking.vesselName,
      voyageNumber: tracking.voyageNumber,
      imo: tracking.imo,
      mmsi: tracking.mmsi,
    },
  });

  return tracking;
}

function readAisPosition(payload: Record<string, unknown>, requestedMmsi: string, destination?: string): AisSnapshot | null {
  const messageType = cleanString(payload.MessageType);
  const metadata = (payload.MetaData ?? {}) as Record<string, unknown>;
  const message = (payload.Message ?? {}) as Record<string, unknown>;
  const position = (message.PositionReport ?? {}) as Record<string, unknown>;

  if (messageType !== "PositionReport") {
    return null;
  }

  const payloadMmsi = String(metadata.MMSI ?? position.UserID ?? "");

  if (payloadMmsi !== requestedMmsi) {
    return null;
  }

  const latitude = requiredNumber(position.Latitude ?? metadata.latitude);
  const longitude = requiredNumber(position.Longitude ?? metadata.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    vesselName: cleanString(metadata.ShipName) || undefined,
    mmsi: requestedMmsi,
    latitude,
    longitude,
    speedKnots: optionalNumber(position.Sog as string | number | null),
    courseDegrees: optionalNumber(position.Cog as string | number | null),
    headingDegrees: optionalNumber(position.TrueHeading as string | number | null),
    navigationalStatus: cleanString(position.NavigationalStatus) || undefined,
    destination,
    aisTimestamp: cleanString(metadata.time_utc) || new Date().toISOString(),
    rawPayload: payload,
  };
}

function readDestination(payload: Record<string, unknown>) {
  const message = (payload.Message ?? {}) as Record<string, unknown>;
  const staticData = (message.ShipStaticData ?? {}) as Record<string, unknown>;

  return cleanString(staticData.Destination);
}

async function fetchAisStreamSnapshot(mmsi: string): Promise<AisSnapshot> {
  const apiKey = process.env.AISSTREAM_API_KEY;

  if (!apiKey) {
    throw new Error("AISSTREAM_API_KEY is missing. Add it to local and Vercel environment variables.");
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(AISSTREAM_URL);
    let destination = "";
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      ws.close();
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error("AISStream did not return a position for this MMSI within 15 seconds.")));
    }, 15000);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FiltersShipMMSI: [mmsi],
          FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        }),
      );
    });

    ws.on("message", (data) => {
      try {
        const payload = JSON.parse(data.toString()) as Record<string, unknown>;
        destination = readDestination(payload) || destination;
        const position = readAisPosition(payload, mmsi, destination);

        if (position) {
          finish(() => resolve(position));
        }
      } catch (error) {
        finish(() => reject(error instanceof Error ? error : new Error("Unable to parse AISStream response.")));
      }
    });

    ws.on("error", (error) => {
      finish(() => reject(error));
    });
  });
}

export async function refreshVesselTracking(shipmentId: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase server env vars are missing.");
  }

  const shipment = await getShipmentForUpdate(supabase, shipmentId);

  if (!shipment) {
    return null;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("vessel_tracking")
    .select("*")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("shipment_id", shipmentId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const current = existing as VesselTrackingRow | null;
  const mmsi = normalizeMmsi(current?.mmsi);
  const attemptedAt = new Date().toISOString();

  if (!mmsi) {
    throw new Error("Add a 9-digit MMSI before refreshing live AIS position.");
  }

  try {
    const snapshot = await fetchAisStreamSnapshot(mmsi);
    const { data, error } = await supabase
      .from("vessel_tracking")
      .upsert(
        {
          company_id: DEMO_COMPANY_ID,
          shipment_id: shipmentId,
          vessel_name: snapshot.vesselName || current?.vessel_name || null,
          voyage_number: current?.voyage_number ?? null,
          imo: current?.imo ?? null,
          mmsi,
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          speed_knots: snapshot.speedKnots ?? null,
          course_degrees: snapshot.courseDegrees ?? null,
          heading_degrees: snapshot.headingDegrees ?? null,
          navigational_status: snapshot.navigationalStatus ?? null,
          destination: snapshot.destination || current?.destination || null,
          ais_timestamp: snapshot.aisTimestamp,
          provider: "aisstream",
          raw_payload: snapshot.rawPayload,
          last_refresh_attempt_at: attemptedAt,
          last_refresh_status: "live",
          last_refresh_error: null,
        },
        { onConflict: "company_id,shipment_id" },
      )
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const tracking = mapVesselTrackingRow(data as VesselTrackingRow);

    await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      actor_name: "AISStream",
      actor_role: "admin",
      action: "vessel_position_refreshed",
      metadata: {
        reference: shipment.shipment_reference,
        mmsi,
        latitude: tracking.latitude,
        longitude: tracking.longitude,
        aisTimestamp: tracking.aisTimestamp,
      },
    });

    return tracking;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refresh AIS position.";

    await supabase
      .from("vessel_tracking")
      .upsert(
        {
          company_id: DEMO_COMPANY_ID,
          shipment_id: shipmentId,
          vessel_name: current?.vessel_name ?? null,
          voyage_number: current?.voyage_number ?? null,
          imo: current?.imo ?? null,
          mmsi,
          last_refresh_attempt_at: attemptedAt,
          last_refresh_status: "error",
          last_refresh_error: message,
        },
        { onConflict: "company_id,shipment_id" },
      );

    throw new Error(message);
  }
}
