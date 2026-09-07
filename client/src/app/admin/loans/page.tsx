'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AdminNav } from '../../../components/AdminNav';
import {
  LoanAccountItem,
  DelinquencyBucket,
  LoanType,
  LoanStatus,
  LoanSummaryData,
  RegionItem,
  CreateLoanPayload,
  UpdateLoanPayload,
} from '../../../types';
import {
  getLoansApi,
  getLoanSummaryApi,
  getLoanByIdApi,
  createLoanApi,
  updateLoanApi,
  deleteLoanApi,
  recalculateDpdApi,
} from '../../../services/loanApi';
import { getRegionsApi } from '../../../services/masterDataApi';
import {
  CircleDollarSign,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Calendar,
  IndianRupee,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';

const BUCKET_COLORS: Record<DelinquencyBucket, { bg: string; text: string; border: string; label: string }> = {
  '0-30': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    label: '0-30 Days (Bucket 1)',
  },
  '31-60': {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    label: '31-60 Days (Bucket 2)',
  },
  '61-90': {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    label: '61-90 Days (Bucket 3)',
  },
  '90+': {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    label: '90+ Days (Bucket 4 / NPA)',
  },
};

const STATUS_COLORS: Record<LoanStatus, { bg: string; text: string; border: string }> = {
  CURRENT: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  DELINQUENT: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  DEFAULT: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  SETTLED: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  WRITTEN_OFF: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  CLOSED: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const LOAN_TYPES: LoanType[] = ['PERSONAL', 'HOME', 'AUTO', 'BUSINESS', 'CREDIT_CARD'];
const LOAN_STATUSES: LoanStatus[] = ['CURRENT', 'DELINQUENT', 'DEFAULT', 'SETTLED', 'WRITTEN_OFF', 'CLOSED'];
const DELINQUENCY_BUCKETS: DelinquencyBucket[] = ['0-30', '31-60', '61-90', '90+'];

export default function AdminLoansPage() {
  const { token } = useAuth();

  // State
  const [loans, setLoans] = useState<LoanAccountItem[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [summary, setSummary] = useState<LoanSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLoans, setTotalLoans] = useState(0);

  // Feedback Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanAccountItem | null>(null);

  // Form State
  const [createForm, setCreateForm] = useState<CreateLoanPayload>({
    accountNumber: '',
    borrowerName: '',
    borrowerEmail: '',
    borrowerPhone: '',
    borrowerAddress: '',
    loanType: 'PERSONAL',
    principalAmount: 100000,
    interestRate: 12.5,
    tenureMonths: 12,
    emiAmount: 9000,
    totalOutstanding: 100000,
    overdueAmount: 0,
    missedEmisCount: 0,
    lastPaymentDate: '',
    nextDueDate: new Date().toISOString().slice(0, 10),
    firstMissedDueDate: '',
    region: '',
    status: 'CURRENT',
  });

  const [editForm, setEditForm] = useState<UpdateLoanPayload>({
    borrowerName: '',
    borrowerEmail: '',
    borrowerPhone: '',
    borrowerAddress: '',
    loanType: 'PERSONAL',
    totalOutstanding: 0,
    overdueAmount: 0,
    missedEmisCount: 0,
    lastPaymentDate: '',
    nextDueDate: '',
    firstMissedDueDate: '',
    region: '',
    status: 'CURRENT',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getLoanSummaryApi(token, regionFilter || undefined);
      if (res.success) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch summary:', err.message);
    }
  }, [token, regionFilter]);

  // Fetch Regions
  const fetchRegions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getRegionsApi(token, { all: true, isActive: 'true' });
      if (res.success) {
        setRegions(res.data.regions || []);
        if (res.data.regions && res.data.regions.length > 0 && !createForm.region) {
          setCreateForm((prev) => ({ ...prev, region: res.data.regions[0].id || res.data.regions[0]._id || '' }));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch regions:', err.message);
    }
  }, [token]);

  // Fetch Loans
  const fetchLoans = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await getLoansApi(token, {
        page,
        limit: 10,
        search,
        bucket: bucketFilter,
        status: statusFilter,
        loanType: typeFilter,
        region: regionFilter,
      });

      if (res.success) {
        setLoans(res.data.loans || []);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalLoans(res.data.pagination.total || 0);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch loans');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, search, bucketFilter, statusFilter, typeFilter, regionFilter]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  useEffect(() => {
    fetchSummary();
    fetchLoans();
  }, [fetchSummary, fetchLoans]);

  // Handle DPD Recalculation
  const handleRecalculateDPD = async () => {
    if (!token) return;
    setIsRecalculating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await recalculateDpdApi(token);
      if (res.success) {
        setSuccessMessage(
          `DPD calculation engine completed successfully. Evaluated ${res.data.matchedCount} loans, updated ${res.data.modifiedCount} records.`
        );
        fetchSummary();
        fetchLoans();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to recalculate DPD');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setCreateForm({
      accountNumber: `LN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      borrowerName: '',
      borrowerEmail: '',
      borrowerPhone: '',
      borrowerAddress: '',
      loanType: 'PERSONAL',
      principalAmount: 100000,
      interestRate: 12.5,
      tenureMonths: 12,
      emiAmount: 9000,
      totalOutstanding: 100000,
      overdueAmount: 0,
      missedEmisCount: 0,
      lastPaymentDate: '',
      nextDueDate: new Date().toISOString().slice(0, 10),
      firstMissedDueDate: '',
      region: regions.length > 0 ? (regions[0].id || regions[0]._id || '') : '',
      status: 'CURRENT',
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    const regionId = typeof loan.region === 'object' ? (loan.region.id || loan.region._id || '') : loan.region;
    setEditForm({
      borrowerName: loan.borrowerName,
      borrowerEmail: loan.borrowerEmail,
      borrowerPhone: loan.borrowerPhone,
      borrowerAddress: loan.borrowerAddress || '',
      loanType: loan.loanType,
      totalOutstanding: loan.totalOutstanding,
      overdueAmount: loan.overdueAmount,
      missedEmisCount: loan.missedEmisCount,
      lastPaymentDate: loan.lastPaymentDate ? new Date(loan.lastPaymentDate).toISOString().slice(0, 10) : '',
      nextDueDate: loan.nextDueDate ? new Date(loan.nextDueDate).toISOString().slice(0, 10) : '',
      firstMissedDueDate: loan.firstMissedDueDate ? new Date(loan.firstMissedDueDate).toISOString().slice(0, 10) : '',
      region: regionId,
      status: loan.status,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = async (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    setIsViewModalOpen(true);
    if (!token) return;
    try {
      const res = await getLoanByIdApi(token, loan.id || loan._id || '');
      if (res.success) {
        setSelectedLoan(res.data.loan);
      }
    } catch (err: any) {
      console.error('Failed to load fresh loan details:', err.message);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (loan: LoanAccountItem) => {
    setSelectedLoan(loan);
    setIsDeleteModalOpen(true);
  };

  // Create Loan Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateLoanPayload = {
        ...createForm,
        principalAmount: Number(createForm.principalAmount),
        interestRate: Number(createForm.interestRate),
        tenureMonths: Number(createForm.tenureMonths),
        emiAmount: Number(createForm.emiAmount),
        totalOutstanding: Number(createForm.totalOutstanding),
        overdueAmount: Number(createForm.overdueAmount || 0),
        missedEmisCount: Number(createForm.missedEmisCount || 0),
        firstMissedDueDate: createForm.firstMissedDueDate || null,
        lastPaymentDate: createForm.lastPaymentDate || null,
      };

      await createLoanApi(token, payload);
      setSuccessMessage(`Loan account ${createForm.accountNumber} created successfully`);
      setIsCreateModalOpen(false);
      fetchSummary();
      fetchLoans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create loan account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Loan Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedLoan) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: UpdateLoanPayload = {
        ...editForm,
        totalOutstanding: editForm.totalOutstanding !== undefined ? Number(editForm.totalOutstanding) : undefined,
        overdueAmount: editForm.overdueAmount !== undefined ? Number(editForm.overdueAmount) : undefined,
        missedEmisCount: editForm.missedEmisCount !== undefined ? Number(editForm.missedEmisCount) : undefined,
        firstMissedDueDate: editForm.firstMissedDueDate || null,
        lastPaymentDate: editForm.lastPaymentDate || null,
      };

      await updateLoanApi(token, selectedLoan.id || selectedLoan._id || '', payload);
      setSuccessMessage(`Loan account ${selectedLoan.accountNumber} updated and recalculated successfully`);
      setIsEditModalOpen(false);
      fetchSummary();
      fetchLoans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update loan account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Loan Submit
  const handleDeleteSubmit = async () => {
    if (!token || !selectedLoan) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await deleteLoanApi(token, selectedLoan.id || selectedLoan._id || '');
      setSuccessMessage(`Loan account ${selectedLoan.accountNumber} deleted successfully`);
      setIsDeleteModalOpen(false);
      fetchSummary();
      fetchLoans();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete loan account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePreviewDpd = (firstMissedDate?: string | null, status?: LoanStatus): { dpd: number; bucket: DelinquencyBucket } => {
    if (!firstMissedDate) return { dpd: 0, bucket: '0-30' };
    const missedDate = new Date(firstMissedDate);
    const now = new Date();
    const diffMs = now.getTime() - missedDate.getTime();
    const dpd = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    let bucket: DelinquencyBucket = '0-30';
    if (dpd > 90) bucket = '90+';
    else if (dpd >= 61) bucket = '61-90';
    else if (dpd >= 31) bucket = '31-60';
    else bucket = '0-30';
    return { dpd, bucket };
  };

  const getRegionName = (reg: RegionItem | string | undefined): string => {
    if (!reg) return 'N/A';
    if (typeof reg === 'object') return `${reg.name} (${reg.code})`;
    const found = regions.find((r) => r.id === reg || r._id === reg);
    return found ? `${found.name} (${found.code})` : reg;
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        {/* Navigation */}
        <AdminNav />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <Activity className="w-3.5 h-3.5" />
                <span>Automated DPD Calculation Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <CircleDollarSign className="w-7 h-7 text-emerald-400" />
                Loan Accounts &amp; Delinquency Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Track portfolio health across delinquency buckets, monitor overdue installments, and execute batch DPD recalculation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRecalculateDPD}
                disabled={isRecalculating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition shadow-sm hover:border-slate-600 disabled:opacity-50"
                title="Execute DPD and bucket recalculation across all active loan accounts"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRecalculating ? 'animate-spin' : ''}`} />
                <span>{isRecalculating ? 'Recalculating...' : 'Recalculate DPD'}</span>
              </button>

              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>Create Loan Account</span>
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

          {/* 4 Delinquency Bucket Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DELINQUENCY_BUCKETS.map((bKey) => {
              const bData = summary?.buckets?.[bKey] || { count: 0, totalOverdue: 0, totalOutstanding: 0 };
              const colors = BUCKET_COLORS[bKey];
              const isSelected = bucketFilter === bKey;

              return (
                <div
                  key={bKey}
                  onClick={() => {
                    setBucketFilter(isSelected ? '' : bKey);
                    setPage(1);
                  }}
                  className={`p-5 rounded-2xl bg-slate-900 border transition cursor-pointer flex flex-col justify-between shadow-lg ${
                    isSelected
                      ? `${colors.border} ring-2 ring-emerald-500/40 bg-slate-800/80`
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                      Bucket: {bKey}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {isSelected ? 'Filtered' : 'Click to filter'}
                    </span>
                  </div>

                  <div className="my-3">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {bData.count}
                    </span>
                    <span className="text-xs text-slate-400 ml-2 font-medium">accounts</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Overdue:</span>
                      <span className="font-semibold text-rose-400">
                        ₹{bData.totalOverdue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Outstanding:</span>
                      <span className="font-semibold text-slate-200">
                        ₹{bData.totalOutstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search, Multi-Filter Toolbar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search account, borrower, phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Bucket Filter */}
              <div>
                <select
                  value={bucketFilter}
                  onChange={(e) => {
                    setBucketFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Buckets</option>
                  <option value="0-30">0-30 Days (Bucket 1)</option>
                  <option value="31-60">31-60 Days (Bucket 2)</option>
                  <option value="61-90">61-90 Days (Bucket 3)</option>
                  <option value="90+">90+ Days (Bucket 4)</option>
                </select>
              </div>

              {/* Loan Type Filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Loan Types</option>
                  {LOAN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Statuses</option>
                  {LOAN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <select
                  value={regionFilter}
                  onChange={(e) => {
                    setRegionFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
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

            {/* Active Filter Indicators & Reset */}
            {(search || bucketFilter || statusFilter || typeFilter || regionFilter) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Filtered Results: <strong className="text-white">{totalLoans}</strong> accounts matching filters
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSearch('');
                    setBucketFilter('');
                    setStatusFilter('');
                    setTypeFilter('');
                    setRegionFilter('');
                    setPage(1);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>

          {/* Loans Data Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Account &amp; Type</th>
                    <th className="px-5 py-3.5">Borrower Details</th>
                    <th className="px-5 py-3.5">Region</th>
                    <th className="px-5 py-3.5">Outstanding / EMI</th>
                    <th className="px-5 py-3.5">Overdue / Missed</th>
                    <th className="px-5 py-3.5">DPD &amp; Bucket</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                        <span>Loading loan portfolios and DPD metrics...</span>
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                        <span>No loan accounts match your criteria.</span>
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => {
                      const bColor = BUCKET_COLORS[loan.bucket] || BUCKET_COLORS['0-30'];
                      const sColor = STATUS_COLORS[loan.status] || STATUS_COLORS.CURRENT;

                      return (
                        <tr key={loan.id || loan._id} className="hover:bg-slate-800/40 transition">
                          {/* Account No & Type */}
                          <td className="px-5 py-4">
                            <span className="font-mono font-bold text-white block">
                              {loan.accountNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 inline-block mt-1">
                              {loan.loanType.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Borrower */}
                          <td className="px-5 py-4">
                            <span className="font-bold text-white block">{loan.borrowerName}</span>
                            <span className="text-[11px] text-slate-400 block">{loan.borrowerPhone}</span>
                            <span className="text-[10px] text-slate-500 block font-mono">{loan.borrowerEmail}</span>
                          </td>

                          {/* Region */}
                          <td className="px-5 py-4">
                            <span className="font-medium text-slate-300">
                              {getRegionName(loan.region)}
                            </span>
                          </td>

                          {/* Outstanding & EMI */}
                          <td className="px-5 py-4">
                            <span className="font-bold text-white block">
                              ₹{loan.totalOutstanding.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              EMI: ₹{loan.emiAmount.toLocaleString()}
                            </span>
                          </td>

                          {/* Overdue & Missed */}
                          <td className="px-5 py-4">
                            <span
                              className={`font-bold block ${
                                loan.overdueAmount > 0 ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              ₹{loan.overdueAmount.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {loan.missedEmisCount} Missed EMIs
                            </span>
                          </td>

                          {/* DPD & Bucket */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-sm text-white">
                                {loan.dpd} DPD
                              </span>
                            </div>
                            <span
                              className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bColor.bg} ${bColor.text} border ${bColor.border}`}
                            >
                              {loan.bucket}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${sColor.bg} ${sColor.text} border ${sColor.border}`}
                            >
                              {loan.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenView(loan)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                                title="View Loan Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(loan)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                                title="Edit Loan Account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDelete(loan)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 transition"
                                title="Delete Loan Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Pagination */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing <strong className="text-white">{loans.length}</strong> of{' '}
                <strong className="text-white">{totalLoans}</strong> accounts
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2 font-semibold text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Portal &bull; Step 4 Loan Accounts &amp; DPD Engine
        </footer>

        {/* ========================================== */}
        {/* CREATE LOAN MODAL */}
        {/* ========================================== */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Create New Loan Account</h2>
                    <p className="text-xs text-slate-400">Add borrower account &amp; initialize DPD parameters</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Account Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.accountNumber}
                      onChange={(e) => setCreateForm({ ...createForm, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Loan Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Loan Type *
                    </label>
                    <select
                      value={createForm.loanType}
                      onChange={(e) => setCreateForm({ ...createForm, loanType: e.target.value as LoanType })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LOAN_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Borrower Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Borrower Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={createForm.borrowerName}
                      onChange={(e) => setCreateForm({ ...createForm, borrowerName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Borrower Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Borrower Phone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={createForm.borrowerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, borrowerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Borrower Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Borrower Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@example.com"
                      value={createForm.borrowerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, borrowerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Operational Region */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Operational Region *
                    </label>
                    <select
                      required
                      value={createForm.region}
                      onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Region</option>
                      {regions.map((r) => (
                        <option key={r.id || r._id} value={r.id || r._id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Principal Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Principal Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={createForm.principalAmount}
                      onChange={(e) => setCreateForm({ ...createForm, principalAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Interest Rate (% p.a.) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      min={0}
                      value={createForm.interestRate}
                      onChange={(e) => setCreateForm({ ...createForm, interestRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Tenure Months */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tenure (Months) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={createForm.tenureMonths}
                      onChange={(e) => setCreateForm({ ...createForm, tenureMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* EMI Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Monthly EMI (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={createForm.emiAmount}
                      onChange={(e) => setCreateForm({ ...createForm, emiAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Total Outstanding */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Total Outstanding (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={createForm.totalOutstanding}
                      onChange={(e) => setCreateForm({ ...createForm, totalOutstanding: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Overdue Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Overdue Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.overdueAmount}
                      onChange={(e) => setCreateForm({ ...createForm, overdueAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Missed EMIs Count */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Missed EMIs Count
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.missedEmisCount}
                      onChange={(e) => setCreateForm({ ...createForm, missedEmisCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Next Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Next Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.nextDueDate}
                      onChange={(e) => setCreateForm({ ...createForm, nextDueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* First Missed Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      First Missed Due Date (Delinquency Trigger)
                    </label>
                    <input
                      type="date"
                      value={createForm.firstMissedDueDate || ''}
                      onChange={(e) => setCreateForm({ ...createForm, firstMissedDueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Status
                    </label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as LoanStatus })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LOAN_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live DPD & Delinquency Preview Box */}
                {createForm.firstMissedDueDate && (
                  <div className="p-3.5 bg-slate-950 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                        Real-time DPD Preview
                      </span>
                      <span className="text-slate-300">
                        Based on First Missed Date ({createForm.firstMissedDueDate}):
                      </span>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const preview = calculatePreviewDpd(createForm.firstMissedDueDate, createForm.status);
                        const bColor = BUCKET_COLORS[preview.bucket];
                        return (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-sm">
                              {preview.dpd} DPD
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bColor.bg} ${bColor.text} border ${bColor.border}`}>
                              {preview.bucket}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Loan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* EDIT LOAN MODAL */}
        {/* ========================================== */}
        {isEditModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Edit Loan Account</h2>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedLoan.accountNumber} &bull; {selectedLoan.borrowerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Borrower Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Borrower Name
                    </label>
                    <input
                      type="text"
                      value={editForm.borrowerName}
                      onChange={(e) => setEditForm({ ...editForm, borrowerName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Borrower Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Borrower Phone
                    </label>
                    <input
                      type="text"
                      value={editForm.borrowerPhone}
                      onChange={(e) => setEditForm({ ...editForm, borrowerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Borrower Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Borrower Email
                    </label>
                    <input
                      type="email"
                      value={editForm.borrowerEmail}
                      onChange={(e) => setEditForm({ ...editForm, borrowerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Loan Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Loan Type
                    </label>
                    <select
                      value={editForm.loanType}
                      onChange={(e) => setEditForm({ ...editForm, loanType: e.target.value as LoanType })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LOAN_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Operational Region
                    </label>
                    <select
                      value={editForm.region}
                      onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {regions.map((r) => (
                        <option key={r.id || r._id} value={r.id || r._id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Total Outstanding */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Total Outstanding (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.totalOutstanding}
                      onChange={(e) => setEditForm({ ...editForm, totalOutstanding: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Overdue Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Overdue Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.overdueAmount}
                      onChange={(e) => setEditForm({ ...editForm, overdueAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Missed EMIs Count */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Missed EMIs Count
                    </label>
                    <input
                      type="number"
                      value={editForm.missedEmisCount}
                      onChange={(e) => setEditForm({ ...editForm, missedEmisCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Next Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Next Due Date
                    </label>
                    <input
                      type="date"
                      value={editForm.nextDueDate}
                      onChange={(e) => setEditForm({ ...editForm, nextDueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* First Missed Due Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      First Missed Due Date (Delinquency Trigger)
                    </label>
                    <input
                      type="date"
                      value={editForm.firstMissedDueDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, firstMissedDueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Account Status (SETTLED and CLOSED remain preserved across recalculations)
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LoanStatus })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LOAN_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save &amp; Recalculate</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW LOAN DETAILS MODAL */}
        {/* ========================================== */}
        {isViewModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Loan Account Details</h2>
                    <span className="font-mono text-xs text-slate-400">{selectedLoan.accountNumber}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Bucket Badges Top Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">DPD Metric</span>
                  <span className="text-lg font-extrabold text-white font-mono">{selectedLoan.dpd} Days</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Delinquency Bucket</span>
                  <span className={`text-xs font-bold uppercase inline-block mt-1 ${BUCKET_COLORS[selectedLoan.bucket]?.text}`}>
                    {selectedLoan.bucket}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Account Status</span>
                  <span className={`text-xs font-bold uppercase inline-block mt-1 ${STATUS_COLORS[selectedLoan.status]?.text}`}>
                    {selectedLoan.status}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Loan Type</span>
                  <span className="text-xs font-bold text-slate-200 block mt-1">
                    {selectedLoan.loanType.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Borrower Info */}
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">
                  Borrower Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block">Name:</span>
                    <span className="font-semibold text-slate-200">{selectedLoan.borrowerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone:</span>
                    <span className="font-semibold text-slate-200">{selectedLoan.borrowerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email:</span>
                    <span className="font-mono text-slate-200">{selectedLoan.borrowerEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Operational Region:</span>
                    <span className="font-semibold text-slate-200">{getRegionName(selectedLoan.region)}</span>
                  </div>
                  {selectedLoan.borrowerAddress && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block">Address:</span>
                      <span className="text-slate-300">{selectedLoan.borrowerAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">
                  Financial &amp; Repayment Schedule
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block">Principal Amount:</span>
                    <span className="font-bold text-white">₹{selectedLoan.principalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Interest Rate:</span>
                    <span className="font-bold text-slate-200">{selectedLoan.interestRate}% p.a.</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tenure:</span>
                    <span className="font-bold text-slate-200">{selectedLoan.tenureMonths} Months</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Monthly EMI:</span>
                    <span className="font-bold text-white">₹{selectedLoan.emiAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Outstanding:</span>
                    <span className="font-bold text-slate-200">₹{selectedLoan.totalOutstanding.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Overdue Amount:</span>
                    <span className="font-bold text-rose-400">₹{selectedLoan.overdueAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Missed EMIs:</span>
                    <span className="font-bold text-amber-400">{selectedLoan.missedEmisCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Next Due Date:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedLoan.nextDueDate ? new Date(selectedLoan.nextDueDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">First Missed Due Date:</span>
                    <span className="font-semibold text-rose-300">
                      {selectedLoan.firstMissedDueDate
                        ? new Date(selectedLoan.firstMissedDueDate).toLocaleDateString()
                        : 'None (Current)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Action */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* DELETE CONFIRMATION MODAL */}
        {/* ========================================== */}
        {isDeleteModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Delete Loan Account?</h3>
              </div>

              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete account{' '}
                <strong className="text-white font-mono">{selectedLoan.accountNumber}</strong> belonging to{' '}
                <strong className="text-white">{selectedLoan.borrowerName}</strong>? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteSubmit}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
