import { notFound } from "next/navigation";
import { SharingPanel } from "@/components/shipment-detail";
import { Card, PageHeader, TextInput } from "@/components/ui";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipment = getShipment(id) ?? await getSupabaseShipment(id);

  if (!shipment) {
    notFound();
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
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <TextInput label="Recipient company" placeholder="Carrier or shipping line" />
          <TextInput label="Recipient name" placeholder="Booking desk contact" />
          <TextInput label="Recipient email" placeholder="carrier@example.com" />
          <TextInput label="Expiry date" type="date" />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
            Can comment
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
            Can upload documents
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300" />
            Can update selected statuses
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Generate link</button>
        </div>
      </Card>
      <SharingPanel shipment={shipment} />
    </div>
  );
}
