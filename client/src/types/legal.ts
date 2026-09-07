import { LoanAccountItem } from './loan';

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

export interface LegalNoticeItem {
  id: string;
  _id?: string;
  noticeType: NoticeType;
  noticeDate: string;
  trackingNumber?: string;
  dispatchMode: 'SPEED_POST' | 'REGISTERED_AD' | 'EMAIL' | 'HAND_DELIVERY' | 'COURIER';
  issuedBy: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  responseDueDate?: string | null;
  responseStatus: NoticeResponseStatus;
  responseDate?: string | null;
  borrowerResponseNotes?: string;
  remarks?: string;
  createdAt: string;
}

export interface CourtHearingItem {
  id: string;
  _id?: string;
  hearingDate: string;
  stage: string;
  courtName?: string;
  judgeBench?: string;
  summary: string;
  outcome?: string;
  nextHearingDate?: string | null;
  loggedBy: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

export interface WriteOffRecordItem {
  writeOffAmount: number;
  unrecoveredPrincipal: number;
  unrecoveredInterest: number;
  reason: string;
  approvedBy: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  approvedAt: string;
  writeOffReference?: string;
  remarks?: string;
}

export interface LegalAuditItem {
  id: string;
  _id?: string;
  action: string;
  performedBy: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  performedAt: string;
  role: string;
  notes: string;
  previousStatus?: LegalCaseStatus;
  newStatus?: LegalCaseStatus;
}

export interface LegalCaseItem {
  id: string;
  _id?: string;
  caseNumber: string;
  loanAccount: LoanAccountItem;
  escalatedBy: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  };
  assignedLegalOfficer?: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
  } | null;
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
  filingDate?: string | null;
  nextHearingDate?: string | null;
  claimAmount: number;
  recoveredAmount: number;
  notices: LegalNoticeItem[];
  hearings: CourtHearingItem[];
  writeOffDetails?: WriteOffRecordItem | null;
  auditHistory: LegalAuditItem[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalCasesResponse {
  success: boolean;
  message: string;
  data: {
    cases: LegalCaseItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface SingleLegalCaseResponse {
  success: boolean;
  message: string;
  data: LegalCaseItem;
}

export interface CreateLegalCasePayload {
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

export interface UpdateLegalCasePayload {
  status?: LegalCaseStatus;
  priority?: LegalPriority;
  assignedLegalOfficer?: string | null;
  courtName?: string;
  courtCaseNumber?: string;
  advocateName?: string;
  advocatePhone?: string;
  advocateEmail?: string;
  filingDate?: string | null;
  nextHearingDate?: string | null;
  recoveredAmount?: number;
  remarks?: string;
}

export interface IssueLegalNoticePayload {
  noticeType: NoticeType;
  noticeDate?: string;
  trackingNumber?: string;
  dispatchMode?: 'SPEED_POST' | 'REGISTERED_AD' | 'EMAIL' | 'HAND_DELIVERY' | 'COURIER';
  responseDueDate?: string;
  remarks?: string;
}

export interface RecordHearingPayload {
  hearingDate: string;
  stage: string;
  courtName?: string;
  judgeBench?: string;
  summary: string;
  outcome?: string;
  nextHearingDate?: string | null;
}

export interface ExecuteWriteOffPayload {
  writeOffAmount?: number;
  reason: string;
  remarks?: string;
}
