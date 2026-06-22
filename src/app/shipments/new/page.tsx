import { CreateShipmentForm } from "@/components/create-shipment-form";
import { PageHeader } from "@/components/ui";

export default function NewShipmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Create shipment"
        title="New shipment pack"
        description="Capture the cargo, parties, routing, and references needed before document upload and carrier sharing."
      />
      <CreateShipmentForm />
    </div>
  );
}
