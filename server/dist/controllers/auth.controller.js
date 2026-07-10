"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../models/index.js");
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
// ─── Helper: Sign JWT ─────────────────────────────────────────────────────────
const signToken = (payload) => {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET is not configured');
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
};
// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Public citizen self-signup.
 * Officers and admins must be created by an admin via a separate route.
 */
const register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check for duplicate email
        const existing = await index_js_1.User.findOne({ email });
        if (existing) {
            res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
            });
            return;
        }
        // Hash the password
        const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
        // Create the citizen user (role defaults to 'citizen' in the schema)
        const user = await index_js_1.User.create({
            name,
            email,
            passwordHash,
            role: 'citizen',
        });
        // Issue JWT immediately so the user is logged in after registration
        const token = signToken({
            id: user._id.toString(),
            role: user.role,
            email: user.email,
        });
        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error('[register]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.register = register;
// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Find user — explicitly select passwordHash (it is not selected by default)
        const user = await index_js_1.User.findOne({ email }).select('+passwordHash');
        if (!user) {
            // Return a generic message to prevent user enumeration
            res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
            return;
        }
        // Verify the password
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
            return;
        }
        // Issue JWT
        const token = signToken({
            id: user._id.toString(),
            role: user.role,
            email: user.email,
        });
        res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
            },
        });
    }
    catch (err) {
        console.error('[login]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.login = login;
// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user's profile.
 * Requires the `authenticate` middleware to run first.
 */
const me = async (req, res) => {
    try {
        const user = await index_js_1.User.findById(req.user.id)
            .select('-passwordHash')
            .populate('department', 'name');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (err) {
        console.error('[me]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.me = me;
