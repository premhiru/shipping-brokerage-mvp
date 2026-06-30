"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, Clock, FileCheck2, Ship } from "lucide-react";
import { ShipmentTable } from "@/components/shipment-table";
import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/ui";
import { notifications as seedNotifications, shipments as seedShipments } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";
import type { Notification, Shipment, TaskAssignment } from "@/lib/types";

export function DashboardClient({
  initialShipments,
  initialNotifications,
  initialTasks,
}: {
  initialShipments: Shipment[];
  initialNotifications: Notification[];
  initialTasks: TaskAssignment[];
}) {
  const [allShipments, setAllShipments] = useState<Shipment[]>(initialShipments);
  const [dashboardNotifications, setDashboardNotifications] = useState<Notification[]>(initialNotifications);
  const [assignedTasks, setAssignedTasks] = useState<TaskAssignment[]>(initialTasks);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  async function updateTaskStatus(taskId: string, status: TaskAssignment["status"]) {
    setPendingTaskId(taskId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as { task?: TaskAssignment; error?: string };

      if (!response.ok || !payload.task) {
        throw new Error(payload.error ?? "Unable to update task.");
      }

      setAssignedTasks((current) =>
        current.map((task) => (task.id === taskId ? payload.task as TaskAssignment : task)),
      );
      setActionMessage(status === "done" ? "Task marked done." : "Task reopened.");
      window.dispatchEvent(new Event("harborbridge:shipments-changed"));
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to update task.");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function updateNotificationReadState(notificationId: string, isRead: boolean) {
    setPendingNotificationId(notificationId);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      const payload = (await response.json()) as { notification?: Notification; error?: string };

      if (!response.ok || !payload.notification) {
        throw new Error(payload.error ?? "Unable to update notification.");
      }

      setDashboardNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? payload.notification as Notification : notification,
        ),
      );
      setActionMessage(isRead ? "Notification marked read." : "Notification marked unread.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to update notification.");
    } finally {
      setPendingNotificationId(null);
    }
  }

  async function markAllNotificationsRead() {
    setPendingNotificationId("all");
    setActionMessage(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      const payload = (await response.json()) as { notifications?: Notification[]; error?: string };

      if (!response.ok || !payload.notifications) {
        throw new Error(payload.error ?? "Unable to update notifications.");
      }

      setDashboardNotifications(payload.notifications);
      setActionMessage("All notifications marked read.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Unable to update notifications.");
    } finally {
      setPendingNotificationId(null);
    }
  }

  const hasDocumentBlocker = (shipment: Shipment) =>
    shipment.documents.some((document) => document.status === "needs_review" || document.status === "rejected");
  const blocked = allShipments.filter((shipment) => hasDocumentBlocker(shipment) || shipment.status === "delayed");
  const documentBlockers = blocked.filter(hasDocumentBlocker);
  const openTasks = assignedTasks.filter((task) => task.status === "open");
  const completedTasks = assignedTasks.filter((task) => task.status === "done");
  const visibleTasks = showCompletedTasks ? assignedTasks : openTasks;
  const unreadNotifications = dashboardNotifications.filter((notification) => !notification.isRead);
  const active = allShipments.filter((shipment) => !["closed", "delivered"].includes(shipment.status));
  const shared = allShipments.filter((shipment) => shipment.shareLinks.length > 0);
  const persistedCreated = allShipments.find((shipment) => shipment.reference >= "HB-2026-0005");
  const attentionQueue = blocked.map((shipment) => {
    const needsDocumentReview = hasDocumentBlocker(shipment);
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
        <StatCard label="Active shipments" value={active.length} helper={`Across ${allShipments.length} shipments`} />
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

      {actionMessage && (
        <p className="rounded-lg border border-zinc-200 bg-white p-3 text-sm font-medium text-zinc-700">
          {actionMessage}
        </p>
      )}

      <Card id="attention-queue" className="border-amber-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Attention queue</h2>
              <p className="text-sm text-zinc-600">Clear these items by reviewing documents or updating delayed shipments.</p>
            </div>
          </div>
          {documentBlockers.length > 0 && <ButtonLink href="/admin" variant="secondary">Open admin review</ButtonLink>}
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
                  {hasDocumentBlocker(shipment) && (
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Assigned tasks</h2>
                <p className="text-sm text-zinc-600">
                  {openTasks.length} open, {completedTasks.length} completed.
                </p>
              </div>
            </div>
            {completedTasks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCompletedTasks((current) => !current)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                {showCompletedTasks ? "Hide completed" : "Show completed"}
              </button>
            )}
          </div>
          <div className="mt-5 space-y-4">
            {visibleTasks.length === 0 && (
              <p className="text-sm text-zinc-600">
                {completedTasks.length > 0 ? "No open tasks. Completed tasks are hidden." : "No assigned tasks yet."}
              </p>
            )}
            {visibleTasks.slice(0, 6).map((task) => (
              <div key={task.id} className={task.status === "done" ? "opacity-75" : undefined}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{task.shipmentReference}</p>
                  <Badge value={task.priority} />
                  <Badge value={task.status} />
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{task.task}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {task.assignedTo}
                  {task.dueDate ? ` - due ${task.dueDate}` : ""} - {formatDateTime(task.createdAt)}
                </p>
                <button
                  type="button"
                  disabled={pendingTaskId === task.id}
                  onClick={() => void updateTaskStatus(task.id, task.status === "done" ? "open" : "done")}
                  className="mt-2 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {task.status === "done" ? "Reopen" : "Mark done"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-sky-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
                <p className="text-sm text-zinc-600">{unreadNotifications.length} unread in-app alerts.</p>
              </div>
            </div>
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                disabled={pendingNotificationId === "all"}
                onClick={() => void markAllNotificationsRead()}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
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
              <div
                key={notification.id ?? `${notification.title}-${notification.createdAt}`}
                className={!notification.isRead ? "rounded-lg border border-sky-100 bg-sky-50 p-3" : undefined}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{notification.title}</p>
                  {!notification.isRead && <Badge value="unread" />}
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{notification.message}</p>
                <p className="mt-1 text-xs text-zinc-500">{formatDateTime(notification.createdAt)}</p>
                {notification.id && (
                  <button
                    type="button"
                    disabled={pendingNotificationId === notification.id}
                    onClick={() => void updateNotificationReadState(notification.id as string, !notification.isRead)}
                    className="mt-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {notification.isRead ? "Mark unread" : "Mark read"}
                  </button>
                )}
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
