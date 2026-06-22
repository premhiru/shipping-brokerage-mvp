import { AdminClient } from "@/components/admin-client";
import { feedback as fallbackFeedback, shipments as fallbackShipments } from "@/lib/demo-data";
import { getSupabaseFeedback } from "@/lib/supabase-feedback";
import { getSupabaseShipments } from "@/lib/supabase-shipments";

export default async function AdminPage() {
  const [shipments, feedback] = await Promise.all([
    getSupabaseShipments(),
    getSupabaseFeedback(),
  ]);

  return (
    <AdminClient
      shipments={shipments ?? fallbackShipments}
      feedback={feedback ?? fallbackFeedback}
    />
  );
}
