import {
  WorkloadSummaryResponse,
  AgentWorkloadsResponse,
  UnassignedLoansResponse,
  SingleLoanResponse,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getWorkloadSummaryApi = async (
  token: string,
  region?: string
): Promise<WorkloadSummaryResponse> => {
  const query = new URLSearchParams();
  if (region) query.append('region', region);

  const res = await fetch(`${API_BASE_URL}/workload?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch workload summary');
  return data;
};

export const getAgentWorkloadsApi = async (
  token: string,
  params?: { region?: string; supervisor?: string; isActive?: string }
): Promise<AgentWorkloadsResponse> => {
  const query = new URLSearchParams();
  if (params?.region) query.append('region', params.region);
  if (params?.supervisor) query.append('supervisor', params.supervisor);
  if (params?.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const res = await fetch(`${API_BASE_URL}/workload/agents?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch agent workloads');
  return data;
};

export const getUnassignedLoansApi = async (
  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    bucket?: string;
    status?: string;
    loanType?: string;
    region?: string;
    minDpd?: number;
    maxDpd?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<UnassignedLoansResponse> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.bucket) query.append('bucket', params.bucket);
  if (params?.status) query.append('status', params.status);
  if (params?.loanType) query.append('loanType', params.loanType);
  if (params?.region) query.append('region', params.region);
  if (params?.minDpd !== undefined) query.append('minDpd', params.minDpd.toString());
  if (params?.maxDpd !== undefined) query.append('maxDpd', params.maxDpd.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE_URL}/workload/unassigned?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch unassigned loans queue');
  return data;
};

export const assignLoanApi = async (
  token: string,
  loanId: string,
  agentId: string,
  note?: string
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans/${loanId}/assign`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ agentId, note }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to assign loan account');
  return data;
};

export const reassignLoanApi = async (
  token: string,
  loanId: string,
  newAgentId: string,
  reason?: string
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans/${loanId}/reassign`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ newAgentId, reason }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to reassign loan account');
  return data;
};

export const unassignLoanApi = async (
  token: string,
  loanId: string
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans/${loanId}/unassign`, {
    method: 'PATCH',
    headers: getHeaders(token),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to unassign loan account');
  return data;
};
