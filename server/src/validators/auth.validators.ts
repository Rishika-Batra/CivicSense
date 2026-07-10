import { z } from 'zod'

// ─── Register Schema ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must not exceed 80 characters'),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email format'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters'),
  }),
})

// ─── Login Schema ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email format'),

    password: z.string().min(1, 'Password is required'),
  }),
})

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']
