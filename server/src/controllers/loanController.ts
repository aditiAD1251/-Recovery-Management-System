import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { LoanAccount } from '../models/LoanAccount.js';
import { Region } from '../models/Region.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { CollectionAttempt } from '../models/CollectionAttempt.js';
import { PromiseToPay } from '../models/PromiseToPay.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  computeLoanDelinquency,
  recalculateAllLoansDPD,
} from '../services/dpdService.js';
import { DelinquencyBucket, LoanType, LoanStatus, LoanSummaryData } from '../types/loan.js';


/**
 * Get Paginated List of Loan Accounts with Multi-Criteria Filters
 * GET /api/v1/loans
 */
export const getLoans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      bucket,
      status,
      loanType,
      region,
      minOverdue,
      maxOverdue,
      minDpd,
      maxDpd,
    } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { accountNumber: searchRegex },
        { borrowerName: searchRegex },
        { borrowerEmail: searchRegex },
        { borrowerPhone: searchRegex },
      ];
    }

    if (bucket && typeof bucket === 'string' && bucket.trim()) {
      filter.bucket = bucket.trim() as DelinquencyBucket;
    }

    if (status && typeof status === 'string' && status.trim()) {
      filter.status = status.trim().toUpperCase() as LoanStatus;
    }

    if (loanType && typeof loanType === 'string' && loanType.trim()) {
      filter.loanType = loanType.trim().toUpperCase() as LoanType;
    }

    if (region && typeof region === 'string' && mongoose.Types.ObjectId.isValid(region)) {
      filter.region = region;
    }

    if (minOverdue !== undefined || maxOverdue !== undefined) {
      filter.overdueAmount = {};
      if (minOverdue !== undefined && !isNaN(Number(minOverdue))) {
        filter.overdueAmount.$gte = Number(minOverdue);
      }
      if (maxOverdue !== undefined && !isNaN(Number(maxOverdue))) {
        filter.overdueAmount.$lte = Number(maxOverdue);
      }
    }

    if (minDpd !== undefined || maxDpd !== undefined) {
      filter.dpd = {};
      if (minDpd !== undefined && !isNaN(Number(minDpd))) {
        filter.dpd.$gte = Number(minDpd);
      }
      if (maxDpd !== undefined && !isNaN(Number(maxDpd))) {
        filter.dpd.$lte = Number(maxDpd);
      }
    }

    const [loans, total] = await Promise.all([
      LoanAccount.find(filter)
        .sort({ dpd: -1, overdueAmount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('region', 'name code isActive')
        .populate({
          path: 'assignedAgent',
          select: 'employeeCode user phone isActive',
          populate: { path: 'user', select: 'name email' },
        })
        .populate('assignedSupervisor', 'name email role'),
      LoanAccount.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    sendSuccess(
      res,
      'Loan accounts retrieved successfully',
      {
        loans,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Loan Portfolio Summary & Delinquency Bucket Metrics
 * GET /api/v1/loans/summary
 */
export const getLoanSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loans = await LoanAccount.find({});

    const summary: LoanSummaryData = {
      totalAccounts: loans.length,
      totalOutstanding: 0,
      totalOverdue: 0,
      currentCount: 0,
      delinquentCount: 0,
      defaultNpaCount: 0,
      settledClosedCount: 0,
      buckets: {
        '0-30': { bucket: '0-30', count: 0, totalOverdue: 0, totalOutstanding: 0 },
        '31-60': { bucket: '31-60', count: 0, totalOverdue: 0, totalOutstanding: 0 },
        '61-90': { bucket: '61-90', count: 0, totalOverdue: 0, totalOutstanding: 0 },
        '90+': { bucket: '90+', count: 0, totalOverdue: 0, totalOutstanding: 0 },
      },
    };

    loans.forEach((loan) => {
      summary.totalOutstanding += loan.totalOutstanding || 0;
      summary.totalOverdue += loan.overdueAmount || 0;

      // Status counts
      if (loan.status === 'CURRENT') summary.currentCount++;
      else if (loan.status === 'DELINQUENT') summary.delinquentCount++;
      else if (loan.status === 'DEFAULT') summary.defaultNpaCount++;
      else if (loan.status === 'SETTLED' || loan.status === 'CLOSED') summary.settledClosedCount++;

      // Bucket aggregation
      const bKey = loan.bucket as DelinquencyBucket;
      if (summary.buckets[bKey]) {
        summary.buckets[bKey].count++;
        summary.buckets[bKey].totalOverdue += loan.overdueAmount || 0;
        summary.buckets[bKey].totalOutstanding += loan.totalOutstanding || 0;
      }
    });

    sendSuccess(res, 'Loan portfolio summary retrieved successfully', { summary }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Loans Assigned to Authenticated Agent
 * GET /api/v1/loans/my-assigned
 */
export const getMyAssignedLoans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'User identity not found in request', 401);
      return;
    }

    // Securely resolve agent profile associated with authenticated user
    const agentProfile = await CollectionAgent.findOne({ user: userId }).populate('region', 'name code');
    if (!agentProfile) {
      sendError(res, 'Collection agent profile not found for authenticated user', 404);
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const {
      search,
      bucket,
      status,
      loanType,
      minOverdue,
      maxOverdue,
      minDpd,
      maxDpd,
      sortBy = 'dpd',
      sortOrder = 'desc',
    } = req.query;

    const filter: Record<string, any> = {
      assignedAgent: agentProfile._id,
    };

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { accountNumber: searchRegex },
        { borrowerName: searchRegex },
        { borrowerEmail: searchRegex },
        { borrowerPhone: searchRegex },
      ];
    }

    if (bucket && typeof bucket === 'string' && bucket.trim() && bucket !== 'ALL') {
      filter.bucket = bucket.trim() as DelinquencyBucket;
    }

    if (status && typeof status === 'string' && status.trim() && status !== 'ALL') {
      filter.status = status.trim().toUpperCase() as LoanStatus;
    }

    if (loanType && typeof loanType === 'string' && loanType.trim() && loanType !== 'ALL') {
      filter.loanType = loanType.trim().toUpperCase() as LoanType;
    }

    if (minOverdue !== undefined || maxOverdue !== undefined) {
      filter.overdueAmount = {};
      if (minOverdue !== undefined && !isNaN(Number(minOverdue))) {
        filter.overdueAmount.$gte = Number(minOverdue);
      }
      if (maxOverdue !== undefined && !isNaN(Number(maxOverdue))) {
        filter.overdueAmount.$lte = Number(maxOverdue);
      }
    }

    if (minDpd !== undefined || maxDpd !== undefined) {
      filter.dpd = {};
      if (minDpd !== undefined && !isNaN(Number(minDpd))) {
        filter.dpd.$gte = Number(minDpd);
      }
      if (maxDpd !== undefined && !isNaN(Number(maxDpd))) {
        filter.dpd.$lte = Number(maxDpd);
      }
    }

    const sortField = typeof sortBy === 'string' ? sortBy : 'dpd';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    // Execute queries
    const [loans, total, allAssignedLoans] = await Promise.all([
      LoanAccount.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('region', 'name code isActive')
        .populate({
          path: 'assignedAgent',
          select: 'employeeCode user phone isActive',
          populate: { path: 'user', select: 'name email' },
        })
        .populate('assignedSupervisor', 'name email role'),
      LoanAccount.countDocuments(filter),
      LoanAccount.find({ assignedAgent: agentProfile._id }),
    ]);

    // Compute Agent Workspace KPI metrics across all assigned loans
    const totalAssigned = allAssignedLoans.length;
    const totalOverdue = allAssignedLoans.reduce((sum, loan) => sum + (loan.overdueAmount || 0), 0);
    const dpd90PlusCount = allAssignedLoans.filter((loan) => loan.dpd >= 90 || loan.bucket === '90+').length;

    // Follow-ups scheduled for today (or pending PTPs for today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayAttemptsFollowups, todayPtps] = await Promise.all([
      CollectionAttempt.countDocuments({
        agent: userId,
        nextFollowUpDate: { $gte: todayStart, $lte: todayEnd },
      }),
      PromiseToPay.countDocuments({
        agent: userId,
        status: 'PENDING',
        promisedDate: { $gte: todayStart, $lte: todayEnd },
      }),
    ]);

    const todayFollowupsCount = todayAttemptsFollowups + todayPtps;

    sendSuccess(
      res,
      'Assigned loans retrieved successfully',
      {
        loans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        summary: {
          totalAssigned,
          totalOverdue,
          dpd90PlusCount,
          todayFollowupsCount,
        },
        agent: {
          id: agentProfile._id,
          employeeCode: agentProfile.employeeCode,
          phone: agentProfile.phone,
          region: agentProfile.region,
          isActive: agentProfile.isActive,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Loan Account by ID
 * GET /api/v1/loans/:id
 */
export const getLoanById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid loan ID format', 400);
      return;
    }

    const loan = await LoanAccount.findById(id)
      .populate('region', 'name code isActive')
      .populate({
        path: 'assignedAgent',
        select: 'employeeCode user phone isActive',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('assignedSupervisor', 'name email role');

    if (!loan) {
      sendError(res, 'Loan account not found', 404);
      return;
    }

    // Role-based Agent isolation check: AGENT may only view their own assigned loan
    if (req.user?.role === 'AGENT') {
      const agentProfile = await CollectionAgent.findOne({ user: req.user.id });
      if (
        !agentProfile ||
        !loan.assignedAgent ||
        (loan.assignedAgent as any)._id.toString() !== agentProfile._id.toString()
      ) {
        sendError(res, 'Access denied: You can only view your own assigned loans', 403);
        return;
      }
    }

    sendSuccess(res, 'Loan account retrieved successfully', { loan }, 200);
  } catch (error) {
    next(error);
  }
};


/**
 * Create New Loan Account
 * POST /api/v1/loans
 */
export const createLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      accountNumber,
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      borrowerAddress,
      loanType,
      principalAmount,
      interestRate,
      tenureMonths,
      emiAmount,
      totalOutstanding,
      overdueAmount = 0,
      missedEmisCount = 0,
      lastPaymentDate,
      nextDueDate,
      firstMissedDueDate,
      region: regionId,
      status: requestedStatus,
    } = req.body;

    // Required Field Validations
    if (!accountNumber || typeof accountNumber !== 'string' || !accountNumber.trim()) {
      sendError(res, 'Loan account number is required', 400);
      return;
    }

    if (!borrowerName || typeof borrowerName !== 'string' || !borrowerName.trim()) {
      sendError(res, 'Borrower name is required', 400);
      return;
    }

    if (!borrowerEmail || typeof borrowerEmail !== 'string' || !borrowerEmail.trim()) {
      sendError(res, 'Borrower email is required', 400);
      return;
    }

    if (!borrowerPhone || typeof borrowerPhone !== 'string' || !borrowerPhone.trim()) {
      sendError(res, 'Borrower phone number is required', 400);
      return;
    }

    if (principalAmount === undefined || Number(principalAmount) < 0) {
      sendError(res, 'Valid principal amount is required', 400);
      return;
    }

    if (emiAmount === undefined || Number(emiAmount) < 0) {
      sendError(res, 'Valid EMI amount is required', 400);
      return;
    }

    if (totalOutstanding === undefined || Number(totalOutstanding) < 0) {
      sendError(res, 'Valid total outstanding amount is required', 400);
      return;
    }

    if (!nextDueDate) {
      sendError(res, 'Next due date is required', 400);
      return;
    }

    if (!regionId || !mongoose.Types.ObjectId.isValid(regionId)) {
      sendError(res, 'A valid Region ID is required', 400);
      return;
    }

    const normalizedAccNum = accountNumber.toUpperCase().trim();

    // Check account number uniqueness
    const existingLoan = await LoanAccount.findOne({ accountNumber: normalizedAccNum });
    if (existingLoan) {
      sendError(res, `Loan account '${normalizedAccNum}' already exists`, 409);
      return;
    }

    // Check region existence
    const region = await Region.findById(regionId);
    if (!region) {
      sendError(res, 'Specified region not found', 404);
      return;
    }

    // Explicitly compute delinquency
    const delinquency = computeLoanDelinquency({
      overdueAmount: Number(overdueAmount) || 0,
      firstMissedDueDate: firstMissedDueDate ? new Date(firstMissedDueDate) : null,
      status: requestedStatus,
    });

    const newLoan = await LoanAccount.create({
      accountNumber: normalizedAccNum,
      borrowerName: borrowerName.trim(),
      borrowerEmail: borrowerEmail.toLowerCase().trim(),
      borrowerPhone: borrowerPhone.trim(),
      borrowerAddress: borrowerAddress ? borrowerAddress.trim() : '',
      loanType: loanType || 'PERSONAL',
      principalAmount: Number(principalAmount),
      interestRate: Number(interestRate) || 0,
      tenureMonths: Number(tenureMonths) || 12,
      emiAmount: Number(emiAmount),
      totalOutstanding: Number(totalOutstanding),
      overdueAmount: Number(overdueAmount) || 0,
      missedEmisCount: Number(missedEmisCount) || 0,
      lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate) : null,
      nextDueDate: new Date(nextDueDate),
      firstMissedDueDate: firstMissedDueDate ? new Date(firstMissedDueDate) : null,
      dpd: delinquency.dpd,
      bucket: delinquency.bucket,
      status: delinquency.status,
      region: regionId,
    });

    const populatedLoan = await LoanAccount.findById(newLoan._id).populate('region', 'name code isActive');

    sendSuccess(res, 'Loan account created successfully', { loan: populatedLoan }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Existing Loan Account with Explicit DPD Recalculation
 * PATCH /api/v1/loans/:id
 */
export const updateLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid loan ID format', 400);
      return;
    }

    const loan = await LoanAccount.findById(id);
    if (!loan) {
      sendError(res, 'Loan account not found', 404);
      return;
    }

    const {
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      borrowerAddress,
      loanType,
      totalOutstanding,
      overdueAmount,
      missedEmisCount,
      lastPaymentDate,
      nextDueDate,
      firstMissedDueDate,
      region: regionId,
      status: targetStatus,
    } = req.body;

    if (borrowerName) loan.borrowerName = borrowerName.trim();
    if (borrowerEmail) loan.borrowerEmail = borrowerEmail.toLowerCase().trim();
    if (borrowerPhone) loan.borrowerPhone = borrowerPhone.trim();
    if (borrowerAddress !== undefined) loan.borrowerAddress = borrowerAddress.trim();
    if (loanType) loan.loanType = loanType;
    if (totalOutstanding !== undefined) loan.totalOutstanding = Number(totalOutstanding);
    if (overdueAmount !== undefined) loan.overdueAmount = Math.max(0, Number(overdueAmount));
    if (missedEmisCount !== undefined) loan.missedEmisCount = Math.max(0, Number(missedEmisCount));
    if (lastPaymentDate !== undefined) loan.lastPaymentDate = lastPaymentDate ? new Date(lastPaymentDate) : null;
    if (nextDueDate) loan.nextDueDate = new Date(nextDueDate);
    if (firstMissedDueDate !== undefined) loan.firstMissedDueDate = firstMissedDueDate ? new Date(firstMissedDueDate) : null;

    if (regionId) {
      if (!mongoose.Types.ObjectId.isValid(regionId)) {
        sendError(res, 'Invalid region ID', 400);
        return;
      }
      const region = await Region.findById(regionId);
      if (!region) {
        sendError(res, 'Region not found', 404);
        return;
      }
      loan.region = regionId;
    }

    // If explicit status update provided (e.g. marking SETTLED or CLOSED)
    if (targetStatus) {
      loan.status = targetStatus;
    }

    // EXPLICIT RECALCULATION of DPD, Bucket, and Status
    // (Enforcing terminal status preservation for SETTLED / CLOSED)
    const delinquency = computeLoanDelinquency({
      overdueAmount: loan.overdueAmount,
      firstMissedDueDate: loan.firstMissedDueDate,
      status: loan.status,
    });

    loan.dpd = delinquency.dpd;
    loan.bucket = delinquency.bucket;
    loan.status = delinquency.status;

    await loan.save();

    const populatedLoan = await LoanAccount.findById(loan._id)
      .populate('region', 'name code isActive')
      .populate({
        path: 'assignedAgent',
        select: 'employeeCode user phone isActive',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('assignedSupervisor', 'name email role');

    sendSuccess(res, 'Loan account updated successfully', { loan: populatedLoan }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Batch Recalculate DPD Across All Loan Accounts
 * POST /api/v1/loans/recalculate-dpd
 */
export const batchRecalculateDPD = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await recalculateAllLoansDPD();

    sendSuccess(
      res,
      `DPD recalculation completed. Updated ${result.updatedCount} of ${result.totalCount} active accounts.`,
      result,
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / Close Loan Account
 * DELETE /api/v1/loans/:id
 */
export const deleteLoan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid loan ID format', 400);
      return;
    }

    const loan = await LoanAccount.findById(id);
    if (!loan) {
      sendError(res, 'Loan account not found', 404);
      return;
    }

    // Safe terminal closure
    loan.status = 'CLOSED';
    loan.overdueAmount = 0;
    loan.dpd = 0;
    loan.bucket = '0-30';
    await loan.save();

    sendSuccess(res, 'Loan account closed successfully', { loan }, 200);
  } catch (error) {
    next(error);
  }
};
