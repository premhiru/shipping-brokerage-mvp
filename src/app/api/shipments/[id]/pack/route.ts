import { getShipment } from "@/lib/demo-data";
import { generateShipmentPackPdf } from "@/lib/shipment-pack-pdf";
import { createSupabaseServerClient, jsonError } from "@/lib/supabase-server";
import { getSupabaseShipment } from "@/lib/supabase-shipments";
import { DEMO_COMPANY_ID } from "@/lib/storage";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const shipment = (await getSupabaseShipment(id)) ?? getShipment(id);

    if (!shipment) {
      return jsonError("Shipment was not found.", 404);
    }

    const generatedAt = new Date().toISOString();
    const pdf = await generateShipmentPackPdf({ shipment, generatedAt });
    const supabase = createSupabaseServerClient();

    if (supabase) {
      await supabase.from("audit_logs").insert({
        company_id: DEMO_COMPANY_ID,
        shipment_id: shipment.id,
        actor_name: "Demo Admin",
        actor_role: "admin",
        action: "shipment_pack_generated",
        metadata: {
          reference: shipment.reference,
          generatedAt,
          documentCount: shipment.documents.length,
          timelineCount: shipment.timeline.length,
        },
      });
    }

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${safeFileName(shipment.reference)}-shipment-pack.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to generate shipment pack.", 400);
  }
}
