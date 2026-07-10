"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Generic Zod validation middleware factory (Zod v4 compatible).
 * Validates req.body, req.query, and req.params against the provided schema.
 *
 * @param schema - A Zod schema accepting an object with `body`, `query`, `params` keys
 */
const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            // Zod v4: errors live on err.issues
            const issues = err.issues ?? [];
            const errors = issues.map((issue) => ({
                field: issue.path.slice(1).join('.'), // strip leading 'body'/'query'/'params'
                message: issue.message,
            }));
            res.status(422).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
            return;
        }
        next(err);
    }
};
exports.validate = validate;
