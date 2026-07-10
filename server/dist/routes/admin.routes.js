"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_js_1 = require("../middleware/authenticate.js");
const authorize_js_1 = require("../middleware/authorize.js");
const admin_controller_js_1 = require("../controllers/admin.controller.js");
const router = (0, express_1.Router)();
// All admin routes require authentication + admin role
router.use(authenticate_js_1.authenticate, (0, authorize_js_1.authorize)('admin'));
// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', admin_controller_js_1.listUsers);
router.patch('/users/:id', admin_controller_js_1.updateUser);
// ─── Department Management ────────────────────────────────────────────────────
router.get('/departments', admin_controller_js_1.listDepartments);
router.post('/departments', admin_controller_js_1.createDepartment);
router.patch('/departments/:id', admin_controller_js_1.updateDepartment);
router.delete('/departments/:id', admin_controller_js_1.deleteDepartment);
// ─── Complaint Overview (for assignment panel) ────────────────────────────────
router.get('/complaints', admin_controller_js_1.adminListComplaints);
// ─── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics', admin_controller_js_1.getAnalytics);
exports.default = router;
