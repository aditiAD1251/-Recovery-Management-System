'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AdminNav } from '../../../components/AdminNav';
import { SupervisorNav } from '../../../components/SupervisorNav';
import { LegalNav } from '../../../components/LegalNav';
import { DateRangeFilter } from '../../../components/analytics/DateRangeFilter';
import { getReportDataApi, downloadReportCsvApi } from '../../../services/analyticsApi';
import { ReportType, ReportResultData } from '../../../types/analytics';
import {
  FileSpreadsheet,
  Download,
  Filter,
  RefreshCw,
  Table,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  FileText,
  Users,
  DollarSign,
  PieChart,
  CalendarCheck,
  Scale,
  Gavel,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'portfolio-summary',
    title: 'Executive Portfolio Summary',
    description: 'Comprehensive view of all loan accounts, DPD buckets, current balances, and status.',
    icon: DollarSign,
    category: 'Portfolio',
  },
  {
    id: 'collection-performance',
    title: 'Collection Performance & Receipts',
    description: 'Real-time log of collection attempts, payment receipts, channels, and disposition results.',
    icon: CheckCircle2,
    category: 'Collections',
  },
  {
    id: 'agent-performance',
    title: 'Agent Productivity & Ranking',
    description: 'Performance metrics per collector: workload, collected sums, recovery rates, and PTP fulfillment.',
    icon: Users,
    category: 'Workforce',
  },
  {
    id: 'delinquency-dpd',
    title: 'Delinquency & DPD Aging Matrix',
    description: 'In-depth breakdown of overdue balances, bucket transitions (0-30, 31-60, 61-90, 90+), and risk profile.',
    icon: PieChart,
    category: 'Risk',
  },
  {
    id: 'ptp-report',
    title: 'Promise-to-Pay (PTP) Conversion',
    description: 'Detailed audit of customer commitments, honored rates, broken promises, and outstanding amounts.',
    icon: CalendarCheck,
    category: 'Collections',
  },
  {
    id: 'settlement-report',
    title: 'Settlement Approvals & Waivers',
    description: 'Complete log of OTS proposals, agreed amounts, waived interest/principal, and payment fulfillment status.',
    icon: Scale,
    category: 'Settlements',
  },
  {
    id: 'legal-recovery',
    title: 'Legal & Litigation Pipeline',
    description: 'Audit of statutory legal notices, court proceedings, next hearing dates, and authorized write-offs.',
    icon: Gavel,
    category: 'Legal',
  },
];

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>('portfolio-summary');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dpdBucket, setDpdBucket] = useState<string>('');
  const [loanStatus, setLoanStatus] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  const [reportData, setReportData] = useState<ReportResultData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getReportDataApi(token, selectedReport, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        bucket: dpdBucket || undefined,
        status: loanStatus || undefined,
        page,
        limit,
      });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [token, selectedReport, startDate, endDate, dpdBucket, loanStatus, page, limit]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownloadCsv = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      await downloadReportCsvApi(token, selectedReport, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        bucket: dpdBucket || undefined,
        status: loanStatus || undefined,
      });
    } catch (err: any) {
      console.error('Failed to download CSV:', err);
      alert('Failed to download CSV report: ' + (err.message || 'Error occurred'));
    } finally {
      setDownloading(false);
    }
  };

  const handleDateFilterChange = (range: { startDate: string; endDate: string }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setPage(1);
  };

  const handleDateReset = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatCellValue = (header: string, val: any): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') {
      const lowerH = header.toLowerCase();
      if (
        lowerH.includes('amount') ||
        lowerH.includes('balance') ||
        lowerH.includes('collected') ||
        lowerH.includes('paid') ||
        lowerH.includes('waived') ||
        lowerH.includes('principal') ||
        lowerH.includes('interest') ||
        lowerH.includes('overdue') ||
        lowerH.includes('outstanding')
      ) {
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (lowerH.includes('rate') || lowerH.includes('percent') || lowerH.includes('%')) {
        return `${val.toFixed(1)}%`;
      }
      return val.toLocaleString();
    }
    if (typeof val === 'string' && val.includes('T') && val.length >= 19 && !isNaN(Date.parse(val))) {
      return new Date(val).toLocaleDateString();
    }
    return String(val);
  };

  const renderNav = () => {
    if (user?.role === 'ADMIN') return <AdminNav />;
    if (user?.role === 'SUPERVISOR') return <SupervisorNav />;
    if (user?.role === 'LEGAL_HEAD') return <LegalNav />;
    return <AdminNav />;
  };

  const activeOption = REPORT_OPTIONS.find((r) => r.id === selectedReport);
  const totalRecords = reportData?.pagination?.total ?? reportData?.rows?.length ?? 0;
  const totalPages = reportData?.pagination?.totalPages ?? (Math.ceil(totalRecords / limit) || 1);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPERVISOR', 'LEGAL_HEAD']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
        {renderNav()}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Executive Reports &amp; Exports
                  </h1>
                  <p className="text-xs text-slate-400">
                    Real-time aggregated portfolio, collection, and legal recovery statements with verified CSV streaming
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Refresh Data</span>
              </button>

              <button
                onClick={handleDownloadCsv}
                disabled={downloading || loading || totalRecords === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                <span>{downloading ? 'Generating CSV...' : 'Export to CSV'}</span>
              </button>
            </div>
          </div>

          {/* Report Selection Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select Report Template (7 Available)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {REPORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedReport === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedReport(opt.id);
                      setPage(1);
                    }}
                    className={`p-3.5 rounded-xl text-left border transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`p-1.5 rounded-lg border ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {opt.category}
                        </span>
                      </div>
                      <h3
                        className={`text-xs font-bold mb-1 ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {opt.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active View</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtering & Parameters Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handleDateFilterChange}
                  onReset={handleDateReset}
                />

                {/* DPD Bucket Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400">DPD:</label>
                  <select
                    value={dpdBucket}
                    onChange={(e) => {
                      setDpdBucket(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">All DPD Buckets</option>
                    <option value="0-30">0-30 DPD (Early Delinquency)</option>
                    <option value="31-60">31-60 DPD (Mid Stage)</option>
                    <option value="61-90">61-90 DPD (Pre-NPA)</option>
                    <option value="90+">90+ DPD (NPA / Legal)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400">Status:</label>
                  <select
                    value={loanStatus}
                    onChange={(e) => {
                      setLoanStatus(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">All Statuses</option>
                    <option value="CURRENT">CURRENT</option>
                    <option value="DELINQUENT">DELINQUENT</option>
                    <option value="DEFAULT">DEFAULT</option>
                    <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
                    <option value="SETTLED">SETTLED</option>
                    <option value="WRITTEN_OFF">WRITTEN_OFF</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                {/* Page Limit */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400">Show:</label>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value={10}>10 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                  </select>
                </div>
              </div>

              {/* Status Meta */}
              {reportData && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      <strong className="text-white">{totalRecords.toLocaleString()}</strong> total records
                    </span>
                  </div>
                  <span>&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(reportData.generatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
            {/* Table Header / Title */}
            <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeOption?.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedReport}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{activeOption?.description}</p>
              </div>

              {totalRecords > 0 && (
                <div className="text-xs text-slate-400">
                  Showing page <strong className="text-white">{page}</strong> of{' '}
                  <strong className="text-white">{totalPages}</strong>
                </div>
              )}
            </div>

            {/* Content Body */}
            {loading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-medium">Aggregating live MongoDB records...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-400 font-medium">{error}</p>
                <button
                  onClick={fetchReport}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : !reportData || reportData.rows.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <Info className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">No records found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No data matches the selected filters or date range. Adjust your filters or select a different report template.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60">
                      {reportData.headers.map((col, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider text-[10px] whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {reportData.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-800/40 transition duration-100 group"
                      >
                        {reportData.headers.map((col, cIdx) => {
                          const val = row[col];
                          const formatted = formatCellValue(col, val);

                          // Badge styling for common status / buckets
                          const isStatus = col.toLowerCase().includes('status');
                          const isBucket = col.toLowerCase().includes('bucket');

                          return (
                            <td
                              key={cIdx}
                              className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap"
                            >
                              {isStatus ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    val === 'CURRENT'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : val === 'SETTLED'
                                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                      : val === 'WRITTEN_OFF'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      : val === 'PAYMENT_PENDING'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {formatted}
                                </span>
                              ) : isBucket ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                    val === '0-30'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : val === '31-60'
                                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      : val === '61-90'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}
                                >
                                  {formatted}
                                </span>
                              ) : (
                                <span>{formatted}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {reportData && totalRecords > 0 && (
              <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Showing {(page - 1) * limit + 1} to{' '}
                  {Math.min(page * limit, totalRecords)} of{' '}
                  <strong className="text-white">{totalRecords}</strong> records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 px-2 font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= totalRecords || loading}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
