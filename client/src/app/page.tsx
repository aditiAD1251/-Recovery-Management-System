'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { checkHealth } from '../services/api';
import { HealthCheckResponse, ConnectionState } from '../types';
import { 
  ShieldCheck, 
  Server, 
  Database, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock
} from 'lucide-react';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated, user, getRoleRedirectPath } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  const fetchHealthStatus = useCallback(async () => {
    setConnectionState('loading');
    setErrorMessage(null);

    try {
      const data = await checkHealth();
      setHealthData(data);
      setConnectionState('connected');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthData(null);
      setConnectionState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to backend server');
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto w-full space-y-8 my-auto">
        
        {/* Header Section */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>Banking Recovery Core Platform &bull; Step 2 Active</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Collection & Loan Recovery Management System
          </h1>
          <p className="text-base sm:text-lg font-medium text-slate-400 max-w-2xl mx-auto">
            Secure Role-Based Access Control portal for Admins, Supervisors, Field Agents, and Legal Officers.
          </p>

          <div className="pt-2 flex items-center justify-center gap-3">
            {isAuthenticated && user ? (
              <Link
                href={getRoleRedirectPath(user.role)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/60 transition"
              >
                <span>Go to {user.role} Dashboard ({user.name})</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/60 transition"
              >
                <span>Sign In to Recovery Portal</span>
              </Link>
            )}
          </div>
        </header>


        {/* System Status Banner */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-1">
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                System Status
              </span>
              <div className="flex items-center gap-3">
                {connectionState === 'loading' && (
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Backend...</span>
                  </div>
                )}
                {connectionState === 'connected' && (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>Backend Connected</span>
                  </div>
                )}
                {connectionState === 'error' && (
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
                    <XCircle className="w-6 h-6 text-rose-500" />
                    <span>Backend Not Connected</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={fetchHealthStatus}
              disabled={connectionState === 'loading'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-sm font-medium transition duration-200 border border-slate-700 hover:border-slate-600 shadow"
            >
              <RefreshCw className={`w-4 h-4 ${connectionState === 'loading' ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>

          {/* Connection Details */}
          {connectionState === 'connected' && healthData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">API Response</span>
                <span className="text-sm font-semibold text-emerald-400">{healthData.message}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">MongoDB Status</span>
                <span className={`text-sm font-semibold ${healthData.database?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {healthData.database?.status ? healthData.database.status.toUpperCase() : 'UNKNOWN'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 block">Environment</span>
                <span className="text-sm font-semibold text-slate-200 uppercase">
                  {healthData.environment || 'development'}
                </span>
              </div>
            </div>
          )}

          {connectionState === 'error' && errorMessage && (
            <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-sm">
              <p className="font-semibold">Connection Failure Details:</p>
              <p className="text-rose-400 mt-1 font-mono text-xs">{errorMessage}</p>
              <p className="text-slate-400 mt-2 text-xs">
                Ensure the Express backend is running on <code className="text-slate-200">http://localhost:5000</code> and CORS allows requests from this client.
              </p>
            </div>
          )}

          {lastChecked && (
            <div className="flex items-center gap-1 text-xs text-slate-400 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Last checked at {lastChecked}</span>
            </div>
          )}
        </div>

        {/* Foundation Architecture Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-white text-base">Express Backend</h2>
            <p className="text-xs text-slate-400 mt-1">
              Node.js + Express + TypeScript REST API listening on Port 5000 with centralized error handling.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-blue-500/10 text-blue-400 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-white text-base">Next.js Frontend</h2>
            <p className="text-xs text-slate-400 mt-1">
              Next.js 15 App Router with Tailwind CSS, TypeScript, and clean API services layer.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="p-2.5 w-fit rounded-lg bg-amber-500/10 text-amber-400 mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-white text-base">MongoDB Database</h2>
            <p className="text-xs text-slate-400 mt-1">
              Mongoose connection manager configured with resilient reconnection and status reporting.
            </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-900 mt-12">
        <span>CLRMS Foundation & Architecture &bull; Step 1 Complete</span>
      </footer>
    </main>
  );
}
