"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, FileCheck2, Ship } from "lucide-react";
import { ShipmentTable } from "@/components/shipment-table";
import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/ui";
import { notifications, shipments as seedShipments } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";
import type { Shipment } from "@/lib/types";

export function DashboardClient() {
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

  const blocked = allShipments.filter(
    (shipment) => shipment.documentStatus === "needs_review" || shipment.status === "delayed",
  );
  const active = allShipments.filter((shipment) => !["closed", "delivered"].includes(shipment.status));
  const shared = allShipments.filter((shipment) => shipment.shareLinks.length > 0);
  const persistedCreated = allShipments.find((shipment) => shipment.reference >= "HB-2026-0005");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations dashboard"
        title="Shipment control tower"
        description="A single working view for shipment status, document review, B/L movement, and carrier collaboration."
        action={<ButtonLink href="/shipments/new">Create shipment</ButtonLink>}
      />

      {persistedCreated && (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Supabase shipment added</p>
              <p className="mt-1 text-sm text-zinc-700">
                {persistedCreated.reference} is visible on the dashboard and shipment board from the database.
              </p>
            </div>
            <ButtonLink href={`/shipments/${persistedCreated.id}`} variant="secondary">
              Open shipment
            </ButtonLink>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active shipments" value={active.length} helper={`Across ${allShipments.length} demo records`} />
        <StatCard label="Shared with lines" value={shared.length} helper="Scoped carrier portals active" />
        <StatCard label="Needs attention" value={blocked.length} helper="Documents or milestones blocked" />
        <StatCard label="B/L in progress" value="2" helper="Draft or final records tracked" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Next actions</h2>
              <p className="text-sm text-zinc-600">Highest-value work for the operations team.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {allShipments.map((shipment) => (
              <div key={shipment.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{shipment.reference}</p>
                  <Badge value={shipment.status} />
                </div>
                <p className="mt-2 text-sm text-zinc-600">{shipment.nextAction}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-sky-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
              <p className="text-sm text-zinc-600">In-app alerts for the MVP.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {persistedCreated && (
              <div>
                <p className="font-semibold text-slate-950">Supabase shipment created</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {persistedCreated.reference} was added from the create shipment flow.
                </p>
                <p className="mt-1 text-xs text-zinc-500">{formatDateTime(persistedCreated.lastUpdated)}</p>
              </div>
            )}
            {notifications.map((notification) => (
              <div key={`${notification.title}-${notification.createdAt}`}>
                <p className="font-semibold text-slate-950">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{notification.message}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDateTime(notification.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Ship className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-950">Shipment board</h2>
          <FileCheck2 className="ml-auto h-5 w-5 text-emerald-600" />
        </div>
        <ShipmentTable shipments={allShipments} />
      </div>
    </div>
  );
}
