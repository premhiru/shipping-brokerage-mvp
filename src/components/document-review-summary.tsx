import { AlertTriangle, CheckCircle2, FileSearch } from "lucide-react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/format";
import { getMissingRequiredDocumentFindings, getShipmentReviewFindings } from "@/lib/document-review";
import type { DocumentReviewFinding, Shipment, ShipmentDocument } from "@/lib/types";

function severityClass(severity: DocumentReviewFinding["severity"]) {
  if (severity === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

export function FindingList({ findings }: { findings: DocumentReviewFinding[] }) {
  if (findings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        No mismatch findings.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {findings.map((finding, index) => (
        <div
          key={`${finding.field}-${index}`}
          className={cn("rounded-md border px-3 py-2 text-sm", severityClass(finding.severity))}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{finding.label}</span>
            <Badge value={finding.severity} />
          </div>
          <p className="mt-1 leading-6">{finding.message}</p>
        </div>
      ))}
    </div>
  );
}

export function DocumentReviewSummary({ shipment }: { shipment: Shipment }) {
  const missingFindings = getMissingRequiredDocumentFindings(shipment);
  const documentFindings = shipment.documents.flatMap((document) => document.reviewFindings ?? []);
  const allFindings = getShipmentReviewFindings(shipment);

  return (
    <Card className="scroll-mt-24" id="document-review">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-slate-950">Document Review</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Checks uploaded document fields against the shipment record and required document checklist.
          </p>
        </div>
        <Badge value={allFindings.length > 0 ? "needs_review" : "clear"} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-500">Required docs missing</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{missingFindings.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-500">Field mismatches</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{documentFindings.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4">
          <p className="text-sm font-medium text-zinc-500">Documents checked</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {shipment.documents.filter((document) => Object.keys(document.extractedFields ?? {}).length > 0).length}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {allFindings.length === 0 ? (
          <EmptyState
            title="No document review blockers"
            description="Required documents are present and extracted fields match the shipment record."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Review findings
            </div>
            <FindingList findings={allFindings} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function DocumentFindingPreview({ document }: { document: ShipmentDocument }) {
  const findings = document.reviewFindings ?? [];

  if (findings.length === 0 && !document.reviewSummary) {
    return <span className="text-sm text-zinc-500">No automated findings</span>;
  }

  return (
    <div className="space-y-2">
      {document.reviewSummary && <p className="text-sm font-medium text-zinc-700">{document.reviewSummary}</p>}
      {findings.length > 0 && <FindingList findings={findings.slice(0, 3)} />}
      {findings.length > 3 && (
        <p className="text-xs font-medium text-zinc-500">+{findings.length - 3} more finding(s)</p>
      )}
    </div>
  );
}
