import { Router } from 'express'
import {
  createComplaint,
  getComplaints,
  getMyComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
} from '../controllers/complaint.controller.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { upload } from '../middleware/upload.js'
import { validate } from '../middleware/validate.js'
import {
  createComplaintSchema,
  updateStatusSchema,
  assignComplaintSchema,
} from '../validators/complaint.validators.js'
import { predictCategory } from '../services/ai.service.js'

const router = Router()

/**
 * @route  POST /api/complaints
 * @desc   Register a new complaint with optional image upload
 * @access Private (Citizen only)
 */
router.post(
  '/',
  upload.single('image'),
  validate(createComplaintSchema),
  createComplaint
)

/**
 * @route  POST /api/complaints/predict
 * @desc   Predict category of an uploaded issue image before submission
 * @access Private (Citizen only)
 */
router.post(
  '/predict',
  upload.single('image'),
  async (req, res, next) => {
    console.log("CONTENT-TYPE:", req.headers["content-type"])
    console.log("BODY:", req.body)
    console.log("FILE:", req.file)
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No image uploaded.' })
      return
    }
    try {
      const aiResult = await predictCategory(req.file.buffer, req.file.originalname)
      res.status(200).json({
        success: true,
        category: aiResult.category,
        confidence: aiResult.confidence,
      })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * @route  GET /api/complaints
 * @desc   List complaints with filtering and pagination
 * @access Private (Officer and Admin only)
 */

/**
 * @route  GET /api/complaints/my
 * @desc   Get complaints filed by currently authenticated citizen
 * @access Private (Citizen only)
 */

/**
 * @route  GET /api/complaints/:id
 * @desc   Get complaint by ID (Visibility restricted to author or officers/admins)
 * @access Private (All roles)
 */

/**
 * @route  PATCH /api/complaints/:id/status
 * @desc   Update status of a complaint with resolution proof and remarks
 * @access Private (Officer and Admin only)
 */
router.patch(
  '/:id/status',
  authorize('officer', 'admin'),
  upload.single('image'),
  validate(updateStatusSchema),
  updateComplaintStatus
)

/**
 * @route  PATCH /api/complaints/:id/assign
 * @desc   Assign complaint to specific officer or auto-route via department mapping
 * @access Private (Admin only)
 */
router.patch(
  '/:id/assign',
  authorize('admin'),
  validate(assignComplaintSchema),
  assignComplaint
)

export default router
