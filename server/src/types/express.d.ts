import { Request } from 'express'
import { Types } from 'mongoose'
import { UserRole } from '../models/index.js'

/**
 * Extends the Express Request object to include the authenticated user's
 * decoded JWT payload after the `authenticate` middleware runs.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: Types.ObjectId
    role: UserRole
    email: string
  }
}
