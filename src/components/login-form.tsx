"use client";

import { useActionState } from "react";
import { signInWithPasswordAction, type LoginFormState } from "@/app/login/actions";
import { TextInput } from "@/components/ui";

export function LoginForm({
  nextPath,
  authReady,
}: {
  nextPath: string;
  authReady: boolean;
}) {
  const initialState: LoginFormState = {};
  const [state, action, pending] = useActionState(signInWithPasswordAction, initialState);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <TextInput
        label="Email"
        name="email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        defaultValue={state.email}
        required
      />
      <TextInput
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !authReady}
        className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
