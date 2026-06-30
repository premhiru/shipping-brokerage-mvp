import { connection } from "next/server";
import { DashboardClient } from "@/components/dashboard-client";
import { notifications as fallbackNotifications, shipments as fallbackShipments } from "@/lib/demo-data";
import { getSupabaseNotifications } from "@/lib/supabase-notifications";
import { getSupabaseShipments } from "@/lib/supabase-shipments";
import { getSupabaseTaskAssignments } from "@/lib/supabase-tasks";

export default async function DashboardPage() {
  await connection();

  const [shipmentsResult, notificationsResult, tasksResult] = await Promise.allSettled([
    getSupabaseShipments(),
    getSupabaseNotifications(),
    getSupabaseTaskAssignments(),
  ]);
  const shipments = shipmentsResult.status === "fulfilled" ? shipmentsResult.value : null;
  const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value : null;
  const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : null;

  return (
    <DashboardClient
      initialShipments={shipments ?? fallbackShipments}
      initialNotifications={notifications ?? fallbackNotifications}
      initialTasks={tasks ?? []}
    />
  );
}
