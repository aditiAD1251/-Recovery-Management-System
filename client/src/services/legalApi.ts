import {
  LegalCasesResponse,
  SingleLegalCaseResponse,
  CreateLegalCasePayload,
  UpdateLegalCasePayload,
  IssueLegalNoticePayload,
  RecordHearingPayload,
  ExecuteWriteOffPayload,
  NoticeResponseStatus,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getLegalCasesApi = async (
  token: string,
  params?: {
    loanAccount?: string;
    status?: string;
    priority?: string;
    caseType?: string;
    assignedLegalOfficer?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<LegalCasesResponse> => {
  const query = new URLSearchParams();
  if (params?.loanAccount) query.append('loanAccount', params.loanAccount);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.priority && params.priority !== 'ALL') query.append('priority', params.priority);
  if (params?.caseType && params.caseType !== 'ALL') query.append('caseType', params.caseType);
  if (params?.assignedLegalOfficer) query.append('assignedLegalOfficer', params.assignedLegalOfficer);
  if (params?.search) query.append('search', params.search);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`${API_BASE_URL}/legal?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch legal cases');
  return data;
};

export const getLegalCaseByIdApi = async (
  token: string,
  id: string
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch legal case details');
  return data;
};

export const createLegalCaseApi = async (
  token: string,
  payload: CreateLegalCasePayload
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to initiate legal case');
  return data;
};

export const updateLegalCaseApi = async (
  token: string,
  id: string,
  payload: UpdateLegalCasePayload
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update legal case');
  return data;
};

export const issueLegalNoticeApi = async (
  token: string,
  id: string,
  payload: IssueLegalNoticePayload
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal/${id}/notices`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to issue legal notice');
  return data;
};

export const updateLegalNoticeStatusApi = async (
  token: string,
  id: string,
  noticeId: string,
  payload: {
    responseStatus: NoticeResponseStatus;
    responseDate?: string;
    borrowerResponseNotes?: string;
  }
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal/${id}/notices/${noticeId}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update notice status');
  return data;
};

export const recordHearingApi = async (
  token: string,
  id: string,
  payload: RecordHearingPayload
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal/${id}/hearings`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to record court hearing');
  return data;
};

export const executeWriteOffApi = async (
  token: string,
  id: string,
  payload: ExecuteWriteOffPayload
): Promise<SingleLegalCaseResponse> => {
  const res = await fetch(`${API_BASE_URL}/legal/${id}/write-off`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to execute debt write-off');
  return data;
};
