"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, MessageSquareText, ShieldCheck } from "lucide-react";
import { DocumentFileActions } from "@/components/document-file-actions";
import { StorageUploadField } from "@/components/storage-upload-field";
import { Badge, Card, PageHeader, SelectField, TextArea } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { displayFileNameFromPath } from "@/lib/storage";
import type { StorageUploadResult } from "@/lib/storage";
import type { ShareLink, Shipment } from "@/lib/types";

export function CarrierShareClient({
  shipment,
  shareLink,
  token,
}: {
  shipment: Shipment;
  shareLink: ShareLink;
  token: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [documentId, setDocumentId] = useState(() => `carrier-upload-${Date.now()}`);
  const [upload, setUpload] = useState<{ result: StorageUploadResult; file: File } | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitCarrierUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();

    setState("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/line/share/${token}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadType: read("uploadType"),
          upload: upload
            ? {
                path: upload.result.path,
                fileName: upload.file.name,
                mimeType: upload.file.type || "application/octet-stream",
                size: upload.file.size,
              }
            : null,
          statusUpdate: read("statusUpdate"),
          notes: read("notes"),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit carrier update.");
      }

      formRef.current.reset();
      setUpload(null);
      setDocumentId(`carrier-upload-${Date.now()}`);
      setState("saved");
      setMessage(upload ? "Carrier update and uploaded document saved to Supabase." : "Carrier update saved to Supabase.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit carrier update.");
    }
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
                    <div className="mt-3">
                      <DocumentFileActions
                        shipmentId={shipment.id}
                        storagePath={document.storagePath}
                        fileName={document.fileName}
                        shareToken={token}
                        compact
                      />
                    </div>
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
            <form ref={formRef} onSubmit={submitCarrierUpdate} className="mt-5 space-y-4">
              <SelectField name="uploadType" label="Upload type" options={["Booking confirmation", "Draft B/L", "Final B/L / sea waybill", "Other"]} />
              {shareLink.canUploadDocuments ? (
                <StorageUploadField
                  key={documentId}
                  shipmentId={shipment.id}
                  documentId={documentId}
                  shareToken={token}
                  label="File"
                  onUploaded={(result, file) => setUpload({ result, file })}
                />
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  This share link cannot upload documents.
                </p>
              )}
              <SelectField name="statusUpdate" label="Status update" options={["Booking confirmed", "Draft B/L issued", "Loaded on vessel", "Vessel sailed"]} />
              <TextArea name="notes" label="Notes" placeholder="Add carrier message for the broker." required />
              {message && (
                <p className={state === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>
                  {message}
                </p>
              )}
              <button
                disabled={state === "saving"}
                className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {state === "saving" ? "Submitting..." : "Submit carrier update"}
              </button>
            </form>
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
                {comment.attachment && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="text-xs font-semibold text-sky-700">
                      Attachment: {displayFileNameFromPath(comment.attachment)}
                    </p>
                    <DocumentFileActions
                      shipmentId={shipment.id}
                      storagePath={comment.attachment}
                      fileName={displayFileNameFromPath(comment.attachment)}
                      shareToken={token}
                      compact
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
