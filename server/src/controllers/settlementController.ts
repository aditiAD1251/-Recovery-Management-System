import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { SettlementRequest } from '../models/SettlementRequest.js';
import { LoanAccount } from '../models/LoanAccount.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import {
  CreateSettlementDTO,
  ReviewSettlementDTO,
  ConfirmSettlementPaymentDTO,
  SettlementStatus,
} from '../types/settlement.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Settlement Controller - Manages end-to-end settlement lifecycle
 */

/**
 * @desc    Create a new settlement proposal
 * @route   POST /api/v1/settlements
 * @access  Private (AGENT, SUPERVISOR, ADMIN, LEGAL_HEAD)
 */
export const createSettlementRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { loanAccount: loanId, proposedAmount, reason, validUntil } =
      req.body as CreateSettlementDTO;

    if (!loanId || !proposedAmount || !reason || !validUntil) {
      sendError(res, 'loanAccount, proposedAmount, reason, and validUntil are required', 400);
      return;
    }

    if (Number(proposedAmount) <= 0) {
      sendError(res, 'Proposed settlement amount must be greater than 0', 400);
      return;
    }

    // Verify loan existence and status
    const loan = await LoanAccount.findById(loanId);
    if (!loan) {
      sendError(res, 'Loan account not found', 404);
      return;
    }

    if (['SETTLED', 'CLOSED', 'WRITTEN_OFF'].includes(loan.status)) {
      sendError(
        res,
        `Cannot propose settlement for loan in terminal status '${loan.status}'`,
        400
      );
      return;
    }

    // Check if there is already an active pending settlement
    const existingActiveSettlement = await SettlementRequest.findOne({
      loanAccount: loan._id,
      status: { $in: ['PENDING_SUPERVISOR', 'PENDING_LEGAL_HEAD', 'PAYMENT_PENDING'] },
    });

    if (existingActiveSettlement) {
      sendError(
        res,
        `An active settlement request already exists for this loan (Status: ${existingActiveSettlement.status})`,
        409
      );
      return;
    }

    const totalOutstanding = loan.totalOutstanding;
    const overdueAmount = loan.overdueAmount;
    const proposed = Number(proposedAmount);
    const waivedAmount = Math.max(0, totalOutstanding - proposed);
    const waiverPercentage =
      totalOutstanding > 0
        ? Math.min(100, Math.round((waivedAmount / totalOutstanding) * 10000) / 100)
        : 0;

    // Initial status determined by policy threshold & user role
    let initialStatus: SettlementStatus = 'PENDING_SUPERVISOR';
    let approvalRole = '';

    if (user.role === 'LEGAL_HEAD' || user.role === 'ADMIN') {
      // Direct initiation by Legal Head or Admin moves directly to PAYMENT_PENDING
      initialStatus = 'PAYMENT_PENDING';
      approvalRole = user.role;
    } else if (user.role === 'SUPERVISOR') {
      if (waiverPercentage > 25 || waivedAmount > 50000) {
        initialStatus = 'PENDING_LEGAL_HEAD';
      } else {
        initialStatus = 'PAYMENT_PENDING';
        approvalRole = 'SUPERVISOR';
      }
    } else {
      // Agent submission
      initialStatus = 'PENDING_SUPERVISOR';
    }

    const auditEntry = {
      action: initialStatus === 'PAYMENT_PENDING' ? 'PROPOSED_AND_APPROVED' : 'PROPOSED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      comments: `Settlement proposal of ₹${proposed.toLocaleString()} submitted with waiver ₹${waivedAmount.toLocaleString()} (${waiverPercentage}%). Reason: ${reason}`,
      previousStatus: undefined,
      newStatus: initialStatus,
    };

    const settlement = await SettlementRequest.create({
      loanAccount: loan._id,
      requestedBy: user.id,
      proposedAmount: proposed,
      totalOutstanding,
      overdueAmount,
      waivedAmount,
      waiverPercentage,
      reason: reason.trim(),
      validUntil: new Date(validUntil),
      status: initialStatus,
      reviewedBy: initialStatus === 'PAYMENT_PENDING' ? user.id : null,
      reviewedAt: initialStatus === 'PAYMENT_PENDING' ? new Date() : null,
      approvalAuthorityRole: approvalRole,
      reviewNotes:
        initialStatus === 'PAYMENT_PENDING'
          ? `Direct approval on creation by ${user.role}`
          : '',
      history: [auditEntry],
    });

    const populated = await SettlementRequest.findById(settlement._id)
      .populate('loanAccount', 'accountNumber borrowerName totalOutstanding overdueAmount dpd bucket status')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role');

    sendSuccess(res, 'Settlement proposal created successfully', populated, 201);
  } catch (error: any) {
    console.error('Error creating settlement request:', error);
    sendError(res, error.message || 'Failed to create settlement request', 500);
  }
};

/**
 * @desc    Get settlement requests with filtering & pagination
 * @route   GET /api/v1/settlements
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
export const getSettlementRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const {
      loanAccount,
      status,
      requestedBy,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as Record<string, any>;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, any> = {};

    if (loanAccount) {
      filter.loanAccount = loanAccount;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (requestedBy) {
      filter.requestedBy = requestedBy;
    }

    // Role-based scoping: AGENT only sees requests they created or for their assigned loans
    if (user.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: user.id });
      if (agentProfile) {
        const assignedLoans = await LoanAccount.find({ assignedAgent: agentProfile._id }).select('_id');
        const assignedLoanIds = assignedLoans.map((l) => l._id);
        filter.$or = [
          { requestedBy: user.id },
          { loanAccount: { $in: assignedLoanIds } },
        ];
      } else {
        filter.requestedBy = user.id;
      }
    }

    // Search filter across reasons / loan account numbers
    if (search && String(search).trim()) {
      const searchTerm = String(search).trim();
      const matchingLoans = await LoanAccount.find({
        $or: [
          { accountNumber: { $regex: searchTerm, $options: 'i' } },
          { borrowerName: { $regex: searchTerm, $options: 'i' } },
        ],
      }).select('_id');

      const matchingLoanIds = matchingLoans.map((l) => l._id);

      filter.$or = [
        { reason: { $regex: searchTerm, $options: 'i' } },
        { loanAccount: { $in: matchingLoanIds } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [settlements, total] = await Promise.all([
      SettlementRequest.find(filter)
        .populate('loanAccount', 'accountNumber borrowerName totalOutstanding overdueAmount dpd bucket status borrowerPhone borrowerEmail')
        .populate('requestedBy', 'name email role')
        .populate('reviewedBy', 'name email role')
        .populate('settledBy', 'name email role')
        .populate('history.performedBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      SettlementRequest.countDocuments(filter),
    ]);

    sendSuccess(res, 'Settlement requests retrieved successfully', {
      settlements,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching settlement requests:', error);
    sendError(res, error.message || 'Failed to fetch settlement requests', 500);
  }
};

/**
 * @desc    Get single settlement request by ID
 * @route   GET /api/v1/settlements/:id
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
export const getSettlementRequestById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid settlement request ID', 400);
      return;
    }

    const settlement = await SettlementRequest.findById(id)
      .populate('loanAccount')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('settledBy', 'name email role')
      .populate('history.performedBy', 'name email role');

    if (!settlement) {
      sendError(res, 'Settlement request not found', 404);
      return;
    }

    sendSuccess(res, 'Settlement request details retrieved', settlement);
  } catch (error: any) {
    console.error('Error fetching settlement request:', error);
    sendError(res, error.message || 'Failed to fetch settlement request details', 500);
  }
};

/**
 * @desc    Review a settlement request (Approve, Reject, or Escalate to Legal)
 * @route   PATCH /api/v1/settlements/:id/review
 * @access  Private (SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
export const reviewSettlementRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { action, reviewNotes } = req.body as ReviewSettlementDTO;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid settlement request ID', 400);
      return;
    }

    if (!['APPROVE', 'REJECT', 'ESCALATE_TO_LEGAL'].includes(action)) {
      sendError(res, "Action must be 'APPROVE', 'REJECT', or 'ESCALATE_TO_LEGAL'", 400);
      return;
    }

    if (!reviewNotes || !reviewNotes.trim()) {
      sendError(res, 'Review notes / remarks are required', 400);
      return;
    }

    const settlement = await SettlementRequest.findById(id);
    if (!settlement) {
      sendError(res, 'Settlement request not found', 404);
      return;
    }

    if (!['PENDING_SUPERVISOR', 'PENDING_LEGAL_HEAD'].includes(settlement.status)) {
      sendError(
        res,
        `Cannot review settlement in '${settlement.status}' status. Only pending requests can be reviewed.`,
        400
      );
      return;
    }

    const previousStatus = settlement.status;
    let newStatus: SettlementStatus;

    if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (action === 'ESCALATE_TO_LEGAL') {
      newStatus = 'PENDING_LEGAL_HEAD';
    } else {
      // APPROVE ACTION
      // Enforce Supervisor waiver limit policy (max 25% or max ₹50,000 waiver)
      if (user.role === 'SUPERVISOR') {
        if (settlement.waiverPercentage > 25 || settlement.waivedAmount > 50000) {
          sendError(
            res,
            `Supervisor authority is limited to 25% waiver (or ₹50,000). Current waiver is ${settlement.waiverPercentage}% (₹${settlement.waivedAmount.toLocaleString()}). Please use 'ESCALATE_TO_LEGAL' to route to Legal / Recovery Head.`,
            403
          );
          return;
        }
      }

      // CRITICAL: Approval moves to PAYMENT_PENDING. Loan is NOT marked SETTLED yet!
      newStatus = 'PAYMENT_PENDING';
    }

    // Record audit entry
    const auditEntry = {
      action: `REVIEW_${action}`,
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      comments: reviewNotes.trim(),
      previousStatus,
      newStatus,
    };

    settlement.status = newStatus;
    settlement.reviewedBy = user.id as any;
    settlement.reviewedAt = new Date();
    settlement.reviewNotes = reviewNotes.trim();
    settlement.approvalAuthorityRole = user.role;
    settlement.history.push(auditEntry as any);

    await settlement.save();

    const populated = await SettlementRequest.findById(settlement._id)
      .populate('loanAccount', 'accountNumber borrowerName totalOutstanding overdueAmount dpd bucket status')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('history.performedBy', 'name email role');

    sendSuccess(
      res,
      action === 'APPROVE'
        ? 'Settlement approved successfully. Status set to PAYMENT_PENDING awaiting customer payment.'
        : action === 'REJECT'
        ? 'Settlement rejected.'
        : 'Settlement escalated to Legal Head for high-waiver approval.',
      populated
    );
  } catch (error: any) {
    console.error('Error reviewing settlement request:', error);
    sendError(res, error.message || 'Failed to review settlement request', 500);
  }
};

/**
 * @desc    Confirm payment & complete settlement (Transitions Loan to SETTLED)
 * @route   POST /api/v1/settlements/:id/complete
 * @access  Private (SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
export const completeSettlement = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const {
      paymentReference,
      paymentMode,
      paidAmount,
      paymentDate,
      paymentReceiptNotes,
    } = req.body as ConfirmSettlementPaymentDTO;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid settlement request ID', 400);
      return;
    }

    if (!paymentReference || !paymentMode || !paidAmount) {
      sendError(res, 'paymentReference, paymentMode, and paidAmount are required', 400);
      return;
    }

    const settlement = await SettlementRequest.findById(id);
    if (!settlement) {
      sendError(res, 'Settlement request not found', 404);
      return;
    }

    if (settlement.status !== 'PAYMENT_PENDING') {
      sendError(
        res,
        `Cannot complete settlement in '${settlement.status}' status. Settlement must be in 'PAYMENT_PENDING' status.`,
        400
      );
      return;
    }

    const loan = await LoanAccount.findById(settlement.loanAccount);
    if (!loan) {
      sendError(res, 'Associated loan account not found', 404);
      return;
    }

    const previousStatus = settlement.status;
    const newStatus: SettlementStatus = 'SETTLED';

    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    // 1. Update Settlement Record
    settlement.status = newStatus;
    settlement.settledBy = user.id as any;
    settlement.settledAt = new Date();
    settlement.paymentReference = paymentReference.trim();
    settlement.paymentMode = paymentMode;
    settlement.paidAmount = Number(paidAmount);
    settlement.paymentReceiptNotes = (paymentReceiptNotes || '').trim();

    settlement.history.push({
      action: 'PAYMENT_CONFIRMED_SETTLED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      comments: `Payment of ₹${Number(paidAmount).toLocaleString()} confirmed via ${paymentMode} (Ref: ${paymentReference.trim()}). Account formally marked SETTLED.`,
      previousStatus,
      newStatus,
    } as any);

    await settlement.save();

    // 2. Formally transition LoanAccount to SETTLED
    loan.status = 'SETTLED';
    loan.overdueAmount = 0;
    loan.lastPaymentDate = pDate;
    await loan.save();

    const populated = await SettlementRequest.findById(settlement._id)
      .populate('loanAccount')
      .populate('requestedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .populate('settledBy', 'name email role')
      .populate('history.performedBy', 'name email role');

    sendSuccess(
      res,
      'Settlement payment confirmed. Loan account has been marked SETTLED.',
      populated
    );
  } catch (error: any) {
    console.error('Error completing settlement:', error);
    sendError(res, error.message || 'Failed to complete settlement', 500);
  }
};

/**
 * @desc    Cancel a pending settlement request
 * @route   PATCH /api/v1/settlements/:id/cancel
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
export const cancelSettlementRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid settlement request ID', 400);
      return;
    }

    const settlement = await SettlementRequest.findById(id);
    if (!settlement) {
      sendError(res, 'Settlement request not found', 404);
      return;
    }

    if (!['PENDING_SUPERVISOR', 'PENDING_LEGAL_HEAD', 'PAYMENT_PENDING'].includes(settlement.status)) {
      sendError(
        res,
        `Cannot cancel settlement in '${settlement.status}' status`,
        400
      );
      return;
    }

    // Role check: Only creator, supervisor, or admin can cancel
    if (
      user.role === 'AGENT' &&
      settlement.requestedBy.toString() !== user.id.toString()
    ) {
      sendError(res, 'You can only cancel settlement proposals created by yourself', 403);
      return;
    }

    const previousStatus = settlement.status;
    settlement.status = 'CANCELLED';

    settlement.history.push({
      action: 'CANCELLED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      comments: reason,
      previousStatus,
      newStatus: 'CANCELLED',
    } as any);

    await settlement.save();

    sendSuccess(res, 'Settlement proposal cancelled successfully', settlement);
  } catch (error: any) {
    console.error('Error cancelling settlement request:', error);
    sendError(res, error.message || 'Failed to cancel settlement request', 500);
  }
};
