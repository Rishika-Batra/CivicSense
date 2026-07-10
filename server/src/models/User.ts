import { Document, model, Schema, Types } from 'mongoose'

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export type UserRole = 'citizen' | 'officer' | 'admin'

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: UserRole
  department?: Types.ObjectId
  createdAt: Date
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Email format is invalid'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'] as UserRole[],
      default: 'citizen',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    versionKey: false,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

UserSchema.index({ email: 1 }, { unique: true })
UserSchema.index({ role: 1 })
UserSchema.index({ department: 1 })

// ─── Export ───────────────────────────────────────────────────────────────────

const User = model<IUser>('User', UserSchema)
export default User
