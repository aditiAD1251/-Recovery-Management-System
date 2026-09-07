import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CollectionAttempt } from '../models/CollectionAttempt.js';
import { LoanAccount } from '../models/LoanAccount.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  ContactMode,
  AttemptOutcome,
} from '../types/collectionAttempt.js';

const VALID_CONTACT_MODES: ContactMode[] = [
  'PHONE',
  'SMS',
  'WHATSAPP',
  'EMAIL',
  'FIELD_VISIT',
  'OTHER',
];

const VALID_OUTCOMES: AttemptOutcome[] = [
  'CONTACTED',
  'PROMISE_TO_PAY',
  'CALLBACK_REQUESTED',
  'NOT_REACHABLE',
  'WRONG_NUMBER',
  'REFUSED_TO_PAY',
  'CUSTOMER_DECEASED',
  'ADDRESS_NOT_FOUND',
  'OTHER',
];

/**
 * Get Collection Attempts with Multi-Criteria Filters & Agent Scoping
 * GET /api/v1/collection-attempts
 */
export const getCollectionAttempts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const {
      loanAccount,
      agent,
      contactMode,
      outcome,
      startDate,
      endDate,
    } = req.query;

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

        // Enforce ownership: Loan must be assigned to this agent
        if (
          !loan.assignedAgent ||
          loan.assignedAgent.toString() !== agentProfile._id.toString()
        ) {
          sendError(
            res,
            'Access denied: You can only view collection attempts for loans assigned to you',
            403
          );
          return;
        }

        filter.loanAccount = loanAccount;
      } else {
        // Find all loans assigned to this agent
        const assignedLoans = await LoanAccount.find(
          { assignedAgent: agentProfile._id },
          '_id'
        );
        const assignedLoanIds = assignedLoans.map((l) => l._id);
        filter.loanAccount = { $in: assignedLoanIds };
      }
    } else {
      // Supervisor, Admin, Legal Head
      if (loanAccount && typeof loanAccount === 'string' && mongoose.Types.ObjectId.isValid(loanAccount)) {
        filter.loanAccount = loanAccount;
      }
      if (agent && typeof agent === 'string' && mongoose.Types.ObjectId.isValid(agent)) {
        filter.agent = agent;
      }
    }

    if (contactMode && typeof contactMode === 'string' && VALID_CONTACT_MODES.includes(contactMode as ContactMode)) {
      filter.contactMode = contactMode;
    }

    if (outcome && typeof outcome === 'string' && VALID_OUTCOMES.includes(outcome as AttemptOutcome)) {
      filter.outcome = outcome;
    }

    if (startDate || endDate) {
      filter.attemptedAt = {};
      if (startDate && typeof startDate === 'string' && !isNaN(Date.parse(startDate))) {
        filter.attemptedAt.$gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string' && !isNaN(Date.parse(endDate))) {
        filter.attemptedAt.$lte = new Date(endDate);
      }
    }

    const [attempts, total] = await Promise.all([
      CollectionAttempt.find(filter)
        .sort({ attemptedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('agent', 'name email role')
        .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket'),
      CollectionAttempt.countDocuments(filter),
    ]);

    sendSuccess(
      res,
      'Collection attempts retrieved successfully',
      {
        attempts,
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
 * Get Single Collection Attempt by ID
 * GET /api/v1/collection-attempts/:id
 */
export const getCollectionAttemptById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid collection attempt ID format', 400);
      return;
    }

    const attempt = await CollectionAttempt.findById(id)
      .populate('agent', 'name email role')
      .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket assignedAgent');

    if (!attempt) {
      sendError(res, 'Collection attempt not found', 404);
      return;
    }

    // Role-based Agent isolation check
    if (req.user?.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: req.user.id });
      const loan = attempt.loanAccount as any;
      if (
        !agentProfile ||
        !loan?.assignedAgent ||
        loan.assignedAgent.toString() !== agentProfile._id.toString()
      ) {
        sendError(
          res,
          'Access denied: You can only view collection attempts for loans assigned to you',
          403
        );
        return;
      }
    }

    sendSuccess(res, 'Collection attempt retrieved successfully', { attempt }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Record New Collection Attempt
 * POST /api/v1/collection-attempts
 */
export const createCollectionAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      loanAccount,
      contactMode,
      outcome,
      remarks,
      attemptedAt,
      nextFollowUpDate,
    } = req.body;

    // Validation
    if (!loanAccount || !mongoose.Types.ObjectId.isValid(loanAccount)) {
      sendError(res, 'Valid loan account reference is required', 400);
      return;
    }

    if (!contactMode || !VALID_CONTACT_MODES.includes(contactMode)) {
      sendError(
        res,
        `Valid contact mode is required. Must be one of: ${VALID_CONTACT_MODES.join(', ')}`,
        400
      );
      return;
    }

    if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
      sendError(
        res,
        `Valid attempt outcome is required. Must be one of: ${VALID_OUTCOMES.join(', ')}`,
        400
      );
      return;
    }

    if (!remarks || typeof remarks !== 'string' || !remarks.trim()) {
      sendError(res, 'Remarks are required for collection attempt', 400);
      return;
    }

    if (remarks.trim().length > 1000) {
      sendError(res, 'Remarks cannot exceed 1000 characters', 400);
      return;
    }

    let parsedAttemptedAt = new Date();
    if (attemptedAt) {
      if (isNaN(Date.parse(attemptedAt))) {
        sendError(res, 'Invalid attempt date format', 400);
        return;
      }
      parsedAttemptedAt = new Date(attemptedAt);
    }

    let parsedFollowUpDate: Date | null = null;
    if (nextFollowUpDate) {
      if (isNaN(Date.parse(nextFollowUpDate))) {
        sendError(res, 'Invalid follow-up date format', 400);
        return;
      }
      parsedFollowUpDate = new Date(nextFollowUpDate);
    }

    // Verify target loan exists
    const loan = await LoanAccount.findById(loanAccount);
    if (!loan) {
      sendError(res, 'Target loan account not found', 404);
      return;
    }

    // Agent Ownership Check
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
          'Access denied: You cannot record collection attempts for a loan assigned to another agent',
          403
        );
        return;
      }
    }

    // Create attempt
    const attempt = await CollectionAttempt.create({
      loanAccount,
      agent: req.user!.id,
      attemptedAt: parsedAttemptedAt,
      contactMode,
      outcome,
      remarks: remarks.trim(),
      nextFollowUpDate: parsedFollowUpDate,
    });

    const populatedAttempt = await CollectionAttempt.findById(attempt._id)
      .populate('agent', 'name email role')
      .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket');

    sendSuccess(
      res,
      'Collection attempt recorded successfully',
      { attempt: populatedAttempt },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update Collection Attempt
 * PATCH /api/v1/collection-attempts/:id
 */
export const updateCollectionAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { remarks, outcome, nextFollowUpDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid collection attempt ID format', 400);
      return;
    }

    const attempt = await CollectionAttempt.findById(id);
    if (!attempt) {
      sendError(res, 'Collection attempt not found', 404);
      return;
    }

    // Ownership check: If AGENT, must be the author of the attempt
    if (req.user?.role === 'AGENT') {
      if (attempt.agent.toString() !== req.user.id) {
        sendError(
          res,
          'Access denied: You cannot modify another agent\'s collection attempt',
          403
        );
        return;
      }
    }

    if (remarks !== undefined) {
      if (typeof remarks !== 'string' || !remarks.trim()) {
        sendError(res, 'Remarks cannot be empty', 400);
        return;
      }
      if (remarks.trim().length > 1000) {
        sendError(res, 'Remarks cannot exceed 1000 characters', 400);
        return;
      }
      attempt.remarks = remarks.trim();
    }

    if (outcome !== undefined) {
      if (!VALID_OUTCOMES.includes(outcome)) {
        sendError(
          res,
          `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}`,
          400
        );
        return;
      }
      attempt.outcome = outcome;
    }

    if (nextFollowUpDate !== undefined) {
      if (nextFollowUpDate === null || nextFollowUpDate === '') {
        attempt.nextFollowUpDate = null;
      } else {
        if (isNaN(Date.parse(nextFollowUpDate))) {
          sendError(res, 'Invalid follow-up date format', 400);
          return;
        }
        attempt.nextFollowUpDate = new Date(nextFollowUpDate);
      }
    }

    await attempt.save();

    const populatedAttempt = await CollectionAttempt.findById(attempt._id)
      .populate('agent', 'name email role')
      .populate('loanAccount', 'accountNumber borrowerName borrowerPhone overdueAmount dpd bucket');

    sendSuccess(
      res,
      'Collection attempt updated successfully',
      { attempt: populatedAttempt },
      200
    );
  } catch (error) {
    next(error);
  }
};
