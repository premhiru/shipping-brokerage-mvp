import { notFound } from "next/navigation";
import { DocumentsPanel } from "@/components/shipment-detail";
import { StorageUploadField } from "@/components/storage-upload-field";
import { Card, PageHeader, SelectField } from "@/components/ui";
import { documentTypes, getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipment = getShipment(id) ?? await getSupabaseShipment(id);

  if (!shipment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title="Document workspace"
        description="Upload, review, approve, reject, and share shipment documentation with the shipping line."
      />
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Upload document</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField label="Document type" options={documentTypes} />
          <StorageUploadField shipmentId={shipment.id} documentId="new-document" />
          <SelectField
            label="Initial status"
            options={["uploaded", "processing", "needs_review", "approved", "shared_with_line"]}
          />
        </div>
      </Card>
      <DocumentsPanel shipment={shipment} />
    </div>
  );
}
