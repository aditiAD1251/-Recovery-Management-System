export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT' | 'LEGAL_HEAD';

export const USER_ROLES: { [key in UserRole]: UserRole } = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  AGENT: 'AGENT',
  LEGAL_HEAD: 'LEGAL_HEAD',
};

export interface IUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
