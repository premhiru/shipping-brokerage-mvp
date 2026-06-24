import { notFound } from "next/navigation";
import {
  AuditPanel,
  BillOfLadingPanel,
  CargoPanel,
  CommentsPanel,
  DocumentsPanel,
  SharingPanel,
  ShipmentOverview,
  ShipmentSummary,
  ShipmentTabs,
  TimelinePanel,
} from "@/components/shipment-detail";
import { ButtonLink, PageHeader } from "@/components/ui";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipment = (await getSupabaseShipment(id)) ?? getShipment(id);

  if (!shipment) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title={`${shipment.origin} to ${shipment.destination}`}
        description={shipment.cargoDescription}
        action={<ButtonLink href={`/shipments/${shipment.id}/share`} variant="secondary">Share with line</ButtonLink>}
      />
      <ShipmentTabs shipment={shipment} />
      <ShipmentSummary shipment={shipment} />
      <ShipmentOverview shipment={shipment} />
      <CargoPanel shipment={shipment} />
      <DocumentsPanel shipment={shipment} />
      <TimelinePanel shipment={shipment} />
      <BillOfLadingPanel shipment={shipment} />
      <CommentsPanel shipment={shipment} />
      <SharingPanel shipment={shipment} />
      <AuditPanel shipment={shipment} />
    </div>
  );
}
