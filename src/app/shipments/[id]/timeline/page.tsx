import { notFound } from "next/navigation";
import { TimelinePanel } from "@/components/shipment-detail";
import { Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import { getShipment, milestoneCatalog } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipment = getShipment(id) ?? await getSupabaseShipment(id);

  if (!shipment) {
    notFound();
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
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField label="Milestone" options={milestoneCatalog} />
          <SelectField label="Status" options={["pending", "in_progress", "completed", "blocked", "skipped"]} />
          <TextInput label="Responsible party" placeholder="Broker, shipper, shipping line" />
          <TextInput label="Timestamp" type="datetime-local" />
          <SelectField label="Source" options={["manual", "system", "shipping_line_guest"]} />
          <div className="md:col-span-3">
            <TextArea label="Notes" placeholder="What changed and what happens next?" />
          </div>
        </div>
      </Card>
      <TimelinePanel shipment={shipment} />
    </div>
  );
}
