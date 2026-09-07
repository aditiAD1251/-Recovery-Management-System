'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { LegalNav } from '../../../components/LegalNav';
import { StatCard } from '../../../components/analytics/StatCard';
import { DonutChart, DonutSegment } from '../../../components/analytics/DonutChart';
import { DateRangeFilter } from '../../../components/analytics/DateRangeFilter';
import { getLegalAnalyticsApi } from '../../../services/analyticsApi';
import { LegalAnalyticsData } from '../../../types/analytics';
import {
  Scale,
  Gavel,
  FileText,
  AlertTriangle,
  Calendar,
  TrendingUp,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function LegalAnalyticsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<LegalAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLegalAnalyticsApi(token, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load legal analytics:', err);
      setError(err.message || 'Failed to fetch legal analytics');
    } finally {
      setLoading(false);
    }
  }, [token, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleDateChange = (range: { startDate: string; endDate: string }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleDateReset = () => {
    setStartDate('');
    setEndDate('');
  };

  const actionColors: Record<string, string> = {
    SECTION_138_NI_ACT: '#f59e0b',
    SARFAESI_ACT: '#ef4444',
    ARBITRATION: '#8b5cf6',
    DRT_APPLICATION: '#3b82f6',
    SUMMARY_CIVIL_SUIT: '#06b6d4',
    INSOLVENCY_BANKRUPTCY: '#ec4899',
    POLICE_COMPLAINT_420: '#f97316',
  };

  const actionSegments: DonutSegment[] =
    data?.casesByType.map((c) => ({
      label: c.caseType.replace(/_/g, ' '),
      value: c.count,
      color: actionColors[c.caseType] || '#64748b',
      formattedValue: `${c.count} cases (${c.percentage.toFixed(0)}%)`,
    })) || [];

  const stageColors: Record<string, string> = {
    NOTICE_ISSUED: '#3b82f6',
    CASE_FILED: '#8b5cf6',
    SUMMONS_SERVED: '#06b6d4',
    EVIDENCE_STAGE: '#f59e0b',
    ARGUMENTS: '#f97316',
    DECREE_OBTAINED: '#10b981',
    EXECUTION_FILED: '#ec4899',
    SETTLED_LEGAL: '#a855f7',
    CLOSED: '#64748b',
  };

  const stageSegments: DonutSegment[] =
    data?.casesByStage.map((s) => ({
      label: s.stage.replace(/_/g, ' '),
      value: s.count,
      color: stageColors[s.stage] || '#64748b',
      formattedValue: `${s.count} cases (${s.percentage.toFixed(0)}%)`,
    })) || [];

  return (
    <ProtectedRoute allowedRoles={['LEGAL_HEAD', 'ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500/30 selection:text-purple-200">
        <LegalNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Legal &amp; Litigation Recovery Analytics
                  </h1>
                  <p className="text-xs text-slate-400">
                    Statutory notice tracking, court hearing agenda, legal recovery rate, and debt write-off audits
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/legal"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
              >
                <span>Litigation Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Executive Reports</span>
              </Link>

              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-950/50 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Live Data</span>
              </button>
            </div>
          </div>

          {/* Date Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              onReset={handleDateReset}
            />

            {data && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                <span>Active Cases: <strong className="text-white">{data.summary.activeLitigationCases}</strong></span>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchAnalytics}
                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-8">
              {/* Primary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Legal Cases"
                  value={data.summary.totalLegalCases.toLocaleString()}
                  subtitle={`${data.summary.activeLitigationCases} in active litigation`}
                  icon={Gavel}
                  iconColor="purple"
                />
                <StatCard
                  title="Total Claim Amount"
                  value={`$${(data.summary.totalClaimAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle="Under court litigation proceedings"
                  icon={CircleDollarSign}
                  iconColor="rose"
                />
                <StatCard
                  title="Recovered via Legal"
                  value={`$${(data.summary.totalRecoveredAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle={`Recovery rate ${(data.summary.litigationRecoveryRate || 0).toFixed(1)}%`}
                  icon={CheckCircle2}
                  iconColor="emerald"
                />
                <StatCard
                  title="Hearings Scheduled"
                  value={data.summary.hearingsScheduledCount.toLocaleString()}
                  subtitle={`${data.summary.noticesSentCount} statutory notices sent`}
                  icon={Calendar}
                  iconColor="blue"
                />
              </div>

              {/* Action Types and Status Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DonutChart
                  title="Legal Action / Forum Breakdown"
                  subtitle="Distribution across statutory recovery mechanisms"
                  segments={actionSegments}
                  centerLabel="Total Cases"
                  centerValue={data.summary.totalLegalCases}
                />

                <DonutChart
                  title="Litigation Stage Distribution"
                  subtitle="Current stage of active court proceedings"
                  segments={stageSegments}
                  centerLabel="Active Cases"
                  centerValue={data.summary.activeLitigationCases}
                />
              </div>

              {/* Statutory Notices & Write-Off Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Statutory Notices Funnel */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span>Statutory Legal Notices Audit</span>
                      </h3>
                      <p className="text-xs text-slate-400">Notice compliance and response monitoring</p>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {data.summary.noticesSentCount} Sent
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Awaiting Response</span>
                      <span className="text-lg font-bold text-amber-400">{data.summary.awaitingNoticeResponseCount}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Overdue / Expired</span>
                      <span className="text-lg font-bold text-rose-400">{data.summary.overdueNoticeResponsesCount}</span>
                    </div>
                  </div>
                </div>

                {/* Authorized Write-Offs & Waivers */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Authorized Debt Write-Offs</span>
                      </h3>
                      <p className="text-xs text-slate-400">Formal write-offs and bad debt provisioning</p>
                    </div>
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {data.summary.writtenOffCount} Accounts
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300">Total Written-Off Value</span>
                    <span className="text-base font-bold text-white">
                      ${(data.summary.totalWrittenOffAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upcoming Hearings Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Upcoming Court Hearings &amp; Proceedings</h3>
                      <p className="text-[11px] text-slate-400">Scheduled court dates and advocate appearances</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {data.upcomingHearings.length} Scheduled Hearings
                  </span>
                </div>

                {data.upcomingHearings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No upcoming court hearings scheduled.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Next Hearing Date</th>
                          <th className="px-4 py-3">Case Number</th>
                          <th className="px-4 py-3">Court / Tribunal</th>
                          <th className="px-4 py-3">Judge / Bench</th>
                          <th className="px-4 py-3">Borrower</th>
                          <th className="px-4 py-3 text-right">Claim Amount</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.upcomingHearings.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition duration-100">
                            <td className="px-5 py-3 text-slate-300 font-semibold whitespace-nowrap">
                              {new Date(item.nextHearingDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-mono text-purple-400 font-bold whitespace-nowrap">
                              {item.caseNumber}
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {item.courtName}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[11px]">
                              {item.judgeBench || '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-300">
                              {item.borrowerName}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-white">
                              ${(item.claimAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Link
                                href={`/legal`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[11px] font-semibold transition"
                              >
                                <span>View Case</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}
