import { z } from 'zod'

const categoryEnum = z.enum([
  'Pothole',
  'Garbage',
  'BrokenStreetlight',
  'Waterlogging',
  'FallenTree',
  'Other',
])

const priorityEnum = z.enum(['Low', 'Medium', 'High', 'Critical'])
const statusEnum = z.enum(['Pending', 'InProgress', 'Resolved'])

/**
 * Validation schema for creating a new complaint.
 * Uses preprocess to parse stringified numeric lat/long from form-data.
 */
export const createComplaintSchema = z.object({
  body: z.object({
    title: z
      .string({ message: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(150, 'Title must not exceed 150 characters'),
    description: z
      .string({ message: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must not exceed 2000 characters'),
    category: categoryEnum,
    latitude: z.preprocess(
      (val) => parseFloat(val as string),
      z.number({ message: 'Latitude is required' }).min(-90).max(90)
    ),
    longitude: z.preprocess(
      (val) => parseFloat(val as string),
      z.number({ message: 'Longitude is required' }).min(-180).max(180)
    ),
    address: z
      .string({ message: 'Address is required' })
      .trim()
      .min(5, 'Address must be at least 5 characters'),
    priority: priorityEnum.default('Medium'),
  }),
})

/**
 * Validation schema for updating complaint status.
 * Requires a status and remarks text.
 */
export const updateStatusSchema = z.object({
  body: z.object({
    status: statusEnum,
    remarks: z
      .string({ message: 'Remarks are required to update status' })
      .trim()
      .min(3, 'Remarks must be at least 3 characters')
      .max(1000, 'Remarks must not exceed 1000 characters'),
    resolutionProofUrl: z.string().optional(),
  }),
})

/**
 * Validation schema for assigning complaints.
 * Requires at least one of assignedOfficerId or departmentId.
 */
export const assignComplaintSchema = z.object({
  body: z
    .object({
      assignedOfficerId: z.string().optional(),
      departmentId: z.string().optional(),
    })
    .refine((data) => data.assignedOfficerId || data.departmentId, {
      message: 'Either assignedOfficerId or departmentId must be provided',
      path: ['assignedOfficerId'],
    }),
})
