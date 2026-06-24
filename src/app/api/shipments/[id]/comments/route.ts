import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { DEMO_COMPANY_ID } from "@/lib/storage";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

const roles = new Set(["admin", "shipper", "shipping_line_guest"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return jsonError("Supabase server env vars are missing.", 500);
  }

  try {
    const { id } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const userName = cleanString(input.userName) || "Demo Admin";
    const role = roles.has(cleanString(input.role)) ? (cleanString(input.role) as UserRole) : "admin";
    const message = cleanString(input.message);
    const attachmentStoragePath = cleanString(input.attachmentStoragePath);
    const attachmentFileName = cleanString(input.attachmentFileName);

    if (!message) {
      return jsonError("Message is required.", 400);
    }

    const { error } = await supabase.from("comments").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      user_name: userName,
      user_role: role,
      message,
      attachment_storage_path: attachmentStoragePath || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      company_id: DEMO_COMPANY_ID,
      shipment_id: id,
      actor_name: userName,
      actor_role: role,
      action: "comment_added",
      metadata: {
        messagePreview: message.slice(0, 120),
        attachmentStoragePath: attachmentStoragePath || null,
        attachmentFileName: attachmentFileName || null,
      },
    });

    if (auditError) {
      throw new Error(auditError.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to post comment.", 400);
  }
}
