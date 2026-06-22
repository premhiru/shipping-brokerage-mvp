import { Badge, Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import { feedback } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client feedback"
        title="MVP review board"
        description="A lightweight place for the client to leave page-level feedback, priorities, and review status during the Vercel preview phase."
      />

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Leave feedback</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <TextInput label="Page or feature" placeholder="Dashboard, share portal, documents..." />
          <SelectField label="Priority" options={["low", "medium", "high"]} />
          <SelectField label="Status" options={["open", "reviewed", "resolved"]} />
          <div className="md:col-span-3">
            <TextArea label="Comment" placeholder="What should be changed, clarified, or added?" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Submit feedback</button>
        </div>
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
