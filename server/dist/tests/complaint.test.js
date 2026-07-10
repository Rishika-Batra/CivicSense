"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Complaint Route Tests — Jest + Supertest
 *
 * Tests POST /api/complaints and PATCH /api/complaints/:id/status
 * with full RBAC enforcement (citizen vs officer roles).
 *
 * JWT_SECRET is pinned by jest.setup.js before any module loads.
 * Token IDs use valid 24-char hex ObjectId strings so that
 * `new Types.ObjectId(decoded.id)` in authenticate.ts doesn't throw.
 */
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../index.js");
const index_js_2 = require("../models/index.js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = require("mongoose");
const SECRET = process.env.JWT_SECRET;
// Valid 24-char hex ObjectIds — required by Types.ObjectId() in authenticate.ts
const CITIZEN_ID = '507f1f77bcf86cd799439011';
const OFFICER_ID = '507f1f77bcf86cd799439022';
const citizenToken = jsonwebtoken_1.default.sign({ id: CITIZEN_ID, role: 'citizen', email: 'citizen@test.com' }, SECRET);
const officerToken = jsonwebtoken_1.default.sign({ id: OFFICER_ID, role: 'officer', email: 'officer@test.com' }, SECRET);
afterEach(() => {
    jest.restoreAllMocks();
});
// ─── POST /api/complaints ─────────────────────────────────────────────────────
describe('POST /api/complaints', () => {
    it('returns 401 for unauthenticated requests', async () => {
        const res = await (0, supertest_1.default)(index_js_1.app).post('/api/complaints').send({
            title: 'Big Pothole',
            description: 'There is a large pothole near the crossing',
            category: 'Pothole',
            latitude: 28.5,
            longitude: 77.2,
            address: 'Main Road, Block B',
        });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });
    it('returns 403 when an officer tries to file a complaint', async () => {
        const res = await (0, supertest_1.default)(index_js_1.app)
            .post('/api/complaints')
            .set('Authorization', `Bearer ${officerToken}`)
            .send({
            title: 'Garbage Dump',
            description: 'Uncleaned overflowing garbage bin on street corner',
            category: 'Garbage',
            latitude: 25.1,
            longitude: 77.2,
            address: 'Street 4, Sector 7',
        });
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Access denied');
    });
    it('returns 201 when a citizen files a valid complaint', async () => {
        jest.spyOn(index_js_2.Complaint, 'create').mockResolvedValue({
            _id: 'complaint-xyz-999',
            title: 'Water Leak',
            category: 'Waterlogging',
            status: 'Pending',
            userId: CITIZEN_ID,
        });
        const res = await (0, supertest_1.default)(index_js_1.app)
            .post('/api/complaints')
            .set('Authorization', `Bearer ${citizenToken}`)
            .send({
            title: 'Water Leak',
            description: 'Burst water pipe flooding street entrance',
            category: 'Waterlogging',
            latitude: 28.55,
            longitude: 77.25,
            address: 'Nehru Enclave, Outer Circle',
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.complaint._id).toBe('complaint-xyz-999');
        expect(res.body.complaint.status).toBe('Pending');
    });
});
// ─── PATCH /api/complaints/:id/status ────────────────────────────────────────
describe('PATCH /api/complaints/:id/status', () => {
    it('returns 403 when a citizen attempts a status update', async () => {
        const res = await (0, supertest_1.default)(index_js_1.app)
            .patch('/api/complaints/507f1f77bcf86cd799439033/status')
            .set('Authorization', `Bearer ${citizenToken}`)
            .send({ status: 'Resolved', remarks: 'Fixed' });
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });
    it('returns 200 when the assigned officer updates complaint status', async () => {
        // assignedOfficerId must behave like a Mongoose ObjectId with .equals()
        const officerObjectId = new mongoose_1.Types.ObjectId(OFFICER_ID);
        const mockComplaint = {
            _id: new mongoose_1.Types.ObjectId('507f1f77bcf86cd799439033'),
            title: 'Broken Streetlight',
            assignedOfficerId: officerObjectId,
            status: 'Pending',
            remarks: [],
            resolutionProofUrl: null,
            save: jest.fn().mockResolvedValue(true),
        };
        jest.spyOn(index_js_2.Complaint, 'findById').mockResolvedValue(mockComplaint);
        const res = await (0, supertest_1.default)(index_js_1.app)
            .patch('/api/complaints/507f1f77bcf86cd799439033/status')
            .set('Authorization', `Bearer ${officerToken}`)
            .send({ status: 'InProgress', remarks: 'Inspected, parts ordered' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.complaint.status).toBe('InProgress');
        expect(mockComplaint.save).toHaveBeenCalled();
    });
    it('returns 400 when setting status to Resolved without resolution proof', async () => {
        const officerObjectId = new mongoose_1.Types.ObjectId(OFFICER_ID);
        const mockComplaint = {
            _id: new mongoose_1.Types.ObjectId('507f1f77bcf86cd799439033'),
            title: 'Broken Streetlight',
            assignedOfficerId: officerObjectId,
            status: 'Pending',
            remarks: [],
            resolutionProofUrl: null,
            save: jest.fn(),
        };
        jest.spyOn(index_js_2.Complaint, 'findById').mockResolvedValue(mockComplaint);
        const res = await (0, supertest_1.default)(index_js_1.app)
            .patch('/api/complaints/507f1f77bcf86cd799439033/status')
            .set('Authorization', `Bearer ${officerToken}`)
            .send({ status: 'Resolved', remarks: 'Fixed the light' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Resolution proof is required');
    });
    it('returns 200 when setting status to Resolved with resolutionProofUrl in body', async () => {
        const officerObjectId = new mongoose_1.Types.ObjectId(OFFICER_ID);
        const mockComplaint = {
            _id: new mongoose_1.Types.ObjectId('507f1f77bcf86cd799439033'),
            title: 'Broken Streetlight',
            assignedOfficerId: officerObjectId,
            status: 'Pending',
            remarks: [],
            resolutionProofUrl: null,
            save: jest.fn().mockImplementation(function () {
                return Promise.resolve(this);
            }),
        };
        jest.spyOn(index_js_2.Complaint, 'findById').mockResolvedValue(mockComplaint);
        const res = await (0, supertest_1.default)(index_js_1.app)
            .patch('/api/complaints/507f1f77bcf86cd799439033/status')
            .set('Authorization', `Bearer ${officerToken}`)
            .send({
            status: 'Resolved',
            remarks: 'Fixed the light completely',
            resolutionProofUrl: 'http://cloudinary.com/proof.jpg',
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.complaint.status).toBe('Resolved');
        expect(mockComplaint.save).toHaveBeenCalled();
    });
});
