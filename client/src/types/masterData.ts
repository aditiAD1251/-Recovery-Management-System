import { UserRole } from './auth';

export interface UserItem {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegionItem {
  id: string;
  _id?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionAgentItem {
  id: string;
  _id?: string;
  employeeCode: string;
  user: UserItem;
  region: RegionItem;
  supervisor: UserItem;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsersResponse {
  success: boolean;
  message: string;
  data: {
    users: UserItem[];
    pagination: PaginationMeta;
  };
}

export interface RegionsResponse {
  success: boolean;
  message: string;
  data: {
    regions: RegionItem[];
    pagination?: PaginationMeta;
    total?: number;
  };
}

export interface AgentsResponse {
  success: boolean;
  message: string;
  data: {
    agents: CollectionAgentItem[];
    pagination: PaginationMeta;
  };
}
