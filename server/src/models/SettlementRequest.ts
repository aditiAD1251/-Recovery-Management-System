import mongoose, { Schema, Document, Model } from 'mongoose';
import { SettlementStatus, ISettlementAuditEntry } from '../types/settlement.js';

export interface ISettlementRequestDocument extends Document {
  loanAccount: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  proposedAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  waivedAmount: number;
  waiverPercentage: number;
  reason: string;
  validUntil: Date;
  status: SettlementStatus;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewNotes?: string;
  reviewedAt?: Date | null;
  approvalAuthorityRole?: string;
  settledBy?: mongoose.Types.ObjectId | null;
  settledAt?: Date | null;
  paymentReference?: string;
  paymentMode?: string;
  paidAmount?: number;
  paymentReceiptNotes?: string;
  history: ISettlementAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettlementRequestModel extends Model<ISettlementRequestDocument> {}

const settlementAuditSchema = new Schema<ISettlementAuditEntry>(
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
    comments: {
      type: String,
      trim: true,
      default: '',
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

const settlementRequestSchema = new Schema<
  ISettlementRequestDocument,
  ISettlementRequestModel
>(
  {
    loanAccount: {
      type: Schema.Types.ObjectId,
      ref: 'LoanAccount',
      required: [true, 'Loan account reference is required'],
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester reference is required'],
      index: true,
    },
    proposedAmount: {
      type: Number,
      required: [true, 'Proposed settlement amount is required'],
      min: [1, 'Proposed amount must be greater than 0'],
    },
    totalOutstanding: {
      type: Number,
      required: [true, 'Total outstanding amount is required'],
      min: [0, 'Total outstanding cannot be negative'],
    },
    overdueAmount: {
      type: Number,
      required: [true, 'Overdue amount is required'],
      min: [0, 'Overdue amount cannot be negative'],
      default: 0,
    },
    waivedAmount: {
      type: Number,
      required: [true, 'Waived amount is required'],
      min: [0, 'Waived amount cannot be negative'],
      default: 0,
    },
    waiverPercentage: {
      type: Number,
      required: [true, 'Waiver percentage is required'],
      min: [0, 'Waiver percentage cannot be negative'],
      max: [100, 'Waiver percentage cannot exceed 100'],
      default: 0,
    },
    reason: {
      type: String,
      required: [true, 'Hardship / settlement reason is required'],
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    validUntil: {
      type: Date,
      required: [true, 'Valid until date is required'],
    },
    status: {
      type: String,
      enum: {
        values: [
          'PENDING_SUPERVISOR',
          'PENDING_LEGAL_HEAD',
          'PAYMENT_PENDING',
          'SETTLED',
          'REJECTED',
          'CANCELLED',
        ],
        message: '{VALUE} is not a valid settlement status',
      },
      default: 'PENDING_SUPERVISOR',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review notes cannot exceed 1000 characters'],
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvalAuthorityRole: {
      type: String,
      default: '',
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMode: {
      type: String,
      trim: true,
      default: '',
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    paymentReceiptNotes: {
      type: String,
      trim: true,
      default: '',
    },
    history: {
      type: [settlementAuditSchema],
      default: [],
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

// Compound index for querying settlement history for a loan
settlementRequestSchema.index({ loanAccount: 1, createdAt: -1 });
settlementRequestSchema.index({ status: 1, createdAt: -1 });

export const SettlementRequest = mongoose.model<
  ISettlementRequestDocument,
  ISettlementRequestModel
>('SettlementRequest', settlementRequestSchema);

export default SettlementRequest;
