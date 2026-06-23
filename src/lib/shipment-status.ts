import type { ShipmentStatus } from "@/lib/types";

export const shipmentStatusOptions: ShipmentStatus[] = [
  "draft",
  "docs_pending",
  "docs_review",
  "shared_with_line",
  "booking_requested",
  "booking_confirmed",
  "in_transit",
  "arrived",
  "delivered",
  "closed",
  "delayed",
];

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  draft: "Draft",
  docs_pending: "Docs pending",
  docs_review: "Docs review",
  shared_with_line: "Shared with line",
  booking_requested: "Booking requested",
  booking_confirmed: "Booking confirmed",
  in_transit: "In transit",
  arrived: "Arrived",
  delivered: "Delivered",
  closed: "Closed",
  delayed: "Delayed",
};

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return shipmentStatusOptions.includes(value as ShipmentStatus);
}

export function shipmentStatusLabel(status: ShipmentStatus) {
  return shipmentStatusLabels[status] ?? status;
}
