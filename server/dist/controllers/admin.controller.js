"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.adminListComplaints = exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.listDepartments = exports.updateUser = exports.listUsers = void 0;
const User_js_1 = __importDefault(require("../models/User.js"));
const Department_js_1 = __importDefault(require("../models/Department.js"));
const Complaint_js_1 = __importDefault(require("../models/Complaint.js"));
const mongoose_1 = require("mongoose");
// ─── GET /api/admin/users ─────────────────────────────────────────────────────
/**
 * Lists all users. Supports optional `role` filter and `search` by name/email.
 * Admin only.
 */
const listUsers = async (req, res) => {
    try {
        const role = req.query.role ? String(req.query.role) : undefined;
        const search = req.query.search ? String(req.query.search) : undefined;
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 50);
        const query = {};
        if (role)
            query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User_js_1.default.find(query)
                .select('-passwordHash')
                .populate('department', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            User_js_1.default.countDocuments(query),
        ]);
        res.json({ success: true, users, total, page, limit });
    }
    catch (err) {
        console.error('[listUsers]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.listUsers = listUsers;
// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────
/**
 * Updates a user's role or department.
 * Admin only. Cannot demote themselves.
 */
const updateUser = async (req, res) => {
    try {
        const id = String(req.params.id);
        const { role, department, deactivate } = req.body;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid user ID.' });
            return;
        }
        // Prevent admins from demoting their own account
        if (req.user.id.toString() === id && role && role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'You cannot change your own admin role.',
            });
            return;
        }
        const updates = {};
        if (deactivate === true) {
            // Soft-deactivate by setting role to a sentinel value
            updates.role = 'deactivated';
        }
        else {
            if (role !== undefined)
                updates.role = role;
            if (department !== undefined)
                updates.department = department ?? null;
        }
        const user = await User_js_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: false,
        })
            .select('-passwordHash')
            .populate('department', 'name');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found.' });
            return;
        }
        if (updates.role === 'admin') {
            const timestamp = new Date().toISOString();
            console.warn(`[AUDIT LOG] [${timestamp}] ADMIN PROMOTION: Actor ID: ${req.user.id} (Email: ${req.user.email}) promoted Target User: ${user.name} (ID: ${user._id}, Email: ${user.email}) to role: admin.`);
        }
        res.json({ success: true, user });
    }
    catch (err) {
        console.error('[updateUser]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.updateUser = updateUser;
// ─── GET /api/admin/departments ───────────────────────────────────────────────
const listDepartments = async (_req, res) => {
    try {
        const departments = await Department_js_1.default.find()
            .populate('officers', 'name email role')
            .sort({ name: 1 });
        res.json({ success: true, departments });
    }
    catch (err) {
        console.error('[listDepartments]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.listDepartments = listDepartments;
// ─── POST /api/admin/departments ─────────────────────────────────────────────
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name?.trim()) {
            res.status(400).json({ success: false, message: 'Department name is required.' });
            return;
        }
        const existing = await Department_js_1.default.findOne({ name: name.trim() });
        if (existing) {
            res.status(409).json({ success: false, message: 'A department with that name already exists.' });
            return;
        }
        const department = await Department_js_1.default.create({ name: name.trim(), description });
        res.status(201).json({ success: true, department });
    }
    catch (err) {
        console.error('[createDepartment]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.createDepartment = createDepartment;
// ─── PATCH /api/admin/departments/:id ────────────────────────────────────────
const updateDepartment = async (req, res) => {
    try {
        const id = String(req.params.id);
        const { name, description, officers, categoryMappings } = req.body;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid department ID.' });
            return;
        }
        const updates = {};
        if (name !== undefined)
            updates.name = name;
        if (description !== undefined)
            updates.description = description;
        if (officers !== undefined)
            updates.officers = officers;
        if (categoryMappings !== undefined)
            updates.categoryMappings = categoryMappings;
        const department = await Department_js_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: false,
        }).populate('officers', 'name email role');
        if (!department) {
            res.status(404).json({ success: false, message: 'Department not found.' });
            return;
        }
        // Sync officers' department reference on User documents
        if (officers !== undefined) {
            await User_js_1.default.updateMany({ department: new mongoose_1.Types.ObjectId(id) }, { $unset: { department: '' } });
            if (officers.length > 0) {
                await User_js_1.default.updateMany({ _id: { $in: officers } }, { $set: { department: new mongoose_1.Types.ObjectId(id) } });
            }
        }
        res.json({ success: true, department });
    }
    catch (err) {
        console.error('[updateDepartment]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.updateDepartment = updateDepartment;
// ─── DELETE /api/admin/departments/:id ───────────────────────────────────────
const deleteDepartment = async (req, res) => {
    try {
        const id = String(req.params.id);
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid department ID.' });
            return;
        }
        const department = await Department_js_1.default.findByIdAndDelete(id);
        if (!department) {
            res.status(404).json({ success: false, message: 'Department not found.' });
            return;
        }
        // Remove the department reference from all officers that belonged to it
        await User_js_1.default.updateMany({ department: new mongoose_1.Types.ObjectId(id) }, { $unset: { department: '' } });
        res.json({ success: true, message: 'Department deleted successfully.' });
    }
    catch (err) {
        console.error('[deleteDepartment]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.deleteDepartment = deleteDepartment;
// ─── GET /api/admin/complaints ────────────────────────────────────────────────
/**
 * Lists all complaints for admin assignment view.
 * Supports filters: status, category. Returns populated officer & user info.
 */
const adminListComplaints = async (req, res) => {
    try {
        const status = req.query.status ? String(req.query.status) : undefined;
        const category = req.query.category ? String(req.query.category) : undefined;
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        const query = {};
        if (status)
            query.status = status;
        if (category)
            query.category = category;
        const skip = (page - 1) * limit;
        const [complaints, total] = await Promise.all([
            Complaint_js_1.default.find(query)
                .populate('userId', 'name email')
                .populate('assignedOfficerId', 'name email')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Complaint_js_1.default.countDocuments(query),
        ]);
        res.json({ success: true, complaints, total });
    }
    catch (err) {
        console.error('[adminListComplaints]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.adminListComplaints = adminListComplaints;
// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
/**
 * Returns aggregated analytics across all complaints:
 * - Total complaint count
 * - Breakdown by status
 * - Breakdown by category
 * - Average resolution time (createdAt → updatedAt for Resolved complaints)
 * - Monthly complaint trend (last 12 months)
 * - Top areas by complaint volume (by address)
 */
const getAnalytics = async (_req, res) => {
    try {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);
        const [totalCount, statusBreakdown, categoryBreakdown, priorityBreakdown, monthlyTrend, avgResolutionResult, topAreas,] = await Promise.all([
            // 1. Total complaints
            Complaint_js_1.default.countDocuments(),
            // 2. Status breakdown
            Complaint_js_1.default.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { status: '$_id', count: 1, _id: 0 } },
                { $sort: { status: 1 } },
            ]),
            // 3. Category breakdown
            Complaint_js_1.default.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $project: { category: '$_id', count: 1, _id: 0 } },
                { $sort: { count: -1 } },
            ]),
            // 4. Priority breakdown
            Complaint_js_1.default.aggregate([
                { $group: { _id: '$priority', count: { $sum: 1 } } },
                { $project: { priority: '$_id', count: 1, _id: 0 } },
                { $sort: { count: -1 } },
            ]),
            // 5. Monthly trend — last 12 months
            Complaint_js_1.default.aggregate([
                { $match: { createdAt: { $gte: twelveMonthsAgo } } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                        },
                        count: { $sum: 1 },
                        resolved: {
                            $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
                        },
                        pending: {
                            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
                        },
                        inProgress: {
                            $sum: { $cond: [{ $eq: ['$status', 'InProgress'] }, 1, 0] },
                        },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                {
                    $project: {
                        _id: 0,
                        year: '$_id.year',
                        month: '$_id.month',
                        count: 1,
                        resolved: 1,
                        pending: 1,
                        inProgress: 1,
                    },
                },
            ]),
            // 6. Average resolution time in hours (Resolved complaints only)
            Complaint_js_1.default.aggregate([
                { $match: { status: 'Resolved' } },
                {
                    $project: {
                        resolutionMs: { $subtract: ['$updatedAt', '$createdAt'] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgMs: { $avg: '$resolutionMs' },
                        totalResolved: { $sum: 1 },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        avgHours: { $divide: ['$avgMs', 3600000] },
                        totalResolved: 1,
                    },
                },
            ]),
            // 7. Top 10 complaint areas (by address string prefix — city/area level)
            Complaint_js_1.default.aggregate([
                {
                    $group: {
                        _id: '$location.address',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
                { $project: { address: '$_id', count: 1, _id: 0 } },
            ]),
        ]);
        // Fill missing months in the trend with zeros so the chart has a full 12-point series
        const trendMap = new Map();
        for (const point of monthlyTrend) {
            trendMap.set(`${point.year}-${point.month}`, point);
        }
        const filledMonthlyTrend = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const key = `${year}-${month}`;
            const existing = trendMap.get(key);
            filledMonthlyTrend.push(existing ?? { year, month, count: 0, resolved: 0, pending: 0, inProgress: 0 });
        }
        res.json({
            success: true,
            analytics: {
                totalComplaints: totalCount,
                statusBreakdown,
                categoryBreakdown,
                priorityBreakdown,
                monthlyTrend: filledMonthlyTrend,
                avgResolutionHours: avgResolutionResult.length > 0
                    ? Math.round(avgResolutionResult[0].avgHours * 10) / 10
                    : null,
                totalResolved: avgResolutionResult.length > 0 ? avgResolutionResult[0].totalResolved : 0,
                topAreas,
            },
        });
    }
    catch (err) {
        console.error('[getAnalytics]', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
exports.getAnalytics = getAnalytics;
