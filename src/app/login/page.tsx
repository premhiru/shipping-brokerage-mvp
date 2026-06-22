import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Card, TextInput } from "@/components/ui";
import { demoAccounts } from "@/lib/demo-data";

export default function LoginPage() {
  const storageReady = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

  return (
    <main className="grid min-h-screen bg-zinc-50 px-4 py-8 text-slate-950 lg:grid-cols-[1fr_460px]">
      <section className="flex items-center justify-center p-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">HarborBridge MVP</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Shipping docs, carrier sharing, and B/L tracking in one secure workspace.
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-600">
            This demo login is wired for Supabase email/password auth once project keys are connected. Until then,
            reviewers can enter the dashboard directly.
          </p>
          <Link href="/dashboard" className="mt-8 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Continue to demo dashboard
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
                {storageReady ? "Server storage configured" : "Demo mode, server storage not connected"}
              </p>
            </div>
          </div>
          <form className="mt-6 space-y-4">
            <TextInput label="Email" type="email" placeholder="admin@harborbridge.demo" />
            <TextInput label="Password" type="password" placeholder="DemoAdmin123!" />
            <button type="button" className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Sign in
            </button>
          </form>
          <div className="mt-6 rounded-lg bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Demo accounts</p>
            <div className="mt-3 space-y-3">
              {demoAccounts.map((account) => (
                <div key={account.role} className="text-sm">
                  <p className="font-medium text-slate-950">{account.role}</p>
                  <p className="text-zinc-600">{account.email}</p>
                  <p className="text-zinc-500">{account.password}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
