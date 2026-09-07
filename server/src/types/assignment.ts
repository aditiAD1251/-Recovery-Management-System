import { DelinquencyBucket } from './loan.js';

export interface IAssignmentPayload {
  agentId: string;
  note?: string;
}

export interface IReassignmentPayload {
  newAgentId: string;
  reason?: string;
}

export interface AgentWorkloadSummary {
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
