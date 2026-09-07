'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { SupervisorNav } from '../../components/SupervisorNav';
import { WorkloadOverviewSummary } from '../../types';
import { getWorkloadSummaryApi } from '../../services/assignmentApi';
import {
  Building2,
  Users2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
  CircleDollarSign,
  Briefcase,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function SupervisorDashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<WorkloadOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getWorkloadSummaryApi(token);
      if (res.success) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load workload summary:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        {/* Navigation Bar */}
        <SupervisorNav />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 my-auto">
          {/* Welcome Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Step 5 &bull; Workload &amp; Allocation Engine Active</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Supervisor Command Center
                </h1>
                <p className="text-sm text-slate-400">
                  Manage field agent workloads, allocate delinquent portfolios, and track regional recovery operations.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Logged In As
                </span>
                <span className="text-sm font-bold text-white">{user?.name}</span>
                <span className="text-xs text-blue-400 block font-mono">ROLE_SUPERVISOR</span>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Unassigned Delinquent Loans */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Unassigned Queue
                  </span>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {summary?.unassignedCount ?? '—'}
                  </span>
                  <span className="text-xs text-slate-400">pending allocation</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Overdue:</span>
                  <span className="font-semibold text-rose-400">
                    ₹{(summary?.unassignedOverdue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Assigned Active Loans */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Assigned Workload
                  </span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {summary?.assignedCount ?? '—'}
                  </span>
                  <span className="text-xs text-slate-400">with agents</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Overdue:</span>
                  <span className="font-semibold text-slate-200">
                    ₹{(summary?.assignedOverdue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Active Delinquent Accounts */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Total Portfolio
                  </span>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <CircleDollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {summary?.totalLoans ?? '—'}
                  </span>
                  <span className="text-xs text-slate-400">accounts</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Total Overdue:</span>
                  <span className="font-semibold text-rose-400">
                    ₹{(summary?.totalOverdue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Critical 90+ NPA Queue */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-rose-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    90+ Days (NPA)
                  </span>
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white">
                    {(summary?.unassignedByBucket?.['90+'] || 0) + (summary?.assignedByBucket?.['90+'] || 0)}
                  </span>
                  <span className="text-xs text-slate-400">critical default</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                  <span>Unassigned 90+:</span>
                  <span className="font-semibold text-rose-400">
                    {summary?.unassignedByBucket?.['90+'] || 0} accounts
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Workload & Allocation Hub Card */}
              <Link
                href="/supervisor/workload"
                className="group p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-950 transition duration-200 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-blue-950/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                    <Users2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition">
                      Workload &amp; Allocation Hub
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      View the unassigned delinquent queue, assign accounts to regional agents, rebalance workloads, and monitor agent capacity.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition">
                  <span>Open Workload Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Loans & Delinquency Oversight Card */}
              <Link
                href="/admin/loans"
                className="group p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950 transition duration-200 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-emerald-950/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                    <CircleDollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                      Portfolio &amp; DPD Engine
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Inspect overall loan portfolio metrics, delinquency buckets (0-30, 31-60, 61-90, 90+), and recalculate DPD parameters.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition">
                  <span>View All Loans</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Supervisor Portal &bull; Step 5 Workload &amp; Agent Assignment Complete
        </footer>
      </div>
    </ProtectedRoute>
  );
}
