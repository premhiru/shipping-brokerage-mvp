"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { StorageUploadField } from "@/components/storage-upload-field";
import { Card, SelectField, TextArea, TextInput } from "@/components/ui";
import { documentTypes } from "@/lib/demo-data";
import { documentLabelToValue } from "@/lib/document-types";
import { DEFAULT_SHIPMENT_REFERENCE, nextShipmentReference } from "@/lib/shipment-reference";
import type { AutofillField, AutofillSuggestion } from "@/lib/document-autofill";

type SaveState = "idle" | "saving" | "draft" | "created" | "error";
type ReferenceState = "loading" | "ready" | "fallback";
type AutofillState = "idle" | "extracting" | "ready" | "unsupported" | "error";

type UploadedDocumentState = {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export function CreateShipmentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [referenceState, setReferenceState] = useState<ReferenceState>("loading");
  const [shipmentReference, setShipmentReference] = useState(DEFAULT_SHIPMENT_REFERENCE);
  const [createdShipment, setCreatedShipment] = useState<{ id: string; reference: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [documentRows, setDocumentRows] = useState(["document-row-1"]);
  const [documentUploads, setDocumentUploads] = useState<Record<string, UploadedDocumentState>>({});
  const [autofillState, setAutofillState] = useState<AutofillState>("idle");
  const [autofillMessage, setAutofillMessage] = useState("");
  const [autofillSuggestions, setAutofillSuggestions] = useState<AutofillSuggestion[]>([]);
  const [selectedAutofillFields, setSelectedAutofillFields] = useState<Partial<Record<AutofillField, boolean>>>({});
  const [appliedAutofillFields, setAppliedAutofillFields] = useState<AutofillField[]>([]);
  const [length, setLength] = useState("120");
  const [width, setWidth] = useState("100");
  const [height, setHeight] = useState("140");
  const [packages, setPackages] = useState("10");

  const cbm = useMemo(() => {
    const l = Number(length);
    const w = Number(width);
    const h = Number(height);
    const p = Number(packages);

    if ([l, w, h, p].some((value) => Number.isNaN(value) || value <= 0)) {
      return "0.000";
    }

    return (((l * w * h) / 1_000_000) * p).toFixed(3);
  }, [height, length, packages, width]);

  useEffect(() => {
    let cancelled = false;

    async function loadNextReference() {
      try {
        const response = await fetch("/api/shipments", { cache: "no-store" });
        const payload = (await response.json()) as {
          nextReference?: string;
          shipments?: { reference: string }[];
        };

        if (!response.ok) {
          throw new Error("Unable to load latest shipment reference.");
        }

        const nextReference =
          payload.nextReference || nextShipmentReference((payload.shipments ?? []).map((shipment) => shipment.reference));

        if (!cancelled) {
          setShipmentReference(nextReference);
          setReferenceState("ready");
        }
      } catch {
        if (!cancelled) {
          setReferenceState("fallback");
        }
      }
    }

    void loadNextReference();

    return () => {
      cancelled = true;
    };
  }, []);

  function mergeAutofillSuggestions(nextSuggestions: AutofillSuggestion[]) {
    setAutofillSuggestions((currentSuggestions) => {
      const merged = new Map<AutofillField, AutofillSuggestion>();

      for (const suggestion of currentSuggestions) {
        merged.set(suggestion.field, suggestion);
      }

      for (const suggestion of nextSuggestions) {
        if (!merged.has(suggestion.field)) {
          merged.set(suggestion.field, suggestion);
        }
      }

      return Array.from(merged.values());
    });

    setSelectedAutofillFields((currentSelection) => {
      const nextSelection = { ...currentSelection };

      for (const suggestion of nextSuggestions) {
        if (nextSelection[suggestion.field] === undefined) {
          nextSelection[suggestion.field] = true;
        }
      }

      return nextSelection;
    });
  }

  async function extractAutofillSuggestions(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    setAutofillState("extracting");
    setAutofillMessage(`Scanning ${file.name} for shipment fields...`);

    try {
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

      const suggestions = payload.suggestions ?? [];

      if (suggestions.length > 0) {
        mergeAutofillSuggestions(suggestions);
        setAutofillState("ready");
      } else {
        const message = payload.message ?? "";
        setAutofillState(
          message.includes("PDF") || message.includes("OCR") || message.includes("not supported")
            ? "unsupported"
            : "ready",
        );
      }

      setAutofillMessage(`${file.name}: ${payload.message || "Scan completed."}`);
    } catch (error) {
      setAutofillState("error");
      setAutofillMessage(error instanceof Error ? error.message : "Unable to scan this document.");
    }
  }

  async function handleDocumentUploaded(
    rowId: string,
    result: { path: string; signedUrl?: string },
    file: File,
  ) {
    setDocumentUploads((uploads) => ({
      ...uploads,
      [rowId]: {
        path: result.path,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
    }));

    await extractAutofillSuggestions(file);
  }

  function setFormElementValue(name: string, value: string) {
    const element = formRef.current?.elements.namedItem(name);

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function applyAutofillSuggestions() {
    const suggestionsToApply = autofillSuggestions.filter(
      (suggestion) => selectedAutofillFields[suggestion.field] !== false,
    );

    for (const suggestion of suggestionsToApply) {
      if (suggestion.field === "packageCount") {
        setPackages(suggestion.value);
      } else if (suggestion.field === "lengthCm") {
        setLength(suggestion.value);
      } else if (suggestion.field === "widthCm") {
        setWidth(suggestion.value);
      } else if (suggestion.field === "heightCm") {
        setHeight(suggestion.value);
      } else {
        setFormElementValue(suggestion.field, suggestion.value);
      }
    }

    setAppliedAutofillFields(suggestionsToApply.map((suggestion) => suggestion.field));
    setAutofillMessage(
      suggestionsToApply.length > 0
        ? `Applied ${suggestionsToApply.length} reviewed field${suggestionsToApply.length === 1 ? "" : "s"}.`
        : "No autofill suggestions are selected.",
    );
  }

  function clearAutofillSuggestions() {
    setAutofillSuggestions([]);
    setSelectedAutofillFields({});
    setAppliedAutofillFields([]);
    setAutofillState("idle");
    setAutofillMessage("");
  }

  async function submitShipment(intent: "draft" | "created") {
    if (!formRef.current || saveState === "saving") {
      return;
    }

    const formData = new FormData(formRef.current);
    const read = (name: string) => String(formData.get(name) ?? "").trim();
    const readNumber = (name: string) => {
      const parsed = Number(read(name));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const documents = documentRows.map((rowId) => ({
      rowId,
      documentType: documentLabelToValue(read(`documentType:${rowId}`)),
      status: read(`documentStatus:${rowId}`) || "uploaded",
      uploadedBy: read(`uploadedBy:${rowId}`) || "Demo Admin",
      notes: read(`documentNotes:${rowId}`),
      upload: documentUploads[rowId],
    }));
    const appliedAutofillSources = Array.from(
      new Set(
        autofillSuggestions
          .filter((suggestion) => appliedAutofillFields.includes(suggestion.field))
          .map((suggestion) => suggestion.sourceFileName),
      ),
    );

    setSaveState("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent,
          shipmentReference: read("shipmentReference"),
          carrier: read("carrier"),
          bookingNumber: read("bookingNumber"),
          shipperName: read("shipperName"),
          consigneeName: read("consigneeName"),
          notifyParty: read("notifyParty"),
          cargoDescription: read("cargoDescription"),
          itemType: read("itemType"),
          hsCode: read("hsCode"),
          packageCount: readNumber("packageCount"),
          lengthCm: readNumber("lengthCm"),
          widthCm: readNumber("widthCm"),
          heightCm: readNumber("heightCm"),
          grossWeightKg: readNumber("grossWeightKg"),
          netWeightKg: readNumber("netWeightKg"),
          volumeCbm: Number(cbm),
          incoterm: read("incoterm"),
          origin: read("origin"),
          destination: read("destination"),
          containerType: read("containerType"),
          pol: read("pol"),
          pod: read("pod"),
          preferredEtd: read("preferredEtd"),
          preferredEta: read("preferredEta"),
          blNumber: read("blNumber"),
          containerNumber: read("containerNumber"),
          notes: read("notes"),
          documents,
          autofill: {
            appliedFields: appliedAutofillFields,
            sourceFiles: appliedAutofillSources,
          },
        }),
      });

      const payload = (await response.json()) as {
        shipment?: { id: string; reference: string };
        error?: string;
      };

      if (!response.ok || !payload.shipment) {
        throw new Error(payload.error || "Unable to create shipment.");
      }

      setCreatedShipment(payload.shipment);
      setSaveState(intent);
      window.dispatchEvent(new Event("harborbridge:shipments-changed"));
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create shipment.");
      setSaveState("error");
    }
  }

  function removeDocumentRow(rowId: string) {
    const removedFileName = documentUploads[rowId]?.fileName;

    setDocumentRows((rows) => rows.filter((id) => id !== rowId));
    setDocumentUploads((uploads) => {
      const nextUploads = { ...uploads };
      delete nextUploads[rowId];
      return nextUploads;
    });

    if (removedFileName) {
      setAutofillSuggestions((suggestions) =>
        suggestions.filter((suggestion) => suggestion.sourceFileName !== removedFileName),
      );
    }
  }

  function renderInitialDocumentsCard() {
    return (
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Initial Documents</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Upload source documents first so the form can suggest shipment fields before manual entry.
            </p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            Supabase Storage ready
          </span>
        </div>

        {(autofillState !== "idle" || autofillSuggestions.length > 0) && (
          <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-700" />
                  <p className="text-sm font-semibold text-slate-950">Document autofill review</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-700">
                  Autofill is a review aid. It will not overwrite shipment fields until you choose Apply.
                </p>
                {autofillMessage && (
                  <p
                    className={
                      autofillState === "error"
                        ? "mt-2 text-sm font-medium text-rose-700"
                        : autofillState === "unsupported"
                          ? "mt-2 text-sm font-medium text-amber-800"
                          : "mt-2 text-sm font-medium text-sky-800"
                    }
                  >
                    {autofillMessage}
                  </p>
                )}
              </div>
              {autofillSuggestions.length > 0 && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyAutofillSuggestions}
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Apply selected
                  </button>
                  <button
                    type="button"
                    onClick={clearAutofillSuggestions}
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {autofillSuggestions.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {autofillSuggestions.map((suggestion) => (
                  <label
                    key={suggestion.field}
                    className="flex gap-3 rounded-md border border-white/80 bg-white p-3 text-sm shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAutofillFields[suggestion.field] !== false}
                      onChange={(event) =>
                        setSelectedAutofillFields((selection) => ({
                          ...selection,
                          [suggestion.field]: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-zinc-300"
                    />
                    <span>
                      <span className="block font-semibold text-slate-950">{suggestion.label}</span>
                      <span className="mt-1 block break-words text-zinc-700">{suggestion.value}</span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        Source: {suggestion.sourceFileName}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {documentRows.map((rowId, index) => (
            <div key={rowId} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">File {index + 1}</p>
                {documentRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDocumentRow(rowId)}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <SelectField name={`documentType:${rowId}`} label="Document type" options={documentTypes} />
                <StorageUploadField
                  shipmentId="intake-draft"
                  documentId={rowId}
                  onUploaded={(result, file) => void handleDocumentUploaded(rowId, result, file)}
                />
                <SelectField
                  name={`documentStatus:${rowId}`}
                  label="Document status"
                  options={["uploaded", "processing", "needs_review", "approved", "shared_with_line"]}
                />
                <TextInput name={`uploadedBy:${rowId}`} label="Uploaded by" defaultValue="Demo Admin" />
                <div className="md:col-span-4">
                  <TextArea
                    name={`documentNotes:${rowId}`}
                    label="Document notes"
                    placeholder="Add review notes, missing fields, or carrier-specific handling instructions."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setDocumentRows((rows) => [...rows, `document-row-${Date.now()}`])}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
              Add more files
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-slate-950">Common starting checklist</p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2 lg:grid-cols-4">
            {["Commercial invoice", "Packing list", "Booking confirmation", "Shipping instructions"].map((item) => (
              <label key={item} className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-zinc-300" />
                {item}
              </label>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <form
      ref={formRef}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submitShipment("created");
      }}
    >
      {saveState !== "idle" && (
        <Card
          className={
            saveState === "created"
              ? "border-emerald-200 bg-emerald-50"
              : saveState === "error"
                ? "border-rose-200 bg-rose-50"
                : "border-sky-200 bg-sky-50"
          }
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                {saveState === "saving"
                  ? "Saving shipment"
                  : saveState === "created"
                    ? "Shipment created in Supabase"
                    : saveState === "error"
                      ? "Shipment was not saved"
                      : "Draft saved in Supabase"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {createdShipment?.reference || "Working..."}
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-700">
                {saveState === "saving"
                  ? "Writing the shipment, cargo, timeline, and document metadata to the database."
                  : saveState === "error"
                    ? errorMessage
                    : "The MVP wrote this shipment to Supabase. It will appear on the dashboard and shipment board for every user."}
              </p>
            </div>
            {createdShipment && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/shipments/${createdShipment.id}`}
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  View created shipment
                </Link>
                <Link
                  href="/shipments"
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  View shipment board
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Shipment Reference</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <TextInput
              label="Shipment reference"
              name="shipmentReference"
              value={shipmentReference}
              onChange={(event) => setShipmentReference(event.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-500">
              {referenceState === "loading"
                ? "Checking latest Supabase shipment reference..."
                : referenceState === "ready"
                  ? "Auto-filled from the latest Supabase shipment reference."
                  : "Using fallback reference; duplicate protection still runs on save."}
            </p>
          </div>
          <TextInput label="Carrier / shipping line" name="carrier" placeholder="e.g. Maersk" />
          <TextInput label="Booking number" name="bookingNumber" placeholder="Optional" />
        </div>
      </Card>

      {renderInitialDocumentsCard()}

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Parties</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <TextInput label="Shipper name" name="shipperName" placeholder="Exporter or shipper" required />
          <TextInput label="Consignee name" name="consigneeName" placeholder="Buyer or consignee" required />
          <TextInput label="Notify party" name="notifyParty" placeholder="Notify party" />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Cargo Details</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <TextInput label="Cargo description" name="cargoDescription" placeholder="Describe cargo clearly" required />
          </div>
          <TextInput label="Item type" name="itemType" placeholder="Electronics, DG, reefer..." />
          <TextInput label="HS code" name="hsCode" placeholder="e.g. 8517.62" />
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Package count</span>
            <input
              name="packageCount"
              value={packages}
              onChange={(event) => setPackages(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Length (cm)</span>
            <input
              name="lengthCm"
              value={length}
              onChange={(event) => setLength(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Width (cm)</span>
            <input
              name="widthCm"
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Height (cm)</span>
            <input
              name="heightCm"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <TextInput label="Gross weight (kg)" name="grossWeightKg" placeholder="0.00" />
          <TextInput label="Net weight (kg)" name="netWeightKg" placeholder="0.00" />
          <div className="rounded-lg border border-sky-100 bg-sky-50 p-4 md:col-span-2">
            <p className="text-sm font-semibold text-sky-900">Calculated CBM</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{cbm}</p>
            <p className="mt-1 text-xs text-zinc-600">Length x width x height x package count / 1,000,000</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Routing</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <SelectField label="Incoterm" name="incoterm" options={["FOB", "CIF", "CFR", "DAP", "EXW", "DDP"]} />
          <TextInput label="Origin" name="origin" placeholder="Singapore" required />
          <TextInput label="Destination" name="destination" placeholder="Rotterdam" required />
          <SelectField name="containerType" label="Container type" options={["20GP", "40GP", "40HC", "40RF", "LCL"]} />
          <TextInput label="POL" name="pol" placeholder="Port of loading" />
          <TextInput label="POD" name="pod" placeholder="Port of discharge" />
          <TextInput label="Preferred ETD" name="preferredEtd" type="date" />
          <TextInput label="Preferred ETA" name="preferredEta" type="date" />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-950">References and Notes</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <TextInput label="B/L number" name="blNumber" placeholder="Optional" />
          <TextInput label="Container number" name="containerNumber" placeholder="Optional" />
          <div className="md:col-span-3">
            <TextArea name="notes" label="Notes" placeholder="Add handling notes, compliance constraints, or buyer requests." />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => void submitShipment("draft")}
          disabled={saveState === "saving"}
          className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          Save draft
        </button>
        <button
          type="submit"
          disabled={saveState === "saving"}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {saveState === "saving" ? "Creating..." : saveState === "created" ? "Shipment created" : "Create shipment"}
        </button>
      </div>
    </form>
  );
}
