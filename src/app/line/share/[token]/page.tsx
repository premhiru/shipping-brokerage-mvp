import Link from "next/link";
import { notFound } from "next/navigation";
import { FileUp, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge, Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import { getShipmentByShareToken } from "@/lib/demo-data";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function ShippingLineSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shipment = getShipmentByShareToken(token);
  const shareLink = shipment?.shareLinks.find((link) => link.token === token);

  if (!shipment || !shareLink) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-950">Secure carrier view</p>
                <p className="text-sm text-zinc-600">
                  Access scoped to {shipment.reference}. Expires {formatDate(shareLink.expiresAt)}.
                </p>
              </div>
            </div>
            <Link href="/" className="text-sm font-semibold text-sky-700">
              HarborBridge MVP
            </Link>
          </div>
        </div>

        <PageHeader
          eyebrow={shareLink.recipientCompany}
          title={`${shipment.reference}: ${shipment.origin} to ${shipment.destination}`}
          description="Review shipment details, comment back to the broker, upload booking confirmation or draft B/L, and update selected statuses."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-zinc-500">Cargo</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{shipment.cargoDescription}</p>
            <p className="mt-2 text-sm text-zinc-600">{shipment.packageCount} packages · {shipment.containerType}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-zinc-500">Booking</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{shipment.bookingNumber || "Pending"}</p>
            <p className="mt-2 text-sm text-zinc-600">ETD {formatDate(shipment.etd)} · ETA {formatDate(shipment.eta)}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-zinc-500">Current status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge value={shipment.status} />
              <Badge value={shipment.documentStatus} />
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <h2 className="text-lg font-semibold text-slate-950">Documents shared with you</h2>
            <div className="mt-5 space-y-3">
              {shipment.documents.map((document) => (
                <div key={document.id} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{document.type}</p>
                    <p className="mt-1 text-sm text-zinc-600">{document.fileName}</p>
                  </div>
                  <Badge value={document.status} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-sky-700" />
              <h2 className="text-lg font-semibold text-slate-950">Carrier update</h2>
            </div>
            <div className="mt-5 space-y-4">
              <SelectField label="Upload type" options={["Booking confirmation", "Draft B/L", "Final B/L / sea waybill", "Other"]} />
              <TextInput label="File" type="file" />
              <SelectField label="Status update" options={["Booking confirmed", "Draft B/L issued", "Loaded on vessel", "Vessel sailed"]} />
              <TextArea label="Notes" placeholder="Add carrier message for the broker." />
              <button className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Submit carrier update</button>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-slate-950">Comments</h2>
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
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
