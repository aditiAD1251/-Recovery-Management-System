'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { SupervisorNav } from '../../../components/SupervisorNav';
import { StatCard } from '../../../components/analytics/StatCard';
import { BucketDistributionBar } from '../../../components/analytics/BucketDistributionBar';
import { DateRangeFilter } from '../../../components/analytics/DateRangeFilter';
import { getSupervisorAnalyticsApi } from '../../../services/analyticsApi';
import { SupervisorAnalyticsData } from '../../../types/analytics';
import {
  Users2,
  TrendingUp,
  CircleDollarSign,
  AlertTriangle,
  Clock,
  CalendarCheck,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
  Activity,
  Award,
  Scale,
  Gavel,
} from 'lucide-react';
import Link from 'next/link';

export default function SupervisorAnalyticsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<SupervisorAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSupervisorAnalyticsApi(token, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load supervisor analytics:', err);
      setError(err.message || 'Failed to fetch supervisor analytics');
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

  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
        <SupervisorNav />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Users2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Supervisor Team Analytics
                  </h1>
                  <p className="text-xs text-slate-400">
                    Territory delinquency, collection agent productivity, PTP conversion rates, and follow-up compliance
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-950/50 disabled:opacity-50"
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
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span>Active Agents: <strong className="text-white">{data.teamSummary.activeAgentsCount}</strong></span>
                {data.supervisorInfo.region && (
                  <span className="text-slate-500 font-mono">({data.supervisorInfo.region.name})</span>
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

          {/* Loading Skeleton or Stats */}
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
                  title="Territory Managed Loans"
                  value={data.teamSummary.totalTerritoryLoans.toLocaleString()}
                  subtitle={`${data.teamSummary.assignedLoans} assigned (${data.teamSummary.unassignedLoans} unassigned)`}
                  icon={CircleDollarSign}
                  iconColor="blue"
                />
                <StatCard
                  title="Total Overdue Supervised"
                  value={`$${(data.teamSummary.totalOverdue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle={`$${(data.teamSummary.assignedOverdue || 0).toLocaleString()} assigned`}
                  icon={AlertTriangle}
                  iconColor="rose"
                />
                <StatCard
                  title="Total Recovered Amount"
                  value={`$${(data.teamSummary.recoveredAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  subtitle={`PTP conversion ${(data.ptpMetrics.fulfillmentRate || 0).toFixed(1)}%`}
                  icon={TrendingUp}
                  iconColor="emerald"
                />
                <StatCard
                  title="Follow-ups Due Today"
                  value={(data.followUpCompliance.dueTodayCount || 0).toLocaleString()}
                  subtitle={`${data.followUpCompliance.overdueFollowupsCount || 0} overdue`}
                  icon={Clock}
                  iconColor={data.followUpCompliance.overdueFollowupsCount > 0 ? 'amber' : 'emerald'}
                />
              </div>

              {/* DPD Bucket Distribution */}
              <BucketDistributionBar
                buckets={data.bucketDistribution}
                title="Territory Delinquency Aging"
                subtitle={`Distribution across ${data.teamSummary.totalTerritoryLoans} total managed loans`}
              />

              {/* Agent Performance Leaderboard Table */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Agent Workload &amp; Collection Productivity</h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {data.agentWorkloadAndPerformance.length} Agents Supervised
                  </span>
                </div>

                {data.agentWorkloadAndPerformance.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No collection agents currently assigned in this territory.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Agent Name</th>
                          <th className="px-4 py-3">Emp Code</th>
                          <th className="px-4 py-3 text-right">Assigned Loans</th>
                          <th className="px-4 py-3 text-right">Assigned Overdue</th>
                          <th className="px-4 py-3 text-right">Attempts Made</th>
                          <th className="px-4 py-3 text-right">PTP Created</th>
                          <th className="px-4 py-3 text-right">PTP Kept</th>
                          <th className="px-4 py-3 text-right">Fulfillment</th>
                          <th className="px-5 py-3 text-right">Total Recovered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.agentWorkloadAndPerformance.map((agent, idx) => (
                          <tr key={agent.agentId} className="hover:bg-slate-800/40 transition duration-100">
                            <td className="px-5 py-3 font-semibold text-white flex items-center gap-2">
                              {idx === 0 && (
                                <Award className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span>{agent.name}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                              {agent.employeeCode || '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-300">
                              {agent.assignedLoans}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-400 font-mono">
                              ${agent.assignedOverdue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {agent.attemptsCount}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-300">
                              {agent.ptpCount}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                              {agent.ptpKeptCount}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  agent.ptpFulfillmentRate >= 70
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : agent.ptpFulfillmentRate >= 40
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {agent.ptpFulfillmentRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-white">
                              ${(agent.recoveredAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Settlement & Legal Territory Pipeline Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">Territory Settlements Pipeline</h3>
                    </div>
                    <Link
                      href="/supervisor/settlements"
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      Review &rarr;
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pending Review</span>
                      <span className="text-base font-bold text-amber-400">{data.settlementsPipeline.pendingSupervisorReview}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Payment Pending</span>
                      <span className="text-base font-bold text-blue-400">{data.settlementsPipeline.paymentPending}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Settled</span>
                      <span className="text-base font-bold text-emerald-400">{data.settlementsPipeline.settledInTerritory}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gavel className="w-4 h-4 text-rose-400" />
                      <h3 className="text-sm font-bold text-white">Legal Escalations</h3>
                    </div>
                    <Link
                      href="/supervisor/legal"
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      View Cases &rarr;
                    </Link>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300 block font-semibold">Active Escalated Accounts</span>
                      <span className="text-[11px] text-slate-500">Transferred to legal division</span>
                    </div>
                    <span className="text-xl font-bold text-rose-400">{data.legalEscalationsCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}
