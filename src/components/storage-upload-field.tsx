"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { uploadShipmentDocument, type StorageUploadResult } from "@/lib/storage";
import { cn } from "@/lib/format";

type UploadState = "idle" | "ready" | "uploading" | "uploaded" | "error";

export function StorageUploadField({
  shipmentId,
  documentId,
  label = "Upload file",
  shareToken,
  onUploaded,
}: {
  shipmentId: string;
  documentId: string;
  label?: string;
  shareToken?: string;
  onUploaded?: (result: StorageUploadResult, file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState("Choose a PDF, image, spreadsheet, or document.");
  const [signedUrl, setSignedUrl] = useState<string | undefined>();

  async function handleUpload() {
    if (!file) {
      setState("error");
      setMessage("Choose a file before uploading.");
      return;
    }

    setState("uploading");
    setMessage(`Uploading ${file.name} through the app server...`);

    try {
      const result = await uploadShipmentDocument({
        file,
        shipmentId,
        documentId,
        shareToken,
      });

      setSignedUrl(result.signedUrl);
      setState("uploaded");
      setMessage(`Uploaded to ${result.path}`);
      onUploaded?.(result, file);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <div>
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-1 rounded-md border border-zinc-300 bg-white p-3">
        <input
          type="file"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setFile(nextFile);
            setSignedUrl(undefined);
            setState(nextFile ? "ready" : "idle");
            setMessage(nextFile ? `${nextFile.name} ready to upload.` : "Choose a PDF, image, spreadsheet, or document.");
          }}
          className="w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-zinc-200"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={cn(
              "text-xs leading-5",
              state === "uploaded" && "text-emerald-700",
              state === "error" && "text-rose-700",
              !["uploaded", "error"].includes(state) && "text-zinc-500",
            )}
          >
            {message}
          </p>
          <button
            type="button"
            onClick={handleUpload}
            disabled={state === "uploading"}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {state === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            Upload
          </button>
        </div>
        {state === "uploaded" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Secure upload complete
            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noreferrer" className="ml-auto underline">
                Signed preview
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
