"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ─── Schema ───────────────────────────────────────────────────────────────────
const UserSchema = new mongoose_1.Schema({
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
        enum: ['citizen', 'officer', 'admin'],
        default: 'citizen',
    },
    department: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Department',
        required: false,
    },
}, {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    versionKey: false,
});
// ─── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1 });
// ─── Export ───────────────────────────────────────────────────────────────────
const User = (0, mongoose_1.model)('User', UserSchema);
exports.default = User;
