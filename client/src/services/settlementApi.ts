import {
  SettlementsResponse,
  SingleSettlementResponse,
  CreateSettlementPayload,
  ReviewSettlementPayload,
  CompleteSettlementPayload,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getSettlementsApi = async (
  token: string,
  params?: {
    loanAccount?: string;
    status?: string;
    requestedBy?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<SettlementsResponse> => {
  const query = new URLSearchParams();
  if (params?.loanAccount) query.append('loanAccount', params.loanAccount);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.requestedBy) query.append('requestedBy', params.requestedBy);
  if (params?.search) query.append('search', params.search);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE_URL}/settlements?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch settlement requests');
  return data;
};

export const getSettlementByIdApi = async (
  token: string,
  id: string
): Promise<SingleSettlementResponse> => {
  const res = await fetch(`${API_BASE_URL}/settlements/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch settlement details');
  return data;
};

export const createSettlementApi = async (
  token: string,
  payload: CreateSettlementPayload
): Promise<SingleSettlementResponse> => {
  const res = await fetch(`${API_BASE_URL}/settlements`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create settlement proposal');
  return data;
};

export const reviewSettlementApi = async (
  token: string,
  id: string,
  payload: ReviewSettlementPayload
): Promise<SingleSettlementResponse> => {
  const res = await fetch(`${API_BASE_URL}/settlements/${id}/review`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to review settlement proposal');
  return data;
};

export const completeSettlementApi = async (
  token: string,
  id: string,
  payload: CompleteSettlementPayload
): Promise<SingleSettlementResponse> => {
  const res = await fetch(`${API_BASE_URL}/settlements/${id}/complete`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to confirm settlement payment');
  return data;
};

export const cancelSettlementApi = async (
  token: string,
  id: string,
  reason?: string
): Promise<SingleSettlementResponse> => {
  const res = await fetch(`${API_BASE_URL}/settlements/${id}/cancel`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to cancel settlement proposal');
  return data;
};
