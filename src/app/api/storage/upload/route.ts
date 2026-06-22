import { createClient } from "@supabase/supabase-js";
import {
  buildShipmentDocumentPath,
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

export async function POST(request: Request) {
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
