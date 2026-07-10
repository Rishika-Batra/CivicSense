"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignComplaintSchema = exports.updateStatusSchema = exports.createComplaintSchema = void 0;
const zod_1 = require("zod");
const categoryEnum = zod_1.z.enum([
    'Pothole',
    'Garbage',
    'BrokenStreetlight',
    'Waterlogging',
    'FallenTree',
    'Other',
]);
const priorityEnum = zod_1.z.enum(['Low', 'Medium', 'High', 'Critical']);
const statusEnum = zod_1.z.enum(['Pending', 'InProgress', 'Resolved']);
/**
 * Validation schema for creating a new complaint.
 * Uses preprocess to parse stringified numeric lat/long from form-data.
 */
exports.createComplaintSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z
            .string({ message: 'Title is required' })
            .trim()
            .min(3, 'Title must be at least 3 characters')
            .max(150, 'Title must not exceed 150 characters'),
        description: zod_1.z
            .string({ message: 'Description is required' })
            .trim()
            .min(10, 'Description must be at least 10 characters')
            .max(2000, 'Description must not exceed 2000 characters'),
        category: categoryEnum,
        latitude: zod_1.z.preprocess((val) => parseFloat(val), zod_1.z.number({ message: 'Latitude is required' }).min(-90).max(90)),
        longitude: zod_1.z.preprocess((val) => parseFloat(val), zod_1.z.number({ message: 'Longitude is required' }).min(-180).max(180)),
        address: zod_1.z
            .string({ message: 'Address is required' })
            .trim()
            .min(5, 'Address must be at least 5 characters'),
        priority: priorityEnum.default('Medium'),
    }),
});
/**
 * Validation schema for updating complaint status.
 * Requires a status and remarks text.
 */
exports.updateStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: statusEnum,
        remarks: zod_1.z
            .string({ message: 'Remarks are required to update status' })
            .trim()
            .min(3, 'Remarks must be at least 3 characters')
            .max(1000, 'Remarks must not exceed 1000 characters'),
        resolutionProofUrl: zod_1.z.string().optional(),
    }),
});
/**
 * Validation schema for assigning complaints.
 * Requires at least one of assignedOfficerId or departmentId.
 */
exports.assignComplaintSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        assignedOfficerId: zod_1.z.string().optional(),
        departmentId: zod_1.z.string().optional(),
    })
        .refine((data) => data.assignedOfficerId || data.departmentId, {
        message: 'Either assignedOfficerId or departmentId must be provided',
        path: ['assignedOfficerId'],
    }),
});
