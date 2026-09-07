import mongoose from 'mongoose';

export type ContactMode =
  | 'PHONE'
  | 'SMS'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'FIELD_VISIT'
  | 'OTHER';

export type AttemptOutcome =
  | 'CONTACTED'
  | 'PROMISE_TO_PAY'
  | 'CALLBACK_REQUESTED'
  | 'NOT_REACHABLE'
  | 'WRONG_NUMBER'
  | 'REFUSED_TO_PAY'
  | 'CUSTOMER_DECEASED'
  | 'ADDRESS_NOT_FOUND'
  | 'OTHER';

export interface ICollectionAttempt {
  id?: string;
  loanAccount: mongoose.Types.ObjectId | string;
  agent: mongoose.Types.ObjectId | string;
  attemptedAt: Date;
  contactMode: ContactMode;
  outcome: AttemptOutcome;
  remarks: string;
  nextFollowUpDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionAttemptPayload {
  loanAccount: string;
  contactMode: ContactMode;
  outcome: AttemptOutcome;
  remarks: string;
  attemptedAt?: string | Date;
  nextFollowUpDate?: string | Date | null;
}

export interface UpdateCollectionAttemptPayload {
  remarks?: string;
  outcome?: AttemptOutcome;
  nextFollowUpDate?: string | Date | null;
}
