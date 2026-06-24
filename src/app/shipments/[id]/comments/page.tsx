import { notFound } from "next/navigation";
import { ShipmentCommentsClient } from "@/components/shipment-comments-client";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentCommentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = (await getSupabaseShipment(id)) ?? getShipment(id);

  if (!shipment) {
    notFound();
  }

  return <ShipmentCommentsClient shipment={shipment} />;
}
