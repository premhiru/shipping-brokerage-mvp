"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TimelinePanel } from "@/components/shipment-detail";
import { Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import { milestoneCatalog } from "@/lib/demo-data";
import type { Shipment } from "@/lib/types";

export function ShipmentTimelineClient({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitTimeline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();

    setState("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestone: read("milestone"),
          status: read("status"),
          responsibleParty: read("responsibleParty"),
          timestamp: read("timestamp"),
          source: read("source"),
          notes: read("notes"),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update timeline.");
      }

      formRef.current.reset();
      setState("saved");
      setMessage("Timeline event saved to Supabase.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to update timeline.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title="Milestone timeline"
        description="Manual status updates for the MVP, with clear extension points for future DCSA and carrier APIs."
      />
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Add milestone update</h2>
        <form ref={formRef} onSubmit={submitTimeline}>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <SelectField label="Milestone" name="milestone" options={milestoneCatalog} />
            <SelectField label="Status" name="status" options={["pending", "in_progress", "completed", "blocked", "skipped"]} />
            <TextInput label="Responsible party" name="responsibleParty" placeholder="Broker, shipper, shipping line" />
            <TextInput label="Timestamp" name="timestamp" type="datetime-local" />
            <SelectField label="Source" name="source" options={["manual", "system", "shipping_line_guest"]} />
            <div className="md:col-span-3">
              <TextArea label="Notes" name="notes" placeholder="What changed and what happens next?" required />
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
              {state === "saving" ? "Saving..." : "Save timeline update"}
            </button>
          </div>
        </form>
      </Card>
      <TimelinePanel shipment={shipment} />
    </div>
  );
}
