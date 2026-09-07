'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  CalendarCheck,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';

interface AgentNavProps {
  employeeCode?: string;
  regionName?: string;
}

export const AgentNav: React.FC<AgentNavProps> = ({ employeeCode, regionName }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const navItems = [
    { label: 'My Assigned Loans', href: '/agent', icon: LayoutDashboard },
    { label: 'My Performance', href: '/agent/analytics', icon: TrendingUp },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Header Row */}
        <div className="py-3.5 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base">CLRMS Portal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  AGENT WORKSPACE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Field Recovery Operations &bull; Collection Attempts &bull; Promise to Pay Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs font-semibold text-white">{user?.name}</span>
                {employeeCode && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-400 border border-slate-700">
                    {employeeCode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 justify-end text-[10px] text-slate-400">
                <span className="font-mono">{user?.email}</span>
                {regionName && (
                  <span>&bull; <strong className="text-slate-300">{regionName} Region</strong></span>
                )}
              </div>
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
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default AgentNav;
