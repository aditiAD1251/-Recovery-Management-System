import mongoose, { Schema, Document, Model } from 'mongoose';
import { PtpStatus } from '../types/promiseToPay.js';

export interface IPromiseToPayDocument extends Document {
  loanAccount: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  promisedDate: Date;
  promisedAmount: number;
  status: PtpStatus;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPromiseToPayModel extends Model<IPromiseToPayDocument> {}

const promiseToPaySchema = new Schema<IPromiseToPayDocument, IPromiseToPayModel>(
  {
    loanAccount: {
      type: Schema.Types.ObjectId,
      ref: 'LoanAccount',
      required: [true, 'Loan account reference is required'],
      index: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent reference is required'],
      index: true,
    },
    promisedDate: {
      type: Date,
      required: [true, 'Promised date is required'],
      index: true,
    },
    promisedAmount: {
      type: Number,
      required: [true, 'Promised amount is required'],
      min: [1, 'Promised amount must be greater than 0'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'KEPT', 'BROKEN', 'CANCELLED'],
        message: '{VALUE} is not a valid PTP status',
      },
      default: 'PENDING',
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [1000, 'Remarks cannot exceed 1000 characters'],
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

// Compound index for querying PTPs of a loan in chronological order
promiseToPaySchema.index({ loanAccount: 1, createdAt: -1 });

export const PromiseToPay = mongoose.model<
  IPromiseToPayDocument,
  IPromiseToPayModel
>('PromiseToPay', promiseToPaySchema);

export default PromiseToPay;
