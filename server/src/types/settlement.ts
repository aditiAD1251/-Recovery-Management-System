import { ILoanAccount } from './loan.js';
import { IUser } from './user.js';

export type SettlementStatus =
  | 'PENDING_SUPERVISOR'
  | 'PENDING_LEGAL_HEAD'
  | 'PAYMENT_PENDING'
  | 'SETTLED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ISettlementAuditEntry {
  action: string;
  performedBy: string | IUser;
  performedAt: Date;
  role: string;
  comments?: string;
  previousStatus?: SettlementStatus;
  newStatus?: SettlementStatus;
}

export interface ISettlementRequest {
  _id?: string;
  id?: string;
  loanAccount: string | ILoanAccount;
  requestedBy: string | IUser;
  proposedAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  waivedAmount: number;
  waiverPercentage: number;
  reason: string;
  validUntil: Date;
  status: SettlementStatus;
  reviewedBy?: string | IUser | null;
  reviewNotes?: string;
  reviewedAt?: Date | null;
  approvalAuthorityRole?: string;
  settledBy?: string | IUser | null;
  settledAt?: Date | null;
  paymentReference?: string;
  paymentMode?: string;
  paidAmount?: number;
  paymentReceiptNotes?: string;
  history: ISettlementAuditEntry[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSettlementDTO {
  loanAccount: string;
  proposedAmount: number;
  reason: string;
  validUntil: string | Date;
}

export interface ReviewSettlementDTO {
  action: 'APPROVE' | 'REJECT' | 'ESCALATE_TO_LEGAL';
  reviewNotes: string;
}

export interface ConfirmSettlementPaymentDTO {
  paymentReference: string;
  paymentMode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER';
  paidAmount: number;
  paymentDate?: string | Date;
  paymentReceiptNotes?: string;
}

export interface SettlementFilters {
  loanAccount?: string;
  status?: SettlementStatus | 'ALL';
  requestedBy?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
