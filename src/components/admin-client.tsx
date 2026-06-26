"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, FileWarning, MessageSquareText, Users } from "lucide-react";
import { DocumentFindingPreview } from "@/components/document-review-summary";
import { DocumentFileActions } from "@/components/document-file-actions";
import { ShipmentTable } from "@/components/shipment-table";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { FeedbackItem, Shipment, ShipmentDocument } from "@/lib/types";

type ReviewItem = {
  shipment: Shipment;
  document: ShipmentDocument;
};

export function AdminClient({ shipments, feedback }: { shipments: Shipment[]; feedback: FeedbackItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const documentsNeedingReview: ReviewItem[] = shipments.flatMap((shipment) =>
    shipment.documents
      .filter((document) => ["needs_review", "rejected"].includes(document.status) || (document.reviewFindings?.length ?? 0) > 0)
      .map((document) => ({ shipment, document })),
  );
  const auditLogs = shipments.flatMap((shipment) =>
    shipment.auditLogs.map((log) => ({ ...log, shipmentReference: shipment.reference })),
  );

  async function reviewDocument(documentId: string, decision: "approve" | "reject") {
    setPendingId(documentId);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/documents/${documentId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          rejectionReason: decision === "reject" ? "Rejected from admin review queue." : "",
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to review document.");
      }

      setMessage(decision === "approve" ? "Document approved in Supabase." : "Document rejected in Supabase.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review document.");
    } finally {
      setPendingId(null);
    }
  }

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
          {message && <p className="mt-3 text-sm text-zinc-600">{message}</p>}
          <div className="mt-5 space-y-3">
            {documentsNeedingReview.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
                No documents need review.
              </p>
            )}
            {documentsNeedingReview.map(({ shipment, document }) => (
              <div key={document.id} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{document.type}</p>
                  <Badge value={document.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-600">{shipment.reference} · {document.rejectionReason || "Needs admin review"}</p>
                <div className="mt-3">
                  <DocumentFindingPreview document={document} />
                </div>
                <div className="mt-3">
                  <DocumentFileActions
                    shipmentId={shipment.id}
                    storagePath={document.storagePath}
                    fileName={document.fileName}
                    compact
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={pendingId === document.id}
                    onClick={() => void reviewDocument(document.id, "approve")}
                    className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={pendingId === document.id}
                    onClick={() => void reviewDocument(document.id, "reject")}
                    className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
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
