"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const complaint_routes_js_1 = __importDefault(require("./routes/complaint.routes.js"));
const admin_routes_js_1 = __importDefault(require("./routes/admin.routes.js"));
const security_js_1 = require("./middleware/security.js");
// ─── App Initialization ───────────────────────────────────────────────────────
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civicsense';
// ─── Middlewares ──────────────────────────────────────────────────────────────
// ─── CORS ─────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS is a comma-separated list of permitted frontend origins.
// Example production value: https://civicsense.vercel.app
// Falls back to localhost for local development.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Security protections: global rate limiting and input sanitization
app.use((0, security_js_1.rateLimiter)(300, 15 * 60 * 1000)); // 300 requests per 15 minutes
app.use(security_js_1.sanitizeInput);
// ─── Database Connection ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    mongoose_1.default
        .connect(MONGO_URI)
        .then(() => {
        console.log('✅ MongoDB connected successfully.');
    })
        .catch((err) => {
        console.warn('⚠️  Could not connect to MongoDB. Server running without database.', err.message);
    });
}
// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        message: 'Hello World from CivicSense Server',
        status: 'online',
        timestamp: new Date().toISOString(),
    });
});
// Mount auth routes
app.use('/api/auth', auth_routes_js_1.default);
app.use('/api/complaints', complaint_routes_js_1.default);
app.use('/api/admin', admin_routes_js_1.default);
// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});
// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.',
    });
});
// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
exports.default = app;
