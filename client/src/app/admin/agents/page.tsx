'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AdminNav } from '../../../components/AdminNav';
import { CollectionAgentItem, UserItem, RegionItem } from '../../../types';
import {
  getAgentsApi,
  createAgentApi,
  updateAgentApi,
  deleteAgentApi,
  getUsersApi,
  getRegionsApi,
} from '../../../services/masterDataApi';
import {
  Briefcase,
  Search,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Phone,
  User,
  MapPin,
  Building2,
} from 'lucide-react';

export default function AdminAgentsPage() {
  const { token } = useAuth();

  const [agents, setAgents] = useState<CollectionAgentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAgents, setTotalAgents] = useState(0);

  // Dropdown Options
  const [availableUsers, setAvailableUsers] = useState<UserItem[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<UserItem[]>([]);
  const [availableRegions, setAvailableRegions] = useState<RegionItem[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<CollectionAgentItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    user: '',
    employeeCode: '',
    region: '',
    supervisor: '',
    phone: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await getAgentsApi(token, {
        page,
        limit: 10,
        search,
        isActive: statusFilter,
      });

      setAgents(res.data.agents || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalAgents(res.data.pagination?.total || 0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load collection agents');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, search, statusFilter]);

  const loadDropdownData = useCallback(async () => {
    if (!token) return;
    try {
      const [usersRes, supervisorsRes, regionsRes] = await Promise.all([
        getUsersApi(token, { role: 'AGENT', limit: 100, isActive: 'true' }),
        getUsersApi(token, { role: 'SUPERVISOR', limit: 100, isActive: 'true' }),
        getRegionsApi(token, { all: true, isActive: 'true' }),
      ]);

      setAvailableUsers(usersRes.data.users || []);
      setAvailableSupervisors(supervisorsRes.data.users || []);
      setAvailableRegions(regionsRes.data.regions || []);
    } catch (err) {
      console.error('Failed to load dropdown options:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchAgents();
    loadDropdownData();
  }, [fetchAgents, loadDropdownData]);

  const handleOpenCreate = () => {
    setFormData({
      user: availableUsers[0]?.id || availableUsers[0]?._id || '',
      employeeCode: '',
      region: availableRegions[0]?.id || availableRegions[0]?._id || '',
      supervisor: availableSupervisors[0]?.id || availableSupervisors[0]?._id || '',
      phone: '',
      isActive: true,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (agent: CollectionAgentItem) => {
    setSelectedAgent(agent);
    setFormData({
      user: typeof agent.user === 'object' ? agent.user?.id || agent.user?._id || '' : agent.user,
      employeeCode: agent.employeeCode,
      region: typeof agent.region === 'object' ? agent.region?.id || agent.region?._id || '' : agent.region,
      supervisor: typeof agent.supervisor === 'object' ? agent.supervisor?.id || agent.supervisor?._id || '' : agent.supervisor,
      phone: agent.phone || '',
      isActive: agent.isActive,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createAgentApi(token, formData);
      setSuccessMessage(`Collection Agent [${formData.employeeCode.toUpperCase()}] profile created successfully`);
      setIsCreateModalOpen(false);
      fetchAgents();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create collection agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedAgent) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const targetId = selectedAgent.id || selectedAgent._id || '';
      await updateAgentApi(token, targetId, {
        employeeCode: formData.employeeCode,
        region: formData.region,
        supervisor: formData.supervisor,
        phone: formData.phone,
        isActive: formData.isActive,
      });
      setSuccessMessage(`Agent profile [${formData.employeeCode}] updated successfully`);
      setIsEditModalOpen(false);
      fetchAgents();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update collection agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent: CollectionAgentItem) => {
    if (!token) return;
    const targetId = agent.id || agent._id || '';
    const newStatus = !agent.isActive;

    try {
      if (!newStatus) {
        await deleteAgentApi(token, targetId);
        setSuccessMessage(`Agent [${agent.employeeCode}] profile deactivated`);
      } else {
        await updateAgentApi(token, targetId, { isActive: true });
        setSuccessMessage(`Agent [${agent.employeeCode}] profile activated`);
      }
      fetchAgents();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update agent status');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
        <AdminNav />

        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
                <Briefcase className="w-6 h-6 text-amber-400" />
                Collection Agent Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Active Field Recovery Agents: <span className="text-white font-semibold">{totalAgents}</span>
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold transition shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Link New Agent Profile</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)}>
                <X className="w-3.5 h-3.5 text-rose-400 hover:text-rose-200" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)}>
                <X className="w-3.5 h-3.5 text-emerald-400 hover:text-emerald-200" />
              </button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by agent name, email, employee code..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Agents Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading collection agents...</span>
              </div>
            ) : agents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No collection agent profiles found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Emp Code</th>
                      <th className="py-3 px-4">Agent Identity</th>
                      <th className="py-3 px-4">Assigned Region</th>
                      <th className="py-3 px-4">Supervisor</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {agents.map((a) => {
                      const aId = a.id || a._id || '';
                      const userObj = a.user;
                      const regObj = a.region;
                      const supObj = a.supervisor;

                      return (
                        <tr key={aId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              {a.employeeCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white block">
                              {userObj ? userObj.name : 'Unknown User'}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {userObj ? userObj.email : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {regObj ? (
                              <span className="inline-flex items-center gap-1.5 text-slate-200">
                                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>{regObj.name} ({regObj.code})</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {supObj ? (
                              <span className="inline-flex items-center gap-1.5 text-slate-200">
                                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>{supObj.name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {a.phone || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            {a.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-rose-400 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEdit(a)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Edit Agent Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(a)}
                              className={`p-1.5 rounded-lg border transition ${
                                a.isActive
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={a.isActive ? 'Deactivate Agent Profile' : 'Activate Agent Profile'}
                            >
                              {a.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Page {page} of {totalPages}</span>
                <div className="space-x-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Modal: Create Agent */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Link New Collection Agent Profile</h2>
                <button onClick={() => setIsCreateModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Select User (AGENT Role)</label>
                  <select
                    required
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  >
                    {availableUsers.length === 0 ? (
                      <option value="">No AGENT users available</option>
                    ) : (
                      availableUsers.map((u) => {
                        const uId = u.id || u._id || '';
                        return (
                          <option key={uId} value={uId}>
                            {u.name} ({u.email})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Employee Code (Unique, e.g. AGT-1001)</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                    placeholder="AGT-1001"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-mono uppercase focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">Assigned Region</label>
                    <select
                      required
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    >
                      {availableRegions.length === 0 ? (
                        <option value="">No regions configured</option>
                      ) : (
                        availableRegions.map((r) => {
                          const rId = r.id || r._id || '';
                          return (
                            <option key={rId} value={rId}>
                              {r.name} ({r.code})
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">Assigned Supervisor</label>
                    <select
                      required
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    >
                      {availableSupervisors.length === 0 ? (
                        <option value="">No supervisors configured</option>
                      ) : (
                        availableSupervisors.map((s) => {
                          const sId = s.id || s._id || '';
                          return (
                            <option key={sId} value={sId}>
                              {s.name} ({s.email})
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Contact Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveAgent"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveAgent" className="text-slate-300">Active Profile</label>
                </div>

                <div className="pt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || availableUsers.length === 0 || availableRegions.length === 0 || availableSupervisors.length === 0}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold"
                  >
                    {isSubmitting ? 'Linking...' : 'Link Agent Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Agent */}
        {isEditModalOpen && selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Edit Agent Profile: {selectedAgent.employeeCode}</h2>
                <button onClick={() => setIsEditModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">Assigned Region</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    >
                      {availableRegions.map((r) => {
                        const rId = r.id || r._id || '';
                        return (
                          <option key={rId} value={rId}>
                            {r.name} ({r.code})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium block">Assigned Supervisor</label>
                    <select
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                    >
                      {availableSupervisors.map((s) => {
                        const sId = s.id || s._id || '';
                        return (
                          <option key={sId} value={sId}>
                            {s.name} ({s.email})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Contact Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveAgentEdit"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveAgentEdit" className="text-slate-300">Active Profile</label>
                </div>

                <div className="pt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
          CLRMS Master Data Portal &bull; Step 3 Master Data Management
        </footer>
      </div>
    </ProtectedRoute>
  );
}
