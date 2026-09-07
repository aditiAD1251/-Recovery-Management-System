import mongoose from 'mongoose';
import { LoanAccount } from '../models/LoanAccount.js';
import { CollectionAttempt } from '../models/CollectionAttempt.js';
import { PromiseToPay } from '../models/PromiseToPay.js';
import { SettlementRequest } from '../models/SettlementRequest.js';
import { LegalCase } from '../models/LegalCase.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { Region } from '../models/Region.js';
import { User } from '../models/User.js';
import {
  ReportType,
  ReportQueryParams,
  ReportResultData,
} from '../types/analytics.js';
import { AuthUserPayload } from '../types/user.js';

/**
 * RFC 4180 compliant CSV string generator
 * Supports both object records (keyed by header) and 2D value arrays
 */
export const generateCsvString = (
  headers: string[],
  rows: Array<Record<string, any> | (string | number | boolean | null | undefined)[]>
): string => {
  const escapeCell = (cell: any): string => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map(escapeCell).join(',');
    }
    return headers.map((h) => escapeCell(row[h])).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n') + '\r\n';
};

export class ReportService {
  /**
   * Generate structured report data based on report type and applied filters
   */
  static async generateReport(
    reportType: ReportType,
    params: ReportQueryParams,
    requestingUser: AuthUserPayload
  ): Promise<ReportResultData> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(params.limit) || (params.format === 'csv' ? 500 : 50)));
    const skip = (page - 1) * limit;

    // Enforce role-based scoping
    const scopeFilter: Record<string, any> = {};

    if (requestingUser.role === 'SUPERVISOR') {
      const teamAgents = await CollectionAgent.find({ supervisor: requestingUser.id }).select('_id');
      const teamAgentIds = teamAgents.map((a) => a._id);
      scopeFilter.$or = [
        { assignedSupervisor: new mongoose.Types.ObjectId(requestingUser.id) },
        { assignedAgent: { $in: teamAgentIds } },
      ];
    } else if (requestingUser.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({
        user: requestingUser.id,
      }).lean();
      if (agentProfile) {
        scopeFilter.assignedAgent = agentProfile._id;
        scopeFilter.agent = requestingUser.id;
      }
    }

    switch (reportType) {
      case 'portfolio-summary':
        return this.generatePortfolioSummaryReport(params, requestingUser, scopeFilter, skip, limit, page);
      case 'collection-performance':
        return this.generateCollectionPerformanceReport(params, requestingUser, scopeFilter, skip, limit, page);
      case 'agent-performance':
        return this.generateAgentPerformanceReport(params, requestingUser, scopeFilter, skip, limit, page);
      case 'delinquency-dpd':
        return this.generateDelinquencyDpdReport(params, requestingUser, scopeFilter, skip, limit, page);
      case 'ptp-report':
        return this.generatePtpReport(params, requestingUser, scopeFilter, skip, limit, page);
      case 'settlement-report':
        return this.generateSettlementReport(params, requestingUser, scopeFilter, skip, limit, page);
      case 'legal-recovery':
        return this.generateLegalRecoveryReport(params, requestingUser, scopeFilter, skip, limit, page);
      default: {
        const err: any = new Error(`Unknown report type: ${reportType}`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  // 1. Portfolio Summary Report
  private static async generatePortfolioSummaryReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const filter: Record<string, any> = { ...scope };

    if (params.region && mongoose.Types.ObjectId.isValid(params.region)) {
      filter.region = new mongoose.Types.ObjectId(params.region);
    }
    if (params.bucket && params.bucket !== 'ALL') {
      filter.bucket = params.bucket;
    }
    if (params.status && params.status !== 'ALL') {
      filter.status = params.status;
    }

    const [loans, total] = await Promise.all([
      LoanAccount.find(filter)
        .populate('region', 'name code')
        .populate({
          path: 'assignedAgent',
          populate: { path: 'user', select: 'name' },
        })
        .sort({ overdueAmount: -1, dpd: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoanAccount.countDocuments(filter),
    ]);

    const headers = [
      'Account Number',
      'Borrower Name',
      'Phone',
      'Loan Type',
      'Region',
      'Principal (₹)',
      'Total Outstanding (₹)',
      'Overdue Amount (₹)',
      'DPD',
      'Bucket',
      'Missed EMIs',
      'Status',
      'Assigned Agent',
      'Next Due Date',
    ];

    const rows = loans.map((l: any) => {
      const reg = l.region || {};
      const ag = l.assignedAgent?.user || {};
      return {
        'Account Number': l.accountNumber || '',
        'Borrower Name': l.borrowerName || '',
        'Phone': l.borrowerPhone || '',
        'Loan Type': l.loanType || '',
        'Region': reg.name ? `${reg.name} (${reg.code})` : 'Unassigned',
        'Principal (₹)': l.principalAmount || 0,
        'Total Outstanding (₹)': l.totalOutstanding || 0,
        'Overdue Amount (₹)': l.overdueAmount || 0,
        'DPD': l.dpd || 0,
        'Bucket': l.bucket || '',
        'Missed EMIs': l.missedEmisCount || 0,
        'Status': l.status || '',
        'Assigned Agent': ag.name || 'Unassigned',
        'Next Due Date': l.nextDueDate ? new Date(l.nextDueDate).toLocaleDateString('en-GB') : '',
      };
    });

    return {
      reportType: 'portfolio-summary',
      title: 'Executive Portfolio Summary Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { region: params.region, bucket: params.bucket, status: params.status },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // 2. Collection Performance Report
  private static async generateCollectionPerformanceReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const filter: Record<string, any> = {};

    if (scope.agent) {
      filter.agent = scope.agent;
    }

    if (params.startDate || params.endDate) {
      filter.attemptedAt = {};
      if (params.startDate) {
        const s = new Date(params.startDate);
        s.setHours(0, 0, 0, 0);
        filter.attemptedAt.$gte = s;
      }
      if (params.endDate) {
        const e = new Date(params.endDate);
        e.setHours(23, 59, 59, 999);
        filter.attemptedAt.$lte = e;
      }
    }

    const [attempts, total] = await Promise.all([
      CollectionAttempt.find(filter)
        .populate('loanAccount', 'accountNumber borrowerName overdueAmount')
        .populate('agent', 'name email role')
        .sort({ attemptedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CollectionAttempt.countDocuments(filter),
    ]);

    const headers = [
      'Attempt Date',
      'Account Number',
      'Borrower Name',
      'Agent Name',
      'Contact Mode',
      'Outcome',
      'Follow-up Scheduled',
      'Remarks',
    ];

    const rows = attempts.map((a: any) => {
      const l = a.loanAccount || {};
      const ag = a.agent || {};
      return {
        'Attempt Date': a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString('en-GB') : '',
        'Account Number': l.accountNumber || 'N/A',
        'Borrower Name': l.borrowerName || 'N/A',
        'Agent Name': ag.name || 'Agent',
        'Contact Mode': a.contactMode || '',
        'Outcome': (a.outcome || '').replace(/_/g, ' '),
        'Follow-up Scheduled': a.nextFollowUpDate ? new Date(a.nextFollowUpDate).toLocaleDateString('en-GB') : 'None',
        'Remarks': a.remarks || '',
      };
    });

    return {
      reportType: 'collection-performance',
      title: 'Collection Activity & Performance Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { startDate: params.startDate, endDate: params.endDate },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // 3. Agent Performance Report
  private static async generateAgentPerformanceReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const agentFilter: Record<string, any> = { isActive: true };

    if (scope.region) {
      agentFilter.region = scope.region;
    }
    if (params.region && mongoose.Types.ObjectId.isValid(params.region)) {
      agentFilter.region = new mongoose.Types.ObjectId(params.region);
    }

    const agents = await CollectionAgent.find(agentFilter)
      .populate('user', 'name email')
      .populate('region', 'name code')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await CollectionAgent.countDocuments(agentFilter);

    const headers = [
      'Agent Name',
      'Employee Code',
      'Email',
      'Region',
      'Active Assigned Loans',
      'Total Overdue Assigned (₹)',
      'Attempts Logged',
      'PTPs Created',
      'PTPs Kept',
      'PTP Fulfillment (%)',
      'Recovered Amount (₹)',
    ];

    const rows = await Promise.all(
      agents.map(async (ag: any) => {
        const u = ag.user || {};
        const reg = ag.region || {};
        const uId = u._id;

        const [loanSummary, attemptsCount, ptpSummary] = await Promise.all([
          LoanAccount.aggregate([
            {
              $match: {
                assignedAgent: ag._id,
                status: { $nin: ['SETTLED', 'CLOSED'] },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                overdue: { $sum: '$overdueAmount' },
              },
            },
          ]),
          CollectionAttempt.countDocuments({ agent: uId }),
          PromiseToPay.aggregate([
            { $match: { agent: uId } },
            {
              $group: {
                _id: null,
                totalPtp: { $sum: 1 },
                keptPtp: {
                  $sum: { $cond: [{ $eq: ['$status', 'KEPT'] }, 1, 0] },
                },
                recovered: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'KEPT'] }, '$promisedAmount', 0],
                  },
                },
              },
            },
          ]),
        ]);

        const lData = loanSummary[0] || { count: 0, overdue: 0 };
        const pData = ptpSummary[0] || { totalPtp: 0, keptPtp: 0, recovered: 0 };
        const fulfillmentPct =
          pData.totalPtp > 0
            ? Number(((pData.keptPtp / pData.totalPtp) * 100).toFixed(1))
            : 0;

        return {
          'Agent Name': u.name || 'Agent',
          'Employee Code': ag.employeeCode || 'AGT',
          'Email': u.email || '',
          'Region': reg.name || 'Region',
          'Active Assigned Loans': lData.count,
          'Total Overdue Assigned (₹)': lData.overdue,
          'Attempts Logged': attemptsCount,
          'PTPs Created': pData.totalPtp,
          'PTPs Kept': pData.keptPtp,
          'PTP Fulfillment (%)': fulfillmentPct,
          'Recovered Amount (₹)': pData.recovered,
        };
      })
    );

    return {
      reportType: 'agent-performance',
      title: 'Agent Productivity & Recovery Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { region: params.region },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // 4. Delinquency DPD Report
  private static async generateDelinquencyDpdReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const filter: Record<string, any> = {
      dpd: { $gt: 0 },
      status: { $in: ['DELINQUENT', 'DEFAULT'] },
      ...scope,
    };

    if (params.bucket && params.bucket !== 'ALL') {
      filter.bucket = params.bucket;
    }
    if (params.region && mongoose.Types.ObjectId.isValid(params.region)) {
      filter.region = new mongoose.Types.ObjectId(params.region);
    }

    const [loans, total] = await Promise.all([
      LoanAccount.find(filter)
        .populate('region', 'name code')
        .populate({
          path: 'assignedAgent',
          populate: { path: 'user', select: 'name' },
        })
        .sort({ dpd: -1, overdueAmount: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoanAccount.countDocuments(filter),
    ]);

    const headers = [
      'Account Number',
      'Borrower Name',
      'Phone',
      'Region',
      'DPD',
      'Bucket',
      'Overdue Amount (₹)',
      'Total Outstanding (₹)',
      'Missed EMIs',
      'Status',
      'Assigned Agent',
      'First Missed Date',
    ];

    const rows = loans.map((l: any) => {
      const reg = l.region || {};
      const ag = l.assignedAgent?.user || {};
      return {
        'Account Number': l.accountNumber || '',
        'Borrower Name': l.borrowerName || '',
        'Phone': l.borrowerPhone || '',
        'Region': reg.name || 'Territory',
        'DPD': l.dpd || 0,
        'Bucket': l.bucket || '',
        'Overdue Amount (₹)': l.overdueAmount || 0,
        'Total Outstanding (₹)': l.totalOutstanding || 0,
        'Missed EMIs': l.missedEmisCount || 0,
        'Status': l.status || '',
        'Assigned Agent': ag.name || 'Unassigned',
        'First Missed Date': l.firstMissedDueDate ? new Date(l.firstMissedDueDate).toLocaleDateString('en-GB') : 'N/A',
      };
    });

    return {
      reportType: 'delinquency-dpd',
      title: 'Delinquency & DPD Portfolio Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { bucket: params.bucket, region: params.region },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // 5. Promise to Pay (PTP) Report
  private static async generatePtpReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const filter: Record<string, any> = {};

    if (scope.agent) {
      filter.agent = scope.agent;
    }
    if (params.status && params.status !== 'ALL') {
      filter.status = params.status;
    }

    if (params.startDate || params.endDate) {
      filter.promisedDate = {};
      if (params.startDate) {
        const s = new Date(params.startDate);
        s.setHours(0, 0, 0, 0);
        filter.promisedDate.$gte = s;
      }
      if (params.endDate) {
        const e = new Date(params.endDate);
        e.setHours(23, 59, 59, 999);
        filter.promisedDate.$lte = e;
      }
    }

    const [ptps, total] = await Promise.all([
      PromiseToPay.find(filter)
        .populate('loanAccount', 'accountNumber borrowerName overdueAmount')
        .populate('agent', 'name email')
        .sort({ promisedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PromiseToPay.countDocuments(filter),
    ]);

    const headers = [
      'Commitment Date',
      'Account Number',
      'Borrower Name',
      'Agent Name',
      'Promised Amount (₹)',
      'Status',
      'Kept / Resolved Date',
      'Remarks',
    ];

    const rows = ptps.map((p: any) => {
      const l = p.loanAccount || {};
      const ag = p.agent || {};
      return {
        'Commitment Date': p.promisedDate ? new Date(p.promisedDate).toLocaleDateString('en-GB') : '',
        'Account Number': l.accountNumber || 'N/A',
        'Borrower Name': l.borrowerName || 'N/A',
        'Agent Name': ag.name || 'Agent',
        'Promised Amount (₹)': p.promisedAmount || 0,
        'Status': p.status || '',
        'Kept / Resolved Date': p.keptAt ? new Date(p.keptAt).toLocaleDateString('en-GB') : '—',
        'Remarks': p.remarks || '',
      };
    });

    return {
      reportType: 'ptp-report',
      title: 'Promise-to-Pay (PTP) Audit Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { status: params.status, startDate: params.startDate, endDate: params.endDate },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // 6. Settlement Report
  private static async generateSettlementReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const filter: Record<string, any> = {};

    if (params.status && params.status !== 'ALL') {
      filter.status = params.status;
    }

    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        const s = new Date(params.startDate);
        s.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = s;
      }
      if (params.endDate) {
        const e = new Date(params.endDate);
        e.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = e;
      }
    }

    const [settlements, total] = await Promise.all([
      SettlementRequest.find(filter)
        .populate('loanAccount', 'accountNumber borrowerName totalOutstanding')
        .populate('requestedBy', 'name role')
        .populate('reviewedBy', 'name role')
        .populate('settledBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SettlementRequest.countDocuments(filter),
    ]);

    const headers = [
      'Created Date',
      'Account Number',
      'Borrower Name',
      'Original Balance (₹)',
      'Offered Settlement (₹)',
      'Waived Amount (₹)',
      'Waiver (%)',
      'Status',
      'Requested By',
      'Reviewed By',
      'Settled By',
      'Payment Ref',
      'Payment Mode',
      'Paid Amount (₹)',
    ];

    const rows = settlements.map((s: any) => {
      const l = s.loanAccount || {};
      const req = s.requestedBy || {};
      const rev = s.reviewedBy || {};
      const set = s.settledBy || {};
      return {
        'Created Date': s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '',
        'Account Number': l.accountNumber || 'N/A',
        'Borrower Name': l.borrowerName || 'N/A',
        'Original Balance (₹)': s.totalOutstandingAtProposal || l.totalOutstanding || 0,
        'Offered Settlement (₹)': s.proposedAmount || 0,
        'Waived Amount (₹)': s.waivedAmount || 0,
        'Waiver (%)': s.waiverPercentage || 0,
        'Status': (s.status || '').replace(/_/g, ' '),
        'Requested By': req.name ? `${req.name} (${req.role})` : 'System',
        'Reviewed By': rev.name ? `${rev.name} (${rev.role})` : 'Pending',
        'Settled By': set.name ? `${set.name} (${set.role})` : 'Pending',
        'Payment Ref': s.paymentReference || '—',
        'Payment Mode': s.paymentMode || '—',
        'Paid Amount (₹)': s.paidAmount || 0,
      };
    });

    return {
      reportType: 'settlement-report',
      title: 'Settlement Proposals & Recovery Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { status: params.status, startDate: params.startDate, endDate: params.endDate },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // 7. Legal Recovery Report
  private static async generateLegalRecoveryReport(
    params: ReportQueryParams,
    user: AuthUserPayload,
    scope: Record<string, any>,
    skip: number,
    limit: number,
    page: number
  ): Promise<ReportResultData> {
    const filter: Record<string, any> = {};

    if (params.status && params.status !== 'ALL') {
      filter.status = params.status;
    }

    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) {
        const s = new Date(params.startDate);
        s.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = s;
      }
      if (params.endDate) {
        const e = new Date(params.endDate);
        e.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = e;
      }
    }

    const [cases, total] = await Promise.all([
      LegalCase.find(filter)
        .populate('loanAccount', 'accountNumber borrowerName totalOutstanding dpd')
        .populate('escalatedBy', 'name role')
        .populate('assignedLegalOfficer', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LegalCase.countDocuments(filter),
    ]);

    const headers = [
      'Case Number',
      'Account Number',
      'Borrower Name',
      'Action Type',
      'Priority',
      'Status',
      'Claim Amount (₹)',
      'Recovered Amount (₹)',
      'Court Name',
      'Advocate Name',
      'Notices Count',
      'Next Hearing Date',
      'Write-Off (₹)',
    ];

    const rows = cases.map((c: any) => {
      const l = c.loanAccount || {};
      const wo = c.writeOffDetails || {};
      return {
        'Case Number': c.caseNumber || '',
        'Account Number': l.accountNumber || 'N/A',
        'Borrower Name': l.borrowerName || 'N/A',
        'Action Type': (c.caseType || '').replace(/_/g, ' '),
        'Priority': c.priority || 'MEDIUM',
        'Status': (c.status || '').replace(/_/g, ' '),
        'Claim Amount (₹)': c.claimAmount || 0,
        'Recovered Amount (₹)': c.recoveredAmount || 0,
        'Court Name': c.courtName || '—',
        'Advocate Name': c.advocateName || '—',
        'Notices Count': c.notices?.length || 0,
        'Next Hearing Date': c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString('en-GB') : '—',
        'Write-Off (₹)': wo.writeOffAmount || 0,
      };
    });

    return {
      reportType: 'legal-recovery',
      title: 'Legal Recovery & Litigation Report',
      generatedAt: new Date().toISOString(),
      generatedBy: { id: user.id, name: user.name, role: user.role },
      filtersApplied: { status: params.status, startDate: params.startDate, endDate: params.endDate },
      headers,
      rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}
