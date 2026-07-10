import { Request, Response } from 'express'
import { AuthenticatedRequest } from '../types/express.js'
import User from '../models/User.js'
import Department from '../models/Department.js'
import Complaint from '../models/Complaint.js'
import { Types } from 'mongoose'

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

/**
 * Lists all users. Supports optional `role` filter and `search` by name/email.
 * Admin only.
 */
export const listUsers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const role = req.query.role ? String(req.query.role) : undefined
    const search = req.query.search ? String(req.query.search) : undefined
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 50)

    const query: Record<string, unknown> = {}
    if (role) query.role = role
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (page - 1) * limit
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .populate('department', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ])

    res.json({ success: true, users, total, page, limit })
  } catch (err) {
    console.error('[listUsers]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── PATCH /api/admin/users/:id ───────────────────────────────────────────────

/**
 * Updates a user's role or department.
 * Admin only. Cannot demote themselves.
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id)
    const { role, department, deactivate } = req.body as {
      role?: string
      department?: string | null
      deactivate?: boolean
    }

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID.' })
      return
    }

    // Prevent admins from demoting their own account
    if (req.user!.id.toString() === id && role && role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'You cannot change your own admin role.',
      })
      return
    }

    const updates: Record<string, unknown> = {}
    if (deactivate === true) {
      // Soft-deactivate by setting role to a sentinel value
      updates.role = 'deactivated'
    } else {
      if (role !== undefined) updates.role = role
      if (department !== undefined) updates.department = department ?? null
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: false,
    })
      .select('-passwordHash')
      .populate('department', 'name')

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' })
      return
    }

    if (updates.role === 'admin') {
      const timestamp = new Date().toISOString()
      console.warn(
        `[AUDIT LOG] [${timestamp}] ADMIN PROMOTION: Actor ID: ${req.user!.id} (Email: ${req.user!.email}) promoted Target User: ${user.name} (ID: ${user._id}, Email: ${user.email}) to role: admin.`
      )
    }

    res.json({ success: true, user })
  } catch (err) {
    console.error('[updateUser]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── GET /api/admin/departments ───────────────────────────────────────────────

export const listDepartments = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const departments = await Department.find()
      .populate('officers', 'name email role')
      .sort({ name: 1 })

    res.json({ success: true, departments })
  } catch (err) {
    console.error('[listDepartments]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── POST /api/admin/departments ─────────────────────────────────────────────

export const createDepartment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description } = req.body as { name?: string; description?: string }

    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Department name is required.' })
      return
    }

    const existing = await Department.findOne({ name: name.trim() })
    if (existing) {
      res.status(409).json({ success: false, message: 'A department with that name already exists.' })
      return
    }

    const department = await Department.create({ name: name.trim(), description })
    res.status(201).json({ success: true, department })
  } catch (err) {
    console.error('[createDepartment]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── PATCH /api/admin/departments/:id ────────────────────────────────────────

export const updateDepartment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id)
    const { name, description, officers, categoryMappings } = req.body as {
      name?: string
      description?: string
      officers?: string[]
      categoryMappings?: Record<string, string[]>
    }

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid department ID.' })
      return
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (officers !== undefined) updates.officers = officers
    if (categoryMappings !== undefined) updates.categoryMappings = categoryMappings

    const department = await Department.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: false,
    }).populate('officers', 'name email role')

    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found.' })
      return
    }

    // Sync officers' department reference on User documents
    if (officers !== undefined) {
      await User.updateMany(
        { department: new Types.ObjectId(id) },
        { $unset: { department: '' } }
      )
      if (officers.length > 0) {
        await User.updateMany(
          { _id: { $in: officers } },
          { $set: { department: new Types.ObjectId(id) } }
        )
      }
    }

    res.json({ success: true, department })
  } catch (err) {
    console.error('[updateDepartment]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── DELETE /api/admin/departments/:id ───────────────────────────────────────

export const deleteDepartment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = String(req.params.id)

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid department ID.' })
      return
    }

    const department = await Department.findByIdAndDelete(id)
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found.' })
      return
    }

    // Remove the department reference from all officers that belonged to it
    await User.updateMany(
      { department: new Types.ObjectId(id) },
      { $unset: { department: '' } }
    )

    res.json({ success: true, message: 'Department deleted successfully.' })
  } catch (err) {
    console.error('[deleteDepartment]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── GET /api/admin/complaints ────────────────────────────────────────────────

/**
 * Lists all complaints for admin assignment view.
 * Supports filters: status, category. Returns populated officer & user info.
 */
export const adminListComplaints = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined
    const category = req.query.category ? String(req.query.category) : undefined
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 20)

    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (category) query.category = category

    const skip = (page - 1) * limit
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate('userId', 'name email')
        .populate('assignedOfficerId', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Complaint.countDocuments(query),
    ])

    res.json({ success: true, complaints, total })
  } catch (err) {
    console.error('[adminListComplaints]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

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
export const getAnalytics = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const [
      totalCount,
      statusBreakdown,
      categoryBreakdown,
      priorityBreakdown,
      monthlyTrend,
      avgResolutionResult,
      topAreas,
    ] = await Promise.all([
      // 1. Total complaints
      Complaint.countDocuments(),

      // 2. Status breakdown
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
        { $sort: { status: 1 } },
      ]),

      // 3. Category breakdown
      Complaint.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { category: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]),

      // 4. Priority breakdown
      Complaint.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $project: { priority: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]),

      // 5. Monthly trend — last 12 months
      Complaint.aggregate([
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
      Complaint.aggregate([
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
      Complaint.aggregate([
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
    ])

    // Fill missing months in the trend with zeros so the chart has a full 12-point series
    const trendMap = new Map<string, (typeof monthlyTrend)[0]>()
    for (const point of monthlyTrend) {
      trendMap.set(`${point.year}-${point.month}`, point)
    }

    const filledMonthlyTrend = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const key = `${year}-${month}`
      const existing = trendMap.get(key)
      filledMonthlyTrend.push(
        existing ?? { year, month, count: 0, resolved: 0, pending: 0, inProgress: 0 }
      )
    }

    res.json({
      success: true,
      analytics: {
        totalComplaints: totalCount,
        statusBreakdown,
        categoryBreakdown,
        priorityBreakdown,
        monthlyTrend: filledMonthlyTrend,
        avgResolutionHours:
          avgResolutionResult.length > 0
            ? Math.round(avgResolutionResult[0].avgHours * 10) / 10
            : null,
        totalResolved:
          avgResolutionResult.length > 0 ? avgResolutionResult[0].totalResolved : 0,
        topAreas,
      },
    })
  } catch (err) {
    console.error('[getAnalytics]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

