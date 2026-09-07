import { IUser } from './user.js';
import { IRegion } from './region.js';

export interface ICollectionAgent {
  _id?: string;
  id?: string;
  user: string | IUser;
  employeeCode: string;
  region: string | IRegion;
  supervisor: string | IUser;
  phone?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateAgentDTO {
  user: string;
  employeeCode: string;
  region: string;
  supervisor: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateAgentDTO {
  region?: string;
  supervisor?: string;
  phone?: string;
  isActive?: boolean;
}
