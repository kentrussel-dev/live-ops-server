import { Schema, model, Document } from 'mongoose';
import { IKanbanColumn } from '../../shared/types';

export interface IProjectDocument extends Document {
  name: string;
  key: string;
  description?: string;
  columns: IKanbanColumn[];
  categories: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const kanbanColumnSchema = new Schema<IKanbanColumn>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    order: { type: Number, required: true },
    color: { type: String },
  },
  { _id: false }
);

const projectSchema = new Schema<IProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
    },
    columns: {
      type: [kanbanColumnSchema],
      default: [
        { id: 'todo', name: 'Todo', order: 0, color: 'text-amber-400' },
        { id: 'doing', name: 'Doing', order: 1, color: 'text-blue-400' },
        { id: 'develop', name: 'Develop', order: 2, color: 'text-indigo-400' },
        { id: 'testing', name: 'Testing', order: 3, color: 'text-purple-400' },
        { id: 'done', name: 'Done', order: 4, color: 'text-emerald-400' },
      ],
    },
    categories: {
      type: [String],
      default: ['Feature', 'Bug', 'Task', 'Quest', 'Improvement'],
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Project = model<IProjectDocument>('Project', projectSchema);
