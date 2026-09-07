import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PromiseToPay } from '../models/PromiseToPay.js';
import { LoanAccount } from '../models/LoanAccount.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { PtpStatus } from '../types/promiseToPay.js';

const VALID_PTP_STATUSES: PtpStatus[] = ['PENDING', 'KEPT', 'BROKEN', 'CANCELLED'];

/**
 * Get Promise to Pay (PTP) Records with Scoping
 * GET /api/v1/promises-to-pay
 */
export const getPromisesToPay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const { loanAccount, agent, status } = req.query;

    const filter: Record<string, any> = {};

    // Strict Agent Scoping
    if (req.user?.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: req.user.id });
      if (!agentProfile) {
        sendError(res, 'Collection agent profile not found', 404);
        return;
      }

      if (loanAccount && typeof loanAccount === 'string') {
        if (!mongoose.Types.ObjectId.isValid(loanAccount)) {
          sendError(res, 'Invalid loan account ID format', 400);
          return;
        }

        const loan = await LoanAccount.findById(loanAccount);
        if (!loan) {
          sendError(res, 'Loan account not found', 404);
          return;
        }

        // Verify assignment
        if (
          !loan.assignedAgent ||
          loan.assignedAgent.toString() !== agentProfile._id.toString()
        ) {
          sendError(
            res,
            'Access denied: You can only view Promise-to-Pay records for loans assigned to you',
            403
          );
          return;
        }

        filter.loanAccount = loanAccount;
      } else {
        const assignedLoans = await LoanAccount.find(
          { assignedAgent: agentProfile._id },
          '_id'
        );
        const assignedLoanIds = assignedLoans.map((l) => l._id);
        filter.loanAccount = { $in: assignedLoanIds };
      }
    } else {
      if (loanAccount && typeof loanAccount === 'string' && mongoose.Types.ObjectId.isValid(loanAccount)) {
        filter.loanAccount = loanAccount;
      }
      if (agent && typeof agent === 'string' && mongoose.Types.ObjectId.isValid(agent)) {
        filter.agent = agent;
      }
    }

    if (status && typeof status === 'string' && VALID_PTP_STATUSES.includes(status.toUpperCase() as PtpStatus)) {
      filter.status = status.toUpperCase() as PtpStatus;
    }

    const [ptps, total] = await Promise.all([
      PromiseToPay.find(filter)
        .sort({ promisedDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('agent', 'name email role')
        .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket'),
      PromiseToPay.countDocuments(filter),
    ]);

    sendSuccess(
      res,
      'Promise-to-Pay records retrieved successfully',
      {
        ptps,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Promise to Pay by ID
 * GET /api/v1/promises-to-pay/:id
 */
export const getPromiseToPayById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid Promise-to-Pay ID format', 400);
      return;
    }

    const ptp = await PromiseToPay.findById(id)
      .populate('agent', 'name email role')
      .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket assignedAgent');

    if (!ptp) {
      sendError(res, 'Promise-to-Pay record not found', 404);
      return;
    }

    // Role-based Agent isolation check
    if (req.user?.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: req.user.id });
      const loan = ptp.loanAccount as any;
      if (
        !agentProfile ||
        !loan?.assignedAgent ||
        loan.assignedAgent.toString() !== agentProfile._id.toString()
      ) {
        sendError(
          res,
          'Access denied: You can only view Promise-to-Pay records for loans assigned to you',
          403
        );
        return;
      }
    }

    sendSuccess(res, 'Promise-to-Pay record retrieved successfully', { ptp }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create Promise to Pay (PTP) Record
 * POST /api/v1/promises-to-pay
 */
export const createPromiseToPay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { loanAccount, promisedDate, promisedAmount, remarks } = req.body;

    if (!loanAccount || !mongoose.Types.ObjectId.isValid(loanAccount)) {
      sendError(res, 'Valid loan account reference is required', 400);
      return;
    }

    if (!promisedDate || isNaN(Date.parse(promisedDate))) {
      sendError(res, 'Valid promised date is required', 400);
      return;
    }

    if (promisedAmount === undefined || isNaN(Number(promisedAmount)) || Number(promisedAmount) <= 0) {
      sendError(res, 'Promised amount must be a positive number greater than 0', 400);
      return;
    }

    if (remarks && typeof remarks === 'string' && remarks.trim().length > 1000) {
      sendError(res, 'Remarks cannot exceed 1000 characters', 400);
      return;
    }

    const loan = await LoanAccount.findById(loanAccount);
    if (!loan) {
      sendError(res, 'Target loan account not found', 404);
      return;
    }

    // Agent Ownership Validation
    if (req.user?.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: req.user.id });
      if (!agentProfile) {
        sendError(res, 'Collection agent profile not found for authenticated user', 404);
        return;
      }

      if (
        !loan.assignedAgent ||
        loan.assignedAgent.toString() !== agentProfile._id.toString()
      ) {
        sendError(
          res,
          'Access denied: You cannot create a Promise-to-Pay for a loan assigned to another agent',
          403
        );
        return;
      }
    }

    const ptp = await PromiseToPay.create({
      loanAccount,
      agent: req.user!.id,
      promisedDate: new Date(promisedDate),
      promisedAmount: Number(promisedAmount),
      status: 'PENDING',
      remarks: remarks ? remarks.trim() : '',
    });

    const populatedPtp = await PromiseToPay.findById(ptp._id)
      .populate('agent', 'name email role')
      .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket');

    sendSuccess(
      res,
      'Promise-to-Pay record created successfully',
      { ptp: populatedPtp },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update Promise to Pay (PTP) Record
 * PATCH /api/v1/promises-to-pay/:id
 */
export const updatePromiseToPay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, remarks, promisedDate, promisedAmount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid Promise-to-Pay ID format', 400);
      return;
    }

    const ptp = await PromiseToPay.findById(id);
    if (!ptp) {
      sendError(res, 'Promise-to-Pay record not found', 404);
      return;
    }

    // Agent Ownership Check
    if (req.user?.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: req.user.id });
      const loan = await LoanAccount.findById(ptp.loanAccount);
      if (
        !agentProfile ||
        !loan ||
        !loan.assignedAgent ||
        loan.assignedAgent.toString() !== agentProfile._id.toString()
      ) {
        sendError(
          res,
          'Access denied: You cannot update a Promise-to-Pay for a loan assigned to another agent',
          403
        );
        return;
      }
    }

    if (status !== undefined) {
      const normalizedStatus = status.toUpperCase() as PtpStatus;
      if (!VALID_PTP_STATUSES.includes(normalizedStatus)) {
        sendError(
          res,
          `Invalid status. Must be one of: ${VALID_PTP_STATUSES.join(', ')}`,
          400
        );
        return;
      }
      ptp.status = normalizedStatus;
    }

    if (remarks !== undefined) {
      if (typeof remarks === 'string' && remarks.trim().length > 1000) {
        sendError(res, 'Remarks cannot exceed 1000 characters', 400);
        return;
      }
      ptp.remarks = remarks.trim();
    }

    if (promisedDate !== undefined) {
      if (isNaN(Date.parse(promisedDate))) {
        sendError(res, 'Invalid promised date format', 400);
        return;
      }
      ptp.promisedDate = new Date(promisedDate);
    }

    if (promisedAmount !== undefined) {
      if (isNaN(Number(promisedAmount)) || Number(promisedAmount) <= 0) {
        sendError(res, 'Promised amount must be greater than 0', 400);
        return;
      }
      ptp.promisedAmount = Number(promisedAmount);
    }

    await ptp.save();

    const populatedPtp = await PromiseToPay.findById(ptp._id)
      .populate('agent', 'name email role')
      .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket');

    sendSuccess(
      res,
      'Promise-to-Pay record updated successfully',
      { ptp: populatedPtp },
      200
    );
  } catch (error) {
    next(error);
  }
};
