import { jsonError } from "@/lib/supabase-server";
import { updateSupabaseTaskStatus } from "@/lib/supabase-tasks";
import type { TaskAssignment } from "@/lib/types";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTaskStatus(value: unknown): TaskAssignment["status"] | null {
  const status = cleanString(value);

  return status === "open" || status === "done" ? status : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const status = cleanTaskStatus(input.status);

    if (!status) {
      return jsonError("Choose a valid task status.", 400);
    }

    const task = await updateSupabaseTaskStatus({ taskId: id, status });

    if (!task) {
      return jsonError("Task was not found.", 404);
    }

    return Response.json({ task });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update task.", 400);
  }
}
