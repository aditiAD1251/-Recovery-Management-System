import {
  PromisesToPayResponse,
  SinglePromiseToPayResponse,
  CreatePromiseToPayPayload,
  UpdatePromiseToPayPayload,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getPromisesToPayApi = async (
  token: string,
  params?: {
    loanAccount?: string;
    agent?: string;
    status?: string;
    page?: number;
    limit?: number;
  }
): Promise<PromisesToPayResponse> => {
  const query = new URLSearchParams();
  if (params?.loanAccount) query.append('loanAccount', params.loanAccount);
  if (params?.agent) query.append('agent', params.agent);
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE_URL}/promises-to-pay?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch Promise-to-Pay records');
  return data;
};

export const getPromiseToPayByIdApi = async (
  token: string,
  id: string
): Promise<SinglePromiseToPayResponse> => {
  const res = await fetch(`${API_BASE_URL}/promises-to-pay/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch Promise-to-Pay details');
  return data;
};

export const createPromiseToPayApi = async (
  token: string,
  payload: CreatePromiseToPayPayload
): Promise<SinglePromiseToPayResponse> => {
  const res = await fetch(`${API_BASE_URL}/promises-to-pay`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create Promise-to-Pay record');
  return data;
};

export const updatePromiseToPayApi = async (
  token: string,
  id: string,
  payload: UpdatePromiseToPayPayload
): Promise<SinglePromiseToPayResponse> => {
  const res = await fetch(`${API_BASE_URL}/promises-to-pay/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update Promise-to-Pay record');
  return data;
};
