'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AdminNav } from '../../../components/AdminNav';
import { AdminAnalyticsData } from '../../../types/analytics';
import { getAdminAnalyticsApi } from '../../../services/analyticsApi';
import { StatCard } from '../../../components/analytics/StatCard';
import { BucketDistributionBar } from '../../../components/analytics/BucketDistributionBar';
import { DonutChart, DonutSegment } from '../../../components/analytics/DonutChart';
import { DateRangeFilter } from '../../../components/analytics/DateRangeFilter';
import {
  TrendingUp,
  CircleDollarSign,
  AlertTriangle,
  Scale,
  Gavel,
  CalendarCheck,
  PhoneCall,
  MapPin,
  Users,
  Briefcase,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminAnalyticsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getAdminAnalyticsApi(token, {
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err.message);
      setErrorMessage(err.message || 'Failed to load executive analytics');
    } finally {
      setIsLoading(false);
    }
  }, [token, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Color mapping for Status Donut
  const statusColors: Record<string, string> = {
    CURRENT: '#10b981',
    DELINQUENT: '#f59e0b',
    DEFAULT: '#f43f5e',
    SETTLED: '#a855f7',
    WRITTEN_OFF: '#ef4444',
    CLOSED: '#64748b',
  };

  const statusSegments: DonutSegment[] =
    data?.statusDistribution.map((s) => ({
      label: s.status,
      value: s.count,
      color: statusColors[s.status] || '#94a3b8',
      formattedValue: `${s.count} loans`,
    })) || [];

  // Color mapping for Loan Type Donut
  const typeColors: Record<string, string> = {
    PERSONAL: '#3b82f6',
    HOME: '#10b981',
    AUTO: '#f59e0b',
    BUSINESS: '#a855f7',
    CREDIT_CARD: '#ec4899',
  };

  const typeSegments: DonutSegment[] =
    data?.loanTypeDistribution.map((t) => ({
      label: t.loanType.replace('_', ' '),
      value: t.count,
      color: typeColors[t.loanType] || '#94a3b8',
      formattedValue: `${t.count} accounts`,
    })) || [];

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        <AdminNav />

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Recovery Intelligence &bull; Real-time Aggregations</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <TrendingUp className="w-7 h-7 text-emerald-400" />
                Executive Analytics &amp; Recovery Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Enterprise-wide portfolio health, recovery velocity, DPD delinquency migration, and agent productivity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Reports Center</span>
              </Link>

              <button
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition hover:text-white"
                title="Refresh Analytics"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Date Filter Toolbar */}
          <DateRangeFilter
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(range) => setDateRange(range)}
            onReset={() => setDateRange({ startDate: '', endDate: '' })}
          />

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Portfolio"
              value={`₹${((data?.summary.totalPortfolioAmount || 0) / 100000).toFixed(2)}L`}
              subtitle={`Exact: ₹${(data?.summary.totalPortfolioAmount || 0).toLocaleString('en-IN')} across ${data?.summary.totalLoansCount || 0} loans`}
              icon={CircleDollarSign}
              iconColor="emerald"
            />

            <StatCard
              title="Total Outstanding"
              value={`₹${((data?.summary.totalOutstandingAmount || 0) / 100000).toFixed(2)}L`}
              subtitle={`Overdue: ₹${(data?.summary.totalOverdueAmount || 0).toLocaleString('en-IN')}`}
              icon={TrendingUp}
              iconColor="blue"
              badge={{ text: `${data?.summary.activeLoansCount || 0} Active`, variant: 'blue' }}
            />

            <StatCard
              title="Overall Recovery Rate"
              value={`${data?.summary.overallRecoveryRate || 0}%`}
              subtitle={`Settled: ₹${(data?.summary.settledAmount || 0).toLocaleString('en-IN')} (${data?.summary.settledLoansCount || 0} accounts)`}
              icon={CheckCircle2}
              iconColor="purple"
              badge={{ text: `${data?.summary.settledLoansCount || 0} Settled`, variant: 'purple' }}
            />

            <StatCard
              title="NPA (90+ DPD)"
              value={data?.summary.npaLoansCount || 0}
              subtitle={`Written Off: ₹${(data?.summary.writtenOffAmount || 0).toLocaleString('en-IN')} (${data?.summary.writtenOffLoansCount || 0} loans)`}
              icon={AlertTriangle}
              iconColor="rose"
              badge={{ text: `${data?.summary.delinquentLoansCount || 0} Delinquent`, variant: 'rose' }}
            />
          </div>

          {/* DPD Delinquency Bucket Distribution Visualizer */}
          <BucketDistributionBar
            buckets={data?.bucketDistribution || []}
            title="Portfolio Delinquency by DPD Buckets"
            subtitle="Live tracking of early, mid, late, and chronic NPA recovery portfolios"
          />

          {/* 2-Column Donut Charts: Status Distribution vs Product Line Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutChart
              title="Loan Status Distribution"
              subtitle="Current, delinquent, default, settled, written-off, and closed accounts"
              segments={statusSegments}
              centerLabel="Total Loans"
              centerValue={data?.summary.totalLoansCount || 0}
            />

            <DonutChart
              title="Portfolio by Loan Type"
              subtitle="Personal, Home, Auto, Business, and Credit Card lines"
              segments={typeSegments}
              centerLabel="Product Lines"
              centerValue={data?.loanTypeDistribution.length || 0}
            />
          </div>

          {/* Operational Pipelines: Settlement & Legal Recovery & PTP & Activity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Settlement Overview */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Settlements
                </span>
                <Scale className="w-4 h-4 text-purple-400" />
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-mono font-bold text-white">
                  {data?.settlementOverview.totalProposals || 0}
                </span>
                <span className="text-xs text-slate-400 block">Total Proposals</span>
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Pending Supervisor:</span>
                  <span className="font-bold text-amber-400">{data?.settlementOverview.pendingSupervisor || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Legal Head:</span>
                  <span className="font-bold text-purple-400">{data?.settlementOverview.pendingLegalHead || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Pending:</span>
                  <span className="font-bold text-blue-400">{data?.settlementOverview.paymentPending || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Waiver:</span>
                  <span className="font-mono text-slate-200">{data?.settlementOverview.averageWaiverPercentage || 0}%</span>
                </div>
              </div>
            </div>

            {/* Legal Overview */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  Legal Recovery
                </span>
                <Gavel className="w-4 h-4 text-rose-400" />
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-mono font-bold text-white">
                  {data?.legalOverview.totalLegalCases || 0}
                </span>
                <span className="text-xs text-slate-400 block">Litigation Cases</span>
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Claim Amount:</span>
                  <span className="font-mono text-slate-200">₹{((data?.legalOverview.totalClaimAmount || 0) / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between">
                  <span>Litigation Recovered:</span>
                  <span className="font-mono text-emerald-400 font-bold">₹{((data?.legalOverview.totalRecoveredAmount || 0) / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between">
                  <span>Notices Dispatched:</span>
                  <span className="font-bold text-slate-300">{data?.legalOverview.noticesDispatched || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upcoming Hearings:</span>
                  <span className="font-bold text-amber-400">{data?.legalOverview.hearingsScheduled || 0}</span>
                </div>
              </div>
            </div>

            {/* PTP Overview */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Promise to Pay
                </span>
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-mono font-bold text-white">
                  {data?.ptpOverview.fulfillmentRate || 0}%
                </span>
                <span className="text-xs text-slate-400 block">Fulfillment Rate</span>
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Total PTPs:</span>
                  <span className="font-bold text-white">{data?.ptpOverview.totalCreated || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kept Commitments:</span>
                  <span className="font-bold text-emerald-400">{data?.ptpOverview.kept || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Broken Commitments:</span>
                  <span className="font-bold text-rose-400">{data?.ptpOverview.broken || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending PTPs:</span>
                  <span className="font-bold text-amber-400">{data?.ptpOverview.pending || 0}</span>
                </div>
              </div>
            </div>

            {/* Collection Attempts Overview */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Collection Activity
                </span>
                <PhoneCall className="w-4 h-4 text-blue-400" />
              </div>
              <div className="space-y-1">
                <span className="text-2xl font-mono font-bold text-white">
                  {data?.collectionActivity.totalAttempts || 0}
                </span>
                <span className="text-xs text-slate-400 block">Total Attempts Logged</span>
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Contact Rate:</span>
                  <span className="font-mono text-emerald-400 font-bold">{data?.collectionActivity.contactRate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone Calls:</span>
                  <span className="font-bold text-slate-300">{data?.collectionActivity.attemptsByMode?.PHONE || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Field Visits:</span>
                  <span className="font-bold text-slate-300">{data?.collectionActivity.attemptsByMode?.FIELD_VISIT || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Digital / SMS:</span>
                  <span className="font-bold text-slate-300">
                    {(data?.collectionActivity.attemptsByMode?.SMS || 0) + (data?.collectionActivity.attemptsByMode?.WHATSAPP || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Performance Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  Regional Recovery Performance
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Portfolio balance, active allocation, and recovery metrics across operational regions
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Region</th>
                    <th className="py-3 px-4">Total Loans</th>
                    <th className="py-3 px-4">Active</th>
                    <th className="py-3 px-4">Assigned / Unassigned</th>
                    <th className="py-3 px-4">Total Overdue</th>
                    <th className="py-3 px-4">Total Outstanding</th>
                    <th className="py-3 px-4">Settled</th>
                    <th className="py-3 px-4 text-right">Recovery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.regionalPerformance.map((reg) => (
                    <tr key={reg.regionId || reg.code} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                        <span>{reg.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-blue-400 border border-slate-700">
                          {reg.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{reg.totalLoans}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">{reg.activeLoans}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        <span className="text-emerald-400">{reg.assignedLoans}</span> /{' '}
                        <span className="text-amber-400">{reg.unassignedLoans}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-400">
                        ₹{reg.totalOverdue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        ₹{reg.totalOutstanding.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-400 font-bold">
                        {reg.settledLoans}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {reg.recoveryRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agent Productivity & Performance Ranking */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  Collection Agent Productivity Ranking
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparative analysis of field agent workloads, contact volume, and PTP fulfillment rates
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">Region</th>
                    <th className="py-3 px-4">Assigned Workload</th>
                    <th className="py-3 px-4">Assigned Overdue</th>
                    <th className="py-3 px-4">Attempts Logged</th>
                    <th className="py-3 px-4">PTP (Kept / Total)</th>
                    <th className="py-3 px-4">Fulfillment Rate</th>
                    <th className="py-3 px-4 text-right">Recovered Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.agentPerformanceRanking.map((agent) => (
                    <tr key={agent.agentId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{agent.name}</div>
                        <div className="text-[10px] font-mono text-amber-400">{agent.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{agent.region}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {agent.assignedLoans} loans
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-400">
                        ₹{agent.assignedOverdue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono">{agent.attemptsCount}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        <span className="text-emerald-400 font-bold">{agent.ptpKeptCount}</span> / {agent.ptpCount}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {agent.ptpFulfillmentRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        ₹{agent.recoveredAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Executive Analytics Portal &bull; Step 8 Active
        </footer>
      </div>
    </ProtectedRoute>
  );
}
