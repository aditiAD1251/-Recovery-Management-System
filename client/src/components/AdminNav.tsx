'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  MapPin,
  Briefcase,
  LayoutDashboard,
  LogOut,
  CircleDollarSign,
  Users2,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Reports & Exports', href: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Loans & DPD', href: '/admin/loans', icon: CircleDollarSign },
    { label: 'Workloads', href: '/supervisor/workload', icon: Users2 },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Regions', href: '/admin/regions', icon: MapPin },
    { label: 'Collection Agents', href: '/admin/agents', icon: Briefcase },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Header Row */}
        <div className="py-3.5 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base">CLRMS Portal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ADMIN MASTER DATA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Administrative System Configuration &amp; Master Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-white block">{user?.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800/80 text-slate-300 hover:text-rose-300 text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default AdminNav;
