export type ViewId =
  | 'overview'
  | 'inventory'
  | 'claims'
  | 'repairs'
  | 'recalls'
  | 'family';

export type ProductCategory =
  | 'Television & Audio'
  | 'Kitchen Appliance'
  | 'Computing & Mobile'
  | 'Home Care'
  | 'Laundry & HVAC'
  | 'Other';

export type DocumentType =
  | 'invoice'
  | 'warranty_certificate'
  | 'product_photo'
  | 'defect_evidence'
  | 'service_report';

export interface FamilyMember {
  id: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Member' | 'Shared';
  email: string;
  relation: string;
}

export interface ComponentWarranty {
  id: string;
  componentName: string;
  coverageType: 'Manufacturer Base' | 'Component Specific' | 'Extended Plan';
  provider: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  termsSummary: string;
  policyNumber?: string;
}

export interface VaultDocument {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: string; // YYYY-MM-DD
  fileSize: string;
  mimeType: string;
  dataUrl?: string; // Real uploaded file data URL or generated preview text
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  category: ProductCategory;
  purchaseDate: string; // YYYY-MM-DD
  purchasePrice: number;
  retailer: string;
  invoiceNumber: string;
  location: string;
  ownerId: string;
  imageUrl?: string;
  notes?: string;
  warranties: ComponentWarranty[];
  documents: VaultDocument[];
}

export type ClaimStatus =
  | 'Draft'
  | 'Submitted'
  | 'Inspection Scheduled'
  | 'In Repair'
  | 'Approved'
  | 'Resolved';

export interface ClaimInteraction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  channel: 'Phone' | 'Email' | 'Service Portal' | 'Technician Visit';
  agentName: string;
  summary: string;
  referenceCode?: string;
}

export interface WarrantyClaim {
  id: string;
  productId: string;
  warrantyId: string;
  claimNumber: string;
  issueTitle: string;
  issueDescription: string;
  faultDetectedDate: string;
  submittedDate: string;
  status: ClaimStatus;
  serviceCenterName: string;
  serviceCenterContact: string;
  estimatedResolutionDate?: string;
  claimedAmount?: number;
  interactions: ClaimInteraction[];
}

export interface FollowUpTask {
  id: string;
  title: string;
  productId: string;
  claimId?: string;
  dueDate: string; // YYYY-MM-DD
  channel: 'Phone' | 'Email' | 'Service Portal' | 'In-Person';
  priority: 'High' | 'Normal';
  completed: boolean;
  notes: string;
}

export interface RepairRecord {
  id: string;
  productId: string;
  claimId?: string;
  repairDate: string; // YYYY-MM-DD
  serviceProvider: string;
  description: string;
  partsReplaced: string;
  coveredByWarranty: boolean;
  totalBillAmount: number;
  outOfPocketPaid: number;
  warrantySavedAmount: number;
  technicianTicket?: string;
}

export type RecallStatus = 'Action Needed' | 'Remedy Scheduled' | 'Not Affected' | 'Resolved';

export interface RecallAlert {
  id: string;
  recallCode: string;
  issuedDate: string;
  authority: string;
  manufacturer: string;
  affectedModels: string[];
  affectedSerialPrefix?: string;
  matchedProductId?: string;
  severity: 'Critical Safety' | 'Mandatory Remedy' | 'Advisory';
  title: string;
  hazardDescription: string;
  remedyAction: string;
  status: RecallStatus;
  verifiedUrlLabel: string;
}

export interface ReadinessCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  fixActionLabel?: string;
  fixTarget?: 'vault_invoice' | 'vault_warranty' | 'vault_photo' | 'serial' | 'coverage';
}

export interface ReadinessResult {
  passedCount: number;
  totalCount: number;
  isClaimReady: boolean;
  missingSummary: string[];
  checks: ReadinessCheckItem[];
}
