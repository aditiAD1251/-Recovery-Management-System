import { LoanAccountItem } from './loan';

export type SettlementStatus =
  | 'PENDING_SUPERVISOR'
  | 'PENDING_LEGAL_HEAD'
  | 'PAYMENT_PENDING'
  | 'SETTLED'
  | 'REJECTED'
  | 'CANCELLED';

export interface SettlementAuditItem {
  id?: string;
  _id?: string;
  action: string;
  performedBy: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  performedAt: string;
  role: string;
  comments?: string;
  previousStatus?: SettlementStatus;
  newStatus?: SettlementStatus;
}

export interface SettlementRequestItem {
  id: string;
  _id?: string;
  loanAccount: LoanAccountItem;
  requestedBy: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  proposedAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  waivedAmount: number;
  waiverPercentage: number;
  reason: string;
  validUntil: string;
  status: SettlementStatus;
  reviewedBy?: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  } | null;
  reviewNotes?: string;
  reviewedAt?: string | null;
  approvalAuthorityRole?: string;
  settledBy?: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  } | null;
  settledAt?: string | null;
  paymentReference?: string;
  paymentMode?: string;
  paidAmount?: number;
  paymentReceiptNotes?: string;
  history: SettlementAuditItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SettlementsResponse {
  success: boolean;
  message: string;
  data: {
    settlements: SettlementRequestItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface SingleSettlementResponse {
  success: boolean;
  message: string;
  data: SettlementRequestItem;
}

export interface CreateSettlementPayload {
  loanAccount: string;
  proposedAmount: number;
  reason: string;
  validUntil: string;
}

export interface ReviewSettlementPayload {
  action: 'APPROVE' | 'REJECT' | 'ESCALATE_TO_LEGAL';
  reviewNotes: string;
}

export interface CompleteSettlementPayload {
  paymentReference: string;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER';
  paidAmount: number;
  paymentDate?: string;
  paymentReceiptNotes?: string;
}
