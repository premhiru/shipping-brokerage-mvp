import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthRequestClient } from "@/lib/supabase-auth-proxy";
import {
  buildShipmentDocumentPath,
  DEMO_COMPANY_ID,
  SHIPMENT_DOCUMENTS_BUCKET,
  type StorageUploadResult,
} from "@/lib/storage";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function getSupabaseServerConfig() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  return {
    supabaseUrl,
    supabaseSecretKey,
  };
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function isAuthenticatedUpload(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseAuthRequestClient(request, response);

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.auth.getClaims();

  return !error && Boolean(data?.claims?.sub);
}

async function isValidCarrierUpload({
  supabaseUrl,
  supabaseSecretKey,
  shipmentId,
  shareToken,
}: {
  supabaseUrl: string;
  supabaseSecretKey: string;
  shipmentId: string;
  shareToken: string;
}) {
  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const tokenHash = createHash("sha256").update(shareToken).digest("hex");
  const { data, error } = await supabase
    .from("share_links")
    .select("id")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("shipment_id", shipmentId)
    .or(`token_hash.eq.${tokenHash},public_token.eq.${shareToken}`)
    .eq("can_upload_documents", true)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, supabaseSecretKey } = getSupabaseServerConfig();

  if (!supabaseUrl || !supabaseSecretKey) {
    return jsonError(
      "Supabase server env vars are missing. Add SUPABASE_URL and SUPABASE_SECRET_KEY.",
      500,
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const shipmentId = formData.get("shipmentId");
  const documentId = formData.get("documentId");
  const shareToken = formData.get("shareToken");

  if (!(file instanceof File)) {
    return jsonError("Missing file upload.", 400);
  }

  if (typeof shipmentId !== "string" || !shipmentId.trim()) {
    return jsonError("Missing shipmentId.", 400);
  }

  if (typeof documentId !== "string" || !documentId.trim()) {
    return jsonError("Missing documentId.", 400);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError("File is too large. Maximum upload size is 25 MB.", 413);
  }

  const hasInternalSession = await isAuthenticatedUpload(request);
  const hasCarrierToken =
    typeof shareToken === "string" &&
    shareToken.trim() &&
    (await isValidCarrierUpload({
      supabaseUrl,
      supabaseSecretKey,
      shipmentId,
      shareToken: shareToken.trim(),
    }));

  if (!hasInternalSession && !hasCarrierToken) {
    return jsonError("Authentication or a valid carrier share link is required for uploads.", 401);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const path = buildShipmentDocumentPath({
    shipmentId,
    documentId,
    fileName: file.name,
  });

  const { error } = await supabase.storage.from(SHIPMENT_DOCUMENTS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return jsonError(error.message, 500);
  }

  const { data: signedUrlData } = await supabase.storage
    .from(SHIPMENT_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  const result: StorageUploadResult = {
    path,
    signedUrl: signedUrlData?.signedUrl,
  };

  return Response.json(result);
}
