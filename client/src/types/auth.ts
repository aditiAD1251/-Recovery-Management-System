export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'LEGAL_HEAD';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponseData {
  token: string;
  user: AuthUser;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: AuthResponseData;
  timestamp: string;
  error?: string;
}

export interface CurrentUserResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
  };
  timestamp: string;
  error?: string;
}
