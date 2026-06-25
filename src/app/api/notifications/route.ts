import {
  getSupabaseNotifications,
  updateAllSupabaseNotificationsReadState,
} from "@/lib/supabase-notifications";
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

export async function PATCH(request: Request) {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    const isRead = Boolean(input.isRead);
    const notifications = await updateAllSupabaseNotificationsReadState(isRead);

    return Response.json({ notifications: notifications ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update notifications.", 400);
  }
}
