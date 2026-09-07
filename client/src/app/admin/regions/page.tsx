'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AdminNav } from '../../../components/AdminNav';
import { RegionItem } from '../../../types';
import {
  getRegionsApi,
  createRegionApi,
  updateRegionApi,
  deleteRegionApi,
} from '../../../services/masterDataApi';
import {
  MapPin,
  Search,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

export default function AdminRegionsPage() {
  const { token } = useAuth();

  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRegions, setTotalRegions] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRegions = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await getRegionsApi(token, {
        page,
        limit: 10,
        search,
        isActive: statusFilter,
      });

      setRegions(res.data.regions || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRegions(res.data.pagination?.total || (res.data.regions ? res.data.regions.length : 0));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load regions');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      isActive: true,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (region: RegionItem) => {
    setSelectedRegion(region);
    setFormData({
      name: region.name,
      code: region.code,
      description: region.description || '',
      isActive: region.isActive,
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
      await createRegionApi(token, formData);
      setSuccessMessage(`Region '${formData.name}' [${formData.code.toUpperCase()}] created successfully`);
      setIsCreateModalOpen(false);
      fetchRegions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create region');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedRegion) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const targetId = selectedRegion.id || selectedRegion._id || '';
      await updateRegionApi(token, targetId, formData);
      setSuccessMessage(`Region '${formData.name}' updated successfully`);
      setIsEditModalOpen(false);
      fetchRegions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update region');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (region: RegionItem) => {
    if (!token) return;
    const targetId = region.id || region._id || '';
    const newStatus = !region.isActive;

    try {
      if (!newStatus) {
        await deleteRegionApi(token, targetId);
        setSuccessMessage(`Region '${region.name}' deactivated successfully`);
      } else {
        await updateRegionApi(token, targetId, { isActive: true });
        setSuccessMessage(`Region '${region.name}' activated successfully`);
      }
      fetchRegions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update region status');
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
                <MapPin className="w-6 h-6 text-blue-400" />
                Region Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Configured Recovery Regions: <span className="text-white font-semibold">{totalRegions}</span>
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition shadow-lg shadow-blue-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Region</span>
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
                placeholder="Search by region name or code..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Regions Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading regions...</span>
              </div>
            ) : regions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No regions found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Region Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {regions.map((r) => {
                      const rId = r.id || r._id || '';
                      return (
                        <tr key={rId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              {r.code}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {r.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                            {r.description || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            {r.isActive ? (
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
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Edit Region"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(r)}
                              className={`p-1.5 rounded-lg border transition ${
                                r.isActive
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={r.isActive ? 'Deactivate Region' : 'Activate Region'}
                            >
                              {r.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
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

        {/* Modal: Create Region */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Add New Region</h2>
                <button onClick={() => setIsCreateModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Region Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Pune, Mumbai Metro"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Region Code (Unique, e.g. PUN, MUM)</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PUN"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-mono uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the regional recovery boundary..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveRegion"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveRegion" className="text-slate-300">Active Region</label>
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
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Region'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Region */}
        {isEditModalOpen && selectedRegion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Edit Region: {selectedRegion.name}</h2>
                <button onClick={() => setIsEditModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Region Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Region Code</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveRegionEdit"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveRegionEdit" className="text-slate-300">Active Region</label>
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
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
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
