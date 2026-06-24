import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthRequestClient } from "@/lib/supabase-auth-proxy";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = cleanString(input.accessToken);
  const refreshToken = cleanString(input.refreshToken);
  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseAuthRequestClient(request, response);

  if (!supabase) {
    return NextResponse.json({ error: "Supabase Auth is not configured." }, { status: 500 });
  }

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Missing auth session tokens." }, { status: 400 });
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return response;
}
