'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AgentNav } from '../../../components/AgentNav';
import { StatCard } from '../../../components/analytics/StatCard';
import { BucketDistributionBar } from '../../../components/analytics/BucketDistributionBar';
import { DonutChart, DonutSegment } from '../../../components/analytics/DonutChart';
import { DateRangeFilter } from '../../../components/analytics/DateRangeFilter';
import { getAgentAnalyticsApi } from '../../../services/analyticsApi';
import { AgentAnalyticsData } from '../../../types/analytics';
import {
  Briefcase,
  TrendingUp,
  CircleDollarSign,
  AlertTriangle,
  CalendarCheck,
  Clock,
  PhoneCall,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  User,
} from 'lucide-react';
import Link from 'next/link';

export default function AgentAnalyticsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<AgentAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAgentAnalyticsApi(token, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load agent analytics:', err);
      setError(err.message || 'Failed to fetch personal analytics');
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

  const contactModeSegments: DonutSegment[] = data
    ? [
        { label: 'Phone Call', value: data.collectionActivity.attemptsByMode.CALL || 0, color: '#3b82f6', formattedValue: `${data.collectionActivity.attemptsByMode.CALL || 0} calls` },
        { label: 'Field Visit', value: data.collectionActivity.attemptsByMode.FIELD_VISIT || 0, color: '#10b981', formattedValue: `${data.collectionActivity.attemptsByMode.FIELD_VISIT || 0} visits` },
        { label: 'SMS', value: data.collectionActivity.attemptsByMode.SMS || 0, color: '#f59e0b', formattedValue: `${data.collectionActivity.attemptsByMode.SMS || 0} SMS` },
        { label: 'WhatsApp', value: data.collectionActivity.attemptsByMode.WHATSAPP || 0, color: '#06b6d4', formattedValue: `${data.collectionActivity.attemptsByMode.WHATSAPP || 0} msgs` },
        { label: 'Email', value: data.collectionActivity.attemptsByMode.EMAIL || 0, color: '#8b5cf6', formattedValue: `${data.collectionActivity.attemptsByMode.EMAIL || 0} emails` },
        { label: 'Notice', value: data.collectionActivity.attemptsByMode.LEGAL_NOTICE || 0, color: '#f43f5e', formattedValue: `${data.collectionActivity.attemptsByMode.LEGAL_NOTICE || 0} notices` },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
        <AgentNav
          employeeCode={data?.agentProfile.employeeCode}
          regionName={data?.agentProfile.regionName}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    My Collection Performance
                  </h1>
                  <p className="text-xs text-slate-400">
                    Personal recovery scorecard, PTP commitment tracking, and priority customer follow-up schedule
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/agent"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
              >
                <span>Back to Assigned Accounts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-950/50 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Stats</span>
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
                <span>Agent: <strong className="text-white">{data.agentProfile.name}</strong></span>
                {data.agentProfile.employeeCode && (
                  <span className="font-mono text-amber-400">({data.agentProfile.employeeCode})</span>
                )}
                {data.agentProfile.regionName && (
                  <span className="text-slate-500">&bull; {data.agentProfile.regionName}</span>
                )}
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
              {/* Primary Personal KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="My Assigned Loans"
                  value={data.portfolioSummary.totalAssignedLoans.toLocaleString()}
                  subtitle="Active collection accounts"
                  icon={Briefcase}
                  iconColor="amber"
                />
                <StatCard
                  title="Overdue Portfolio"
                  value={`$${(data.portfolioSummary.totalOverdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle="Total delinquency under recovery"
                  icon={AlertTriangle}
                  iconColor="rose"
                />
                <StatCard
                  title="Total Recovered Amount"
                  value={`$${(data.portfolioSummary.recoveredAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle={`${data.collectionActivity.totalAttempts} total attempts`}
                  icon={CircleDollarSign}
                  iconColor="emerald"
                />
                <StatCard
                  title="PTP Fulfillment Rate"
                  value={`${(data.ptpMetrics.fulfillmentRate || 0).toFixed(1)}%`}
                  subtitle={`${data.ptpMetrics.kept} of ${data.ptpMetrics.totalCreated} kept`}
                  icon={TrendingUp}
                  iconColor={data.ptpMetrics.fulfillmentRate >= 60 ? 'emerald' : 'amber'}
                />
              </div>

              {/* Bucket Distribution */}
              <BucketDistributionBar
                buckets={data.bucketDistribution}
                title="My Delinquency Portfolio Aging"
                subtitle={`Distribution across ${data.portfolioSummary.totalAssignedLoans} assigned loan accounts`}
              />

              {/* Contact Modes and Outcomes Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Modes Chart */}
                <DonutChart
                  title="Contact Channel Distribution"
                  subtitle="Breakdown of customer outreach channels"
                  segments={contactModeSegments}
                  centerLabel="Total Attempts"
                  centerValue={data.collectionActivity.totalAttempts}
                />

                {/* PTP Performance Summary Card */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-emerald-400" />
                      <span>Promise-to-Pay (PTP) Audit</span>
                    </h3>
                    <p className="text-xs text-slate-400">Audit of borrower repayment promises</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total PTPs</span>
                      <span className="text-lg font-bold text-white">{data.ptpMetrics.totalCreated}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Kept</span>
                      <span className="text-lg font-bold text-emerald-400">{data.ptpMetrics.kept}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Broken</span>
                      <span className="text-lg font-bold text-rose-400">{data.ptpMetrics.broken}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Pending</span>
                      <span className="text-lg font-bold text-amber-400">{data.ptpMetrics.pending}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">PTP Fulfillment Conversion</span>
                      <span className="text-emerald-400 font-bold">{(data.ptpMetrics.fulfillmentRate || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, data.ptpMetrics.fulfillmentRate || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-up Action Agenda */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Priority Follow-up Agenda (Due Today)</h3>
                      <p className="text-[11px] text-slate-400">
                        {data.followUpAgenda.dueToday.length} scheduled borrower appointments due today ({data.followUpAgenda.overdueCount} overdue, {data.followUpAgenda.upcomingCount} upcoming)
                      </p>
                    </div>
                  </div>
                </div>

                {data.followUpAgenda.dueToday.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No follow-ups scheduled for today. Great job!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Follow-up Date</th>
                          <th className="px-4 py-3">Borrower Name</th>
                          <th className="px-4 py-3">Account Number</th>
                          <th className="px-4 py-3 text-right">Overdue Amount</th>
                          <th className="px-4 py-3 text-center">DPD</th>
                          <th className="px-4 py-3">Remarks / Plan</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.followUpAgenda.dueToday.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition duration-100">
                            <td className="px-5 py-3 text-slate-300 font-medium whitespace-nowrap">
                              {new Date(item.nextFollowUpDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">
                              {item.borrowerName}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                              {item.accountNumber}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-white">
                              ${(item.overdueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  item.dpd > 90
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : item.dpd > 60
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {item.dpd} DPD
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[11px] max-w-xs truncate">
                              {item.remarks || '-'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Link
                                href={`/agent`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition"
                              >
                                <span>Open Account</span>
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
