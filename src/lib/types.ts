export type UserRole = "admin" | "shipper" | "shipping_line_guest";

export type ShipmentStatus =
  | "draft"
  | "docs_pending"
  | "docs_review"
  | "shared_with_line"
  | "booking_requested"
  | "booking_confirmed"
  | "in_transit"
  | "arrived"
  | "delivered"
  | "closed"
  | "delayed";

export type DocumentStatus =
  | "not_uploaded"
  | "uploaded"
  | "processing"
  | "needs_review"
  | "approved"
  | "rejected"
  | "shared_with_line"
  | "accepted_by_line";

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "blocked" | "skipped";

export type Priority = "low" | "medium" | "high";

export type FeedbackStatus = "open" | "reviewed" | "resolved";

export type CargoItem = {
  description: string;
  itemType: string;
  hsCode: string;
  packages: number;
  dimensions: string;
  grossWeightKg: number;
  netWeightKg: number;
  volumeCbm: number;
};

export type ShipmentDocument = {
  id: string;
  type: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: DocumentStatus;
  rejectionReason?: string;
};

export type ShipmentEvent = {
  milestone: string;
  status: MilestoneStatus;
  timestamp?: string;
  responsibleParty: string;
  notes: string;
  source: "manual" | "system" | "shipping_line_guest";
};

export type Comment = {
  userName: string;
  role: UserRole;
  timestamp: string;
  message: string;
  attachment?: string;
};

export type AuditLog = {
  action: string;
  actor: string;
  role: UserRole;
  timestamp: string;
  detail: string;
};

export type BillOfLading = {
  number?: string;
  type: string;
  status: string;
  issuedAt?: string;
  approvedAt?: string;
  notes: string;
};

export type ShareLink = {
  token: string;
  recipientCompany: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  lastViewedAt?: string;
  canComment: boolean;
  canUploadDocuments: boolean;
  canUpdateStatus: boolean;
};

export type Shipment = {
  id: string;
  reference: string;
  shipperName: string;
  consigneeName: string;
  notifyParty: string;
  cargoDescription: string;
  itemType: string;
  hsCode: string;
  packageCount: number;
  dimensions: string;
  grossWeightKg: number;
  netWeightKg: number;
  volumeCbm: number;
  incoterm: string;
  origin: string;
  destination: string;
  pol: string;
  pod: string;
  containerType: string;
  etd: string;
  eta: string;
  carrier: string;
  bookingNumber?: string;
  blNumber?: string;
  containerNumber?: string;
  status: ShipmentStatus;
  documentStatus: DocumentStatus;
  blStatus: string;
  nextAction: string;
  notes: string;
  lastUpdated: string;
  cargoItems: CargoItem[];
  documents: ShipmentDocument[];
  timeline: ShipmentEvent[];
  comments: Comment[];
  auditLogs: AuditLog[];
  billOfLading?: BillOfLading;
  shareLinks: ShareLink[];
};

export type FeedbackItem = {
  id: string;
  submittedBy: string;
  pageOrFeature: string;
  comment: string;
  priority: Priority;
  status: FeedbackStatus;
  createdAt: string;
};

export type Notification = {
  title: string;
  message: string;
  shipmentReference?: string;
  createdAt: string;
};
