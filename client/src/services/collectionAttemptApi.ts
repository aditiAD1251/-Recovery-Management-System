import {
  CollectionAttemptsResponse,
  SingleCollectionAttemptResponse,
  CreateCollectionAttemptPayload,
  UpdateCollectionAttemptPayload,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getCollectionAttemptsApi = async (
  token: string,
  params?: {
    loanAccount?: string;
    agent?: string;
    contactMode?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
): Promise<CollectionAttemptsResponse> => {
  const query = new URLSearchParams();
  if (params?.loanAccount) query.append('loanAccount', params.loanAccount);
  if (params?.agent) query.append('agent', params.agent);
  if (params?.contactMode) query.append('contactMode', params.contactMode);
  if (params?.outcome) query.append('outcome', params.outcome);
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE_URL}/collection-attempts?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch collection attempts');
  return data;
};

export const getCollectionAttemptByIdApi = async (
  token: string,
  id: string
): Promise<SingleCollectionAttemptResponse> => {
  const res = await fetch(`${API_BASE_URL}/collection-attempts/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch collection attempt details');
  return data;
};

export const createCollectionAttemptApi = async (
  token: string,
  payload: CreateCollectionAttemptPayload
): Promise<SingleCollectionAttemptResponse> => {
  const res = await fetch(`${API_BASE_URL}/collection-attempts`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to record collection attempt');
  return data;
};

export const updateCollectionAttemptApi = async (
  token: string,
  id: string,
  payload: UpdateCollectionAttemptPayload
): Promise<SingleCollectionAttemptResponse> => {
  const res = await fetch(`${API_BASE_URL}/collection-attempts/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update collection attempt');
  return data;
};
