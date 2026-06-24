"use client";

import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { displayFileNameFromPath } from "@/lib/storage";
import { cn } from "@/lib/format";

type FileActionMode = "preview" | "download";

export function DocumentFileActions({
  shipmentId,
  storagePath,
  fileName,
  shareToken,
  compact = false,
}: {
  shipmentId: string;
  storagePath?: string;
  fileName?: string;
  shareToken?: string;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<FileActionMode | null>(null);
  const [error, setError] = useState("");

  async function openSignedUrl(mode: FileActionMode) {
    if (!storagePath) {
      setError("No file in storage.");
      return;
    }

    setPending(mode);
    setError("");

    try {
      const response = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentId,
          storagePath,
          fileName: fileName || displayFileNameFromPath(storagePath),
          shareToken,
          mode,
        }),
      });
      const payload = (await response.json()) as { signedUrl?: string; error?: string };

      if (!response.ok || !payload.signedUrl) {
        throw new Error(payload.error || "Unable to create a signed file link.");
      }

      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to open file.");
    } finally {
      setPending(null);
    }
  }

  if (!storagePath) {
    return <span className="text-xs font-medium text-zinc-400">No file in storage</span>;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      <button
        type="button"
        onClick={() => void openSignedUrl("preview")}
        disabled={Boolean(pending)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {pending === "preview" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
        Preview
      </button>
      <button
        type="button"
        onClick={() => void openSignedUrl("download")}
        disabled={Boolean(pending)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        {pending === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download
      </button>
      {error && <span className="basis-full text-xs font-medium text-rose-700">{error}</span>}
    </div>
  );
}
