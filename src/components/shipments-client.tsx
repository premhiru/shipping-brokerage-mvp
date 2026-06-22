"use client";

import { useEffect, useState } from "react";
import { ShipmentTable } from "@/components/shipment-table";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { shipments as seedShipments } from "@/lib/demo-data";
import type { Shipment } from "@/lib/types";

export function ShipmentsClient() {
  const [allShipments, setAllShipments] = useState<Shipment[]>(seedShipments);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/shipments", { cache: "no-store" });
        const payload = (await response.json()) as { shipments?: Shipment[] };

        if (response.ok && payload.shipments) {
          setAllShipments(payload.shipments);
        }
      } catch {
        setAllShipments(seedShipments);
      }
    };

    void refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("harborbridge:shipments-changed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("harborbridge:shipments-changed", refresh);
    };
  }, []);

  const lanes = Array.from(new Set(allShipments.map((shipment) => `${shipment.origin} -> ${shipment.destination}`)));
  const persistedCreated = allShipments.find((shipment) => shipment.reference >= "HB-2026-0005");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shipment workspace"
        title="All shipments"
        description="Track shipment records, document readiness, B/L status, ETD/ETA, and carrier next actions."
        action={<ButtonLink href="/shipments/new">New shipment</ButtonLink>}
      />

      {persistedCreated && (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm font-semibold text-emerald-800">Supabase shipment available</p>
          <p className="mt-1 text-sm text-zinc-700">
            {persistedCreated.reference} was added from the create shipment flow and appears from the database.
          </p>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            placeholder="Search reference, cargo, carrier"
            className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm">
            <option>All statuses</option>
            <option>Needs review</option>
            <option>Shared with line</option>
            <option>In transit</option>
          </select>
          <select className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm">
            <option>All lanes</option>
            {lanes.map((lane) => (
              <option key={lane}>{lane}</option>
            ))}
          </select>
        </div>
      </Card>

      <ShipmentTable shipments={allShipments} />
    </div>
  );
}
