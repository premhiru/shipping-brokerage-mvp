export const documentTypeLabels: Record<string, string> = {
  commercial_invoice: "Commercial invoice",
  packing_list: "Packing list",
  certificate_of_origin: "Certificate of origin",
  msds: "MSDS",
  dg_declaration: "DG declaration",
  export_permit: "Export permit",
  import_permit: "Import permit",
  insurance_certificate: "Insurance certificate",
  booking_confirmation: "Booking confirmation",
  shipping_instructions: "Shipping instructions",
  draft_bl: "Draft B/L",
  final_bl_sea_waybill: "Final B/L / sea waybill",
  vgm_declaration: "VGM declaration",
  other: "Other",
};

export const documentTypeValues = Object.keys(documentTypeLabels);

export function documentLabelToValue(label: string) {
  const match = Object.entries(documentTypeLabels).find(([, value]) => value === label);
  return match?.[0] ?? "other";
}
