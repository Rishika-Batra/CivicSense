"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
/**
 * authenticate middleware
 *
 * Verifies the Bearer JWT in the Authorization header and attaches the
 * decoded user payload to `req.user`.
 *
 * Returns 401 if no token is provided or the token is invalid/expired.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({
            success: false,
            message: 'Server misconfiguration: JWT_SECRET is not set.',
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = {
            id: new mongoose_1.Types.ObjectId(decoded.id),
            role: decoded.role,
            email: decoded.email,
        };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ success: false, message: 'Token has expired.' });
            return;
        }
        res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};
exports.authenticate = authenticate;
