import mongoose from 'mongoose';

export type PtpStatus = 'PENDING' | 'KEPT' | 'BROKEN' | 'CANCELLED';

export interface IPromiseToPay {
  id?: string;
  loanAccount: mongoose.Types.ObjectId | string;
  agent: mongoose.Types.ObjectId | string;
  promisedDate: Date;
  promisedAmount: number;
  status: PtpStatus;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromiseToPayPayload {
  loanAccount: string;
  promisedDate: string | Date;
  promisedAmount: number;
  remarks?: string;
}

export interface UpdatePromiseToPayPayload {
  status?: PtpStatus;
  remarks?: string;
  promisedDate?: string | Date;
  promisedAmount?: number;
}
