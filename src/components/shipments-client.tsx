"use client";

import { useEffect, useMemo, useState } from "react";
import { ShipmentTable } from "@/components/shipment-table";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { shipments as seedShipments } from "@/lib/demo-data";
import { shipmentStatusLabel, shipmentStatusOptions } from "@/lib/shipment-status";
import type { Shipment } from "@/lib/types";

export function ShipmentsClient() {
  const [allShipments, setAllShipments] = useState<Shipment[]>(seedShipments);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [laneFilter, setLaneFilter] = useState("all");

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
  const filteredShipments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return allShipments.filter((shipment) => {
      const lane = `${shipment.origin} -> ${shipment.destination}`;
      const searchableText = [
        shipment.reference,
        shipment.cargoDescription,
        shipment.carrier,
        shipment.origin,
        shipment.destination,
        shipment.shipperName,
        shipment.consigneeName,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (statusFilter === "all" || shipment.status === statusFilter) &&
        (laneFilter === "all" || lane === laneFilter)
      );
    });
  }, [allShipments, laneFilter, searchQuery, statusFilter]);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setLaneFilter("all");
  }

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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {shipmentStatusOptions.map((status) => (
              <option key={status} value={status}>
                {shipmentStatusLabel(status)}
              </option>
            ))}
          </select>
          <select
            value={laneFilter}
            onChange={(event) => setLaneFilter(event.target.value)}
            className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All lanes</option>
            {lanes.map((lane) => (
              <option key={lane} value={lane}>
                {lane}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {filteredShipments.length} of {allShipments.length} shipment
            {allShipments.length === 1 ? "" : "s"}.
          </p>
          {(searchQuery || statusFilter !== "all" || laneFilter !== "all") && (
            <button type="button" onClick={resetFilters} className="text-left font-semibold text-sky-700">
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {filteredShipments.length > 0 ? (
        <ShipmentTable shipments={filteredShipments} />
      ) : (
        <EmptyState title="No shipments match these filters" description="Clear filters or adjust the search terms." />
      )}
    </div>
  );
}
