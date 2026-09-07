import mongoose from 'mongoose';
import { LoanAccount, ILoanAccountDocument } from '../models/LoanAccount.js';
import { CollectionAgent, ICollectionAgentDocument } from '../models/CollectionAgent.js';
import { User } from '../models/User.js';
import { Region } from '../models/Region.js';
import {
  AgentWorkloadSummary,
  WorkloadOverviewSummary,
  DelinquencyBucket,
} from '../types/index.js';

export class AssignmentService {
  /**
   * Assign a loan account to a collection agent with strict validation
   */
  static async assignLoanToAgent(params: {
    loanId: string;
    agentId: string;
    assignedByUserId: string;
    assignedByUserRole: string;
    note?: string;
  }): Promise<ILoanAccountDocument> {
    const { loanId, agentId, assignedByUserId, assignedByUserRole } = params;

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      const err: any = new Error('Invalid loan account ID');
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      const err: any = new Error('Invalid collection agent ID');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch Loan Account
    const loan = await LoanAccount.findById(loanId).populate('region');
    if (!loan) {
      const err: any = new Error('Loan account not found');
      err.statusCode = 404;
      throw err;
    }

    // Check terminal statuses
    if (loan.status === 'SETTLED' || loan.status === 'CLOSED') {
      const err: any = new Error(`Cannot assign a ${loan.status.toLowerCase()} loan account`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Fetch Agent with relations
    const agent = await CollectionAgent.findById(agentId)
      .populate('user')
      .populate('region')
      .populate('supervisor');

    if (!agent) {
      const err: any = new Error('Collection agent not found');
      err.statusCode = 404;
      throw err;
    }

    // 3. Verify Agent is Active
    if (!agent.isActive) {
      const err: any = new Error('Cannot assign loan to an inactive collection agent');
      err.statusCode = 400;
      throw err;
    }

    // 4. Verify Underlying User account
    const agentUser: any = agent.user;
    if (!agentUser || !agentUser.isActive || agentUser.role !== 'AGENT') {
      const err: any = new Error('Collection agent user profile is inactive or lacks AGENT role');
      err.statusCode = 400;
      throw err;
    }

    // 5. Verify Region Matching
    const loanRegionId = (loan.region as any)?._id
      ? (loan.region as any)._id.toString()
      : loan.region.toString();

    const agentRegionId = (agent.region as any)?._id
      ? (agent.region as any)._id.toString()
      : agent.region.toString();

    if (loanRegionId !== agentRegionId) {
      const agentRegionName = (agent.region as any)?.name || 'Agent Region';
      const loanRegionName = (loan.region as any)?.name || 'Loan Region';
      const err: any = new Error(
        `Region mismatch: Agent is assigned to region "${agentRegionName}", but Loan account is in region "${loanRegionName}". Assignments must be intra-regional.`
      );
      err.statusCode = 400;
      throw err;
    }

    // 6. Determine Supervisor
    let supervisorId: any = null;
    if (assignedByUserRole === 'SUPERVISOR') {
      supervisorId = new mongoose.Types.ObjectId(assignedByUserId);
    } else if (agent.supervisor) {
      supervisorId = (agent.supervisor as any)?._id || agent.supervisor;
    } else {
      supervisorId = new mongoose.Types.ObjectId(assignedByUserId);
    }

    // 7. Update Loan Assignment
    loan.assignedAgent = agent._id as any;
    loan.assignedSupervisor = supervisorId;
    loan.assignedAt = new Date();
    loan.assignedBy = new mongoose.Types.ObjectId(assignedByUserId) as any;

    await loan.save();

    const updatedLoan = await LoanAccount.findById(loan._id)
      .populate('region')
      .populate({
        path: 'assignedAgent',
        populate: [
          { path: 'user', select: 'name email role isActive' },
          { path: 'region', select: 'name code' },
          { path: 'supervisor', select: 'name email' },
        ],
      })
      .populate('assignedSupervisor', 'name email role')
      .populate('assignedBy', 'name email role');

    return updatedLoan!;
  }

  /**
   * Reassign a loan account from one agent to another
   */
  static async reassignLoanAgent(params: {
    loanId: string;
    newAgentId: string;
    assignedByUserId: string;
    assignedByUserRole: string;
    reason?: string;
  }): Promise<ILoanAccountDocument> {
    const { loanId, newAgentId, assignedByUserId, assignedByUserRole } = params;

    return this.assignLoanToAgent({
      loanId,
      agentId: newAgentId,
      assignedByUserId,
      assignedByUserRole,
      note: params.reason,
    });
  }

  /**
   * Unassign a loan account from its current collection agent
   */
  static async unassignLoanAgent(loanId: string): Promise<ILoanAccountDocument> {
    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      const err: any = new Error('Invalid loan account ID');
      err.statusCode = 400;
      throw err;
    }

    const loan = await LoanAccount.findById(loanId);
    if (!loan) {
      const err: any = new Error('Loan account not found');
      err.statusCode = 404;
      throw err;
    }

    loan.assignedAgent = null;
    loan.assignedSupervisor = null;
    loan.assignedAt = null;
    loan.assignedBy = null;

    await loan.save();

    const updatedLoan = await LoanAccount.findById(loan._id).populate('region');
    return updatedLoan!;
  }

  /**
   * Get aggregated workload metrics for all collection agents
   */
  static async getAgentWorkloadList(query?: {
    region?: string;
    supervisor?: string;
    isActive?: string;
  }): Promise<AgentWorkloadSummary[]> {
    const agentFilter: Record<string, any> = {};

    if (query?.region && mongoose.Types.ObjectId.isValid(query.region)) {
      agentFilter.region = new mongoose.Types.ObjectId(query.region);
    }
    if (query?.supervisor && mongoose.Types.ObjectId.isValid(query.supervisor)) {
      agentFilter.supervisor = new mongoose.Types.ObjectId(query.supervisor);
    }
    if (query?.isActive !== undefined && query.isActive !== '') {
      agentFilter.isActive = query.isActive === 'true';
    }

    const agents = await CollectionAgent.find(agentFilter)
      .populate('user', 'name email role isActive')
      .populate('region', 'name code')
      .populate('supervisor', 'name email');

    // Aggregate active loans for each agent
    const agentIds = agents.map((a) => a._id);

    const loanAggregates = await LoanAccount.aggregate([
      {
        $match: {
          assignedAgent: { $in: agentIds },
          status: { $nin: ['SETTLED', 'CLOSED'] },
        },
      },
      {
        $group: {
          _id: '$assignedAgent',
          assignedCount: { $sum: 1 },
          totalOverdue: { $sum: '$overdueAmount' },
          totalOutstanding: { $sum: '$totalOutstanding' },
          highestDpd: { $max: '$dpd' },
          b0_30: {
            $sum: { $cond: [{ $eq: ['$bucket', '0-30'] }, 1, 0] },
          },
          b31_60: {
            $sum: { $cond: [{ $eq: ['$bucket', '31-60'] }, 1, 0] },
          },
          b61_90: {
            $sum: { $cond: [{ $eq: ['$bucket', '61-90'] }, 1, 0] },
          },
          b90_plus: {
            $sum: { $cond: [{ $eq: ['$bucket', '90+'] }, 1, 0] },
          },
        },
      },
    ]);

    const aggMap = new Map<string, any>();
    for (const item of loanAggregates) {
      aggMap.set(item._id.toString(), item);
    }

    const result: AgentWorkloadSummary[] = agents.map((agent) => {
      const agg = aggMap.get(agent._id.toString()) || {
        assignedCount: 0,
        totalOverdue: 0,
        totalOutstanding: 0,
        highestDpd: 0,
        b0_30: 0,
        b31_60: 0,
        b61_90: 0,
        b90_plus: 0,
      };

      const user: any = agent.user || {};
      const reg: any = agent.region || {};
      const sup: any = agent.supervisor || {};

      return {
        agentId: agent._id.toString(),
        employeeCode: agent.employeeCode,
        name: user.name || 'Unknown Agent',
        email: user.email || '',
        phone: agent.phone || '',
        region: {
          id: reg._id ? reg._id.toString() : '',
          name: reg.name || 'Unknown',
          code: reg.code || 'UNK',
        },
        supervisor: {
          id: sup._id ? sup._id.toString() : '',
          name: sup.name || 'Unknown',
          email: sup.email || '',
        },
        isActive: agent.isActive,
        assignedCount: agg.assignedCount,
        totalOverdue: agg.totalOverdue,
        totalOutstanding: agg.totalOutstanding,
        highestDpd: agg.highestDpd || 0,
        bucketDistribution: {
          '0-30': agg.b0_30 || 0,
          '31-60': agg.b31_60 || 0,
          '61-90': agg.b61_90 || 0,
          '90+': agg.b90_plus || 0,
        },
      };
    });

    return result;
  }

  /**
   * Get high-level workload overview across the entire portfolio or a region
   */
  static async getWorkloadOverview(region?: string): Promise<WorkloadOverviewSummary> {
    const matchFilter: Record<string, any> = {
      status: { $nin: ['SETTLED', 'CLOSED'] },
    };

    if (region && mongoose.Types.ObjectId.isValid(region)) {
      matchFilter.region = new mongoose.Types.ObjectId(region);
    }

    const overviewAgg = await LoanAccount.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          totalOverdue: { $sum: '$overdueAmount' },
          unassignedCount: {
            $sum: { $cond: [{ $or: [{ $eq: ['$assignedAgent', null] }, { $not: ['$assignedAgent'] }] }, 1, 0] },
          },
          assignedCount: {
            $sum: { $cond: [{ $and: [{ $ne: ['$assignedAgent', null] }, { $gt: ['$assignedAgent', null] }] }, 1, 0] },
          },
          unassignedOverdue: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$assignedAgent', null] }, { $not: ['$assignedAgent'] }] },
                '$overdueAmount',
                0,
              ],
            },
          },
          assignedOverdue: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$assignedAgent', null] }, { $gt: ['$assignedAgent', null] }] },
                '$overdueAmount',
                0,
              ],
            },
          },
          // Unassigned bucket counts
          un_b0_30: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $or: [{ $eq: ['$assignedAgent', null] }, { $not: ['$assignedAgent'] }] },
                    { $eq: ['$bucket', '0-30'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          un_b31_60: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $or: [{ $eq: ['$assignedAgent', null] }, { $not: ['$assignedAgent'] }] },
                    { $eq: ['$bucket', '31-60'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          un_b61_90: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $or: [{ $eq: ['$assignedAgent', null] }, { $not: ['$assignedAgent'] }] },
                    { $eq: ['$bucket', '61-90'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          un_b90_plus: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $or: [{ $eq: ['$assignedAgent', null] }, { $not: ['$assignedAgent'] }] },
                    { $eq: ['$bucket', '90+'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          // Assigned bucket counts
          as_b0_30: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$assignedAgent', null] },
                    { $eq: ['$bucket', '0-30'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          as_b31_60: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$assignedAgent', null] },
                    { $eq: ['$bucket', '31-60'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          as_b61_90: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$assignedAgent', null] },
                    { $eq: ['$bucket', '61-90'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          as_b90_plus: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$assignedAgent', null] },
                    { $eq: ['$bucket', '90+'] },
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

    const data = overviewAgg[0] || {};

    return {
      totalLoans: data.totalLoans || 0,
      unassignedCount: data.unassignedCount || 0,
      assignedCount: data.assignedCount || 0,
      totalOverdue: data.totalOverdue || 0,
      unassignedOverdue: data.unassignedOverdue || 0,
      assignedOverdue: data.assignedOverdue || 0,
      unassignedByBucket: {
        '0-30': data.un_b0_30 || 0,
        '31-60': data.un_b31_60 || 0,
        '61-90': data.un_b61_90 || 0,
        '90+': data.un_b90_plus || 0,
      },
      assignedByBucket: {
        '0-30': data.as_b0_30 || 0,
        '31-60': data.as_b31_60 || 0,
        '61-90': data.as_b61_90 || 0,
        '90+': data.as_b90_plus || 0,
      },
    };
  }

  /**
   * Get unassigned loans queue with multi-criteria filters
   */
  static async getUnassignedLoansList(params: {
    page?: number;
    limit?: number;
    search?: string;
    bucket?: string;
    status?: string;
    loanType?: string;
    region?: string;
    minDpd?: number;
    maxDpd?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      $or: [{ assignedAgent: null }, { assignedAgent: { $exists: false } }],
      status: { $nin: ['SETTLED', 'CLOSED'] },
    };

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(params.search.trim(), 'i');
      filter.$and = [
        {
          $or: [
            { accountNumber: searchRegex },
            { borrowerName: searchRegex },
            { borrowerPhone: searchRegex },
            { borrowerEmail: searchRegex },
          ],
        },
      ];
    }

    if (params.bucket && ['0-30', '31-60', '61-90', '90+'].includes(params.bucket)) {
      filter.bucket = params.bucket;
    }

    if (params.status && ['CURRENT', 'DELINQUENT', 'DEFAULT'].includes(params.status)) {
      filter.status = params.status;
    }

    if (params.loanType && ['PERSONAL', 'HOME', 'AUTO', 'BUSINESS', 'CREDIT_CARD'].includes(params.loanType)) {
      filter.loanType = params.loanType;
    }

    if (params.region && mongoose.Types.ObjectId.isValid(params.region)) {
      filter.region = new mongoose.Types.ObjectId(params.region);
    }

    if (params.minDpd !== undefined || params.maxDpd !== undefined) {
      filter.dpd = {};
      if (params.minDpd !== undefined && !isNaN(Number(params.minDpd))) {
        filter.dpd.$gte = Number(params.minDpd);
      }
      if (params.maxDpd !== undefined && !isNaN(Number(params.maxDpd))) {
        filter.dpd.$lte = Number(params.maxDpd);
      }
    }

    const sortField = params.sortBy || 'dpd';
    const sortDirection = params.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [loans, total] = await Promise.all([
      LoanAccount.find(filter)
        .populate('region', 'name code')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      LoanAccount.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      loans,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
