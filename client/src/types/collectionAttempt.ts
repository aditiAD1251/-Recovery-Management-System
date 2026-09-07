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

export interface CollectionAttemptItem {
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
  attemptedAt: string;
  contactMode: ContactMode;
  outcome: AttemptOutcome;
  remarks: string;
  nextFollowUpDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionAttemptsResponse {
  success: boolean;
  message: string;
  data: {
    attempts: CollectionAttemptItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface SingleCollectionAttemptResponse {
  success: boolean;
  message: string;
  data: {
    attempt: CollectionAttemptItem;
  };
}

export interface CreateCollectionAttemptPayload {
  loanAccount: string;
  contactMode: ContactMode;
  outcome: AttemptOutcome;
  remarks: string;
  attemptedAt?: string;
  nextFollowUpDate?: string | null;
}

export interface UpdateCollectionAttemptPayload {
  remarks?: string;
  outcome?: AttemptOutcome;
  nextFollowUpDate?: string | null;
}
