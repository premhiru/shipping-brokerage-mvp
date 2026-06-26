import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthRequestClient } from "@/lib/supabase-auth-proxy";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import {
  DEMO_COMPANY_ID,
  displayFileNameFromPath,
  SHIPMENT_DOCUMENTS_BUCKET,
} from "@/lib/storage";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 5 * 60;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function hasInternalSession(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseAuthRequestClient(request, response);

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.auth.getClaims();

  return !error && Boolean(data?.claims?.sub);
}

async function hasCarrierAccess({
  shipmentId,
  shareToken,
}: {
  shipmentId: string;
  shareToken: string;
}) {
  const supabase = createSupabaseServerClient();

  if (!supabase || !shareToken) {
    return false;
  }

  const tokenHash = createHash("sha256").update(shareToken).digest("hex");
  const { data, error } = await supabase
    .from("share_links")
    .select("id")
    .eq("company_id", DEMO_COMPANY_ID)
    .eq("shipment_id", shipmentId)
    .or(`token_hash.eq.${tokenHash},public_token.eq.${shareToken}`)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function storagePathBelongsToShipment({
  shipmentId,
  storagePath,
}: {
  shipmentId: string;
  storagePath: string;
}) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase server env vars are missing.");
  }

  const [documentResult, commentResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("shipment_id", shipmentId)
      .eq("storage_path", storagePath)
      .maybeSingle(),
    supabase
      .from("comments")
      .select("id")
      .eq("company_id", DEMO_COMPANY_ID)
      .eq("shipment_id", shipmentId)
      .eq("attachment_storage_path", storagePath)
      .maybeSingle(),
  ]);

  if (documentResult.error) {
    throw new Error(documentResult.error.message);
  }

  if (commentResult.error) {
    throw new Error(commentResult.error.message);
  }

  return Boolean(documentResult.data?.id || commentResult.data?.id);
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as Record<string, unknown>;
    const shipmentId = cleanString(input.shipmentId);
    const storagePath = cleanString(input.storagePath);
    const shareToken = cleanString(input.shareToken);
    const fileName = cleanString(input.fileName) || displayFileNameFromPath(storagePath);
    const mode = cleanString(input.mode);

    if (!shipmentId) {
      return jsonError("Missing shipmentId.", 400);
    }

    if (!storagePath) {
      return jsonError("Missing storagePath.", 400);
    }

    const canAccess = (await hasInternalSession(request)) || (await hasCarrierAccess({ shipmentId, shareToken }));

    if (!canAccess) {
      return jsonError("Authentication or a valid carrier share link is required.", 401);
    }

    const pathIsAllowed = await storagePathBelongsToShipment({ shipmentId, storagePath });

    if (!pathIsAllowed) {
      return jsonError("File does not belong to this shipment.", 403);
    }

    const { supabaseUrl, supabaseSecretKey } = {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    };

    if (!supabaseUrl || !supabaseSecretKey) {
      return jsonError("Supabase server env vars are missing.", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.storage
      .from(SHIPMENT_DOCUMENTS_BUCKET)
      .createSignedUrl(
        storagePath,
        SIGNED_URL_TTL_SECONDS,
        mode === "download" ? { download: fileName } : undefined,
      );

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json({
      signedUrl: data.signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create signed URL.", 400);
  }
}
