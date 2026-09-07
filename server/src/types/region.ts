export interface IRegion {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRegionDTO {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRegionDTO {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}
