import { notFound } from "next/navigation";
import { ShipmentDocumentsClient } from "@/components/shipment-documents-client";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shipment = (await getSupabaseShipment(id)) ?? getShipment(id);

  if (!shipment) {
    notFound();
  }

  return <ShipmentDocumentsClient shipment={shipment} />;
}
