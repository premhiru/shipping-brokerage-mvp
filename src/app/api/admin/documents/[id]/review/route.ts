import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const decision = cleanString(input.decision);
    const rejectionReason = cleanString(input.rejectionReason);

    if (!["approve", "reject"].includes(decision)) {
      return jsonError("Decision must be approve or reject.", 400);
    }

    const { data: document, error: loadError } = await supabase
      .from("documents")
      .select("id, shipment_id, document_type, file_name")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id)
      .single();

    if (loadError) {
      throw new Error(loadError.message);
    }

    const status = decision === "approve" ? "approved" : "rejected";

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status,
        rejection_reason: decision === "reject" ? rejectionReason || "Rejected by admin." : null,
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { data: remainingNeedsReview, error: remainingError } = await supabase
      .from("documents")
      .select("id")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("shipment_id", document.shipment_id)
      .in("status", ["needs_review", "rejected"]);

    if (remainingError) {
      throw new Error(remainingError.message);
    }

    const shipmentDocumentStatus =
      decision === "reject" ? "needs_review" : remainingNeedsReview.length === 0 ? "approved" : "needs_review";

    await supabase
      .from("shipments")
      .update({
        document_status: shipmentDocumentStatus,
        next_action:
          decision === "reject"
            ? "Resolve rejected document review comments."
            : "Continue shipment workflow after document approval.",
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", document.shipment_id);

    await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: document.shipment_id,
      actor_name: "Demo Admin",
      actor_role: "admin",
      action: decision === "approve" ? "document_approved" : "document_rejected",
      metadata: {
        documentId: document.id,
        documentType: document.document_type,
        fileName: document.file_name,
        rejectionReason: decision === "reject" ? rejectionReason : null,
      },
    });

    return Response.json({ ok: true, status });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to review document.", 400);
  }
}
