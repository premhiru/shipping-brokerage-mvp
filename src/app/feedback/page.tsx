import { FeedbackClient } from "@/components/feedback-client";
import { feedback as fallbackFeedback } from "@/lib/demo-data";
import { getSupabaseFeedback } from "@/lib/supabase-feedback";

export default async function FeedbackPage() {
  const feedback = await getSupabaseFeedback();

  return <FeedbackClient feedback={feedback ?? fallbackFeedback} />;
}
