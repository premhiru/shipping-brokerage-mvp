import { Activity, FileWarning, MessageSquareText, Users } from "lucide-react";
import { ShipmentTable } from "@/components/shipment-table";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { feedback, shipments } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";

export default function AdminPage() {
  const documentsNeedingReview = shipments.flatMap((shipment) =>
    shipment.documents
      .filter((document) => ["needs_review", "rejected"].includes(document.status))
      .map((document) => ({ shipment, document })),
  );
  const auditLogs = shipments.flatMap((shipment) =>
    shipment.auditLogs.map((log) => ({ ...log, shipmentReference: shipment.reference })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin panel"
        title="Broker administration"
        description="Manage users, shipments, document reviews, share links, audit events, and client feedback from one place."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value="3" helper="Admin, shipper, carrier guest pattern" />
        <StatCard label="Open feedback" value={feedback.filter((item) => item.status !== "resolved").length} helper="Client review items" />
        <StatCard label="Docs needing review" value={documentsNeedingReview.length} helper="Requires admin decision" />
        <StatCard label="Audit events" value={auditLogs.length} helper="Tracked operational actions" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-slate-950">User management</h2>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Avery Tan", "admin", "admin@harborbridge.demo"],
              ["Mina Koh", "shipper", "shipper@harborbridge.demo"],
              ["Carrier Desk", "shipping_line_guest", "Share-link access only"],
            ].map(([name, role, email]) => (
              <div key={email} className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
                <div>
                  <p className="font-semibold text-slate-950">{name}</p>
                  <p className="text-sm text-zinc-600">{email}</p>
                </div>
                <Badge value={role} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-950">Document approvals</h2>
          </div>
          <div className="mt-5 space-y-3">
            {documentsNeedingReview.map(({ shipment, document }) => (
              <div key={document.id} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{document.type}</p>
                  <Badge value={document.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-600">{shipment.reference} · {document.rejectionReason}</p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    Approve
                  </button>
                  <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-950">Audit log</h2>
        </div>
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div key={`${log.shipmentReference}-${log.action}-${log.timestamp}`} className="grid gap-3 rounded-lg border border-zinc-200 p-4 md:grid-cols-[160px_1fr_180px]">
              <p className="font-semibold text-slate-950">{log.shipmentReference}</p>
              <p className="text-sm text-zinc-600">{log.detail}</p>
              <p className="text-xs text-zinc-500">{formatDateTime(log.timestamp)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-950">Client feedback</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {feedback.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge value={item.priority} />
                <Badge value={item.status} />
              </div>
              <p className="mt-3 font-semibold text-slate-950">{item.pageOrFeature}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.comment}</p>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-950">All shipments</h2>
        <ShipmentTable shipments={shipments} />
      </div>
    </div>
  );
}
