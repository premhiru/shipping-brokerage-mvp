import { createSupabaseServerClient } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { FeedbackItem, FeedbackStatus, Priority } from "@/lib/types";

type SupabaseFeedbackRow = {
  id: string;
  submitted_by_name: string | null;
  page_or_feature: string;
  comment: string;
  priority: Priority;
  status: FeedbackStatus;
  created_at: string;
};

export function mapSupabaseFeedback(row: SupabaseFeedbackRow): FeedbackItem {
  return {
    id: row.id,
    submittedBy: row.submitted_by_name ?? "Client Reviewer",
    pageOrFeature: row.page_or_feature,
    comment: row.comment,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getSupabaseFeedback() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("feedback")
    .select("id, submitted_by_name, page_or_feature, comment, priority, status, created_at")
    .eq("company_id", DEMO_COMPANY_ID)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as SupabaseFeedbackRow[]).map(mapSupabaseFeedback);
}
