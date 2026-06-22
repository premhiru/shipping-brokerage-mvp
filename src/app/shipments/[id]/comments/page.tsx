import { notFound } from "next/navigation";
import { CommentsPanel } from "@/components/shipment-detail";
import { Card, PageHeader, TextArea, TextInput } from "@/components/ui";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentCommentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipment = getShipment(id) ?? await getSupabaseShipment(id);

  if (!shipment) {
    notFound();
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
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextInput label="Your name" defaultValue="Demo Admin" />
          <TextInput label="Optional attachment" type="file" />
          <div className="md:col-span-2">
            <TextArea label="Message" placeholder="Add a note for the team or shipping line." />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Post comment</button>
        </div>
      </Card>
      <CommentsPanel shipment={shipment} />
    </div>
  );
}
