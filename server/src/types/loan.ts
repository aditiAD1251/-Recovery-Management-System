import { IRegion } from './region.js';
import { ICollectionAgent } from './agent.js';
import { IUser } from './user.js';

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

export interface ILoanAccount {
  _id?: string;
  id?: string;
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
  lastPaymentDate?: Date | null;
  nextDueDate: Date;
  firstMissedDueDate?: Date | null;
  dpd: number;
  bucket: DelinquencyBucket;
  region: string | IRegion;
  status: LoanStatus;
  assignedAgent?: string | ICollectionAgent | null;
  assignedSupervisor?: string | IUser | null;
  assignedAt?: Date | null;
  assignedBy?: string | IUser | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateLoanDTO {
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
  lastPaymentDate?: string | Date;
  nextDueDate: string | Date;
  firstMissedDueDate?: string | Date | null;
  region: string;
  status?: LoanStatus;
}

export interface UpdateLoanDTO {
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  borrowerAddress?: string;
  loanType?: LoanType;
  totalOutstanding?: number;
  overdueAmount?: number;
  missedEmisCount?: number;
  lastPaymentDate?: string | Date | null;
  nextDueDate?: string | Date;
  firstMissedDueDate?: string | Date | null;
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
