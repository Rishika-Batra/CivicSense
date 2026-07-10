"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const authenticate_js_1 = require("../middleware/authenticate.js");
const validate_js_1 = require("../middleware/validate.js");
const auth_validators_js_1 = require("../validators/auth.validators.js");
const router = (0, express_1.Router)();
/**
 * @route  POST /api/auth/register
 * @desc   Public citizen self-signup
 * @access Public
 */
router.post('/register', (0, validate_js_1.validate)(auth_validators_js_1.registerSchema), auth_controller_js_1.register);
/**
 * @route  POST /api/auth/login
 * @desc   Authenticate user and return JWT
 * @access Public
 */
router.post('/login', (0, validate_js_1.validate)(auth_validators_js_1.loginSchema), auth_controller_js_1.login);
/**
 * @route  GET /api/auth/me
 * @desc   Get the currently authenticated user's profile
 * @access Private (requires valid JWT)
 */
router.get('/me', authenticate_js_1.authenticate, auth_controller_js_1.me);
exports.default = router;
