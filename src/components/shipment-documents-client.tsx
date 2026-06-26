"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentsPanel } from "@/components/shipment-detail";
import { StorageUploadField } from "@/components/storage-upload-field";
import { Card, PageHeader, SelectField, TextArea, TextInput } from "@/components/ui";
import { documentTypes } from "@/lib/demo-data";
import type { AutofillSuggestion } from "@/lib/document-autofill";
import type { StorageUploadResult } from "@/lib/storage";
import type { Shipment } from "@/lib/types";

export function ShipmentDocumentsClient({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [documentId, setDocumentId] = useState(() => `document-${Date.now()}`);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function extractDocumentFields(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/documents/extract", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as {
      suggestions?: AutofillSuggestion[];
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to scan this document.");
    }

    return {
      suggestions: payload.suggestions ?? [],
      message: payload.message ?? "Document scan completed.",
    };
  }

  async function saveUploadedDocument(result: StorageUploadResult, file: File) {
    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();

    setState("saving");
    setMessage(`Scanning ${file.name} and saving it to shipment records...`);

    try {
      let extractedFields: AutofillSuggestion[] = [];
      let extractionMessage = "";

      try {
        const extraction = await extractDocumentFields(file);
        extractedFields = extraction.suggestions;
        extractionMessage = extraction.message;
      } catch (error) {
        extractionMessage = error instanceof Error ? error.message : "Document scan was skipped.";
      }

      const response = await fetch(`/api/shipments/${shipment.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: read("documentType"),
          status: read("documentStatus"),
          uploadedBy: read("uploadedBy"),
          notes: read("notes"),
          upload: {
            path: result.path,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
          },
          extractedFields,
        }),
      });
      const payload = (await response.json()) as {
        document?: {
          status: string;
          reviewSummary?: string;
          reviewFindings?: unknown[];
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save document metadata.");
      }

      formRef.current.reset();
      setDocumentId(`document-${Date.now()}`);
      setState("saved");
      setMessage(
        payload.document?.reviewFindings?.length
          ? `${file.name} uploaded. ${payload.document.reviewSummary}`
          : `${file.name} uploaded and saved to Supabase. ${extractionMessage}`,
      );
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to save document metadata.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title="Document workspace"
        description="Upload, review, approve, reject, and share shipment documentation with the shipping line."
      />
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Upload document</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Choose the document type and review status before uploading. The upload is saved to storage and added to this shipment automatically.
        </p>
        <form ref={formRef} className="mt-5 grid gap-4 md:grid-cols-3">
          <SelectField name="documentType" label="Document type" options={documentTypes} />
          <SelectField
            name="documentStatus"
            label="Initial status"
            options={["uploaded", "processing", "needs_review", "approved", "shared_with_line"]}
          />
          <TextInput name="uploadedBy" label="Uploaded by" defaultValue="Demo Admin" />
          <div className="md:col-span-2">
            <StorageUploadField
              key={documentId}
              shipmentId={shipment.id}
              documentId={documentId}
              onUploaded={(result, file) => void saveUploadedDocument(result, file)}
            />
          </div>
          <div>
            <TextArea
              name="notes"
              label="Review notes"
              placeholder="Optional review note or reason for needs review."
              rows={5}
            />
          </div>
        </form>
        {message && (
          <p className={state === "error" ? "mt-3 text-sm text-rose-700" : "mt-3 text-sm text-emerald-700"}>
            {message}
          </p>
        )}
      </Card>
      <DocumentsPanel shipment={shipment} />
    </div>
  );
}
