import mongoose, { Schema, Document, Model } from 'mongoose';
import { DelinquencyBucket, LoanType, LoanStatus } from '../types/loan.js';
import { computeLoanDelinquency } from '../services/dpdService.js';

export interface ILoanAccountDocument extends Document {
  accountNumber: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  borrowerAddress?: string;
  loanType: LoanType;
  principalAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalOutstanding: number;
  overdueAmount: number;
  missedEmisCount: number;
  lastPaymentDate?: Date | null;
  nextDueDate: Date;
  firstMissedDueDate?: Date | null;
  dpd: number;
  bucket: DelinquencyBucket;
  region: mongoose.Types.ObjectId;
  status: LoanStatus;
  assignedAgent?: mongoose.Types.ObjectId | null;
  assignedSupervisor?: mongoose.Types.ObjectId | null;
  assignedAt?: Date | null;
  assignedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoanAccountModel extends Model<ILoanAccountDocument> {}

const loanAccountSchema = new Schema<ILoanAccountDocument, ILoanAccountModel>(
  {
    accountNumber: {
      type: String,
      required: [true, 'Loan account number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [50, 'Account number cannot exceed 50 characters'],
      index: true,
    },
    borrowerName: {
      type: String,
      required: [true, 'Borrower name is required'],
      trim: true,
      maxlength: [100, 'Borrower name cannot exceed 100 characters'],
    },
    borrowerEmail: {
      type: String,
      required: [true, 'Borrower email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    borrowerPhone: {
      type: String,
      required: [true, 'Borrower phone number is required'],
      trim: true,
    },
    borrowerAddress: {
      type: String,
      trim: true,
      default: '',
    },
    loanType: {
      type: String,
      enum: {
        values: ['PERSONAL', 'HOME', 'AUTO', 'BUSINESS', 'CREDIT_CARD'],
        message: '{VALUE} is not a valid loan type',
      },
      default: 'PERSONAL',
      index: true,
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [0, 'Principal amount cannot be negative'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate cannot be negative'],
    },
    tenureMonths: {
      type: Number,
      required: [true, 'Tenure in months is required'],
      min: [1, 'Tenure must be at least 1 month'],
    },
    emiAmount: {
      type: Number,
      required: [true, 'EMI amount is required'],
      min: [0, 'EMI amount cannot be negative'],
    },
    totalOutstanding: {
      type: Number,
      required: [true, 'Total outstanding is required'],
      min: [0, 'Total outstanding cannot be negative'],
    },
    overdueAmount: {
      type: Number,
      required: [true, 'Overdue amount is required'],
      min: [0, 'Overdue amount cannot be negative'],
      default: 0,
    },
    missedEmisCount: {
      type: Number,
      required: [true, 'Missed EMIs count is required'],
      min: [0, 'Missed EMIs cannot be negative'],
      default: 0,
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    nextDueDate: {
      type: Date,
      required: [true, 'Next due date is required'],
    },
    firstMissedDueDate: {
      type: Date,
      default: null,
    },
    dpd: {
      type: Number,
      default: 0,
      min: [0, 'DPD cannot be negative'],
      index: true,
    },
    bucket: {
      type: String,
      enum: ['0-30', '31-60', '61-90', '90+'],
      default: '0-30',
      index: true,
    },
    region: {
      type: Schema.Types.ObjectId,
      ref: 'Region',
      required: [true, 'Region reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['CURRENT', 'DELINQUENT', 'DEFAULT', 'SETTLED', 'CLOSED', 'WRITTEN_OFF'],
      default: 'CURRENT',
      index: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'CollectionAgent',
      default: null,
      index: true,
    },
    assignedSupervisor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
      index: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
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

// Pre-save hook: compute DPD and delinquency bucket
loanAccountSchema.pre('save', function (next) {
  const delinquency = computeLoanDelinquency({
    overdueAmount: this.overdueAmount,
    firstMissedDueDate: this.firstMissedDueDate,
    status: this.status,
  });

  this.dpd = delinquency.dpd;
  this.bucket = delinquency.bucket;
  this.status = delinquency.status;

  next();
});

export const LoanAccount = mongoose.model<
  ILoanAccountDocument,
  ILoanAccountModel
>('LoanAccount', loanAccountSchema);

export default LoanAccount;
