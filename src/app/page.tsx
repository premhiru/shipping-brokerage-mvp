import { ArrowRight, FileCheck2, LockKeyhole, Ship } from "lucide-react";
import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="grid min-h-[calc(100vh-4rem)] items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
            Shipping documentation portal
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Move shipment packs from messy email threads to one client-ready workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
            HarborBridge lets brokers create shipment records, collect cargo details, manage documents,
            share a scoped pack with the shipping line, and track every B/L and milestone update.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/dashboard">Open demo dashboard</ButtonLink>
            <ButtonLink href="/line/share/demo-share-electronics" variant="secondary">
              View carrier portal
            </ButtonLink>
          </div>
        </div>

        <Card className="p-0">
          <div className="border-b border-zinc-200 p-5">
            <p className="text-sm font-semibold text-zinc-500">Live MVP demo pack</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">HB-2026-0001</h2>
          </div>
          <div className="space-y-4 p-5">
            {[
              ["Cargo", "Electronics, Singapore to Rotterdam", Ship],
              ["Documents", "Commercial invoice and packing list approved", FileCheck2],
              ["Sharing", "Maersk scoped link expires Jul 22", LockKeyhole],
            ].map(([label, text, Icon]) => (
              <div key={label as string} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-4">
                <span className="rounded-md bg-white p-2 text-sky-700 shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{label as string}</p>
                  <p className="mt-1 text-sm text-zinc-600">{text as string}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/shipments/electronics-singapore-rotterdam"
            className="flex items-center justify-between border-t border-zinc-200 px-5 py-4 text-sm font-semibold text-sky-700"
          >
            Review shipment detail
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>
    </div>
  );
}
