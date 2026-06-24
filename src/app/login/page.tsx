import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { isSupabaseAuthConfigured, sanitizeRedirectPath } from "@/lib/supabase-auth-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextPath = sanitizeRedirectPath(params?.next);
  const authReady = isSupabaseAuthConfigured();
  const authError = (() => {
    switch (params?.error) {
      case "invalid_invite_link":
        return "This invitation link is invalid or expired. Please ask an admin to send a new invite.";
      case "missing_auth_code":
        return "The sign-in link is missing its verification code. Please open the latest invite email.";
      case "auth_not_configured":
        return "Supabase Auth is not configured for this deployment.";
      default:
        return "";
    }
  })();

  return (
    <main className="grid min-h-screen bg-zinc-50 px-4 py-8 text-slate-950 lg:grid-cols-[1fr_460px]">
      <section className="flex items-center justify-center p-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">HarborBridge MVP</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Shipping docs, carrier sharing, and B/L tracking in one secure workspace.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-600">
            Sign in with your HarborBridge operations account to manage shipments, documents, comments, carrier
            updates, and workflow status.
          </p>
          <Link
            href="/line/share/demo-share-electronics"
            className="mt-8 inline-flex rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            View carrier portal
          </Link>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Sign in</h2>
              <p className="text-sm text-zinc-600">
                {authReady ? "Email/password auth enabled" : "Supabase Auth env vars missing"}
              </p>
            </div>
          </div>
          {authError && (
            <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {authError}
            </p>
          )}
          <LoginForm nextPath={nextPath} authReady={authReady} />
          <div className="mt-6 rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
            Access is controlled in Supabase Auth. Create or invite internal users from the Supabase dashboard,
            then they can sign in here with email and password.
          </div>
        </Card>
      </section>
    </main>
  );
}
