'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { SupervisorNav } from '../../../components/SupervisorNav';
import { SettlementRequestItem } from '../../../types';
import {
  getSettlementsApi,
  reviewSettlementApi,
  completeSettlementApi,
} from '../../../services/settlementApi';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Calendar,
} from 'lucide-react';

export default function SupervisorSettlementsPage() {
  const { token, user } = useAuth();

  const [settlements, setSettlements] = useState<SettlementRequestItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review Modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementRequestItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'ESCALATE_TO_LEGAL'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Payment Confirmation Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSettlement, setPaymentSettlement] = useState<SettlementRequestItem | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'CHEQUE' | 'CASH' | 'OTHER'>('NEFT');
  const [paymentPaidAmount, setPaymentPaidAmount] = useState<number | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchSettlements = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getSettlementsApi(token, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm || undefined,
        limit: 30,
      });

      if (res.success) {
        setSettlements(res.data.settlements);
        setTotalCount(res.data.pagination.total);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load settlements');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, searchTerm]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Open Review Modal
  const handleOpenReviewModal = (
    s: SettlementRequestItem,
    action: 'APPROVE' | 'REJECT' | 'ESCALATE_TO_LEGAL'
  ) => {
    setSelectedSettlement(s);
    setReviewAction(action);
    setReviewNotes(
      action === 'ESCALATE_TO_LEGAL'
        ? `Waiver is ${s.waiverPercentage}% (₹${s.waivedAmount.toLocaleString('en-IN')}). Recommending for Legal / Recovery Head sign-off.`
        : ''
    );
    setIsReviewModalOpen(true);
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedSettlement) return;
    if (!reviewNotes.trim()) {
      setErrorMsg('Review notes / justification remarks are required');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const sId = selectedSettlement.id || (selectedSettlement as any)._id;
      const res = await reviewSettlementApi(token, sId, {
        action: reviewAction,
        reviewNotes,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setIsReviewModalOpen(false);
        fetchSettlements();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review settlement');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Open Payment Confirmation Modal
  const handleOpenPaymentModal = (s: SettlementRequestItem) => {
    setPaymentSettlement(s);
    setPaymentRef('');
    setPaymentMode('NEFT');
    setPaymentPaidAmount(s.proposedAmount);
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Confirmation
  const handleSubmitPayment = async (e: React.FormEvent) => {
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
        setSuccessMsg('Payment confirmed! Loan account transitioned to SETTLED.');
        setIsPaymentModalOpen(false);
        fetchSettlements();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete settlement payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const pendingSupervisorCount = settlements.filter((s) => s.status === 'PENDING_SUPERVISOR').length;
  const paymentPendingCount = settlements.filter((s) => s.status === 'PAYMENT_PENDING').length;
  const pendingLegalCount = settlements.filter((s) => s.status === 'PENDING_LEGAL_HEAD').length;
  const settledCount = settlements.filter((s) => s.status === 'SETTLED').length;

  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        <SupervisorNav />

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 flex-1">
          {/* Notifications */}
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

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
                <Scale className="w-3.5 h-3.5" />
                <span>Step 7 Settlement Review Hub</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white mt-1">Settlement Proposals Review</h1>
              <p className="text-xs text-slate-400">
                Review negotiated settlement proposals from field agents, approve within policy limits, or route to Legal Head.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Supervisor Pending</span>
              <span className="text-2xl font-extrabold text-white">{pendingSupervisorCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-purple-400 uppercase font-bold block">Escalated to Legal</span>
              <span className="text-2xl font-extrabold text-white">{pendingLegalCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-blue-400 uppercase font-bold block">Payment Pending</span>
              <span className="text-2xl font-extrabold text-white">{paymentPendingCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Settled Completed</span>
              <span className="text-2xl font-extrabold text-white">{settledCount}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search borrower or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_SUPERVISOR">Pending Supervisor</option>
              <option value="PENDING_LEGAL_HEAD">Pending Legal Head</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="SETTLED">Settled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Settlements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-2 p-12 text-center text-slate-500">Loading settlements...</div>
            ) : settlements.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
                No settlement proposals found.
              </div>
            ) : (
              settlements.map((s) => {
                const isPendingSupervisor = s.status === 'PENDING_SUPERVISOR';
                const isPaymentPending = s.status === 'PAYMENT_PENDING';
                const isSettled = s.status === 'SETTLED';
                const isAboveThreshold = s.waiverPercentage > 25 || s.waivedAmount > 50000;

                return (
                  <div
                    key={s.id || (s as any)._id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="text-[10px] font-mono text-blue-400 block">
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
                            : isPendingSupervisor
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
                        <span className="text-[10px] text-blue-400 block uppercase">Proposed Amount</span>
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

                    {/* Justification & Policy Notice */}
                    <div className="space-y-1 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                      <p className="text-[11px] font-medium text-slate-400">Hardship Justification:</p>
                      <p className="text-slate-200 italic">&ldquo;{s.reason}&rdquo;</p>
                      {isAboveThreshold && (
                        <p className="text-[10px] text-amber-400 font-semibold pt-1 border-t border-slate-800/60 mt-1">
                          &bull; Waiver &gt; 25% (₹50k limit): Must be escalated to Legal / Recovery Head.
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 flex-wrap">
                      {isPendingSupervisor && (
                        <>
                          <button
                            onClick={() => handleOpenReviewModal(s, 'REJECT')}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                          >
                            Reject
                          </button>

                          {isAboveThreshold ? (
                            <button
                              onClick={() => handleOpenReviewModal(s, 'ESCALATE_TO_LEGAL')}
                              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Escalate to Legal Head</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenReviewModal(s, 'APPROVE')}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve (Payment Pending)</span>
                            </button>
                          )}
                        </>
                      )}

                      {isPaymentPending && (
                        <button
                          onClick={() => handleOpenPaymentModal(s)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Payment &amp; Settle</span>
                        </button>
                      )}

                      {isSettled && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Loan Account SETTLED</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* MODAL: REVIEW SETTLEMENT PROPOSAL */}
          {isReviewModalOpen && selectedSettlement && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitReview}
                className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white">
                    {reviewAction === 'APPROVE'
                      ? 'Approve Settlement Proposal'
                      : reviewAction === 'REJECT'
                      ? 'Reject Settlement Proposal'
                      : 'Escalate Proposal to Legal Head'}
                  </h3>
                  <button type="button" onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                  <p>
                    {reviewAction === 'APPROVE'
                      ? 'Approving sets status to PAYMENT_PENDING. The loan will only be marked SETTLED after payment confirmation.'
                      : reviewAction === 'ESCALATE_TO_LEGAL'
                      ? 'Routing to Legal / Recovery Head due to high waiver discount percentage.'
                      : 'Rejecting will close this proposal.'}
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Supervisor Review Notes *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Enter review notes or conditions..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Confirm Decision'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODAL: CONFIRM PAYMENT */}
          {isPaymentModalOpen && paymentSettlement && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitPayment}
                className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Settlement Payment</span>
                  </h3>
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
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
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Paid Amount (₹) *</label>
                      <input
                        type="number"
                        required
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
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                  >
                    {isSubmittingPayment ? 'Finalizing...' : 'Confirm & Settle Loan'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Supervisor Settlement Reviews &bull; Step 7
        </footer>
      </div>
    </ProtectedRoute>
  );
}
