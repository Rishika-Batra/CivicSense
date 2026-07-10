/**
 * Central barrel export for all Mongoose models.
 * Import from here to keep imports tidy across the server codebase.
 *
 * @example
 * import { User, Complaint, Department } from '@/models'
 */

export { default as User } from './User.js'
export { default as Complaint } from './Complaint.js'
export { default as Department } from './Department.js'

// Re-export interfaces and types for convenience
export type { IUser, UserRole } from './User.js'
export type {
  IComplaint,
  ILocation,
  IRemark,
  ComplaintCategory,
  ComplaintStatus,
  ComplaintPriority,
} from './Complaint.js'
export type { IDepartment, CategoryMapping } from './Department.js'
