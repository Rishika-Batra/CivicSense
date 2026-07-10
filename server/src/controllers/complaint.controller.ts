import { Response } from 'express'
import { Types } from 'mongoose'
import { Complaint, User, Department, ComplaintCategory } from '../models/index.js'
import { uploadImage } from '../services/cloudinary.service.js'
import { predictCategory } from '../services/ai.service.js'
import { AuthenticatedRequest } from '../types/express.js'

// ─── POST /api/complaints ─────────────────────────────────────────────────────

/**
 * Creates a new complaint.
 * Only authenticated Citizens can submit complaints.
 * Supports file upload for image attachment via Multer -> Cloudinary.
 */
export const createComplaint = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, category, latitude, longitude, address, priority } = req.body

    let imageUrl: string | undefined = undefined
    let suggestedCategory = 'Other'
    let aiConfidence = 0.0

    // Upload image to Cloudinary if provided
    if (req.file) {
      // 1. Upload to Cloudinary
      imageUrl = await uploadImage(req.file.buffer)

      // 2. Classify image using YOLOv8 AI Service
      try {
        const aiResult = await predictCategory(req.file.buffer, req.file.originalname)
        suggestedCategory = aiResult.category
        aiConfidence = aiResult.confidence
      } catch (err: any) {
        console.warn(`⚠️ Failed to parse AI category suggestion: ${err.message}. Gracefully continuing.`)
      }
    }

    // Determine final category (use citizen override if specified and not 'Other',
    // fallback to AI suggestion, and absolute fallback to whatever category is present)
    const finalCategory =
      category && category !== 'Other'
        ? category
        : suggestedCategory !== 'Other'
        ? suggestedCategory
        : category || 'Other'

    const complaint = await Complaint.create({
      title,
      description,
      category: finalCategory as ComplaintCategory,
      suggestedCategory: suggestedCategory as ComplaintCategory,
      aiConfidence,
      imageUrl,
      priority,
      status: 'Pending',
      userId: req.user!.id,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Complaint registered successfully.',
      complaint,
    })
  } catch (err) {
    console.error('[createComplaint]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── GET /api/complaints ──────────────────────────────────────────────────────

/**
 * Lists complaints with filtering, search, bounding box query, and pagination.
 * Accessible to Officers and Admins (Citizens should use /my).
 */
export const getComplaints = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      category,
      status,
      priority,
      assignedOfficerId,
      minLat,
      maxLat,
      minLng,
      maxLng,
      search,
      page = 1,
      limit = 10,
    } = req.query

    const filterQuery: any = {}

    // Apply exact match filters
    if (category) filterQuery.category = category
    if (status) filterQuery.status = status
    if (priority) filterQuery.priority = priority
    if (assignedOfficerId) filterQuery.assignedOfficerId = assignedOfficerId

    // Apply bounding box geographic filters
    if (minLat && maxLat) {
      filterQuery['location.latitude'] = {
        $gte: parseFloat(minLat as string),
        $lte: parseFloat(maxLat as string),
      }
    }
    if (minLng && maxLng) {
      filterQuery['location.longitude'] = {
        $gte: parseFloat(minLng as string),
        $lte: parseFloat(maxLng as string),
      }
    }

    // Apply text search
    if (search) {
      filterQuery.$text = { $search: search as string }
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string))
    const limitNum = Math.max(1, parseInt(limit as string))
    const skip = (pageNum - 1) * limitNum

    const [complaints, total] = await Promise.all([
      Complaint.find(filterQuery)
        .populate('userId', 'name email role')
        .populate('assignedOfficerId', 'name email department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Complaint.countDocuments(filterQuery),
    ])

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      complaints,
    })
  } catch (err) {
    console.error('[getComplaints]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── GET /api/complaints/my ───────────────────────────────────────────────────

/**
 * Returns complaints filed by the currently logged-in citizen user.
 */
export const getMyComplaints = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const [complaints, total] = await Promise.all([
      Complaint.find({ userId: req.user!.id })
        .populate('assignedOfficerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Complaint.countDocuments({ userId: req.user!.id }),
    ])

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      complaints,
    })
  } catch (err) {
    console.error('[getMyComplaints]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── GET /api/complaints/:id ──────────────────────────────────────────────────

/**
 * Returns detailed details for a single complaint by ID.
 * Enforces visibility (Citizens can only view their own; Officers/Admins can view any).
 */
export const getComplaintById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('userId', 'name email role')
      .populate('assignedOfficerId', 'name email department')
      .populate('remarks.addedBy', 'name role')

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' })
      return
    }

    // Role-based visibility authorization check
    if (req.user!.role === 'citizen' && !complaint.userId.equals(req.user!.id)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own complaints.',
      })
      return
    }

    res.status(200).json({ success: true, complaint })
  } catch (err) {
    console.error('[getComplaintById]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── PATCH /api/complaints/:id/status ──────────────────────────────────────────

/**
 * Updates status of a complaint and appends a remark message.
 * Only Officers and Admins can update statuses.
 * If status is resolved, accepts an optional resolution proof image upload.
 */
export const updateComplaintStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, remarks } = req.body
    const { id } = req.params

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' })
      return
    }

    // Enforce that officers can only update status if it is assigned to them
    if (
      req.user!.role === 'officer' &&
      (!complaint.assignedOfficerId || !complaint.assignedOfficerId.equals(req.user!.id))
    ) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Officers can only update complaints assigned to them.',
      })
      return
    }

    // Enforce resolution proof if status is Resolved
    if (status === 'Resolved') {
      const hasExistingProof = !!complaint.resolutionProofUrl
      const hasNewProofFile = !!req.file
      const hasNewProofUrl = !!req.body.resolutionProofUrl

      if (!hasExistingProof && !hasNewProofFile && !hasNewProofUrl) {
        res.status(400).json({
          success: false,
          message: 'Resolution proof is required to mark a complaint as resolved.',
        })
        return
      }
    }

    let resolutionProofUrl = complaint.resolutionProofUrl

    // If status is being updated to Resolved and a file is uploaded
    if (status === 'Resolved' && req.file) {
      resolutionProofUrl = await uploadImage(req.file.buffer)
    }

    // Append new status remark
    complaint.remarks.push({
      text: remarks,
      addedBy: req.user!.id,
      addedAt: new Date(),
    })

    complaint.status = status
    if (resolutionProofUrl) {
      complaint.resolutionProofUrl = resolutionProofUrl
    }

    await complaint.save()

    res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status} successfully.`,
      complaint,
    })
  } catch (err) {
    console.error('[updateComplaintStatus]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── PATCH /api/complaints/:id/assign ──────────────────────────────────────────

/**
 * Assigns a complaint to a specific officer or automatically routes based on department.
 * Admin only.
 */
export const assignComplaint = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { assignedOfficerId, departmentId } = req.body
    const { id } = req.params

    const complaint = await Complaint.findById(id)
    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' })
      return
    }

    let targetOfficerId: Types.ObjectId | undefined = undefined

    // 1. Assigning to specific officer directly
    if (assignedOfficerId) {
      const officer = await User.findOne({ _id: assignedOfficerId, role: 'officer' })
      if (!officer) {
        res.status(400).json({
          success: false,
          message: 'Invalid assignment. Officer user not found.',
        })
        return
      }
      targetOfficerId = officer._id as Types.ObjectId
    } 
    // 2. Assigning to a department -> Auto-routing based on category mapping
    else if (departmentId) {
      const dept = await Department.findById(departmentId)
      if (!dept) {
        res.status(400).json({
          success: false,
          message: 'Invalid assignment. Department not found.',
        })
        return
      }

      // Lookup officers mapped to this category in the department
      const categoryOfficers = dept.categoryMappings[complaint.category] || []
      
      if (categoryOfficers.length > 0) {
        // Auto-assign to the first officer in the mapping mapping
        targetOfficerId = categoryOfficers[0]
      } else if (dept.officers.length > 0) {
        // Fallback to any general officer in that department
        targetOfficerId = dept.officers[0]
      } else {
        res.status(400).json({
          success: false,
          message: `Department '${dept.name}' has no officers available to handle '${complaint.category}' complaints.`,
        })
        return
      }
    }

    if (!targetOfficerId) {
      res.status(400).json({
        success: false,
        message: 'Could not resolve assignment recipient.',
      })
      return
    }

    // Set assigning status to InProgress when assigned
    complaint.assignedOfficerId = targetOfficerId
    if (complaint.status === 'Pending') {
      complaint.status = 'InProgress'
    }

    // Add remark tracking the assignment
    complaint.remarks.push({
      text: `Complaint assigned to officer by administrator.`,
      addedBy: req.user!.id,
      addedAt: new Date(),
    })

    await complaint.save()

    // Fetch the updated officer name for confirmation details
    const assignedUser = await User.findById(targetOfficerId).select('name email')

    res.status(200).json({
      success: true,
      message: `Complaint successfully assigned to ${assignedUser?.name}.`,
      complaint,
    })
  } catch (err) {
    console.error('[assignComplaint]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}
