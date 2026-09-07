import { RegionItem, CollectionAgentItem, UserItem, PaginationMeta } from './masterData';

export type DelinquencyBucket = '0-30' | '31-60' | '61-90' | '90+';

export type LoanType =
  | 'PERSONAL'
  | 'HOME'
  | 'AUTO'
  | 'BUSINESS'
  | 'CREDIT_CARD';

export type LoanStatus =
  | 'CURRENT'
  | 'DELINQUENT'
  | 'DEFAULT'
  | 'SETTLED'
  | 'CLOSED'
  | 'WRITTEN_OFF';

export interface LoanAccountItem {
  id: string;
  _id?: string;
  accountNumber: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  borrowerAddress?: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  missedEmisCount: number;
  lastPaymentDate?: string | null;
  nextDueDate: string;
  firstMissedDueDate?: string | null;
  dpd: number;
  bucket: DelinquencyBucket;
  region: RegionItem | string;
  status: LoanStatus;
  assignedAgent?: CollectionAgentItem | string | null;
  assignedSupervisor?: UserItem | string | null;
  assignedAt?: string | null;
  assignedBy?: UserItem | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanPayload {
  accountNumber: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  borrowerAddress?: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalOutstanding: number;
  overdueAmount?: number;
  missedEmisCount?: number;
  lastPaymentDate?: string | null;
  nextDueDate: string;
  firstMissedDueDate?: string | null;
  region: string;
  status?: LoanStatus;
}

export interface UpdateLoanPayload {
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  borrowerAddress?: string;
  loanType?: LoanType;
  totalOutstanding?: number;
  overdueAmount?: number;
  missedEmisCount?: number;
  lastPaymentDate?: string | null;
  nextDueDate?: string;
  firstMissedDueDate?: string | null;
  region?: string;
  status?: LoanStatus;
}

export interface BucketSummary {
  bucket: DelinquencyBucket;
  count: number;
  totalOverdue: number;
  totalOutstanding: number;
}

export interface LoanSummaryData {
  totalAccounts: number;
  totalOutstanding: number;
  totalOverdue: number;
  currentCount: number;
  delinquentCount: number;
  defaultNpaCount: number;
  settledClosedCount: number;
  buckets: {
    '0-30': BucketSummary;
    '31-60': BucketSummary;
    '61-90': BucketSummary;
    '90+': BucketSummary;
  };
}

export interface LoansResponse {
  success: boolean;
  message: string;
  data: {
    loans: LoanAccountItem[];
    pagination: PaginationMeta;
  };
}

export interface LoanSummaryResponse {
  success: boolean;
  message: string;
  data: {
    summary: LoanSummaryData;
  };
}

export interface SingleLoanResponse {
  success: boolean;
  message: string;
  data: {
    loan: LoanAccountItem;
  };
}

export interface AgentWorkspaceSummary {
  totalAssigned: number;
  totalOverdue: number;
  dpd90PlusCount: number;
  todayFollowupsCount: number;
}

export interface AgentAssignedLoansResponse {
  success: boolean;
  message: string;
  data: {
    loans: LoanAccountItem[];
    pagination: PaginationMeta;
    summary: AgentWorkspaceSummary;
    agent: {
      id: string;
      employeeCode: string;
      phone?: string;
      region?: {
        _id?: string;
        name: string;
        code: string;
      };
      isActive: boolean;
    };
  };
}

