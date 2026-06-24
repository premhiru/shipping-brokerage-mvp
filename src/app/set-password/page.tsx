import { LockKeyhole } from "lucide-react";
import { SetPasswordForm } from "@/components/set-password-form";
import { Card } from "@/components/ui";
import { requireCurrentUser } from "@/lib/supabase-auth-server";

export default async function SetPasswordPage() {
  const user = await requireCurrentUser("/set-password");

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4 py-8 text-slate-950">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Set your password</h1>
            <p className="text-sm text-zinc-600">{user.email}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-zinc-600">
          Your invitation has been verified. Create a password to finish setting up your HarborBridge account.
        </p>
        <SetPasswordForm />
      </Card>
    </main>
  );
}
