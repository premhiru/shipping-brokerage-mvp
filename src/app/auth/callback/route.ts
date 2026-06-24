import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import { sanitizeRedirectPath } from "@/lib/supabase-auth-config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = sanitizeRedirectPath(request.nextUrl.searchParams.get("next") ?? "/set-password");
  const loginUrl = new URL("/login", request.url);

  if (!code) {
    loginUrl.searchParams.set("error", "missing_auth_code");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    loginUrl.searchParams.set("error", "auth_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("error", "invalid_invite_link");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
