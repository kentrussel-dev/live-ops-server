import { Schema, model, Document } from 'mongoose';
import { IssueCategory, IssueSeverity, IssueStatus, ServerCluster, IIssueInternalNote } from '../../shared/types';

export interface IIssueTicketDocument extends Document {
  ticketKey: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  affectedEventId?: string;
  affectedVersion?: string;
  affectedCluster?: ServerCluster;
  reproductionSteps: string[];
  assignedTo?: string;
  reportedBy: string;
  internalNotes: IIssueInternalNote[];
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const issueInternalNoteSchema = new Schema<IIssueInternalNote>(
  {
    author: { type: String, required: true },
    authorRole: { type: String, required: true },
    note: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: true }
);

const issueTicketSchema = new Schema<IIssueTicketDocument>(
  {
    ticketKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['quest', 'loot_table', 'combat_balance', 'client_crash', 'shop_billing', 'server_lag', 'ui_glitch'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical_blocker', 'major', 'moderate', 'minor'],
      default: 'moderate',
      required: true,
    },
    status: {
      type: String,
      enum: ['reported', 'investigating', 'fixed', 'verified', 'closed'],
      default: 'reported',
      required: true,
    },
    affectedEventId: {
      type: String,
    },
    affectedVersion: {
      type: String,
    },
    affectedCluster: {
      type: String,
      enum: ['NA-East', 'EU-Central', 'APAC-East', 'Global', 'Staging-Internal'],
    },
    reproductionSteps: [{ type: String }],
    assignedTo: {
      type: String,
    },
    reportedBy: {
      type: String,
      required: true,
    },
    internalNotes: [issueInternalNoteSchema],
    resolutionNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

issueTicketSchema.index({ status: 1, severity: 1 });

export const IssueTicket = model<IIssueTicketDocument>('IssueTicket', issueTicketSchema);
