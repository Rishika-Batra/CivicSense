import { NextFunction, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import { UserRole } from '../models/index.js'
import { AuthenticatedRequest } from '../types/express.js'

interface JwtPayload {
  id: string
  role: UserRole
  email: string
}

/**
 * authenticate middleware
 *
 * Verifies the Bearer JWT in the Authorization header and attaches the
 * decoded user payload to `req.user`.
 *
 * Returns 401 if no token is provided or the token is invalid/expired.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    })
    return
  }

  const token = authHeader.split(' ')[1]
  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({
      success: false,
      message: 'Server misconfiguration: JWT_SECRET is not set.',
    })
    return
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload

    req.user = {
      id: new Types.ObjectId(decoded.id),
      role: decoded.role,
      email: decoded.email,
    }

    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token has expired.' })
      return
    }
    res.status(401).json({ success: false, message: 'Invalid token.' })
  }
}
