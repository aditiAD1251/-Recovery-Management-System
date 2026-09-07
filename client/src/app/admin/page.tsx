'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { AdminNav } from '../../components/AdminNav';
import {
  Users,
  MapPin,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  Shield,
  Layers,
  Sparkles,
  CircleDollarSign,
  Calculator,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        {/* Navigation Bar */}
        <AdminNav />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 my-auto space-y-8">
          {/* Welcome Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Step 4 &bull; Loans &amp; DPD Engine Active</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Admin Command Center
                </h1>
                <p className="text-sm text-slate-400">
                  Manage core loan portfolios, DPD delinquency buckets, system entities, regions, and staff.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Logged In As
                </span>
                <span className="text-sm font-bold text-white">{user?.name}</span>
                <span className="text-xs text-emerald-400 block font-mono">ROLE_ADMIN</span>
              </div>
            </div>

            {/* Navigation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
              {/* Loans & DPD Engine Card */}
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
                      Loans &amp; DPD Engine
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Monitor loan portfolios, delinquency buckets (0-30, 31-60, 61-90, 90+), overdue EMIs, and recalculate DPD.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition">
                  <span>Manage Loans</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Users Card */}
              <Link
                href="/admin/users"
                className="group p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950 transition duration-200 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-indigo-950/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                      User Management
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage administrator, supervisor, field agent, and legal head user accounts and RBAC credentials.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition">
                  <span>Manage Users</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Regions Card */}
              <Link
                href="/admin/regions"
                className="group p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-950 transition duration-200 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-blue-950/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-blue-300 transition">
                      Region Management
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure operational recovery regions (e.g. Pune, Mumbai, Delhi) with unique regional codes.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition">
                  <span>Manage Regions</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Agents Card */}
              <Link
                href="/admin/agents"
                className="group p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-950 transition duration-200 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-amber-950/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                      Collection Agents
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Link agent user accounts with operational regions, assigned supervisors, and employee codes.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition">
                  <span>Manage Agents</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Portal &bull; Step 4 Loan Accounts &amp; DPD Calculation Engine
        </footer>
      </div>
    </ProtectedRoute>
  );
}

