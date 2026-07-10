"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
/**
 * authorize(...roles) middleware factory
 *
 * Must be used **after** the `authenticate` middleware.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 *
 * @param roles - One or more roles that are permitted to access the route
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('admin'), deleteUser)
 * router.patch('/complaints/:id', authenticate, authorize('officer', 'admin'), updateComplaint)
 */
const authorize = (...roles) => (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
        return;
    }
    if (!roles.includes(req.user.role)) {
        res.status(403).json({
            success: false,
            message: `Access denied. Requires one of: [${roles.join(', ')}].`,
        });
        return;
    }
    next();
};
exports.authorize = authorize;
