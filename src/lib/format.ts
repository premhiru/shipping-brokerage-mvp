import type { DocumentStatus, MilestoneStatus, ShipmentStatus, UserRole } from "./types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function titleize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDate(value?: string) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatNumber(value: number, unit = "") {
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value)}${unit}`;
}

export function statusTone(
  status: ShipmentStatus | DocumentStatus | MilestoneStatus | UserRole | string,
) {
  const green = ["approved", "accepted_by_line", "completed", "delivered", "closed", "admin", "live"];
  const blue = [
    "uploaded",
    "shared_with_line",
    "booking_confirmed",
    "in_transit",
    "shipper",
    "shipping_line_guest",
    "configured",
  ];
  const amber = ["draft", "docs_pending", "docs_review", "in_progress", "needs_review", "processing", "stale", "no_signal"];
  const red = ["rejected", "blocked", "delayed", "error"];

  if (green.includes(status)) return "green";
  if (blue.includes(status)) return "blue";
  if (amber.includes(status)) return "amber";
  if (red.includes(status)) return "red";
  return "zinc";
}
