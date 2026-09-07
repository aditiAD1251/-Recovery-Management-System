'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { SupervisorNav } from '../../../components/SupervisorNav';
import { LegalCaseItem, LoanAccountItem, LegalEscalationReason, LegalActionType, LegalPriority } from '../../../types';
import { getLegalCasesApi, createLegalCaseApi } from '../../../services/legalApi';
import { getLoansApi } from '../../../services/loanApi';
import {
  Gavel,
  CheckCircle2,
  AlertTriangle,
  Search,
  PlusCircle,
  X,
  Calendar,
  Eye,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function SupervisorLegalPage() {
  const { token, user } = useAuth();

  const [cases, setCases] = useState<LegalCaseItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Escalate Modal State
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [delinquentLoans, setDelinquentLoans] = useState<LoanAccountItem[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [escalateReason, setEscalateReason] = useState<LegalEscalationReason>('REFUSAL_TO_PAY');
  const [escalateJustification, setEscalateJustification] = useState('');
  const [escalateCaseType, setEscalateCaseType] = useState<LegalActionType>('SECTION_138_NI_ACT');
  const [escalatePriority, setEscalatePriority] = useState<LegalPriority>('HIGH');
  const [isSubmittingEscalate, setIsSubmittingEscalate] = useState(false);

  const fetchCases = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getLegalCasesApi(token, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm || undefined,
        limit: 30,
      });

      if (res.success) {
        setCases(res.data.cases);
        setTotalCount(res.data.pagination.total);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load legal cases');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, searchTerm]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Fetch candidate loans for escalation
  const handleOpenEscalateModal = async () => {
    if (!token) return;
    try {
      const res = await getLoansApi(token, { limit: 50 });
      if (res.success) {
        const eligible = res.data.loans.filter(
          (l) => !['SETTLED', 'CLOSED', 'WRITTEN_OFF'].includes(l.status)
        );
        setDelinquentLoans(eligible);
        if (eligible.length > 0) {
          setSelectedLoanId(eligible[0].id || (eligible[0] as any)._id);
        }
      }
      setIsEscalateModalOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load eligible loans for escalation');
    }
  };

  // Submit Escalation
  const handleSubmitEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedLoanId) return;

    if (!escalateJustification.trim()) {
      setErrorMsg('Escalation justification is required');
      return;
    }

    setIsSubmittingEscalate(true);
    try {
      const res = await createLegalCaseApi(token, {
        loanAccount: selectedLoanId,
        reason: escalateReason,
        justification: escalateJustification.trim(),
        caseType: escalateCaseType,
        priority: escalatePriority,
      });

      if (res.success) {
        setSuccessMsg(`Legal case ${res.data.caseNumber} initiated successfully.`);
        setIsEscalateModalOpen(false);
        fetchCases();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to escalate to Legal');
    } finally {
      setIsSubmittingEscalate(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        <SupervisorNav />

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 flex-1">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
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
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
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
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold">
                <Gavel className="w-3.5 h-3.5" />
                <span>Step 7 Legal Escalation Monitor</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white mt-1">Legal Escalation Queue</h1>
              <p className="text-xs text-slate-400">
                Track delinquent portfolio accounts escalated to the Legal Division and monitor litigation progress.
              </p>
            </div>

            <button
              onClick={handleOpenEscalateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Initiate Legal Escalation</span>
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search case # or borrower..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
            </select>
          </div>

          {/* Cases List */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Case # &amp; Action</th>
                    <th className="px-5 py-3.5">Borrower Details</th>
                    <th className="px-5 py-3.5">Claim Balance</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Next Hearing / Notices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">
                        Loading legal cases...
                      </td>
                    </tr>
                  ) : cases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">
                        No legal cases found.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => (
                      <tr key={c.id || (c as any)._id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-white text-xs">{c.caseNumber}</div>
                          <div className="text-[11px] text-purple-400 mt-0.5">{c.caseType.replace(/_/g, ' ')}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{c.loanAccount?.borrowerName || 'Borrower'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.loanAccount?.accountNumber}</div>
                        </td>
                        <td className="px-5 py-4 font-bold text-white">
                          ₹{(c.claimAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {c.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {c.nextHearingDate ? (
                            <div className="text-amber-400 font-semibold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(c.nextHearingDate).toLocaleDateString()}</span>
                            </div>
                          ) : c.notices && c.notices.length > 0 ? (
                            <span className="text-blue-400 text-[11px]">
                              {c.notices.length} statutory notice(s) dispatched
                            </span>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Escalation pending review</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* INITIATE ESCALATION MODAL */}
          {isEscalateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleSubmitEscalate}
                className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fadeIn text-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-purple-400" />
                    <span>Initiate Legal Escalation</span>
                  </h3>
                  <button type="button" onClick={() => setIsEscalateModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Select Delinquent Loan Account *</label>
                    <select
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                    >
                      {delinquentLoans.map((l) => (
                        <option key={l.id || (l as any)._id} value={l.id || (l as any)._id}>
                          {l.accountNumber} - {l.borrowerName} (₹{l.totalOutstanding.toLocaleString()} &bull; {l.dpd} DPD)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Escalation Reason *</label>
                      <select
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="REFUSAL_TO_PAY">Refusal to Pay / Hostile</option>
                        <option value="CHRONIC_DEFAULT_90_PLUS">Chronic Default 90+ DPD (NPA)</option>
                        <option value="FRAUD_SUSPECTED">Document Fraud Suspected</option>
                        <option value="CHEQUE_BOUNCE_SEC_138">Section 138 Cheque Bounce</option>
                        <option value="UNTRACEABLE_BORROWER">Untraceable / Absconded</option>
                        <option value="EARLY_RISK_JUSTIFIED">Early Risk Justified (&lt; 90 DPD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Recommended Action *</label>
                      <select
                        value={escalateCaseType}
                        onChange={(e) => setEscalateCaseType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="SECTION_138_NI_ACT">Section 138 NI Act</option>
                        <option value="LEGAL_DEMAND_NOTICE">Statutory Demand Notice</option>
                        <option value="SARFAESI_ACTION">SARFAESI Enforcement</option>
                        <option value="CIVIL_SUIT_DRT">Civil Suit / DRT</option>
                        <option value="ARBITRATION">Arbitration Tribunal</option>
                        <option value="LOK_ADALAT">Lok Adalat Referral</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Escalation Justification *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Explain collection history and why legal recourse is now required..."
                      value={escalateJustification}
                      onChange={(e) => setEscalateJustification(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEscalateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEscalate}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg disabled:opacity-50"
                  >
                    {isSubmittingEscalate ? 'Escalating...' : 'Confirm Escalation'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Supervisor Legal Escalation Monitor &bull; Step 7
        </footer>
      </div>
    </ProtectedRoute>
  );
}
