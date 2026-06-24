import { getSupabaseNotifications } from "@/lib/supabase-notifications";
import { jsonError } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const notifications = await getSupabaseNotifications();

    return Response.json({ notifications: notifications ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load notifications.", 400);
  }
}
