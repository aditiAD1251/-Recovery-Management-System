'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { LegalNav } from '../../components/LegalNav';
import {
  LegalCaseItem,
  SettlementRequestItem,
  LegalNoticeItem,
  LoanAccountItem,
  LegalCaseStatus,
  LegalPriority,
  LegalEscalationReason,
  LegalActionType,
  NoticeType,
  NoticeResponseStatus,
} from '../../types';
import {
  getLegalCasesApi,
  getLegalCaseByIdApi,
  createLegalCaseApi,
  updateLegalCaseApi,
  issueLegalNoticeApi,
  updateLegalNoticeStatusApi,
  recordHearingApi,
  executeWriteOffApi,
} from '../../services/legalApi';
import {
  getSettlementsApi,
  reviewSettlementApi,
  completeSettlementApi,
} from '../../services/settlementApi';
import { getLoansApi } from '../../services/loanApi';
import {
  Scale,
  Gavel,
  CheckSquare,
  FileText,
  AlertOctagon,
  Search,
  Filter,
  Eye,
  PlusCircle,
  Calendar,
  Clock,
  DollarSign,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  X,
  Send,
  Building,
  History,
  FileCheck,
  Ban,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

export default function LegalDashboardPage() {
  const { token, user } = useAuth();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'CASES' | 'SETTLEMENTS' | 'NOTICES' | 'NPA_ACCOUNTS'>('CASES');

  // Legal Cases State
  const [cases, setCases] = useState<LegalCaseItem[]>([]);
  const [casesTotal, setCasesTotal] = useState(0);
  const [casesPage, setCasesPage] = useState(1);
  const [casesTotalPages, setCasesTotalPages] = useState(1);
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>('ALL');
  const [casePriorityFilter, setCasePriorityFilter] = useState<string>('ALL');
  const [caseSearchTerm, setCaseSearchTerm] = useState('');

  // Settlements Approvals State
  const [settlements, setSettlements] = useState<SettlementRequestItem[]>([]);
  const [settlementsTotal, setSettlementsTotal] = useState(0);
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<string>('ALL');
  const [settlementSearchTerm, setSettlementSearchTerm] = useState('');

  // 90+ DPD / NPA Portfolio State
  const [npaLoans, setNpaLoans] = useState<LoanAccountItem[]>([]);
  const [npaTotal, setNpaTotal] = useState(0);
  const [npaSearchTerm, setNpaSearchTerm] = useState('');

  // Loading & Message States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: View Case File Details
  const [selectedCase, setSelectedCase] = useState<LegalCaseItem | null>(null);
  const [caseDetailTab, setCaseDetailTab] = useState<'OVERVIEW' | 'NOTICES' | 'HEARINGS' | 'AUDIT'>('OVERVIEW');

  // Modal: Issue Legal Notice
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeCase, setNoticeCase] = useState<LegalCaseItem | null>(null);
  const [noticeType, setNoticeType] = useState<NoticeType>('SECTION_138_NOTICE');
  const [noticeTrackingNumber, setNoticeTrackingNumber] = useState('');
  const [noticeDispatchMode, setNoticeDispatchMode] = useState<'SPEED_POST' | 'REGISTERED_AD' | 'EMAIL' | 'HAND_DELIVERY' | 'COURIER'>('SPEED_POST');
  const [noticeResponseDueDate, setNoticeResponseDueDate] = useState('');
  const [noticeRemarks, setNoticeRemarks] = useState('');
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);

  // Modal: Record Hearing
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [hearingCase, setHearingCase] = useState<LegalCaseItem | null>(null);
  const [hearingDate, setHearingDate] = useState(new Date().toISOString().slice(0, 10));
  const [hearingStage, setHearingStage] = useState('First Hearing / Summons');
  const [hearingCourtName, setHearingCourtName] = useState('');
  const [hearingJudgeBench, setHearingJudgeBench] = useState('');
  const [hearingSummary, setHearingSummary] = useState('');
  const [hearingOutcome, setHearingOutcome] = useState('');
  const [hearingNextDate, setHearingNextDate] = useState('');
  const [isSubmittingHearing, setIsSubmittingHearing] = useState(false);

  // Modal: Execute Write-Off
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [writeOffCase, setWriteOffCase] = useState<LegalCaseItem | null>(null);
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffRemarks, setWriteOffRemarks] = useState('');
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = useState(false);

  // Modal: Review Settlement (Approve / Reject / Escalate)
  const [isSettlementReviewModalOpen, setIsSettlementReviewModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRequestItem | null>(null);
  const [settlementAction, setSettlementAction] = useState<'APPROVE' | 'REJECT' | 'ESCALATE_TO_LEGAL'>('APPROVE');
  const [settlementReviewNotes, setSettlementReviewNotes] = useState('');
  const [isSubmittingSettlementReview, setIsSubmittingSettlementReview] = useState(false);

  // Modal: Complete Settlement Payment
  const [isPaymentConfirmModalOpen, setIsPaymentConfirmModalOpen] = useState(false);
  const [paymentSettlement, setPaymentSettlement] = useState<SettlementRequestItem | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER'>('NEFT');
  const [paymentPaidAmount, setPaymentPaidAmount] = useState<number | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal: Initiate Legal Case from NPA Portfolio
  const [isInitiateCaseModalOpen, setIsInitiateCaseModalOpen] = useState(false);
  const [npaLoanToEscalate, setNpaLoanToEscalate] = useState<LoanAccountItem | null>(null);
  const [escalateReason, setEscalateReason] = useState<LegalEscalationReason>('CHRONIC_DEFAULT_90_PLUS');
  const [escalateJustification, setEscalateJustification] = useState('');
  const [escalateCaseType, setEscalateCaseType] = useState<LegalActionType>('SECTION_138_NI_ACT');
  const [escalatePriority, setEscalatePriority] = useState<LegalPriority>('HIGH');
  const [escalateCourtName, setEscalateCourtName] = useState('');
  const [escalateAdvocateName, setEscalateAdvocateName] = useState('');
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);

  // 1. Fetch Legal Cases
  const fetchLegalCases = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getLegalCasesApi(token, {
        page: casesPage,
        limit: 10,
        status: caseStatusFilter !== 'ALL' ? caseStatusFilter : undefined,
        priority: casePriorityFilter !== 'ALL' ? casePriorityFilter : undefined,
        search: caseSearchTerm || undefined,
      });
      if (res.success) {
        setCases(res.data.cases);
        setCasesTotal(res.data.pagination.total);
        setCasesTotalPages(res.data.pagination.totalPages);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load legal cases');
    } finally {
      setIsLoading(false);
    }
  }, [token, casesPage, caseStatusFilter, casePriorityFilter, caseSearchTerm]);

  // 2. Fetch Settlements for Approvals Queue
  const fetchSettlements = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getSettlementsApi(token, {
        status: settlementStatusFilter !== 'ALL' ? settlementStatusFilter : undefined,
        search: settlementSearchTerm || undefined,
        limit: 20,
      });
      if (res.success) {
        setSettlements(res.data.settlements);
        setSettlementsTotal(res.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Failed to load settlements:', err.message);
    }
  }, [token, settlementStatusFilter, settlementSearchTerm]);

  // 3. Fetch 90+ DPD Defaulted Portfolio
  const fetchNpaPortfolio = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getLoansApi(token, {
        bucket: '90+',
        search: npaSearchTerm || undefined,
        limit: 20,
      });
      if (res.success) {
        setNpaLoans(res.data.loans);
        setNpaTotal(res.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Failed to load 90+ DPD accounts:', err.message);
    }
  }, [token, npaSearchTerm]);

  // Initial and reactive data fetching
  useEffect(() => {
    if (activeTab === 'CASES' || activeTab === 'NOTICES') {
      fetchLegalCases();
    } else if (activeTab === 'SETTLEMENTS') {
      fetchSettlements();
    } else if (activeTab === 'NPA_ACCOUNTS') {
      fetchNpaPortfolio();
    }
  }, [activeTab, fetchLegalCases, fetchSettlements, fetchNpaPortfolio]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Handler: Open Case Details
  const handleViewCase = async (c: LegalCaseItem) => {
    if (!token) return;
    try {
      const res = await getLegalCaseByIdApi(token, c.id || (c as any)._id);
      if (res.success) {
        setSelectedCase(res.data);
        setCaseDetailTab('OVERVIEW');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch complete case file');
    }
  };

  // Handler: Open Notice Modal
  const handleOpenNoticeModal = (c: LegalCaseItem) => {
    setNoticeCase(c);
    setNoticeType('SECTION_138_NOTICE');
    setNoticeTrackingNumber('');
    setNoticeDispatchMode('SPEED_POST');
    setNoticeResponseDueDate(
      new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
    );
    setNoticeRemarks('');
    setIsNoticeModalOpen(true);
  };

  // Handler: Submit Notice
  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !noticeCase) return;
    setIsSubmittingNotice(true);
    try {
      const caseId = noticeCase.id || (noticeCase as any)._id;
      const res = await issueLegalNoticeApi(token, caseId, {
        noticeType,
        trackingNumber: noticeTrackingNumber,
        dispatchMode: noticeDispatchMode,
        responseDueDate: noticeResponseDueDate || undefined,
        remarks: noticeRemarks,
      });
      if (res.success) {
        setSuccessMsg(`Statutory notice '${noticeType}' issued successfully.`);
        setIsNoticeModalOpen(false);
        fetchLegalCases();
        if (selectedCase && (selectedCase.id === caseId || (selectedCase as any)._id === caseId)) {
          setSelectedCase(res.data);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue legal notice');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  // Handler: Open Hearing Modal
  const handleOpenHearingModal = (c: LegalCaseItem) => {
    setHearingCase(c);
    setHearingDate(new Date().toISOString().slice(0, 10));
    setHearingStage('Hearing / Arguments');
    setHearingCourtName(c.courtName || '');
    setHearingJudgeBench('');
    setHearingSummary('');
    setHearingOutcome('');
    setHearingNextDate('');
    setIsHearingModalOpen(true);
  };

  // Handler: Submit Hearing
  const handleSubmitHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !hearingCase) return;
    if (!hearingSummary.trim()) {
      setErrorMsg('Hearing summary is required');
      return;
    }
    setIsSubmittingHearing(true);
    try {
      const caseId = hearingCase.id || (hearingCase as any)._id;
      const res = await recordHearingApi(token, caseId, {
        hearingDate,
        stage: hearingStage,
        courtName: hearingCourtName,
        judgeBench: hearingJudgeBench,
        summary: hearingSummary,
        outcome: hearingOutcome,
        nextHearingDate: hearingNextDate || null,
      });
      if (res.success) {
        setSuccessMsg('Court hearing and judicial calendar logged successfully.');
        setIsHearingModalOpen(false);
        fetchLegalCases();
        if (selectedCase && (selectedCase.id === caseId || (selectedCase as any)._id === caseId)) {
          setSelectedCase(res.data);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record court hearing');
    } finally {
      setIsSubmittingHearing(false);
    }
  };

  // Handler: Open Write-Off Modal
  const handleOpenWriteOffModal = (c: LegalCaseItem) => {
    setWriteOffCase(c);
    setWriteOffReason('');
    setWriteOffRemarks('');
    setIsWriteOffModalOpen(true);
  };

  // Handler: Submit Write-Off
  const handleSubmitWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !writeOffCase) return;
    if (!writeOffReason.trim()) {
      setErrorMsg('Write-off justification reason is required');
      return;
    }
    setIsSubmittingWriteOff(true);
    try {
      const caseId = writeOffCase.id || (writeOffCase as any)._id;
      const res = await executeWriteOffApi(token, caseId, {
        reason: writeOffReason,
        remarks: writeOffRemarks,
      });
      if (res.success) {
        setSuccessMsg('Debt written off. Loan account has been marked WRITTEN_OFF.');
        setIsWriteOffModalOpen(false);
        fetchLegalCases();
        if (selectedCase && (selectedCase.id === caseId || (selectedCase as any)._id === caseId)) {
          setSelectedCase(res.data);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute write-off');
    } finally {
      setIsSubmittingWriteOff(false);
    }
  };

  // Handler: Open Settlement Review Modal
  const handleOpenSettlementReviewModal = (s: SettlementRequestItem, action: 'APPROVE' | 'REJECT') => {
    setSelectedSettlement(s);
    setSettlementAction(action);
    setSettlementReviewNotes('');
    setIsSettlementReviewModalOpen(true);
  };

  // Handler: Submit Settlement Review
  const handleSubmitSettlementReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSettlement) return;
    if (!settlementReviewNotes.trim()) {
      setErrorMsg('Review notes / justification remarks are required');
      return;
    }
    setIsSubmittingSettlementReview(true);
    try {
      const sId = selectedSettlement.id || (selectedSettlement as any)._id;
      const res = await reviewSettlementApi(token, sId, {
        action: settlementAction,
        reviewNotes: settlementReviewNotes,
      });
      if (res.success) {
        setSuccessMsg(res.message);
        setIsSettlementReviewModalOpen(false);
        fetchSettlements();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit settlement review');
    } finally {
      setIsSubmittingSettlementReview(false);
    }
  };

  // Handler: Open Payment Confirmation Modal
  const handleOpenPaymentConfirmModal = (s: SettlementRequestItem) => {
    setPaymentSettlement(s);
    setPaymentRef('');
    setPaymentMode('NEFT');
    setPaymentPaidAmount(s.proposedAmount);
    setPaymentNotes('');
    setIsPaymentConfirmModalOpen(true);
  };

  // Handler: Submit Payment Confirmation
  const handleSubmitPaymentConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !paymentSettlement) return;
    if (!paymentRef.trim() || !paymentPaidAmount) {
      setErrorMsg('Payment reference and paid amount are required');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const sId = paymentSettlement.id || (paymentSettlement as any)._id;
      const res = await completeSettlementApi(token, sId, {
        paymentReference: paymentRef,
        paymentMode,
        paidAmount: Number(paymentPaidAmount),
        paymentReceiptNotes: paymentNotes,
      });
      if (res.success) {
        setSuccessMsg('Settlement finalized! Loan account transitioned to SETTLED.');
        setIsPaymentConfirmModalOpen(false);
        fetchSettlements();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete settlement payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handler: Open Initiate Escalation Modal from NPA table
  const handleOpenInitiateCaseModal = (loan: LoanAccountItem) => {
    setNpaLoanToEscalate(loan);
    setEscalateReason(loan.dpd >= 90 ? 'CHRONIC_DEFAULT_90_PLUS' : 'EARLY_RISK_JUSTIFIED');
    setEscalateJustification(
      loan.dpd >= 90
        ? `Account reached ${loan.dpd} DPD (NPA) with ₹${loan.overdueAmount.toLocaleString()} overdue. Multiple field outreach attempts unreturned.`
        : ''
    );
    setEscalateCaseType('SECTION_138_NI_ACT');
    setEscalatePriority('HIGH');
    setEscalateCourtName('');
    setEscalateAdvocateName('');
    setIsInitiateCaseModalOpen(true);
  };

  // Handler: Submit Escalation from NPA
  const handleSubmitInitiateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !npaLoanToEscalate) return;
    if (!escalateJustification.trim()) {
      setErrorMsg('Escalation justification is required');
      return;
    }
    setIsSubmittingEscalation(true);
    try {
      const loanId = npaLoanToEscalate.id || (npaLoanToEscalate as any)._id;
      const res = await createLegalCaseApi(token, {
        loanAccount: loanId,
        reason: escalateReason,
        justification: escalateJustification,
        caseType: escalateCaseType,
        priority: escalatePriority,
        courtName: escalateCourtName,
        advocateName: escalateAdvocateName,
      });
      if (res.success) {
        setSuccessMsg(`Legal case ${res.data.caseNumber} initiated successfully.`);
        setIsInitiateCaseModalOpen(false);
        setActiveTab('CASES');
        fetchLegalCases();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate legal escalation');
    } finally {
      setIsSubmittingEscalation(false);
    }
  };

  // Filter all notices for Tab 3
  const allNotices = cases.flatMap((c) =>
    (c.notices || []).map((n) => ({
      ...n,
      caseNumber: c.caseNumber,
      caseId: c.id || (c as any)._id,
      borrowerName: c.loanAccount?.borrowerName || 'Borrower',
      accountNumber: c.loanAccount?.accountNumber || 'N/A',
    }))
  );

  return (
    <ProtectedRoute allowedRoles={['LEGAL_HEAD', 'ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        {/* Legal Division Top Navigation */}
        <LegalNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 flex-1">
          {/* Notifications Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="p-1 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Metrics Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Litigation Queue
                </span>
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <Gavel className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{casesTotal}</span>
                <span className="text-xs text-slate-400">active legal cases</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Statutory &amp; court actions underway
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Settlement Approvals
                </span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{settlementsTotal}</span>
                <span className="text-xs text-slate-400">in review/pipeline</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Waiver proposals &amp; payment tracking
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Statutory Notices
                </span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{allNotices.length}</span>
                <span className="text-xs text-slate-400">dispatched notices</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Sec 138, SARFAESI &amp; Demand notices
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  90+ DPD (NPA) Queue
                </span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertOctagon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{npaTotal || '—'}</span>
                <span className="text-xs text-slate-400">high-risk accounts</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Eligible for immediate escalation
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: LITIGATION & CASES QUEUE */}
          {/* ========================================================================= */}
          {activeTab === 'CASES' && (
            <div className="space-y-4">
              {/* Filter Strip */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by case #, borrower, court..."
                    value={caseSearchTerm}
                    onChange={(e) => setCaseSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                  <select
                    value={caseStatusFilter}
                    onChange={(e) => setCaseStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ESCALATED">ESCALATED</option>
                    <option value="NOTICE_SENT">NOTICE_SENT</option>
                    <option value="IN_LITIGATION">IN_LITIGATION</option>
                    <option value="HEARING_SCHEDULED">HEARING_SCHEDULED</option>
                    <option value="DECREE_PASSED">DECREE_PASSED</option>
                    <option value="SETTLED">SETTLED</option>
                    <option value="WRITTEN_OFF">WRITTEN_OFF</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>

                  <select
                    value={casePriorityFilter}
                    onChange={(e) => setCasePriorityFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              {/* Legal Cases Table */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3.5">Case # &amp; Type</th>
                        <th className="px-5 py-3.5">Borrower Details</th>
                        <th className="px-5 py-3.5">Claim Amount</th>
                        <th className="px-5 py-3.5">Stage / Status</th>
                        <th className="px-5 py-3.5">Next Hearing / Court</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            Loading legal cases...
                          </td>
                        </tr>
                      ) : cases.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            No legal cases found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        cases.map((c) => {
                          const priorityColor =
                            c.priority === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : c.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30';

                          const statusColor =
                            c.status === 'WRITTEN_OFF'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : c.status === 'SETTLED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : c.status === 'HEARING_SCHEDULED'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

                          return (
                            <tr key={c.id || (c as any)._id} className="hover:bg-slate-800/30 transition">
                              <td className="px-5 py-4">
                                <div className="font-mono font-bold text-white text-xs">{c.caseNumber}</div>
                                <div className="text-[11px] text-purple-400 mt-0.5">{c.caseType.replace(/_/g, ' ')}</div>
                                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${priorityColor}`}>
                                  {c.priority}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-semibold text-white">{c.loanAccount?.borrowerName || 'Borrower'}</div>
                                <div className="text-slate-400 font-mono text-[11px]">{c.loanAccount?.accountNumber}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{c.loanAccount?.borrowerPhone}</div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-bold text-white text-sm">
                                  ₹{(c.claimAmount || 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  DPD: <span className="text-rose-400 font-semibold">{c.loanAccount?.dpd || 0}</span>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${statusColor}`}>
                                  {c.status.replace(/_/g, ' ')}
                                </span>
                                {c.notices && c.notices.length > 0 && (
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    {c.notices.length} notice(s) issued
                                  </div>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                {c.nextHearingDate ? (
                                  <div className="space-y-0.5">
                                    <div className="text-amber-400 font-semibold flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>{new Date(c.nextHearingDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                      {c.courtName || 'Court proceeding'}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-slate-500 italic">No hearing scheduled</div>
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleViewCase(c)}
                                    title="View Full Case File"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-950/60 border border-slate-700 hover:border-purple-700 text-slate-300 hover:text-purple-300 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenNoticeModal(c)}
                                    title="Issue Statutory Notice"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-700 text-slate-300 hover:text-blue-300 transition"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleOpenHearingModal(c)}
                                    title="Log Court Hearing"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-700 text-slate-300 hover:text-amber-300 transition"
                                  >
                                    <Gavel className="w-3.5 h-3.5" />
                                  </button>

                                  {c.status !== 'WRITTEN_OFF' && c.status !== 'SETTLED' && (
                                    <button
                                      onClick={() => handleOpenWriteOffModal(c)}
                                      title="Execute Debt Write-Off"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 transition"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SETTLEMENT APPROVALS HUB */}
          {/* ========================================================================= */}
          {activeTab === 'SETTLEMENTS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search settlement proposals..."
                    value={settlementSearchTerm}
                    onChange={(e) => setSettlementSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <select
                  value={settlementStatusFilter}
                  onChange={(e) => setSettlementStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_LEGAL_HEAD">Pending Legal Head Review</option>
                  <option value="PENDING_SUPERVISOR">Pending Supervisor Review</option>
                  <option value="PAYMENT_PENDING">Approved - Payment Pending</option>
                  <option value="SETTLED">Settled / Closed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settlements.length === 0 ? (
                  <div className="col-span-2 p-12 text-center text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
                    No settlement proposals in the queue.
                  </div>
                ) : (
                  settlements.map((s) => {
                    const isPendingLegal = s.status === 'PENDING_LEGAL_HEAD';
                    const isPaymentPending = s.status === 'PAYMENT_PENDING';
                    const isSettled = s.status === 'SETTLED';

                    return (
                      <div
                        key={s.id || (s as any)._id}
                        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl hover:border-slate-700 transition"
                      >
                        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-[10px] font-mono text-purple-400 block">
                              {s.loanAccount?.accountNumber}
                            </span>
                            <h3 className="text-base font-bold text-white">
                              {s.loanAccount?.borrowerName || 'Borrower'}
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              Proposed by: {s.requestedBy?.name} ({s.requestedBy?.role})
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isSettled
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : isPaymentPending
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : isPendingLegal
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {s.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Financial Comparison Box */}
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Total Balance</span>
                            <span className="font-semibold text-slate-200 text-xs">
                              ₹{s.totalOutstanding.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-purple-400 block uppercase">Proposed Amount</span>
                            <span className="font-extrabold text-white text-sm">
                              ₹{s.proposedAmount.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-rose-400 block uppercase">Waiver Discount</span>
                            <span className="font-semibold text-rose-400 text-xs">
                              ₹{s.waivedAmount.toLocaleString()} ({s.waiverPercentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Justification & Dates */}
                        <div className="space-y-1 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                          <p className="text-[11px] font-medium text-slate-400">Justification:</p>
                          <p className="text-slate-200 italic">&ldquo;{s.reason}&rdquo;</p>
                          <div className="pt-2 text-[10px] text-slate-500 flex justify-between">
                            <span>Valid Until: {new Date(s.validUntil).toLocaleDateString()}</span>
                            <span>Created: {new Date(s.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                          {isPendingLegal && (
                            <>
                              <button
                                onClick={() => handleOpenSettlementReviewModal(s, 'REJECT')}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleOpenSettlementReviewModal(s, 'APPROVE')}
                                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition"
                              >
                                Approve Settlement
                              </button>
                            </>
                          )}

                          {isPaymentPending && (
                            <button
                              onClick={() => handleOpenPaymentConfirmModal(s)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm Payment &amp; Mark SETTLED</span>
                            </button>
                          )}

                          {isSettled && (
                            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Paid &amp; Loan Account SETTLED</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: STATUTORY NOTICES REGISTER */}
          {/* ========================================================================= */}
          {activeTab === 'NOTICES' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Dispatched Statutory Notices Register</h3>
                    <p className="text-xs text-slate-400">
                      Central tracking of Section 138 NI Act, SARFAESI 13(2), and Statutory Demand Notices.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Notice Type</th>
                        <th className="px-4 py-3">Case # &amp; Borrower</th>
                        <th className="px-4 py-3">Dispatch Mode &amp; Tracking</th>
                        <th className="px-4 py-3">Notice Date</th>
                        <th className="px-4 py-3">Response Due Date</th>
                        <th className="px-4 py-3">Response Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allNotices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-slate-500">
                            No statutory notices recorded yet.
                          </td>
                        </tr>
                      ) : (
                        allNotices.map((n, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-semibold text-purple-400">
                              {n.noticeType.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-white">{n.borrowerName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{n.caseNumber}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-200">{n.dispatchMode}</div>
                              <div className="text-[10px] text-purple-300 font-mono">
                                {n.trackingNumber || 'No tracking code'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {new Date(n.noticeDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-amber-400 font-semibold">
                              {n.responseDueDate ? new Date(n.responseDueDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {n.responseStatus.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: 90+ DPD (NPA) PORTFOLIO */}
          {/* ========================================================================= */}
          {activeTab === 'NPA_ACCOUNTS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Defaulted 90+ DPD (NPA) Accounts</h3>
                  <p className="text-xs text-slate-400">
                    Accounts in critical default eligible for immediate statutory notice and court litigation.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search borrower or account..."
                    value={npaSearchTerm}
                    onChange={(e) => setNpaSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3.5">Account #</th>
                        <th className="px-5 py-3.5">Borrower Details</th>
                        <th className="px-5 py-3.5">Total Balance</th>
                        <th className="px-5 py-3.5">Overdue Amount</th>
                        <th className="px-5 py-3.5">DPD / Bucket</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {npaLoans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            No 90+ DPD defaulted accounts found.
                          </td>
                        </tr>
                      ) : (
                        npaLoans.map((loan) => (
                          <tr key={loan.id || (loan as any)._id} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-4 font-mono font-bold text-purple-400">
                              {loan.accountNumber}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white">{loan.borrowerName}</div>
                              <div className="text-[11px] text-slate-400">{loan.borrowerPhone}</div>
                            </td>
                            <td className="px-5 py-4 font-semibold text-white">
                              ₹{loan.totalOutstanding.toLocaleString()}
                            </td>
                            <td className="px-5 py-4 font-bold text-rose-400">
                              ₹{loan.overdueAmount.toLocaleString()}
                            </td>
                            <td className="px-5 py-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                {loan.dpd} DPD (NPA)
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => handleOpenInitiateCaseModal(loan)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition"
                              >
                                <Gavel className="w-3.5 h-3.5" />
                                <span>Initiate Legal Recourse</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: CASE FILE DETAILS (TIMELINE / HEARINGS / NOTICES / AUDIT) */}
          {/* ========================================================================= */}
          {selectedCase && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold">
                        {selectedCase.caseNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {selectedCase.caseType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedCase.loanAccount?.borrowerName} &bull; Case File
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedCase(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-tabs */}
                <div className="flex border-b border-slate-800 px-6 bg-slate-950/30 gap-4">
                  {(['OVERVIEW', 'NOTICES', 'HEARINGS', 'AUDIT'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCaseDetailTab(t)}
                      className={`py-3 text-xs font-semibold border-b-2 transition ${
                        caseDetailTab === t
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t} {t === 'NOTICES' && `(${selectedCase.notices?.length || 0})`}
                      {t === 'HEARINGS' && `(${selectedCase.hearings?.length || 0})`}
                    </button>
                  ))}
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-300">
                  {caseDetailTab === 'OVERVIEW' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block">Account Number</span>
                          <span className="font-mono font-bold text-white">{selectedCase.loanAccount?.accountNumber}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block">Claim Balance</span>
                          <span className="font-bold text-purple-400">₹{selectedCase.claimAmount?.toLocaleString()}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block">Escalation Reason</span>
                          <span className="font-semibold text-slate-200">{selectedCase.reason}</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase block">Status</span>
                          <span className="font-bold text-emerald-400">{selectedCase.status}</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-purple-400">Escalation Justification:</span>
                        <p className="text-slate-200 leading-relaxed italic">&ldquo;{selectedCase.justification}&rdquo;</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase block">Court / Forum</span>
                          <span className="font-semibold text-white">{selectedCase.courtName || 'Not specified'}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase block">Appointed Advocate</span>
                          <span className="font-semibold text-white">
                            {selectedCase.advocateName || 'In-House Legal Officer'} {selectedCase.advocatePhone && `(${selectedCase.advocatePhone})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {caseDetailTab === 'NOTICES' && (
                    <div className="space-y-3">
                      {selectedCase.notices?.length === 0 ? (
                        <p className="text-center py-6 text-slate-500 italic">No statutory notices issued on this case yet.</p>
                      ) : (
                        selectedCase.notices?.map((n, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-purple-400">{n.noticeType.replace(/_/g, ' ')}</span>
                              <span className="text-slate-400 text-[11px]">{new Date(n.noticeDate).toLocaleDateString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                              <div>Tracking: <span className="font-mono text-slate-200">{n.trackingNumber || 'N/A'}</span></div>
                              <div>Mode: <span className="text-slate-200">{n.dispatchMode}</span></div>
                              <div>Response Due: <span className="text-amber-400">{n.responseDueDate ? new Date(n.responseDueDate).toLocaleDateString() : 'N/A'}</span></div>
                              <div>Status: <span className="text-blue-400 font-semibold">{n.responseStatus}</span></div>
                            </div>
                            {n.remarks && <p className="text-slate-400 italic text-[11px]">&ldquo;{n.remarks}&rdquo;</p>}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {caseDetailTab === 'HEARINGS' && (
                    <div className="space-y-3">
                      {selectedCase.hearings?.length === 0 ? (
                        <p className="text-center py-6 text-slate-500 italic">No court hearings logged yet.</p>
                      ) : (
                        selectedCase.hearings?.map((h, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-400">{h.stage}</span>
                              <span className="text-slate-400 text-[11px]">{new Date(h.hearingDate).toLocaleDateString()}</span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              <p><span className="text-slate-400 font-semibold">Summary:</span> {h.summary}</p>
                              {h.outcome && <p className="mt-1"><span className="text-slate-400 font-semibold">Outcome:</span> {h.outcome}</p>}
                            </div>
                            {h.nextHearingDate && (
                              <div className="pt-2 border-t border-slate-800 text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Next Date: {new Date(h.nextHearingDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {caseDetailTab === 'AUDIT' && (
                    <div className="space-y-3">
                      {selectedCase.auditHistory?.map((a, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="font-bold text-purple-400">{a.action}</span>
                            <span>{new Date(a.performedAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-200">{a.notes}</p>
                          <span className="text-[10px] text-slate-500 font-mono">By: {a.performedBy?.name || 'System'} ({a.role})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/60">
                  <button
                    onClick={() => setSelectedCase(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: ISSUE STATUTORY NOTICE */}
          {/* ========================================================================= */}
          {isNoticeModalOpen && noticeCase && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitNotice}
                className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-purple-400" />
                    <span>Issue Statutory Legal Notice</span>
                  </h3>
                  <button type="button" onClick={() => setIsNoticeModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Notice Type *</label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="SECTION_138_NOTICE">Section 138 NI Act (Cheque Bounce)</option>
                      <option value="STATUTORY_DEMAND_NOTICE">Statutory Demand Notice (15-Day Final Warning)</option>
                      <option value="SARFAESI_13_2_NOTICE">SARFAESI Section 13(2) Demand</option>
                      <option value="SARFAESI_13_4_NOTICE">SARFAESI Section 13(4) Possession Notice</option>
                      <option value="LOAN_RECALL_NOTICE">Loan Acceleration &amp; Recall Notice</option>
                      <option value="FINAL_WARNING">Final Pre-Litigation Notice</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Dispatch Mode</label>
                      <select
                        value={noticeDispatchMode}
                        onChange={(e) => setNoticeDispatchMode(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="SPEED_POST">India Post Speed Post</option>
                        <option value="REGISTERED_AD">Registered Post AD</option>
                        <option value="COURIER">Commercial Courier</option>
                        <option value="EMAIL">Email &amp; Electronic</option>
                        <option value="HAND_DELIVERY">Hand Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Speed Post / Tracking Code</label>
                      <input
                        type="text"
                        placeholder="e.g. EM987654321IN"
                        value={noticeTrackingNumber}
                        onChange={(e) => setNoticeTrackingNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Response Due Date</label>
                    <input
                      type="date"
                      value={noticeResponseDueDate}
                      onChange={(e) => setNoticeResponseDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Remarks / Reference Details</label>
                    <textarea
                      rows={3}
                      placeholder="Enter postal receipt details, demand specifics..."
                      value={noticeRemarks}
                      onChange={(e) => setNoticeRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNoticeModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNotice}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingNotice ? 'Dispatching...' : 'Log & Dispatch Notice'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: RECORD COURT HEARING */}
          {/* ========================================================================= */}
          {isHearingModalOpen && hearingCase && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitHearing}
                className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-amber-400" />
                    <span>Log Court Hearing &amp; Proceedings</span>
                  </h3>
                  <button type="button" onClick={() => setIsHearingModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Hearing Date *</label>
                      <input
                        type="date"
                        required
                        value={hearingDate}
                        onChange={(e) => setHearingDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Procedural Stage *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Arguments, Summons, Evidence"
                        value={hearingStage}
                        onChange={(e) => setHearingStage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Court / Forum</label>
                      <input
                        type="text"
                        placeholder="e.g. MM Court No. 4 Pune"
                        value={hearingCourtName}
                        onChange={(e) => setHearingCourtName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Judge / Bench</label>
                      <input
                        type="text"
                        placeholder="e.g. Hon'ble Judicial Magistrate"
                        value={hearingJudgeBench}
                        onChange={(e) => setHearingJudgeBench(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Proceedings Summary *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Detailed record of court discussion, attendance, orders passed..."
                      value={hearingSummary}
                      onChange={(e) => setHearingSummary(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Outcome / Order</label>
                      <input
                        type="text"
                        placeholder="e.g. Adjourned with summons"
                        value={hearingOutcome}
                        onChange={(e) => setHearingOutcome(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Next Scheduled Date</label>
                      <input
                        type="date"
                        value={hearingNextDate}
                        onChange={(e) => setHearingNextDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsHearingModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingHearing}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingHearing ? 'Saving...' : 'Record Hearing'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: EXECUTE DEBT WRITE-OFF */}
          {/* ========================================================================= */}
          {isWriteOffModalOpen && writeOffCase && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitWriteOff}
                className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-400" />
                    <span>Execute Debt Write-Off</span>
                  </h3>
                  <button type="button" onClick={() => setIsWriteOffModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                  <p className="font-bold">CAUTION: Terminal Write-Off Action</p>
                  <p>
                    Writing off will formally close recovery on loan{' '}
                    <span className="font-mono font-bold text-white">{writeOffCase.loanAccount?.accountNumber}</span>.
                    The loan status will be marked <span className="font-mono font-bold text-rose-200">WRITTEN_OFF</span> (kept strictly separate from SETTLED).
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Write-Off Amount</label>
                    <input
                      type="text"
                      disabled
                      value={`₹${(writeOffCase.claimAmount || 0).toLocaleString()}`}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Formal Justification / Reason *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Borrower deceased without surviving heirs; exhausted civil & criminal legal remedies..."
                      value={writeOffReason}
                      onChange={(e) => setWriteOffReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Audit Remarks / Authority Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. Approved under Credit Policy Annexure 4"
                      value={writeOffRemarks}
                      onChange={(e) => setWriteOffRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsWriteOffModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWriteOff}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingWriteOff ? 'Processing...' : 'Confirm Write-Off'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: REVIEW SETTLEMENT PROPOSAL */}
          {/* ========================================================================= */}
          {isSettlementReviewModalOpen && selectedSettlement && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitSettlementReview}
                className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white">
                    {settlementAction === 'APPROVE' ? 'Approve Settlement Proposal' : 'Reject Settlement Proposal'}
                  </h3>
                  <button type="button" onClick={() => setIsSettlementReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                  <p>
                    Approving sets status to <span className="font-bold text-white">PAYMENT_PENDING</span>.
                    The loan account will only transition to <span className="font-bold text-emerald-300">SETTLED</span> after borrower payment is received and confirmed.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Review Notes &amp; Rationale *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter approval conditions or rejection reason..."
                      value={settlementReviewNotes}
                      onChange={(e) => setSettlementReviewNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSettlementReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSettlementReview}
                    className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md disabled:opacity-50 ${
                      settlementAction === 'APPROVE' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {isSubmittingSettlementReview ? 'Submitting...' : `Confirm ${settlementAction}`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: CONFIRM SETTLEMENT PAYMENT */}
          {/* ========================================================================= */}
          {isPaymentConfirmModalOpen && paymentSettlement && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitPaymentConfirmation}
                className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Settlement Payment</span>
                  </h3>
                  <button type="button" onClick={() => setIsPaymentConfirmModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                  <p>
                    Recording payment here will mark the settlement as <span className="font-bold text-white">SETTLED</span> and update the loan account to <span className="font-bold text-white">SETTLED</span>.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Payment Mode *</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="NEFT">NEFT Transfer</option>
                        <option value="RTGS">RTGS Transfer</option>
                        <option value="IMPS">IMPS Instant</option>
                        <option value="UPI">UPI Digital</option>
                        <option value="CHEQUE">Bank Cheque / DD</option>
                        <option value="CASH">Cash Deposit</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Paid Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={paymentPaidAmount}
                        onChange={(e) => setPaymentPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Transaction / UTR Reference *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UTR-AXIS-998822441"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Receipt / Audit Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Bank branch, receipt reference, verification details..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentConfirmModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingPayment ? 'Finalizing...' : 'Confirm & Mark SETTLED'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: INITIATE LEGAL CASE FROM NPA PORTFOLIO */}
          {/* ========================================================================= */}
          {isInitiateCaseModalOpen && npaLoanToEscalate && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitInitiateCase}
                className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-purple-400" />
                    <span>Initiate Legal Escalation</span>
                  </h3>
                  <button type="button" onClick={() => setIsInitiateCaseModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Borrower:</span>
                    <span className="font-bold text-white">{npaLoanToEscalate.borrowerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account #:</span>
                    <span className="font-mono text-purple-300">{npaLoanToEscalate.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Outstanding:</span>
                    <span className="font-bold text-rose-400">₹{npaLoanToEscalate.totalOutstanding.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Escalation Reason *</label>
                      <select
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="CHRONIC_DEFAULT_90_PLUS">Chronic Default 90+ DPD (NPA)</option>
                        <option value="REFUSAL_TO_PAY">Refusal to Pay / Hostile Borrower</option>
                        <option value="FRAUD_SUSPECTED">Suspected Fraud / Document Forgery</option>
                        <option value="CHEQUE_BOUNCE_SEC_138">Section 138 Cheque Bounce</option>
                        <option value="UNTRACEABLE_BORROWER">Untraceable / Absconded Customer</option>
                        <option value="COLLATERAL_DISPUTE">Collateral Dispute / Encumbrance</option>
                        <option value="EARLY_RISK_JUSTIFIED">Early Risk Justified (&lt; 90 DPD)</option>
                        <option value="OTHER">Other Reason</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Recommended Action *</label>
                      <select
                        value={escalateCaseType}
                        onChange={(e) => setEscalateCaseType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="SECTION_138_NI_ACT">Section 138 NI Act (Criminal)</option>
                        <option value="LEGAL_DEMAND_NOTICE">Statutory Legal Demand Notice</option>
                        <option value="SARFAESI_ACTION">SARFAESI Act Enforcement</option>
                        <option value="CIVIL_SUIT_DRT">Civil Suit / DRT Recovery</option>
                        <option value="ARBITRATION">Arbitration Proceedings</option>
                        <option value="LOK_ADALAT">Lok Adalat Settlement</option>
                        <option value="ASSET_REPOSSESSION">Asset Repossession Order</option>
                        <option value="WRITE_OFF_RECOMMENDATION">Write-Off Recommendation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Escalation Justification *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Detailed justification explaining why legal recourse is necessary..."
                      value={escalateJustification}
                      onChange={(e) => setEscalateJustification(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Court / Forum</label>
                      <input
                        type="text"
                        placeholder="e.g. DRT Mumbai"
                        value={escalateCourtName}
                        onChange={(e) => setEscalateCourtName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Assigned Advocate</label>
                      <input
                        type="text"
                        placeholder="e.g. Adv. Sharma"
                        value={escalateAdvocateName}
                        onChange={(e) => setEscalateAdvocateName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsInitiateCaseModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEscalation}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingEscalation ? 'Initiating...' : 'Initiate Legal Case'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Legal Recovery &amp; Settlement Management &bull; Step 7 Active
        </footer>
      </div>
    </ProtectedRoute>
  );
}
