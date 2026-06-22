import { getSupabaseFeedback } from "@/lib/supabase-feedback";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { FeedbackStatus, Priority } from "@/lib/types";

export const runtime = "nodejs";

const priorities = new Set(["low", "medium", "high"]);
const statuses = new Set(["open", "reviewed", "resolved"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const feedback = await getSupabaseFeedback();

    if (!feedback) {
      return jsonError("Supabase server env vars are missing.", 500);
    }

    return Response.json({ feedback }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load feedback.", 500);
  }
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const input = (await request.json()) as Record<string, unknown>;
    const pageOrFeature = cleanString(input.pageOrFeature);
    const comment = cleanString(input.comment);
    const submittedBy = cleanString(input.submittedBy) || "Client Reviewer";
    const priority = priorities.has(cleanString(input.priority))
      ? (cleanString(input.priority) as Priority)
      : "medium";
    const status = statuses.has(cleanString(input.status))
      ? (cleanString(input.status) as FeedbackStatus)
      : "open";

    if (!pageOrFeature || !comment) {
      return jsonError("Page or feature and comment are required.", 400);
    }

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        company_id: DEMO_COMPANY_ID,
        submitted_by_name: submittedBy,
        page_or_feature: pageOrFeature,
        comment,
        priority,
        status,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ feedback: { id: data.id } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to submit feedback.", 400);
  }
}
