import { Request, Response } from 'express';
import { AssignmentService } from '../services/assignmentService.js';

export class WorkloadController {
  /**
   * @route   GET /api/v1/workload
   * @desc    Get high-level portfolio workload summary metrics
   * @access  Private (ADMIN, SUPERVISOR)
   */
  static async getWorkloadSummary(req: Request, res: Response): Promise<void> {
    try {
      const region = req.query.region as string | undefined;
      const summary = await AssignmentService.getWorkloadOverview(region);

      res.status(200).json({
        success: true,
        message: 'Workload summary retrieved successfully',
        data: { summary },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error while fetching workload summary',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * @route   GET /api/v1/workload/agents
   * @desc    Get collection agents with current assigned workload statistics
   * @access  Private (ADMIN, SUPERVISOR)
   */
  static async getAgentWorkloads(req: Request, res: Response): Promise<void> {
    try {
      const region = req.query.region as string | undefined;
      const supervisor = req.query.supervisor as string | undefined;
      const isActive = req.query.isActive as string | undefined;

      const agents = await AssignmentService.getAgentWorkloadList({
        region,
        supervisor,
        isActive,
      });

      res.status(200).json({
        success: true,
        message: 'Agent workloads retrieved successfully',
        data: { agents, total: agents.length },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error while fetching agent workloads',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * @route   GET /api/v1/workload/unassigned
   * @desc    Get queue of unassigned loan accounts requiring allocation
   * @access  Private (ADMIN, SUPERVISOR)
   */
  static async getUnassignedLoans(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        limit,
        search,
        bucket,
        status,
        loanType,
        region,
        minDpd,
        maxDpd,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await AssignmentService.getUnassignedLoansList({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string,
        bucket: bucket as string,
        status: status as string,
        loanType: loanType as string,
        region: region as string,
        minDpd: minDpd !== undefined ? Number(minDpd) : undefined,
        maxDpd: maxDpd !== undefined ? Number(maxDpd) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.status(200).json({
        success: true,
        message: 'Unassigned loans queue retrieved successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error while fetching unassigned loans',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * @route   POST /api/v1/loans/:id/assign
   * @desc    Assign a loan account to an active collection agent
   * @access  Private (ADMIN, SUPERVISOR)
   */
  static async assignLoan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { agentId, note } = req.body;

      if (!agentId) {
        res.status(400).json({
          success: false,
          message: 'Collection agent ID (agentId) is required for assignment',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedLoan = await AssignmentService.assignLoanToAgent({
        loanId: id,
        agentId,
        assignedByUserId: req.user.id,
        assignedByUserRole: req.user.role,
        note,
      });

      res.status(200).json({
        success: true,
        message: `Loan account ${updatedLoan.accountNumber} assigned successfully`,
        data: { loan: updatedLoan },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to assign loan account',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * @route   PATCH /api/v1/loans/:id/reassign
   * @desc    Reassign a loan account to a different collection agent
   * @access  Private (ADMIN, SUPERVISOR)
   */
  static async reassignLoan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newAgentId, reason } = req.body;

      if (!newAgentId) {
        res.status(400).json({
          success: false,
          message: 'New collection agent ID (newAgentId) is required for reassignment',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedLoan = await AssignmentService.reassignLoanAgent({
        loanId: id,
        newAgentId,
        assignedByUserId: req.user.id,
        assignedByUserRole: req.user.role,
        reason,
      });

      res.status(200).json({
        success: true,
        message: `Loan account ${updatedLoan.accountNumber} reassigned successfully`,
        data: { loan: updatedLoan },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to reassign loan account',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * @route   PATCH /api/v1/loans/:id/unassign
   * @desc    Unassign a loan account and return to unallocated queue
   * @access  Private (ADMIN, SUPERVISOR)
   */
  static async unassignLoan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const updatedLoan = await AssignmentService.unassignLoanAgent(id);

      res.status(200).json({
        success: true,
        message: `Loan account ${updatedLoan.accountNumber} unassigned successfully`,
        data: { loan: updatedLoan },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to unassign loan account',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
