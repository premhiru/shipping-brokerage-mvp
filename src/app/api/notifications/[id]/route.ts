import { updateSupabaseNotificationReadState } from "@/lib/supabase-notifications";
import { jsonError } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const isRead = Boolean(input.isRead);
    const notification = await updateSupabaseNotificationReadState({ notificationId: id, isRead });

    if (!notification) {
      return jsonError("Notification was not found.", 404);
    }

    return Response.json({ notification });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update notification.", 400);
  }
}
