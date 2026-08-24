import { Schema, model, Document } from 'mongoose';
import { PatchStatus, IPatchSection, IPatchDiffHistory } from '../../shared/types';

export interface IPatchNoteDocument extends Document {
  version: string;
  clientBuildNumber: string;
  serverBuildNumber: string;
  title: string;
  summary: string;
  status: PatchStatus;
  targetPublishTime: Date;
  publishedAt?: Date;
  requiresMaintenance: boolean;
  maintenanceDurationMinutes?: number;
  sections: IPatchSection[];
  diffHistory: IPatchDiffHistory[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

const patchSectionSchema = new Schema<IPatchSection>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['features', 'balance', 'bug_fixes', 'known_issues', 'infrastructure'],
      required: true,
    },
    items: [{ type: String, required: true }],
  },
  { _id: false }
);

const patchDiffHistorySchema = new Schema<IPatchDiffHistory>(
  {
    version: { type: String, required: true },
    author: { type: String, required: true },
    timestamp: { type: String, required: true },
    summary: { type: String, required: true },
    snapshotData: { type: String, required: true },
  },
  { _id: false }
);

const patchNoteSchema = new Schema<IPatchNoteDocument>(
  {
    version: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    clientBuildNumber: {
      type: String,
      required: true,
      trim: true,
    },
    serverBuildNumber: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'approved', 'published', 'archived'],
      default: 'draft',
      required: true,
    },
    targetPublishTime: {
      type: Date,
      required: true,
    },
    publishedAt: {
      type: Date,
    },
    requiresMaintenance: {
      type: Boolean,
      default: false,
    },
    maintenanceDurationMinutes: {
      type: Number,
      default: 0,
    },
    sections: [patchSectionSchema],
    diffHistory: [patchDiffHistorySchema],
    author: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

patchNoteSchema.index({ status: 1, targetPublishTime: -1 });

export const PatchNote = model<IPatchNoteDocument>('PatchNote', patchNoteSchema);
