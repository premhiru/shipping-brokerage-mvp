import Link from "next/link";
import { DocumentFileActions } from "@/components/document-file-actions";
import { ShipmentStatusCard } from "@/components/shipment-status-card";
import { Badge, Card, EmptyState, Field } from "@/components/ui";
import { documentTypes, milestoneCatalog } from "@/lib/demo-data";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { displayFileNameFromPath } from "@/lib/storage";
import type { Shipment } from "@/lib/types";

export const shipmentTabs = [
  ["Overview", ""],
  ["Vessel", "#vessel"],
  ["Cargo Details", "#cargo"],
  ["Documents", "#documents"],
  ["Timeline", "#timeline"],
  ["B/L", "#bl"],
  ["Comments", "#comments"],
  ["Sharing", "#sharing"],
  ["Audit Log", "#audit"],
] as const;

export function ShipmentTabs({ shipment }: { shipment: Shipment }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 py-3">
      {shipmentTabs.map(([label, hash]) => (
        <Link
          key={label}
          href={`/shipments/${shipment.id}${hash}`}
          className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-slate-950"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function ShipmentSummary({ shipment }: { shipment: Shipment }) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <ShipmentStatusCard shipmentId={shipment.id} status={shipment.status} />
      <Card>
        <p className="text-sm font-medium text-zinc-500">Document status</p>
        <div className="mt-3">
          <Badge value={shipment.documentStatus} />
        </div>
      </Card>
      <Card>
        <p className="text-sm font-medium text-zinc-500">B/L status</p>
        <p className="mt-3 text-lg font-semibold text-slate-950">{shipment.blStatus}</p>
      </Card>
      <Card>
        <p className="text-sm font-medium text-zinc-500">Next action</p>
        <p className="mt-3 text-sm font-semibold text-slate-950">{shipment.nextAction}</p>
      </Card>
    </div>
  );
}

export function ShipmentOverview({ shipment }: { shipment: Shipment }) {
  return (
    <Card>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Shipper" value={shipment.shipperName} />
        <Field label="Consignee" value={shipment.consigneeName} />
        <Field label="Notify party" value={shipment.notifyParty} />
        <Field label="Carrier" value={shipment.carrier} />
        <Field label="Origin" value={shipment.origin} />
        <Field label="Destination" value={shipment.destination} />
        <Field label="POL" value={shipment.pol} />
        <Field label="POD" value={shipment.pod} />
        <Field label="ETD" value={formatDate(shipment.etd)} />
        <Field label="ETA" value={formatDate(shipment.eta)} />
        <Field label="Booking number" value={shipment.bookingNumber} />
        <Field label="Container number" value={shipment.containerNumber} />
      </div>
      <div className="mt-6 rounded-lg bg-zinc-50 p-4">
        <p className="text-sm font-semibold text-slate-950">Operations notes</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{shipment.notes}</p>
      </div>
    </Card>
  );
}

export function CargoPanel({ shipment }: { shipment: Shipment }) {
  return (
    <Card className="scroll-mt-24" id="cargo">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Cargo Details</h2>
          <p className="mt-1 text-sm text-zinc-600">{shipment.cargoDescription}</p>
        </div>
        <Badge value={shipment.incoterm} />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Item type" value={shipment.itemType} />
        <Field label="HS code" value={shipment.hsCode} />
        <Field label="Packages" value={shipment.packageCount} />
        <Field label="Container type" value={shipment.containerType} />
        <Field label="Gross weight" value={formatNumber(shipment.grossWeightKg, " kg")} />
        <Field label="Net weight" value={formatNumber(shipment.netWeightKg, " kg")} />
        <Field label="Volume" value={formatNumber(shipment.volumeCbm, " CBM")} />
        <Field label="Dimensions" value={shipment.dimensions} />
      </div>
    </Card>
  );
}

export function DocumentsPanel({ shipment }: { shipment: Shipment }) {
  const uploadedTypes = new Set(shipment.documents.map((document) => document.type));
  const missingTypes = documentTypes.filter((type) => !uploadedTypes.has(type)).slice(0, 6);

  return (
    <Card className="scroll-mt-24" id="documents">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
          <p className="mt-1 text-sm text-zinc-600">Protected storage-ready checklist and review status.</p>
        </div>
        <Link
          href={`/shipments/${shipment.id}/documents`}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50"
        >
          Open document workspace
        </Link>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="border-b border-zinc-200 py-2">Type</th>
              <th className="border-b border-zinc-200 py-2">File</th>
              <th className="border-b border-zinc-200 py-2">Actions</th>
              <th className="border-b border-zinc-200 py-2">Uploaded by</th>
              <th className="border-b border-zinc-200 py-2">Status</th>
              <th className="border-b border-zinc-200 py-2">Review note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {shipment.documents.map((document) => (
              <tr key={document.id}>
                <td className="py-3 font-medium text-slate-950">{document.type}</td>
                <td className="py-3 text-zinc-600">{document.fileName}</td>
                <td className="py-3">
                  <DocumentFileActions
                    shipmentId={shipment.id}
                    storagePath={document.storagePath}
                    fileName={document.fileName}
                    compact
                  />
                </td>
                <td className="py-3 text-zinc-600">{document.uploadedBy}</td>
                <td className="py-3">
                  <Badge value={document.status} />
                </td>
                <td className="py-3 text-zinc-600">{document.rejectionReason || "No issues"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missingTypes.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">Suggested next document types: {missingTypes.join(", ")}.</p>
      )}
    </Card>
  );
}

export function TimelinePanel({ shipment }: { shipment: Shipment }) {
  const completed = new Set(shipment.timeline.map((event) => event.milestone));

  return (
    <Card className="scroll-mt-24" id="timeline">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Milestone Timeline</h2>
          <p className="mt-1 text-sm text-zinc-600">Manual tracking now, carrier integrations later.</p>
        </div>
        <Link
          href={`/shipments/${shipment.id}/timeline`}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50"
        >
          Update timeline
        </Link>
      </div>
      <div className="mt-5 space-y-3">
        {milestoneCatalog.slice(0, 12).map((milestone) => {
          const event = shipment.timeline.find((item) => item.milestone === milestone);
          return (
            <div key={milestone} className="grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-[1fr_160px_1.5fr]">
              <div>
                <p className="font-semibold text-slate-950">{milestone}</p>
                <p className="mt-1 text-xs text-zinc-500">{event?.responsibleParty || "Not assigned"}</p>
              </div>
              <Badge value={event?.status || (completed.has(milestone) ? "completed" : "pending")} />
              <p className="text-sm text-zinc-600">{event?.notes || "No update yet."}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function BillOfLadingPanel({ shipment }: { shipment: Shipment }) {
  return (
    <Card className="scroll-mt-24" id="bl">
      <h2 className="text-lg font-semibold text-slate-950">Bill of Lading</h2>
      {shipment.billOfLading ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="B/L number" value={shipment.billOfLading.number} />
          <Field label="Type" value={shipment.billOfLading.type} />
          <Field label="Status" value={shipment.billOfLading.status} />
          <Field label="Issued" value={formatDateTime(shipment.billOfLading.issuedAt)} />
          <div className="md:col-span-2 lg:col-span-4">
            <Field label="Notes" value={shipment.billOfLading.notes} />
          </div>
        </div>
      ) : (
        <EmptyState title="B/L not issued yet" description="Draft and final B/L documents will appear here once uploaded." />
      )}
    </Card>
  );
}

export function CommentsPanel({ shipment }: { shipment: Shipment }) {
  return (
    <Card className="scroll-mt-24" id="comments">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Comments</h2>
          <p className="mt-1 text-sm text-zinc-600">Shipment-specific collaboration thread.</p>
        </div>
        <Link
          href={`/shipments/${shipment.id}/comments`}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50"
        >
          Open thread
        </Link>
      </div>
      <div className="mt-5 space-y-3">
        {shipment.comments.map((comment) => (
          <div key={`${comment.userName}-${comment.timestamp}`} className="rounded-lg bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-950">{comment.userName}</p>
              <Badge value={comment.role} />
              <span className="text-xs text-zinc-500">{formatDateTime(comment.timestamp)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{comment.message}</p>
            {comment.attachment && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="text-xs font-semibold text-sky-700">
                  Attachment: {displayFileNameFromPath(comment.attachment)}
                </p>
                <DocumentFileActions
                  shipmentId={shipment.id}
                  storagePath={comment.attachment}
                  fileName={displayFileNameFromPath(comment.attachment)}
                  compact
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SharingPanel({ shipment }: { shipment: Shipment }) {
  return (
    <Card className="scroll-mt-24" id="sharing">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Shipping Line Sharing</h2>
          <p className="mt-1 text-sm text-zinc-600">Scoped access links only expose this shipment pack.</p>
        </div>
        <Link
          href={`/shipments/${shipment.id}/share`}
          className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50"
        >
          Manage links
        </Link>
      </div>
      <div className="mt-5 space-y-3">
        {shipment.shareLinks.length === 0 ? (
          <EmptyState title="No active share links" description="Create one when the shipment pack is ready for a carrier." />
        ) : (
          shipment.shareLinks.map((shareLink) => (
            <div key={shareLink.token} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{shareLink.recipientCompany}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {shareLink.recipientName} · expires {formatDate(shareLink.expiresAt)}
                  </p>
                </div>
                <Link href={`/line/share/${shareLink.token}`} className="text-sm font-semibold text-sky-700">
                  Open guest view
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function AuditPanel({ shipment }: { shipment: Shipment }) {
  return (
    <Card className="scroll-mt-24" id="audit">
      <h2 className="text-lg font-semibold text-slate-950">Audit Log</h2>
      <div className="mt-5 space-y-3">
        {shipment.auditLogs.map((log) => (
          <div key={`${log.action}-${log.timestamp}`} className="grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-[180px_1fr_160px]">
            <div>
              <p className="font-semibold text-slate-950">{log.action}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDateTime(log.timestamp)}</p>
            </div>
            <p className="text-sm text-zinc-600">{log.detail}</p>
            <div>
              <p className="text-sm font-semibold text-slate-950">{log.actor}</p>
              <Badge value={log.role} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
