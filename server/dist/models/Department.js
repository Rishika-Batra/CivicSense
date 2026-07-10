"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ─── Schema ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
    'Pothole',
    'Garbage',
    'BrokenStreetlight',
    'Waterlogging',
    'FallenTree',
    'Other',
];
/**
 * Build a dynamic schema shape for categoryMappings so Mongoose stores it
 * correctly.  Each key is a category and each value is an array of ObjectIds.
 */
const categoryMappingsShape = {};
for (const cat of CATEGORIES) {
    categoryMappingsShape[cat] = {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    };
}
const DepartmentSchema = new mongoose_1.Schema({
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
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'User',
        default: [],
    },
}, {
    timestamps: true,
    versionKey: false,
});
// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique index on department name (already declared via unique: true above,
// explicit definition here for clarity)
DepartmentSchema.index({ name: 1 }, { unique: true });
// Index on officers array so we can quickly find a department by officer ID
DepartmentSchema.index({ officers: 1 });
// ─── Export ───────────────────────────────────────────────────────────────────
const Department = (0, mongoose_1.model)('Department', DepartmentSchema);
exports.default = Department;
