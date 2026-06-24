export const SHIPMENT_DOCUMENTS_BUCKET = "shipment-documents";
export const DEMO_COMPANY_ID = "11111111-1111-4111-8111-111111111111";

export type StorageUploadResult = {
  path: string;
  signedUrl?: string;
};

export function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function buildShipmentDocumentPath({
  companyId = DEMO_COMPANY_ID,
  shipmentId,
  documentId,
  fileName,
}: {
  companyId?: string;
  shipmentId: string;
  documentId: string;
  fileName: string;
}) {
  return `company/${companyId}/shipment/${shipmentId}/${documentId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

export async function uploadShipmentDocument({
  file,
  shipmentId,
  documentId,
  shareToken,
}: {
  file: File;
  shipmentId: string;
  documentId: string;
  shareToken?: string;
}): Promise<StorageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("shipmentId", shipmentId);
  formData.append("documentId", documentId);

  if (shareToken) {
    formData.append("shareToken", shareToken);
  }

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as Partial<StorageUploadResult> & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Upload failed.");
  }

  if (!payload.path) {
    throw new Error("Upload succeeded but no storage path was returned.");
  }

  return {
    path: payload.path,
    signedUrl: payload.signedUrl,
  };
}
