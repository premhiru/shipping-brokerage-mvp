"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, Clock, FileCheck2, Ship } from "lucide-react";
import { ShipmentTable } from "@/components/shipment-table";
import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/ui";
import { notifications as seedNotifications, shipments as seedShipments } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";
import type { Notification, Shipment, TaskAssignment } from "@/lib/types";

export function DashboardClient() {
  const [allShipments, setAllShipments] = useState<Shipment[]>(seedShipments);
  const [dashboardNotifications, setDashboardNotifications] = useState<Notification[]>(seedNotifications);
  const [assignedTasks, setAssignedTasks] = useState<TaskAssignment[]>([]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [shipmentsResponse, notificationsResponse, tasksResponse] = await Promise.all([
          fetch("/api/shipments", { cache: "no-store" }),
          fetch("/api/notifications", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
        ]);

        const shipmentsPayload = (await shipmentsResponse.json()) as { shipments?: Shipment[] };
        const notificationsPayload = (await notificationsResponse.json()) as { notifications?: Notification[] };
        const tasksPayload = (await tasksResponse.json()) as { tasks?: TaskAssignment[] };

        if (shipmentsResponse.ok && shipmentsPayload.shipments) {
          setAllShipments(shipmentsPayload.shipments);
        }

        if (notificationsResponse.ok && notificationsPayload.notifications) {
          setDashboardNotifications(notificationsPayload.notifications);
        }

        if (tasksResponse.ok && tasksPayload.tasks) {
          setAssignedTasks(tasksPayload.tasks);
        }
      } catch {
        setAllShipments(seedShipments);
        setDashboardNotifications(seedNotifications);
        setAssignedTasks([]);
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
  const documentBlockers = blocked.filter((shipment) => shipment.documentStatus === "needs_review");
  const active = allShipments.filter((shipment) => !["closed", "delivered"].includes(shipment.status));
  const shared = allShipments.filter((shipment) => shipment.shareLinks.length > 0);
  const persistedCreated = allShipments.find((shipment) => shipment.reference >= "HB-2026-0005");
  const attentionQueue = blocked.map((shipment) => {
    const needsDocumentReview = shipment.documentStatus === "needs_review";
    const isDelayed = shipment.status === "delayed";

    return {
      shipment,
      reasons: [
        ...(needsDocumentReview ? ["Documents need review"] : []),
        ...(isDelayed ? ["Shipment delayed"] : []),
      ],
      primaryAction: isDelayed ? "Update status" : "Review documents",
      primaryHref: isDelayed ? `/shipments/${shipment.id}` : "/admin",
      guidance: isDelayed
        ? "Open the shipment and move it out of Delayed once the blocker is resolved."
        : "Approve or reject the pending document from the admin review queue.",
    };
  });

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
        <a
          href="#attention-queue"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:border-amber-300 hover:bg-amber-100"
        >
          <p className="text-sm font-medium text-amber-800">Needs attention</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{blocked.length}</p>
          <p className="mt-1 text-xs text-amber-800">Open the attention queue</p>
        </a>
        <StatCard label="B/L in progress" value="2" helper="Draft or final records tracked" />
      </div>

      <Card id="attention-queue" className="border-amber-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Attention queue</h2>
              <p className="text-sm text-zinc-600">Clear these items by reviewing documents or updating delayed shipments.</p>
            </div>
          </div>
          <ButtonLink href="/admin" variant="secondary">Open admin review</ButtonLink>
        </div>
        <div className="mt-5 space-y-3">
          {attentionQueue.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
              Nothing needs attention right now.
            </p>
          )}
          {attentionQueue.map(({ shipment, reasons, primaryAction, primaryHref, guidance }) => (
            <div key={shipment.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{shipment.reference}</p>
                    {reasons.map((reason) => (
                      <Badge key={reason} value={reason} />
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{guidance}</p>
                  <p className="mt-1 text-sm text-zinc-500">{shipment.nextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={primaryHref}
                    className="inline-flex items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {primaryAction}
                  </Link>
                  <Link
                    href={`/shipments/${shipment.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                  >
                    Open shipment
                  </Link>
                  {shipment.documentStatus === "needs_review" && (
                    <Link
                      href={`/shipments/${shipment.id}/documents`}
                      className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                    >
                      Documents
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
            <ClipboardList className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Assigned tasks</h2>
              <p className="text-sm text-zinc-600">Open work assigned from shipment records.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {assignedTasks.length === 0 && <p className="text-sm text-zinc-600">No assigned tasks yet.</p>}
            {assignedTasks.slice(0, 6).map((task) => (
              <div key={task.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{task.shipmentReference}</p>
                  <Badge value={task.priority} />
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{task.task}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {task.assignedTo}
                  {task.dueDate ? ` - due ${task.dueDate}` : ""} - {formatDateTime(task.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-sky-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
              <p className="text-sm text-zinc-600">Live in-app alerts from shipment activity.</p>
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
            {dashboardNotifications.map((notification) => (
              <div key={notification.id ?? `${notification.title}-${notification.createdAt}`}>
                <p className="font-semibold text-slate-950">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{notification.message}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDateTime(notification.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Document focus</h2>
              <p className="text-sm text-zinc-600">Documents currently blocking shipments.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {documentBlockers.length === 0 && (
              <p className="text-sm text-zinc-600">No document blockers right now.</p>
            )}
            {documentBlockers.slice(0, 5).map((shipment) => (
              <div key={shipment.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{shipment.reference}</p>
                  <Badge value={shipment.documentStatus} />
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{shipment.nextAction}</p>
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
