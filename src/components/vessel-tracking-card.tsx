"use client";

import { useMemo, useState, useTransition } from "react";
import { RefreshCw, Save, Ship } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, Card, EmptyState, Field, TextInput } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Shipment, VesselTracking, VesselTrackingCandidate } from "@/lib/types";

type ApiPayload = {
  tracking?: VesselTracking;
  candidates?: VesselTrackingCandidate[];
  error?: string;
};

function coordinateText(latitude?: number, longitude?: number) {
  if (latitude === undefined || longitude === undefined) {
    return "Not available";
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function mapUrl(latitude: number, longitude: number) {
  const padding = 0.8;
  const minLon = longitude - padding;
  const minLat = latitude - padding;
  const maxLon = longitude + padding;
  const maxLat = latitude + padding;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${latitude},${longitude}`;
}

export function VesselTrackingCard({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const [tracking, setTracking] = useState<VesselTracking | undefined>(shipment.vesselTracking);
  const [vesselName, setVesselName] = useState(tracking?.vesselName ?? "");
  const [voyageNumber, setVoyageNumber] = useState(tracking?.voyageNumber ?? "");
  const [imo, setImo] = useState(tracking?.imo ?? "");
  const [mmsi, setMmsi] = useState(tracking?.mmsi ?? "");
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<VesselTrackingCandidate[]>([]);
  const [isPending, startTransition] = useTransition();
  const hasPosition = tracking?.latitude !== undefined && tracking.longitude !== undefined;
  const currentMapUrl = useMemo(() => {
    if (!hasPosition) {
      return "";
    }

    return mapUrl(tracking.latitude as number, tracking.longitude as number);
  }, [hasPosition, tracking?.latitude, tracking?.longitude]);

  async function callTrackingApi(method: "PATCH" | "POST") {
    const body = JSON.stringify({
      vesselName,
      voyageNumber,
      imo,
      mmsi,
    });
    const response = await fetch(`/api/shipments/${shipment.id}/vessel-tracking`, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    const payload = (await response.json()) as ApiPayload;

    if (!response.ok || !payload.tracking) {
      throw new Error(payload.error || "Unable to update vessel tracking.");
    }

    setTracking(payload.tracking);
    setVesselName(payload.tracking.vesselName ?? vesselName);
    setVoyageNumber(payload.tracking.voyageNumber ?? voyageNumber);
    setImo(payload.tracking.imo ?? imo);
    setMmsi(payload.tracking.mmsi ?? mmsi);
    setCandidates(payload.candidates ?? []);
    router.refresh();
  }

  function saveTracking() {
    setMessage("");
    startTransition(async () => {
      try {
        await callTrackingApi("PATCH");
        setMessage("Vessel identifiers saved.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to save vessel tracking.");
      }
    });
  }

  function refreshTracking() {
    setMessage("");
    startTransition(async () => {
      try {
        await callTrackingApi("POST");
        setMessage("AIS refresh completed.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to refresh AIS position.");
      }
    });
  }

  return (
    <Card className="scroll-mt-24" id="vessel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-slate-950">Live Vessel Tracking</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Store vessel identifiers and refresh the latest AISStream position for this shipment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={tracking?.lastRefreshStatus ?? "not_configured"} />
          <button
            type="button"
            onClick={saveTracking}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={refreshTracking}
            disabled={isPending || !mmsi}
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {isPending ? "Working..." : "Refresh AIS"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
          {message}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput
              label="Vessel name"
              value={vesselName}
              onChange={(event) => setVesselName(event.target.value)}
              placeholder="e.g. MAERSK HANOI"
            />
            <TextInput
              label="Voyage number"
              value={voyageNumber}
              onChange={(event) => setVoyageNumber(event.target.value)}
              placeholder="e.g. 426W"
            />
            <TextInput
              label="IMO"
              value={imo}
              onChange={(event) => setImo(event.target.value)}
              placeholder="7 digits"
              inputMode="numeric"
            />
            <TextInput
              label="MMSI"
              value={mmsi}
              onChange={(event) => setMmsi(event.target.value)}
              placeholder="9 digits required for AISStream"
              inputMode="numeric"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Coordinates" value={coordinateText(tracking?.latitude, tracking?.longitude)} />
            <Field
              label="Speed"
              value={tracking?.speedKnots === undefined ? undefined : formatNumber(tracking.speedKnots, " kn")}
            />
            <Field
              label="Course"
              value={tracking?.courseDegrees === undefined ? undefined : formatNumber(tracking.courseDegrees, " deg")}
            />
            <Field
              label="Heading"
              value={tracking?.headingDegrees === undefined ? undefined : formatNumber(tracking.headingDegrees, " deg")}
            />
            <Field label="AIS destination" value={tracking?.destination} />
            <Field label="Last AIS update" value={formatDateTime(tracking?.aisTimestamp)} />
          </div>

          {tracking?.lastRefreshError && tracking.lastRefreshStatus === "error" && (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {tracking.lastRefreshError}
            </p>
          )}
          {tracking?.lastRefreshStatus === "no_signal" && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              MMSI is saved, but AISStream has not broadcast this vessel in the checked route areas yet.
            </p>
          )}
          {candidates.length > 0 && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Live vessels seen during this scan</p>
              <div className="mt-3 space-y-2">
                {candidates.map((candidate) => (
                  <button
                    key={`${candidate.mmsi}-${candidate.aisTimestamp ?? ""}`}
                    type="button"
                    onClick={() => {
                      setMmsi(candidate.mmsi);
                      setVesselName(candidate.vesselName ?? "");
                      setMessage(`Loaded ${candidate.mmsi} into the MMSI field. Refresh again to track it.`);
                    }}
                    className="block w-full rounded-md border border-zinc-200 bg-white p-3 text-left text-sm hover:bg-sky-50"
                  >
                    <span className="font-semibold text-slate-950">{candidate.vesselName || "Unnamed vessel"}</span>
                    <span className="ml-2 text-zinc-600">MMSI {candidate.mmsi}</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {coordinateText(candidate.latitude, candidate.longitude)}
                      {candidate.aisTimestamp ? ` · ${formatDateTime(candidate.aisTimestamp)}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {hasPosition ? (
          <iframe
            title={`AIS position for ${tracking?.vesselName || shipment.reference}`}
            src={currentMapUrl}
            className="h-[320px] w-full rounded-lg border border-zinc-200"
            loading="lazy"
          />
        ) : (
          <EmptyState
            title="No AIS position yet"
            description="Add the vessel MMSI, then refresh AIS to save it and show the latest known position."
          />
        )}
      </div>
    </Card>
  );
}
