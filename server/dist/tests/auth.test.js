"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Auth Route Tests — Jest + Supertest
 *
 * Tests key auth flows without hitting a real database.
 * JWT_SECRET is pinned by jest.setup.js before any module loads.
 */
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../index.js");
const index_js_2 = require("../models/index.js");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
afterEach(() => {
    jest.restoreAllMocks();
});
// ─── POST /api/auth/register ─────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
    it('rejects malformed email with 422', async () => {
        const res = await (0, supertest_1.default)(index_js_1.app).post('/api/auth/register').send({
            name: 'John Doe',
            email: 'not-a-valid-email',
            password: 'short',
        });
        expect(res.status).toBe(422);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });
    it('creates a citizen account and returns 201 + JWT', async () => {
        jest.spyOn(index_js_2.User, 'findOne').mockResolvedValue(null);
        jest.spyOn(index_js_2.User, 'create').mockResolvedValue({
            _id: 'mock-id-001',
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'citizen',
        });
        const res = await (0, supertest_1.default)(index_js_1.app).post('/api/auth/register').send({
            name: 'Jane Doe',
            email: 'jane@example.com',
            password: 'securePassword123',
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('jane@example.com');
    });
    it('returns 409 when email is already taken', async () => {
        jest.spyOn(index_js_2.User, 'findOne').mockResolvedValue({
            _id: 'existing-id',
            email: 'taken@example.com',
        });
        const res = await (0, supertest_1.default)(index_js_1.app).post('/api/auth/register').send({
            name: 'Jane Doe',
            email: 'taken@example.com',
            password: 'securePassword123',
        });
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('already exists');
    });
});
// ─── POST /api/auth/login ─────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
    it('returns 200 + JWT for correct credentials', async () => {
        const hash = await bcryptjs_1.default.hash('correctPass1', 6);
        jest.spyOn(index_js_2.User, 'findOne').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: 'user-abc',
                name: 'Bob Ross',
                email: 'bob@example.com',
                role: 'citizen',
                passwordHash: hash,
            }),
        });
        const res = await (0, supertest_1.default)(index_js_1.app)
            .post('/api/auth/login')
            .send({ email: 'bob@example.com', password: 'correctPass1' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.name).toBe('Bob Ross');
    });
    it('returns 401 for wrong password', async () => {
        const hash = await bcryptjs_1.default.hash('correctPass1', 6);
        jest.spyOn(index_js_2.User, 'findOne').mockReturnValue({
            select: jest.fn().mockResolvedValue({
                _id: 'user-abc',
                name: 'Bob Ross',
                email: 'bob@example.com',
                role: 'citizen',
                passwordHash: hash,
            }),
        });
        const res = await (0, supertest_1.default)(index_js_1.app)
            .post('/api/auth/login')
            .send({ email: 'bob@example.com', password: 'wrongPassword' });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid email or password');
    });
});
