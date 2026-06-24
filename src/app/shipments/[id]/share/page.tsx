import { notFound } from "next/navigation";
import { ShipmentShareClient } from "@/components/shipment-share-client";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = (await getSupabaseShipment(id)) ?? getShipment(id);

  if (!shipment) {
    notFound();
  }

  return <ShipmentShareClient shipment={shipment} />;
}
