import {
  LoansResponse,
  LoanSummaryResponse,
  SingleLoanResponse,
  CreateLoanPayload,
  UpdateLoanPayload,
  AgentAssignedLoansResponse,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getMyAssignedLoansApi = async (
  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    bucket?: string;
    status?: string;
    loanType?: string;
    minOverdue?: number;
    maxOverdue?: number;
    minDpd?: number;
    maxDpd?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<AgentAssignedLoansResponse> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.bucket) query.append('bucket', params.bucket);
  if (params?.status) query.append('status', params.status);
  if (params?.loanType) query.append('loanType', params.loanType);
  if (params?.minOverdue !== undefined) query.append('minOverdue', params.minOverdue.toString());
  if (params?.maxOverdue !== undefined) query.append('maxOverdue', params.maxOverdue.toString());
  if (params?.minDpd !== undefined) query.append('minDpd', params.minDpd.toString());
  if (params?.maxDpd !== undefined) query.append('maxDpd', params.maxDpd.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE_URL}/loans/my-assigned?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch assigned loans');
  return data;
};

export const getLoansApi = async (

  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    bucket?: string;
    status?: string;
    loanType?: string;
    region?: string;
    minOverdue?: number;
    maxOverdue?: number;
    minDpd?: number;
    maxDpd?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<LoansResponse> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.bucket) query.append('bucket', params.bucket);
  if (params?.status) query.append('status', params.status);
  if (params?.loanType) query.append('loanType', params.loanType);
  if (params?.region) query.append('region', params.region);
  if (params?.minOverdue !== undefined) query.append('minOverdue', params.minOverdue.toString());
  if (params?.maxOverdue !== undefined) query.append('maxOverdue', params.maxOverdue.toString());
  if (params?.minDpd !== undefined) query.append('minDpd', params.minDpd.toString());
  if (params?.maxDpd !== undefined) query.append('maxDpd', params.maxDpd.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE_URL}/loans?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch loan accounts');
  return data;
};

export const getLoanSummaryApi = async (
  token: string,
  region?: string
): Promise<LoanSummaryResponse> => {
  const query = new URLSearchParams();
  if (region) query.append('region', region);

  const res = await fetch(`${API_BASE_URL}/loans/summary?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch loan summary');
  return data;
};

export const getLoanByIdApi = async (
  token: string,
  id: string
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch loan details');
  return data;
};

export const createLoanApi = async (
  token: string,
  payload: CreateLoanPayload
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create loan account');
  return data;
};

export const updateLoanApi = async (
  token: string,
  id: string,
  payload: UpdateLoanPayload
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update loan account');
  return data;
};

export const recalculateDpdApi = async (
  token: string
): Promise<{ success: boolean; message: string; data: { matchedCount: number; modifiedCount: number } }> => {
  const res = await fetch(`${API_BASE_URL}/loans/recalculate-dpd`, {
    method: 'POST',
    headers: getHeaders(token),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to recalculate DPD');
  return data;
};

export const deleteLoanApi = async (
  token: string,
  id: string
): Promise<SingleLoanResponse> => {
  const res = await fetch(`${API_BASE_URL}/loans/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete loan account');
  return data;
};
