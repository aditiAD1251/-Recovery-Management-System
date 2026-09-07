'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { SupervisorNav } from '../../../components/SupervisorNav';
import {
  LoanAccountItem,
  DelinquencyBucket,
  LoanType,
  LoanStatus,
  RegionItem,
  AgentWorkloadItem,
  WorkloadOverviewSummary,
} from '../../../types';
import {
  getWorkloadSummaryApi,
  getAgentWorkloadsApi,
  getUnassignedLoansApi,
  assignLoanApi,
  reassignLoanApi,
  unassignLoanApi,
} from '../../../services/assignmentApi';
import { getLoansApi } from '../../../services/loanApi';
import { getRegionsApi } from '../../../services/masterDataApi';
import {
  Users2,
  Search,
  Plus,
  ArrowRightLeft,
  UserCheck,
  UserMinus,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Clock,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  ShieldCheck,
  Activity,
  CircleDollarSign,
  AlertTriangle,
  RefreshCw,
  User,
} from 'lucide-react';

const BUCKET_COLORS: Record<DelinquencyBucket, { bg: string; text: string; border: string }> = {
  '0-30': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  '31-60': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  '61-90': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  '90+': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

export default function SupervisorWorkloadPage() {
  const { token, user } = useAuth();

  // Active Tab: 'unassigned' | 'agents' | 'assigned'
  const [activeTab, setActiveTab] = useState<'unassigned' | 'agents' | 'assigned'>('unassigned');

  // Summary & Master Data
  const [summary, setSummary] = useState<WorkloadOverviewSummary | null>(null);
  const [agentWorkloads, setAgentWorkloads] = useState<AgentWorkloadItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);

  // Unassigned Queue State
  const [unassignedLoans, setUnassignedLoans] = useState<LoanAccountItem[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(true);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedTotalPages, setUnassignedTotalPages] = useState(1);
  const [unassignedTotal, setUnassignedTotal] = useState(0);

  // Assigned Loans State
  const [assignedLoans, setAssignedLoans] = useState<LoanAccountItem[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedTotalPages, setAssignedTotalPages] = useState(1);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedAgentFilter, setAssignedAgentFilter] = useState('');

  // Common Filters
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Feedback Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanAccountItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getWorkloadSummaryApi(token, regionFilter || undefined);
      if (res.success) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch workload summary:', err.message);
    }
  }, [token, regionFilter]);

  // Fetch Agent Workloads
  const fetchAgentWorkloads = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAgentWorkloadsApi(token, {
        region: regionFilter || undefined,
        isActive: 'true',
      });
      if (res.success) {
        setAgentWorkloads(res.data.agents || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch agent workloads:', err.message);
    }
  }, [token, regionFilter]);

  // Fetch Regions
  const fetchRegions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getRegionsApi(token, { all: true, isActive: 'true' });
      if (res.success) {
        setRegions(res.data.regions || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch regions:', err.message);
    }
  }, [token]);

  // Fetch Unassigned Loans
  const fetchUnassignedLoans = useCallback(async () => {
    if (!token) return;
    setUnassignedLoading(true);
    try {
      const res = await getUnassignedLoansApi(token, {
        page: unassignedPage,
        limit: 10,
        search,
        bucket: bucketFilter,
        loanType: typeFilter,
        region: regionFilter,
      });
      if (res.success) {
        setUnassignedLoans(res.data.loans || []);
        setUnassignedTotalPages(res.data.pagination.totalPages || 1);
        setUnassignedTotal(res.data.pagination.total || 0);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch unassigned queue');
    } finally {
      setUnassignedLoading(false);
    }
  }, [token, unassignedPage, search, bucketFilter, typeFilter, regionFilter]);

  // Fetch Assigned Loans
  const fetchAssignedLoans = useCallback(async () => {
    if (!token) return;
    setAssignedLoading(true);
    try {
      const res = await getLoansApi(token, {
        page: assignedPage,
        limit: 10,
        search,
        bucket: bucketFilter,
        loanType: typeFilter,
        region: regionFilter,
        status: 'DELINQUENT',
      });
      if (res.success) {
        // Filter in frontend or backend for assigned loans
        const assignedOnly = (res.data.loans || []).filter((l) => !!l.assignedAgent);
        if (assignedAgentFilter) {
          const filteredByAgent = assignedOnly.filter((l) => {
            const agentId = typeof l.assignedAgent === 'object' ? (l.assignedAgent?.id || (l.assignedAgent as any)?._id) : l.assignedAgent;
            return agentId === assignedAgentFilter;
          });
          setAssignedLoans(filteredByAgent);
          setAssignedTotal(filteredByAgent.length);
          setAssignedTotalPages(1);
        } else {
          setAssignedLoans(assignedOnly);
          setAssignedTotal(res.data.pagination.total || assignedOnly.length);
          setAssignedTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch assigned loans');
    } finally {
      setAssignedLoading(false);
    }
  }, [token, assignedPage, search, bucketFilter, typeFilter, regionFilter, assignedAgentFilter]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  useEffect(() => {
    fetchSummary();
    fetchAgentWorkloads();
  }, [fetchSummary, fetchAgentWorkloads]);

  useEffect(() => {
    if (activeTab === 'unassigned') {
      fetchUnassignedLoans();
    } else if (activeTab === 'assigned') {
      fetchAssignedLoans();
    }
  }, [activeTab, fetchUnassignedLoans, fetchAssignedLoans]);

  // Open Assign Modal
  const handleOpenAssign = (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    setSelectedAgentId('');
    setAssignmentNote('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAssignModalOpen(true);
  };

  // Open Reassign Modal
  const handleOpenReassign = (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    setSelectedAgentId('');
    setAssignmentNote('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsReassignModalOpen(true);
  };

  // Open Unassign Modal
  const handleOpenUnassign = (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUnassignModalOpen(true);
  };

  // Submit Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedLoan || !selectedAgentId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await assignLoanApi(token, selectedLoan.id || selectedLoan._id || '', selectedAgentId, assignmentNote);
      setSuccessMessage(`Account ${selectedLoan.accountNumber} assigned successfully`);
      setIsAssignModalOpen(false);
      fetchSummary();
      fetchAgentWorkloads();
      fetchUnassignedLoans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to assign loan account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reassignment
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedLoan || !selectedAgentId) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await reassignLoanApi(token, selectedLoan.id || selectedLoan._id || '', selectedAgentId, assignmentNote);
      setSuccessMessage(`Account ${selectedLoan.accountNumber} reassigned successfully`);
      setIsReassignModalOpen(false);
      fetchSummary();
      fetchAgentWorkloads();
      fetchAssignedLoans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reassign loan account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Unassignment
  const handleUnassignSubmit = async () => {
    if (!token || !selectedLoan) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await unassignLoanApi(token, selectedLoan.id || selectedLoan._id || '');
      setSuccessMessage(`Account ${selectedLoan.accountNumber} unassigned and returned to queue`);
      setIsUnassignModalOpen(false);
      fetchSummary();
      fetchAgentWorkloads();
      fetchAssignedLoans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unassign loan account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract loan's region ID
  const getLoanRegionId = (loan: LoanAccountItem | null): string => {
    if (!loan) return '';
    if (typeof loan.region === 'object') return loan.region.id || loan.region._id || '';
    return loan.region;
  };

  const getLoanRegionName = (loan: LoanAccountItem | null): string => {
    if (!loan) return 'Unknown Region';
    if (typeof loan.region === 'object') return `${loan.region.name} (${loan.region.code})`;
    const r = regions.find((x) => x.id === loan.region || x._id === loan.region);
    return r ? `${r.name} (${r.code})` : loan.region;
  };

  // Filter available agents matching the selected loan's region
  const getEligibleAgentsForLoan = (loan: LoanAccountItem | null): AgentWorkloadItem[] => {
    if (!loan) return [];
    const loanRegId = getLoanRegionId(loan);
    return agentWorkloads.filter((a) => a.region.id === loanRegId && a.isActive);
  };

  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        {/* Navigation */}
        <SupervisorNav />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
                <Users2 className="w-3.5 h-3.5" />
                <span>Supervisory Workload Distribution Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <Briefcase className="w-7 h-7 text-blue-400" />
                Workload Management &amp; Agent Allocation
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Allocate unassigned delinquent accounts to active regional collection agents and monitor agent capacity in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchSummary();
                  fetchAgentWorkloads();
                  if (activeTab === 'unassigned') fetchUnassignedLoans();
                  if (activeTab === 'assigned') fetchAssignedLoans();
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition shadow-sm"
                title="Refresh workload metrics"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Refresh Hub</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Unassigned Delinquent Queue
                </span>
                <span className="text-2xl font-extrabold text-white mt-1 block">
                  {summary?.unassignedCount ?? 0} Accounts
                </span>
                <span className="text-xs text-rose-400 font-semibold">
                  ₹{(summary?.unassignedOverdue || 0).toLocaleString()} Overdue
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Active Assigned Portfolio
                </span>
                <span className="text-2xl font-extrabold text-white mt-1 block">
                  {summary?.assignedCount ?? 0} Accounts
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  ₹{(summary?.assignedOverdue || 0).toLocaleString()} Overdue
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                  Active Collection Agents
                </span>
                <span className="text-2xl font-extrabold text-white mt-1 block">
                  {agentWorkloads.length} Field Agents
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {regions.length} Operational Regions
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-2">
            <button
              onClick={() => setActiveTab('unassigned')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'unassigned'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Unassigned Loans Queue ({summary?.unassignedCount ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'agents'
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users2 className="w-4 h-4" />
              <span>Agent Workload Monitor ({agentWorkloads.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('assigned')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                activeTab === 'assigned'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Assigned Loans ({summary?.assignedCount ?? 0})</span>
            </button>
          </div>

          {/* ========================================== */}
          {/* TAB 1: UNASSIGNED QUEUE */}
          {/* ========================================== */}
          {activeTab === 'unassigned' && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search account, borrower, phone..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setUnassignedPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <select
                    value={bucketFilter}
                    onChange={(e) => {
                      setBucketFilter(e.target.value);
                      setUnassignedPage(1);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Buckets</option>
                    <option value="0-30">0-30 Days</option>
                    <option value="31-60">31-60 Days</option>
                    <option value="61-90">61-90 Days</option>
                    <option value="90+">90+ Days (NPA)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={regionFilter}
                    onChange={(e) => {
                      setRegionFilter(e.target.value);
                      setUnassignedPage(1);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Regions</option>
                    {regions.map((r) => (
                      <option key={r.id || r._id} value={r.id || r._id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setUnassignedPage(1);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="HOME">Home</option>
                    <option value="AUTO">Auto</option>
                    <option value="BUSINESS">Business</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>
              </div>

              {/* Unassigned Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">Account &amp; Type</th>
                        <th className="px-5 py-3.5">Borrower Details</th>
                        <th className="px-5 py-3.5">Region</th>
                        <th className="px-5 py-3.5">Outstanding / EMI</th>
                        <th className="px-5 py-3.5">Overdue Amount</th>
                        <th className="px-5 py-3.5">DPD &amp; Bucket</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {unassignedLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                            <span>Loading unassigned loan accounts...</span>
                          </td>
                        </tr>
                      ) : unassignedLoans.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                            <span>All eligible delinquent loans are currently assigned!</span>
                          </td>
                        </tr>
                      ) : (
                        unassignedLoans.map((loan) => {
                          const bColor = BUCKET_COLORS[loan.bucket] || BUCKET_COLORS['0-30'];

                          return (
                            <tr key={loan.id || loan._id} className="hover:bg-slate-800/40 transition">
                              <td className="px-5 py-4">
                                <span className="font-mono font-bold text-white block">{loan.accountNumber}</span>
                                <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 inline-block mt-1">
                                  {loan.loanType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-white block">{loan.borrowerName}</span>
                                <span className="text-[11px] text-slate-400 block">{loan.borrowerPhone}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-200">{getLoanRegionName(loan)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-white block">₹{loan.totalOutstanding.toLocaleString()}</span>
                                <span className="text-[11px] text-slate-400 block">EMI: ₹{loan.emiAmount.toLocaleString()}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-rose-400 block">₹{loan.overdueAmount.toLocaleString()}</span>
                                <span className="text-[11px] text-slate-400 block">{loan.missedEmisCount} Missed EMIs</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-mono font-extrabold text-sm text-white block">{loan.dpd} DPD</span>
                                <span className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bColor.bg} ${bColor.text} border ${bColor.border}`}>
                                  {loan.bucket}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => handleOpenAssign(loan)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-950/40"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Assign Agent</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing <strong className="text-white">{unassignedLoans.length}</strong> of{' '}
                    <strong className="text-white">{unassignedTotal}</strong> unassigned accounts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUnassignedPage((p) => Math.max(1, p - 1))}
                      disabled={unassignedPage <= 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="px-2 font-semibold text-slate-300">
                      Page {unassignedPage} of {unassignedTotalPages}
                    </span>
                    <button
                      onClick={() => setUnassignedPage((p) => Math.min(unassignedTotalPages, p + 1))}
                      disabled={unassignedPage >= unassignedTotalPages}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-40 transition flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: AGENT WORKLOAD MONITOR */}
          {/* ========================================== */}
          {activeTab === 'agents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agentWorkloads.map((agent) => (
                <div
                  key={agent.agentId}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{agent.name}</h3>
                          <span className="text-[11px] font-mono text-blue-400 font-bold block">
                            {agent.employeeCode}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Region:</span>
                        <span className="font-semibold text-slate-200">{agent.region.name} ({agent.region.code})</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Supervisor:</span>
                        <span className="font-semibold text-slate-200">{agent.supervisor.name}</span>
                      </div>
                      {agent.phone && (
                        <div className="flex justify-between text-slate-400">
                          <span>Phone:</span>
                          <span className="font-mono text-slate-300">{agent.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Workload Statistics */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Assigned Accounts</span>
                        <span className="text-xl font-extrabold text-white block mt-0.5 font-mono">
                          {agent.assignedCount}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Overdue</span>
                        <span className="text-sm font-bold text-rose-400 block mt-1">
                          ₹{agent.totalOverdue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Bucket Distribution Badges */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                        Bucket Breakdown:
                      </span>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                        <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <span>0-30: </span>
                          <span className="font-mono">{agent.bucketDistribution['0-30']}</span>
                        </div>
                        <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <span>31-60: </span>
                          <span className="font-mono">{agent.bucketDistribution['31-60']}</span>
                        </div>
                        <div className="p-1.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                          <span>61-90: </span>
                          <span className="font-mono">{agent.bucketDistribution['61-90']}</span>
                        </div>
                        <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                          <span>90+: </span>
                          <span className="font-mono">{agent.bucketDistribution['90+']}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setAssignedAgentFilter(agent.agentId);
                        setActiveTab('assigned');
                      }}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>View Assigned Accounts ({agent.assignedCount})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: ASSIGNED LOANS MANAGEMENT */}
          {/* ========================================== */}
          {activeTab === 'assigned' && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search account, borrower..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <select
                    value={assignedAgentFilter}
                    onChange={(e) => setAssignedAgentFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Assigned Agents</option>
                    {agentWorkloads.map((a) => (
                      <option key={a.agentId} value={a.agentId}>
                        {a.name} ({a.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={bucketFilter}
                    onChange={(e) => setBucketFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Buckets</option>
                    <option value="0-30">0-30 Days</option>
                    <option value="31-60">31-60 Days</option>
                    <option value="61-90">61-90 Days</option>
                    <option value="90+">90+ Days</option>
                  </select>
                </div>

                <div>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Regions</option>
                    {regions.map((r) => (
                      <option key={r.id || r._id} value={r.id || r._id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">Account &amp; Borrower</th>
                        <th className="px-5 py-3.5">Assigned Agent</th>
                        <th className="px-5 py-3.5">Region</th>
                        <th className="px-5 py-3.5">Overdue &amp; DPD</th>
                        <th className="px-5 py-3.5">Assigned On</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {assignedLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                            <span>Loading assigned accounts...</span>
                          </td>
                        </tr>
                      ) : assignedLoans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-500">
                            <span>No assigned accounts found matching criteria.</span>
                          </td>
                        </tr>
                      ) : (
                        assignedLoans.map((loan) => {
                          const agentName =
                            typeof loan.assignedAgent === 'object'
                              ? loan.assignedAgent?.user?.name || loan.assignedAgent?.employeeCode || 'Assigned Agent'
                              : 'Assigned Agent';
                          const empCode =
                            typeof loan.assignedAgent === 'object'
                              ? loan.assignedAgent?.employeeCode || ''
                              : '';
                          const bColor = BUCKET_COLORS[loan.bucket] || BUCKET_COLORS['0-30'];

                          return (
                            <tr key={loan.id || loan._id} className="hover:bg-slate-800/40 transition">
                              <td className="px-5 py-4">
                                <span className="font-mono font-bold text-white block">{loan.accountNumber}</span>
                                <span className="text-slate-300 block">{loan.borrowerName}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-white block">{agentName}</span>
                                {empCode && (
                                  <span className="text-[10px] text-blue-400 font-mono font-semibold block">
                                    {empCode}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-semibold text-slate-200">{getLoanRegionName(loan)}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold text-rose-400 block">₹{loan.overdueAmount.toLocaleString()}</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${bColor.bg} ${bColor.text} border ${bColor.border}`}>
                                  {loan.dpd} DPD &bull; {loan.bucket}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {loan.assignedAt ? new Date(loan.assignedAt).toLocaleDateString() : 'Active'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenReassign(loan)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-blue-400 transition text-[11px] font-bold inline-flex items-center gap-1"
                                    title="Reassign to another agent in region"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span>Reassign</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenUnassign(loan)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                                    title="Unassign and return to queue"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
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
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Supervisor Hub &bull; Step 5 Workload &amp; Allocation System
        </footer>

        {/* ========================================== */}
        {/* ASSIGN LOAN MODAL */}
        {/* ========================================== */}
        {isAssignModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Assign Delinquent Account</h2>
                    <p className="text-xs text-slate-400 font-mono">{selectedLoan.accountNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Loan Details Banner */}
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Borrower:</span>
                  <span className="font-semibold text-white">{selectedLoan.borrowerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Operational Region:</span>
                  <span className="font-bold text-blue-400">{getLoanRegionName(selectedLoan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overdue / DPD:</span>
                  <span className="font-bold text-rose-400">
                    ₹{selectedLoan.overdueAmount.toLocaleString()} &bull; {selectedLoan.dpd} DPD ({selectedLoan.bucket})
                  </span>
                </div>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                {/* Agent Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Active Collection Agent (Region: {getLoanRegionName(selectedLoan)}) *
                  </label>
                  {getEligibleAgentsForLoan(selectedLoan).length === 0 ? (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>No active collection agents found in {getLoanRegionName(selectedLoan)}. Please register an agent for this region in Admin Master Data.</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select Agent from {getLoanRegionName(selectedLoan)}...</option>
                      {getEligibleAgentsForLoan(selectedLoan).map((agent) => (
                        <option key={agent.agentId} value={agent.agentId}>
                          {agent.name} ({agent.employeeCode}) — Current Workload: {agent.assignedCount} loans
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Assignment Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supervisor Note / Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please perform priority field contact regarding overdue EMI..."
                    value={assignmentNote}
                    onChange={(e) => setAssignmentNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || getEligibleAgentsForLoan(selectedLoan).length === 0}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Assignment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* REASSIGN LOAN MODAL */}
        {/* ========================================== */}
        {isReassignModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Reassign Loan Account</h2>
                    <p className="text-xs text-slate-400 font-mono">{selectedLoan.accountNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReassignModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Loan Details Banner */}
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Borrower:</span>
                  <span className="font-semibold text-white">{selectedLoan.borrowerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Region:</span>
                  <span className="font-bold text-blue-400">{getLoanRegionName(selectedLoan)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Assignee:</span>
                  <span className="font-semibold text-amber-400">
                    {typeof selectedLoan.assignedAgent === 'object'
                      ? selectedLoan.assignedAgent?.user?.name || selectedLoan.assignedAgent?.employeeCode
                      : 'Assigned Agent'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleReassignSubmit} className="space-y-4">
                {/* New Agent Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select New Agent in {getLoanRegionName(selectedLoan)} *
                  </label>
                  <select
                    required
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select New Agent...</option>
                    {getEligibleAgentsForLoan(selectedLoan).map((agent) => (
                      <option key={agent.agentId} value={agent.agentId}>
                        {agent.name} ({agent.employeeCode}) — Current Load: {agent.assignedCount} loans
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reassignment Reason (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Workload rebalancing / Agent reallocation..."
                    value={assignmentNote}
                    onChange={(e) => setAssignmentNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsReassignModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedAgentId}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm Reassignment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* UNASSIGN CONFIRMATION MODAL */}
        {/* ========================================== */}
        {isUnassignModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <UserMinus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Unassign Loan Account?</h3>
              </div>

              <p className="text-xs text-slate-400">
                Are you sure you want to unassign account{' '}
                <strong className="text-white font-mono">{selectedLoan.accountNumber}</strong> ({selectedLoan.borrowerName})?
                The loan will be returned to the unassigned queue for reallocation.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUnassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleUnassignSubmit}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Unassignment</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
