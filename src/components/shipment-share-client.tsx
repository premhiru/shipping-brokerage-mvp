"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SharingPanel } from "@/components/shipment-detail";
import { Card, PageHeader, TextInput } from "@/components/ui";
import type { Shipment } from "@/lib/types";

export function ShipmentShareClient({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");

  async function submitShareLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();
    const checked = (name: string) => formData.get(name) === "on";

    setState("saving");
    setMessage("");
    setGeneratedUrl("");

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientCompany: read("recipientCompany"),
          recipientName: read("recipientName"),
          recipientEmail: read("recipientEmail"),
          expiryDate: read("expiryDate"),
          canComment: checked("canComment"),
          canUploadDocuments: checked("canUploadDocuments"),
          canUpdateStatus: checked("canUpdateStatus"),
        }),
      });
      const payload = (await response.json()) as { shareLink?: { url: string }; error?: string };

      if (!response.ok || !payload.shareLink) {
        throw new Error(payload.error || "Unable to generate share link.");
      }

      setGeneratedUrl(payload.shareLink.url);
      setState("saved");
      setMessage("Share link saved to Supabase. Copy this link now; only the hashed token is stored.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to generate share link.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title="Share with shipping line"
        description="Generate an expiring, shipment-scoped link for carrier review, comments, document upload, and selected status updates."
      />
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Generate secure share link</h2>
        <form ref={formRef} onSubmit={submitShareLink}>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <TextInput label="Recipient company" name="recipientCompany" placeholder="Carrier or shipping line" required />
            <TextInput label="Recipient name" name="recipientName" placeholder="Booking desk contact" required />
            <TextInput label="Recipient email" name="recipientEmail" placeholder="carrier@example.com" />
            <TextInput label="Expiry date" name="expiryDate" type="date" />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input name="canComment" type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
              Can comment
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input name="canUploadDocuments" type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
              Can upload documents
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input name="canUpdateStatus" type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
              Can update selected statuses
            </label>
          </div>
          {message && (
            <p className={state === "error" ? "mt-3 text-sm text-rose-700" : "mt-3 text-sm text-emerald-700"}>
              {message}
            </p>
          )}
          {generatedUrl && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-semibold text-emerald-900">Generated carrier link</p>
              <Link href={generatedUrl} className="mt-1 block break-all text-sky-700 underline">
                {generatedUrl}
              </Link>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              disabled={state === "saving"}
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {state === "saving" ? "Generating..." : "Generate link"}
            </button>
          </div>
        </form>
      </Card>
      <SharingPanel shipment={shipment} />
    </div>
  );
}
