import { Schema, model, Document } from 'mongoose';

export interface IAuditLogDocument extends Document {
  action: string;
  entityType: 'event' | 'patch' | 'shop' | 'issue' | 'system' | 'auth' | 'server';
  entityId?: string;
  performedBy: string;
  userRole: string;
  details: string;
  diffPayload?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    action: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ['event', 'patch', 'shop', 'issue', 'system', 'auth', 'server'],
      required: true,
    },
    entityId: {
      type: String,
    },
    performedBy: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    diffPayload: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1, entityType: 1 });

export const AuditLog = model<IAuditLogDocument>('AuditLog', auditLogSchema);
