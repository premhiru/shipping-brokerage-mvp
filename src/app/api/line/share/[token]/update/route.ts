import { createHash } from "crypto";
import { documentLabelToValue } from "@/lib/document-types";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";

export const runtime = "nodejs";

const statusToShipmentStatus: Record<string, string> = {
  "Booking confirmed": "booking_confirmed",
  "Draft B/L issued": "booking_confirmed",
  "Loaded on vessel": "in_transit",
  "Vessel sailed": "in_transit",
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { token } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const uploadType = cleanString(input.uploadType) || "Other";
    const statusUpdate = cleanString(input.statusUpdate) || "Booking confirmed";
    const notes = cleanString(input.notes) || "Carrier submitted an update.";
    const upload = input.upload && typeof input.upload === "object"
      ? (input.upload as Record<string, unknown>)
      : {};
    const fileName = cleanString(upload.fileName) || cleanString(input.fileName);
    const storagePath = cleanString(upload.path);
    const mimeType = cleanString(upload.mimeType) || null;
    const fileSize = cleanNumber(upload.size);

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { data: shareLink, error: shareError } = await supabase
      .from("share_links")
      .select("shipment_id, recipient_company, recipient_name, can_comment, can_upload_documents, can_update_status")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (shareError) {
      throw new Error(shareError.message);
    }

    if (!shareLink.can_update_status) {
      return jsonError("This share link cannot update shipment status.", 403);
    }

    const shipmentId = shareLink.shipment_id as string;
    const recipientName = (shareLink.recipient_name as string | null) ?? "Carrier contact";
    const recipientCompany = (shareLink.recipient_company as string | null) ?? "Carrier";

    const { error: eventError } = await supabase.from("shipment_events").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      milestone: statusUpdate,
      status: "completed",
      event_timestamp: new Date().toISOString(),
      responsible_party: recipientCompany,
      notes,
      source: "shipping_line_guest",
    });

    if (eventError) {
      throw new Error(eventError.message);
    }

    const nextShipmentStatus = statusToShipmentStatus[statusUpdate] ?? "shared_with_line";

    const { error: shipmentUpdateError } = await supabase
      .from("shipments")
      .update({
        status: nextShipmentStatus,
        next_action: notes,
      })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("id", shipmentId);

    if (shipmentUpdateError) {
      throw new Error(shipmentUpdateError.message);
    }

    if (storagePath && !shareLink.can_upload_documents) {
      return jsonError("This share link cannot upload documents.", 403);
    }

    if (storagePath && fileName) {
      const { error: documentError } = await supabase.from("documents").insert({
        company_id: DEMO_COMPANY_ID,
        shipment_id: shipmentId,
        document_type: documentLabelToValue(uploadType),
        file_name: fileName,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        uploaded_by_name: recipientName,
        uploaded_at: new Date().toISOString(),
        status: "uploaded",
      });

      if (documentError) {
        throw new Error(documentError.message);
      }
    }

    if (shareLink.can_comment) {
      const { error: commentError } = await supabase.from("comments").insert({
        company_id: DEMO_COMPANY_ID,
        shipment_id: shipmentId,
        user_name: recipientName,
        user_role: "shipping_line_guest",
        message: `${statusUpdate}: ${notes}`,
      });

      if (commentError) {
        throw new Error(commentError.message);
      }
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: shipmentId,
      actor_name: recipientName,
      actor_role: "shipping_line_guest",
      action: "carrier_update_submitted",
      metadata: { statusUpdate, uploadType, fileName, storagePath, notes },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    const { error: shareLinkUpdateError } = await supabase
      .from("share_links")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("token_hash", tokenHash);

    if (shareLinkUpdateError) {
      throw new Error(shareLinkUpdateError.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to submit carrier update.", 400);
  }
}
