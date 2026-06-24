"use client";

import { useEffect } from "react";

function redirectWithoutHash(path: string) {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  window.location.assign(path);
}

export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const error = params.get("error") || params.get("error_code");

    if (error) {
      redirectWithoutHash("/login?error=invalid_invite_link");
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    const type = params.get("type");
    const nextPath = type === "invite" || type === "recovery" ? "/set-password" : "/dashboard";

    void fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
    }).then((response) => {
      redirectWithoutHash(response.ok ? nextPath : "/login?error=invalid_invite_link");
    });
  }, []);

  return null;
}
