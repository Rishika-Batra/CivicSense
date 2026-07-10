import { Request, Response, NextFunction } from 'express'

// ─── Rate Limiter ────────────────────────────────────────────────────────────

interface ClientRate {
  count: number
  resetTime: number
}

const ipCache = new Map<string, ClientRate>()

// Cleanup stale IP cache entries every 10 minutes to prevent memory accumulation
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of ipCache.entries()) {
      if (now > data.resetTime) {
        ipCache.delete(ip)
      }
    }
  }, 10 * 60 * 1000)
}

/**
 * Express middleware to rate limit client requests based on client IP.
 * Handles rate limits in-memory cleanly.
 */
export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    const now = Date.now()

    const record = ipCache.get(ip)
    if (!record || now > record.resetTime) {
      ipCache.set(ip, { count: 1, resetTime: now + windowMs })
      next()
      return
    }

    record.count++
    if (record.count > limit) {
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
      })
      return
    }

    next()
  }
}

// ─── Input Sanitizer ─────────────────────────────────────────────────────────

/**
 * Escapes common HTML control characters to prevent persistent XSS vectors.
 */
const escapeString = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Recursively removes MongoDB operator keys (starting with '$') or keys with dots
 * to prevent NoSQL query hijacking, and escapes HTML characters inside string inputs.
 */
const sanitizeValue = (value: any): any => {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return escapeString(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item))
  }

  if (typeof value === 'object') {
    const sanitizedObj: Record<string, any> = {}
    for (const key in value) {
      // Skip fields starting with '$' or containing dots '.'
      if (key.startsWith('$') || key.includes('.')) {
        continue
      }
      sanitizedObj[key] = sanitizeValue(value[key])
    }
    return sanitizedObj
  }

  return value
}

/**
 * Middleware to sanitize request query, parameters, and body inputs.
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeValue(req.body)
  }
  if (req.query) {
    // Mutate in-place to avoid getter-only re-assignment errors
    const sanitizedQuery = sanitizeValue(req.query)
    for (const key in req.query) {
      delete req.query[key]
    }
    Object.assign(req.query, sanitizedQuery)
  }
  if (req.params) {
    // Mutate in-place to avoid getter-only re-assignment errors
    const sanitizedParams = sanitizeValue(req.params)
    for (const key in req.params) {
      delete req.params[key]
    }
    Object.assign(req.params, sanitizedParams)
  }
  next()
}
