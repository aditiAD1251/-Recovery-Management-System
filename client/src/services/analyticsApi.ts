import {
  AdminAnalyticsData,
  SupervisorAnalyticsData,
  AgentAnalyticsData,
  LegalAnalyticsData,
  ReportType,
  ReportQueryParams,
  ReportResultData,
  DateRangeQuery,
} from '../types/analytics';
import { ApiResponse } from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getAdminAnalyticsApi = async (
  token: string,
  params?: DateRangeQuery
): Promise<ApiResponse<AdminAnalyticsData>> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);

  const res = await fetch(`${API_BASE_URL}/analytics/admin?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch admin analytics');
  return data;
};

export const getSupervisorAnalyticsApi = async (
  token: string,
  params?: DateRangeQuery
): Promise<ApiResponse<SupervisorAnalyticsData>> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);

  const res = await fetch(
    `${API_BASE_URL}/analytics/supervisor?${query.toString()}`,
    {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch supervisor analytics');
  return data;
};

export const getAgentAnalyticsApi = async (
  token: string,
  params?: DateRangeQuery
): Promise<ApiResponse<AgentAnalyticsData>> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);

  const res = await fetch(`${API_BASE_URL}/analytics/agent?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch agent analytics');
  return data;
};

export const getLegalAnalyticsApi = async (
  token: string,
  params?: DateRangeQuery
): Promise<ApiResponse<LegalAnalyticsData>> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);

  const res = await fetch(`${API_BASE_URL}/analytics/legal?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch legal analytics');
  return data;
};

export const getReportDataApi = async (
  token: string,
  reportType: ReportType,
  params?: ReportQueryParams
): Promise<ApiResponse<ReportResultData>> => {
  const query = new URLSearchParams();
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.region) query.append('region', params.region);
  if (params?.agentId) query.append('agentId', params.agentId);
  if (params?.bucket && params.bucket !== 'ALL') query.append('bucket', params.bucket);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(
    `${API_BASE_URL}/analytics/reports/${reportType}?${query.toString()}`,
    {
      method: 'GET',
      headers: getHeaders(token),
      cache: 'no-store',
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to generate report');
  return data;
};

export const downloadReportCsvApi = async (
  token: string,
  reportType: ReportType,
  params?: ReportQueryParams
): Promise<void> => {
  const query = new URLSearchParams();
  query.append('format', 'csv');
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.region) query.append('region', params.region);
  if (params?.agentId) query.append('agentId', params.agentId);
  if (params?.bucket && params.bucket !== 'ALL') query.append('bucket', params.bucket);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);

  const res = await fetch(
    `${API_BASE_URL}/analytics/reports/${reportType}?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Failed to download report CSV');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
