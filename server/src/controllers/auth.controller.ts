import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'
import { AuthenticatedRequest } from '../types/express.js'
import { LoginInput, RegisterInput } from '../validators/auth.validators.js'

const SALT_ROUNDS = 12
const JWT_EXPIRES_IN = '7d'

// ─── Helper: Sign JWT ─────────────────────────────────────────────────────────

const signToken = (payload: {
  id: string
  role: string
  email: string
}): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN })
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

/**
 * Public citizen self-signup.
 * Officers and admins must be created by an admin via a separate route.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as RegisterInput

  try {
    // Check for duplicate email
    const existing = await User.findOne({ email })
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
      return
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create the citizen user (role defaults to 'citizen' in the schema)
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'citizen',
    })

    // Issue JWT immediately so the user is logged in after registration
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    })

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
    })
  } catch (err) {
    console.error('[register]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginInput

  try {
    // Find user — explicitly select passwordHash (it is not selected by default)
    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user) {
      // Return a generic message to prevent user enumeration
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
      return
    }

    // Verify the password
    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
      return
    }

    // Issue JWT
    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    })

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
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * Returns the currently authenticated user's profile.
 * Requires the `authenticate` middleware to run first.
 */
export const me = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-passwordHash')
      .populate('department', 'name')

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' })
      return
    }

    res.status(200).json({
      success: true,
      user,
    })
  } catch (err) {
    console.error('[me]', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}
