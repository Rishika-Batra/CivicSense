"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ─── Sub-document Schemas ─────────────────────────────────────────────────────
const LocationSchema = new mongoose_1.Schema({
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
}, { _id: false });
const RemarkSchema = new mongoose_1.Schema({
    text: {
        type: String,
        required: [true, 'Remark text is required'],
        trim: true,
    },
    addedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    addedAt: {
        type: Date,
        default: () => new Date(),
    },
}, { _id: false });
// ─── Schema ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
    'Pothole',
    'Garbage',
    'BrokenStreetlight',
    'Waterlogging',
    'FallenTree',
    'Other',
];
const STATUSES = ['Pending', 'InProgress', 'Resolved'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const ComplaintSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
    },
    assignedOfficerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
    versionKey: false,
});
// ─── Indexes ──────────────────────────────────────────────────────────────────
// Single-field indexes for common filter queries
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ category: 1 });
ComplaintSchema.index({ priority: 1 });
ComplaintSchema.index({ userId: 1 });
ComplaintSchema.index({ assignedOfficerId: 1 });
// Compound index for dashboard queries (list all complaints by status + category)
ComplaintSchema.index({ status: 1, category: 1 });
// Compound index for officer workload queries
ComplaintSchema.index({ assignedOfficerId: 1, status: 1 });
// Text index for free-text search on title and description
ComplaintSchema.index({ title: 'text', description: 'text' });
// Geospatial index on location (using 2dsphere for lat/lon)
// Enabled for future proximity-based queries
ComplaintSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
// ─── Export ───────────────────────────────────────────────────────────────────
const Complaint = (0, mongoose_1.model)('Complaint', ComplaintSchema);
exports.default = Complaint;
