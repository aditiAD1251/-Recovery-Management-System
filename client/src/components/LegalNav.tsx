'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Scale,
  Gavel,
  CheckSquare,
  FileText,
  AlertOctagon,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const LegalNav = ({
  activeTab,
  setActiveTab,
}: {
  activeTab?: string;
  setActiveTab?: (tab: 'CASES' | 'SETTLEMENTS' | 'NOTICES' | 'NPA_ACCOUNTS') => void;
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const tabs = [
    { key: 'CASES', label: 'Litigation & Cases', icon: Gavel },
    { key: 'SETTLEMENTS', label: 'Settlement Approvals', icon: CheckSquare },
    { key: 'NOTICES', label: 'Statutory Notices', icon: FileText },
    { key: 'NPA_ACCOUNTS', label: '90+ DPD / NPA Portfolio', icon: AlertOctagon },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Header Row */}
        <div className="py-3.5 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base">CLRMS Portal</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  LEGAL &amp; RECOVERY DIVISION
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Litigation Management &bull; Statutory Notices &bull; Settlement Sign-offs &bull; Debt Write-Offs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-white block">{user?.name}</span>
              <span className="text-[10px] text-purple-400 font-mono">ROLE_LEGAL_HEAD</span>
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
        {setActiveTab && (
          <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition duration-150 ${
                    isActive
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};

export default LegalNav;
