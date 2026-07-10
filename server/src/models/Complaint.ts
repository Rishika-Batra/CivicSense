import { Document, model, Schema, Types } from 'mongoose'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ComplaintCategory =
  | 'Pothole'
  | 'Garbage'
  | 'BrokenStreetlight'
  | 'Waterlogging'
  | 'FallenTree'
  | 'Other'

export type ComplaintStatus = 'Pending' | 'InProgress' | 'Resolved'

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical'

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

export interface ILocation {
  latitude: number
  longitude: number
  address: string
}

export interface IRemark {
  text: string
  addedBy: Types.ObjectId
  addedAt: Date
}

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IComplaint extends Document {
  title: string
  description: string
  category: ComplaintCategory
  status: ComplaintStatus
  location: ILocation
  imageUrl?: string
  priority: ComplaintPriority
  userId: Types.ObjectId
  assignedOfficerId?: Types.ObjectId
  remarks: IRemark[]
  resolutionProofUrl?: string
  suggestedCategory?: ComplaintCategory
  aiConfidence?: number
  createdAt: Date
  updatedAt: Date
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const LocationSchema = new Schema<ILocation>(
  {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
  },
  { _id: false }
)

const RemarkSchema = new Schema<IRemark>(
  {
    text: {
      type: String,
      required: [true, 'Remark text is required'],
      trim: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }
)

// ─── Schema ───────────────────────────────────────────────────────────────────

const CATEGORIES: ComplaintCategory[] = [
  'Pothole',
  'Garbage',
  'BrokenStreetlight',
  'Waterlogging',
  'FallenTree',
  'Other',
]

const STATUSES: ComplaintStatus[] = ['Pending', 'InProgress', 'Resolved']

const PRIORITIES: ComplaintPriority[] = ['Low', 'Medium', 'High', 'Critical']

const ComplaintSchema = new Schema<IComplaint>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title must not exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'Pending',
    },
    location: {
      type: LocationSchema,
      required: [true, 'Location is required'],
    },
    imageUrl: {
      type: String,
      required: false,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'Medium',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    remarks: {
      type: [RemarkSchema],
      default: [],
    },
    resolutionProofUrl: {
      type: String,
      required: false,
    },
    suggestedCategory: {
      type: String,
      enum: CATEGORIES,
      required: false,
    },
    aiConfidence: {
      type: Number,
      default: 0.0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Single-field indexes for common filter queries
ComplaintSchema.index({ status: 1 })
ComplaintSchema.index({ category: 1 })
ComplaintSchema.index({ priority: 1 })
ComplaintSchema.index({ userId: 1 })
ComplaintSchema.index({ assignedOfficerId: 1 })

// Compound index for dashboard queries (list all complaints by status + category)
ComplaintSchema.index({ status: 1, category: 1 })

// Compound index for officer workload queries
ComplaintSchema.index({ assignedOfficerId: 1, status: 1 })

// Text index for free-text search on title and description
ComplaintSchema.index({ title: 'text', description: 'text' })

// Geospatial index on location (using 2dsphere for lat/lon)
// Enabled for future proximity-based queries
ComplaintSchema.index({ 'location.latitude': 1, 'location.longitude': 1 })

// ─── Export ───────────────────────────────────────────────────────────────────

const Complaint = model<IComplaint>('Complaint', ComplaintSchema)
export default Complaint
