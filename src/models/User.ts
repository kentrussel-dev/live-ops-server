import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../shared/types';

export interface IUserDocument extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  department: string;
  position?: string;
  departmentDescription?: string;
  bio?: string;
  statusMessage?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'liveops_editor', 'readonly_viewer'],
      default: 'readonly_viewer',
      required: true,
    },
    department: {
      type: String,
      default: 'Live Operations',
    },
    position: {
      type: String,
      default: 'Live-Ops Specialist',
    },
    departmentDescription: {
      type: String,
      default: 'Live operations, incident mitigation, and game service infrastructure management.',
    },
    bio: {
      type: String,
      default: 'Studio operations engineer managing live-service game infrastructure and content releases.',
    },
    statusMessage: {
      type: String,
      default: 'On Duty • Operational',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = model<IUserDocument>('User', userSchema);
