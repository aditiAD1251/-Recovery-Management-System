export type PtpStatus = 'PENDING' | 'KEPT' | 'BROKEN' | 'CANCELLED';

export interface PromiseToPayItem {
  id: string;
  _id?: string;
  loanAccount: {
    id?: string;
    _id?: string;
    accountNumber: string;
    borrowerName: string;
    borrowerPhone?: string;
    overdueAmount?: number;
    dpd?: number;
    bucket?: string;
    assignedAgent?: string | any;
  } | string;
  agent: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    role?: string;
  } | string;
  promisedDate: string;
  promisedAmount: number;
  status: PtpStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromisesToPayResponse {
  success: boolean;
  message: string;
  data: {
    ptps: PromiseToPayItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface SinglePromiseToPayResponse {
  success: boolean;
  message: string;
  data: {
    ptp: PromiseToPayItem;
  };
}

export interface CreatePromiseToPayPayload {
  loanAccount: string;
  promisedDate: string;
  promisedAmount: number;
  remarks?: string;
}

export interface UpdatePromiseToPayPayload {
  status?: PtpStatus;
  remarks?: string;
  promisedDate?: string;
  promisedAmount?: number;
}
