export function getSupabaseAuthConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAuthKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  return {
    supabaseUrl,
    supabaseAuthKey,
  };
}

export function isSupabaseAuthConfigured() {
  const { supabaseUrl, supabaseAuthKey } = getSupabaseAuthConfig();

  return Boolean(supabaseUrl && supabaseAuthKey);
}

export function sanitizeRedirectPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  if (value.startsWith("/login")) {
    return "/dashboard";
  }

  return value;
}

export function isPublicPagePath(pathname: string) {
  return pathname === "/" || pathname === "/login" || pathname.startsWith("/line/share/");
}

export function isProtectedAppPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/feedback" ||
    pathname === "/admin" ||
    pathname === "/shipments" ||
    pathname.startsWith("/shipments/")
  );
}

export function isPublicApiPath(pathname: string) {
  return pathname.startsWith("/api/auth/") || pathname.startsWith("/api/line/share/");
}

export function isMixedAccessApiPath(pathname: string) {
  return pathname === "/api/storage/upload" || pathname === "/api/storage/signed-url";
}

export function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api/") && !isPublicApiPath(pathname) && !isMixedAccessApiPath(pathname);
}
