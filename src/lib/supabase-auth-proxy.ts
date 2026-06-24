import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabaseAuthConfig,
  isProtectedApiPath,
  isProtectedAppPath,
  isPublicPagePath,
} from "@/lib/supabase-auth-config";

export function createSupabaseAuthRequestClient(request: NextRequest, response: NextResponse) {
  const { supabaseUrl, supabaseAuthKey } = getSupabaseAuthConfig();

  if (!supabaseUrl || !supabaseAuthKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAuthKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });

        Object.entries(headersToSet).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });
}

export async function updateAuthSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next({ request });
  const supabase = createSupabaseAuthRequestClient(request, response);

  if (!supabase) {
    if (isProtectedApiPath(pathname)) {
      return Response.json({ error: "Supabase Auth env vars are missing." }, { status: 500 });
    }

    if (isProtectedAppPath(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && isProtectedApiPath(pathname)) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isAuthenticated && !isPublicPagePath(pathname) && isProtectedAppPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
