"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { FeedbackItem } from "@/lib/types";

export function FeedbackClient({ feedback }: { feedback: FeedbackItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();

    setState("saving");
    setMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submittedBy: read("submittedBy"),
          pageOrFeature: read("pageOrFeature"),
          priority: read("priority"),
          status: read("status"),
          comment: read("comment"),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit feedback.");
      }

      formRef.current.reset();
      setState("saved");
      setMessage("Feedback saved to Supabase.");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit feedback.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client feedback"
        title="MVP review board"
        description="A lightweight place for the client to leave page-level feedback, priorities, and review status during the Vercel preview phase."
      />

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Leave feedback</h2>
        <form ref={formRef} onSubmit={submitFeedback}>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <TextInput label="Submitted by" name="submittedBy" defaultValue="Client Reviewer" />
            <TextInput
              label="Page or feature"
              name="pageOrFeature"
              placeholder="Dashboard, share portal, documents..."
              required
            />
            <SelectField label="Priority" name="priority" options={["low", "medium", "high"]} defaultValue="medium" />
            <SelectField label="Status" name="status" options={["open", "reviewed", "resolved"]} defaultValue="open" />
            <div className="md:col-span-3">
              <TextArea
                label="Comment"
                name="comment"
                placeholder="What should be changed, clarified, or added?"
                required
              />
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
              {state === "saving" ? "Submitting..." : "Submit feedback"}
            </button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {feedback.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={item.priority} />
              <Badge value={item.status} />
              <span className="text-xs text-zinc-500">{formatDateTime(item.createdAt)}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">{item.pageOrFeature}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{item.comment}</p>
            <p className="mt-4 text-sm font-medium text-zinc-500">Submitted by {item.submittedBy}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
