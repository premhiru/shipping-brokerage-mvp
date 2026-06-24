import { createHash, randomUUID } from "crypto";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";

export const runtime = "nodejs";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanBoolean(value: unknown) {
  return value === true || value === "true";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const recipientCompany = cleanString(input.recipientCompany);
    const recipientName = cleanString(input.recipientName);
    const recipientEmail = cleanString(input.recipientEmail);
    const expiryDate = cleanString(input.expiryDate);
    const canComment = cleanBoolean(input.canComment);
    const canUploadDocuments = cleanBoolean(input.canUploadDocuments);
    const canUpdateStatus = cleanBoolean(input.canUpdateStatus);

    if (!recipientCompany || !recipientName) {
      return jsonError("Recipient company and name are required.", 400);
    }

    const token = `carrier-${randomUUID()}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = expiryDate
      ? new Date(`${expiryDate}T23:59:59.000Z`).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("share_links").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      token_hash: tokenHash,
      recipient_company: recipientCompany,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      can_comment: canComment,
      can_upload_documents: canUploadDocuments,
      can_update_status: canUpdateStatus,
      expires_at: expiresAt,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { error: shipmentUpdateError } = await supabase
      .from("shipments")
      .update({
        status: "shared_with_line",
        document_status: "shared_with_line",
        next_action: `Awaiting carrier update from ${recipientCompany}.`,
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", id);

    if (shipmentUpdateError) {
      throw new Error(shipmentUpdateError.message);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      actor_name: "Demo Admin",
      actor_role: "admin",
      action: "share_link_created",
      metadata: { recipientCompany, recipientName, recipientEmail, expiresAt },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return Response.json({
      shareLink: {
        token,
        url: `/line/share/${token}`,
        expiresAt,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate share link.", 400);
  }
}
