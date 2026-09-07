import { ILoanAccount } from './loan.js';
import { IUser } from './user.js';

export type LegalCaseStatus =
  | 'ESCALATED'
  | 'NOTICE_SENT'
  | 'IN_LITIGATION'
  | 'HEARING_SCHEDULED'
  | 'DECREE_PASSED'
  | 'SETTLED'
  | 'WRITTEN_OFF'
  | 'CLOSED';

export type LegalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type LegalEscalationReason =
  | 'REFUSAL_TO_PAY'
  | 'CHRONIC_DEFAULT_90_PLUS'
  | 'UNTRACEABLE_BORROWER'
  | 'FRAUD_SUSPECTED'
  | 'CHEQUE_BOUNCE_SEC_138'
  | 'COLLATERAL_DISPUTE'
  | 'EARLY_RISK_JUSTIFIED'
  | 'OTHER';

export type LegalActionType =
  | 'LEGAL_DEMAND_NOTICE'
  | 'SECTION_138_NI_ACT'
  | 'ARBITRATION'
  | 'SARFAESI_ACTION'
  | 'CIVIL_SUIT_DRT'
  | 'LOK_ADALAT'
  | 'ASSET_REPOSSESSION'
  | 'WRITE_OFF_RECOMMENDATION';

export type NoticeType =
  | 'STATUTORY_DEMAND_NOTICE'
  | 'SECTION_138_NOTICE'
  | 'SARFAESI_13_2_NOTICE'
  | 'SARFAESI_13_4_NOTICE'
  | 'LOAN_RECALL_NOTICE'
  | 'FINAL_WARNING';

export type NoticeResponseStatus =
  | 'AWAITING_RESPONSE'
  | 'NO_RESPONSE'
  | 'REPLY_RECEIVED'
  | 'SETTLEMENT_PROPOSED'
  | 'FULL_PAYMENT_MADE'
  | 'RETURNED_UNSERVED';

export interface ILegalNotice {
  _id?: string;
  id?: string;
  noticeType: NoticeType;
  noticeDate: Date;
  trackingNumber?: string;
  dispatchMode: 'SPEED_POST' | 'REGISTERED_AD' | 'EMAIL' | 'HAND_DELIVERY' | 'COURIER';
  issuedBy: string | IUser;
  responseDueDate?: Date | null;
  responseStatus: NoticeResponseStatus;
  responseDate?: Date | null;
  borrowerResponseNotes?: string;
  remarks?: string;
  createdAt?: Date;
}

export interface ICourtHearing {
  _id?: string;
  id?: string;
  hearingDate: Date;
  stage: string;
  courtName?: string;
  judgeBench?: string;
  summary: string;
  outcome?: string;
  nextHearingDate?: Date | null;
  loggedBy: string | IUser;
  createdAt?: Date;
}

export interface IWriteOffRecord {
  writeOffAmount: number;
  unrecoveredPrincipal: number;
  unrecoveredInterest: number;
  reason: string;
  approvedBy: string | IUser;
  approvedAt: Date;
  writeOffReference?: string;
  remarks?: string;
}

export interface ILegalAuditEntry {
  action: string;
  performedBy: string | IUser;
  performedAt: Date;
  role: string;
  notes: string;
  previousStatus?: LegalCaseStatus;
  newStatus?: LegalCaseStatus;
}

export interface ILegalCase {
  _id?: string;
  id?: string;
  caseNumber: string;
  loanAccount: string | ILoanAccount;
  escalatedBy: string | IUser;
  assignedLegalOfficer?: string | IUser | null;
  reason: LegalEscalationReason;
  justification: string;
  caseType: LegalActionType;
  priority: LegalPriority;
  status: LegalCaseStatus;
  courtName?: string;
  courtCaseNumber?: string;
  advocateName?: string;
  advocatePhone?: string;
  advocateEmail?: string;
  filingDate?: Date | null;
  nextHearingDate?: Date | null;
  claimAmount: number;
  recoveredAmount: number;
  notices: ILegalNotice[];
  hearings: ICourtHearing[];
  writeOffDetails?: IWriteOffRecord | null;
  auditHistory: ILegalAuditEntry[];
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLegalCaseDTO {
  loanAccount: string;
  reason: LegalEscalationReason;
  justification: string;
  caseType: LegalActionType;
  priority?: LegalPriority;
  assignedLegalOfficer?: string;
  courtName?: string;
  advocateName?: string;
  advocatePhone?: string;
  claimAmount?: number;
  remarks?: string;
}

export interface UpdateLegalCaseDTO {
  status?: LegalCaseStatus;
  priority?: LegalPriority;
  assignedLegalOfficer?: string | null;
  courtName?: string;
  courtCaseNumber?: string;
  advocateName?: string;
  advocatePhone?: string;
  advocateEmail?: string;
  filingDate?: string | Date | null;
  nextHearingDate?: string | Date | null;
  recoveredAmount?: number;
  remarks?: string;
}

export interface IssueLegalNoticeDTO {
  noticeType: NoticeType;
  noticeDate?: string | Date;
  trackingNumber?: string;
  dispatchMode?: 'SPEED_POST' | 'REGISTERED_AD' | 'EMAIL' | 'HAND_DELIVERY' | 'COURIER';
  responseDueDate?: string | Date;
  remarks?: string;
}

export interface UpdateLegalNoticeStatusDTO {
  responseStatus: NoticeResponseStatus;
  responseDate?: string | Date;
  borrowerResponseNotes?: string;
}

export interface RecordHearingDTO {
  hearingDate: string | Date;
  stage: string;
  courtName?: string;
  judgeBench?: string;
  summary: string;
  outcome?: string;
  nextHearingDate?: string | Date | null;
}

export interface ExecuteWriteOffDTO {
  writeOffAmount?: number;
  reason: string;
  remarks?: string;
}

export interface LegalFilters {
  loanAccount?: string;
  status?: LegalCaseStatus | 'ALL';
  priority?: LegalPriority | 'ALL';
  caseType?: LegalActionType | 'ALL';
  assignedLegalOfficer?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
