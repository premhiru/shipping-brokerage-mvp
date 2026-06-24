import { getSupabaseTaskAssignments } from "@/lib/supabase-tasks";
import { jsonError } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shipmentId = url.searchParams.get("shipmentId") ?? undefined;
    const tasks = await getSupabaseTaskAssignments({ shipmentId });

    return Response.json({ tasks: tasks ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load tasks.", 400);
  }
}
