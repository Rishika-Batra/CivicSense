import { NextFunction, Request, Response } from 'express'
import { z, ZodError, ZodType } from 'zod'

/**
 * Generic Zod validation middleware factory (Zod v4 compatible).
 * Validates req.body, req.query, and req.params against the provided schema.
 *
 * @param schema - A Zod schema accepting an object with `body`, `query`, `params` keys
 */
export const validate =
  (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        // Zod v4: errors live on err.issues
        const issues = (err as ZodError).issues ?? []
        const errors = issues.map((issue: z.ZodIssue) => ({
          field: issue.path.slice(1).join('.'), // strip leading 'body'/'query'/'params'
          message: issue.message,
        }))
        res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors,
        })
        return
      }
      next(err)
    }
  }
