"use client";

import { useActionState } from "react";
import { setPasswordAction, type SetPasswordFormState } from "@/app/set-password/actions";
import { TextInput } from "@/components/ui";

export function SetPasswordForm() {
  const initialState: SetPasswordFormState = {};
  const [state, action, pending] = useActionState(setPasswordAction, initialState);

  return (
    <form action={action} className="mt-6 space-y-4">
      <TextInput
        label="New password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        required
      />
      <TextInput
        label="Confirm password"
        name="confirmPassword"
        type="password"
        placeholder="Re-enter password"
        autoComplete="new-password"
        required
      />
      {state.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Saving password..." : "Set password and continue"}
      </button>
    </form>
  );
}
