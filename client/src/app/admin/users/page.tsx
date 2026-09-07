'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { AdminNav } from '../../../components/AdminNav';
import { UserItem, UserRole } from '../../../types';
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
} from '../../../services/masterDataApi';
import {
  Users,
  Search,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  X,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT' as UserRole,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await getUsersApi(token, {
        page,
        limit: 10,
        search,
        role: roleFilter,
        isActive: statusFilter,
      });

      setUsers(res.data.users || []);
      setTotalPages(res.data.pagination.totalPages || 1);
      setTotalUsers(res.data.pagination.total || 0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'AGENT',
      isActive: true,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
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
      await createUserApi(token, formData);
      setSuccessMessage(`User '${formData.name}' created successfully`);
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const updatePayload: any = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      isActive: formData.isActive,
    };

    if (formData.password.trim()) {
      updatePayload.password = formData.password.trim();
    }

    try {
      const targetId = selectedUser.id || selectedUser._id || '';
      await updateUserApi(token, targetId, updatePayload);
      setSuccessMessage(`User '${formData.name}' updated successfully`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (!token) return;
    const targetId = user.id || user._id || '';
    const newStatus = !user.isActive;

    try {
      if (!newStatus) {
        await deleteUserApi(token, targetId);
        setSuccessMessage(`User '${user.name}' deactivated successfully`);
      } else {
        await updateUserApi(token, targetId, { isActive: true });
        setSuccessMessage(`User '${user.name}' activated successfully`);
      }
      fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user status');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SUPERVISOR':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'AGENT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'LEGAL_HEAD':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
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
                <Users className="w-6 h-6 text-emerald-400" />
                User Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Total System Users: <span className="text-white font-semibold">{totalUsers}</span>
              </p>
            </div>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition shadow-lg shadow-emerald-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User</span>
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
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="AGENT">AGENT</option>
                <option value="LEGAL_HEAD">LEGAL_HEAD</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading system users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No users found matching current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                      const uId = u.id || u._id || '';
                      return (
                        <tr key={uId} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white block">{u.name}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{u.email}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.isActive ? (
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
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg border transition ${
                                u.isActive
                                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={u.isActive ? 'Deactivate User' : 'Activate User'}
                            >
                              {u.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
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

        {/* Modal: Create User */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Add New User</h2>
                <button onClick={() => setIsCreateModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@clrms.local"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Password (min. 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="AGENT">AGENT</option>
                    <option value="LEGAL_HEAD">LEGAL_HEAD</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCreate"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveCreate" className="text-slate-300">Active Account</label>
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
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold"
                  >
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit User */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white">Edit User: {selectedUser.name}</h2>
                <button onClick={() => setIsEditModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="AGENT">AGENT</option>
                    <option value="LEGAL_HEAD">LEGAL_HEAD</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium block">Reset Password (leave empty to keep unchanged)</label>
                  <input
                    type="password"
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveEdit"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="isActiveEdit" className="text-slate-300">Active Account</label>
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
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold"
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
