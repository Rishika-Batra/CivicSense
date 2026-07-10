"use strict";
/**
 * Central barrel export for all Mongoose models.
 * Import from here to keep imports tidy across the server codebase.
 *
 * @example
 * import { User, Complaint, Department } from '@/models'
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Department = exports.Complaint = exports.User = void 0;
var User_js_1 = require("./User.js");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return __importDefault(User_js_1).default; } });
var Complaint_js_1 = require("./Complaint.js");
Object.defineProperty(exports, "Complaint", { enumerable: true, get: function () { return __importDefault(Complaint_js_1).default; } });
var Department_js_1 = require("./Department.js");
Object.defineProperty(exports, "Department", { enumerable: true, get: function () { return __importDefault(Department_js_1).default; } });
