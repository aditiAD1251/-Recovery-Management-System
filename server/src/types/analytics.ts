import { DelinquencyBucket, LoanStatus, LoanType } from './loan.js';
import { LegalCaseStatus, LegalPriority, LegalActionType, NoticeType, NoticeResponseStatus } from './legal.js';
import { ContactMode, AttemptOutcome } from './collectionAttempt.js';
import { PtpStatus } from './promiseToPay.js';

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

// ----------------------------------------------------------------------
// ADMIN ANALYTICS
// ----------------------------------------------------------------------

export interface BucketMetric {
  bucket: DelinquencyBucket;
  count: number;
  totalOverdue: number;
  totalOutstanding: number;
  percentage: number;
}

export interface RegionPerformanceMetric {
  regionId: string;
  name: string;
  code: string;
  totalLoans: number;
  activeLoans: number;
  assignedLoans: number;
  unassignedLoans: number;
  totalOverdue: number;
  totalOutstanding: number;
  settledLoans: number;
  recoveryRate: number;
}

export interface AgentRankingMetric {
  agentId: string;
  name: string;
  employeeCode: string;
  region: string;
  assignedLoans: number;
  assignedOverdue: number;
  attemptsCount: number;
  ptpCount: number;
  ptpKeptCount: number;
  ptpFulfillmentRate: number;
  recoveredAmount: number;
}

export interface StatusDistributionMetric {
  status: LoanStatus;
  count: number;
  totalOutstanding: number;
  totalOverdue: number;
  percentage: number;
}

export interface LoanTypeDistributionMetric {
  loanType: LoanType;
  count: number;
  totalOutstanding: number;
  totalOverdue: number;
  percentage: number;
}

export interface AdminAnalyticsData {
  summary: {
    totalPortfolioAmount: number;
    totalOutstandingAmount: number;
    totalOverdueAmount: number;
    totalLoansCount: number;
    activeLoansCount: number;
    delinquentLoansCount: number;
    npaLoansCount: number;
    settledLoansCount: number;
    settledAmount: number;
    writtenOffLoansCount: number;
    writtenOffAmount: number;
    closedLoansCount: number;
    overallRecoveryRate: number;
  };
  bucketDistribution: BucketMetric[];
  regionalPerformance: RegionPerformanceMetric[];
  agentPerformanceRanking: AgentRankingMetric[];
  statusDistribution: StatusDistributionMetric[];
  loanTypeDistribution: LoanTypeDistributionMetric[];
  settlementOverview: {
    totalProposals: number;
    pendingSupervisor: number;
    pendingLegalHead: number;
    paymentPending: number;
    settledCount: number;
    rejectedCount: number;
    totalProposedAmount: number;
    totalWaivedAmount: number;
    totalPaidAmount: number;
    averageWaiverPercentage: number;
  };
  legalOverview: {
    totalLegalCases: number;
    totalClaimAmount: number;
    totalRecoveredAmount: number;
    casesByStage: Record<string, number>;
    casesByPriority: Record<string, number>;
    noticesDispatched: number;
    hearingsScheduled: number;
    writtenOffCount: number;
    writtenOffAmount: number;
  };
  ptpOverview: {
    totalCreated: number;
    pending: number;
    kept: number;
    broken: number;
    cancelled: number;
    totalPromisedAmount: number;
    totalKeptAmount: number;
    fulfillmentRate: number;
  };
  collectionActivity: {
    totalAttempts: number;
    attemptsByMode: Record<string, number>;
    attemptsByOutcome: Record<string, number>;
    contactRate: number;
  };
  dateRangeApplied?: {
    startDate?: string;
    endDate?: string;
  };
}

// ----------------------------------------------------------------------
// SUPERVISOR ANALYTICS
// ----------------------------------------------------------------------

export interface SupervisorAnalyticsData {
  supervisorInfo: {
    id: string;
    name: string;
    email: string;
    region?: {
      id: string;
      name: string;
      code: string;
    };
  };
  teamSummary: {
    totalTerritoryLoans: number;
    assignedLoans: number;
    unassignedLoans: number;
    totalOverdue: number;
    assignedOverdue: number;
    unassignedOverdue: number;
    totalOutstanding: number;
    recoveredAmount: number;
    activeAgentsCount: number;
  };
  bucketDistribution: BucketMetric[];
  agentWorkloadAndPerformance: AgentRankingMetric[];
  followUpCompliance: {
    dueTodayCount: number;
    upcomingCount: number;
    overdueFollowupsCount: number;
  };
  ptpMetrics: {
    totalCreated: number;
    pending: number;
    kept: number;
    broken: number;
    fulfillmentRate: number;
    promisedAmount: number;
    keptAmount: number;
  };
  settlementsPipeline: {
    pendingSupervisorReview: number;
    paymentPending: number;
    settledInTerritory: number;
  };
  legalEscalationsCount: number;
  dateRangeApplied?: {
    startDate?: string;
    endDate?: string;
  };
}

// ----------------------------------------------------------------------
// AGENT ANALYTICS
// ----------------------------------------------------------------------

export interface AgentAnalyticsData {
  agentProfile: {
    id: string;
    name: string;
    employeeCode: string;
    email: string;
    regionName: string;
  };
  portfolioSummary: {
    totalAssignedLoans: number;
    totalOverdueAmount: number;
    totalOutstandingAmount: number;
    settledCount: number;
    recoveredAmount: number;
    personalRecoveryRate: number;
  };
  bucketDistribution: BucketMetric[];
  collectionActivity: {
    totalAttempts: number;
    attemptsByMode: Record<string, number>;
    attemptsByOutcome: Record<string, number>;
    contactEfficiencyRate: number;
  };
  ptpMetrics: {
    totalCreated: number;
    pending: number;
    kept: number;
    broken: number;
    cancelled: number;
    fulfillmentRate: number;
    totalPromisedAmount: number;
    totalKeptAmount: number;
  };
  followUpAgenda: {
    dueToday: Array<{
      loanId: string;
      accountNumber: string;
      borrowerName: string;
      borrowerPhone: string;
      overdueAmount: number;
      dpd: number;
      nextFollowUpDate: string;
      remarks: string;
    }>;
    upcomingCount: number;
    overdueCount: number;
  };
  settlementsInitiated: {
    total: number;
    pending: number;
    paymentPending: number;
    settled: number;
  };
  legalEscalationsInitiated: number;
  dateRangeApplied?: {
    startDate?: string;
    endDate?: string;
  };
}

// ----------------------------------------------------------------------
// LEGAL HEAD ANALYTICS
// ----------------------------------------------------------------------

export interface LegalAnalyticsData {
  summary: {
    totalLegalCases: number;
    activeLitigationCases: number;
    totalClaimAmount: number;
    totalRecoveredAmount: number;
    litigationRecoveryRate: number;
    noticesSentCount: number;
    awaitingNoticeResponseCount: number;
    overdueNoticeResponsesCount: number;
    hearingsScheduledCount: number;
    writtenOffCount: number;
    totalWrittenOffAmount: number;
    unrecoveredPrincipal: number;
    unrecoveredInterest: number;
  };
  casesByStage: Array<{ stage: LegalCaseStatus; count: number; percentage: number }>;
  casesByPriority: Array<{ priority: LegalPriority; count: number; percentage: number }>;
  casesByType: Array<{ caseType: LegalActionType; count: number; percentage: number }>;
  noticesBreakdown: {
    byType: Record<string, number>;
    byDispatchMode: Record<string, number>;
    byResponseStatus: Record<string, number>;
  };
  upcomingHearings: Array<{
    caseId: string;
    caseNumber: string;
    courtName: string;
    courtCaseNumber?: string;
    stage: string;
    judgeBench?: string;
    borrowerName: string;
    nextHearingDate: string;
    claimAmount: number;
  }>;
  settlementsQueue: {
    awaitingLegalHeadApproval: number;
    paymentPending: number;
    settledUnderLitigation: number;
  };
  writeOffAnalysis: Array<{
    caseNumber: string;
    accountNumber: string;
    borrowerName: string;
    writeOffAmount: number;
    reason: string;
    approvedAt: string;
  }>;
  dateRangeApplied?: {
    startDate?: string;
    endDate?: string;
  };
}

// ----------------------------------------------------------------------
// REPORTS TYPES
// ----------------------------------------------------------------------

export type ReportType =
  | 'portfolio-summary'
  | 'collection-performance'
  | 'agent-performance'
  | 'delinquency-dpd'
  | 'ptp-report'
  | 'settlement-report'
  | 'legal-recovery';

export interface ReportQueryParams {
  startDate?: string;
  endDate?: string;
  region?: string;
  agentId?: string;
  bucket?: string;
  status?: string;
  page?: number;
  limit?: number;
  format?: 'json' | 'csv';
}

export interface ReportResultData {
  reportType: ReportType;
  title: string;
  generatedAt: string;
  generatedBy: {
    id: string;
    name: string;
    role: string;
  };
  filtersApplied: Record<string, any>;
  headers: string[];
  rows: Array<Record<string, any>>;
  summary?: Record<string, any>;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
