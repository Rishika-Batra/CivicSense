"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_js_1 = __importDefault(require("../models/User.js"));
const SALT_ROUNDS = 12;
const seedAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/civicsense';
    if (!adminEmail || !adminPassword) {
        console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in environment variables.');
        process.exit(1);
    }
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ MongoDB connected successfully.');
        // Check if any admin already exists
        const existingAdmin = await User_js_1.default.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('ℹ️ Admin already exists, skipping seed.');
            await mongoose_1.default.disconnect();
            process.exit(0);
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, SALT_ROUNDS);
        // Create the admin user
        await User_js_1.default.create({
            name: 'System Admin',
            email: adminEmail,
            passwordHash,
            role: 'admin',
        });
        console.log(`🎉 Admin user created successfully with email: ${adminEmail}`);
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Seed script failed:', err);
        process.exit(1);
    }
};
seedAdmin();
