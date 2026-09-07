import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegionDocument extends Document {
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegionModel extends Model<IRegionDocument> {}

const regionSchema = new Schema<IRegionDocument, IRegionModel>(
  {
    name: {
      type: String,
      required: [true, 'Region name is required'],
      trim: true,
      maxlength: [100, 'Region name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Region code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Region code cannot exceed 20 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
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

export const Region = mongoose.model<IRegionDocument, IRegionModel>('Region', regionSchema);
export default Region;
