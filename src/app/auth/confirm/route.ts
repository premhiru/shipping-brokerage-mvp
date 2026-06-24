import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import { sanitizeRedirectPath } from "@/lib/supabase-auth-config";

function getNextPath(request: NextRequest) {
  const explicitNext = request.nextUrl.searchParams.get("next");
  const redirectTo = request.nextUrl.searchParams.get("redirect_to");

  if (explicitNext) {
    return sanitizeRedirectPath(explicitNext);
  }

  if (redirectTo) {
    try {
      const redirectUrl = new URL(redirectTo, request.url);

      if (redirectUrl.origin === request.nextUrl.origin) {
        return sanitizeRedirectPath(`${redirectUrl.pathname}${redirectUrl.search}`);
      }
    } catch {
      return sanitizeRedirectPath(redirectTo);
    }
  }

  return "/set-password";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const nextPath = getNextPath(request);
  const loginUrl = new URL("/login", request.url);

  if (!tokenHash || !type) {
    loginUrl.searchParams.set("error", "invalid_invite_link");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    loginUrl.searchParams.set("error", "auth_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    loginUrl.searchParams.set("error", "invalid_invite_link");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
