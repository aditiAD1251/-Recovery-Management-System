import mongoose, { Schema, Document, Model } from 'mongoose';
import { ContactMode, AttemptOutcome } from '../types/collectionAttempt.js';

export interface ICollectionAttemptDocument extends Document {
  loanAccount: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  attemptedAt: Date;
  contactMode: ContactMode;
  outcome: AttemptOutcome;
  remarks: string;
  nextFollowUpDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICollectionAttemptModel extends Model<ICollectionAttemptDocument> {}

const collectionAttemptSchema = new Schema<ICollectionAttemptDocument, ICollectionAttemptModel>(
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
    attemptedAt: {
      type: Date,
      required: [true, 'Attempt date/time is required'],
      default: Date.now,
      index: true,
    },
    contactMode: {
      type: String,
      enum: {
        values: ['PHONE', 'SMS', 'WHATSAPP', 'EMAIL', 'FIELD_VISIT', 'OTHER'],
        message: '{VALUE} is not a valid contact mode',
      },
      required: [true, 'Contact mode is required'],
    },
    outcome: {
      type: String,
      enum: {
        values: [
          'CONTACTED',
          'PROMISE_TO_PAY',
          'CALLBACK_REQUESTED',
          'NOT_REACHABLE',
          'WRONG_NUMBER',
          'REFUSED_TO_PAY',
          'CUSTOMER_DECEASED',
          'ADDRESS_NOT_FOUND',
          'OTHER',
        ],
        message: '{VALUE} is not a valid attempt outcome',
      },
      required: [true, 'Attempt outcome is required'],
    },
    remarks: {
      type: String,
      required: [true, 'Remarks are required'],
      trim: true,
      maxlength: [1000, 'Remarks cannot exceed 1000 characters'],
    },
    nextFollowUpDate: {
      type: Date,
      default: null,
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

// Compound index for querying attempt history of a loan in chronological order
collectionAttemptSchema.index({ loanAccount: 1, attemptedAt: -1 });

export const CollectionAttempt = mongoose.model<
  ICollectionAttemptDocument,
  ICollectionAttemptModel
>('CollectionAttempt', collectionAttemptSchema);

export default CollectionAttempt;
