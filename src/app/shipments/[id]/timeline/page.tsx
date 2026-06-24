import { notFound } from "next/navigation";
import { ShipmentTimelineClient } from "@/components/shipment-timeline-client";
import { getShipment } from "@/lib/demo-data";
import { getSupabaseShipment } from "@/lib/supabase-shipments";

export default async function ShipmentTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = (await getSupabaseShipment(id)) ?? getShipment(id);

  if (!shipment) {
    notFound();
  }

  return <ShipmentTimelineClient shipment={shipment} />;
}
