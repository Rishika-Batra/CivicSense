import { Router } from 'express'
import { login, me, register } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/authenticate.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, registerSchema } from '../validators/auth.validators.js'

const router = Router()

/**
 * @route  POST /api/auth/register
 * @desc   Public citizen self-signup
 * @access Public
 */
router.post('/register', validate(registerSchema), register)

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate user and return JWT
 * @access Public
 */
router.post('/login', validate(loginSchema), login)

/**
 * @route  GET /api/auth/me
 * @desc   Get the currently authenticated user's profile
 * @access Private (requires valid JWT)
 */
router.get('/me', authenticate, me)

export default router
