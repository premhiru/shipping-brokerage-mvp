"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CommentsPanel } from "@/components/shipment-detail";
import { StorageUploadField } from "@/components/storage-upload-field";
import { Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import type { StorageUploadResult } from "@/lib/storage";
import type { Shipment } from "@/lib/types";

export function ShipmentCommentsClient({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [attachmentId, setAttachmentId] = useState(() => `comment-attachment-${Date.now()}`);
  const [attachment, setAttachment] = useState<{ result: StorageUploadResult; file: File } | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();

    setState("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: read("userName"),
          role: read("role"),
          message: read("message"),
          attachmentStoragePath: attachment?.result.path ?? "",
          attachmentFileName: attachment?.file.name ?? "",
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to post comment.");
      }

      formRef.current.reset();
      setAttachment(null);
      setAttachmentId(`comment-attachment-${Date.now()}`);
      setState("saved");
      setMessage(attachment ? "Comment and attachment saved to Supabase." : "Comment saved to Supabase.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to post comment.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title="Shipment comments"
        description="Broker, shipper, and shipping-line collaboration thread scoped to this shipment."
      />
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Add comment</h2>
        <form ref={formRef} onSubmit={submitComment}>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <TextInput label="Your name" name="userName" defaultValue="Demo Admin" required />
            <SelectField label="Role" name="role" options={["admin", "shipper", "shipping_line_guest"]} />
            <StorageUploadField
              key={attachmentId}
              shipmentId={shipment.id}
              documentId={attachmentId}
              label="Optional attachment"
              onUploaded={(result, file) => setAttachment({ result, file })}
            />
            <div className="md:col-span-3">
              <TextArea label="Message" name="message" placeholder="Add a note for the team or shipping line." required />
            </div>
          </div>
          {message && (
            <p className={state === "error" ? "mt-3 text-sm text-rose-700" : "mt-3 text-sm text-emerald-700"}>
              {message}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              disabled={state === "saving"}
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {state === "saving" ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      </Card>
      <CommentsPanel shipment={shipment} />
    </div>
  );
}
