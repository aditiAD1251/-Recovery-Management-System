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
  AdminAnalyticsData,
  SupervisorAnalyticsData,
  AgentAnalyticsData,
  LegalAnalyticsData,
  DateRangeQuery,
  BucketMetric,
  RegionPerformanceMetric,
  AgentRankingMetric,
  StatusDistributionMetric,
  LoanTypeDistributionMetric,
} from '../types/analytics.js';
import { DelinquencyBucket, LoanStatus, LoanType } from '../types/loan.js';

/**
 * Helper to build safe date range filter for MongoDB
 */
const buildDateFilter = (
  dateField: string,
  range?: DateRangeQuery
): Record<string, any> => {
  if (!range || (!range.startDate && !range.endDate)) {
    return {};
  }

  const filter: Record<string, any> = {};
  if (range.startDate) {
    const sDate = new Date(range.startDate);
    if (!isNaN(sDate.getTime())) {
      sDate.setHours(0, 0, 0, 0);
      filter.$gte = sDate;
    }
  }

  if (range.endDate) {
    const eDate = new Date(range.endDate);
    if (!isNaN(eDate.getTime())) {
      eDate.setHours(23, 59, 59, 999);
      filter.$lte = eDate;
    }
  }

  return Object.keys(filter).length > 0 ? { [dateField]: filter } : {};
};

export class AnalyticsService {
  /**
   * ======================================================================
   * 1. ADMIN / EXECUTIVE ANALYTICS
   * ======================================================================
   */
  static async getAdminAnalytics(
    range?: DateRangeQuery
  ): Promise<AdminAnalyticsData> {
    const activityDateFilter = buildDateFilter('createdAt', range);
    const attemptDateFilter = buildDateFilter('attemptedAt', range);

    // 1. Portfolio Aggregations from LoanAccount
    const [loanOverviewAgg, bucketAgg, statusAgg, typeAgg, regionAgg] =
      await Promise.all([
        LoanAccount.aggregate([
          {
            $group: {
              _id: null,
              totalPortfolioAmount: { $sum: '$principalAmount' },
              totalOutstandingAmount: { $sum: '$totalOutstanding' },
              totalOverdueAmount: { $sum: '$overdueAmount' },
              totalLoansCount: { $sum: 1 },
              activeLoansCount: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['CURRENT', 'DELINQUENT', 'DEFAULT']] },
                    1,
                    0,
                  ],
                },
              },
              delinquentLoansCount: {
                $sum: { $cond: [{ $eq: ['$status', 'DELINQUENT'] }, 1, 0] },
              },
              npaLoansCount: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$status', 'DEFAULT'] },
                        { $gt: ['$dpd', 90] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              settledLoansCount: {
                $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
              },
              writtenOffLoansCount: {
                $sum: { $cond: [{ $eq: ['$status', 'WRITTEN_OFF'] }, 1, 0] },
              },
              closedLoansCount: {
                $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] },
              },
            },
          },
        ]),

        // Bucket distribution
        LoanAccount.aggregate([
          {
            $group: {
              _id: '$bucket',
              count: { $sum: 1 },
              totalOverdue: { $sum: '$overdueAmount' },
              totalOutstanding: { $sum: '$totalOutstanding' },
            },
          },
        ]),

        // Status distribution
        LoanAccount.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalOutstanding: { $sum: '$totalOutstanding' },
              totalOverdue: { $sum: '$overdueAmount' },
            },
          },
        ]),

        // Loan Type distribution
        LoanAccount.aggregate([
          {
            $group: {
              _id: '$loanType',
              count: { $sum: 1 },
              totalOutstanding: { $sum: '$totalOutstanding' },
              totalOverdue: { $sum: '$overdueAmount' },
            },
          },
        ]),

        // Regional loan rollups
        LoanAccount.aggregate([
          {
            $group: {
              _id: '$region',
              totalLoans: { $sum: 1 },
              activeLoans: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['CURRENT', 'DELINQUENT', 'DEFAULT']] },
                    1,
                    0,
                  ],
                },
              },
              assignedLoans: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$assignedAgent', null] },
                        { $gt: ['$assignedAgent', null] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              unassignedLoans: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$assignedAgent', null] },
                        { $not: ['$assignedAgent'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalOverdue: { $sum: '$overdueAmount' },
              totalOutstanding: { $sum: '$totalOutstanding' },
              settledLoans: {
                $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
              },
            },
          },
        ]),
      ]);

    const overview = loanOverviewAgg[0] || {
      totalPortfolioAmount: 0,
      totalOutstandingAmount: 0,
      totalOverdueAmount: 0,
      totalLoansCount: 0,
      activeLoansCount: 0,
      delinquentLoansCount: 0,
      npaLoansCount: 0,
      settledLoansCount: 0,
      writtenOffLoansCount: 0,
      closedLoansCount: 0,
    };

    // 2. Settlement Analytics
    const settlementAgg = await SettlementRequest.aggregate([
      { $match: activityDateFilter },
      {
        $group: {
          _id: null,
          totalProposals: { $sum: 1 },
          pendingSupervisor: {
            $sum: {
              $cond: [{ $eq: ['$status', 'PENDING_SUPERVISOR'] }, 1, 0],
            },
          },
          pendingLegalHead: {
            $sum: {
              $cond: [{ $eq: ['$status', 'PENDING_LEGAL_HEAD'] }, 1, 0],
            },
          },
          paymentPending: {
            $sum: { $cond: [{ $eq: ['$status', 'PAYMENT_PENDING'] }, 1, 0] },
          },
          settledCount: {
            $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] },
          },
          totalProposedAmount: { $sum: '$proposedAmount' },
          totalWaivedAmount: { $sum: '$waivedAmount' },
          totalPaidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'SETTLED'] }, '$paidAmount', 0],
            },
          },
          avgWaiverPct: { $avg: '$waiverPercentage' },
        },
      },
    ]);

    const settlementData = settlementAgg[0] || {
      totalProposals: 0,
      pendingSupervisor: 0,
      pendingLegalHead: 0,
      paymentPending: 0,
      settledCount: 0,
      rejectedCount: 0,
      totalProposedAmount: 0,
      totalWaivedAmount: 0,
      totalPaidAmount: 0,
      avgWaiverPct: 0,
    };

    // 3. Legal Recovery Analytics
    const legalAgg = await LegalCase.aggregate([
      { $match: activityDateFilter },
      {
        $group: {
          _id: null,
          totalLegalCases: { $sum: 1 },
          totalClaimAmount: { $sum: '$claimAmount' },
          totalRecoveredAmount: { $sum: '$recoveredAmount' },
          noticesDispatched: { $sum: { $size: { $ifNull: ['$notices', []] } } },
          hearingsScheduled: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$nextHearingDate', null] },
                    { $gt: ['$nextHearingDate', new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          writtenOffCount: {
            $sum: { $cond: [{ $eq: ['$status', 'WRITTEN_OFF'] }, 1, 0] },
          },
          writtenOffAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'WRITTEN_OFF'] },
                { $ifNull: ['$writeOffDetails.writeOffAmount', '$claimAmount'] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const legalData = legalAgg[0] || {
      totalLegalCases: 0,
      totalClaimAmount: 0,
      totalRecoveredAmount: 0,
      noticesDispatched: 0,
      hearingsScheduled: 0,
      writtenOffCount: 0,
      writtenOffAmount: 0,
    };

    // Legal stages breakdown
    const legalStagesAgg = await LegalCase.aggregate([
      { $match: activityDateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const casesByStage: Record<string, number> = {};
    for (const item of legalStagesAgg) {
      if (item._id) casesByStage[item._id] = item.count;
    }

    // Legal priority breakdown
    const legalPriorityAgg = await LegalCase.aggregate([
      { $match: activityDateFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const casesByPriority: Record<string, number> = {};
    for (const item of legalPriorityAgg) {
      if (item._id) casesByPriority[item._id] = item.count;
    }

    // 4. Promise-to-Pay Analytics
    const ptpAgg = await PromiseToPay.aggregate([
      { $match: activityDateFilter },
      {
        $group: {
          _id: null,
          totalCreated: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          kept: { $sum: { $cond: [{ $eq: ['$status', 'KEPT'] }, 1, 0] } },
          broken: { $sum: { $cond: [{ $eq: ['$status', 'BROKEN'] }, 1, 0] } },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
          },
          totalPromisedAmount: { $sum: '$promisedAmount' },
          totalKeptAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'KEPT'] }, '$promisedAmount', 0],
            },
          },
        },
      },
    ]);

    const ptpData = ptpAgg[0] || {
      totalCreated: 0,
      pending: 0,
      kept: 0,
      broken: 0,
      cancelled: 0,
      totalPromisedAmount: 0,
      totalKeptAmount: 0,
    };

    const resolvedPtpCount = ptpData.kept + ptpData.broken;
    const ptpFulfillmentRate =
      resolvedPtpCount > 0
        ? Number(((ptpData.kept / resolvedPtpCount) * 100).toFixed(1))
        : 0;

    // 5. Collection Attempt Activity
    const attemptAgg = await CollectionAttempt.aggregate([
      { $match: attemptDateFilter },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          contactedCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$outcome',
                    ['CONTACTED', 'PROMISE_TO_PAY', 'CALLBACK_REQUESTED'],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const attemptData = attemptAgg[0] || { totalAttempts: 0, contactedCount: 0 };
    const contactRate =
      attemptData.totalAttempts > 0
        ? Number(
            (
              (attemptData.contactedCount / attemptData.totalAttempts) *
              100
            ).toFixed(1)
          )
        : 0;

    const attemptsByModeAgg = await CollectionAttempt.aggregate([
      { $match: attemptDateFilter },
      { $group: { _id: '$contactMode', count: { $sum: 1 } } },
    ]);
    const attemptsByMode: Record<string, number> = {};
    for (const m of attemptsByModeAgg) {
      if (m._id) attemptsByMode[m._id] = m.count;
    }

    const attemptsByOutcomeAgg = await CollectionAttempt.aggregate([
      { $match: attemptDateFilter },
      { $group: { _id: '$outcome', count: { $sum: 1 } } },
    ]);
    const attemptsByOutcome: Record<string, number> = {};
    for (const o of attemptsByOutcomeAgg) {
      if (o._id) attemptsByOutcome[o._id] = o.count;
    }

    // 6. Regional Performance Formatting
    const allRegions = await Region.find({ isActive: true }).lean();
    const regionMap = new Map(allRegions.map((r) => [r._id.toString(), r]));

    const regionalPerformance: RegionPerformanceMetric[] = regionAgg.map(
      (r: any) => {
        const regId = r._id ? r._id.toString() : '';
        const regInfo = regionMap.get(regId);
        const resolved = r.settledLoans || 0;
        const total = r.totalLoans || 1;
        const recoveryRate = Number(((resolved / total) * 100).toFixed(1));

        return {
          regionId: regId,
          name: regInfo?.name || 'Unassigned / Global',
          code: regInfo?.code || 'GLB',
          totalLoans: r.totalLoans || 0,
          activeLoans: r.activeLoans || 0,
          assignedLoans: r.assignedLoans || 0,
          unassignedLoans: r.unassignedLoans || 0,
          totalOverdue: r.totalOverdue || 0,
          totalOutstanding: r.totalOutstanding || 0,
          settledLoans: r.settledLoans || 0,
          recoveryRate,
        };
      }
    );

    // 7. Agent Performance Ranking
    const agents = await CollectionAgent.find({ isActive: true })
      .populate('user', 'name email role')
      .populate('region', 'name code')
      .lean();

    const agentIds = agents.map((a) => a._id);
    const agentUserIds = agents
      .map((a: any) => (a.user?._id ? a.user._id : a.user))
      .filter(Boolean);

    const [agentLoansAgg, agentAttemptsAgg, agentPtpAgg] = await Promise.all([
      LoanAccount.aggregate([
        {
          $match: {
            assignedAgent: { $in: agentIds },
            status: { $nin: ['SETTLED', 'CLOSED'] },
          },
        },
        {
          $group: {
            _id: '$assignedAgent',
            assignedLoans: { $sum: 1 },
            assignedOverdue: { $sum: '$overdueAmount' },
          },
        },
      ]),
      CollectionAttempt.aggregate([
        {
          $match: {
            agent: { $in: agentUserIds },
            ...attemptDateFilter,
          },
        },
        { $group: { _id: '$agent', attemptsCount: { $sum: 1 } } },
      ]),
      PromiseToPay.aggregate([
        {
          $match: {
            agent: { $in: agentUserIds },
            ...activityDateFilter,
          },
        },
        {
          $group: {
            _id: '$agent',
            ptpCount: { $sum: 1 },
            ptpKeptCount: {
              $sum: { $cond: [{ $eq: ['$status', 'KEPT'] }, 1, 0] },
            },
            recoveredAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'KEPT'] }, '$promisedAmount', 0],
              },
            },
          },
        },
      ]),
    ]);

    const agentLoanMap = new Map(
      agentLoansAgg.map((a) => [a._id.toString(), a])
    );
    const agentAttemptMap = new Map(
      agentAttemptsAgg.map((a) => [a._id.toString(), a.attemptsCount])
    );
    const agentPtpMap = new Map(agentPtpAgg.map((a) => [a._id.toString(), a]));

    const agentPerformanceRanking: AgentRankingMetric[] = agents.map(
      (agent: any) => {
        const u = agent.user || {};
        const reg = agent.region || {};
        const uId = u._id ? u._id.toString() : '';
        const agId = agent._id.toString();

        const lData = agentLoanMap.get(agId) || {
          assignedLoans: 0,
          assignedOverdue: 0,
        };
        const attempts = agentAttemptMap.get(uId) || 0;
        const ptp = agentPtpMap.get(uId) || {
          ptpCount: 0,
          ptpKeptCount: 0,
          recoveredAmount: 0,
        };
        const ptpFulfillmentRate =
          ptp.ptpCount > 0
            ? Number(((ptp.ptpKeptCount / ptp.ptpCount) * 100).toFixed(1))
            : 0;

        return {
          agentId: agId,
          name: u.name || 'Agent',
          employeeCode: agent.employeeCode || 'AGT',
          region: reg.name || 'Territory',
          assignedLoans: lData.assignedLoans,
          assignedOverdue: lData.assignedOverdue,
          attemptsCount: attempts,
          ptpCount: ptp.ptpCount,
          ptpKeptCount: ptp.ptpKeptCount,
          ptpFulfillmentRate,
          recoveredAmount: ptp.recoveredAmount,
        };
      }
    );

    // Sort ranking by recovered amount and attempts
    agentPerformanceRanking.sort(
      (a, b) => b.recoveredAmount - a.recoveredAmount || b.attemptsCount - a.attemptsCount
    );

    // 8. Distributions (Bucket, Status, LoanType)
    const allBuckets: DelinquencyBucket[] = ['0-30', '31-60', '61-90', '90+'];
    const totalLoansCount = overview.totalLoansCount || 1;

    const bucketMap = new Map(bucketAgg.map((b) => [b._id, b]));
    const bucketDistribution: BucketMetric[] = allBuckets.map((bKey) => {
      const found = bucketMap.get(bKey) || {
        count: 0,
        totalOverdue: 0,
        totalOutstanding: 0,
      };
      return {
        bucket: bKey,
        count: found.count,
        totalOverdue: found.totalOverdue,
        totalOutstanding: found.totalOutstanding,
        percentage: Number(((found.count / totalLoansCount) * 100).toFixed(1)),
      };
    });

    const allStatuses: LoanStatus[] = [
      'CURRENT',
      'DELINQUENT',
      'DEFAULT',
      'SETTLED',
      'WRITTEN_OFF',
      'CLOSED',
    ];
    const statusMap = new Map(statusAgg.map((s) => [s._id, s]));
    const statusDistribution: StatusDistributionMetric[] = allStatuses.map(
      (sKey) => {
        const found = statusMap.get(sKey) || {
          count: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
        };
        return {
          status: sKey,
          count: found.count,
          totalOutstanding: found.totalOutstanding,
          totalOverdue: found.totalOverdue,
          percentage: Number(((found.count / totalLoansCount) * 100).toFixed(1)),
        };
      }
    );

    const allTypes: LoanType[] = [
      'PERSONAL',
      'HOME',
      'AUTO',
      'BUSINESS',
      'CREDIT_CARD',
    ];
    const typeMap = new Map(typeAgg.map((t) => [t._id, t]));
    const loanTypeDistribution: LoanTypeDistributionMetric[] = allTypes.map(
      (tKey) => {
        const found = typeMap.get(tKey) || {
          count: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
        };
        return {
          loanType: tKey,
          count: found.count,
          totalOutstanding: found.totalOutstanding,
          totalOverdue: found.totalOverdue,
          percentage: Number(((found.count / totalLoansCount) * 100).toFixed(1)),
        };
      }
    );

    // Calculate Overall Recovery Rate
    const totalSettledAmount = settlementData.totalPaidAmount || 0;
    const totalLitigationRecovered = legalData.totalRecoveredAmount || 0;
    const totalCollected = totalSettledAmount + totalLitigationRecovered;
    const totalDenominator =
      overview.totalOutstandingAmount + totalCollected;
    const overallRecoveryRate =
      totalDenominator > 0
        ? Number(((totalCollected / totalDenominator) * 100).toFixed(1))
        : 0;

    return {
      summary: {
        totalPortfolioAmount: overview.totalPortfolioAmount || 0,
        totalOutstandingAmount: overview.totalOutstandingAmount || 0,
        totalOverdueAmount: overview.totalOverdueAmount || 0,
        totalLoansCount: overview.totalLoansCount || 0,
        activeLoansCount: overview.activeLoansCount || 0,
        delinquentLoansCount: overview.delinquentLoansCount || 0,
        npaLoansCount: overview.npaLoansCount || 0,
        settledLoansCount: overview.settledLoansCount || 0,
        settledAmount: totalSettledAmount,
        writtenOffLoansCount: overview.writtenOffLoansCount || 0,
        writtenOffAmount: legalData.writtenOffAmount || 0,
        closedLoansCount: overview.closedLoansCount || 0,
        overallRecoveryRate,
      },
      bucketDistribution,
      regionalPerformance,
      agentPerformanceRanking,
      statusDistribution,
      loanTypeDistribution,
      settlementOverview: {
        totalProposals: settlementData.totalProposals,
        pendingSupervisor: settlementData.pendingSupervisor,
        pendingLegalHead: settlementData.pendingLegalHead,
        paymentPending: settlementData.paymentPending,
        settledCount: settlementData.settledCount,
        rejectedCount: settlementData.rejectedCount,
        totalProposedAmount: settlementData.totalProposedAmount,
        totalWaivedAmount: settlementData.totalWaivedAmount,
        totalPaidAmount: settlementData.totalPaidAmount,
        averageWaiverPercentage: Number(
          (settlementData.avgWaiverPct || 0).toFixed(1)
        ),
      },
      legalOverview: {
        totalLegalCases: legalData.totalLegalCases,
        totalClaimAmount: legalData.totalClaimAmount,
        totalRecoveredAmount: legalData.totalRecoveredAmount,
        casesByStage,
        casesByPriority,
        noticesDispatched: legalData.noticesDispatched,
        hearingsScheduled: legalData.hearingsScheduled,
        writtenOffCount: legalData.writtenOffCount,
        writtenOffAmount: legalData.writtenOffAmount,
      },
      ptpOverview: {
        totalCreated: ptpData.totalCreated,
        pending: ptpData.pending,
        kept: ptpData.kept,
        broken: ptpData.broken,
        cancelled: ptpData.cancelled,
        totalPromisedAmount: ptpData.totalPromisedAmount,
        totalKeptAmount: ptpData.totalKeptAmount,
        fulfillmentRate: ptpFulfillmentRate,
      },
      collectionActivity: {
        totalAttempts: attemptData.totalAttempts,
        attemptsByMode,
        attemptsByOutcome,
        contactRate,
      },
      dateRangeApplied: range?.startDate || range?.endDate ? range : undefined,
    };
  }

  /**
   * ======================================================================
   * 2. SUPERVISOR ANALYTICS (Scoped to Supervisor Region & Team)
   * ======================================================================
   */
  static async getSupervisorAnalytics(
    supervisorUserId: string,
    range?: DateRangeQuery
  ): Promise<SupervisorAnalyticsData> {
    const supervisor = await User.findById(supervisorUserId)
      .populate('region')
      .lean();

    if (!supervisor) {
      const err: any = new Error('Supervisor user not found');
      err.statusCode = 404;
      throw err;
    }

    const activityDateFilter = buildDateFilter('createdAt', range);
    const attemptDateFilter = buildDateFilter('attemptedAt', range);

    // 1. Identify Agents under this Supervisor
    const teamAgents = await CollectionAgent.find({ supervisor: supervisor._id })
      .populate('user', 'name email role isActive')
      .populate('region', 'name code')
      .lean();

    const teamAgentIds = teamAgents.map((a) => a._id);
    const teamAgentUserIds = teamAgents
      .map((a: any) => (a.user?._id ? a.user._id : a.user))
      .filter(Boolean);

    // 2. Identify Scoped Loans (assigned to supervisor directly or to team agents)
    const loanScopeFilter: Record<string, any> = {
      $or: [
        { assignedSupervisor: supervisor._id },
        { assignedAgent: { $in: teamAgentIds } },
      ],
    };

    // 3. Team Summary Aggregations
    const [teamSummaryAgg, teamBucketAgg] = await Promise.all([
      LoanAccount.aggregate([
        { $match: loanScopeFilter },
        {
          $group: {
            _id: null,
            totalTerritoryLoans: { $sum: 1 },
            assignedLoans: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$assignedAgent', null] },
                      { $gt: ['$assignedAgent', null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            unassignedLoans: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$assignedAgent', null] },
                      { $not: ['$assignedAgent'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalOverdue: { $sum: '$overdueAmount' },
            assignedOverdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$assignedAgent', null] },
                      { $gt: ['$assignedAgent', null] },
                    ],
                  },
                  '$overdueAmount',
                  0,
                ],
              },
            },
            unassignedOverdue: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$assignedAgent', null] },
                      { $not: ['$assignedAgent'] },
                    ],
                  },
                  '$overdueAmount',
                  0,
                ],
              },
            },
            totalOutstanding: { $sum: '$totalOutstanding' },
          },
        },
      ]),

      LoanAccount.aggregate([
        { $match: loanScopeFilter },
        {
          $group: {
            _id: '$bucket',
            count: { $sum: 1 },
            totalOverdue: { $sum: '$overdueAmount' },
            totalOutstanding: { $sum: '$totalOutstanding' },
          },
        },
      ]),
    ]);

    const summaryData = teamSummaryAgg[0] || {
      totalTerritoryLoans: 0,
      assignedLoans: 0,
      unassignedLoans: 0,
      totalOverdue: 0,
      assignedOverdue: 0,
      unassignedOverdue: 0,
      totalOutstanding: 0,
    };

    // 4. Team Agent Workload & Performance
    const [agentLoansAgg, agentAttemptsAgg, agentPtpAgg] = await Promise.all([
      LoanAccount.aggregate([
        {
          $match: {
            assignedAgent: { $in: teamAgentIds },
            status: { $nin: ['SETTLED', 'CLOSED'] },
          },
        },
        {
          $group: {
            _id: '$assignedAgent',
            assignedLoans: { $sum: 1 },
            assignedOverdue: { $sum: '$overdueAmount' },
          },
        },
      ]),
      CollectionAttempt.aggregate([
        {
          $match: {
            agent: { $in: teamAgentUserIds },
            ...attemptDateFilter,
          },
        },
        { $group: { _id: '$agent', attemptsCount: { $sum: 1 } } },
      ]),
      PromiseToPay.aggregate([
        {
          $match: {
            agent: { $in: teamAgentUserIds },
            ...activityDateFilter,
          },
        },
        {
          $group: {
            _id: '$agent',
            ptpCount: { $sum: 1 },
            ptpKeptCount: {
              $sum: { $cond: [{ $eq: ['$status', 'KEPT'] }, 1, 0] },
            },
            recoveredAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'KEPT'] }, '$promisedAmount', 0],
              },
            },
          },
        },
      ]),
    ]);

    const agentLoanMap = new Map(
      agentLoansAgg.map((a) => [a._id.toString(), a])
    );
    const agentAttemptMap = new Map(
      agentAttemptsAgg.map((a) => [a._id.toString(), a.attemptsCount])
    );
    const agentPtpMap = new Map(agentPtpAgg.map((a) => [a._id.toString(), a]));

    const agentWorkloadAndPerformance: AgentRankingMetric[] = teamAgents.map(
      (agent: any) => {
        const u = agent.user || {};
        const reg = agent.region || {};
        const uId = u._id ? u._id.toString() : '';
        const agId = agent._id.toString();

        const lData = agentLoanMap.get(agId) || {
          assignedLoans: 0,
          assignedOverdue: 0,
        };
        const attempts = agentAttemptMap.get(uId) || 0;
        const ptp = agentPtpMap.get(uId) || {
          ptpCount: 0,
          ptpKeptCount: 0,
          recoveredAmount: 0,
        };
        const ptpFulfillmentRate =
          ptp.ptpCount > 0
            ? Number(((ptp.ptpKeptCount / ptp.ptpCount) * 100).toFixed(1))
            : 0;

        return {
          agentId: agId,
          name: u.name || 'Agent',
          employeeCode: agent.employeeCode || 'AGT',
          region: reg.name || 'Territory',
          assignedLoans: lData.assignedLoans,
          assignedOverdue: lData.assignedOverdue,
          attemptsCount: attempts,
          ptpCount: ptp.ptpCount,
          ptpKeptCount: ptp.ptpKeptCount,
          ptpFulfillmentRate,
          recoveredAmount: ptp.recoveredAmount,
        };
      }
    );

    const totalTeamRecovered = agentWorkloadAndPerformance.reduce(
      (acc, a) => acc + a.recoveredAmount,
      0
    );

    // 5. Follow-up Compliance for Team
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const [dueTodayCount, upcomingCount, overdueFollowupsCount] =
      await Promise.all([
        CollectionAttempt.countDocuments({
          agent: { $in: teamAgentUserIds },
          nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
        }),
        CollectionAttempt.countDocuments({
          agent: { $in: teamAgentUserIds },
          nextFollowUpDate: { $gt: endOfToday },
        }),
        CollectionAttempt.countDocuments({
          agent: { $in: teamAgentUserIds },
          nextFollowUpDate: { $lt: startOfToday },
        }),
      ]);

    // 6. PTP Metrics for Team
    const teamPtpAgg = await PromiseToPay.aggregate([
      {
        $match: {
          agent: { $in: teamAgentUserIds },
          ...activityDateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalCreated: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          kept: { $sum: { $cond: [{ $eq: ['$status', 'KEPT'] }, 1, 0] } },
          broken: { $sum: { $cond: [{ $eq: ['$status', 'BROKEN'] }, 1, 0] } },
          promisedAmount: { $sum: '$promisedAmount' },
          keptAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'KEPT'] }, '$promisedAmount', 0],
            },
          },
        },
      },
    ]);

    const ptpData = teamPtpAgg[0] || {
      totalCreated: 0,
      pending: 0,
      kept: 0,
      broken: 0,
      promisedAmount: 0,
      keptAmount: 0,
    };

    const resolvedPtp = ptpData.kept + ptpData.broken;
    const ptpFulfillmentRate =
      resolvedPtp > 0
        ? Number(((ptpData.kept / resolvedPtp) * 100).toFixed(1))
        : 0;

    // 7. Settlement & Legal Pipeline in Territory
    const scopedLoanIds = (
      await LoanAccount.find(loanScopeFilter).select('_id').lean()
    ).map((l) => l._id);

    const [settlementsAgg, legalEscalationsCount] = await Promise.all([
      SettlementRequest.aggregate([
        {
          $match: {
            loanAccount: { $in: scopedLoanIds },
            ...activityDateFilter,
          },
        },
        {
          $group: {
            _id: null,
            pendingSupervisorReview: {
              $sum: {
                $cond: [{ $eq: ['$status', 'PENDING_SUPERVISOR'] }, 1, 0],
              },
            },
            paymentPending: {
              $sum: { $cond: [{ $eq: ['$status', 'PAYMENT_PENDING'] }, 1, 0] },
            },
            settledInTerritory: {
              $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
            },
          },
        },
      ]),
      LegalCase.countDocuments({
        loanAccount: { $in: scopedLoanIds },
        ...activityDateFilter,
      }),
    ]);

    const settlementsData = settlementsAgg[0] || {
      pendingSupervisorReview: 0,
      paymentPending: 0,
      settledInTerritory: 0,
    };

    // 8. Territory Bucket Distribution
    const allBuckets: DelinquencyBucket[] = ['0-30', '31-60', '61-90', '90+'];
    const totalTerritoryLoans = summaryData.totalTerritoryLoans || 1;
    const teamBucketMap = new Map(teamBucketAgg.map((b) => [b._id, b]));

    const bucketDistribution: BucketMetric[] = allBuckets.map((bKey) => {
      const found = teamBucketMap.get(bKey) || {
        count: 0,
        totalOverdue: 0,
        totalOutstanding: 0,
      };
      return {
        bucket: bKey,
        count: found.count,
        totalOverdue: found.totalOverdue,
        totalOutstanding: found.totalOutstanding,
        percentage: Number(
          ((found.count / totalTerritoryLoans) * 100).toFixed(1)
        ),
      };
    });

    const firstAgentReg: any = teamAgents.find((a: any) => a.region)?.region || null;

    return {
      supervisorInfo: {
        id: supervisor._id.toString(),
        name: supervisor.name,
        email: supervisor.email,
        region: firstAgentReg
          ? {
              id: firstAgentReg._id ? firstAgentReg._id.toString() : firstAgentReg.toString(),
              name: firstAgentReg.name || 'Assigned Region',
              code: firstAgentReg.code || 'REG',
            }
          : undefined,
      },
      teamSummary: {
        totalTerritoryLoans: summaryData.totalTerritoryLoans,
        assignedLoans: summaryData.assignedLoans,
        unassignedLoans: summaryData.unassignedLoans,
        totalOverdue: summaryData.totalOverdue,
        assignedOverdue: summaryData.assignedOverdue,
        unassignedOverdue: summaryData.unassignedOverdue,
        totalOutstanding: summaryData.totalOutstanding,
        recoveredAmount: totalTeamRecovered,
        activeAgentsCount: teamAgents.length,
      },
      bucketDistribution,
      agentWorkloadAndPerformance,
      followUpCompliance: {
        dueTodayCount,
        upcomingCount,
        overdueFollowupsCount,
      },
      ptpMetrics: {
        totalCreated: ptpData.totalCreated,
        pending: ptpData.pending,
        kept: ptpData.kept,
        broken: ptpData.broken,
        fulfillmentRate: ptpFulfillmentRate,
        promisedAmount: ptpData.promisedAmount,
        keptAmount: ptpData.keptAmount,
      },
      settlementsPipeline: {
        pendingSupervisorReview: settlementsData.pendingSupervisorReview,
        paymentPending: settlementsData.paymentPending,
        settledInTerritory: settlementsData.settledInTerritory,
      },
      legalEscalationsCount,
      dateRangeApplied: range?.startDate || range?.endDate ? range : undefined,
    };
  }

  /**
   * ======================================================================
   * 3. AGENT ANALYTICS (Strictly Scoped to Authenticated Agent)
   * ======================================================================
   */
  static async getAgentAnalytics(
    agentUserId: string,
    range?: DateRangeQuery
  ): Promise<AgentAnalyticsData> {
    const user = await User.findById(agentUserId).lean();
    if (!user) {
      const err: any = new Error('Agent user profile not found');
      err.statusCode = 404;
      throw err;
    }

    const agentProfile = await CollectionAgent.findOne({ user: user._id })
      .populate('region', 'name code')
      .lean();

    const activityDateFilter = buildDateFilter('createdAt', range);
    const attemptDateFilter = buildDateFilter('attemptedAt', range);

    const agentObjectId = agentProfile ? agentProfile._id : null;

    // 1. Portfolio Aggregations for Assigned Loans
    const [portfolioAgg, bucketAgg] = await Promise.all([
      LoanAccount.aggregate([
        { $match: { assignedAgent: agentObjectId } },
        {
          $group: {
            _id: null,
            totalAssignedLoans: { $sum: 1 },
            totalOverdueAmount: { $sum: '$overdueAmount' },
            totalOutstandingAmount: { $sum: '$totalOutstanding' },
            settledCount: {
              $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
            },
          },
        },
      ]),

      LoanAccount.aggregate([
        { $match: { assignedAgent: agentObjectId } },
        {
          $group: {
            _id: '$bucket',
            count: { $sum: 1 },
            totalOverdue: { $sum: '$overdueAmount' },
            totalOutstanding: { $sum: '$totalOutstanding' },
          },
        },
      ]),
    ]);

    const portData = portfolioAgg[0] || {
      totalAssignedLoans: 0,
      totalOverdueAmount: 0,
      totalOutstandingAmount: 0,
      settledCount: 0,
    };

    // 2. Attempts Breakdown & Efficiency
    const [attemptAgg, attemptsByModeAgg, attemptsByOutcomeAgg] =
      await Promise.all([
        CollectionAttempt.aggregate([
          {
            $match: {
              agent: user._id,
              ...attemptDateFilter,
            },
          },
          {
            $group: {
              _id: null,
              totalAttempts: { $sum: 1 },
              contactedCount: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$outcome',
                        ['CONTACTED', 'PROMISE_TO_PAY', 'CALLBACK_REQUESTED'],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),

        CollectionAttempt.aggregate([
          {
            $match: {
              agent: user._id,
              ...attemptDateFilter,
            },
          },
          { $group: { _id: '$contactMode', count: { $sum: 1 } } },
        ]),

        CollectionAttempt.aggregate([
          {
            $match: {
              agent: user._id,
              ...attemptDateFilter,
            },
          },
          { $group: { _id: '$outcome', count: { $sum: 1 } } },
        ]),
      ]);

    const attData = attemptAgg[0] || { totalAttempts: 0, contactedCount: 0 };
    const contactEfficiencyRate =
      attData.totalAttempts > 0
        ? Number(
            ((attData.contactedCount / attData.totalAttempts) * 100).toFixed(1)
          )
        : 0;

    const attemptsByMode: Record<string, number> = {};
    for (const m of attemptsByModeAgg) {
      if (m._id) attemptsByMode[m._id] = m.count;
    }

    const attemptsByOutcome: Record<string, number> = {};
    for (const o of attemptsByOutcomeAgg) {
      if (o._id) attemptsByOutcome[o._id] = o.count;
    }

    // 3. PTP Metrics
    const ptpAgg = await PromiseToPay.aggregate([
      {
        $match: {
          agent: user._id,
          ...activityDateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalCreated: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          kept: { $sum: { $cond: [{ $eq: ['$status', 'KEPT'] }, 1, 0] } },
          broken: { $sum: { $cond: [{ $eq: ['$status', 'BROKEN'] }, 1, 0] } },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
          },
          totalPromisedAmount: { $sum: '$promisedAmount' },
          totalKeptAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'KEPT'] }, '$promisedAmount', 0],
            },
          },
        },
      },
    ]);

    const ptpData = ptpAgg[0] || {
      totalCreated: 0,
      pending: 0,
      kept: 0,
      broken: 0,
      cancelled: 0,
      totalPromisedAmount: 0,
      totalKeptAmount: 0,
    };

    const resolvedPtp = ptpData.kept + ptpData.broken;
    const ptpFulfillmentRate =
      resolvedPtp > 0
        ? Number(((ptpData.kept / resolvedPtp) * 100).toFixed(1))
        : 0;

    const recoveredAmount = ptpData.totalKeptAmount || 0;
    const personalRecoveryRate =
      portData.totalOverdueAmount + recoveredAmount > 0
        ? Number(
            (
              (recoveredAmount /
                (portData.totalOverdueAmount + recoveredAmount)) *
              100
            ).toFixed(1)
          )
        : 0;

    // 4. Follow-up Agenda (Today, Upcoming, Overdue)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const [dueTodayAttempts, upcomingCount, overdueCount] = await Promise.all([
      CollectionAttempt.find({
        agent: user._id,
        nextFollowUpDate: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd')
        .sort({ nextFollowUpDate: 1 })
        .limit(10)
        .lean(),

      CollectionAttempt.countDocuments({
        agent: user._id,
        nextFollowUpDate: { $gt: endOfToday },
      }),

      CollectionAttempt.countDocuments({
        agent: user._id,
        nextFollowUpDate: { $lt: startOfToday },
      }),
    ]);

    const dueToday = dueTodayAttempts
      .map((att: any) => {
        const l = att.loanAccount || {};
        return {
          loanId: l._id ? l._id.toString() : '',
          accountNumber: l.accountNumber || 'N/A',
          borrowerName: l.borrowerName || 'Borrower',
          borrowerPhone: l.borrowerPhone || '',
          overdueAmount: l.overdueAmount || 0,
          dpd: l.dpd || 0,
          nextFollowUpDate: att.nextFollowUpDate
            ? new Date(att.nextFollowUpDate).toISOString()
            : '',
          remarks: att.remarks || '',
        };
      })
      .filter((item) => Boolean(item.loanId));

    // 5. Settlements & Legal Escalations Initiated
    const [settlementsAgg, legalEscalationsInitiated] = await Promise.all([
      SettlementRequest.aggregate([
        {
          $match: {
            requestedBy: user._id,
            ...activityDateFilter,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      ['PENDING_SUPERVISOR', 'PENDING_LEGAL_HEAD'],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            paymentPending: {
              $sum: { $cond: [{ $eq: ['$status', 'PAYMENT_PENDING'] }, 1, 0] },
            },
            settled: {
              $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
            },
          },
        },
      ]),

      LegalCase.countDocuments({
        escalatedBy: user._id,
        ...activityDateFilter,
      }),
    ]);

    const settlementsInitiated = settlementsAgg[0] || {
      total: 0,
      pending: 0,
      paymentPending: 0,
      settled: 0,
    };

    // 6. Personal Bucket Distribution
    const allBuckets: DelinquencyBucket[] = ['0-30', '31-60', '61-90', '90+'];
    const totalAssigned = portData.totalAssignedLoans || 1;
    const bucketMap = new Map(bucketAgg.map((b) => [b._id, b]));

    const bucketDistribution: BucketMetric[] = allBuckets.map((bKey) => {
      const found = bucketMap.get(bKey) || {
        count: 0,
        totalOverdue: 0,
        totalOutstanding: 0,
      };
      return {
        bucket: bKey,
        count: found.count,
        totalOverdue: found.totalOverdue,
        totalOutstanding: found.totalOutstanding,
        percentage: Number(((found.count / totalAssigned) * 100).toFixed(1)),
      };
    });

    const reg = (agentProfile?.region as any) || {};

    return {
      agentProfile: {
        id: agentProfile ? agentProfile._id.toString() : user._id.toString(),
        name: user.name,
        employeeCode: agentProfile?.employeeCode || 'AGT',
        email: user.email,
        regionName: reg.name || 'Assigned Territory',
      },
      portfolioSummary: {
        totalAssignedLoans: portData.totalAssignedLoans,
        totalOverdueAmount: portData.totalOverdueAmount,
        totalOutstandingAmount: portData.totalOutstandingAmount,
        settledCount: portData.settledCount,
        recoveredAmount,
        personalRecoveryRate,
      },
      bucketDistribution,
      collectionActivity: {
        totalAttempts: attData.totalAttempts,
        attemptsByMode,
        attemptsByOutcome,
        contactEfficiencyRate,
      },
      ptpMetrics: {
        totalCreated: ptpData.totalCreated,
        pending: ptpData.pending,
        kept: ptpData.kept,
        broken: ptpData.broken,
        cancelled: ptpData.cancelled,
        fulfillmentRate: ptpFulfillmentRate,
        totalPromisedAmount: ptpData.totalPromisedAmount,
        totalKeptAmount: ptpData.totalKeptAmount,
      },
      followUpAgenda: {
        dueToday,
        upcomingCount,
        overdueCount,
      },
      settlementsInitiated: {
        total: settlementsInitiated.total,
        pending: settlementsInitiated.pending,
        paymentPending: settlementsInitiated.paymentPending,
        settled: settlementsInitiated.settled,
      },
      legalEscalationsInitiated,
      dateRangeApplied: range?.startDate || range?.endDate ? range : undefined,
    };
  }

  /**
   * ======================================================================
   * 4. LEGAL HEAD ANALYTICS
   * ======================================================================
   */
  static async getLegalAnalytics(
    range?: DateRangeQuery
  ): Promise<LegalAnalyticsData> {
    const activityDateFilter = buildDateFilter('createdAt', range);

    // 1. Legal Cases Summary & Stage Aggregations
    const [legalOverviewAgg, stageAgg, priorityAgg, typeAgg] = await Promise.all([
      LegalCase.aggregate([
        { $match: activityDateFilter },
        {
          $group: {
            _id: null,
            totalLegalCases: { $sum: 1 },
            activeLitigationCases: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      '$status',
                      [
                        'ESCALATED',
                        'NOTICE_SENT',
                        'IN_LITIGATION',
                        'HEARING_SCHEDULED',
                      ],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalClaimAmount: { $sum: '$claimAmount' },
            totalRecoveredAmount: { $sum: '$recoveredAmount' },
            writtenOffCount: {
              $sum: { $cond: [{ $eq: ['$status', 'WRITTEN_OFF'] }, 1, 0] },
            },
            totalWrittenOffAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'WRITTEN_OFF'] },
                  {
                    $ifNull: [
                      '$writeOffDetails.writeOffAmount',
                      '$claimAmount',
                    ],
                  },
                  0,
                ],
              },
            },
            unrecoveredPrincipal: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'WRITTEN_OFF'] },
                  { $ifNull: ['$writeOffDetails.unrecoveredPrincipal', 0] },
                  0,
                ],
              },
            },
            unrecoveredInterest: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'WRITTEN_OFF'] },
                  { $ifNull: ['$writeOffDetails.unrecoveredInterest', 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),

      LegalCase.aggregate([
        { $match: activityDateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      LegalCase.aggregate([
        { $match: activityDateFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      LegalCase.aggregate([
        { $match: activityDateFilter },
        { $group: { _id: '$caseType', count: { $sum: 1 } } },
      ]),
    ]);

    const overview = legalOverviewAgg[0] || {
      totalLegalCases: 0,
      activeLitigationCases: 0,
      totalClaimAmount: 0,
      totalRecoveredAmount: 0,
      writtenOffCount: 0,
      totalWrittenOffAmount: 0,
      unrecoveredPrincipal: 0,
      unrecoveredInterest: 0,
    };

    const totalCases = overview.totalLegalCases || 1;
    const litigationRecoveryRate =
      overview.totalClaimAmount > 0
        ? Number(
            (
              (overview.totalRecoveredAmount / overview.totalClaimAmount) *
              100
            ).toFixed(1)
          )
        : 0;

    // 2. Statutory Notices Breakdown
    const noticeAgg = await LegalCase.aggregate([
      { $match: activityDateFilter },
      { $unwind: '$notices' },
      {
        $group: {
          _id: null,
          totalNotices: { $sum: 1 },
          awaitingResponse: {
            $sum: {
              $cond: [
                { $eq: ['$notices.responseStatus', 'AWAITING_RESPONSE'] },
                1,
                0,
              ],
            },
          },
          overdueResponses: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$notices.responseStatus', 'AWAITING_RESPONSE'] },
                    { $lt: ['$notices.responseDueDate', new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const noticeData = noticeAgg[0] || {
      totalNotices: 0,
      awaitingResponse: 0,
      overdueResponses: 0,
    };

    const [noticesByTypeAgg, noticesByDispatchAgg, noticesByResponseAgg] =
      await Promise.all([
        LegalCase.aggregate([
          { $match: activityDateFilter },
          { $unwind: '$notices' },
          { $group: { _id: '$notices.noticeType', count: { $sum: 1 } } },
        ]),
        LegalCase.aggregate([
          { $match: activityDateFilter },
          { $unwind: '$notices' },
          { $group: { _id: '$notices.dispatchMode', count: { $sum: 1 } } },
        ]),
        LegalCase.aggregate([
          { $match: activityDateFilter },
          { $unwind: '$notices' },
          { $group: { _id: '$notices.responseStatus', count: { $sum: 1 } } },
        ]),
      ]);

    const noticesByType: Record<string, number> = {};
    for (const item of noticesByTypeAgg) {
      if (item._id) noticesByType[item._id] = item.count;
    }

    const noticesByDispatch: Record<string, number> = {};
    for (const item of noticesByDispatchAgg) {
      if (item._id) noticesByDispatch[item._id] = item.count;
    }

    const noticesByResponse: Record<string, number> = {};
    for (const item of noticesByResponseAgg) {
      if (item._id) noticesByResponse[item._id] = item.count;
    }

    // 3. Upcoming Court Hearings Calendar List
    const now = new Date();
    const upcomingHearingsRaw = await LegalCase.find({
      nextHearingDate: { $gte: now },
    })
      .populate('loanAccount', 'accountNumber borrowerName')
      .sort({ nextHearingDate: 1 })
      .limit(15)
      .lean();

    const upcomingHearings = upcomingHearingsRaw.map((c: any) => {
      const l = c.loanAccount || {};
      const latestHearing =
        c.hearings && c.hearings.length > 0
          ? c.hearings[c.hearings.length - 1]
          : null;

      return {
        caseId: c._id.toString(),
        caseNumber: c.caseNumber,
        courtName: c.courtName || 'Court',
        courtCaseNumber: c.courtCaseNumber || '',
        stage: latestHearing?.stage || c.status,
        judgeBench: latestHearing?.judgeBench || '',
        borrowerName: l.borrowerName || 'Borrower',
        nextHearingDate: c.nextHearingDate
          ? new Date(c.nextHearingDate).toISOString()
          : '',
        claimAmount: c.claimAmount || 0,
      };
    });

    // 4. Settlement Approvals Queue for Legal Head
    const [settlementsQueueAgg] = await Promise.all([
      SettlementRequest.aggregate([
        { $match: activityDateFilter },
        {
          $group: {
            _id: null,
            awaitingLegalHeadApproval: {
              $sum: {
                $cond: [{ $eq: ['$status', 'PENDING_LEGAL_HEAD'] }, 1, 0],
              },
            },
            paymentPending: {
              $sum: {
                $cond: [{ $eq: ['$status', 'PAYMENT_PENDING'] }, 1, 0],
              },
            },
            settledUnderLitigation: {
              $sum: { $cond: [{ $eq: ['$status', 'SETTLED'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const settlementsQueue = settlementsQueueAgg[0] || {
      awaitingLegalHeadApproval: 0,
      paymentPending: 0,
      settledUnderLitigation: 0,
    };

    // 5. Debt Write-Off Analysis Records
    const writeOffCasesRaw = await LegalCase.find({
      status: 'WRITTEN_OFF',
      ...activityDateFilter,
    })
      .populate('loanAccount', 'accountNumber borrowerName')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const writeOffAnalysis = writeOffCasesRaw.map((c: any) => {
      const l = c.loanAccount || {};
      const wo = c.writeOffDetails || {};
      return {
        caseNumber: c.caseNumber,
        accountNumber: l.accountNumber || 'N/A',
        borrowerName: l.borrowerName || 'Borrower',
        writeOffAmount: wo.writeOffAmount || c.claimAmount || 0,
        reason: wo.reason || c.reason || 'Uncollectible',
        approvedAt: wo.approvedAt
          ? new Date(wo.approvedAt).toISOString()
          : new Date(c.updatedAt).toISOString(),
      };
    });

    // Format stages, priorities, and types
    const casesByStage = stageAgg.map((s) => ({
      stage: s._id,
      count: s.count,
      percentage: Number(((s.count / totalCases) * 100).toFixed(1)),
    }));

    const casesByPriority = priorityAgg.map((p) => ({
      priority: p._id,
      count: p.count,
      percentage: Number(((p.count / totalCases) * 100).toFixed(1)),
    }));

    const casesByType = typeAgg.map((t) => ({
      caseType: t._id,
      count: t.count,
      percentage: Number(((t.count / totalCases) * 100).toFixed(1)),
    }));

    return {
      summary: {
        totalLegalCases: overview.totalLegalCases,
        activeLitigationCases: overview.activeLitigationCases,
        totalClaimAmount: overview.totalClaimAmount,
        totalRecoveredAmount: overview.totalRecoveredAmount,
        litigationRecoveryRate,
        noticesSentCount: noticeData.totalNotices,
        awaitingNoticeResponseCount: noticeData.awaitingResponse,
        overdueNoticeResponsesCount: noticeData.overdueResponses,
        hearingsScheduledCount: upcomingHearings.length,
        writtenOffCount: overview.writtenOffCount,
        totalWrittenOffAmount: overview.totalWrittenOffAmount,
        unrecoveredPrincipal: overview.unrecoveredPrincipal,
        unrecoveredInterest: overview.unrecoveredInterest,
      },
      casesByStage,
      casesByPriority,
      casesByType,
      noticesBreakdown: {
        byType: noticesByType,
        byDispatchMode: noticesByDispatch,
        byResponseStatus: noticesByResponse,
      },
      upcomingHearings,
      settlementsQueue,
      writeOffAnalysis,
      dateRangeApplied: range?.startDate || range?.endDate ? range : undefined,
    };
  }
}
