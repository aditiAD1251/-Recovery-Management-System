import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICollectionAgentDocument extends Document {
  user: mongoose.Types.ObjectId;
  employeeCode: string;
  region: mongoose.Types.ObjectId;
  supervisor: mongoose.Types.ObjectId;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICollectionAgentModel extends Model<ICollectionAgentDocument> {}

const collectionAgentSchema = new Schema<ICollectionAgentDocument, ICollectionAgentModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    employeeCode: {
      type: String,
      required: [true, 'Employee code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, 'Employee code cannot exceed 30 characters'],
      index: true,
    },
    region: {
      type: Schema.Types.ObjectId,
      ref: 'Region',
      required: [true, 'Region reference is required'],
      index: true,
    },
    supervisor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supervisor reference is required'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
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

export const CollectionAgent = mongoose.model<
  ICollectionAgentDocument,
  ICollectionAgentModel
>('CollectionAgent', collectionAgentSchema);

export default CollectionAgent;
