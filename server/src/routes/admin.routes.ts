import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  listUsers,
  updateUser,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  adminListComplaints,
  getAnalytics,
} from '../controllers/admin.controller.js'

const router = Router()

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'))

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', listUsers)
router.patch('/users/:id', updateUser)

// ─── Department Management ────────────────────────────────────────────────────
router.get('/departments', listDepartments)
router.post('/departments', createDepartment)
router.patch('/departments/:id', updateDepartment)
router.delete('/departments/:id', deleteDepartment)

// ─── Complaint Overview (for assignment panel) ────────────────────────────────
router.get('/complaints', adminListComplaints)

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics', getAnalytics)

export default router
