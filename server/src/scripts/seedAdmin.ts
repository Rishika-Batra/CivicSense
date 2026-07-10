import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const SALT_ROUNDS = 12

const seedAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/civicsense'

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in environment variables.')
    process.exit(1)
  }

  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ MongoDB connected successfully.')

    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' })
    if (existingAdmin) {
      console.log('ℹ️ Admin already exists, skipping seed.')
      await mongoose.disconnect()
      process.exit(0)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS)

    // Create the admin user
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    })

    console.log(`🎉 Admin user created successfully with email: ${adminEmail}`)
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed script failed:', err)
    process.exit(1)
  }
}

seedAdmin()
