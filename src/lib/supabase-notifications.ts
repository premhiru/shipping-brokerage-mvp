import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { Notification } from "@/lib/types";

type SupabaseNotificationRow = {
  id: string;
  shipment_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  shipments?: {
    shipment_reference: string | null;
  } | {
    shipment_reference: string | null;
  }[] | null;
};

function getShipmentReference(row: SupabaseNotificationRow) {
  const shipment = Array.isArray(row.shipments) ? row.shipments[0] : row.shipments;

  return shipment?.shipment_reference ?? undefined;
}

export async function createShipmentNotification({
  shipmentId,
  title,
  message,
}: {
  shipmentId: string;
  title: string;
  message: string;
}) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("notifications").insert({
    company_id: DEMO_COMPANY_ID,
    shipment_id: shipmentId,
    title,
    message,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getSupabaseNotifications() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, shipment_id, title, message, is_read, created_at, shipments(shipment_reference)")
    .eq("company_id", DEMO_COMPANY_ID)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as SupabaseNotificationRow[]).map((row): Notification => ({
    id: row.id,
    title: row.title,
    message: row.message,
    shipmentId: row.shipment_id ?? undefined,
    shipmentReference: getShipmentReference(row),
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}
