import { DelinquencyBucket, LoanAccountItem } from './loan';
import { PaginationMeta } from './masterData';

export interface IAssignmentPayload {
  agentId: string;
  note?: string;
}

export interface IReassignmentPayload {
  newAgentId: string;
  reason?: string;
}

export interface AgentWorkloadItem {
  agentId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  region: {
    id: string;
    name: string;
    code: string;
  };
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  assignedCount: number;
  totalOverdue: number;
  totalOutstanding: number;
  highestDpd: number;
  bucketDistribution: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

export interface WorkloadOverviewSummary {
  totalLoans: number;
  unassignedCount: number;
  assignedCount: number;
  totalOverdue: number;
  unassignedOverdue: number;
  assignedOverdue: number;
  unassignedByBucket: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
  assignedByBucket: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
  };
}

export interface WorkloadSummaryResponse {
  success: boolean;
  message: string;
  data: {
    summary: WorkloadOverviewSummary;
  };
}

export interface AgentWorkloadsResponse {
  success: boolean;
  message: string;
  data: {
    agents: AgentWorkloadItem[];
    total: number;
  };
}

export interface UnassignedLoansResponse {
  success: boolean;
  message: string;
  data: {
    loans: LoanAccountItem[];
    pagination: PaginationMeta;
  };
}
