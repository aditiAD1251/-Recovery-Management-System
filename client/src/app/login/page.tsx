'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Briefcase,
  Scale,
} from 'lucide-react';
import Link from 'next/link';

interface DemoAccount {
  role: UserRole;
  title: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'ADMIN',
    title: 'Admin',
    email: 'admin@clrms.local',
    password: 'Admin@123456',
    icon: ShieldCheck,
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    role: 'SUPERVISOR',
    title: 'Supervisor',
    email: 'supervisor@clrms.local',
    password: 'Supervisor@123456',
    icon: Building2,
    color: 'border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    role: 'AGENT',
    title: 'Agent',
    email: 'agent@clrms.local',
    password: 'Agent@123456',
    icon: Briefcase,
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20',
  },
  {
    role: 'LEGAL_HEAD',
    title: 'Legal Head',
    email: 'legal@clrms.local',
    password: 'Legal@123456',
    icon: Scale,
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20',
  },
];

export default function LoginPage() {
  const { login, isAuthenticated, user, getRoleRedirectPath, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect to appropriate role dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace(getRoleRedirectPath(user.role));
    }
  }, [authLoading, isAuthenticated, user, router, getRoleRedirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Client-Side Validation
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setErrorMessage('Please enter a valid email format.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser = await login({
        email: email.trim(),
        password,
      });

      // Redirect based on role
      const redirectPath = getRoleRedirectPath(loggedInUser.role);
      router.push(redirectPath);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 p-4 sm:p-8">
      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-200">CLRMS Recovery Portal</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">STEP 2 &bull; RBAC AUTH</span>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto w-full my-auto space-y-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sign In to CLRMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Collection &amp; Loan Recovery Management System
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-rose-200">Authentication Error</p>
                <p className="text-rose-400 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@clrms.local"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition duration-200 shadow-lg shadow-emerald-950/50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Demo Accounts Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Quick-Fill Demo Roles
              </span>
              <span className="text-[10px] text-slate-500">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const IconComponent = acc.icon;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickFill(acc)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition ${acc.color}`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{acc.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-500 py-3">
        CLRMS Role-Based Access Control &bull; Confidential &amp; Protected Banking System
      </footer>
    </div>
  );
}
