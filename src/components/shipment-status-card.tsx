"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { shipmentStatusLabel, shipmentStatusOptions } from "@/lib/shipment-status";
import type { ShipmentStatus } from "@/lib/types";

type UpdateState = "idle" | "saving" | "saved" | "error";

export function ShipmentStatusCard({
  shipmentId,
  status,
}: {
  shipmentId: string;
  status: ShipmentStatus;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [message, setMessage] = useState("");

  async function updateStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current || updateState === "saving") {
      return;
    }

    const formData = new FormData(formRef.current);
    const nextStatus = String(formData.get("status") ?? "").trim();
    const nextAction = String(formData.get("nextAction") ?? "").trim();

    setUpdateState("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, nextAction }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update shipment status.");
      }

      setUpdateState("saved");
      setMessage("Shipment status updated.");
      window.dispatchEvent(new Event("harborbridge:shipments-changed"));
      localStorage.setItem("harborbridge:shipments-changed", String(Date.now()));
      router.refresh();
    } catch (error) {
      setUpdateState("error");
      setMessage(error instanceof Error ? error.message : "Unable to update shipment status.");
    }
  }

  return (
    <Card className="lg:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Shipment status</p>
          <div className="mt-3">
            <Badge value={status} />
          </div>
        </div>
        {message && (
          <p className={updateState === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>
            {message}
          </p>
        )}
      </div>
      <form ref={formRef} onSubmit={updateStatus} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Update status</span>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            {shipmentStatusOptions.map((option) => (
              <option key={option} value={option}>
                {shipmentStatusLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Next action note</span>
          <input
            name="nextAction"
            placeholder="Optional status note"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <button
          disabled={updateState === "saving"}
          className="self-end rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {updateState === "saving" ? "Saving..." : "Save"}
        </button>
      </form>
    </Card>
  );
}
