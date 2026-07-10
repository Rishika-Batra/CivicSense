"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const complaint_controller_js_1 = require("../controllers/complaint.controller.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const authorize_js_1 = require("../middleware/authorize.js");
const upload_js_1 = require("../middleware/upload.js");
const validate_js_1 = require("../middleware/validate.js");
const complaint_validators_js_1 = require("../validators/complaint.validators.js");
const ai_service_js_1 = require("../services/ai.service.js");
const router = (0, express_1.Router)();
/**
 * @route  POST /api/complaints
 * @desc   Register a new complaint with optional image upload
 * @access Private (Citizen only)
 */
router.post('/', authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('citizen'), upload_js_1.upload.single('image'), (0, validate_js_1.validate)(complaint_validators_js_1.createComplaintSchema), complaint_controller_js_1.createComplaint);
/**
 * @route  POST /api/complaints/predict
 * @desc   Predict category of an uploaded issue image before submission
 * @access Private (Citizen only)
 */
router.post('/predict', authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('citizen'), upload_js_1.upload.single('image'), async (req, res, next) => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No image uploaded.' });
        return;
    }
    try {
        const aiResult = await (0, ai_service_js_1.predictCategory)(req.file.buffer, req.file.originalname);
        res.status(200).json({
            success: true,
            category: aiResult.category,
            confidence: aiResult.confidence,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * @route  GET /api/complaints
 * @desc   List complaints with filtering and pagination
 * @access Private (Officer and Admin only)
 */
router.get('/', authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('officer', 'admin'), complaint_controller_js_1.getComplaints);
/**
 * @route  GET /api/complaints/my
 * @desc   Get complaints filed by currently authenticated citizen
 * @access Private (Citizen only)
 */
router.get('/my', authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('citizen'), complaint_controller_js_1.getMyComplaints);
/**
 * @route  GET /api/complaints/:id
 * @desc   Get complaint by ID (Visibility restricted to author or officers/admins)
 * @access Private (All roles)
 */
router.get('/:id', authenticate_js_1.authenticate, complaint_controller_js_1.getComplaintById);
/**
 * @route  PATCH /api/complaints/:id/status
 * @desc   Update status of a complaint with resolution proof and remarks
 * @access Private (Officer and Admin only)
 */
router.patch('/:id/status', authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('officer', 'admin'), upload_js_1.upload.single('image'), (0, validate_js_1.validate)(complaint_validators_js_1.updateStatusSchema), complaint_controller_js_1.updateComplaintStatus);
/**
 * @route  PATCH /api/complaints/:id/assign
 * @desc   Assign complaint to specific officer or auto-route via department mapping
 * @access Private (Admin only)
 */
router.patch('/:id/assign', authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('admin'), (0, validate_js_1.validate)(complaint_validators_js_1.assignComplaintSchema), complaint_controller_js_1.assignComplaint);
exports.default = router;
