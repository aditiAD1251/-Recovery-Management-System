import {
  UsersResponse,
  RegionsResponse,
  AgentsResponse,
  UserItem,
  RegionItem,
  CollectionAgentItem,
} from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ==========================================
// USER MANAGEMENT APIS
// ==========================================

export const getUsersApi = async (
  token: string,
  params?: { page?: number; limit?: number; search?: string; role?: string; isActive?: string }
): Promise<UsersResponse> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  if (params?.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const res = await fetch(`${API_BASE_URL}/users?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
  return data;
};

export const createUserApi = async (
  token: string,
  userData: { name: string; email: string; password: string; role: string; isActive?: boolean }
): Promise<{ success: boolean; message: string; data: { user: UserItem } }> => {
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(userData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create user');
  return data;
};

export const updateUserApi = async (
  token: string,
  id: string,
  userData: { name?: string; email?: string; role?: string; isActive?: boolean; password?: string }
): Promise<{ success: boolean; message: string; data: { user: UserItem } }> => {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(userData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update user');
  return data;
};

export const deleteUserApi = async (
  token: string,
  id: string
): Promise<{ success: boolean; message: string; data: { user: UserItem } }> => {
  const res = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deactivate user');
  return data;
};

// ==========================================
// REGION MANAGEMENT APIS
// ==========================================

export const getRegionsApi = async (
  token: string,
  params?: { page?: number; limit?: number; search?: string; isActive?: string; all?: boolean }
): Promise<RegionsResponse> => {
  const query = new URLSearchParams();
  if (params?.all) query.append('all', 'true');
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const res = await fetch(`${API_BASE_URL}/regions?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch regions');
  return data;
};

export const createRegionApi = async (
  token: string,
  regionData: { name: string; code: string; description?: string; isActive?: boolean }
): Promise<{ success: boolean; message: string; data: { region: RegionItem } }> => {
  const res = await fetch(`${API_BASE_URL}/regions`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(regionData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create region');
  return data;
};

export const updateRegionApi = async (
  token: string,
  id: string,
  regionData: { name?: string; code?: string; description?: string; isActive?: boolean }
): Promise<{ success: boolean; message: string; data: { region: RegionItem } }> => {
  const res = await fetch(`${API_BASE_URL}/regions/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(regionData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update region');
  return data;
};

export const deleteRegionApi = async (
  token: string,
  id: string
): Promise<{ success: boolean; message: string; data: { region: RegionItem } }> => {
  const res = await fetch(`${API_BASE_URL}/regions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deactivate region');
  return data;
};

// ==========================================
// COLLECTION AGENT APIS
// ==========================================

export const getAgentsApi = async (
  token: string,
  params?: { page?: number; limit?: number; search?: string; region?: string; supervisor?: string; isActive?: string }
): Promise<AgentsResponse> => {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.region) query.append('region', params.region);
  if (params?.supervisor) query.append('supervisor', params.supervisor);
  if (params?.isActive !== undefined && params.isActive !== '') query.append('isActive', params.isActive);

  const res = await fetch(`${API_BASE_URL}/agents?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(token),
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch collection agents');
  return data;
};

export const createAgentApi = async (
  token: string,
  agentData: { user: string; employeeCode: string; region: string; supervisor: string; phone?: string; isActive?: boolean }
): Promise<{ success: boolean; message: string; data: { agent: CollectionAgentItem } }> => {
  const res = await fetch(`${API_BASE_URL}/agents`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(agentData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create collection agent');
  return data;
};

export const updateAgentApi = async (
  token: string,
  id: string,
  agentData: { employeeCode?: string; region?: string; supervisor?: string; phone?: string; isActive?: boolean }
): Promise<{ success: boolean; message: string; data: { agent: CollectionAgentItem } }> => {
  const res = await fetch(`${API_BASE_URL}/agents/${id}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(agentData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update collection agent');
  return data;
};

export const deleteAgentApi = async (
  token: string,
  id: string
): Promise<{ success: boolean; message: string; data: { agent: CollectionAgentItem } }> => {
  const res = await fetch(`${API_BASE_URL}/agents/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to deactivate collection agent');
  return data;
};
