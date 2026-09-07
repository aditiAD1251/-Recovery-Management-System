'use client';

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading, getRoleRedirectPath } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-4 shadow-xl">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium text-slate-300">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check role authorization
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const authorizedPath = getRoleRedirectPath(user.role);

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-rose-900/40 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Access Denied (HTTP 403)</h1>
            <p className="text-sm text-slate-400">
              Your role <span className="font-semibold text-rose-400">[{user.role}]</span> is not authorized to access this section.
            </p>
            <div className="pt-2 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Required Role(s): <span className="text-slate-200 font-mono">{allowedRoles.join(', ')}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={authorizedPath}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition duration-200 shadow-lg shadow-emerald-950/50"
            >
              <span>Go to Your Authorized Dashboard ({user.role})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
