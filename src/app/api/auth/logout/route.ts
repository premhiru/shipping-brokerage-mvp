import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAuthRequestClient } from "@/lib/supabase-auth-proxy";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseAuthRequestClient(request, response);

  if (supabase) {
    await supabase.auth.signOut();
  }

  return response;
}
