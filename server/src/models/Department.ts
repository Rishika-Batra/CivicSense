import { Document, model, Schema, Types } from 'mongoose'
import { ComplaintCategory } from './Complaint.js'

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

/**
 * Maps a complaint category to a list of officer IDs that handle it.
 * Stored as a plain object (not a sub-document array) for O(1) lookup.
 */
export type CategoryMapping = Partial<Record<ComplaintCategory, Types.ObjectId[]>>

export interface IDepartment extends Document {
  name: string
  description?: string
  /**
   * Maps each complaint category to the officer(s) responsible in this dept.
   * e.g. { Pothole: [officerId1, officerId2], Garbage: [officerId3] }
   */
  categoryMappings: CategoryMapping
  /**
   * All officer user IDs that belong to this department.
   */
  officers: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CATEGORIES: ComplaintCategory[] = [
  'Pothole',
  'Garbage',
  'BrokenStreetlight',
  'Waterlogging',
  'FallenTree',
  'Other',
]

/**
 * Build a dynamic schema shape for categoryMappings so Mongoose stores it
 * correctly.  Each key is a category and each value is an array of ObjectIds.
 */
const categoryMappingsShape: Record<string, unknown> = {}
for (const cat of CATEGORIES) {
  categoryMappingsShape[cat] = {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  }
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categoryMappings: {
      type: categoryMappingsShape,
      default: {},
    },
    officers: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Unique index on department name (already declared via unique: true above,
// explicit definition here for clarity)
DepartmentSchema.index({ name: 1 }, { unique: true })

// Index on officers array so we can quickly find a department by officer ID
DepartmentSchema.index({ officers: 1 })

// ─── Export ───────────────────────────────────────────────────────────────────

const Department = model<IDepartment>('Department', DepartmentSchema)
export default Department
