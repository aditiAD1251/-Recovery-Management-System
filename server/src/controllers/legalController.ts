import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LegalCase } from '../models/LegalCase.js';
import { LoanAccount } from '../models/LoanAccount.js';
import {
  CreateLegalCaseDTO,
  UpdateLegalCaseDTO,
  IssueLegalNoticeDTO,
  UpdateLegalNoticeStatusDTO,
  RecordHearingDTO,
  ExecuteWriteOffDTO,
  LegalCaseStatus,
} from '../types/legal.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Generate unique human-readable case number: LEG-YYYYMM-XXXX
 */
const generateCaseNumber = async (): Promise<string> => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await LegalCase.countDocuments();
  const sequence = String(count + 1).padStart(4, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `LEG-${yearMonth}-${sequence}${randomSuffix}`;
};

/**
 * @desc    Create a new legal recovery escalation / case
 * @route   POST /api/v1/legal
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
export const createLegalCase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const {
      loanAccount: loanId,
      reason,
      justification,
      caseType,
      priority = 'HIGH',
      assignedLegalOfficer,
      courtName,
      advocateName,
      advocatePhone,
      claimAmount,
      remarks,
    } = req.body as CreateLegalCaseDTO;

    if (!loanId || !reason || !justification || !caseType) {
      sendError(
        res,
        'loanAccount, reason, justification, and caseType are required',
        400
      );
      return;
    }

    const loan = await LoanAccount.findById(loanId);
    if (!loan) {
      sendError(res, 'Loan account not found', 404);
      return;
    }

    if (['SETTLED', 'CLOSED', 'WRITTEN_OFF'].includes(loan.status)) {
      sendError(
        res,
        `Cannot escalate loan in terminal status '${loan.status}' to Legal`,
        400
      );
      return;
    }

    // Check for existing active legal case
    const existingActiveCase = await LegalCase.findOne({
      loanAccount: loan._id,
      status: { $nin: ['CLOSED', 'WRITTEN_OFF', 'SETTLED'] },
    });

    if (existingActiveCase) {
      sendError(
        res,
        `An active legal case already exists for this loan (Case Number: ${existingActiveCase.caseNumber}, Status: ${existingActiveCase.status})`,
        409
      );
      return;
    }

    // Mandatory Rule: Escalation below 90 DPD requires justification
    if (loan.dpd < 90 && (!justification || justification.trim().length < 10)) {
      sendError(
        res,
        'Escalation for accounts below 90 DPD requires a detailed justification explaining why early legal recourse is necessary.',
        400
      );
      return;
    }

    const caseNumber = await generateCaseNumber();
    const effectiveClaimAmount =
      claimAmount !== undefined && Number(claimAmount) > 0
        ? Number(claimAmount)
        : loan.totalOutstanding;

    const auditEntry = {
      action: 'CASE_ESCALATED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      notes: `Case escalated by ${user.name} (${user.role}). Reason: ${reason}. Action Type: ${caseType}. Justification: ${justification}`,
      previousStatus: undefined,
      newStatus: 'ESCALATED' as LegalCaseStatus,
    };

    const legalCase = await LegalCase.create({
      caseNumber,
      loanAccount: loan._id,
      escalatedBy: user.id,
      assignedLegalOfficer: assignedLegalOfficer || (user.role === 'LEGAL_HEAD' ? user.id : null),
      reason,
      justification: justification.trim(),
      caseType,
      priority,
      status: 'ESCALATED',
      courtName: courtName || '',
      advocateName: advocateName || '',
      advocatePhone: advocatePhone || '',
      claimAmount: effectiveClaimAmount,
      recoveredAmount: 0,
      notices: [],
      hearings: [],
      writeOffDetails: null,
      auditHistory: [auditEntry],
      remarks: remarks || '',
    });

    // If loan is not already in DEFAULT, transition to DEFAULT upon legal escalation
    if (loan.status !== 'DEFAULT') {
      loan.status = 'DEFAULT';
      await loan.save();
    }

    const populated = await LegalCase.findById(legalCase._id)
      .populate('loanAccount', 'accountNumber borrowerName totalOutstanding overdueAmount dpd bucket status borrowerPhone borrowerEmail')
      .populate('escalatedBy', 'name email role')
      .populate('assignedLegalOfficer', 'name email role');

    sendSuccess(res, 'Legal case created and escalated successfully', populated, 201);
  } catch (error: any) {
    console.error('Error creating legal case:', error);
    sendError(res, error.message || 'Failed to create legal case', 500);
  }
};

/**
 * @desc    Get legal cases with filtering, search & pagination
 * @route   GET /api/v1/legal
 * @access  Private (LEGAL_HEAD, SUPERVISOR, ADMIN, AGENT)
 */
export const getLegalCases = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      loanAccount,
      status,
      priority,
      caseType,
      assignedLegalOfficer,
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

    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }

    if (caseType && caseType !== 'ALL') {
      filter.caseType = caseType;
    }

    if (assignedLegalOfficer) {
      filter.assignedLegalOfficer = assignedLegalOfficer;
    }

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
        { caseNumber: { $regex: searchTerm, $options: 'i' } },
        { courtName: { $regex: searchTerm, $options: 'i' } },
        { courtCaseNumber: { $regex: searchTerm, $options: 'i' } },
        { advocateName: { $regex: searchTerm, $options: 'i' } },
        { remarks: { $regex: searchTerm, $options: 'i' } },
        { loanAccount: { $in: matchingLoanIds } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [cases, total] = await Promise.all([
      LegalCase.find(filter)
        .populate('loanAccount', 'accountNumber borrowerName totalOutstanding overdueAmount dpd bucket status borrowerPhone borrowerEmail borrowerAddress')
        .populate('escalatedBy', 'name email role')
        .populate('assignedLegalOfficer', 'name email role')
        .populate('notices.issuedBy', 'name email role')
        .populate('hearings.loggedBy', 'name email role')
        .populate('auditHistory.performedBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      LegalCase.countDocuments(filter),
    ]);

    sendSuccess(res, 'Legal cases retrieved successfully', {
      cases,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching legal cases:', error);
    sendError(res, error.message || 'Failed to fetch legal cases', 500);
  }
};

/**
 * @desc    Get single legal case by ID
 * @route   GET /api/v1/legal/:id
 * @access  Private (LEGAL_HEAD, SUPERVISOR, ADMIN, AGENT)
 */
export const getLegalCaseById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid legal case ID', 400);
      return;
    }

    const legalCase = await LegalCase.findById(id)
      .populate('loanAccount')
      .populate('escalatedBy', 'name email role')
      .populate('assignedLegalOfficer', 'name email role')
      .populate('notices.issuedBy', 'name email role')
      .populate('hearings.loggedBy', 'name email role')
      .populate('writeOffDetails.approvedBy', 'name email role')
      .populate('auditHistory.performedBy', 'name email role');

    if (!legalCase) {
      sendError(res, 'Legal case not found', 404);
      return;
    }

    sendSuccess(res, 'Legal case details retrieved', legalCase);
  } catch (error: any) {
    console.error('Error fetching legal case details:', error);
    sendError(res, error.message || 'Failed to fetch legal case details', 500);
  }
};

/**
 * @desc    Update legal case information / status
 * @route   PATCH /api/v1/legal/:id
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
export const updateLegalCase = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const updateData = req.body as UpdateLegalCaseDTO;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid legal case ID', 400);
      return;
    }

    const legalCase = await LegalCase.findById(id);
    if (!legalCase) {
      sendError(res, 'Legal case not found', 404);
      return;
    }

    const previousStatus = legalCase.status;

    if (updateData.status && updateData.status !== legalCase.status) {
      legalCase.status = updateData.status;
      legalCase.auditHistory.push({
        action: 'STATUS_UPDATED',
        performedBy: user.id as any,
        performedAt: new Date(),
        role: user.role,
        notes: `Case status changed from '${previousStatus}' to '${updateData.status}'`,
        previousStatus,
        newStatus: updateData.status,
      } as any);
    }

    if (updateData.priority) legalCase.priority = updateData.priority;
    if (updateData.assignedLegalOfficer !== undefined) {
      legalCase.assignedLegalOfficer = updateData.assignedLegalOfficer as any;
    }
    if (updateData.courtName !== undefined) legalCase.courtName = updateData.courtName;
    if (updateData.courtCaseNumber !== undefined) legalCase.courtCaseNumber = updateData.courtCaseNumber;
    if (updateData.advocateName !== undefined) legalCase.advocateName = updateData.advocateName;
    if (updateData.advocatePhone !== undefined) legalCase.advocatePhone = updateData.advocatePhone;
    if (updateData.advocateEmail !== undefined) legalCase.advocateEmail = updateData.advocateEmail;
    if (updateData.filingDate !== undefined) {
      legalCase.filingDate = updateData.filingDate ? new Date(updateData.filingDate) : null;
    }
    if (updateData.nextHearingDate !== undefined) {
      legalCase.nextHearingDate = updateData.nextHearingDate ? new Date(updateData.nextHearingDate) : null;
    }
    if (updateData.recoveredAmount !== undefined) {
      legalCase.recoveredAmount = Number(updateData.recoveredAmount);
    }
    if (updateData.remarks !== undefined) legalCase.remarks = updateData.remarks;

    await legalCase.save();

    const populated = await LegalCase.findById(legalCase._id)
      .populate('loanAccount')
      .populate('escalatedBy', 'name email role')
      .populate('assignedLegalOfficer', 'name email role');

    sendSuccess(res, 'Legal case updated successfully', populated);
  } catch (error: any) {
    console.error('Error updating legal case:', error);
    sendError(res, error.message || 'Failed to update legal case', 500);
  }
};

/**
 * @desc    Issue a statutory legal notice on a case
 * @route   POST /api/v1/legal/:id/notices
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
export const issueLegalNotice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const {
      noticeType,
      noticeDate,
      trackingNumber,
      dispatchMode = 'SPEED_POST',
      responseDueDate,
      remarks,
    } = req.body as IssueLegalNoticeDTO;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid legal case ID', 400);
      return;
    }

    if (!noticeType) {
      sendError(res, 'noticeType is required', 400);
      return;
    }

    const legalCase = await LegalCase.findById(id);
    if (!legalCase) {
      sendError(res, 'Legal case not found', 404);
      return;
    }

    const nDate = noticeDate ? new Date(noticeDate) : new Date();
    const rDueDate = responseDueDate ? new Date(responseDueDate) : null;

    const noticeEntry = {
      noticeType,
      noticeDate: nDate,
      trackingNumber: (trackingNumber || '').trim(),
      dispatchMode,
      issuedBy: user.id as any,
      responseDueDate: rDueDate,
      responseStatus: 'AWAITING_RESPONSE',
      remarks: (remarks || '').trim(),
    };

    legalCase.notices.push(noticeEntry as any);

    // Update status if currently ESCALATED
    const previousStatus = legalCase.status;
    if (legalCase.status === 'ESCALATED') {
      legalCase.status = 'NOTICE_SENT';
    }

    legalCase.auditHistory.push({
      action: 'NOTICE_ISSUED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      notes: `Statutory notice '${noticeType}' issued via ${dispatchMode}. Tracking Code: ${trackingNumber || 'N/A'}.`,
      previousStatus,
      newStatus: legalCase.status,
    } as any);

    await legalCase.save();

    const populated = await LegalCase.findById(legalCase._id)
      .populate('loanAccount')
      .populate('notices.issuedBy', 'name email role');

    sendSuccess(res, 'Legal notice issued and recorded successfully', populated);
  } catch (error: any) {
    console.error('Error issuing legal notice:', error);
    sendError(res, error.message || 'Failed to issue legal notice', 500);
  }
};

/**
 * @desc    Update legal notice response status (e.g. Reply Received, Settled)
 * @route   PATCH /api/v1/legal/:id/notices/:noticeId
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
export const updateLegalNoticeStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id, noticeId } = req.params;
    const { responseStatus, responseDate, borrowerResponseNotes } =
      req.body as UpdateLegalNoticeStatusDTO;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noticeId)) {
      sendError(res, 'Invalid case or notice ID', 400);
      return;
    }

    const legalCase = await LegalCase.findById(id);
    if (!legalCase) {
      sendError(res, 'Legal case not found', 404);
      return;
    }

    const notice = (legalCase.notices as any).id(noticeId);
    if (!notice) {
      sendError(res, 'Notice not found in this case file', 404);
      return;
    }

    notice.responseStatus = responseStatus;
    notice.responseDate = responseDate ? new Date(responseDate) : new Date();
    if (borrowerResponseNotes !== undefined) {
      notice.borrowerResponseNotes = borrowerResponseNotes.trim();
    }

    legalCase.auditHistory.push({
      action: 'NOTICE_RESPONSE_LOGGED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      notes: `Notice response updated to '${responseStatus}'. Notes: ${borrowerResponseNotes || 'None'}`,
      previousStatus: legalCase.status,
      newStatus: legalCase.status,
    } as any);

    await legalCase.save();

    sendSuccess(res, 'Legal notice response updated successfully', legalCase);
  } catch (error: any) {
    console.error('Error updating notice response:', error);
    sendError(res, error.message || 'Failed to update notice response', 500);
  }
};

/**
 * @desc    Record a court hearing and next hearing date
 * @route   POST /api/v1/legal/:id/hearings
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
export const recordHearing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const {
      hearingDate,
      stage,
      courtName,
      judgeBench,
      summary,
      outcome,
      nextHearingDate,
    } = req.body as RecordHearingDTO;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid legal case ID', 400);
      return;
    }

    if (!hearingDate || !stage || !summary) {
      sendError(res, 'hearingDate, stage, and summary are required', 400);
      return;
    }

    const legalCase = await LegalCase.findById(id);
    if (!legalCase) {
      sendError(res, 'Legal case not found', 404);
      return;
    }

    const hDate = new Date(hearingDate);
    const nextHDate = nextHearingDate ? new Date(nextHearingDate) : null;

    const hearingEntry = {
      hearingDate: hDate,
      stage: stage.trim(),
      courtName: (courtName || legalCase.courtName || '').trim(),
      judgeBench: (judgeBench || '').trim(),
      summary: summary.trim(),
      outcome: (outcome || '').trim(),
      nextHearingDate: nextHDate,
      loggedBy: user.id as any,
    };

    legalCase.hearings.push(hearingEntry as any);

    if (courtName) legalCase.courtName = courtName.trim();
    if (nextHDate) {
      legalCase.nextHearingDate = nextHDate;
    }

    const previousStatus = legalCase.status;
    if (nextHDate) {
      legalCase.status = 'HEARING_SCHEDULED';
    } else if (['ESCALATED', 'NOTICE_SENT'].includes(legalCase.status)) {
      legalCase.status = 'IN_LITIGATION';
    }

    legalCase.auditHistory.push({
      action: 'HEARING_RECORDED',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      notes: `Hearing logged for stage '${stage}'. Outcome: ${outcome || 'Adjourned'}. Next hearing: ${nextHDate ? nextHDate.toISOString().slice(0, 10) : 'None'}.`,
      previousStatus,
      newStatus: legalCase.status,
    } as any);

    await legalCase.save();

    const populated = await LegalCase.findById(legalCase._id)
      .populate('loanAccount')
      .populate('hearings.loggedBy', 'name email role');

    sendSuccess(res, 'Hearing record logged successfully', populated);
  } catch (error: any) {
    console.error('Error recording hearing:', error);
    sendError(res, error.message || 'Failed to record hearing', 500);
  }
};

/**
 * @desc    Execute a debt write-off on an uncollectible legal case
 * @route   POST /api/v1/legal/:id/write-off
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
export const executeWriteOff = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reason, remarks, writeOffAmount } = req.body as ExecuteWriteOffDTO;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid legal case ID', 400);
      return;
    }

    if (!reason || !reason.trim()) {
      sendError(res, 'Write-off reason is required', 400);
      return;
    }

    const legalCase = await LegalCase.findById(id);
    if (!legalCase) {
      sendError(res, 'Legal case not found', 404);
      return;
    }

    if (['WRITTEN_OFF', 'CLOSED', 'SETTLED'].includes(legalCase.status)) {
      sendError(
        res,
        `Cannot execute write-off on case in terminal status '${legalCase.status}'`,
        400
      );
      return;
    }

    const loan = await LoanAccount.findById(legalCase.loanAccount);
    if (!loan) {
      sendError(res, 'Associated loan account not found', 404);
      return;
    }

    const effectiveWriteOff =
      writeOffAmount !== undefined && Number(writeOffAmount) > 0
        ? Number(writeOffAmount)
        : loan.totalOutstanding;

    const unrecoveredPrincipal = loan.principalAmount;
    const unrecoveredInterest = Math.max(0, effectiveWriteOff - unrecoveredPrincipal);

    const writeOffRecord = {
      writeOffAmount: effectiveWriteOff,
      unrecoveredPrincipal,
      unrecoveredInterest,
      reason: reason.trim(),
      approvedBy: user.id as any,
      approvedAt: new Date(),
      writeOffReference: `WO-${Date.now()}`,
      remarks: (remarks || '').trim(),
    };

    const previousStatus = legalCase.status;
    legalCase.status = 'WRITTEN_OFF';
    legalCase.writeOffDetails = writeOffRecord as any;

    legalCase.auditHistory.push({
      action: 'DEBT_WRITTEN_OFF',
      performedBy: user.id as any,
      performedAt: new Date(),
      role: user.role,
      notes: `Uncollectible debt of ₹${effectiveWriteOff.toLocaleString()} written off by ${user.role}. Reason: ${reason}`,
      previousStatus,
      newStatus: 'WRITTEN_OFF',
    } as any);

    await legalCase.save();

    // Mark LoanAccount as WRITTEN_OFF
    loan.status = 'WRITTEN_OFF';
    await loan.save();

    const populated = await LegalCase.findById(legalCase._id)
      .populate('loanAccount')
      .populate('writeOffDetails.approvedBy', 'name email role')
      .populate('auditHistory.performedBy', 'name email role');

    sendSuccess(
      res,
      'Debt write-off executed and recorded. Loan account status updated to WRITTEN_OFF.',
      populated
    );
  } catch (error: any) {
    console.error('Error executing write-off:', error);
    sendError(res, error.message || 'Failed to execute write-off', 500);
  }
};
