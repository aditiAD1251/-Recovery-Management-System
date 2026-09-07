import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  LegalCaseStatus,
  LegalPriority,
  LegalEscalationReason,
  LegalActionType,
  ILegalNotice,
  ICourtHearing,
  IWriteOffRecord,
  ILegalAuditEntry,
} from '../types/legal.js';

export interface ILegalCaseDocument extends Document {
  caseNumber: string;
  loanAccount: mongoose.Types.ObjectId;
  escalatedBy: mongoose.Types.ObjectId;
  assignedLegalOfficer?: mongoose.Types.ObjectId | null;
  reason: LegalEscalationReason;
  justification: string;
  caseType: LegalActionType;
  priority: LegalPriority;
  status: LegalCaseStatus;
  courtName?: string;
  courtCaseNumber?: string;
  advocateName?: string;
  advocatePhone?: string;
  advocateEmail?: string;
  filingDate?: Date | null;
  nextHearingDate?: Date | null;
  claimAmount: number;
  recoveredAmount: number;
  notices: ILegalNotice[];
  hearings: ICourtHearing[];
  writeOffDetails?: IWriteOffRecord | null;
  auditHistory: ILegalAuditEntry[];
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILegalCaseModel extends Model<ILegalCaseDocument> {}

const legalNoticeSchema = new Schema<ILegalNotice>(
  {
    noticeType: {
      type: String,
      enum: [
        'STATUTORY_DEMAND_NOTICE',
        'SECTION_138_NOTICE',
        'SARFAESI_13_2_NOTICE',
        'SARFAESI_13_4_NOTICE',
        'LOAN_RECALL_NOTICE',
        'FINAL_WARNING',
      ],
      required: true,
    },
    noticeDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
      default: '',
    },
    dispatchMode: {
      type: String,
      enum: ['SPEED_POST', 'REGISTERED_AD', 'EMAIL', 'HAND_DELIVERY', 'COURIER'],
      default: 'SPEED_POST',
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    responseDueDate: {
      type: Date,
      default: null,
    },
    responseStatus: {
      type: String,
      enum: [
        'AWAITING_RESPONSE',
        'NO_RESPONSE',
        'REPLY_RECEIVED',
        'SETTLEMENT_PROPOSED',
        'FULL_PAYMENT_MADE',
        'RETURNED_UNSERVED',
      ],
      default: 'AWAITING_RESPONSE',
    },
    responseDate: {
      type: Date,
      default: null,
    },
    borrowerResponseNotes: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true, timestamps: true }
);

const courtHearingSchema = new Schema<ICourtHearing>(
  {
    hearingDate: {
      type: Date,
      required: true,
    },
    stage: {
      type: String,
      required: true,
      trim: true,
    },
    courtName: {
      type: String,
      trim: true,
      default: '',
    },
    judgeBench: {
      type: String,
      trim: true,
      default: '',
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    outcome: {
      type: String,
      trim: true,
      default: '',
    },
    nextHearingDate: {
      type: Date,
      default: null,
    },
    loggedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: true, timestamps: true }
);

const writeOffRecordSchema = new Schema<IWriteOffRecord>(
  {
    writeOffAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    unrecoveredPrincipal: {
      type: Number,
      required: true,
      min: 0,
    },
    unrecoveredInterest: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedAt: {
      type: Date,
      default: Date.now,
    },
    writeOffReference: {
      type: String,
      trim: true,
      default: '',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const legalAuditSchema = new Schema<ILegalAuditEntry>(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: true,
      trim: true,
    },
    previousStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
  },
  { _id: true }
);

const legalCaseSchema = new Schema<ILegalCaseDocument, ILegalCaseModel>(
  {
    caseNumber: {
      type: String,
      required: [true, 'Case number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    loanAccount: {
      type: Schema.Types.ObjectId,
      ref: 'LoanAccount',
      required: [true, 'Loan account reference is required'],
      index: true,
    },
    escalatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Escalated by reference is required'],
      index: true,
    },
    assignedLegalOfficer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    reason: {
      type: String,
      enum: {
        values: [
          'REFUSAL_TO_PAY',
          'CHRONIC_DEFAULT_90_PLUS',
          'UNTRACEABLE_BORROWER',
          'FRAUD_SUSPECTED',
          'CHEQUE_BOUNCE_SEC_138',
          'COLLATERAL_DISPUTE',
          'EARLY_RISK_JUSTIFIED',
          'OTHER',
        ],
        message: '{VALUE} is not a valid legal escalation reason',
      },
      required: [true, 'Escalation reason is required'],
    },
    justification: {
      type: String,
      required: [true, 'Escalation justification is required'],
      trim: true,
      maxlength: [1500, 'Justification cannot exceed 1500 characters'],
    },
    caseType: {
      type: String,
      enum: {
        values: [
          'LEGAL_DEMAND_NOTICE',
          'SECTION_138_NI_ACT',
          'ARBITRATION',
          'SARFAESI_ACTION',
          'CIVIL_SUIT_DRT',
          'LOK_ADALAT',
          'ASSET_REPOSSESSION',
          'WRITE_OFF_RECOMMENDATION',
        ],
        message: '{VALUE} is not a valid legal action type',
      },
      required: [true, 'Legal action type is required'],
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: [
          'ESCALATED',
          'NOTICE_SENT',
          'IN_LITIGATION',
          'HEARING_SCHEDULED',
          'DECREE_PASSED',
          'SETTLED',
          'WRITTEN_OFF',
          'CLOSED',
        ],
        message: '{VALUE} is not a valid legal case status',
      },
      default: 'ESCALATED',
      index: true,
    },
    courtName: {
      type: String,
      trim: true,
      default: '',
    },
    courtCaseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    advocateName: {
      type: String,
      trim: true,
      default: '',
    },
    advocatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    advocateEmail: {
      type: String,
      trim: true,
      default: '',
    },
    filingDate: {
      type: Date,
      default: null,
    },
    nextHearingDate: {
      type: Date,
      default: null,
    },
    claimAmount: {
      type: Number,
      required: true,
      min: [0, 'Claim amount cannot be negative'],
    },
    recoveredAmount: {
      type: Number,
      default: 0,
      min: [0, 'Recovered amount cannot be negative'],
    },
    notices: {
      type: [legalNoticeSchema],
      default: [],
    },
    hearings: {
      type: [courtHearingSchema],
      default: [],
    },
    writeOffDetails: {
      type: writeOffRecordSchema,
      default: null,
    },
    auditHistory: {
      type: [legalAuditSchema],
      default: [],
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
legalCaseSchema.index({ loanAccount: 1, createdAt: -1 });
legalCaseSchema.index({ status: 1, priority: 1 });
legalCaseSchema.index({ nextHearingDate: 1 });

export const LegalCase = mongoose.model<ILegalCaseDocument, ILegalCaseModel>(
  'LegalCase',
  legalCaseSchema
);

export default LegalCase;
