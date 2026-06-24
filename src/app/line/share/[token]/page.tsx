import { notFound } from "next/navigation";
import { CarrierShareClient } from "@/components/carrier-share-client";
import { getShipmentByShareToken } from "@/lib/demo-data";
import { getSupabaseShipmentByShareToken } from "@/lib/supabase-shipments";

export default async function ShippingLineSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shipment = (await getSupabaseShipmentByShareToken(token)) ?? getShipmentByShareToken(token);
  const shareLink = shipment?.shareLinks.find((link) => link.token === token);

  if (!shipment || !shareLink) {
    notFound();
  }

  return <CarrierShareClient shipment={shipment} shareLink={shareLink} token={token} />;
}
