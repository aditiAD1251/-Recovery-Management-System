'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { AgentNav } from '../../components/AgentNav';
import {
  LoanAccountItem,
  AgentWorkspaceSummary,
  CollectionAttemptItem,
  PromiseToPayItem,
  SettlementRequestItem,
  LegalCaseItem,
  LegalEscalationReason,
  LegalActionType,
  LegalPriority,
  ContactMode,
  AttemptOutcome,
  PtpStatus,
  DelinquencyBucket,
  LoanType,
} from '../../types';
import { getMyAssignedLoansApi } from '../../services/loanApi';
import {
  getCollectionAttemptsApi,
  createCollectionAttemptApi,
} from '../../services/collectionAttemptApi';
import {
  getPromisesToPayApi,
  createPromiseToPayApi,
  updatePromiseToPayApi,
} from '../../services/promiseToPayApi';
import {
  getSettlementsApi,
  createSettlementApi,
} from '../../services/settlementApi';
import {
  getLegalCasesApi,
  createLegalCaseApi,
} from '../../services/legalApi';
import {
  Gavel,
  Scale,
  AlertOctagon,
  Briefcase,
  AlertTriangle,
  Clock,
  CalendarCheck,
  Search,
  Filter,
  Eye,
  PlusCircle,
  PhoneCall,
  Calendar,
  DollarSign,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  X,
  FileText,
  BadgeAlert,
} from 'lucide-react';

export default function AgentDashboardPage() {
  const { token, user } = useAuth();

  // Agent workspace state
  const [loans, setLoans] = useState<LoanAccountItem[]>([]);
  const [summary, setSummary] = useState<AgentWorkspaceSummary | null>(null);
  const [agentProfile, setAgentProfile] = useState<{
    id: string;
    employeeCode: string;
    phone?: string;
    region?: { name: string; code: string };
    isActive: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLoanType, setSelectedLoanType] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Active Loan Details Modal state
  const [selectedLoan, setSelectedLoan] = useState<LoanAccountItem | null>(null);
  const [activeTab, setActiveTab] = useState<'ATTEMPTS' | 'PTP' | 'SETTLEMENTS' | 'LEGAL'>('ATTEMPTS');
  const [attempts, setAttempts] = useState<CollectionAttemptItem[]>([]);
  const [ptps, setPtps] = useState<PromiseToPayItem[]>([]);
  const [loanSettlements, setLoanSettlements] = useState<SettlementRequestItem[]>([]);
  const [loanLegalCases, setLoanLegalCases] = useState<LegalCaseItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Record Attempt Modal state
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState(false);
  const [attemptLoan, setAttemptLoan] = useState<LoanAccountItem | null>(null);
  const [attemptMode, setAttemptMode] = useState<ContactMode>('PHONE');
  const [attemptOutcome, setAttemptOutcome] = useState<AttemptOutcome>('CONTACTED');
  const [attemptRemarks, setAttemptRemarks] = useState('');
  const [attemptDate, setAttemptDate] = useState(new Date().toISOString().slice(0, 16));
  const [attemptFollowUp, setAttemptFollowUp] = useState('');
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

  // Record PTP Modal state
  const [isPtpModalOpen, setIsPtpModalOpen] = useState(false);
  const [ptpLoan, setPtpLoan] = useState<LoanAccountItem | null>(null);
  const [ptpDate, setPtpDate] = useState('');
  const [ptpAmount, setPtpAmount] = useState<number | ''>('');
  const [ptpRemarks, setPtpRemarks] = useState('');
  const [isSubmittingPtp, setIsSubmittingPtp] = useState(false);

  // Propose Settlement Modal state
  const [isProposeSettlementModalOpen, setIsProposeSettlementModalOpen] = useState(false);
  const [settlementLoan, setSettlementLoan] = useState<LoanAccountItem | null>(null);
  const [settlementProposedAmount, setSettlementProposedAmount] = useState<number | ''>('');
  const [settlementReason, setSettlementReason] = useState('');
  const [settlementValidUntil, setSettlementValidUntil] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);

  // Agent Escalate to Legal Modal state
  const [isAgentLegalEscalateModalOpen, setIsAgentLegalEscalateModalOpen] = useState(false);
  const [legalEscalateLoan, setLegalEscalateLoan] = useState<LoanAccountItem | null>(null);
  const [agentEscalateReason, setAgentEscalateReason] = useState<LegalEscalationReason>('REFUSAL_TO_PAY');
  const [agentEscalateJustification, setAgentEscalateJustification] = useState('');
  const [agentEscalateCaseType, setAgentEscalateCaseType] = useState<LegalActionType>('SECTION_138_NI_ACT');
  const [agentEscalatePriority, setAgentEscalatePriority] = useState<LegalPriority>('HIGH');
  const [isSubmittingAgentEscalate, setIsSubmittingAgentEscalate] = useState(false);

  // Fetch agent assigned loans
  const fetchAssignedLoans = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getMyAssignedLoansApi(token, {
        page,
        limit: 10,
        search: searchTerm || undefined,
        bucket: selectedBucket !== 'ALL' ? selectedBucket : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        loanType: selectedLoanType !== 'ALL' ? selectedLoanType : undefined,
      });

      if (res.success) {
        setLoans(res.data.loans);
        setSummary(res.data.summary);
        setAgentProfile(res.data.agent as any);
        setTotalPages(res.data.pagination.totalPages);
        setTotalCount(res.data.pagination.total);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load assigned loans');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, searchTerm, selectedBucket, selectedStatus, selectedLoanType]);

  useEffect(() => {
    fetchAssignedLoans();
  }, [fetchAssignedLoans]);

  // Fetch Collection Attempts, PTPs, Settlements & Legal Cases when a loan is selected
  const fetchLoanDetailsHistory = useCallback(async (loanId: string) => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const [attemptsRes, ptpsRes, settlementsRes, legalRes] = await Promise.all([
        getCollectionAttemptsApi(token, { loanAccount: loanId }),
        getPromisesToPayApi(token, { loanAccount: loanId }),
        getSettlementsApi(token, { loanAccount: loanId }),
        getLegalCasesApi(token, { loanAccount: loanId }),
      ]);

      if (attemptsRes.success) {
        setAttempts(attemptsRes.data.attempts);
      }
      if (ptpsRes.success) {
        setPtps(ptpsRes.data.ptps);
      }
      if (settlementsRes.success) {
        setLoanSettlements(settlementsRes.data.settlements);
      }
      if (legalRes.success) {
        setLoanLegalCases(legalRes.data.cases);
      }
    } catch (err: any) {
      console.error('Failed to load history for loan:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token]);

  // Handle View Loan Details
  const handleViewLoanDetails = (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    setActiveTab('ATTEMPTS');
    fetchLoanDetailsHistory(loan.id || (loan as any)._id);
  };

  // Open Record Attempt Modal
  const handleOpenAttemptModal = (loan: LoanAccountItem) => {
    setAttemptLoan(loan);
    setAttemptMode('PHONE');
    setAttemptOutcome('CONTACTED');
    setAttemptRemarks('');
    setAttemptDate(new Date().toISOString().slice(0, 16));
    setAttemptFollowUp('');
    setIsAttemptModalOpen(true);
  };

  // Submit Collection Attempt
  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !attemptLoan) return;

    if (!attemptRemarks.trim()) {
      setErrorMsg('Remarks are required for collection attempt');
      return;
    }

    setIsSubmittingAttempt(true);
    setErrorMsg(null);

    try {
      const loanId = attemptLoan.id || (attemptLoan as any)._id;
      const res = await createCollectionAttemptApi(token, {
        loanAccount: loanId,
        contactMode: attemptMode,
        outcome: attemptOutcome,
        remarks: attemptRemarks.trim(),
        attemptedAt: attemptDate ? new Date(attemptDate).toISOString() : undefined,
        nextFollowUpDate: attemptFollowUp ? new Date(attemptFollowUp).toISOString() : null,
      });

      if (res.success) {
        setSuccessMsg(`Collection attempt recorded successfully for Account ${attemptLoan.accountNumber}`);
        setIsAttemptModalOpen(false);
        fetchAssignedLoans();
        if (selectedLoan && (selectedLoan.id === loanId || (selectedLoan as any)._id === loanId)) {
          fetchLoanDetailsHistory(loanId);
        }
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record collection attempt');
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  // Open Create PTP Modal
  const handleOpenPtpModal = (loan: LoanAccountItem) => {
    setPtpLoan(loan);
    // Default promised date to 3 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setPtpDate(d.toISOString().slice(0, 10));
    setPtpAmount(loan.emiAmount || loan.overdueAmount || 1000);
    setPtpRemarks('');
    setIsPtpModalOpen(true);
  };

  // Submit PTP
  const handleSubmitPtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !ptpLoan) return;

    if (!ptpDate) {
      setErrorMsg('Promised date is required');
      return;
    }

    if (!ptpAmount || Number(ptpAmount) <= 0) {
      setErrorMsg('Promised amount must be greater than 0');
      return;
    }

    setIsSubmittingPtp(true);
    setErrorMsg(null);

    try {
      const loanId = ptpLoan.id || (ptpLoan as any)._id;
      const res = await createPromiseToPayApi(token, {
        loanAccount: loanId,
        promisedDate: new Date(ptpDate).toISOString(),
        promisedAmount: Number(ptpAmount),
        remarks: ptpRemarks.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`Promise to Pay (₹${Number(ptpAmount).toLocaleString('en-IN')}) recorded for Account ${ptpLoan.accountNumber}`);
        setIsPtpModalOpen(false);
        fetchAssignedLoans();
        if (selectedLoan && (selectedLoan.id === loanId || (selectedLoan as any)._id === loanId)) {
          fetchLoanDetailsHistory(loanId);
        }
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create Promise to Pay');
    } finally {
      setIsSubmittingPtp(false);
    }
  };

  // Update PTP Status
  const handleUpdatePtpStatus = async (ptpId: string, status: PtpStatus) => {
    if (!token) return;
    try {
      const res = await updatePromiseToPayApi(token, ptpId, { status });
      if (res.success) {
        setSuccessMsg(`PTP status updated to ${status}`);
        if (selectedLoan) {
          fetchLoanDetailsHistory(selectedLoan.id || (selectedLoan as any)._id);
        }
        fetchAssignedLoans();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update PTP status');
    }
  };

  // Open Propose Settlement Modal
  const handleOpenProposeSettlementModal = (loan: LoanAccountItem) => {
    setSettlementLoan(loan);
    // Default proposed amount to 80% of balance
    const defaultProposed = Math.round(loan.totalOutstanding * 0.8);
    setSettlementProposedAmount(defaultProposed);
    setSettlementReason('');
    setSettlementValidUntil(
      new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
    );
    setIsProposeSettlementModalOpen(true);
  };

  // Submit Settlement Proposal
  const handleSubmitSettlementProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !settlementLoan) return;

    if (!settlementProposedAmount || Number(settlementProposedAmount) <= 0) {
      setErrorMsg('Proposed settlement amount must be greater than 0');
      return;
    }

    if (!settlementReason.trim()) {
      setErrorMsg('Hardship reason / justification is required for settlement proposal');
      return;
    }

    setIsSubmittingSettlement(true);
    setErrorMsg(null);

    try {
      const loanId = settlementLoan.id || (settlementLoan as any)._id;
      const res = await createSettlementApi(token, {
        loanAccount: loanId,
        proposedAmount: Number(settlementProposedAmount),
        reason: settlementReason.trim(),
        validUntil: settlementValidUntil,
      });

      if (res.success) {
        setSuccessMsg(`Settlement proposal of ₹${Number(settlementProposedAmount).toLocaleString('en-IN')} submitted successfully.`);
        setIsProposeSettlementModalOpen(false);
        fetchAssignedLoans();
        if (selectedLoan && (selectedLoan.id === loanId || (selectedLoan as any)._id === loanId)) {
          fetchLoanDetailsHistory(loanId);
        }
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit settlement proposal');
    } finally {
      setIsSubmittingSettlement(false);
    }
  };

  // Open Escalate to Legal Modal
  const handleOpenAgentLegalEscalateModal = (loan: LoanAccountItem) => {
    setLegalEscalateLoan(loan);
    setAgentEscalateReason(loan.dpd >= 90 ? 'CHRONIC_DEFAULT_90_PLUS' : 'REFUSAL_TO_PAY');
    setAgentEscalateJustification('');
    setAgentEscalateCaseType('SECTION_138_NI_ACT');
    setAgentEscalatePriority('HIGH');
    setIsAgentLegalEscalateModalOpen(true);
  };

  // Submit Escalate to Legal
  const handleSubmitAgentLegalEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !legalEscalateLoan) return;

    if (!agentEscalateJustification.trim()) {
      setErrorMsg('Escalation justification is required');
      return;
    }

    setIsSubmittingAgentEscalate(true);
    setErrorMsg(null);

    try {
      const loanId = legalEscalateLoan.id || (legalEscalateLoan as any)._id;
      const res = await createLegalCaseApi(token, {
        loanAccount: loanId,
        reason: agentEscalateReason,
        justification: agentEscalateJustification.trim(),
        caseType: agentEscalateCaseType,
        priority: agentEscalatePriority,
      });

      if (res.success) {
        setSuccessMsg(`Account successfully escalated to Legal Division (Case: ${res.data.caseNumber}).`);
        setIsAgentLegalEscalateModalOpen(false);
        fetchAssignedLoans();
        if (selectedLoan && (selectedLoan.id === loanId || (selectedLoan as any)._id === loanId)) {
          fetchLoanDetailsHistory(loanId);
        }
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to escalate account to Legal');
    } finally {
      setIsSubmittingAgentEscalate(false);
    }
  };

  const getBucketBadge = (bucket: string) => {
    switch (bucket) {
      case '0-30':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case '31-60':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case '61-90':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case '90+':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getOutcomeBadge = (outcome: AttemptOutcome) => {
    switch (outcome) {
      case 'PROMISE_TO_PAY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CONTACTED':
      case 'CALLBACK_REQUESTED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'NOT_REACHABLE':
      case 'WRONG_NUMBER':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'REFUSED_TO_PAY':
      case 'CUSTOMER_DECEASED':
      case 'ADDRESS_NOT_FOUND':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getPtpStatusBadge = (status: PtpStatus) => {
    switch (status) {
      case 'KEPT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'BROKEN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['AGENT']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        {/* Navigation Bar */}
        <AgentNav
          employeeCode={agentProfile?.employeeCode}
          regionName={agentProfile?.region?.name}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/30 text-rose-200 text-sm flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-200 text-sm flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                onClick={() => setSuccessMsg(null)}
                className="text-emerald-400 hover:text-emerald-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Welcome Banner & KPI Cards Strip */}
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Collection Agent Workspace &bull; Step 6 Active</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Field Recovery Workspace
                  </h1>
                  <p className="text-sm text-slate-400">
                    Track your assigned delinquent portfolio, record borrower interactions, and manage Promise-to-Pay schedules.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Assigned Agent
                  </span>
                  <span className="text-sm font-bold text-white">{user?.name}</span>
                  <div className="flex items-center gap-2 justify-end mt-0.5">
                    <span className="text-xs text-amber-400 font-mono font-bold">
                      {agentProfile?.employeeCode || 'AGT'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({agentProfile?.region?.name || 'Region'})
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Cards Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* KPI 1: My Assigned Loans */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                      My Assigned Loans
                    </span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {summary?.totalAssigned ?? (isLoading ? '...' : 0)}
                    </span>
                    <span className="text-xs text-slate-400">active accounts</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Allocated for collection</p>
                </div>

                {/* KPI 2: Total Overdue Amount */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                      Total Overdue Amount
                    </span>
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-rose-400">
                      ₹{((summary?.totalOverdue || 0) / 1000).toFixed(1)}k
                    </span>
                    <span className="text-xs text-slate-400">overdue</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Exact: ₹{(summary?.totalOverdue || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* KPI 3: 90+ DPD Accounts */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                      90+ DPD Accounts
                    </span>
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-rose-400">
                      {summary?.dpd90PlusCount ?? (isLoading ? '...' : 0)}
                    </span>
                    <span className="text-xs text-slate-400">NPA critical</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Immediate recovery focus</p>
                </div>

                {/* KPI 4: Today's Follow-ups */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      Today&apos;s Follow-ups
                    </span>
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {summary?.todayFollowupsCount ?? (isLoading ? '...' : 0)}
                    </span>
                    <span className="text-xs text-slate-400">due today</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Follow-up calls &amp; PTPs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table Container: My Assigned Loans */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search account #, borrower name, phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Bucket Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Bucket:
                </span>
                {['ALL', '0-30', '31-60', '61-90', '90+'].map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setSelectedBucket(b);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                      selectedBucket === b
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLoanType}
                  onChange={(e) => {
                    setSelectedLoanType(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Loan Types</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="HOME">Home</option>
                  <option value="AUTO">Auto</option>
                  <option value="BUSINESS">Business</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DELINQUENT">Delinquent</option>
                  <option value="DEFAULT">Default / NPA</option>
                  <option value="CURRENT">Current</option>
                </select>

                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBucket('ALL');
                    setSelectedStatus('ALL');
                    setSelectedLoanType('ALL');
                    setPage(1);
                  }}
                  title="Reset Filters"
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Account Number</th>
                    <th className="py-3.5 px-4 font-semibold">Borrower Name</th>
                    <th className="py-3.5 px-4 font-semibold">Type</th>
                    <th className="py-3.5 px-4 font-semibold">DPD</th>
                    <th className="py-3.5 px-4 font-semibold">Bucket</th>
                    <th className="py-3.5 px-4 font-semibold">EMI</th>
                    <th className="py-3.5 px-4 font-semibold">Overdue Amount</th>
                    <th className="py-3.5 px-4 font-semibold">Next Due Date</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          <span>Loading your assigned accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Briefcase className="w-8 h-8 text-slate-600" />
                          <span className="font-semibold text-slate-300">No assigned loan accounts found</span>
                          <span className="text-xs text-slate-500">
                            You currently have no overdue accounts matching your filter criteria.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
                      <tr
                        key={loan.id || (loan as any)._id}
                        className="hover:bg-slate-800/40 transition"
                      >
                        {/* Account Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {loan.accountNumber}
                        </td>

                        {/* Borrower Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">{loan.borrowerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{loan.borrowerPhone}</div>
                        </td>

                        {/* Loan Type */}
                        <td className="py-3.5 px-4 font-medium text-slate-300">
                          {loan.loanType}
                        </td>

                        {/* DPD */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-mono font-bold ${
                              loan.dpd >= 90
                                ? 'text-rose-400'
                                : loan.dpd >= 30
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {loan.dpd} DPD
                          </span>
                        </td>

                        {/* Bucket Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getBucketBadge(
                              loan.bucket
                            )}`}
                          >
                            {loan.bucket}
                          </span>
                        </td>

                        {/* EMI */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          ₹{loan.emiAmount?.toLocaleString('en-IN')}
                        </td>

                        {/* Overdue Amount */}
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                          ₹{loan.overdueAmount?.toLocaleString('en-IN')}
                        </td>

                        {/* Next Due Date */}
                        <td className="py-3.5 px-4 text-slate-400">
                          {loan.nextDueDate
                            ? new Date(loan.nextDueDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              loan.status === 'DEFAULT'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : loan.status === 'DELINQUENT'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => handleViewLoanDetails(loan)}
                              title="View Loan & History Details"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>Details</span>
                            </button>

                            {/* Record Attempt */}
                            <button
                              onClick={() => handleOpenAttemptModal(loan)}
                              title="Record Collection Attempt"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                              <span>Attempt</span>
                            </button>

                            {/* Record PTP */}
                            <button
                              onClick={() => handleOpenPtpModal(loan)}
                              title="Record Promise to Pay"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                            >
                              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>PTP</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
                <span>
                  Showing {loans.length} of {totalCount} assigned accounts
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-mono font-bold text-white">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* MODAL 1: LOAN DETAILS & COLLECTION WORKSPACE (Attempts & PTP Timeline)   */}
        {/* ========================================================================= */}
        {selectedLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        Account #{selectedLoan.accountNumber}
                      </h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getBucketBadge(
                          selectedLoan.bucket
                        )}`}
                      >
                        {selectedLoan.bucket} Bucket &bull; {selectedLoan.dpd} DPD
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Borrower: <strong className="text-slate-200">{selectedLoan.borrowerName}</strong> &bull; Loan Type: {selectedLoan.loanType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => handleOpenAttemptModal(selectedLoan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Record Attempt</span>
                  </button>
                  <button
                    onClick={() => handleOpenPtpModal(selectedLoan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Record PTP</span>
                  </button>
                  <button
                    onClick={() => handleOpenProposeSettlementModal(selectedLoan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Propose Settlement</span>
                  </button>
                  <button
                    onClick={() => handleOpenAgentLegalEscalateModal(selectedLoan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>Escalate to Legal</span>
                  </button>
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 3-Column Info Cards Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Information */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800/80 pb-1.5">
                      Borrower Details
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-semibold text-white">{selectedLoan.borrowerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono">{selectedLoan.borrowerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-mono truncate">{selectedLoan.borrowerEmail}</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="text-slate-400">{selectedLoan.borrowerAddress || 'Address on file'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Loan Financial Metrics */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block border-b border-slate-800/80 pb-1.5">
                      Financial Summary
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Outstanding:</span>
                        <span className="font-mono font-bold text-white">
                          ₹{selectedLoan.totalOutstanding?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Overdue Amount:</span>
                        <span className="font-mono font-bold text-rose-400">
                          ₹{selectedLoan.overdueAmount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly EMI:</span>
                        <span className="font-mono text-slate-300">
                          ₹{selectedLoan.emiAmount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Missed EMIs:</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {selectedLoan.missedEmisCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment & Delinquency */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block border-b border-slate-800/80 pb-1.5">
                      Recovery Context
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">DPD / Bucket:</span>
                        <span className="font-mono font-bold text-white">
                          {selectedLoan.dpd} days ({selectedLoan.bucket})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Loan Status:</span>
                        <span className="font-semibold text-amber-400">
                          {selectedLoan.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Assigned Date:</span>
                        <span className="text-slate-300">
                          {selectedLoan.assignedAt
                            ? new Date(selectedLoan.assignedAt).toLocaleDateString('en-GB')
                            : 'Active'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Attempts:</span>
                        <span className="font-mono font-bold text-white">{attempts.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs: Collection Attempts vs Promise to Pay vs Settlements vs Legal */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('ATTEMPTS')}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        activeTab === 'ATTEMPTS'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Attempts ({attempts.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('PTP')}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        activeTab === 'PTP'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <CalendarCheck className="w-4 h-4" />
                      <span>PTPs ({ptps.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('SETTLEMENTS')}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        activeTab === 'SETTLEMENTS'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                      <span>Settlements ({loanSettlements.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('LEGAL')}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        activeTab === 'LEGAL'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Gavel className="w-4 h-4" />
                      <span>Legal Cases ({loanLegalCases.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: Collection Attempts Timeline */}
                  {activeTab === 'ATTEMPTS' && (
                    <div className="space-y-3">
                      {isLoadingHistory ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Loading collection attempt history...
                        </div>
                      ) : attempts.length === 0 ? (
                        <div className="py-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <MessageSquare className="w-6 h-6 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-300 font-semibold">No collection attempts recorded yet</p>
                          <p className="text-[11px] text-slate-500">
                            Click &quot;Record Attempt&quot; above to log your first contact with this borrower.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {attempts.map((attempt) => (
                            <div
                              key={attempt.id || (attempt as any)._id}
                              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 relative"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    {attempt.contactMode}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getOutcomeBadge(
                                      attempt.outcome
                                    )}`}
                                  >
                                    {attempt.outcome.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {new Date(attempt.attemptedAt).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}{' '}
                                    &bull;{' '}
                                    {new Date(attempt.attemptedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-400">
                                  Agent: <strong className="text-slate-300">{typeof attempt.agent === 'object' ? attempt.agent.name : 'You'}</strong>
                                </div>
                              </div>

                              <p className="text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                                {attempt.remarks}
                              </p>

                              {attempt.nextFollowUpDate && (
                                <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>
                                    Next Follow-up:{' '}
                                    {new Date(attempt.nextFollowUpDate).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Promise to Pay History */}
                  {activeTab === 'PTP' && (
                    <div className="space-y-3">
                      {isLoadingHistory ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Loading Promise to Pay history...
                        </div>
                      ) : ptps.length === 0 ? (
                        <div className="py-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <CalendarCheck className="w-6 h-6 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-300 font-semibold">No Promise-to-Pay agreements recorded</p>
                          <p className="text-[11px] text-slate-500">
                            When a borrower commits to a payment date, log a Promise to Pay to track fulfillment.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ptps.map((ptp) => (
                            <div
                              key={ptp.id || (ptp as any)._id}
                              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-base font-mono font-extrabold text-emerald-400">
                                    ₹{ptp.promisedAmount?.toLocaleString('en-IN')}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPtpStatusBadge(
                                      ptp.status
                                    )}`}
                                  >
                                    {ptp.status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  <span>
                                    Promised Date:{' '}
                                    <strong className="text-slate-200">
                                      {new Date(ptp.promisedDate).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </strong>
                                  </span>
                                </div>
                              </div>

                              {ptp.remarks && (
                                <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                                  {ptp.remarks}
                                </p>
                              )}

                              {/* Status Update Controls */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                                <span className="text-slate-500">Update PTP Status:</span>
                                <div className="flex items-center gap-1.5">
                                  {ptp.status !== 'KEPT' && (
                                    <button
                                      onClick={() => handleUpdatePtpStatus(ptp.id || (ptp as any)._id, 'KEPT')}
                                      className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold transition"
                                    >
                                      Mark Kept
                                    </button>
                                  )}
                                  {ptp.status !== 'BROKEN' && (
                                    <button
                                      onClick={() => handleUpdatePtpStatus(ptp.id || (ptp as any)._id, 'BROKEN')}
                                      className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold transition"
                                    >
                                      Mark Broken
                                    </button>
                                  )}
                                  {ptp.status !== 'CANCELLED' && (
                                    <button
                                      onClick={() => handleUpdatePtpStatus(ptp.id || (ptp as any)._id, 'CANCELLED')}
                                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold transition"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Settlements History */}
                  {activeTab === 'SETTLEMENTS' && (
                    <div className="space-y-3">
                      {isLoadingHistory ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Loading settlement history...
                        </div>
                      ) : loanSettlements.length === 0 ? (
                        <div className="py-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <Scale className="w-6 h-6 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-300 font-semibold">No settlement proposals on this account</p>
                          <p className="text-[11px] text-slate-500">
                            If the customer is facing severe hardship and requesting a negotiated lump-sum waiver, click &quot;Propose Settlement&quot; above.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {loanSettlements.map((s) => (
                            <div
                              key={s.id || (s as any)._id}
                              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-base font-mono font-extrabold text-purple-400">
                                    ₹{s.proposedAmount?.toLocaleString('en-IN')}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                      s.status === 'SETTLED'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : s.status === 'PAYMENT_PENDING'
                                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                        : s.status === 'REJECTED'
                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    {s.status.replace(/_/g, ' ')}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-400">
                                  Waiver: <strong className="text-rose-400 font-mono">₹{s.waivedAmount?.toLocaleString('en-IN')} ({s.waiverPercentage}%)</strong>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                                <strong className="text-slate-400 block text-[10px] uppercase">Hardship Reason:</strong>
                                &ldquo;{s.reason}&rdquo;
                              </p>

                              {s.reviewNotes && (
                                <p className="text-xs text-purple-300 bg-purple-950/30 p-2.5 rounded-lg border border-purple-800/40">
                                  <strong className="text-purple-400 block text-[10px] uppercase">Reviewer Feedback:</strong>
                                  {s.reviewNotes}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                <span>Valid Until: {new Date(s.validUntil).toLocaleDateString('en-GB')}</span>
                                <span>Created: {new Date(s.createdAt).toLocaleDateString('en-GB')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Legal Cases & Litigation */}
                  {activeTab === 'LEGAL' && (
                    <div className="space-y-3">
                      {isLoadingHistory ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Loading legal case records...
                        </div>
                      ) : loanLegalCases.length === 0 ? (
                        <div className="py-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                          <Gavel className="w-6 h-6 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-300 font-semibold">No active legal cases for this account</p>
                          <p className="text-[11px] text-slate-500">
                            For non-compliant or chronic default accounts requiring statutory demand notices or court proceedings, click &quot;Escalate to Legal&quot;.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {loanLegalCases.map((lc) => (
                            <div
                              key={lc.id || (lc as any)._id}
                              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-white text-xs">{lc.caseNumber}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {lc.caseType.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  {lc.status.replace(/_/g, ' ')}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                                <strong className="text-slate-400 block text-[10px] uppercase">Justification:</strong>
                                &ldquo;{lc.justification}&rdquo;
                              </p>

                              {lc.notices && lc.notices.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-blue-400 block">Dispatched Notices ({lc.notices.length}):</span>
                                  {lc.notices.map((n, idx) => (
                                    <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] flex justify-between">
                                      <span>{n.noticeType.replace(/_/g, ' ')} ({n.dispatchMode})</span>
                                      <span className="font-mono text-purple-300">{n.trackingNumber || 'Dispatched'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {lc.nextHearingDate && (
                                <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5 pt-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>Next Court Hearing: {new Date(lc.nextHearingDate).toLocaleDateString('en-GB')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: RECORD COLLECTION ATTEMPT FORM                                  */}
        {/* ========================================================================= */}
        {isAttemptModalOpen && attemptLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Record Collection Attempt</h3>
                    <p className="text-xs text-slate-400">
                      Account #{attemptLoan.accountNumber} &bull; {attemptLoan.borrowerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAttemptModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAttempt} className="p-6 space-y-4 text-xs">
                {/* Contact Date & Time */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Contact Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    value={attemptDate}
                    onChange={(e) => setAttemptDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Contact Mode */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Contact Mode *</label>
                  <select
                    value={attemptMode}
                    onChange={(e) => setAttemptMode(e.target.value as ContactMode)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="PHONE">Phone Call</option>
                    <option value="SMS">SMS Message</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="FIELD_VISIT">Field Visit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Outcome */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Attempt Outcome *</label>
                  <select
                    value={attemptOutcome}
                    onChange={(e) => setAttemptOutcome(e.target.value as AttemptOutcome)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="CONTACTED">Contacted (Customer Spoke)</option>
                    <option value="PROMISE_TO_PAY">Promise to Pay (PTP)</option>
                    <option value="CALLBACK_REQUESTED">Callback Requested</option>
                    <option value="NOT_REACHABLE">Not Reachable / Busy</option>
                    <option value="WRONG_NUMBER">Wrong Number</option>
                    <option value="REFUSED_TO_PAY">Refused to Pay</option>
                    <option value="CUSTOMER_DECEASED">Customer Deceased</option>
                    <option value="ADDRESS_NOT_FOUND">Address Not Found</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Interaction Remarks *</label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed conversation notes, customer response, or follow-up reason..."
                    value={attemptRemarks}
                    onChange={(e) => setAttemptRemarks(e.target.value)}
                    required
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-slate-500 text-right">
                    {attemptRemarks.length}/1000 characters
                  </div>
                </div>

                {/* Next Follow-up Date */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Next Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    value={attemptFollowUp}
                    onChange={(e) => setAttemptFollowUp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAttemptModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAttempt}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50 transition shadow-lg"
                  >
                    {isSubmittingAttempt ? 'Recording Attempt...' : 'Save Collection Attempt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: RECORD PROMISE TO PAY FORM                                      */}
        {/* ========================================================================= */}
        {isPtpModalOpen && ptpLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Record Promise to Pay (PTP)</h3>
                    <p className="text-xs text-slate-400">
                      Account #{ptpLoan.accountNumber} &bull; Overdue: ₹{ptpLoan.overdueAmount?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPtpModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitPtp} className="p-6 space-y-4 text-xs">
                {/* Promised Date */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Promised Payment Date *</label>
                  <input
                    type="date"
                    value={ptpDate}
                    onChange={(e) => setPtpDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Promised Amount */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Promised Amount (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    value={ptpAmount}
                    onChange={(e) => setPtpAmount(e.target.value ? Number(e.target.value) : '')}
                    required
                    placeholder="Enter amount customer agreed to pay..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">PTP Agreement Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="E.g., Borrower confirmed will pay 1 overdue EMI via NetBanking transfer..."
                    value={ptpRemarks}
                    onChange={(e) => setPtpRemarks(e.target.value)}
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPtpModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPtp}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50 transition shadow-lg"
                  >
                    {isSubmittingPtp ? 'Recording PTP...' : 'Save Promise to Pay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: PROPOSE SETTLEMENT FORM                                         */}
        {/* ========================================================================= */}
        {isProposeSettlementModalOpen && settlementLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-fadeIn">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Propose Negotiated Settlement</h3>
                    <p className="text-xs text-slate-400">
                      Account #{settlementLoan.accountNumber} &bull; Total Balance: ₹{settlementLoan.totalOutstanding?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProposeSettlementModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSettlementProposal} className="p-6 space-y-4 text-xs">
                {/* Balance & Calculation Preview */}
                {(() => {
                  const proposed = Number(settlementProposedAmount) || 0;
                  const total = settlementLoan.totalOutstanding || 0;
                  const waived = Math.max(0, total - proposed);
                  const waiverPct = total > 0 ? Math.min(100, Math.round((waived / total) * 100)) : 0;

                  return (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div>
                          <span className="text-slate-400 block uppercase text-[9px]">Total Balance</span>
                          <span className="font-bold text-white">₹{total.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-purple-400 block uppercase text-[9px]">Proposed Lump-Sum</span>
                          <span className="font-bold text-purple-300">₹{proposed.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-rose-400 block uppercase text-[9px]">Waiver Discount</span>
                          <span className="font-bold text-rose-400">₹{waived.toLocaleString('en-IN')} ({waiverPct}%)</span>
                        </div>
                      </div>

                      {waiverPct > 25 && (
                        <p className="text-[10px] text-amber-400 font-medium pt-1.5 border-t border-slate-800/80">
                          &bull; Note: Waiver exceeds standard 25% supervisor threshold. This proposal will require sign-off by the Legal / Recovery Head.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Proposed Settlement Amount */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Offered Settlement Amount (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    value={settlementProposedAmount}
                    onChange={(e) => setSettlementProposedAmount(e.target.value ? Number(e.target.value) : '')}
                    required
                    placeholder="Enter agreed lump-sum settlement amount..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 font-mono font-bold"
                  />
                </div>

                {/* Hardship Reason */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Hardship Reason / Justification *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain borrower circumstances (e.g. medical emergency, job loss, business liquidation)..."
                    value={settlementReason}
                    onChange={(e) => setSettlementReason(e.target.value)}
                    maxLength={1000}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Valid Until Date */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Settlement Offer Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={settlementValidUntil}
                    onChange={(e) => setSettlementValidUntil(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsProposeSettlementModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSettlement}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 transition shadow-lg"
                  >
                    {isSubmittingSettlement ? 'Submitting Proposal...' : 'Submit Settlement Proposal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: ESCALATE TO LEGAL FORM                                          */}
        {/* ========================================================================= */}
        {isAgentLegalEscalateModalOpen && legalEscalateLoan && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-fadeIn">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Gavel className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Escalate to Legal Division</h3>
                    <p className="text-xs text-slate-400">
                      Account #{legalEscalateLoan.accountNumber} &bull; {legalEscalateLoan.borrowerName} ({legalEscalateLoan.dpd} DPD)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAgentLegalEscalateModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAgentLegalEscalate} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Escalation Reason *</label>
                    <select
                      value={agentEscalateReason}
                      onChange={(e) => setAgentEscalateReason(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="REFUSAL_TO_PAY">Refusal to Pay / Uncooperative</option>
                      <option value="CHRONIC_DEFAULT_90_PLUS">Chronic Default 90+ DPD (NPA)</option>
                      <option value="FRAUD_SUSPECTED">Suspected Document Fraud</option>
                      <option value="CHEQUE_BOUNCE_SEC_138">Section 138 Cheque Bounce</option>
                      <option value="UNTRACEABLE_BORROWER">Untraceable / Absconded</option>
                      <option value="EARLY_RISK_JUSTIFIED">Early Risk Recourse (&lt; 90 DPD)</option>
                      <option value="OTHER">Other Reason</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Recommended Action *</label>
                    <select
                      value={agentEscalateCaseType}
                      onChange={(e) => setAgentEscalateCaseType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="SECTION_138_NI_ACT">Section 138 NI Act Notice</option>
                      <option value="LEGAL_DEMAND_NOTICE">Statutory Demand Notice</option>
                      <option value="SARFAESI_ACTION">SARFAESI Enforcement</option>
                      <option value="CIVIL_SUIT_DRT">Civil Suit / DRT Recovery</option>
                      <option value="ARBITRATION">Arbitration Tribunal</option>
                      <option value="LOK_ADALAT">Lok Adalat Referral</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Priority Level</label>
                  <select
                    value={agentEscalatePriority}
                    onChange={(e) => setAgentEscalatePriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="CRITICAL">Critical (Immediate action required)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Escalation Justification *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed narrative of collection attempts made and justification for legal intervention..."
                    value={agentEscalateJustification}
                    onChange={(e) => setAgentEscalateJustification(e.target.value)}
                    maxLength={1500}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAgentLegalEscalateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAgentEscalate}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50 transition shadow-lg"
                  >
                    {isSubmittingAgentEscalate ? 'Escalating...' : 'Confirm Legal Escalation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Recovery Portal &bull; Step 7 Settlement &amp; Legal Recovery Enabled
        </footer>
      </div>
    </ProtectedRoute>
  );
}
