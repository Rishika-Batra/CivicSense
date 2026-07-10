import dotenv from 'dotenv'
dotenv.config()

import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import authRoutes from './routes/auth.routes.js'
import complaintRoutes from './routes/complaint.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { rateLimiter, sanitizeInput } from './middleware/security.js'


// ─── App Initialization ───────────────────────────────────────────────────────

const app = express()
const PORT = process.env.PORT || 5000
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/civicsense'

// ─── Middlewares ──────────────────────────────────────────────────────────────

// ─── CORS ─────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS is a comma-separated list of permitted frontend origins.
// Example production value: https://civicsense.vercel.app
// Falls back to localhost for local development.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Security protections: global rate limiting and input sanitization
app.use(rateLimiter(300, 15 * 60 * 1000)) // 300 requests per 15 minutes
app.use(sanitizeInput)

// ─── Database Connection ──────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('✅ MongoDB connected successfully.')
    })
    .catch((err: Error) => {
      console.warn(
        '⚠️  Could not connect to MongoDB. Server running without database.',
        err.message
      )
    })
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Hello World from CivicSense Server',
    status: 'online',
    timestamp: new Date().toISOString(),
  })
})

// Mount auth routes
app.use('/api/auth', authRoutes)
app.use('/api/complaints', complaintRoutes)
app.use('/api/admin', adminRoutes)

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found.' })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err)
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
  })
})

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  })
}

export default app
export { app }
