import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Shipment } from "@/lib/types";

export function ShipmentTable({ shipments }: { shipments: Shipment[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Lane</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Docs</th>
              <th className="px-4 py-3">B/L</th>
              <th className="px-4 py-3">ETD / ETA</th>
              <th className="px-4 py-3">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {shipments.map((shipment) => (
              <tr key={shipment.id} className="align-top hover:bg-zinc-50">
                <td className="px-4 py-4">
                  <Link
                    href={`/shipments/${shipment.id}`}
                    className="font-semibold text-sky-700 hover:text-sky-900"
                  >
                    {shipment.reference}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">Updated {formatDateTime(shipment.lastUpdated)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-950">{shipment.cargoDescription}</p>
                  <p className="mt-1 text-xs text-zinc-500">{shipment.packageCount} packages</p>
                </td>
                <td className="px-4 py-4 text-zinc-700">
                  {shipment.origin}
                  <span className="block text-xs text-zinc-400">to {shipment.destination}</span>
                </td>
                <td className="px-4 py-4 text-zinc-700">{shipment.carrier}</td>
                <td className="px-4 py-4">
                  <Badge value={shipment.status} />
                </td>
                <td className="px-4 py-4">
                  <Badge value={shipment.documentStatus} />
                </td>
                <td className="px-4 py-4 text-zinc-700">{shipment.blStatus}</td>
                <td className="px-4 py-4 text-zinc-700">
                  {formatDate(shipment.etd)}
                  <span className="block text-xs text-zinc-400">{formatDate(shipment.eta)}</span>
                </td>
                <td className="px-4 py-4 text-zinc-700">{shipment.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
