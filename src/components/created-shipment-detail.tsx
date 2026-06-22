"use client";

import { useEffect, useState } from "react";
import {
  AuditPanel,
  BillOfLadingPanel,
  CargoPanel,
  CommentsPanel,
  DocumentsPanel,
  SharingPanel,
  ShipmentOverview,
  ShipmentSummary,
  ShipmentTabs,
  TimelinePanel,
} from "@/components/shipment-detail";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { CREATED_DEMO_SHIPMENT_ID, findCreatedShipment } from "@/lib/demo-store";
import type { Shipment } from "@/lib/types";

export function CreatedShipmentDetail() {
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    const refresh = () => setShipment(findCreatedShipment(CREATED_DEMO_SHIPMENT_ID) ?? null);

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("harborbridge:shipments-changed", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("harborbridge:shipments-changed", refresh);
    };
  }, []);

  if (!shipment) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Demo shipment"
          title="Shipment not created in this browser yet"
          description="Create a demo shipment first, then this local detail page will show the newly created record."
          action={<ButtonLink href="/shipments/new">Create shipment</ButtonLink>}
        />
        <Card>
          <p className="text-sm text-zinc-600">
            Demo-created shipments are stored in this browser until Supabase persistence is connected.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={shipment.reference}
        title={`${shipment.origin} to ${shipment.destination}`}
        description={shipment.cargoDescription}
        action={<ButtonLink href="/shipments" variant="secondary">Back to board</ButtonLink>}
      />
      <ShipmentTabs shipment={shipment} />
      <ShipmentSummary shipment={shipment} />
      <ShipmentOverview shipment={shipment} />
      <CargoPanel shipment={shipment} />
      <DocumentsPanel shipment={shipment} />
      <TimelinePanel shipment={shipment} />
      <BillOfLadingPanel shipment={shipment} />
      <CommentsPanel shipment={shipment} />
      <SharingPanel shipment={shipment} />
      <AuditPanel shipment={shipment} />
    </div>
  );
}
